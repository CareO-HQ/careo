"use client";

import { Button } from "@/components/ui/button";
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
import { CheckCircle2, Loader2, Pencil, Plus, Printer, Save, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ─── Schema ───────────────────────────────────────────────────────────────────

const evaluationSchema = z.object({
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Evaluation details
  evaluationDate: z.string().min(1, "Date is required"),
  evaluatedBy: z.string().min(1, "Required"),
  evaluatedByRole: z.string().optional(),

  // Progress against goals
  goalsProgress: z.string().optional(),

  // Current mobility status
  currentMobilityStatus: z.string().optional(),

  // Equipment changes
  equipmentChanges: z.enum(["no-change", "updated", "removed", "added"]).optional(),
  equipmentChangeDetails: z.string().optional(),

  // Care plan outcome
  carePlanOutcome: z.enum(["goals-met", "partial-progress", "no-progress", "deteriorated"]).optional(),

  // Recommendations
  recommendations: z.string().optional(),

  // Next review date
  nextReviewDate: z.string().optional(),

  // Additional notes
  evaluationNotes: z.string().optional(),
});

type EvaluationData = z.infer<typeof evaluationSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
}

interface MovingHandlingCarePlanEvaluationFormProps {
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
  { value: "goals-met", label: "Goals Met", colour: "text-green-600 bg-green-50 border-green-200" },
  { value: "partial-progress", label: "Partial Progress", colour: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "no-progress", label: "No Progress", colour: "text-orange-600 bg-orange-50 border-orange-200" },
  { value: "deteriorated", label: "Deteriorated", colour: "text-red-600 bg-red-50 border-red-200" },
];

const EQUIPMENT_CHANGE_OPTIONS = [
  { value: "no-change", label: "No Change" },
  { value: "updated", label: "Updated" },
  { value: "added", label: "Added New Equipment" },
  { value: "removed", label: "Removed Equipment" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = new Date(val as string);
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

// ─── Single Evaluation Document Entry ────────────────────────────────────────

function EvaluationEntry({
  entry,
  index,
}: {
  entry: Record<string, unknown>;
  index: number;
}) {
  const outcome = OUTCOME_OPTIONS.find((o) => o.value === entry.carePlanOutcome);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Entry header */}
      <div className="px-4 py-2.5 bg-muted/30 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Evaluation {index + 1}</span>
          {outcome && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${outcome.colour}`}>
              {outcome.label}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{safeDate(entry.evaluationDate)}</span>
      </div>

      {/* Entry body */}
      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Evaluated By</p>
            <p className="text-sm font-medium">{textVal(entry.evaluatedBy)}</p>
            {entry.evaluatedByRole && (
              <p className="text-xs text-muted-foreground">{String(entry.evaluatedByRole)}</p>
            )}
          </div>
          {entry.nextReviewDate && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Next Review</p>
              <p className="text-sm font-medium">{safeDate(entry.nextReviewDate)}</p>
            </div>
          )}
        </div>

        {entry.goalsProgress && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Progress Against Goals</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{String(entry.goalsProgress)}</p>
          </div>
        )}

        {entry.currentMobilityStatus && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Current Mobility Status</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{String(entry.currentMobilityStatus)}</p>
          </div>
        )}

        {entry.equipmentChanges && entry.equipmentChanges !== "no-change" && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Equipment Changes</p>
            <p className="text-sm font-medium">{labelFor(EQUIPMENT_CHANGE_OPTIONS, entry.equipmentChanges)}</p>
            {entry.equipmentChangeDetails && (
              <p className="text-sm text-muted-foreground mt-0.5">{String(entry.equipmentChangeDetails)}</p>
            )}
          </div>
        )}

        {entry.recommendations && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Recommendations</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{String(entry.recommendations)}</p>
          </div>
        )}

        {entry.evaluationNotes && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Notes</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{String(entry.evaluationNotes)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Completed Document View ──────────────────────────────────────────────────

function EvaluationDocumentView({
  entries,
  onEdit,
  onAddNew,
}: {
  entries: Record<string, unknown>[];
  onEdit: (index: number) => void;
  onAddNew: () => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <div>
            <h2 className="text-sm font-semibold">Care Plan Evaluations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {entries.length} evaluation{entries.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => window.print()}>
            <Printer className="w-3 h-3" />
            Print
          </Button>
          <Button size="sm" className="h-7 px-2 text-xs gap-1" onClick={onAddNew}>
            <Plus className="w-3 h-3" />
            Add Evaluation
          </Button>
        </div>
      </div>

      {/* Document body */}
      <ScrollArea className="flex-1 print:overflow-visible">
        <div className="px-6 py-6 max-w-2xl mx-auto space-y-4 print:px-0 print:py-0">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <p className="text-sm text-muted-foreground">No evaluations recorded yet.</p>
              <Button size="sm" variant="outline" onClick={onAddNew} className="gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add First Evaluation
              </Button>
            </div>
          ) : (
            entries.map((entry, i) => (
              <div key={i} className="relative group">
                <EvaluationEntry entry={entry} index={i} />
                <button
                  onClick={() => onEdit(i)}
                  className="absolute top-2.5 right-10 hidden group-hover:flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Evaluation Form (single entry) ──────────────────────────────────────────

function EvaluationFormEntry({
  userName,
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  isEdit,
}: {
  userName: string;
  defaultValues?: Partial<EvaluationData>;
  onSubmit: (data: EvaluationData) => void;
  onCancel: () => void;
  isPending: boolean;
  isEdit: boolean;
}) {
  const form = useForm<EvaluationData>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      residentId: defaultValues?.residentId ?? "",
      teamId: defaultValues?.teamId ?? "",
      organizationId: defaultValues?.organizationId ?? "",
      userId: defaultValues?.userId ?? "",
      evaluationDate: defaultValues?.evaluationDate ?? format(new Date(), "yyyy-MM-dd"),
      evaluatedBy: defaultValues?.evaluatedBy ?? userName,
      evaluatedByRole: defaultValues?.evaluatedByRole ?? "",
      goalsProgress: defaultValues?.goalsProgress ?? "",
      currentMobilityStatus: defaultValues?.currentMobilityStatus ?? "",
      equipmentChanges: defaultValues?.equipmentChanges ?? "no-change",
      equipmentChangeDetails: defaultValues?.equipmentChangeDetails ?? "",
      carePlanOutcome: defaultValues?.carePlanOutcome ?? undefined,
      recommendations: defaultValues?.recommendations ?? "",
      nextReviewDate: defaultValues?.nextReviewDate ?? "",
      evaluationNotes: defaultValues?.evaluationNotes ?? "",
    },
  });

  const equipmentChanges = form.watch("equipmentChanges");

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold">{isEdit ? "Edit Evaluation" : "New Evaluation"}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Care Plan Evaluation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            {isEdit ? "Save Changes" : "Submit"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-6 max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              {/* ── Evaluation Details ───────────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Evaluation Details
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="evaluationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Evaluation Date</FormLabel>
                          <FormControl><Input {...field} type="date" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nextReviewDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Next Review Date</FormLabel>
                          <FormControl><Input {...field} type="date" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="evaluatedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Evaluated By</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly disabled className="bg-muted" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="evaluatedByRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Role / Job Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Senior Carer, Nurse..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* ── Care Plan Outcome ────────────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Outcome
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="carePlanOutcome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Care Plan Outcome</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {OUTCOME_OPTIONS.map((o) => (
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
                    name="goalsProgress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Progress Against Goals</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Describe progress made towards short and long-term goals..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentMobilityStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Current Mobility Status</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Describe the resident's current mobility compared to when plan was written..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Equipment ────────────────────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Equipment Review
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="equipmentChanges"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Equipment Changes</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EQUIPMENT_CHANGE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {equipmentChanges && equipmentChanges !== "no-change" && (
                    <FormField
                      control={form.control}
                      name="equipmentChangeDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Equipment Change Details</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="Describe what changed and why..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              {/* ── Recommendations & Notes ───────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Recommendations &amp; Notes
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="recommendations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Recommendations</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Any recommended changes to the care plan, referrals, or further assessments needed..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="evaluationNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Any other relevant observations or notes..." />
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
          ) : isEdit ? "Save Changes" : "Submit Evaluation"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MovingHandlingCarePlanEvaluationForm({
  residentId,
  teamId,
  organizationId,
  userId,
  userName,
  onSaved,
}: MovingHandlingCarePlanEvaluationFormProps) {
  // Each DB row holds a single evaluation in assessment_data
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [existingRows, setExistingRows] = useState<Record<string, unknown>[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isPending, startTransition] = useTransition();

  // null = document view, "new" = new form, number = editing index
  const [mode, setMode] = useState<null | "new" | number>(null);

  // ── Fetch all evaluations ───────────────────────────────────────────────────
  const fetchEntries = async () => {
    const { data } = await supabase
      .from("moving_handling_care_plan_evaluations")
      .select("*")
      .eq("resident_id", residentId)
      .neq("status", "archived")
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      setExistingRows(data as Record<string, unknown>[]);
      setEntries(
        (data as Record<string, unknown>[]).map(
          (row) => (row.assessment_data as Record<string, unknown>) ?? row
        )
      );
    }
    setLoadingExisting(false);
  };

  useEffect(() => {
    if (!residentId) return;
    fetchEntries();
  }, [residentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit a new evaluation ─────────────────────────────────────────────────
  function handleSubmit(values: EvaluationData) {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          status: "completed",
          assessment_data: { ...values, submittedAt: new Date().toISOString() },
          created_by: userId,
        };

        if (typeof mode === "number") {
          // Editing an existing row
          const row = existingRows[mode];
          await submitAssessmentWithVersioning(
            "moving_handling_care_plan_evaluations",
            payload,
            row as { id?: string; version_number?: number },
            true
          );
          toast.success("Evaluation updated successfully");
        } else {
          // New evaluation
          await submitAssessmentWithVersioning(
            "moving_handling_care_plan_evaluations",
            payload,
            undefined,
            false
          );
          toast.success("Evaluation submitted successfully");
        }

        await fetchEntries();
        setMode(null);
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

  // ── Form mode (new or edit) ─────────────────────────────────────────────────
  if (mode === "new" || typeof mode === "number") {
    const editEntry = typeof mode === "number" ? entries[mode] : undefined;
    return (
      <EvaluationFormEntry
        userName={userName}
        defaultValues={
          editEntry
            ? { ...editEntry, residentId, teamId, organizationId, userId } as Partial<EvaluationData>
            : { residentId, teamId, organizationId, userId }
        }
        onSubmit={handleSubmit}
        onCancel={() => setMode(null)}
        isPending={isPending}
        isEdit={typeof mode === "number"}
      />
    );
  }

  // ── Document view ───────────────────────────────────────────────────────────
  return (
    <EvaluationDocumentView
      entries={entries}
      onEdit={(i) => setMode(i)}
      onAddNew={() => setMode("new")}
    />
  );
}
