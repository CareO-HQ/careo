import type { SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/config";

export const CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE = "care_plan_evaluation_due_soon";
export const CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE = "care_plan_evaluation_overdue";

/** Used when the folder key is missing or not a Care File v2 folder key. */
export const DEFAULT_CARE_PLAN_ALERT_FOLDER_KEY = "v2-safe-environment";

function careFileV2FolderKeySet(): Set<string> {
  return new Set(config.careFilesV2.map((f) => f.key));
}

function findCareFileV2FolderByFormKey(formKey: string): string | null {
  for (const folder of config.careFilesV2) {
    for (const form of folder.forms ?? []) {
      if (form.type === "form" && form.key === formKey) {
        return folder.key;
      }
    }
  }
  return null;
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeKnownCarePlanTypos(value: string): string {
  return value
    .replace(/dependeency/gi, "dependency")
    .replace(/depenency/gi, "dependency");
}

function findCareFileV2FolderByLabel(label: string): string | null {
  const normalized = normalizeLabel(label);
  if (!normalized) {
    return null;
  }

  for (const folder of config.careFilesV2) {
    if (normalizeLabel(folder.value ?? "") === normalized) {
      return folder.key;
    }
    for (const form of folder.forms ?? []) {
      if (form.type !== "form") {
        continue;
      }
      const formValue = typeof form.value === "string" ? form.value : "";
      if (normalizeLabel(formValue) === normalized) {
        return folder.key;
      }
    }
  }
  return null;
}

/**
 * Resolves the best Care File v2 folder key using only v2 config:
 * - direct v2 folder key match
 * - fallback via v2 form key ownership
 * - default folder
 */
export function resolveCareFileV2FolderKey(
  raw: string | null | undefined,
  carePlanType?: string | null
): string {
  const v2Keys = careFileV2FolderKeySet();

  const candidates = [raw, carePlanType]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKnownCarePlanTypos(candidate);

    if (v2Keys.has(candidate)) {
      return candidate;
    }
    if (v2Keys.has(normalizedCandidate)) {
      return normalizedCandidate;
    }
    const inferredFolder =
      findCareFileV2FolderByFormKey(candidate) ??
      findCareFileV2FolderByFormKey(normalizedCandidate);
    if (inferredFolder) {
      return inferredFolder;
    }
    const inferredByLabel =
      findCareFileV2FolderByLabel(candidate) ??
      findCareFileV2FolderByLabel(normalizedCandidate);
    if (inferredByLabel) {
      return inferredByLabel;
    }
  }

  return DEFAULT_CARE_PLAN_ALERT_FOLDER_KEY;
}

export function extractRawCareFileFolderKeyFromGoals(goals: unknown): string | null {
  if (!goals || typeof goals !== "object") {
    return null;
  }
  const g = goals as Record<string, unknown>;
  const raw = g.folderKey ?? g.folder_key;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

/**
 * Care File v2 path that opens the folder and selects the care plan when `carePlanId` is applied on the folder page.
 * Wound-linked care plans use the wound folder URL instead.
 */
export function carePlanEvaluationAlertCareFileHref(
  residentId: string,
  metadata: {
    care_plan_id?: string;
    care_file_folder_key?: string | null;
    wound_folder_id?: string | null;
    care_plan_type?: string | null;
  } | null | undefined
): string | null {
  const planId = metadata?.care_plan_id;
  if (!planId || !residentId) {
    return null;
  }
  const woundFolderId = metadata?.wound_folder_id?.trim();
  if (woundFolderId) {
    return `/dashboard/residents/${residentId}/wounds/${encodeURIComponent(woundFolderId)}?carePlanId=${encodeURIComponent(planId)}`;
  }
  const folder = resolveCareFileV2FolderKey(
    metadata?.care_file_folder_key ?? null,
    metadata?.care_plan_type ?? null
  );
  return `/dashboard/residents/${residentId}/care-file-v2/${encodeURIComponent(folder)}?carePlanId=${encodeURIComponent(planId)}`;
}

export function carePlanEvaluationAlertFolderLabel(
  metadata:
    | {
        care_file_folder_key?: string | null;
        wound_folder_id?: string | null;
        care_plan_type?: string | null;
      }
    | null
    | undefined
): string | null {
  const woundFolderId = metadata?.wound_folder_id?.trim();
  if (woundFolderId) {
    return "Wound folder";
  }

  const folderKey = resolveCareFileV2FolderKey(
    metadata?.care_file_folder_key ?? null,
    metadata?.care_plan_type ?? null
  );
  const folder = config.careFilesV2.find((item) => item.key === folderKey);
  return folder?.value ?? null;
}

const CARE_PLAN_EVALUATION_ALERT_TYPES = [
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
] as const;

/**
 * Resolves unresolved care plan evaluation alerts for a care plan after an evaluation is submitted.
 */
export async function resolveCarePlanEvaluationAlertsForCarePlan(
  supabase: SupabaseClient,
  params: {
    carePlanId: string;
    resolvedByUserId?: string;
  }
): Promise<void> {
  const { data: rows, error: selectError } = await supabase
    .from("alerts")
    .select("id")
    .eq("is_resolved", false)
    .in("type", [...CARE_PLAN_EVALUATION_ALERT_TYPES])
    .filter("metadata->>care_plan_id", "eq", params.carePlanId);

  if (selectError) {
    console.warn("resolveCarePlanEvaluationAlertsForCarePlan select:", selectError);
    return;
  }

  const ids = (rows ?? []).map((row) => row.id).filter(Boolean);
  if (ids.length === 0) {
    return;
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("alerts")
    .update({
      is_resolved: true,
      resolved_at: now,
      resolved_by: params.resolvedByUserId ?? null,
    })
    .in("id", ids)
    .eq("is_resolved", false);

  if (updateError) {
    console.warn("resolveCarePlanEvaluationAlertsForCarePlan update:", updateError);
  }
}
