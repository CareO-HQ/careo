import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUKTodayDate } from "@/lib/date-utils";
import {
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
  extractRawCareFileFolderKeyFromGoals,
  resolveCareFileV2FolderKey,
} from "@/lib/care-plan-evaluation-alerts";

function addCalendarDays(dateKey: string, delta: number): string {
  const parts = dateKey.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

interface AssessmentRow {
  id: string;
  resident_id: string;
  organization_id: string;
  care_plan_type: string | null;
  next_evaluation_date: string | null;
  folder_key?: string | null;
  goals: { nameOfCarePlan?: string; folderKey?: string; folder_key?: string } | null;
  wound_folder_id: string | null;
}

interface EvaluationRow {
  care_plan_id: string;
  new_review_date: string | null;
  evaluation_date: string;
  created_at: string;
}

interface ResidentRow {
  id: string;
  care_home_id: string | null;
  is_active: boolean | null;
  first_name: string | null;
  last_name: string | null;
}

interface AlertRow {
  id: string;
  type: string;
  created_at: string;
  resident_id: string | null;
  metadata: {
    care_plan_id?: string;
    next_review_date?: string;
  } | null;
}

function getExpectedAuthHeader() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return null;
  }
  return `Bearer ${secret}`;
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for cron route");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function effectiveNextReviewDate(
  assessment: AssessmentRow,
  evaluations: EvaluationRow[]
): string | null {
  const forPlan = evaluations.filter((e) => e.care_plan_id === assessment.id && e.new_review_date);
  if (forPlan.length === 0) {
    return assessment.next_evaluation_date;
  }
  const sorted = [...forPlan].sort((a, b) => {
    const ed = b.evaluation_date.localeCompare(a.evaluation_date);
    if (ed !== 0) return ed;
    return b.created_at.localeCompare(a.created_at);
  });
  const first = sorted[0];
  return first?.new_review_date ?? assessment.next_evaluation_date;
}

function carePlanDisplayName(assessment: AssessmentRow): string {
  const fromGoals = assessment.goals?.nameOfCarePlan;
  if (fromGoals && fromGoals.trim()) {
    return fromGoals.trim();
  }
  if (assessment.care_plan_type && assessment.care_plan_type.trim()) {
    return assessment.care_plan_type.trim();
  }
  return "Care plan";
}

export async function GET(request: NextRequest) {
  try {
    const expectedAuthHeader = getExpectedAuthHeader();
    const providedAuthHeader = request.headers.get("authorization");

    if (!expectedAuthHeader || providedAuthHeader !== expectedAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const today = getUKTodayDate();

    const initialQuery = await supabase
      .from("care_plan_assessments")
      .select("id, resident_id, organization_id, care_plan_type, next_evaluation_date, folder_key, goals, wound_folder_id")
      .eq("status", "active");

    let assessmentRows = initialQuery.data as AssessmentRow[] | null;
    let assessmentsError = initialQuery.error;

    // Some environments may not have `folder_key` on care_plan_assessments yet.
    // Retry without it so cron stays functional.
    if (assessmentsError) {
      const fallback = await supabase
        .from("care_plan_assessments")
        .select("id, resident_id, organization_id, care_plan_type, next_evaluation_date, goals, wound_folder_id")
        .eq("status", "active");
      assessmentRows = fallback.data as AssessmentRow[] | null;
      assessmentsError = fallback.error;
    }

    if (assessmentsError) {
      console.error("Cron care-plan evaluation assessments query failed:", assessmentsError);
      return NextResponse.json({ error: "Failed to query care plan assessments" }, { status: 500 });
    }

    const assessments = (assessmentRows as AssessmentRow[] | null) ?? [];
    if (assessments.length === 0) {
      return NextResponse.json(
        { success: true, processed: 0, created: 0, resolved: 0 },
        { status: 200 }
      );
    }

    const residentIds = [...new Set(assessments.map((a) => a.resident_id))];
    const { data: residentRows, error: residentsError } = await supabase
      .from("residents")
      .select("id, care_home_id, is_active, first_name, last_name")
      .in("id", residentIds);

    if (residentsError) {
      console.error("Cron care-plan evaluation residents query failed:", residentsError);
      return NextResponse.json({ error: "Failed to query residents" }, { status: 500 });
    }

    const residentById = new Map<string, ResidentRow>();
    for (const row of (residentRows as ResidentRow[] | null) ?? []) {
      residentById.set(row.id, row);
    }

    const activeAssessments = assessments.filter((a) => {
      const r = residentById.get(a.resident_id);
      return r?.is_active !== false;
    });

    const carePlanIds = activeAssessments.map((a) => a.id);
    const { data: evaluationRows, error: evaluationsError } = await supabase
      .from("care_plan_evaluations")
      .select("care_plan_id, new_review_date, evaluation_date, created_at")
      .in("care_plan_id", carePlanIds);

    if (evaluationsError) {
      console.error("Cron care-plan evaluation evaluations query failed:", evaluationsError);
      return NextResponse.json({ error: "Failed to query care plan evaluations" }, { status: 500 });
    }

    const evaluations = (evaluationRows as EvaluationRow[] | null) ?? [];

    const { data: alertRows, error: alertsError } = await supabase
      .from("alerts")
      .select("id, type, created_at, resident_id, metadata")
      .eq("is_resolved", false)
      .in("type", [CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE, CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE]);

    if (alertsError) {
      console.error("Cron care-plan evaluation alerts query failed:", alertsError);
      return NextResponse.json({ error: "Failed to query alerts" }, { status: 500 });
    }

    let alerts = (alertRows as AlertRow[] | null) ?? [];

    const evalMaxCreatedByCarePlan = new Map<string, string>();
    for (const ev of evaluations) {
      const prev = evalMaxCreatedByCarePlan.get(ev.care_plan_id);
      if (!prev || ev.created_at > prev) {
        evalMaxCreatedByCarePlan.set(ev.care_plan_id, ev.created_at);
      }
    }

    const resolveIdsFromEval: string[] = [];
    for (const alert of alerts) {
      const carePlanId = alert.metadata?.care_plan_id;
      if (!carePlanId) continue;
      const maxCreated = evalMaxCreatedByCarePlan.get(carePlanId);
      if (!maxCreated) continue;
      if (new Date(maxCreated).getTime() > new Date(alert.created_at).getTime()) {
        resolveIdsFromEval.push(alert.id);
      }
    }

    let resolvedTotal = 0;
    if (resolveIdsFromEval.length > 0) {
      const uniqueEvalResolveIds = [...new Set(resolveIdsFromEval)];
      const { data: resolvedRows, error: resolveError } = await supabase
        .from("alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .in("id", uniqueEvalResolveIds)
        .eq("is_resolved", false)
        .select("id");

      if (resolveError) {
        console.error("Cron care-plan evaluation eval-after-alert resolve failed:", resolveError);
        return NextResponse.json({ error: "Failed to resolve alerts" }, { status: 500 });
      }
      resolvedTotal += resolvedRows?.length ?? 0;
      const resolvedSet = new Set(resolveIdsFromEval);
      alerts = alerts.filter((a) => !resolvedSet.has(a.id));
    }

    const unresolvedByCarePlan = new Map<
      string,
      { dueSoon?: AlertRow; overdue?: AlertRow }
    >();
    for (const alert of alerts) {
      const cpId = alert.metadata?.care_plan_id;
      if (!cpId) continue;
      let entry = unresolvedByCarePlan.get(cpId);
      if (!entry) {
        entry = {};
        unresolvedByCarePlan.set(cpId, entry);
      }
      if (alert.type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE) {
        entry.dueSoon = alert;
      } else if (alert.type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE) {
        entry.overdue = alert;
      }
    }

    const idsToResolve: string[] = [];
    const inserts: Array<{
      resident_id: string;
      organization_id: string;
      care_home_id: string | null;
      type: string;
      severity: "warning" | "critical";
      title: string;
      message: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (const assessment of activeAssessments) {
      const nextReview = effectiveNextReviewDate(assessment, evaluations);
      const resident = residentById.get(assessment.resident_id);
      const fullName = [resident?.first_name ?? "", resident?.last_name ?? ""].filter(Boolean).join(" ");
      const residentName = fullName.length > 0 ? fullName : "Resident";
      const planName = carePlanDisplayName(assessment);
      const existing = unresolvedByCarePlan.get(assessment.id) ?? {};

      if (!nextReview) {
        if (existing.dueSoon) idsToResolve.push(existing.dueSoon.id);
        if (existing.overdue) idsToResolve.push(existing.overdue.id);
        continue;
      }

      const windowStart = addCalendarDays(nextReview, -2);
      const woundFolderId = assessment.wound_folder_id?.trim() || null;
      const metaBase = {
        care_plan_id: assessment.id,
        resident_id: assessment.resident_id,
        organization_id: assessment.organization_id,
        next_review_date: nextReview,
        care_plan_name: planName,
        care_plan_type: assessment.care_plan_type,
        wound_folder_id: woundFolderId,
        care_file_folder_key: woundFolderId
          ? null
          : resolveCareFileV2FolderKey(
              assessment.folder_key ?? extractRawCareFileFolderKeyFromGoals(assessment.goals),
              assessment.care_plan_type
            ),
        generated_by: "care-plan-evaluation-alerts-cron",
        target_roles: ["nurse"],
      };

      if (today < windowStart) {
        if (existing.dueSoon) idsToResolve.push(existing.dueSoon.id);
        if (existing.overdue) idsToResolve.push(existing.overdue.id);
        continue;
      }

      if (today < nextReview) {
        if (existing.overdue) idsToResolve.push(existing.overdue.id);
        if (!existing.dueSoon) {
          inserts.push({
            resident_id: assessment.resident_id,
            organization_id: assessment.organization_id,
            care_home_id: resident?.care_home_id ?? null,
            type: CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
            severity: "warning",
            title: "Care plan evaluation due soon",
            message: `Care plan "${planName}" evaluation is due soon for ${residentName} (review date ${nextReview}).`,
            metadata: { ...metaBase },
          });
        }
        continue;
      }

      if (existing.dueSoon) idsToResolve.push(existing.dueSoon.id);
      if (!existing.overdue) {
        inserts.push({
          resident_id: assessment.resident_id,
          organization_id: assessment.organization_id,
          care_home_id: resident?.care_home_id ?? null,
          type: CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
          severity: "critical",
          title: "Care plan evaluation overdue",
          message: `Care plan "${planName}" evaluation is overdue for ${residentName} (review date was ${nextReview}).`,
          metadata: { ...metaBase },
        });
      }
    }

    if (idsToResolve.length > 0) {
      const uniqueResolveIds = [...new Set(idsToResolve)];
      const { data: resolvedStale, error: resolveStaleError } = await supabase
        .from("alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .in("id", uniqueResolveIds)
        .eq("is_resolved", false)
        .select("id");

      if (resolveStaleError) {
        console.error("Cron care-plan evaluation stale resolve failed:", resolveStaleError);
        return NextResponse.json({ error: "Failed to resolve stale alerts" }, { status: 500 });
      }
      resolvedTotal += resolvedStale?.length ?? 0;
    }

    let created = 0;
    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("alerts").insert(inserts);
      if (insertError) {
        console.error("Cron care-plan evaluation alert insert failed:", insertError);
        return NextResponse.json({ error: "Failed to create alerts" }, { status: 500 });
      }
      created = inserts.length;
    }

    return NextResponse.json(
      {
        success: true,
        processed: activeAssessments.length,
        created,
        resolved: resolvedTotal,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron care-plan evaluation execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
