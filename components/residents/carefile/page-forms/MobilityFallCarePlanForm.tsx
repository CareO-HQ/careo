

"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { carePlanAssessmentSchema } from "@/schemas/residents/care-file/carePlanSchema";

// Evaluation schema
const evaluationSchema = z.object({
  evaluationDate: z.string().min(1, "Date is required"),
  evaluationTime: z.string().optional(),
  comments: z.string().min(1, "Comments are required"),
  carePlanOutcome: z.enum(["reviewed-remain-valid", "care-plan-change"]),
  reviewedStaff: z.string().min(1, "Reviewed staff is required"),
  position: z.string().optional(),
  nextReviewDate: z.string().optional(),
});
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, CheckCircle2, Clock, Loader2, Pencil, Plus, Printer, Save, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  room_number?: string;
}

interface MobilityFallCarePlanFormProps {
  residentId: string;
  resident: Resident;
  teamId: string;
  organizationId: string;
  userId: string;
  userName: string;
  onSaved: () => void;
}

// ─── Options ──────────────────────────────────────────────────────────────────

const OUTCOME_OPTIONS = [
  { value: "reviewed-remain-valid", label: "Reviewed Remain Valid", colour: "text-green-600 bg-green-50 border-green-200" },
  { value: "care-plan-change", label: "Care Plan Change", colour: "text-orange-600 bg-orange-50 border-orange-200" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = typeof val === "number" ? new Date(val) : new Date(val as string);
    if (isNaN(d.getTime())) return String(val);
    return format(d, "dd MMM yyyy");
  } catch {
    return String(val);
  }
}

function textVal(val: unknown): string {
  if (!val || val === "") return "—";
  return String(val);
}

// ─── Evaluation Entry Component ──────────────────────────────────────────────

function EvaluationEntry({
  entry,
  index,
}: {
  entry: Record<string, unknown>;
  index: number;
}) {
  const outcome = OUTCOME_OPTIONS.find((o) => o.value === entry.carePlanOutcome);

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Entry header */}
      <div className="px-4 py-2.5 bg-muted/30 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Evaluation {index + 1}</span>
          {outcome && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${outcome.colour}`}>
              {outcome.label}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {safeDate(entry.evaluationDate)}
          {entry.evaluationTime && <span className="ml-1">{String(entry.evaluationTime)}</span>}
        </div>
      </div>

      {/* Entry body */}
      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Reviewed Staff</p>
            <p className="text-sm font-medium">{textVal(entry.reviewedStaff)}</p>
            {entry.position && (
              <p className="text-xs text-muted-foreground">{String(entry.position)}</p>
            )}
          </div>
          {entry.nextReviewDate && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Next Review</p>
              <p className="text-sm font-medium">{safeDate(entry.nextReviewDate)}</p>
            </div>
          )}
        </div>

        {entry.comments && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Comments</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{String(entry.comments)}</p>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Document View ────────────────────────────────────────────────────────────

function MobilityFallDocumentView({
  data,
  onEdit,
  evaluations,
  onAddEvaluation,
}: {
  data: Record<string, unknown>;
  onEdit: () => void;
  evaluations: Record<string, unknown>[];
  onAddEvaluation: () => void;
}) {
  const goals = (data.goals as Record<string, unknown>) || {};
  const interventions = (data.interventions as any[]) || [];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <div>
            <h2 className="text-sm font-semibold">Mobility & Fall Care Plan</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completed{data.created_at ? ` · ${safeDate(data.created_at)}` : ""}
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
        <div className="p-12 pb-30">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Care Plan Document */}
            <div className="border rounded-lg bg-white shadow-sm p-8 print:border-0 print:shadow-none print:p-0">
              <div className="space-y-8 divide-y divide-border">
          {/* Basic Information */}
          <div className="pt-0">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-4">
              Basic Information
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-sm font-bold text-foreground">Resident Name</p>
                <p className="text-sm">{textVal(goals.residentName)}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-sm font-bold text-foreground">Room Number</p>
                <p className="text-sm">{textVal(goals.bedroomNumber)}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-sm font-bold text-foreground">Date of Birth</p>
                <p className="text-sm">{safeDate(goals.dob)}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-sm font-bold text-foreground">Care Plan Number</p>
                <p className="text-sm">{textVal(goals.carePlanNumber)}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-sm font-bold text-foreground">Written By</p>
                <p className="text-sm">{textVal(goals.writtenBy)}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <p className="text-sm font-bold text-foreground">Date Written</p>
                <p className="text-sm">{safeDate(goals.dateWritten)}</p>
              </div>
            </div>
          </div>

          {/* Care Plan Details */}
          <div className="pt-8">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-4">
              Care Plan Details
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">Identified Needs / Problem Statement</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{textVal(data.need_identified)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">Goals / Aims</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{textVal(goals.aims)}</p>
              </div>
            </div>
          </div>

          {/* Planned Care / Interventions */}
          <div className="pt-8">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-4">
              Planned Care / Interventions
            </p>
            <div className="space-y-3">
              {interventions.map((entry: any, index: number) => (
                <div key={index} className="p-3 border rounded bg-muted/20">
                  <p className="text-xs font-bold text-foreground mb-3">Entry #{index + 1}</p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                      <p className="text-sm font-bold text-foreground">Date</p>
                      <p className="text-sm">{safeDate(entry.date)}</p>
                    </div>
                    {entry.time && (
                      <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                        <p className="text-sm font-bold text-foreground">Time</p>
                        <p className="text-sm">{entry.time}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-foreground">Care Details / Actions</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{textVal(entry.details)}</p>
                    </div>
                    <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                      <p className="text-sm font-bold text-foreground">Staff Signature</p>
                      <p className="text-sm">{textVal(entry.signature)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Review Section */}
          <div className="pt-8">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-4">
              Review of Patient or Representative
            </p>
            <div className="space-y-3">
              {String(goals.discussedWith || "") && (
                <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                  <p className="text-sm font-bold text-foreground">Discussed With</p>
                  <p className="text-sm">{textVal(goals.discussedWith)}</p>
                </div>
              )}
              {String(goals.signature || "") && (
                <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                  <p className="text-sm font-bold text-foreground">Patient/Representative Signature</p>
                  <p className="text-sm">{textVal(goals.signature)}</p>
                </div>
              )}
              {String(goals.staffSignature || "") && (
                <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                  <p className="text-sm font-bold text-foreground">Staff Signature</p>
                  <p className="text-sm">{textVal(goals.staffSignature)}</p>
                </div>
              )}
            </div>
          </div>

              </div>
            </div>

            {/* Evaluations Section */}
            <div className="space-y-6">
              {/* Add Evaluation Button */}
              <div className="flex justify-center">
                <Button
                  size="sm"
                  className="h-8 px-4 text-xs gap-1.5"
                  onClick={onAddEvaluation}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Evaluation
                </Button>
              </div>

              {/* Evaluations Timeline */}
              {evaluations.length > 0 && (
                <div className="max-w-2xl mx-auto space-y-4">
                  {[...evaluations].reverse().map((entry, index) => (
                    <EvaluationEntry key={index} entry={entry} index={evaluations.length - index - 1} />
                  ))}
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

export default function MobilityFallCarePlanForm({
  residentId,
  resident,
  teamId,
  organizationId,
  userId,
  userName,
  onSaved,
}: MobilityFallCarePlanFormProps) {
  const [isPending, startTransition] = useTransition();
  const [existingData, setExistingData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [dateWrittenPopoverOpen, setDateWrittenPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [plannedCareDatePopovers, setPlannedCareDatePopovers] = useState<Record<number, boolean>>({});

  const form = useForm<z.infer<typeof carePlanAssessmentSchema>>({
    resolver: zodResolver(carePlanAssessmentSchema),
    mode: "onChange",
    defaultValues: {
      residentId,
      userId,
      nameOfCarePlan: "Mobility & Fall",
      residentName: `${resident.first_name} ${resident.last_name}`.trim(),
      dob: resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
      bedroomNumber: resident.room_number || "",
      writtenBy: userName || "Unknown",
      dateWritten: Date.now(),
      carePlanNumber: "",
      identifiedNeeds: "",
      aims: "",
      plannedCareDate: [
        {
          date: Date.now(),
          time: "",
          details: "",
          signature: userName || "Unknown",
        },
      ],
      discussedWith: "",
      signature: userName || "Unknown",
      date: Date.now(),
      staffSignature: userName || "Unknown",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "plannedCareDate",
  });

  const evaluationForm = useForm<z.infer<typeof evaluationSchema>>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      evaluationDate: format(new Date(), "yyyy-MM-dd"),
      evaluationTime: "",
      comments: "",
      carePlanOutcome: undefined,
      reviewedStaff: userName || "",
      position: "",
      nextReviewDate: "",
    },
  });

  // Fetch existing care plan
  useEffect(() => {
    const fetchExistingCarePlan = async () => {
      const { data, error } = await supabase
        .from("care_plan_assessments")
        .select("*")
        .eq("resident_id", residentId)
        .eq("care_plan_type", "Mobility & Fall")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setExistingData(data);
        // Populate form with existing data from goals object
        const goals = data.goals || {};
        form.reset({
          residentId,
          userId,
          nameOfCarePlan: data.care_plan_type || "Mobility & Fall",
          residentName: goals.residentName || `${resident.first_name} ${resident.last_name}`.trim(),
          dob: goals.dob || (resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now()),
          bedroomNumber: goals.bedroomNumber || resident.room_number || "",
          writtenBy: goals.writtenBy || userName || "Unknown",
          dateWritten: goals.dateWritten || Date.now(),
          carePlanNumber: goals.carePlanNumber || "",
          identifiedNeeds: data.need_identified || "",
          aims: goals.aims || "",
          plannedCareDate: data.interventions || [
            {
              date: Date.now(),
              time: "",
              details: "",
              signature: userName || "Unknown",
            },
          ],
          discussedWith: goals.discussedWith || "",
          signature: goals.signature || userName || "Unknown",
          date: goals.date || Date.now(),
          staffSignature: goals.staffSignature || userName || "Unknown",
        });
      }
    };

    fetchExistingCarePlan();
  }, [residentId, resident, userName, userId, form]);

  // Fetch evaluations from the care plan's goals.evaluations array
  useEffect(() => {
    if (existingData) {
      const goals = existingData.goals || {};
      const evals = goals.evaluations || [];
      setEvaluations(evals);
    }
  }, [existingData]);

  const handleAddEvaluation = () => {
    evaluationForm.reset({
      evaluationDate: format(new Date(), "yyyy-MM-dd"),
      evaluationTime: "",
      comments: "",
      carePlanOutcome: undefined,
      reviewedStaff: userName || "",
      position: "",
      nextReviewDate: "",
    });
    setShowEvaluationDialog(true);
  };

  const onEvaluationSubmit = async (values: z.infer<typeof evaluationSchema>) => {
    if (!existingData?.id) return;

    startTransition(async () => {
      try {
        // Create new evaluation entry
        const newEvaluation = {
          evaluationDate: values.evaluationDate,
          evaluationTime: values.evaluationTime,
          comments: values.comments,
          carePlanOutcome: values.carePlanOutcome,
          reviewedStaff: values.reviewedStaff,
          position: values.position,
          nextReviewDate: values.nextReviewDate,
          createdBy: userId,
          createdAt: new Date().toISOString(),
        };

        // Get existing goals and evaluations
        const currentGoals = existingData.goals || {};
        const currentEvaluations = currentGoals.evaluations || [];
        const updatedEvaluations = [...currentEvaluations, newEvaluation];

        // Update the goals object with the new evaluations array
        const updatedGoals = {
          ...currentGoals,
          evaluations: updatedEvaluations,
        };

        // Update the care plan record
        const { error } = await supabase
          .from("care_plan_assessments")
          .update({ goals: updatedGoals })
          .eq("id", existingData.id);

        if (error) {
          console.error("Evaluation update error:", error);
          throw error;
        }

        toast.success("Evaluation added successfully");
        setShowEvaluationDialog(false);

        // Refresh the care plan data
        const { data } = await supabase
          .from("care_plan_assessments")
          .select("*")
          .eq("id", existingData.id)
          .single();

        if (data) {
          setExistingData(data);
        }
      } catch (error) {
        console.error("Error saving evaluation:", error);
        toast.error("Failed to save evaluation. Please try again.");
      }
    });
  };

  const onSubmit = async (values: z.infer<typeof carePlanAssessmentSchema>) => {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          care_plan_type: "Mobility & Fall",
          need_identified: values.identifiedNeeds,
          interventions: values.plannedCareDate as any,
          goals: {
            aims: values.aims,
            discussedWith: values.discussedWith || "",
            signature: values.signature || "",
            staffSignature: values.staffSignature || "",
            residentName: values.residentName,
            dob: values.dob,
            bedroomNumber: values.bedroomNumber,
            writtenBy: values.writtenBy,
            dateWritten: values.dateWritten,
            carePlanNumber: values.carePlanNumber,
            folderKey: "mobility-fall"
          },
          status: 'active',
          created_by: userId,
        };

        if (existingData?.id) {
          // Archive the old plan
          const archivePayload = {
            status: 'archived',
            archived_at: new Date().toISOString()
          };

          const { error: archiveError } = await supabase
            .from('care_plan_assessments')
            .update(archivePayload)
            .eq('id', existingData.id);

          if (archiveError) {
            console.error("Archive error:", archiveError);
            throw archiveError;
          }

          // Create new version
          const newVersionPayload = {
            ...payload,
            previous_care_plan_id: existingData.id
          };

          const { error: insertError } = await supabase
            .from('care_plan_assessments')
            .insert(newVersionPayload);

          if (insertError) {
            console.error("Insert new version error:", insertError);
            throw insertError;
          }

          toast.success("Care plan updated successfully. Previous version archived.");
        } else {
          // Insert new
          const { error } = await supabase
            .from('care_plan_assessments')
            .insert(payload);

          if (error) {
            console.error("Insert error:", error);
            throw error;
          }

          toast.success("Care plan created successfully");
        }

        setIsEditing(false);
        onSaved();

        // Refresh the data
        const { data } = await supabase
          .from("care_plan_assessments")
          .select("*")
          .eq("resident_id", residentId)
          .eq("care_plan_type", "Mobility & Fall")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setExistingData(data);
        }
      } catch (error) {
        console.error("Error saving care plan:", error);
        toast.error("Failed to save care plan. Please try again.");
      }
    });
  };

  // Show completed document view when data exists and not editing
  if (existingData && !isEditing && !showEvaluationDialog) {
    return (
      <MobilityFallDocumentView
        data={existingData}
        onEdit={() => setIsEditing(true)}
        evaluations={evaluations}
        onAddEvaluation={handleAddEvaluation}
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold">Mobility & Fall Care Plan</h2>
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

      {/* Form */}
      <ScrollArea className="flex-1">

        <div className="px-6 py-6 max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* ── Section 1: Basic Information ────────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Basic Information
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
                      name="bedroomNumber"
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
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Date of Birth</FormLabel>
                          <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? safeDate(field.value) : <span>Pick a date</span>}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  field.onChange(date ? date.getTime() : Date.now());
                                  setDobPopoverOpen(false);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="carePlanNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Care Plan Number (Optional)</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="writtenBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Written By</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="dateWritten"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Date Written</FormLabel>
                        <Popover open={dateWrittenPopoverOpen} onOpenChange={setDateWrittenPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? safeDate(field.value) : <span>Pick a date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                field.onChange(date ? date.getTime() : Date.now());
                                setDateWrittenPopoverOpen(false);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Section 2: Care Plan Details ────────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Care Plan Details
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="identifiedNeeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Identified Needs / Problem Statement</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} placeholder="Describe the mobility and fall risks..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="aims"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Goals / Aims</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} placeholder="What are the goals of this care plan?" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Section 3: Planned Care / Interventions ────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Planned Care / Interventions
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      append({
                        date: Date.now(),
                        time: "",
                        details: "",
                        signature: userName || "Unknown",
                      })
                    }
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Entry
                  </Button>
                </div>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">Entry #{index + 1}</p>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`plannedCareDate.${index}.date`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm text-foreground">Date</FormLabel>
                              <Popover
                                open={plannedCareDatePopovers[index]}
                                onOpenChange={(open) =>
                                  setPlannedCareDatePopovers((prev) => ({ ...prev, [index]: open }))
                                }
                              >
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {field.value ? safeDate(field.value) : <span>Pick a date</span>}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => {
                                      field.onChange(date ? date.getTime() : Date.now());
                                      setPlannedCareDatePopovers((prev) => ({ ...prev, [index]: false }));
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`plannedCareDate.${index}.time`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm text-foreground">Time (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} type="time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`plannedCareDate.${index}.details`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-foreground">Care Details / Actions</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={2} placeholder="Describe the planned care or intervention..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`plannedCareDate.${index}.signature`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-foreground">Staff Signature</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Section 4: Review ────────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Review of Patient or Representative
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="discussedWith"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Discussed With (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Name of patient/representative" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="signature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Patient/Representative Signature (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">Date</FormLabel>
                          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? safeDate(field.value) : <span>Pick a date</span>}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  field.onChange(date ? date.getTime() : Date.now());
                                  setDatePopoverOpen(false);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="staffSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">Staff Signature (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
      <div className="px-6 py-3 border-t flex-shrink-0 flex justify-end bg-background">
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

      {/* Evaluation Dialog */}
      <Dialog open={showEvaluationDialog} onOpenChange={setShowEvaluationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Care Plan Evaluation</DialogTitle>
            <DialogDescription>
              Record evaluation for this care plan
            </DialogDescription>
          </DialogHeader>
          <Form {...evaluationForm}>
            <form onSubmit={evaluationForm.handleSubmit(onEvaluationSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={evaluationForm.control}
                  name="evaluationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={evaluationForm.control}
                  name="evaluationTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time (Optional)</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={evaluationForm.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} placeholder="Enter evaluation comments..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={evaluationForm.control}
                name="carePlanOutcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Care Plan Outcome</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OUTCOME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={evaluationForm.control}
                  name="reviewedStaff"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reviewed Staff</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={evaluationForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Care Manager" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={evaluationForm.control}
                name="nextReviewDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Review Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEvaluationDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
                  ) : "Save Evaluation"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}