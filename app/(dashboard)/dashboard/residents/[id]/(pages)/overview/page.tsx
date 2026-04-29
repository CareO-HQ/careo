"use client";
import React from "react";
import type { Route } from "next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { Resident } from "@/types";
import { canEditOverview } from "@/lib/permissions";
import { FEATURES } from "@/lib/config/features";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CreateResidentDialog from "@/components/residents/CreateResidentDialog";
import {
  ArrowLeft,
  Phone,
  Calendar,
  MapPin,
  Clock,
  User,
  FileText,
  Users,
  Edit3,
  Bell,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatTimestampToUKDateTime } from "@/lib/date-utils";
import { toast } from "sonner";
import {
  computeFoodFluidComplianceInWindow,
  FOOD_FLUID_ALERT_WINDOW_MS,
  FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE,
} from "@/lib/food-fluid-log-classification";
import { URINE_NOT_RECORDED_6H_ALERT_TYPE } from "@/lib/continence-alerts";
import { PRN_PROTOCOL_PENDING_12H_ALERT_TYPE } from "@/lib/medication-alerts";
import {
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
  carePlanEvaluationAlertCareFileHref,
  carePlanEvaluationAlertFolderLabel,
  extractRawCareFileFolderKeyFromGoals,
} from "@/lib/care-plan-evaluation-alerts";

const NON_DISMISSIBLE_ALERT_TYPES = new Set<string>([
  "resident_photo_refresh_required",
  "bowel_not_recorded_3_days",
  "weight_check_due_tomorrow",
  FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE,
  URINE_NOT_RECORDED_6H_ALERT_TYPE,
  PRN_PROTOCOL_PENDING_12H_ALERT_TYPE,
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
]);
const NURSE_ONLY_ALERT_TYPES = new Set<string>([
  "resident_photo_refresh_required",
  "bowel_not_recorded_3_days",
  PRN_PROTOCOL_PENDING_12H_ALERT_TYPE,
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
]);
const NURSE_AND_CARE_ASSISTANT_ALERT_TYPES = new Set<string>([
  "weight_check_due_tomorrow",
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
  if (type === "weight_check_due_tomorrow") {
    return "This alert cannot be dismissed until a new weight check is recorded";
  }
  if (type === FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE) {
    return "This alert cannot be dismissed until food and fluid are recorded in the last 6 hours";
  }
  if (type === URINE_NOT_RECORDED_6H_ALERT_TYPE) {
    return "This alert cannot be dismissed until urine is recorded";
  }
  if (type === PRN_PROTOCOL_PENDING_12H_ALERT_TYPE) {
    return "This alert cannot be dismissed until the PRN protocol form is completed";
  }
  if (
    type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE ||
    type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE
  ) {
    return "This alert cannot be dismissed until the care plan evaluation is completed";
  }
  return "This alert cannot be dismissed yet";
}

function canDismissAlert(
  alert: {
    type?: string;
    created_at?: string;
    metadata?: {
      medication_id?: string;
      care_plan_id?: string;
      care_file_folder_key?: string | null;
    } | null;
  },
  residentPhotoUpdatedAt?: string,
  residentLastBowelRecordedAt?: string,
  residentLastWeightCheckedAt?: string,
  foodFluidSixHourCompliant?: boolean,
  residentLastUrineRecordedAt?: string,
  completedPrnProtocolMedicationIds?: Set<string>,
  carePlanEvalLatestCreatedAt?: Record<string, string>
) {
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
  if (alert.type === PRN_PROTOCOL_PENDING_12H_ALERT_TYPE) {
    const medicationId = alert.metadata?.medication_id;
    if (!medicationId || !completedPrnProtocolMedicationIds) {
      return false;
    }
    return completedPrnProtocolMedicationIds.has(medicationId);
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

  if (alert.type === "weight_check_due_tomorrow") {
    if (!residentLastWeightCheckedAt) {
      return false;
    }
    return new Date(`${residentLastWeightCheckedAt}T23:59:59.999Z`).getTime() > new Date(alert.created_at).getTime();
  }

  return false;
}

function shouldShowAlertForRole(alert: { type?: string }, role?: string) {
  if (NURSE_AND_CARE_ASSISTANT_ALERT_TYPES.has(alert.type || "")) {
    return role === "nurse" || role === "care_assistant";
  }
  if (!NURSE_ONLY_ALERT_TYPES.has(alert.type || "")) {
    return true;
  }
  return role === "nurse";
}

type OverviewPageProps = {
  params: Promise<{ id: string }>;
};

export default function OverviewPage({ params }: OverviewPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = React.useState(false);
  const [resident, setResident] = React.useState<Resident | null | undefined>(undefined);
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [residentLastBowelRecordedAt, setResidentLastBowelRecordedAt] = React.useState<string | undefined>();
  const [residentLastUrineRecordedAt, setResidentLastUrineRecordedAt] = React.useState<string | undefined>();
  const [residentLastWeightCheckedAt, setResidentLastWeightCheckedAt] = React.useState<string | undefined>();
  const [foodFluidSixHourCompliant, setFoodFluidSixHourCompliant] = React.useState(false);
  const [completedPrnProtocolMedicationIds, setCompletedPrnProtocolMedicationIds] = React.useState<Set<string>>(new Set());
  const [carePlanEvalLatestCreatedAt, setCarePlanEvalLatestCreatedAt] = React.useState<Record<string, string>>({});
  const { profile } = useProfile();
  const { supabase } = useSupabase();
  const userRole = profile?.role;

  const fetchResidentData = React.useCallback(async () => {
    if (!supabase) return;

    // Fetch resident with emergency contacts
    const { data, error } = await supabase
      .from("residents")
      .select("*, emergency_contacts(*)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching resident overview:", error);
      setResident(null);
    } else {
      setResident(data as Resident);
    }

    const { data: latestBowelEntry } = await supabase
      .from("continence_entries")
      .select("created_at")
      .eq("resident_id", id)
      .eq("entry_type", "bowel")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setResidentLastBowelRecordedAt(latestBowelEntry?.created_at);

    const { data: latestWeightRecord } = await supabase
      .from("weight_records")
      .select("measurement_date")
      .eq("resident_id", id)
      .order("measurement_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    setResidentLastWeightCheckedAt(latestWeightRecord?.measurement_date);

    const { data: latestUrineEntry } = await supabase
      .from("continence_entries")
      .select("created_at")
      .eq("resident_id", id)
      .eq("entry_type", "urine")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setResidentLastUrineRecordedAt(latestUrineEntry?.created_at);

    const windowStartIso = new Date(Date.now() - FOOD_FLUID_ALERT_WINDOW_MS).toISOString();
    const { data: foodFluidRows } = await supabase
      .from("food_fluid_logs")
      .select("timestamp, type_of_food_drink, amount_eaten, fluid_consumed_ml")
      .eq("resident_id", id)
      .gte("timestamp", windowStartIso)
      .eq("is_archived", false);

    const { foodOk, fluidOk } = computeFoodFluidComplianceInWindow(foodFluidRows ?? []);
    const foodFluidCompliant = foodOk && fluidOk;
    setFoodFluidSixHourCompliant(foodFluidCompliant);

    const { data: prnProtocolRows } = await supabase
      .from("prn_protocols")
      .select("medication_id")
      .eq("resident_id", id)
      .neq("status", "archived");

    const completedMedicationIds = new Set(
      (prnProtocolRows ?? [])
        .map((row) => row.medication_id)
        .filter((medicationId): medicationId is string => typeof medicationId === "string" && medicationId.length > 0)
    );
    setCompletedPrnProtocolMedicationIds(completedMedicationIds);

    const { data: cpEvalRows } = await supabase
      .from("care_plan_evaluations")
      .select("care_plan_id, created_at")
      .eq("resident_id", id);

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

    // Fetch alerts if user has a role
    if (userRole && profile?.id) {
      // Fetch active alerts for the resident
      const { data: alertsData, error: alertsError } = await supabase
        .from("alerts")
        .select("*")
        .eq("resident_id", id)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });

      if (alertsError) {
        setAlerts([]);
        return;
      }

      const carePlanAlertIds = (alertsData ?? [])
        .filter(
          (alert) =>
            alert.type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE ||
            alert.type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE
        )
        .map((alert) => alert.metadata?.care_plan_id)
        .filter((idValue): idValue is string => typeof idValue === "string" && idValue.length > 0);

      let alertsWithResolvedMetadata = alertsData ?? [];
      if (carePlanAlertIds.length > 0) {
        const { data: carePlanRows } = await supabase
          .from("care_plan_assessments")
          .select("id, care_plan_type, folder_key, goals, wound_folder_id")
          .in("id", [...new Set(carePlanAlertIds)]);

        const carePlanById = new Map(
          (carePlanRows ?? []).map((row) => [row.id, row])
        );

        alertsWithResolvedMetadata = (alertsData ?? []).map((alert) => {
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
            data?.photo_updated_at,
            latestBowelEntry?.created_at,
            latestWeightRecord?.measurement_date,
            foodFluidCompliant,
            latestUrineEntry?.created_at,
            completedMedicationIds,
            carePlanEvalLatest
          )
        ) {
          return true;
        }
        return !dismissedAlertIds.has(alert.id);
      });
      
      setAlerts(filteredAlerts);
    }
  }, [id, supabase, userRole, profile?.id]);

  React.useEffect(() => {
    fetchResidentData();
  }, [fetchResidentData]);

  // Use backend-calculated values if available, with memoized fallback
  // IMPORTANT: These hooks must be called before any early returns to comply with Rules of Hooks
  const age = React.useMemo(() => {
    if (!resident) return 0;

    const dob = resident.date_of_birth;
    if (!dob) return 0;

    // Fallback calculation
    const today = new Date();
    const birthDate = new Date(dob);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    return calculatedAge;
  }, [resident]);

  const lengthOfStayDisplay = React.useMemo(() => {
    const admissionDate = resident?.admission_date;
    if (!admissionDate) return "";

    // Fallback calculation
    const today = new Date();
    const admission = new Date(admissionDate);
    const diffTime = Math.abs(today.getTime() - admission.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''} ${remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  }, [resident?.admission_date]);

  // Derive alert count from alerts
  const alertCount = React.useMemo(() => {
    if (!alerts) return { total: 0, critical: 0, warning: 0, info: 0 };
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === "critical").length,
      warning: alerts.filter(a => a.severity === "warning").length,
      info: alerts.filter(a => a.severity === "info").length,
    };
  }, [alerts]);

  const handleDismissAlert = async (alertId: string) => {
    if (!supabase || !profile?.id) return;
    const alert = alerts.find((item) => item.id === alertId);
    if (
      alert &&
      !canDismissAlert(
        alert,
        resident?.photo_updated_at,
        residentLastBowelRecordedAt,
        residentLastWeightCheckedAt,
        foodFluidSixHourCompliant,
        residentLastUrineRecordedAt,
        completedPrnProtocolMedicationIds,
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
      fetchResidentData();
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
      toast.error("Failed to dismiss alert");
    }
  };

  // Now safe to do early returns after all hooks have been called
  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = [resident.first_name, resident.last_name].filter(Boolean).join(" ");
  const initials =
    `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();
  const lastPhotoUpdatedOn = resident.photo_updated_at
    ? formatTimestampToUKDateTime(resident.photo_updated_at, "dd/MM/yyyy")
    : "Not set";
  const showLastUpdateCard = Boolean(resident.photo_updated_at);

  return (
    <>
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-16 h-16">
          <AvatarImage src={resident.image_url} alt={fullName} className="border" />
          <AvatarFallback className="text-base bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-black text-xl">{fullName}</span>
            <span className="text-muted-foreground">/ Overview</span>
          </div>
          <p className="text-muted-foreground text-sm">
            View basic information and summary
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Last photo updated: {lastPhotoUpdatedOn}
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <Button
            variant="outline"
            size="icon"
            className="relative bg-gray-50 hover:bg-gray-100"
            onClick={() => setShowAlertsDialog(true)}
          >
            <Bell className="h-5 w-5" />
            {alertCount && alertCount.total > 0 && (
              <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-xs flex items-center justify-center font-semibold shadow-md ${alertCount.critical > 0 ? 'bg-red-600' : 'bg-orange-500'
              }`}>
                {alertCount.total}
              </span>
            )}
          </Button>
          {canEditOverview(userRole) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats Summary */}
      <Card className="shadow-none">
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Quick Overview</span>
            </div>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Quick Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 ${showLastUpdateCard ? "md:grid-cols-5" : "md:grid-cols-4"} gap-4`}>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {age}
              </div>
              <p className="text-sm text-blue-700">Years Old</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {lengthOfStayDisplay.split(' ')[0]}
              </div>
              <p className="text-sm text-green-700">
                {lengthOfStayDisplay.includes('day') ? 'Days' :
                  lengthOfStayDisplay.includes('month') ? 'Months' : 'Years'} Here
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {resident.emergency_contacts?.length || 0}
              </div>
              <p className="text-sm text-purple-700">Emergency Contacts</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {resident.room_number ? 1 : 0}
              </div>
              <p className="text-sm text-orange-700">Room Assigned</p>
            </div>
            {showLastUpdateCard && (
              <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-sm font-semibold text-slate-700">
                  {lastPhotoUpdatedOn}
                </div>
                <p className="text-sm text-slate-700">Photo last updated on</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Personal Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Full Name</p>
                <p className="font-medium text-sm">{fullName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Date of Birth</p>
                <p className="font-medium text-sm">{resident.date_of_birth}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Room Number</p>
                <p className="font-medium text-sm">{resident.room_number || "Not assigned"}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Clock className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Admission Date</p>
                <p className="font-medium text-sm">{resident.admission_date}</p>
              </div>
            </div>

            {resident.phone_number && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Phone Number</p>
                  <p className="font-medium text-sm">{resident.phone_number}</p>
                </div>
              </div>
            )}

            {resident.nhs_health_number && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">NHS Health Number</p>
                  <p className="font-medium font-mono text-sm">{resident.nhs_health_number}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5 text-blue-600" />
              <span>Key Contacts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Next of Kin / Emergency Contacts */}
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center">
                  <Users className="w-4 h-4 text-red-600 mr-2" />
                  Next of Kin
                </h4>
                {resident.emergency_contacts && resident.emergency_contacts.length > 0 ? (
                  <div className="space-y-3">
                    {resident.emergency_contacts.map((contact: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-sm text-gray-900">{contact.name}</h5>
                          {contact.is_primary && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Relationship:</span> {contact.relationship}
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Phone:</span> {contact.phone_number}
                          </p>
                          {contact.address && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Address:</span> {contact.address}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <Users className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No emergency contacts on file</p>
                  </div>
                )}
              </div>

              {/* GP Details */}
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center">
                  <FileText className="w-4 h-4 text-blue-600 mr-2" />
                  GP Details
                </h4>
                {resident.gp_name || resident.gp_phone || resident.gp_address ? (
                  <div className="p-3 border rounded-lg">
                    <div className="mb-2">
                      <h5 className="font-semibold text-sm text-gray-900">
                        {resident.gp_name || "General Practitioner"}
                      </h5>
                    </div>
                    <div className="space-y-1">
                      {resident.gp_phone && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Phone:</span> {resident.gp_phone}
                        </p>
                      )}
                      {resident.gp_address && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Address:</span> {resident.gp_address}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <FileText className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No GP details on file</p>
                  </div>
                )}
              </div>

              {/* Care Manager Details */}
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center">
                  <User className="w-4 h-4 text-green-600 mr-2" />
                  Care Manager
                </h4>
                {resident.care_manager_name || resident.care_manager_phone || resident.care_manager_address ? (
                  <div className="p-3 border rounded-lg">
                    <div className="mb-2">
                      <h5 className="font-semibold text-sm text-gray-900">
                        {resident.care_manager_name || "Care Manager"}
                      </h5>
                    </div>
                    <div className="space-y-1">
                      {resident.care_manager_phone && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Phone:</span> {resident.care_manager_phone}
                        </p>
                      )}
                      {resident.care_manager_address && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Address:</span> {resident.care_manager_address}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <User className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No care manager details on file</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Dialog */}
      <Dialog open={showAlertsDialog} onOpenChange={setShowAlertsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alerts for {fullName}</DialogTitle>
            <DialogDescription>
              {alerts && alerts.length > 0
                ? `${alerts.length} active alert${alerts.length !== 1 ? 's' : ''} requiring attention`
                : "No active alerts"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert) => {
                const isFoodFluidNavAlert =
                  alert.type === FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE &&
                  (userRole === "nurse" || userRole === "care_assistant");
                const isUrineNavAlert =
                  alert.type === URINE_NOT_RECORDED_6H_ALERT_TYPE &&
                  (userRole === "nurse" || userRole === "care_assistant");
                const isPrnProtocolNavAlert =
                  alert.type === PRN_PROTOCOL_PENDING_12H_ALERT_TYPE && userRole === "nurse";
                const carePlanEvalCareFileHref =
                  FEATURES.SHOW_CARE_FILE_V2 && userRole === "nurse"
                    ? carePlanEvaluationAlertCareFileHref(id, alert.metadata)
                    : null;
                const isCarePlanEvalNavAlert =
                  (alert.type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE ||
                    alert.type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE) &&
                  carePlanEvalCareFileHref !== null;
                const carePlanEvalFolderLabel = isCarePlanEvalNavAlert
                  ? carePlanEvaluationAlertFolderLabel(alert.metadata)
                  : null;
                const isNavigationAlert =
                  isFoodFluidNavAlert ||
                  isUrineNavAlert ||
                  isPrnProtocolNavAlert ||
                  isCarePlanEvalNavAlert;
                const goToFoodFluid = () => {
                  setShowAlertsDialog(false);
                  router.push(`/dashboard/residents/${id}/food-fluid`);
                };
                const goToContinence = () => {
                  setShowAlertsDialog(false);
                  router.push(`/dashboard/residents/${id}/continence`);
                };
                const goToMedicationDocs = () => {
                  setShowAlertsDialog(false);
                  router.push(`/dashboard/residents/${id}/medication/docs`);
                };
                const goToCarePlanFolder = () => {
                  if (!carePlanEvalCareFileHref) return;
                  setShowAlertsDialog(false);
                  router.push(carePlanEvalCareFileHref as Route);
                };
                return (
                  <div
                    key={alert.id}
                    role={isNavigationAlert ? "button" : undefined}
                    tabIndex={isNavigationAlert ? 0 : undefined}
                    className={cn(
                      "p-4 rounded-lg border-2",
                      alert.severity === "critical"
                        ? "border-red-300 bg-red-50"
                        : alert.severity === "warning"
                          ? "border-orange-300 bg-orange-50"
                          : "border-blue-300 bg-blue-50",
                      isNavigationAlert && "cursor-pointer outline-none hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    onClick={() => {
                      if (isFoodFluidNavAlert) goToFoodFluid();
                      if (isUrineNavAlert) goToContinence();
                      if (isPrnProtocolNavAlert) goToMedicationDocs();
                      if (isCarePlanEvalNavAlert) goToCarePlanFolder();
                    }}
                    onKeyDown={(e) => {
                      if (!isNavigationAlert) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (isFoodFluidNavAlert) {
                          goToFoodFluid();
                        }
                        if (isUrineNavAlert) {
                          goToContinence();
                        }
                        if (isPrnProtocolNavAlert) {
                          goToMedicationDocs();
                        }
                        if (isCarePlanEvalNavAlert) {
                          goToCarePlanFolder();
                        }
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="table"
                            className={cn(
                              alert.severity === "critical"
                                ? "bg-red-100 text-red-800 border-red-400"
                                : alert.severity === "warning"
                                  ? "bg-orange-100 text-orange-800 border-orange-400"
                                  : "bg-blue-100 text-blue-800 border-blue-400"
                            )}
                          >
                            {alert.severity === "critical"
                              ? "Critical"
                              : alert.severity === "warning"
                                ? "Warning"
                                : "Info"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestampToUKDateTime(alert.created_at, 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        {carePlanEvalFolderLabel && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Folder: {carePlanEvalFolderLabel}
                          </p>
                        )}
                        {isFoodFluidNavAlert && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Click this alert to open food & fluid
                          </p>
                        )}
                        {isUrineNavAlert && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Click this alert to open continence
                          </p>
                        )}
                        {isPrnProtocolNavAlert && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Click this alert to open medication docs
                          </p>
                        )}
                        {isCarePlanEvalNavAlert && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Click this alert to open the care file folder for this care plan
                          </p>
                        )}
                      </div>
                      {canDismissAlert(
                        alert,
                        resident?.photo_updated_at,
                        residentLastBowelRecordedAt,
                        residentLastWeightCheckedAt,
                        foodFluidSixHourCompliant,
                        residentLastUrineRecordedAt,
                        completedPrnProtocolMedicationIds,
                        carePlanEvalLatestCreatedAt
                      ) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissAlert(alert.id);
                          }}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active alerts</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Resident Dialog */}
      <CreateResidentDialog
        isResidentDialogOpen={isEditDialogOpen}
        setIsResidentDialogOpen={setIsEditDialogOpen}
        editMode={true}
        residentData={resident}
      />
    </>
  );
}