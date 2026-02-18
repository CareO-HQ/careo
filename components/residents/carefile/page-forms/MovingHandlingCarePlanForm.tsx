"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Pencil, Printer, Save } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ─── Schema ───────────────────────────────────────────────────────────────────

const movingHandlingCarePlanSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Section 1 – Resident Overview
  residentName: z.string().min(1, "Required"),
  dateOfBirth: z.string().optional(),
  roomNumber: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  diagnosis: z.string().optional(),

  // Section 2 – Mobility Assessment
  mobilityLevel: z.string().optional(),
  transferAbility: z.string().optional(),
  weightBearing: z.string().optional(),
  balanceStanding: z.string().optional(),
  mobilityAids: z.string().optional(),

  // Section 3 – Equipment Required
  hoist: z.boolean().default(false),
  standAid: z.boolean().default(false),
  transferBoard: z.boolean().default(false),
  turntable: z.boolean().default(false),
  raiseableBed: z.boolean().default(false),
  grabRail: z.boolean().default(false),
  otherEquipment: z.string().optional(),

  // Section 4 – Handling Techniques
  bedMobility: z.string().optional(),
  transferTechnique: z.string().optional(),
  toiletingTechnique: z.string().optional(),
  bathingTechnique: z.string().optional(),
  numberOfStaffRequired: z.string().optional(),

  // Section 5 – Risk Assessment
  riskLevel: z.string().optional(),
  identifiedRisks: z.string().optional(),
  controlMeasures: z.string().optional(),

  // Section 6 – Care Plan Goals
  shortTermGoals: z.string().optional(),
  longTermGoals: z.string().optional(),
  reviewFrequency: z.string().optional(),

  // Section 7 – Review & Sign-off
  assessedBy: z.string().min(1, "Required"),
  assessedByRole: z.string().optional(),
  additionalNotes: z.string().optional(),
});

type MovingHandlingCarePlanData = z.infer<typeof movingHandlingCarePlanSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  room_number?: string;
}

interface MovingHandlingCarePlanFormProps {
  residentId: string;
  resident: Resident;
  teamId: string;
  organizationId: string;
  userId: string;
  userName: string;
  onSaved: () => void;
}

// ─── Field configs ────────────────────────────────────────────────────────────

const MOBILITY_OPTIONS = [
  { value: "independent", label: "Independent" },
  { value: "supervised", label: "Supervised" },
  { value: "assisted-1", label: "Assisted – 1 person" },
  { value: "assisted-2", label: "Assisted – 2 persons" },
  { value: "hoist-required", label: "Hoist required" },
  { value: "bedbound", label: "Bedbound" },
];

const WEIGHT_BEARING_OPTIONS = [
  { value: "full", label: "Full weight bearing" },
  { value: "partial", label: "Partial weight bearing" },
  { value: "non", label: "Non weight bearing" },
  { value: "unknown", label: "Unknown" },
];

const RISK_LEVEL_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const REVIEW_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "6-monthly", label: "Every 6 months" },
  { value: "annually", label: "Annually" },
  { value: "as-needed", label: "As needed / after incident" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = new Date(val as string | number);
    if (isNaN(d.getTime())) return String(val);
    return format(d, "dd MMM yyyy");
  } catch {
    return String(val);
  }
}

function labelFor(options: { value: string; label: string }[], val: unknown): string {
  if (!val) return "—";
  return options.find((o) => o.value === val)?.label ?? String(val);
}

function textVal(val: unknown): string {
  if (!val || val === "") return "—";
  return String(val);
}

// ─── Completed Document View ──────────────────────────────────────────────────

function CarePlanDocumentView({
  data,
  onEdit,
}: {
  data: Record<string, unknown>;
  onEdit: () => void;
}) {
  const riskBadge = (level: unknown) => {
    if (!level) return null;
    const colours: Record<string, string> = {
      low: "bg-green-50 text-green-700 border-green-200",
      medium: "bg-amber-50 text-amber-700 border-amber-200",
      high: "bg-red-50 text-red-700 border-red-200",
    };
    const cls = colours[String(level)] ?? "bg-muted text-muted-foreground border";
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold uppercase ${cls}`}>
        {String(level)}
      </span>
    );
  };

  const equipment = [
    { key: "hoist", label: "Hoist" },
    { key: "standAid", label: "Stand Aid" },
    { key: "transferBoard", label: "Transfer / Banana Board" },
    { key: "turntable", label: "Turntable" },
    { key: "raiseableBed", label: "Raiseable / Profiling Bed" },
    { key: "grabRail", label: "Grab Rail" },
  ].filter(({ key }) => !!data[key]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <div>
            <h2 className="text-sm font-semibold">Moving and Handling Care Plan</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completed{data.submittedAt ? ` · ${safeDate(data.submittedAt)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => window.print()}>
            <Printer className="w-3 h-3" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={onEdit}>
            <Pencil className="w-3 h-3" />
            Edit
          </Button>
        </div>
      </div>

      {/* Document body */}
      <ScrollArea className="flex-1 print:overflow-visible">
        <div className="px-6 py-6 max-w-2xl mx-auto space-y-8 print:px-0 print:py-0">

          {/* Section 1 — Resident Overview */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Resident Overview
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Resident Name</p>
                <p className="text-sm font-medium">{textVal(data.residentName)}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Room Number</p>
                <p className="text-sm font-medium">{textVal(data.roomNumber)}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Date of Birth</p>
                <p className="text-sm font-medium">{safeDate(data.dateOfBirth)}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Weight</p>
                <p className="text-sm font-medium">{data.weight ? `${data.weight} kg` : "—"}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Height</p>
                <p className="text-sm font-medium">{data.height ? `${data.height} cm` : "—"}</p>
              </div>
              {data.diagnosis && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Relevant Diagnosis / Medical History</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{String(data.diagnosis)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2 — Mobility Assessment */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Mobility Assessment
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Mobility Level</p>
                <p className="text-sm font-medium">{labelFor(MOBILITY_OPTIONS, data.mobilityLevel)}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Weight Bearing Status</p>
                <p className="text-sm font-medium">{labelFor(WEIGHT_BEARING_OPTIONS, data.weightBearing)}</p>
              </div>
              {data.transferAbility && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Transfer Ability</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{String(data.transferAbility)}</p>
                </div>
              )}
              {data.balanceStanding && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Balance / Standing Ability</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{String(data.balanceStanding)}</p>
                </div>
              )}
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Mobility Aids</p>
                <p className="text-sm font-medium">{textVal(data.mobilityAids)}</p>
              </div>
            </div>
          </div>

          {/* Section 3 — Equipment Required */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Equipment Required
            </p>
            {equipment.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {equipment.map(({ label }) => (
                  <span key={label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No equipment selected</p>
            )}
            {data.otherEquipment && (
              <div className="grid grid-cols-[1fr_1.5fr] gap-2 mt-3">
                <p className="text-xs text-muted-foreground">Other Equipment</p>
                <p className="text-sm font-medium">{String(data.otherEquipment)}</p>
              </div>
            )}
          </div>

          {/* Section 4 — Handling Techniques */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Handling Techniques
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Staff Required</p>
                <p className="text-sm font-medium">{textVal(data.numberOfStaffRequired)}</p>
              </div>
              {[
                { key: "bedMobility", label: "Bed Mobility" },
                { key: "transferTechnique", label: "Transfer Technique" },
                { key: "toiletingTechnique", label: "Toileting Technique" },
                { key: "bathingTechnique", label: "Bathing / Showering Technique" },
              ].map(({ key, label }) =>
                data[key] ? (
                  <div key={key} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{String(data[key])}</p>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Section 5 — Risk Assessment */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Risk Assessment
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-center">
                <p className="text-xs text-muted-foreground">Overall Risk Level</p>
                {data.riskLevel ? riskBadge(data.riskLevel) : <p className="text-sm font-medium">—</p>}
              </div>
              {data.identifiedRisks && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Identified Risks</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{String(data.identifiedRisks)}</p>
                </div>
              )}
              {data.controlMeasures && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Control Measures</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{String(data.controlMeasures)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 6 — Care Plan Goals */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Care Plan Goals
            </p>
            <div className="space-y-3">
              {data.shortTermGoals && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Short-Term Goals</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{String(data.shortTermGoals)}</p>
                </div>
              )}
              {data.longTermGoals && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Long-Term Goals</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{String(data.longTermGoals)}</p>
                </div>
              )}
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Review Frequency</p>
                <p className="text-sm font-medium">{labelFor(REVIEW_FREQUENCY_OPTIONS, data.reviewFrequency)}</p>
              </div>
            </div>
          </div>

          {/* Section 7 — Review & Sign-off */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Review &amp; Sign-off
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Assessed By</p>
                <p className="text-sm font-medium">{textVal(data.assessedBy)}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-xs text-muted-foreground">Role / Job Title</p>
                <p className="text-sm font-medium">{textVal(data.assessedByRole)}</p>
              </div>
              {data.additionalNotes && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Additional Notes</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{String(data.additionalNotes)}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MovingHandlingCarePlanForm({
  residentId,
  resident,
  teamId,
  organizationId,
  userId,
  userName,
  onSaved,
}: MovingHandlingCarePlanFormProps) {
  const [existingData, setExistingData] = useState<Record<string, unknown> | undefined>(undefined);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const residentFullName = `${resident.first_name ?? ""} ${resident.last_name ?? ""}`.trim();

  const form = useForm<MovingHandlingCarePlanData>({
    resolver: zodResolver(movingHandlingCarePlanSchema),
    mode: "onChange",
    defaultValues: {
      residentId,
      teamId,
      organizationId,
      userId,
      residentName: residentFullName,
      dateOfBirth: resident.date_of_birth ?? "",
      roomNumber: resident.room_number ?? "",
      weight: "",
      height: "",
      diagnosis: "",
      mobilityLevel: "",
      transferAbility: "",
      weightBearing: "",
      balanceStanding: "",
      mobilityAids: "",
      hoist: false,
      standAid: false,
      transferBoard: false,
      turntable: false,
      raiseableBed: false,
      grabRail: false,
      otherEquipment: "",
      bedMobility: "",
      transferTechnique: "",
      toiletingTechnique: "",
      bathingTechnique: "",
      numberOfStaffRequired: "",
      riskLevel: "",
      identifiedRisks: "",
      controlMeasures: "",
      shortTermGoals: "",
      longTermGoals: "",
      reviewFrequency: "",
      assessedBy: userName,
      assessedByRole: "",
      additionalNotes: "",
    },
  });

  // Load existing data
  useEffect(() => {
    if (!residentId) return;
    supabase
      .from("moving_handling_care_plans")
      .select("*")
      .eq("resident_id", residentId)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setExistingData(data as Record<string, unknown>);
          const ad = (data as Record<string, unknown>).assessment_data as Record<string, unknown> | undefined;
          if (ad) {
            form.reset({ residentId, teamId, organizationId, userId, ...ad } as MovingHandlingCarePlanData);
          }
        }
        setLoadingExisting(false);
      });
  }, [residentId]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: MovingHandlingCarePlanData) {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          status: "completed",
          assessment_data: { ...values, submittedAt: new Date().toISOString() },
          created_by: userId,
        };
        await submitAssessmentWithVersioning(
          "moving_handling_care_plans",
          payload,
          existingData as { id?: string; version_number?: number } | undefined,
          !!existingData
        );
        toast.success(existingData ? "Care plan updated successfully" : "Care plan submitted successfully");
        // Refresh and switch to document view
        const { data } = await supabase
          .from("moving_handling_care_plans")
          .select("*")
          .eq("resident_id", residentId)
          .neq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (data) setExistingData(data as Record<string, unknown>);
        setIsEditing(false);
        onSaved();
      } catch (error) {
        toast.error("Error: " + (error as Error).message);
      }
    });
  }

  if (loadingExisting) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show completed document view when data exists and not editing
  if (existingData && !isEditing) {
    const ad = (existingData.assessment_data as Record<string, unknown>) ?? existingData;
    return <CarePlanDocumentView data={ad} onEdit={() => setIsEditing(true)} />;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold">Moving and Handling Care Plan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {existingData ? "Editing existing" : "New care plan"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {existingData && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            {existingData ? "Save Changes" : "Submit"}
          </Button>
        </div>
      </div>

      {/* Form body */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              {/* ── Section 1: Resident Overview ────────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Resident Overview
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="residentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Resident Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="roomNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Room Number</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Date of Birth</FormLabel>
                          <FormControl><Input {...field} type="date" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Weight (kg)</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. 72" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Height (cm)</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. 165" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="diagnosis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Relevant Diagnosis / Medical History</FormLabel>
                        <FormControl><Textarea {...field} rows={3} placeholder="e.g. Parkinson's disease, right hip fracture..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Section 2: Mobility Assessment ──────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Mobility Assessment
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="mobilityLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Mobility Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MOBILITY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weightBearing"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Weight Bearing Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {WEIGHT_BEARING_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="transferAbility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Transfer Ability</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Describe how the resident transfers (e.g. bed to chair)..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="balanceStanding"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Balance / Standing Ability</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Describe balance and standing ability..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobilityAids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Mobility Aids Currently Used</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Zimmer frame, wheelchair, walking stick..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Section 3: Equipment Required ───────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Equipment Required
                </p>
                <div className="space-y-3">
                  {(
                    [
                      { name: "hoist", label: "Hoist" },
                      { name: "standAid", label: "Stand Aid" },
                      { name: "transferBoard", label: "Transfer / Banana Board" },
                      { name: "turntable", label: "Turntable" },
                      { name: "raiseableBed", label: "Raiseable / Profiling Bed" },
                      { name: "grabRail", label: "Grab Rail" },
                    ] as { name: keyof MovingHandlingCarePlanData; label: string }[]
                  ).map(({ name, label }) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={typeof field.value === "boolean" ? field.value : false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal text-foreground">{label}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                  <FormField
                    control={form.control}
                    name="otherEquipment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Other Equipment</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Specify any other equipment..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Section 4: Handling Techniques ──────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Handling Techniques
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="numberOfStaffRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Number of Staff Required</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. 1, 2, or specify task..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bedMobility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Bed Mobility</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="How does the resident move in bed? What assistance is needed?" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="transferTechnique"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Transfer Technique</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Describe safe transfer method (e.g. bed to chair)..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toiletingTechnique"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Toileting Technique</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Describe safe toileting approach..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bathingTechnique"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Bathing / Showering Technique</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Describe safe bathing or showering approach..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Section 5: Risk Assessment ───────────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Risk Assessment
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Overall Risk Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RISK_LEVEL_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="identifiedRisks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Identified Risks</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="List all identified risks (e.g. fall risk, pain on movement, contractures)..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="controlMeasures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Control Measures</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="List all control measures in place to reduce risk..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Section 6: Care Plan Goals ───────────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Care Plan Goals
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="shortTermGoals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Short-Term Goals</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Goals to achieve within the next 4–6 weeks..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longTermGoals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Long-Term Goals</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Goals to achieve over the next 3–6 months..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reviewFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Review Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {REVIEW_FREQUENCY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Section 7: Review & Sign-off ─────────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Review &amp; Sign-off
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="assessedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Assessed By</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly disabled className="bg-muted" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assessedByRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Role / Job Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Senior Carer, Nurse..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="additionalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Any additional information relevant to this care plan..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

            </form>
          </Form>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-3 border-t flex-shrink-0 flex justify-end bg-muted/10">
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={form.handleSubmit(onSubmit)}
          disabled={isPending}
        >
          {isPending ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
          ) : existingData ? "Save Changes" : "Submit Care Plan"}
        </Button>
      </div>
    </div>
  );
}
