"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { mustAssessmentSchema, MustAssessmentFormValues } from "@/schemas/residents/care-file/mustAssessmentSchema";
import { Resident } from "@/types";
import NextReviewDateField from "./NextReviewDateField";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface MustAssessmentDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  onClose?: () => void;
  isInline?: boolean;
  viewOnly?: boolean;
  refreshForms?: () => void;
}

interface MustAssessmentRecord {
  id: string;
  assessment_date: string;
  next_review_date: string | null;
  resident_name: string;
  bedroom_number: string | null;
  date_of_birth: string | null;
  weight_kg: number;
  height_cm: number;
  bmi_value: number;
  step1_score: number;
  step2_score: number;
  step3_score: number;
  total_must_score: number;
  signature: string;
  job_role: string;
  created_at: string;
}

interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

function isMissingNextReviewDateColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const postgrestError = error as PostgrestErrorLike;
  return (
    (postgrestError.code === "PGRST204" || postgrestError.code === "42703")
    && postgrestError.message?.toLowerCase().includes("next_review_date")
    && postgrestError.message?.toLowerCase().includes("must_assessments")
  );
}

function getResidentName(resident: Resident): string {
  return `${resident.first_name || ""} ${resident.last_name || ""}`.trim();
}

function getDobDisplayValue(resident: Resident): string {
  if (!resident.date_of_birth) return "";
  return format(new Date(resident.date_of_birth), "dd/MM/yyyy");
}

function calculateBmi(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Number(bmi.toFixed(1));
}

function calculateStep1FromBmi(bmi: number): 0 | 1 | 2 {
  if (bmi > 20) return 0;
  if (bmi >= 18.5) return 1;
  return 2;
}

function getRiskLevel(totalMustScore: number): "Low Risk" | "Medium Risk" | "High Risk" {
  if (totalMustScore === 0) return "Low Risk";
  if (totalMustScore === 1) return "Medium Risk";
  return "High Risk";
}

export default function MustAssessmentDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  isInline = false,
  viewOnly = false,
  refreshForms
}: MustAssessmentDialogProps) {
  const [isSaving, startTransition] = useTransition();
  const [records, setRecords] = useState<MustAssessmentRecord[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [assessmentDatePopoverOpen, setAssessmentDatePopoverOpen] = useState(false);

  const identityDefaults = useMemo(
    () => ({
      residentName: getResidentName(resident),
      bedroomNumber: resident.room_number || "",
      dateOfBirth: getDobDisplayValue(resident)
    }),
    [resident]
  );

  const form = useForm<MustAssessmentFormValues>({
    resolver: zodResolver(mustAssessmentSchema),
    defaultValues: {
      residentId,
      teamId,
      organizationId,
      userId,
      ...identityDefaults,
      nextReviewDate: "",
      assessmentDate: Date.now(),
      weightKg: 0,
      heightCm: 0,
      bmi: 0,
      step1Score: 2,
      step2Score: 0,
      step3Score: 0,
      totalMustScore: 2,
      signature: userName || "",
      jobRole: ""
    }
  });

  const weightKg = form.watch("weightKg");
  const heightCm = form.watch("heightCm");
  const step2Score = form.watch("step2Score");
  const step3Score = form.watch("step3Score");
  const totalMustScore = form.watch("totalMustScore");

  useEffect(() => {
    const bmi = calculateBmi(weightKg, heightCm);
    const step1 = calculateStep1FromBmi(bmi);
    const total = step1 + step2Score + step3Score;

    form.setValue("bmi", bmi, { shouldValidate: true });
    form.setValue("step1Score", step1, { shouldValidate: true });
    form.setValue("totalMustScore", total, { shouldValidate: true });
  }, [form, weightKg, heightCm, step2Score, step3Score]);

  const fetchRecords = async () => {
    setIsRecordsLoading(true);
    try {
      const { data, error } = await supabase
        .from("must_assessments")
        .select(
          "id, assessment_date, next_review_date, resident_name, bedroom_number, date_of_birth, weight_kg, height_cm, bmi_value, step1_score, step2_score, step3_score, total_must_score, signature, job_role, created_at"
        )
        .eq("resident_id", residentId)
        .eq("status", "active")
        .order("assessment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        if (!isMissingNextReviewDateColumn(error)) throw error;

        const { data: fallbackData, error: fallbackError } = await supabase
          .from("must_assessments")
          .select(
            "id, assessment_date, resident_name, bedroom_number, date_of_birth, weight_kg, height_cm, bmi_value, step1_score, step2_score, step3_score, total_must_score, signature, job_role, created_at"
          )
          .eq("resident_id", residentId)
          .eq("status", "active")
          .order("assessment_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (fallbackError) throw fallbackError;

        const normalizedData = (fallbackData || []).map((record) => ({
          ...record,
          next_review_date: null
        }));
        setRecords(normalizedData as MustAssessmentRecord[]);
        return;
      }

      setRecords((data || []) as MustAssessmentRecord[]);
    } catch (error) {
      console.error("Error fetching MUST assessments:", error);
      toast.error("Failed to load MUST assessment records");
    } finally {
      setIsRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [residentId]);

  const resetToDefault = () => {
    form.reset({
      residentId,
      teamId,
      organizationId,
      userId,
      ...identityDefaults,
      nextReviewDate: "",
      assessmentDate: Date.now(),
      weightKg: 0,
      heightCm: 0,
      bmi: 0,
      step1Score: 2,
      step2Score: 0,
      step3Score: 0,
      totalMustScore: 2,
      signature: userName || "",
      jobRole: ""
    });
  };

  const onSubmit = (values: MustAssessmentFormValues) => {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          team_id: teamId || null,
          created_by: userId,
          resident_name: values.residentName,
          bedroom_number: values.bedroomNumber || null,
          date_of_birth: values.dateOfBirth || null,
          next_review_date: values.nextReviewDate,
          assessment_date: new Date(values.assessmentDate).toISOString().split("T")[0],
          weight_kg: values.weightKg,
          height_cm: values.heightCm,
          bmi_value: values.bmi,
          step1_score: values.step1Score,
          step2_score: values.step2Score,
          step3_score: values.step3Score,
          total_must_score: values.totalMustScore,
          signature: values.signature,
          job_role: values.jobRole,
          status: "active",
          version_number: 1
        };

        const { error } = await supabase.from("must_assessments").insert(payload);

        if (error) {
          if (!isMissingNextReviewDateColumn(error)) throw error;

          // Some environments may not have received the migration yet.
          // Retry insert without next_review_date so the assessment can still be saved.
          const { next_review_date: _, ...fallbackPayload } = payload;
          const { error: fallbackError } = await supabase.from("must_assessments").insert(fallbackPayload);
          if (fallbackError) throw fallbackError;

          toast.warning("Saved without next review date. Please apply latest DB migrations.");
        }

        toast.success("MUST assessment submitted successfully");
        resetToDefault();
        await fetchRecords();
        refreshForms?.();
      } catch (error) {
        console.error("Error submitting MUST assessment:", error);
        toast.error("Failed to submit MUST assessment");
      }
    });
  };

  return (
    <div className="space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle>MUST Assessment</DialogTitle>
          <DialogDescription>Malnutrition Universal Screening Tool</DialogDescription>
        </DialogHeader>
      )}

      <Form {...form}>
        <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
          <div className="mb-4 p-4 border rounded-lg bg-muted/40">
            <FormField
              control={form.control}
              name="nextReviewDate"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormControl>
                    <NextReviewDateField value={field.value || ""} onChange={field.onChange} disabled={viewOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <button
              type="button"
              id="care-file-submit-btn"
              className="hidden"
              onClick={form.handleSubmit(onSubmit)}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg bg-muted/30">
              <FormField
                control={form.control}
                name="residentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Resident Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bedroomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Bedroom Number</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>DOB (Date of Birth)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="assessmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Date</FormLabel>
                    <Popover open={assessmentDatePopoverOpen} onOpenChange={setAssessmentDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={new Date(field.value)}
                          onSelect={(date) => {
                            if (!date) return;
                            field.onChange(date.getTime());
                            setAssessmentDatePopoverOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        placeholder="e.g. 62.5"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heightCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Height (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        placeholder="e.g. 168"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bmi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BMI (kg/m²)</FormLabel>
                    <FormControl>
                      <Input value={field.value ? field.value.toFixed(1) : "0.0"} disabled />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalMustScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total MUST Score</FormLabel>
                    <FormControl>
                      <Input value={field.value} disabled />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm">
              <span className="font-medium">Risk Level: </span>
              <span>{getRiskLevel(totalMustScore)}</span>
            </div>

            <div className="space-y-3 border rounded-lg p-4">
              <h3 className="text-sm font-semibold">Step 1: Body Mass Index</h3>
              <p className="text-sm text-muted-foreground">
                Auto-scored from BMI:
                {" "}
                {form.watch("step1Score") === 0 && "Over 20 (Score 0)"}
                {form.watch("step1Score") === 1 && "18.5 to 20 (Score 1)"}
                {form.watch("step1Score") === 2 && "Less than 18.5 (Score 2)"}
              </p>
            </div>

            <FormField
              control={form.control}
              name="step2Score"
              render={({ field }) => (
                <FormItem className="space-y-3 border rounded-lg p-4">
                  <FormLabel className="text-sm font-semibold">Step 2: Unplanned Weight Loss (Last 3-6 Mo)</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(Number(value) as 0 | 1 | 2)}
                      value={String(field.value)}
                      className="space-y-2"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="0" /></FormControl>
                        <FormLabel className="font-normal">Less than 5% (Score 0)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="1" /></FormControl>
                        <FormLabel className="font-normal">Between 5-10% (Score 1)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="2" /></FormControl>
                        <FormLabel className="font-normal">More than 10% (Score 2)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="step3Score"
              render={({ field }) => (
                <FormItem className="space-y-3 border rounded-lg p-4">
                  <FormLabel className="text-sm font-semibold">Step 3: Acute Disease Effect</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(Number(value) as 0 | 2)}
                      value={String(field.value)}
                      className="space-y-2"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="0" /></FormControl>
                        <FormLabel className="font-normal">No (Score 0)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="2" /></FormControl>
                        <FormLabel className="font-normal">If acutely ill + no intake &gt; 5 days (Score 2)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="signature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Signature</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Job Role</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </fieldset>
      </Form>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">MUST Assessment Records</h3>
          <Button variant="outline" size="sm" onClick={fetchRecords} disabled={isRecordsLoading}>
            Refresh
          </Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Next Review Date</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Height (cm)</TableHead>
                <TableHead>BMI</TableHead>
                <TableHead>Step 1</TableHead>
                <TableHead>Step 2</TableHead>
                <TableHead>Step 3</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead>Job Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isRecordsLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center h-24">
                    Loading records...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center h-24 text-muted-foreground">
                    No MUST assessments submitted yet.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(new Date(record.assessment_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      {record.next_review_date
                        ? format(new Date(record.next_review_date), "dd/MM/yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>{record.weight_kg}</TableCell>
                    <TableCell>{record.height_cm}</TableCell>
                    <TableCell>{record.bmi_value.toFixed(1)}</TableCell>
                    <TableCell>{record.step1_score}</TableCell>
                    <TableCell>{record.step2_score}</TableCell>
                    <TableCell>{record.step3_score}</TableCell>
                    <TableCell>{record.total_must_score}</TableCell>
                    <TableCell>{getRiskLevel(record.total_must_score)}</TableCell>
                    <TableCell>{record.signature}</TableCell>
                    <TableCell>{record.job_role}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {!isInline && !viewOnly && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onClose?.()} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
          </Button>
        </div>
      )}
    </div>
  );
}
