"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Clock,
  User,
  AlertCircle,
  Home,
  UserCheck,
  FileText,
  Shield,
  Activity,
  Mail,
  Signature,
  ChevronDownIcon,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// --- Time options in 15-minute intervals ---
const TIME_OPTIONS_15MIN: string[] = (() => {
  const options: string[] = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 15) {
      options.push(
        `${i.toString().padStart(2, "0")}:${j.toString().padStart(2, "0")}`
      );
    }
  }
  return options;
})();

// --- Zod Schema (comprehensive) ---
const IncidentFormSchema = z.object({
  // Section 1: Incident Details
  date: z.date(),
  time: z.string().min(1, "Time is required"),
  homeName: z.string().min(1, "Home name is required"),
  unit: z.string().min(1, "Unit is required"),

  // Section 2: Injured Person Details
  injuredPersonFirstName: z.string().min(1, "First name is required"),
  injuredPersonSurname: z.string().min(1, "Surname is required"),
  injuredPersonDOB: z.date(),
  residentInternalId: z.string().optional(),
  dateOfAdmission: z.date().optional(),
  healthCareNumber: z.string().optional(),

  // Section 3: Status of Injured Person
  injuredPersonStatus: z.array(z.string()).optional(),
  contractorEmployer: z.string().optional(),

  // Section 4: Type of Incident
  incidentTypes: z
    .array(z.string())
    .min(1, "At least one incident type must be selected"),
  typeOtherDetails: z.string().optional(),

  // Section 5-6: Fall-Specific Questions
  anticoagulantMedication: z.enum(["yes", "no", "unknown"]).optional(),
  fallPathway: z.enum(["green", "amber", "red"]).optional(),

  // Section 7: Detailed Description
  detailedDescription: z
    .string()
    .min(10, "Please provide a detailed description"),

  // Section 8: Incident Level
  incidentLevel: z.enum([
    "death",
    "permanent_harm",
    "minor_injury",
    "no_harm",
    "near_miss",
  ]),

  // Section 9: Details of Injury
  injuryDescription: z.string().optional(),
  bodyPartInjured: z.string().optional(),

  // Section 10: Treatment Required
  treatmentTypes: z.array(z.string()).optional(),

  // Section 11: Details of Treatment Given
  treatmentDetails: z.string().optional(),
  vitalSigns: z.string().optional(),
  treatmentRefused: z.boolean().optional(),

  // Section 12: Witnesses
  witness1Name: z.string().optional(),
  witness1Contact: z.string().optional(),
  witness2Name: z.string().optional(),
  witness2Contact: z.string().optional(),

  // Section 13: Further Actions by Nurse
  nurseActions: z.array(z.string()).optional(),

  // Section 14: Further Actions Advised
  furtherActionsAdvised: z.string().optional(),

  // Section 15: Prevention Measures
  preventionMeasures: z.string().optional(),

  // Section 16: Home Manager Informed
  homeManagerInformedBy: z.string().optional(),
  homeManagerInformedDateTime: z.date().optional(),

  // Section 17: Out of Hours On-Call
  onCallManagerName: z.string().optional(),
  onCallContactedDateTime: z.date().optional(),

  // Section 18: Next of Kin Informed
  nokInformedWho: z.string().optional(),
  nokInformedBy: z.string().optional(),
  nokInformedDateTime: z.date().optional(),

  // Section 19: Trust Incident Form Recipients
  careManagerName: z.string().optional(),
  careManagerEmail: z.string().email().optional().or(z.literal("")),
  keyWorkerName: z.string().optional(),
  keyWorkerEmail: z.string().email().optional().or(z.literal("")),

  // Section 20: Form Completion Details
  completedByFullName: z.string().min(1, "Your full name is required"),
  completedByJobTitle: z.string().min(1, "Your job title is required"),
  completedBySignature: z.string().optional(),
  dateCompleted: z.date(),
});

type IncidentFormData = z.infer<typeof IncidentFormSchema>;

// --- Options ---
const INCIDENT_TYPE_OPTIONS = [
  { value: "FallWitnessed", label: "Fall (witnessed)" },
  { value: "FallUnwitnessed", label: "Fall (unwitnessed)" },
  { value: "PressureUlcer", label: "Pressure ulcer" },
  { value: "Wound", label: "Wound" },
  { value: "Illness", label: "Illness" },
  { value: "NearMiss", label: "Near miss" },
  { value: "ExpectedDeath", label: "Expected death" },
  { value: "UnexpectedDeath", label: "Unexpected death" },
  { value: "StaffingLevels", label: "Staffing levels" },
  { value: "Equipment", label: "Equipment" },
  { value: "StaffAccident", label: "Staff accident" },
  { value: "AbuseOfStaff", label: "Abuse of staff" },
  { value: "Behavioural", label: "Behavioural issues" },
  { value: "Safeguarding", label: "Safeguarding involving resident" },
  { value: "Medication", label: "Medication incident" },
  { value: "AbsentWithoutLeave", label: "Absent without leave" },
  { value: "WeightLoss", label: "Weight loss" },
  { value: "Choking", label: "Choking" },
  { value: "Bruise", label: "Bruise" },
  {
    value: "ResidentAltercation",
    label: "Resident-on-resident altercation",
  },
  { value: "Infection", label: "Infection" },
  { value: "Covid", label: "COVID" },
  { value: "FireSafety", label: "Fire & safety" },
  { value: "SelfHarm", label: "Self-harm" },
  { value: "PSNI", label: "PSNI (police) involvement" },
  { value: "Theft", label: "Theft" },
  { value: "MissingResident", label: "Missing resident" },
  { value: "Other", label: "Other" },
];

const TREATMENT_OPTIONS = [
  { value: "FirstAid", label: "First aid" },
  { value: "GP", label: "Referred to GP" },
  { value: "Paramedic", label: "Paramedic attended" },
  { value: "ED", label: "Taken to ED (Emergency Department)" },
  { value: "HospitalAdmit", label: "Admitted to hospital" },
  { value: "999", label: "999 ambulance" },
];

const NURSE_ACTION_OPTIONS = [
  { value: "OnCallManager", label: "On-call manager informed" },
  { value: "DutySocialWorker", label: "Duty social worker informed" },
  { value: "CarePlanUpdated", label: "Care plan updated" },
  { value: "BodyMapCompleted", label: "Body map completed" },
  {
    value: "TrustIncidentReport",
    label: "Trust incident report emailed to home manager",
  },
  { value: "RiskAssessment", label: "Risk assessment completed" },
  { value: "ObservationsCommenced", label: "Observations commenced" },
  { value: "WoundAssessment", label: "Wound assessment completed" },
  {
    value: "SafeguardingForms",
    label: "Safeguarding forms prepared for home manager",
  },
  { value: "KeyWorkerContacted", label: "Key worker contacted" },
];

const PERSON_STATUS_OPTIONS = [
  { value: "Resident", label: "Resident in Care" },
  { value: "Relative", label: "Relative" },
  { value: "Staff", label: "Staff Member" },
  { value: "AgencyStaff", label: "Agency Staff" },
  { value: "Visitor", label: "Visitor" },
  { value: "Contractor", label: "Contractor" },
];

// --- Props ---
interface SimpleIncidentFormProps {
  residentId: string;
  folderId: string;
  residentName: string;
  onSaved?: () => void;
}

export function SimpleIncidentForm({
  residentId,
  folderId,
  residentName,
  onSaved,
}: SimpleIncidentFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [resident, setResident] = React.useState<any>(null);
  const [careHomeData, setCareHomeData] = React.useState<any>(null);
  const [teamData, setTeamData] = React.useState<any>(null);
  const [existingIncidentId, setExistingIncidentId] = React.useState<string | null>(null);

  // Popover states for date pickers
  const [doiPopoverOpen, setDoiPopoverOpen] = React.useState(false);
  const [dobPopoverOpen, setDobPopoverOpen] = React.useState(false);
  const [admissionDatePopoverOpen, setAdmissionDatePopoverOpen] =
    React.useState(false);
  const [homeManagerDatePopoverOpen, setHomeManagerDatePopoverOpen] =
    React.useState(false);
  const [onCallDatePopoverOpen, setOnCallDatePopoverOpen] =
    React.useState(false);
  const [nokDatePopoverOpen, setNokDatePopoverOpen] = React.useState(false);

  const { profile } = useProfile();
  const currentUserName = profile?.name || "";

  // Format role into a readable job title
  const formatRoleAsJobTitle = (role?: string) => {
    if (!role) return "";
    const roleTitleMap: Record<string, string> = {
      saas_admin: "System Administrator",
      owner: "Owner",
      manager: "Manager",
      nurse: "Nurse",
      care_assistant: "Care Assistant",
    };
    return roleTitleMap[role] || role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Fetch resident, care home, team data, and existing incident for this folder
  React.useEffect(() => {
    const fetchData = async () => {
      if (!residentId) return;
      setIsLoading(true);
      try {
        const { data: resData, error: resError } = await supabase
          .from("residents")
          .select("*")
          .eq("id", residentId)
          .single();

        if (resError) throw resError;

        let homeData = null;
        let tData = null;

        if (resData?.care_home_id) {
          const { data, error: homeError } = await supabase
            .from("care_homes")
            .select("*, organizations(*)")
            .eq("id", resData.care_home_id)
            .single();

          if (!homeError) homeData = data;
        }

        if (resData?.team_id) {
          const { data, error: tError } = await supabase
            .from("teams")
            .select("*")
            .eq("id", resData.team_id)
            .single();

          if (!tError) tData = data;
        }

        // Fetch existing incident for this folder
        if (folderId) {
          const { data: existingIncident, error: incError } = await supabase
            .from("incidents")
            .select("*")
            .eq("folder_id", folderId)
            .maybeSingle();

          if (!incError && existingIncident) {
            setExistingIncidentId(existingIncident.id);
          }
        }

        // Set all state together so the populate effect has complete data
        setResident(resData);
        setCareHomeData(homeData);
        setTeamData(tData);
      } catch (error) {
        console.error("Error fetching form data:", error);
        toast.error("Failed to load resident data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [residentId, folderId]);

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(IncidentFormSchema),
    defaultValues: {
      date: new Date(),
      time: format(new Date(), "HH:mm"),
      homeName: "",
      unit: "",
      injuredPersonFirstName: "",
      injuredPersonSurname: "",
      injuredPersonDOB: new Date(),
      residentInternalId: "",
      dateOfAdmission: undefined,
      healthCareNumber: "",
      injuredPersonStatus: ["Resident"],
      contractorEmployer: "",
      incidentTypes: [],
      typeOtherDetails: "",
      anticoagulantMedication: undefined,
      fallPathway: undefined,
      detailedDescription: "",
      incidentLevel: "no_harm",
      injuryDescription: "",
      bodyPartInjured: "",
      treatmentTypes: [],
      treatmentDetails: "",
      vitalSigns: "",
      treatmentRefused: false,
      witness1Name: "",
      witness1Contact: "",
      witness2Name: "",
      witness2Contact: "",
      nurseActions: [],
      furtherActionsAdvised: "",
      preventionMeasures: "",
      homeManagerInformedBy: "",
      homeManagerInformedDateTime: undefined,
      onCallManagerName: "",
      onCallContactedDateTime: undefined,
      nokInformedWho: "",
      nokInformedBy: "",
      nokInformedDateTime: undefined,
      careManagerName: "",
      careManagerEmail: "",
      keyWorkerName: "",
      keyWorkerEmail: "",
      completedByFullName: "",
      completedByJobTitle: "",
      completedBySignature: "",
      dateCompleted: new Date(),
    },
  });

  // Populate form when data loads — either from existing incident or prefilled defaults
  const hasPopulatedRef = React.useRef(false);
  React.useEffect(() => {
    if (resident && !isLoading && !hasPopulatedRef.current) {
      hasPopulatedRef.current = true;

      const jobTitle = formatRoleAsJobTitle(profile?.role);

      // If we have an existing incident for this folder, load it
      if (existingIncidentId) {
        const loadExisting = async () => {
          const { data: inc, error } = await supabase
            .from("incidents")
            .select("*")
            .eq("id", existingIncidentId)
            .single();

          if (error || !inc) {
            console.error("Error loading existing incident:", error);
            return;
          }

          form.reset({
            date: inc.date ? new Date(inc.date) : new Date(),
            time: inc.time || format(new Date(), "HH:mm"),
            homeName: inc.home_name || "",
            unit: inc.unit || "",
            injuredPersonFirstName: inc.injured_person_first_name || "",
            injuredPersonSurname: inc.injured_person_surname || "",
            injuredPersonDOB: inc.injured_person_dob
              ? new Date(inc.injured_person_dob)
              : new Date(),
            residentInternalId: inc.resident_internal_id || "",
            dateOfAdmission: inc.date_of_admission
              ? new Date(inc.date_of_admission)
              : undefined,
            healthCareNumber: inc.health_care_number || "",
            injuredPersonStatus: inc.injured_person_status || ["Resident"],
            contractorEmployer: inc.contractor_employer || "",
            incidentTypes: inc.incident_types || [],
            typeOtherDetails: inc.type_other_details || "",
            anticoagulantMedication: inc.anticoagulant_medication || undefined,
            fallPathway: inc.fall_pathway || undefined,
            detailedDescription: inc.detailed_description || "",
            incidentLevel: inc.incident_level || "no_harm",
            injuryDescription: inc.injury_description || "",
            bodyPartInjured: inc.body_part_injured || "",
            treatmentTypes: inc.treatment_types || [],
            treatmentDetails: inc.treatment_details || "",
            vitalSigns: inc.vital_signs || "",
            treatmentRefused: inc.treatment_refused || false,
            witness1Name: inc.witness1_name || "",
            witness1Contact: inc.witness1_contact || "",
            witness2Name: inc.witness2_name || "",
            witness2Contact: inc.witness2_contact || "",
            nurseActions: inc.nurse_actions || [],
            furtherActionsAdvised: inc.further_actions_advised || "",
            preventionMeasures: inc.prevention_measures || "",
            homeManagerInformedBy: inc.home_manager_informed_by || "",
            homeManagerInformedDateTime: inc.home_manager_informed_date_time
              ? new Date(inc.home_manager_informed_date_time)
              : undefined,
            onCallManagerName: inc.on_call_manager_name || "",
            onCallContactedDateTime: inc.on_call_contacted_date_time
              ? new Date(inc.on_call_contacted_date_time)
              : undefined,
            nokInformedWho: inc.nok_informed_who || "",
            nokInformedBy: inc.nok_informed_by || "",
            nokInformedDateTime: inc.nok_informed_date_time
              ? new Date(inc.nok_informed_date_time)
              : undefined,
            careManagerName: inc.trust_care_manager_name || "",
            careManagerEmail: inc.trust_care_manager_email || "",
            keyWorkerName: inc.trust_key_worker_name || "",
            keyWorkerEmail: inc.trust_key_worker_email || "",
            completedByFullName: inc.completed_by_full_name || "",
            completedByJobTitle: inc.completed_by_job_title || "",
            completedBySignature: inc.completed_by_signature || "",
            dateCompleted: inc.date_completed
              ? new Date(inc.date_completed)
              : new Date(),
          });
        };
        loadExisting();
      } else {
        // No existing incident — set defaults with prefilled data
        form.reset({
          date: new Date(),
          time: format(new Date(), "HH:mm"),
          homeName: careHomeData?.name || profile?.care_home_name || "",
          unit: teamData?.name || profile?.active_team_name || "",
          injuredPersonFirstName: resident?.first_name || "",
          injuredPersonSurname: resident?.last_name || "",
          injuredPersonDOB: resident?.date_of_birth
            ? new Date(resident.date_of_birth)
            : new Date(),
          residentInternalId: resident?.room_number
            ? `Room ${resident.room_number}`
            : residentId,
          dateOfAdmission: resident?.admission_date
            ? new Date(resident.admission_date)
            : undefined,
          healthCareNumber: resident?.nhs_health_number || "",
          injuredPersonStatus: ["Resident"],
          contractorEmployer: "",
          incidentTypes: [],
          typeOtherDetails: "",
          anticoagulantMedication: undefined,
          fallPathway: undefined,
          detailedDescription: "",
          incidentLevel: "no_harm",
          injuryDescription: "",
          bodyPartInjured: "",
          treatmentTypes: [],
          treatmentDetails: "",
          vitalSigns: "",
          treatmentRefused: false,
          witness1Name: "",
          witness1Contact: "",
          witness2Name: "",
          witness2Contact: "",
          nurseActions: [],
          furtherActionsAdvised: "",
          preventionMeasures: "",
          homeManagerInformedBy: "",
          homeManagerInformedDateTime: undefined,
          onCallManagerName: "",
          onCallContactedDateTime: undefined,
          nokInformedWho: resident?.next_of_kin?.name || "",
          nokInformedBy: "",
          nokInformedDateTime: undefined,
          careManagerName:
            resident?.care_manager?.name || resident?.care_manager_name || "",
          careManagerEmail: resident?.care_manager?.email || "",
          keyWorkerName: resident?.key_worker?.name || "",
          keyWorkerEmail: resident?.key_worker?.email || "",
          completedByFullName: currentUserName,
          completedByJobTitle: jobTitle,
          completedBySignature: currentUserName,
          dateCompleted: new Date(),
        });
      }
    }
  }, [resident, isLoading, careHomeData, teamData, currentUserName, profile, form, residentId, existingIncidentId]);

  const watchedIncidentTypes = form.watch("incidentTypes");
  const hasFallType =
    watchedIncidentTypes?.some(
      (type) => type === "FallWitnessed" || type === "FallUnwitnessed"
    ) || false;

  async function onSubmit(values: IncidentFormData) {
    try {
      setIsSubmitting(true);

      const incidentData = {
        date: values.date.toISOString().split("T")[0],
        time: values.time,
        home_name: values.homeName,
        unit: values.unit,
        injured_person_first_name: values.injuredPersonFirstName,
        injured_person_surname: values.injuredPersonSurname,
        injured_person_dob: values.injuredPersonDOB.toISOString().split("T")[0],
        resident_id: residentId,
        folder_id: folderId,
        resident_internal_id: values.residentInternalId,
        date_of_admission: values.dateOfAdmission
          ?.toISOString()
          .split("T")[0],
        health_care_number: values.healthCareNumber,
        care_home_id: resident?.care_home_id,
        organization_id: resident?.organization_id,
        team_id: resident?.team_id,
        injured_person_status: values.injuredPersonStatus,
        contractor_employer: values.contractorEmployer,
        incident_types: values.incidentTypes,
        type_other_details: values.typeOtherDetails,
        anticoagulant_medication: values.anticoagulantMedication,
        fall_pathway: values.fallPathway,
        detailed_description: values.detailedDescription,
        incident_level: values.incidentLevel,
        injury_description: values.injuryDescription,
        body_part_injured: values.bodyPartInjured,
        treatment_types: values.treatmentTypes,
        treatment_details: values.treatmentDetails,
        vital_signs: values.vitalSigns,
        treatment_refused: values.treatmentRefused,
        witness1_name: values.witness1Name,
        witness1_contact: values.witness1Contact,
        witness2_name: values.witness2Name,
        witness2_contact: values.witness2Contact,
        nurse_actions: values.nurseActions,
        further_actions_advised: values.furtherActionsAdvised,
        prevention_measures: values.preventionMeasures,
        home_manager_informed_by: values.homeManagerInformedBy,
        home_manager_informed_date_time:
          values.homeManagerInformedDateTime?.toISOString(),
        on_call_manager_name: values.onCallManagerName,
        on_call_contacted_date_time:
          values.onCallContactedDateTime?.toISOString(),
        nok_informed_who: values.nokInformedWho,
        nok_informed_by: values.nokInformedBy,
        nok_informed_date_time: values.nokInformedDateTime?.toISOString(),
        trust_care_manager_name: values.careManagerName,
        trust_care_manager_email: values.careManagerEmail,
        trust_key_worker_name: values.keyWorkerName,
        trust_key_worker_email: values.keyWorkerEmail,
        completed_by_full_name: values.completedByFullName,
        completed_by_job_title: values.completedByJobTitle,
        completed_by_signature: values.completedBySignature,
        date_completed: values.dateCompleted.toISOString().split("T")[0],
        created_by: profile?.id,
        updated_at: new Date().toISOString(),
      };

      let savedIncident;

      if (existingIncidentId) {
        // Update existing incident
        const { data, error } = await supabase
          .from("incidents")
          .update(incidentData)
          .eq("id", existingIncidentId)
          .select()
          .single();

        if (error) throw error;
        savedIncident = data;
        toast.success("Incident report updated successfully");
      } else {
        // Insert new incident
        const { data, error } = await supabase
          .from("incidents")
          .insert(incidentData)
          .select()
          .single();

        if (error) throw error;
        savedIncident = data;
        setExistingIncidentId(data.id);

        // Create notification only for new incidents
        if (savedIncident && resident) {
          try {
            await supabase.from("notifications").insert({
              organization_id: resident.organization_id,
              care_home_id: resident.care_home_id,
              team_id: resident.team_id,
              user_id: null,
              type: "incident",
              title: `New Incident: ${values.incidentTypes[0]?.replace(/([A-Z])/g, " $1").trim() || "Reported"}`,
              message: `${values.incidentLevel.replace(/_/g, " ")} incident reported for ${residentName}`,
              link: `/dashboard/residents/${residentId}/incidents/${folderId}`,
              sender_id: profile?.id,
              sender_name: profile?.name || profile?.email || "Unknown",
              metadata: {
                incidentId: savedIncident.id,
                residentId: residentId,
                careHomeId: resident.care_home_id,
                teamId: resident.team_id,
                severity: values.incidentLevel,
                types: values.incidentTypes,
              },
            });
          } catch (notifError) {
            console.error("Failed to create notification:", notifError);
          }
        }
        toast.success("Incident report submitted successfully");
      }

      onSaved?.();
    } catch (error) {
      console.error("Error submitting incident report:", error);
      toast.error("Failed to submit incident report");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            Loading resident data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">
            Incident Report — {residentName}
          </h2>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Section 1: Incident Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4" />
                  1. Incident Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Incident *</FormLabel>
                      <Popover
                        modal
                        open={doiPopoverOpen}
                        onOpenChange={setDoiPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                setDoiPopoverOpen(false);
                              }
                            }}
                            disabled={(date) =>
                              date > new Date() ||
                              date < new Date("1900-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time of Incident *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="pl-10 relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                          {TIME_OPTIONS_15MIN.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="homeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Care Home Name *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Organization name"
                            {...field}
                            className="pl-10"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit (Team) *</FormLabel>
                      <FormControl>
                        <Input placeholder="Current team/unit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 2: Injured Person Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4" />
                  2. Injured Person Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="injuredPersonFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="injuredPersonSurname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surname *</FormLabel>
                      <FormControl>
                        <Input placeholder="Surname" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="injuredPersonDOB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth *</FormLabel>
                      <Popover
                        modal
                        open={dobPopoverOpen}
                        onOpenChange={setDobPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick date of birth"}
                              <ChevronDownIcon className="h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto overflow-hidden p-0"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            captionLayout="dropdown"
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                setDobPopoverOpen(false);
                              }
                            }}
                            disabled={(date) =>
                              date > new Date() ||
                              date < new Date("1900-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="residentInternalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resident ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Internal ID or medical record number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfAdmission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Admission</FormLabel>
                      <Popover
                        modal
                        open={admissionDatePopoverOpen}
                        onOpenChange={setAdmissionDatePopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick admission date"}
                              <ChevronDownIcon className="h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto overflow-hidden p-0"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            captionLayout="dropdown"
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                setAdmissionDatePopoverOpen(false);
                              }
                            }}
                            disabled={(date) =>
                              date > new Date() ||
                              date < new Date("1900-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="healthCareNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Health and Care Number (NHS)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="NHS number or equivalent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 3: Status of Injured Person */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4" />
                  3. Status of Injured Person
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Select one or more that apply
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="injuredPersonStatus"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {PERSON_STATUS_OPTIONS.map((item) => (
                          <FormField
                            key={item.value}
                            control={form.control}
                            name="injuredPersonStatus"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.value)}
                                    onCheckedChange={(checked) =>
                                      checked
                                        ? field.onChange([
                                            ...(field.value || []),
                                            item.value,
                                          ])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (v) => v !== item.value
                                            )
                                          )
                                    }
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("injuredPersonStatus")?.includes("Contractor") && (
                  <FormField
                    control={form.control}
                    name="contractorEmployer"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Contractor Employer</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Name of contractor's employer"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Section 4: Type of Incident */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  4. Type of Incident
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Tick all that apply
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="incidentTypes"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {INCIDENT_TYPE_OPTIONS.map((item) => (
                          <FormField
                            key={item.value}
                            control={form.control}
                            name="incidentTypes"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.value)}
                                    onCheckedChange={(checked) =>
                                      checked
                                        ? field.onChange([
                                            ...(field.value || []),
                                            item.value,
                                          ])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (v) => v !== item.value
                                            )
                                          )
                                    }
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="typeOtherDetails"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Other Details (if Other selected)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please specify other incident type..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 5-6: Fall-Specific Questions (conditional) */}
            {hasFallType && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4" />
                    5. Fall-Specific Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="anticoagulantMedication"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anticoagulant Medication</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Is the person on blood thinners?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fallPathway"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pathway Followed</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pathway" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="green">Green</SelectItem>
                            <SelectItem value="amber">Amber</SelectItem>
                            <SelectItem value="red">Red</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          According to internal fall-management policy
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Section 7: Detailed Description */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4" />
                  {hasFallType ? "6" : "5"}. Detailed Description of Incident
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="detailedDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide a detailed description of exactly what happened, what the injured person was doing, and how the incident occurred..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include what happened, what the person was doing, and how
                        the incident occurred.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 8: Incident Level */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4" />
                  {hasFallType ? "7" : "6"}. Incident Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="incidentLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Level *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select incident level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="death">Death</SelectItem>
                          <SelectItem value="permanent_harm">
                            Permanent/Long-term harm
                          </SelectItem>
                          <SelectItem value="minor_injury">
                            Minor injury/First aid
                          </SelectItem>
                          <SelectItem value="no_harm">No harm</SelectItem>
                          <SelectItem value="near_miss">Near miss</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Defines the severity for auditing and statutory reporting
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 9: Details of Injury */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4" />
                  {hasFallType ? "8" : "7"}. Details of the Injury
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="injuryDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What was the injury?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., fracture, burn, bruise, cut..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bodyPartInjured"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What part of the body was injured?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Specify left/right where relevant..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 10: Treatment Required */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4" />
                  {hasFallType ? "9" : "8"}. Treatment Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="treatmentTypes"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {TREATMENT_OPTIONS.map((item) => (
                          <FormField
                            key={item.value}
                            control={form.control}
                            name="treatmentTypes"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.value)}
                                    onCheckedChange={(checked) =>
                                      checked
                                        ? field.onChange([
                                            ...(field.value || []),
                                            item.value,
                                          ])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (v) => v !== item.value
                                            )
                                          )
                                    }
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 11: Details of Treatment Given */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4" />
                  {hasFallType ? "10" : "9"}. Details of Treatment Given
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="treatmentDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe treatment provided..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vitalSigns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vital Signs</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Record vital signs if taken..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="treatmentRefused"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Treatment was refused by the person
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 12: Witnesses */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4" />
                  {hasFallType ? "11" : "10"}. Witnesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 text-sm">Witness 1</h4>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="witness1Name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Witness name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="witness1Contact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 text-sm">Witness 2</h4>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="witness2Name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Witness name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="witness2Contact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Attach statements if needed (can be added later via Documents)
                </p>
              </CardContent>
            </Card>

            {/* Section 13: Further Actions by Nurse */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4" />
                  {hasFallType ? "12" : "11"}. Further Actions Completed by
                  Nurse
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Tick all that apply
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="nurseActions"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {NURSE_ACTION_OPTIONS.map((item) => (
                          <FormField
                            key={item.value}
                            control={form.control}
                            name="nurseActions"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.value)}
                                    onCheckedChange={(checked) =>
                                      checked
                                        ? field.onChange([
                                            ...(field.value || []),
                                            item.value,
                                          ])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (v) => v !== item.value
                                            )
                                          )
                                    }
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 14: Further Actions Advised */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4" />
                  {hasFallType ? "13" : "12"}. Advise Further Action(s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="furtherActionsAdvised"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommended Next Steps</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe recommended next steps..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 15: Prevention Measures */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4" />
                  {hasFallType ? "14" : "13"}. Actions Taken to Prevent
                  Re-occurrence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="preventionMeasures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preventive Measures</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe measures implemented to prevent similar incidents..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 16-18: Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4" />
                  {hasFallType ? "15" : "14"}. Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Home Manager */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">
                    Home Manager Informed
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="homeManagerInformedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>By whom</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Name of person who informed manager"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="homeManagerInformedDateTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date/Time</FormLabel>
                          <Popover
                            modal
                            open={homeManagerDatePopoverOpen}
                            onOpenChange={setHomeManagerDatePopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal justify-between",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <span className="truncate">
                                    {field.value
                                      ? format(field.value, "PPP")
                                      : "Pick a date"}
                                  </span>
                                  <ChevronDownIcon className="h-4 w-4 opacity-50 flex-shrink-0" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto overflow-hidden p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                captionLayout="dropdown"
                                onSelect={(date) => {
                                  if (date) {
                                    field.onChange(date);
                                    setHomeManagerDatePopoverOpen(false);
                                  }
                                }}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* On-Call */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">
                    Out of Hours On-Call Contacted
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="onCallManagerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manager on call</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Name of on-call manager"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="onCallContactedDateTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date/Time contacted</FormLabel>
                          <Popover
                            modal
                            open={onCallDatePopoverOpen}
                            onOpenChange={setOnCallDatePopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal justify-between",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <span className="truncate">
                                    {field.value
                                      ? format(field.value, "PPP")
                                      : "Pick a date"}
                                  </span>
                                  <ChevronDownIcon className="h-4 w-4 opacity-50 flex-shrink-0" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto overflow-hidden p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                captionLayout="dropdown"
                                onSelect={(date) => {
                                  if (date) {
                                    field.onChange(date);
                                    setOnCallDatePopoverOpen(false);
                                  }
                                }}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* NOK */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">
                    Next of Kin Informed
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    <FormField
                      control={form.control}
                      name="nokInformedWho"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To who</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Name of next of kin"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nokInformedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>By whom</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Name of person who informed NOK"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="nokInformedDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date/Time</FormLabel>
                        <Popover
                          modal
                          open={nokDatePopoverOpen}
                          onOpenChange={setNokDatePopoverOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full sm:w-1/2 pl-3 text-left font-normal justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <span className="truncate">
                                  {field.value
                                    ? format(field.value, "PPP")
                                    : "Pick a date"}
                                </span>
                                <ChevronDownIcon className="h-4 w-4 opacity-50 flex-shrink-0" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto overflow-hidden p-0"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(date);
                                  setNokDatePopoverOpen(false);
                                }
                              }}
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 19: Trust Incident Form Recipients */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4" />
                  {hasFallType ? "16" : "15"}. Trust Incident Form Recipients
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h4 className="font-medium mb-3 text-sm">Care Manager</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="careManagerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Care manager name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="careManagerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="care.manager@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3 text-sm">Key Worker</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="keyWorkerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Key worker name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="keyWorkerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="key.worker@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 20: Form Completion Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Signature className="w-4 h-4" />
                  {hasFallType ? "17" : "16"}. Person Completing This Form
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="completedByFullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your full name"
                          {...field}
                          readOnly
                          className="bg-muted cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="completedByJobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your job title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="completedBySignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signature</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digital signature or typed name"
                          {...field}
                          readOnly
                          className="bg-muted cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateCompleted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Completed *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick completion date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() ||
                              date < new Date("1900-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end pb-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="min-w-[200px]"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {existingIncidentId ? "Update Incident Report" : "Submit Incident Report"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
