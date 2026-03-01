"use client";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { skinIntegrityAssessmentSchema } from "@/schemas/residents/care-file/skinIntegritySchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Calendar } from "@/components/ui/calendar";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface SkinIntegrityDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function SkinIntegrityDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false,
  isInline = false,
  viewOnly = false
}: SkinIntegrityDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof skinIntegrityAssessmentSchema>>({
    resolver: zodResolver(skinIntegrityAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId: residentId,
        teamId,
        organizationId,
        userId,
        residentName: initialData.residentName ?? `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
        bedroomNumber: initialData.bedroomNumber ?? initialData.bedroom_number ?? resident.room_number ?? "",
        assessmentDate: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : Date.now(),
        completedBy: initialData.completed_by || userName,

        sensoryPerception: initialData.assessment_details?.sensoryPerception ?? initialData.sensoryPerception ?? 1,
        moisture: initialData.assessment_details?.moisture ?? initialData.moisture ?? 1,
        activity: initialData.assessment_details?.activity ?? initialData.activity ?? 1,
        mobility: initialData.assessment_details?.mobility ?? initialData.mobility ?? 1,
        nutrition: initialData.assessment_details?.nutrition ?? initialData.nutrition ?? 1,
        frictionShear: initialData.assessment_details?.frictionShear ?? initialData.frictionShear ?? 1
      }
      : {
        residentId: residentId,
        teamId,
        organizationId,
        userId,
        residentName: `${resident.first_name} ${resident.last_name}`,
        bedroomNumber: resident.room_number ?? "",
        assessmentDate: Date.now(),
        completedBy: userName,
        sensoryPerception: 1,
        moisture: 1,
        activity: 1,
        mobility: 1,
        nutrition: 1,
        frictionShear: 1
      }
  });

  const onSubmit = async (values: z.infer<typeof skinIntegrityAssessmentSchema>) => {
    startTransition(async () => {
      try {
        const currentUserId = userId;
        if (!currentUserId) throw new Error("User not authenticated");

        const totalScore =
          values.sensoryPerception +
          values.moisture +
          values.activity +
          values.mobility +
          values.nutrition +
          values.frictionShear;

        let riskLevel = "Low Risk";
        if (totalScore < 12) riskLevel = "High Risk";
        else if (totalScore <= 14) riskLevel = "Moderate Risk";

        const assessmentDetails = {
          sensoryPerception: values.sensoryPerception,
          moisture: values.moisture,
          activity: values.activity,
          mobility: values.mobility,
          nutrition: values.nutrition,
          frictionShear: values.frictionShear
        };

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          risk_score: totalScore,
          risk_level: riskLevel,
          assessment_details: assessmentDetails,
          assessment_date: new Date(values.assessmentDate).toISOString().split('T')[0],
          completed_by: values.completedBy,
          created_by: currentUserId
        };

        await submitAssessmentWithVersioning(
          'skin_integrity_assessments',
          payload,
          initialData,
          isEditMode
        );

        if (isEditMode && initialData?.id) {
          await supabase.from('manager_audits').insert({
            form_type: 'skin_integrity_assessments',
            form_id: initialData.id,
            resident_id: residentId,
            audited_by: currentUserId,
            audit_notes: "Form reviewed and updated",
            organization_id: organizationId,
            care_home_id: resident.care_home_id || initialData.care_home_id
          });
          toast.success("Assessment reviewed successfully");
        } else {
          toast.success("Assessment saved successfully");
        }

        onClose?.();
      } catch (error: any) {
        console.error("Error submitting form:", error);
        toast.error(error.message || "Failed to save skin integrity assessment");
      }
    });
  };

  const getScoreDescription = (category: string, score: number): string => {
    const descriptions: any = {
      sensoryPerception: { 1: "Completely Limited", 2: "Very Limited", 3: "Slightly Limited", 4: "No Impairment" },
      moisture: { 1: "Constantly Moist", 2: "Very Moist", 3: "Occasionally Moist", 4: "Rarely Moist" },
      activity: { 1: "Bedfast", 2: "Chairfast", 3: "Walks Occasionally", 4: "Walks Frequently" },
      mobility: { 1: "Completely Immobile", 2: "Very Limited", 3: "Slightly Limited", 4: "No Limitation" },
      nutrition: { 1: "Very Poor", 2: "Probably Inadequate", 3: "Adequate", 4: "Excellent" },
      frictionShear: { 1: "Problem", 2: "Potential Problem", 3: "No Apparent Problem" }
    };
    return descriptions[category]?.[score] || "";
  };

  const currentScore =
    form.watch("sensoryPerception") +
    form.watch("moisture") +
    form.watch("activity") +
    form.watch("mobility") +
    form.watch("nutrition") +
    form.watch("frictionShear");

  let riskLevel = "Low Risk";
  let riskColor = "text-green-600";
  if (currentScore < 12) {
    riskLevel = "High Risk";
    riskColor = "text-destructive";
  } else if (currentScore <= 14) {
    riskLevel = "Moderate Risk";
    riskColor = "text-amber-600";
  }

  return (
    <div className="flex flex-col space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Skin Integrity Assessment</DialogTitle>
          <DialogDescription>
            Identify risk of pressure injury using the Braden Scale.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="space-y-12 pb-20">
        <Form {...form}>
          <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              <button type="submit" id="care-file-submit-btn" className="hidden" />
              {/* Section 1: Basic Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="residentName" render={({ field }) => (
                    <FormItem><FormLabel>Resident Name</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bedroomNumber" render={({ field }) => (
                    <FormItem><FormLabel>Bedroom Number</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>Assessment Date</FormLabel>
                      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal>
                        <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDatePopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} /></PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="completedBy" render={({ field }) => (
                    <FormItem><FormLabel>Completed By</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              {/* Section 2: Braden Scale Parameters */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Braden Scale Assessment</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                  {["sensoryPerception", "moisture", "activity", "mobility", "nutrition", "frictionShear"].map((key) => (
                    <FormField key={key} control={form.control} name={key as any} render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</FormLabel>
                        <FormControl>
                          <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4].filter(i => !(key === 'frictionShear' && i === 4)).map(i => (
                                <SelectItem key={i} value={String(i)} className="py-3">
                                  <div className="flex flex-col">
                                    <span className="font-bold">Score {i}</span>
                                    <span className="text-xs text-muted-foreground">{getScoreDescription(key, i)}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>

              {/* Risk Summary Card */}
              <div className="p-8 border rounded-2xl bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Assessment Summary</h4>
                    <p className="text-3xl font-black mt-2">Braden Score: {currentScore}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Risk Level</p>
                    <p className={cn("text-2xl font-black mt-2", riskColor)}>{riskLevel}</p>
                  </div>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-500",
                      currentScore < 12 ? "bg-destructive" : currentScore <= 14 ? "bg-amber-500" : "bg-green-500"
                    )}
                    style={{ width: `${(currentScore / 23) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground italic">
                  * High Risk: &lt; 12 | Moderate Risk: 12-14 | Low Risk: 15-23
                </p>
              </div>
            </form>
          </fieldset>
        </Form>
      </div>

      {!isInline && !viewOnly && (
        <div className="border-t pt-8 flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-6 px-6 pb-2">
          <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading} size="lg">
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} size="lg" className="min-w-[150px]">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              isEditMode ? "Save Changes" : "Save Assessment"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
