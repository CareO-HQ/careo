"use client";
import type { Route } from "next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { cn, getAge, getColorForBadge } from "@/lib/utils";
import { Resident } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { Bell, Clock, X } from "lucide-react";
import { formatTimestampToUKTime, formatTimestampToUKDate, getUKTodayDate } from "@/lib/date-utils";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import {
  computeFoodFluidComplianceInWindow,
  FOOD_FLUID_ALERT_WINDOW_MS,
  FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE,
} from "@/lib/food-fluid-log-classification";
import { URINE_NOT_RECORDED_6H_ALERT_TYPE } from "@/lib/continence-alerts";
import {
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
  carePlanEvaluationAlertCareFileHref,
  carePlanEvaluationAlertFolderLabel,
  extractRawCareFileFolderKeyFromGoals,
} from "@/lib/care-plan-evaluation-alerts";
import { FEATURES } from "@/lib/config/features";

const NON_DISMISSIBLE_ALERT_TYPES = new Set<string>([
  "resident_photo_refresh_required",
  "bowel_not_recorded_3_days",
  FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE,
  URINE_NOT_RECORDED_6H_ALERT_TYPE,
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
]);
const NURSE_ONLY_ALERT_TYPES = new Set<string>([
  "resident_photo_refresh_required",
  "bowel_not_recorded_3_days",
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
]);
const NURSE_AND_CARE_ASSISTANT_ALERT_TYPES = new Set<string>([
  FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE,
  URINE_NOT_RECORDED_6H_ALERT_TYPE,
]);

function getNonDismissibleAlertMessage(type?: string) {
  if (type === "resident_photo_refresh_required") {
    return "This alert cannot be dismissed until the profile photo is updated";
  }
  if (type === "bowel_not_recorded_3_days") {
    return "This alert cannot be dismissed until a bowel record is entered";
  }
  if (type === FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE) {
    return "This alert cannot be dismissed until food and fluid are recorded in the last 6 hours";
  }
  if (type === URINE_NOT_RECORDED_6H_ALERT_TYPE) {
    return "This alert cannot be dismissed until urine is recorded";
  }
  if (
    type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE ||
    type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE
  ) {
    return "This alert cannot be dismissed until the care plan evaluation is completed";
  }
  if (type === "medication") {
    return "This alert cannot be dismissed until the medication is restocked";
  }
  return "This alert cannot be dismissed yet";
}

function canDismissAlert(
  alert: {
    type?: string;
    created_at?: string;
    metadata?: { care_plan_id?: string; alert_subtype?: string } | null;
  },
  residentPhotoUpdatedAt?: string,
  residentLastBowelRecordedAt?: string,
  foodFluidSixHourCompliant?: boolean,
  residentLastUrineRecordedAt?: string,
  carePlanEvalLatestCreatedAt?: Record<string, string>
) {
  if (alert.type === "medication" && alert.metadata?.alert_subtype === "low_stock") {
    return false;
  }

  if (!NON_DISMISSIBLE_ALERT_TYPES.has(alert.type || "")) {
    return true;
  }

  if (
    alert.type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE ||
    alert.type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE
  ) {
    const carePlanId = alert.metadata?.care_plan_id;
    if (!carePlanId || !alert.created_at) {
      return false;
    }
    const latest = carePlanEvalLatestCreatedAt?.[carePlanId];
    if (!latest) {
      return false;
    }
    return new Date(latest).getTime() > new Date(alert.created_at).getTime();
  }

  if (alert.type === FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE) {
    return foodFluidSixHourCompliant === true;
  }
  if (alert.type === URINE_NOT_RECORDED_6H_ALERT_TYPE) {
    if (!alert.created_at || !residentLastUrineRecordedAt) {
      return false;
    }
    return new Date(residentLastUrineRecordedAt).getTime() > new Date(alert.created_at).getTime();
  }

  if (!alert.created_at) {
    return false;
  }

  if (alert.type === "resident_photo_refresh_required") {
    if (!residentPhotoUpdatedAt) {
      return false;
    }
    return new Date(residentPhotoUpdatedAt).getTime() > new Date(alert.created_at).getTime();
  }

  if (alert.type === "bowel_not_recorded_3_days") {
    if (!residentLastBowelRecordedAt) {
      return false;
    }
    return new Date(residentLastBowelRecordedAt).getTime() > new Date(alert.created_at).getTime();
  }

  return false;
}

function shouldShowAlertForRole(alert: { type?: string }, role?: string) {
  if (alert.type === "medication") {
    return role === "nurse";
  }
  if (NURSE_AND_CARE_ASSISTANT_ALERT_TYPES.has(alert.type || "")) {
    return role === "nurse" || role === "care_assistant";
  }
  if (!NURSE_ONLY_ALERT_TYPES.has(alert.type || "")) {
    return true;
  }
  return role === "nurse";
}

// Component for displaying allergies
const AllergiesCell = ({ residentId }: { residentId: string }) => {
  const [dietInfo, setDietInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDiet() {
      const { data, error } = await supabase
        .from("diet_lifestyle")
        .select("*")
        .eq("resident_id", residentId)
        .single();

      if (!error) {
        setDietInfo(data);
      }
      setIsLoading(false);
    }
    fetchDiet();
  }, [residentId]);

  if (isLoading) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (!dietInfo?.allergies || dietInfo.allergies.length === 0) {
    return <Badge variant="outline">No allergies</Badge>;
  }

  const allergies = dietInfo.allergies;

  if (allergies.length > 2) {
    const extraAllergies = allergies.length - 2;
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-hide text-ellipsis">
        {allergies.slice(0, 2).map((allergyItem: any, index: number) => (
          <Badge
            key={index}
            variant="table"
            className="bg-orange-50 text-orange-700 border-orange-300"
          >
            {allergyItem.allergy}
          </Badge>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="table" className="bg-orange-50 text-orange-700 border-orange-300">+{extraAllergies}</Badge>
          </TooltipTrigger>
          <TooltipContent className="bg-white border flex flex-row gap-2">
            {allergies.slice(2).map((allergyItem: any, index: number) => (
              <Badge
                key={index}
                variant="table"
                className="bg-orange-50 text-orange-700 border-orange-300"
              >
                {allergyItem.allergy}
              </Badge>
            ))}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide text-ellipsis">
      {allergies.map((allergyItem: any, index: number) => (
        <Badge
          key={index}
          variant="table"
          className="bg-orange-50 text-orange-700 border-orange-300"
        >
          {allergyItem.allergy}
        </Badge>
      ))}
    </div>
  );
};

// Component for displaying next medication intake
const NextMedicationCell = ({ residentId }: { residentId: string }) => {
  const [nextIntakes, setNextIntakes] = useState<any[]>([]);
  const [fallbackMeds, setFallbackMeds] = useState<any[]>([]);
  const [fallbackTime, setFallbackTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNextMedication() {
      // First try: look for existing intakes
      const { data, error } = await supabase
        .from("medication_intakes")
        .select(`
          *,
          medication:medication_id (*)
        `)
        .eq("resident_id", residentId)
        .in("status", ["scheduled", "pending"])
        .gte("scheduled_time", new Date().toISOString())
        .order("scheduled_time", { ascending: true })
        .limit(10);

      if (!error && data && data.length > 0) {
        const earliestTime = data[0].scheduled_time;
        const matchingIntakes = data.filter(i => i.scheduled_time === earliestTime);
        setNextIntakes(matchingIntakes);
        setIsLoading(false);
        return;
      }

      // Fallback: calculate from medication schedules
      const { data: meds } = await supabase
        .from("medications")
        .select("*")
        .eq("resident_id", residentId)
        .eq("status", "active")
        .not("schedule_type", "eq", "PRN (As Needed)");

      if (meds && meds.length > 0) {
        const now = new Date();
        const ukNowStr = now.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });

        // Find the next scheduled time across all medications
        let nearestTime: string | null = null;
        let nearestMeds: any[] = [];

        for (const med of meds) {
          if (!med.times || med.times.length === 0) continue;
          for (const time of med.times) {
            if (time > ukNowStr) {
              if (!nearestTime || time < nearestTime) {
                nearestTime = time;
                nearestMeds = [med];
              } else if (time === nearestTime) {
                nearestMeds.push(med);
              }
            }
          }
        }

        if (nearestTime && nearestMeds.length > 0) {
          setFallbackTime(nearestTime);
          setFallbackMeds(nearestMeds);
        }
      }

      setIsLoading(false);
    }
    fetchNextMedication();
  }, [residentId]);

  if (isLoading) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  // Render from intakes if available
  if (nextIntakes.length > 0) {
    const primaryIntake = nextIntakes[0];
    const scheduledDateStr = formatTimestampToUKDate(primaryIntake.scheduled_time);
    const timeString = formatTimestampToUKTime(primaryIntake.scheduled_time);
    const today = getUKTodayDate();
    const isToday = scheduledDateStr === today;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="table"
            className={cn(
              "flex items-center gap-1 text-primary cursor-help",
              isToday && "bg-blue-50 text-blue-700 border-blue-300"
            )}
          >
            <Clock className="w-3 h-3" />
            <div className="flex items-center gap-1">
              <span>{isToday ? `Today ${timeString}` : scheduledDateStr}</span>
              {nextIntakes.length > 1 && (
                <span className="bg-primary/10 text-[10px] px-1 rounded-sm">
                  +{nextIntakes.length - 1}
                </span>
              )}
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-white border p-3">
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-xs text-muted-foreground border-b pb-1">
              Scheduled for {timeString}
            </p>
            {nextIntakes.map((intake, index) => (
              <div key={intake.id} className={cn("flex flex-col gap-0.5", index !== 0 && "pt-2 border-t border-dashed")}>
                <p className="font-medium text-sm text-primary">
                  {intake.medication?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {intake.medication?.strength}
                  {intake.medication?.strength_unit} -{" "}
                  {intake.medication?.dosage_form}
                </p>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Render from fallback schedule
  if (fallbackTime && fallbackMeds.length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="table"
            className="flex items-center gap-1 text-primary cursor-help bg-blue-50 text-blue-700 border-blue-300"
          >
            <Clock className="w-3 h-3" />
            <div className="flex items-center gap-1">
              <span>Today {fallbackTime}</span>
              {fallbackMeds.length > 1 && (
                <span className="bg-primary/10 text-[10px] px-1 rounded-sm">
                  +{fallbackMeds.length - 1}
                </span>
              )}
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-white border p-3">
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-xs text-muted-foreground border-b pb-1">
              Scheduled for {fallbackTime}
            </p>
            {fallbackMeds.map((med, index) => (
              <div key={med.id} className={cn("flex flex-col gap-0.5", index !== 0 && "pt-2 border-t border-dashed")}>
                <p className="font-medium text-sm text-primary">
                  {med.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {med.strength}
                  {med.strength_unit} - {med.dosage_form}
                </p>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <Badge variant="outline">None</Badge>;
};

// Component for displaying alerts (real data from alerts system)
const NotificationsCell = ({
  residentId,
  residentPhotoUpdatedAt,
}: {
  residentId: string;
  residentPhotoUpdatedAt?: string;
}) => {
  const [alertData, setAlertData] = useState<{ total: number }>({ total: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [residentLastBowelRecordedAt, setResidentLastBowelRecordedAt] = useState<string | undefined>();
  const [residentLastUrineRecordedAt, setResidentLastUrineRecordedAt] = useState<string | undefined>();
  const [foodFluidSixHourCompliant, setFoodFluidSixHourCompliant] = useState(false);
  const [carePlanEvalLatestCreatedAt, setCarePlanEvalLatestCreatedAt] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useProfile();
  const userRole = profile?.role;
  const router = useRouter();

  const fetchAlerts = useCallback(async () => {
    if (!userRole || !profile?.id) return;

    // Fetch active alerts for the resident
    const { data: alertsData, error: alertsError } = await supabase
      .from("alerts")
      .select("*")
      .eq("resident_id", residentId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false });

    if (alertsError) {
      setIsLoading(false);
      return;
    }

    const carePlanAlertIds = (alertsData ?? [])
      .filter(
        (alert: any) =>
          alert.type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE ||
          alert.type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE
      )
      .map((alert: any) => alert.metadata?.care_plan_id)
      .filter((idValue: unknown): idValue is string => typeof idValue === "string" && idValue.length > 0);

    let alertsWithResolvedMetadata = alertsData ?? [];
    if (carePlanAlertIds.length > 0) {
      const { data: carePlanRows } = await supabase
        .from("care_plan_assessments")
        .select("id, care_plan_type, folder_key, goals, wound_folder_id")
        .in("id", [...new Set(carePlanAlertIds)]);

      const carePlanById = new Map(
        (carePlanRows ?? []).map((row) => [row.id, row])
      );

      alertsWithResolvedMetadata = (alertsData ?? []).map((alert: any) => {
        const carePlanId = alert.metadata?.care_plan_id;
        if (
          !carePlanId ||
          (alert.type !== CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE &&
            alert.type !== CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE)
        ) {
          return alert;
        }

        const assessment = carePlanById.get(carePlanId);
        if (!assessment) {
          return alert;
        }

        const metadataBase =
          alert.metadata && typeof alert.metadata === "object"
            ? alert.metadata
            : {};

        return {
          ...alert,
          metadata: {
            ...metadataBase,
            care_plan_id: carePlanId,
            care_plan_type: assessment.care_plan_type,
            wound_folder_id: assessment.wound_folder_id,
            care_file_folder_key:
              assessment.folder_key ??
              extractRawCareFileFolderKeyFromGoals(assessment.goals),
          },
        };
      });
    }

    const { data: latestBowelEntry } = await supabase
      .from("continence_entries")
      .select("created_at")
      .eq("resident_id", residentId)
      .eq("entry_type", "bowel")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setResidentLastBowelRecordedAt(latestBowelEntry?.created_at);

    const { data: latestUrineEntry } = await supabase
      .from("continence_entries")
      .select("created_at")
      .eq("resident_id", residentId)
      .eq("entry_type", "urine")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setResidentLastUrineRecordedAt(latestUrineEntry?.created_at);

    const hasFoodFluidAlert = (alertsWithResolvedMetadata || []).some(
      (alert: any) => alert.type === FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE
    );
    let foodFluidCompliant = true;
    if (hasFoodFluidAlert) {
      const windowStartIso = new Date(Date.now() - FOOD_FLUID_ALERT_WINDOW_MS).toISOString();
      const { data: foodFluidRows } = await supabase
        .from("food_fluid_logs")
        .select("timestamp, type_of_food_drink, amount_eaten, fluid_consumed_ml")
        .eq("resident_id", residentId)
        .gte("timestamp", windowStartIso)
        .eq("is_archived", false);
      const { foodOk, fluidOk } = computeFoodFluidComplianceInWindow(foodFluidRows ?? []);
      foodFluidCompliant = foodOk && fluidOk;
    }
    setFoodFluidSixHourCompliant(foodFluidCompliant);

    const { data: cpEvalRows } = await supabase
      .from("care_plan_evaluations")
      .select("care_plan_id, created_at")
      .eq("resident_id", residentId);

    const carePlanEvalLatest: Record<string, string> = {};
    for (const row of cpEvalRows ?? []) {
      const cid = typeof row.care_plan_id === "string" ? row.care_plan_id : "";
      const cat = typeof row.created_at === "string" ? row.created_at : "";
      if (!cid || !cat) continue;
      if (!carePlanEvalLatest[cid] || cat > carePlanEvalLatest[cid]) {
        carePlanEvalLatest[cid] = cat;
      }
    }
    setCarePlanEvalLatestCreatedAt(carePlanEvalLatest);

    // Fetch dismissals for current user
    const { data: dismissalsData } = await supabase
      .from("alert_dismissals")
      .select("alert_id")
      .eq("user_id", profile.id);

    // Create a set of dismissed alert IDs for quick lookup
    const dismissedAlertIds = new Set(
      (dismissalsData || []).map((d: any) => d.alert_id)
    );

    // Filter out alerts dismissed by current user
    const filteredAlerts = (alertsWithResolvedMetadata || []).filter((alert: any) => {
      if (!shouldShowAlertForRole(alert, userRole)) {
        return false;
      }
        if (
          !canDismissAlert(
            alert,
            residentPhotoUpdatedAt,
            latestBowelEntry?.created_at,
            foodFluidCompliant,
            latestUrineEntry?.created_at,
            carePlanEvalLatest
          )
        ) {
        return true;
      }
      return !dismissedAlertIds.has(alert.id);
    });

    setAlerts(filteredAlerts);
    setAlertData({ total: filteredAlerts.length });
    setIsLoading(false);
  }, [residentId, residentPhotoUpdatedAt, userRole, profile?.id]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchAlerts();
      }
    };
    window.addEventListener("focus", fetchAlerts);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", fetchAlerts);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchAlerts]);

  const handleDismissAlert = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile?.id) return;
    const alert = alerts.find((item) => item.id === alertId);
    if (
      alert &&
      !canDismissAlert(
        alert,
        residentPhotoUpdatedAt,
        residentLastBowelRecordedAt,
        foodFluidSixHourCompliant,
        residentLastUrineRecordedAt,
        carePlanEvalLatestCreatedAt
      )
    ) {
      toast.info(getNonDismissibleAlertMessage(alert.type));
      return;
    }

    try {
      // Insert into alert_dismissals table for per-user dismissal tracking
      const { error } = await supabase
        .from("alert_dismissals")
        .insert({
          alert_id: alertId,
          user_id: profile.id
        });

      if (error) throw error;
      toast.success("Alert dismissed");
      fetchAlerts();
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
      toast.error("Failed to dismiss alert");
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Bell className="h-4 w-4 text-black" />
      </Button>
    );
  }

  const notificationCount = alertData.total;

  if (notificationCount === 0) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Bell className="h-4 w-4 text-black" />
      </Button>
    );
  }

  const topAlert = alerts[0];
  const canNavigateCareAlert =
    (topAlert.type === FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE ||
      topAlert.type === URINE_NOT_RECORDED_6H_ALERT_TYPE) &&
    (userRole === "nurse" || userRole === "care_assistant");
  const carePlanEvalCareFileHref =
    FEATURES.SHOW_CARE_FILE_V2 && userRole === "nurse"
      ? carePlanEvaluationAlertCareFileHref(residentId, topAlert.metadata)
      : null;
  const canNavigateCarePlanEvalAlert =
    (topAlert.type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE ||
      topAlert.type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE) &&
    carePlanEvalCareFileHref !== null;
  const carePlanEvalFolderLabel = canNavigateCarePlanEvalAlert
    ? carePlanEvaluationAlertFolderLabel(topAlert.metadata)
    : null;

  const canNavigateMedicationAlert =
    topAlert.type === "medication" && userRole === "nurse";

  const topDismissible = canDismissAlert(
    topAlert,
    residentPhotoUpdatedAt,
    residentLastBowelRecordedAt,
    foodFluidSixHourCompliant,
    residentLastUrineRecordedAt,
    carePlanEvalLatestCreatedAt
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
        >
          <Bell className="h-4 w-4 text-black" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
          >
            {notificationCount}
          </Badge>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="bg-white border p-3 max-w-xs">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm text-primary min-w-0 flex-1 pr-1">
              {topAlert.title}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge
                variant="table"
                className={cn(
                  topAlert.severity === "critical"
                    ? "bg-red-50 text-red-700 border-red-300"
                    : topAlert.severity === "warning"
                      ? "bg-orange-50 text-orange-700 border-orange-300"
                      : "bg-blue-50 text-blue-700 border-blue-300"
                )}
              >
                {topAlert.severity === "critical" ? "Critical" : topAlert.severity === "warning" ? "Warning" : "Info"}
              </Badge>
              {topDismissible && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => handleDismissAlert(topAlert.id, e)}
                  aria-label="Dismiss alert"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {topAlert.message}
          </p>
          {carePlanEvalFolderLabel && (
            <p className="text-xs text-muted-foreground">
              Folder: {carePlanEvalFolderLabel}
            </p>
          )}
          {notificationCount > 1 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                +{notificationCount - 1} more alert{notificationCount > 2 ? 's' : ''}
              </p>
            </div>
          )}
          {canNavigateCareAlert && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  if (topAlert.type === URINE_NOT_RECORDED_6H_ALERT_TYPE) {
                    router.push(`/dashboard/residents/${residentId}/continence`);
                    return;
                  }
                  router.push(`/dashboard/residents/${residentId}/food-fluid`);
                }}
              >
                {topAlert.type === URINE_NOT_RECORDED_6H_ALERT_TYPE
                  ? "Open continence"
                  : "Open food & fluid"}
              </Button>
            </div>
          )}
          {canNavigateCarePlanEvalAlert && carePlanEvalCareFileHref && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(carePlanEvalCareFileHref as Route);
                }}
              >
                Open care file
              </Button>
            </div>
          )}
          {canNavigateMedicationAlert && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/residents/${residentId}/medication?tab=active` as Route);
                }}
              >
                Open medication
              </Button>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export const columns: ColumnDef<Resident, unknown>[] = [
  {
    id: "name",
    accessorFn: (row) => `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm"> Name </div>
      );
    },
    enableSorting: false,
    filterFn: (row, columnId, value) => {
      const resident = row.original;
      if (!value || typeof value !== 'string') return true;

      const searchTerm = value.toLowerCase().trim();
      if (!searchTerm) return true;

      const firstName = (resident.first_name || '').toLowerCase();
      const lastName = (resident.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      // Search in first name, last name, and full name
      return firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        fullName.includes(searchTerm);
    },
    cell: ({ row }) => {
      const resident = row.original;
      const name = `${resident.first_name} ${resident.last_name}`;
      const initials =
        `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();
      const age = getAge(resident.date_of_birth);

      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={resident.image_url} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="font-medium">
            <p>
              {resident.first_name} {resident.last_name}
            </p>{" "}
            <span className="text-muted-foreground">{age} years old</span>
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: "roomNumber",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">Room No</div>
      );
    },
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.room_number;
      const b = rowB.original.room_number;

      // Handle null/undefined values
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;

      // Try to parse as numbers for numeric sorting
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      // Fall back to string sorting
      return a.localeCompare(b);
    },
    cell: ({ row }) => {
      return (
        <p className="text-muted-foreground">
          {row.original.room_number || "-"}
        </p>
      );
    }
  },
  {
    accessorKey: "healthConditions",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          Health Conditions
        </div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const conditions = row.original.health_conditions;
      if (!conditions || conditions.length === 0) {
        return <Badge variant="table">No conditions</Badge>;
      }

      if (conditions.length > 2) {
        const extraConditions = conditions.length - 2;
        return (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide text-ellipsis">
            {conditions.slice(0, 2).map((condition, index: number) => (
              <Badge
                key={index}
                variant="table"
                className={getColorForBadge(condition.toString())}
              >
                {condition.toString()}
              </Badge>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="table">+{extraConditions}</Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-white border flex flex-row gap-2">
                {conditions.slice(2).map((condition, index: number) => (
                  <Badge
                    key={index}
                    variant="table"
                    className={getColorForBadge(condition.toString())}
                  >
                    {condition.toString()}
                  </Badge>
                ))}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      }

      return (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide text-ellipsis">
          {conditions?.map((condition, index: number) => (
            <Badge
              key={index}
              variant="table"
              className={getColorForBadge(condition.toString())}
            >
              {condition.toString()}
            </Badge>
          ))}
        </div>
      );
    }
  },
  {
    accessorKey: "risks",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm"> Risks </div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const risks = row.original.risks as { risk: string; level?: string }[];
      if (!risks || risks.length === 0) {
        return <Badge variant="outline">No risks</Badge>;
      }

      // Get the higher level risk
      const higherLevelRisk = risks.reduce((max, risk) => {
        return risk.level === "high" ? risk : max;
      }, risks[0]);

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="table"
              className={cn(
                higherLevelRisk.level === "high" &&
                "bg-red-50 text-red-700 border-red-300",
                higherLevelRisk.level === "medium" &&
                "bg-yellow-50 text-yellow-700 border-yellow-300",
                higherLevelRisk.level === "low" &&
                "bg-blue-50 text-blue-700 border-blue-300"
              )}
            >
              <p className="flex items-center gap-2">
                {risks.length} {risks.length > 1 ? "risks" : "risk"}
              </p>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="flex flex-col gap-2 bg-white border">
            {(risks as { risk: string; level?: string }[]).map(
              (riskItem, index: number) => (
                <div
                  key={index}
                  className="flex flex-row justify-between items-center text-primary w-full gap-4"
                >
                  <p className="text-primary font-medium">{riskItem.risk}</p>
                  <p className="text-muted-foreground">
                    {/* first letter uppercase */}
                    {riskItem.level
                      ? riskItem.level.charAt(0).toUpperCase() +
                      riskItem.level.slice(1)
                      : "Low"}
                  </p>
                </div>
              )
            )}
          </TooltipContent>
        </Tooltip>
      );
    }
  },
  {
    accessorKey: "allergies",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">Allergies</div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const resident = row.original;
      return <AllergiesCell residentId={resident.id} />;
    }
  },
  {
    accessorKey: "dependencies",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          Dependencies
        </div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const deps = row.original.dependencies;

      if (!deps) {
        return <Badge variant="outline">No dependencies</Badge>;
      }

      if (Array.isArray(deps)) {
        const depsList = (deps as string[]).filter(dep =>
          dep && dep.toLowerCase().trim() !== "independent"
        );

        if (depsList.length === 0) {
          return <Badge variant="outline">No dependencies</Badge>;
        }

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="table" className="bg-red-50 text-red-700 border-red-300">
                <p className="flex items-center gap-2">
                  {depsList.length}{" "}
                  {depsList.length > 1 ? "dependencies" : "dependency"}
                </p>
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="flex flex-col gap-2 bg-red-50 border-red-300">
              {depsList.map((dep, index: number) => (
                <div
                  key={index}
                  className="flex flex-row justify-between items-center text-primary w-full gap-4"
                >
                  <p className="text-primary font-medium">{dep}</p>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        );
      } else if (typeof deps === "object") {
        const depObj = deps as {
          mobility: string;
          eating: string;
          dressing: string;
          toileting: string;
        };

        const activeDeps = Object.entries(depObj).filter(
          ([, value]) => value && value.toLowerCase().trim() !== "independent"
        );

        if (activeDeps.length === 0) {
          return <Badge variant="outline">Independent</Badge>;
        }

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="table" className="bg-red-50 text-red-700 border-red-300">
                <p className="flex items-center gap-2">
                  {activeDeps.length}{" "}
                  {activeDeps.length > 1 ? "dependencies" : "dependency"}
                </p>
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="flex flex-col gap-2 bg-red-50 border-red-300">
              {activeDeps.map(([category, level], index: number) => (
                <div
                  key={index}
                  className="flex flex-row justify-between items-center text-primary w-full gap-4"
                >
                  <p className="text-primary font-medium capitalize">
                    {category}
                  </p>
                  <p className="text-muted-foreground">{level}</p>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        );
      }

      return "-";
    }
  },
  {
    accessorKey: "medication",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          Next Medication
        </div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const resident = row.original;
      return <NextMedicationCell residentId={resident.id} />;
    }
  },
  {
    accessorKey: "alerts",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          Alerts
        </div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const resident = row.original;
      return (
        <NotificationsCell
          residentId={resident.id}
          residentPhotoUpdatedAt={resident.photo_updated_at}
        />
      );
    }
  }
];
