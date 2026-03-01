"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Textarea } from "@/components/ui/textarea";
import { peepSchema } from "@/schemas/residents/care-file/peepSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface PeepDialogProps {
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

export default function PeepDialog({
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
  viewOnly = false,
}: PeepDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [completionDatePopoverOpen, setCompletionDatePopoverOpen] = useState(false);

  const { supabase } = useSupabase();

  const form = useForm<z.infer<typeof peepSchema>>({
    resolver: zodResolver(peepSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentName:
          initialData.residentName ??
          `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
        residentDateOfBirth:
          typeof initialData.residentDateOfBirth === "number"
            ? initialData.residentDateOfBirth
            : typeof resident.date_of_birth === "number"
              ? resident.date_of_birth
              : resident.date_of_birth
                ? new Date(resident.date_of_birth).getTime()
                : Date.now(),
        bedroomNumber: initialData.bedroomNumber ?? resident.room_number ?? "",
        // Assistance needed is stored in JSONB column assistance_needed
        understands:
          initialData.assistance_needed?.understands ??
          initialData.understands ??
          false,
        staffNeeded:
          initialData.assistance_needed?.staffNeeded ??
          initialData.staffNeeded ??
          1,
        equipmentNeeded:
          initialData.assistance_needed?.equipmentNeeded ??
          initialData.equipmentNeeded ??
          "",
        communicationNeeds:
          initialData.assistance_needed?.communicationNeeds ??
          initialData.communicationNeeds ??
          "",
        // Steps stored as evacuation_steps array
        steps: initialData.evacuation_steps ?? initialData.steps ?? [],
        // Hazard info stored in JSONB column hazard_info
        oxigenInUse:
          initialData.hazard_info?.oxigenInUse ??
          initialData.oxigenInUse ??
          false,
        oxigenComments:
          initialData.hazard_info?.oxigenComments ??
          initialData.oxigenComments ??
          "",
        residentSmokes:
          initialData.hazard_info?.residentSmokes ??
          initialData.residentSmokes ??
          false,
        residentSmokesComments:
          initialData.hazard_info?.residentSmokesComments ??
          initialData.residentSmokesComments ??
          "",
        furnitureFireRetardant:
          initialData.hazard_info?.furnitureFireRetardant ??
          initialData.furnitureFireRetardant ??
          false,
        furnitureFireRetardantComments:
          initialData.hazard_info?.furnitureFireRetardantComments ??
          initialData.furnitureFireRetardantComments ??
          "",
        completedBy: isEditMode
          ? userName
          : (initialData.completedBy ?? initialData.completed_by ?? userName),
        completedBySignature: isEditMode
          ? userName
          : (initialData.completedBySignature ?? userName),
        assessmentDate:
          typeof (initialData.assessment_date || initialData.completion_date || initialData.date) === "number"
            ? (initialData.assessment_date || initialData.completion_date || initialData.date)
            : (initialData.assessment_date || initialData.completion_date || initialData.date)
              ? new Date(initialData.assessment_date || initialData.completion_date || initialData.date).getTime()
              : Date.now(),
        status: initialData.status ?? "draft"
      }
      : {
        residentName: `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
        residentDateOfBirth:
          typeof resident.date_of_birth === "number"
            ? resident.date_of_birth
            : resident.date_of_birth
              ? new Date(resident.date_of_birth).getTime()
              : Date.now(),
        bedroomNumber: resident.room_number ?? "",
        understands: false,
        staffNeeded: 0,
        equipmentNeeded: "",
        communicationNeeds: "",
        steps: [],
        oxigenInUse: false,
        oxigenComments: "",
        residentSmokes: false,
        residentSmokesComments: "",
        furnitureFireRetardant: false,
        furnitureFireRetardantComments: "",
        completedBy: userName,
        completedBySignature: userName,
        assessmentDate: Date.now(),
        status: "draft"
      }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "steps"
  });

  const onSubmit = async (values: z.infer<typeof peepSchema>) => {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          assistance_needed: {
            understands: values.understands,
            staffNeeded: values.staffNeeded,
            equipmentNeeded: values.equipmentNeeded,
            communicationNeeds: values.communicationNeeds
          },
          evacuation_steps: values.steps,
          hazard_info: {
            oxigenInUse: values.oxigenInUse,
            oxigenComments: values.oxigenComments,
            residentSmokes: values.residentSmokes,
            residentSmokesComments: values.residentSmokesComments,
            furnitureFireRetardant: values.furnitureFireRetardant,
            furnitureFireRetardantComments: values.furnitureFireRetardantComments
          },
          completed_by: values.completedBy,
          assessment_date: format(new Date(values.assessmentDate), "yyyy-MM-dd"),
          created_by: userId
        };

        await submitAssessmentWithVersioning(
          'peeps',
          payload,
          initialData,
          isEditMode
        );

        toast.success(isEditMode ? "PEEP updated successfully" : "PEEP saved successfully");
        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save PEEP");
      }
    });
  };

  const addStep = () => {
    append({ name: "", description: "" });
  };

  return (
    <div className="flex flex-col space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Personal Emergency Evacuation Plan (PEEP)</DialogTitle>
          <DialogDescription>
            Record evacuation procedures and safety requirements for the resident.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="space-y-12 pb-20">
        <Form {...form}>
          <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              <button type="submit" id="care-file-submit-btn" className="hidden" />

              {/* Section 1: Resident Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">1. Resident Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="residentName" render={({ field }) => (
                    <FormItem><FormLabel required>Resident Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bedroomNumber" render={({ field }) => (
                    <FormItem><FormLabel required>Bedroom Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="residentDateOfBirth" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Date of Birth</FormLabel>
                      <Popover modal open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar captionLayout="dropdown" mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDobPopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Section 2: Assistance Needs */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">2. Assistance & Communication</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="understands" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Understands evacuation plan?</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="staffNeeded" render={({ field }) => (
                    <FormItem><FormLabel required>Number of Staff Needed</FormLabel><FormControl><Input {...field} type="number" min="0" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="md:col-span-2">
                    <FormField control={form.control} name="equipmentNeeded" render={({ field }) => (
                      <FormItem><FormLabel>Evacuation Equipment Needed</FormLabel><FormControl><Textarea {...field} placeholder="Wheelchair, evacuation chair, slide sheets..." rows={2} /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="md:col-span-2">
                    <FormField control={form.control} name="communicationNeeds" render={({ field }) => (
                      <FormItem><FormLabel>Special Communication Needs</FormLabel><FormControl><Textarea {...field} placeholder="Visual aids, hearing aids, translation..." rows={2} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>
              </div>

              {/* Section 3: Hazard & Safety */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">3. Hazard & Safety considerations</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 p-4 border rounded-xl bg-red-50/20">
                    <FormField control={form.control} name="oxigenInUse" render={({ field }) => (
                      <FormItem className="flex items-center justify-between"><FormLabel className="mr-4">Oxygen in use?</FormLabel><FormControl><Select onValueChange={(v) => field.onChange(v === "true")} value={field.value ? "true" : "false"}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="oxigenComments" render={({ field }) => (
                      <FormItem><FormLabel>Oxygen Details</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="space-y-4 p-4 border rounded-xl bg-red-50/20">
                    <FormField control={form.control} name="residentSmokes" render={({ field }) => (
                      <FormItem className="flex items-center justify-between"><FormLabel className="mr-4">Resident smokes?</FormLabel><FormControl><Select onValueChange={(v) => field.onChange(v === "true")} value={field.value ? "true" : "false"}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="residentSmokesComments" render={({ field }) => (
                      <FormItem><FormLabel>Smoking Details</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="md:col-span-2 space-y-4 p-4 border rounded-xl bg-red-50/20">
                    <FormField control={form.control} name="furnitureFireRetardant" render={({ field }) => (
                      <FormItem className="flex items-center justify-between"><FormLabel>Furniture is fire retardant?</FormLabel><FormControl><Select onValueChange={(v) => field.onChange(v === "true")} value={field.value ? "true" : "false"}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="furnitureFireRetardantComments" render={({ field }) => (
                      <FormItem><FormLabel>Furniture Comments</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>
              </div>

              {/* Section 4: Evacuation Steps */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    <h3 className="text-lg font-semibold">4. Evacuation Steps</h3>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addStep}>
                    <Plus className="w-4 h-4 mr-2" />Add Step
                  </Button>
                </div>

                {fields.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/5">
                    No steps added yet. Click &quot;Add Step&quot; to begin.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-6 border rounded-xl bg-card relative group transition-all hover:border-blue-300 hover:shadow-sm">
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1 border-r pr-4">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step {index + 1}</span>
                          <FormField control={form.control} name={`steps.${index}.name`} render={({ field }) => (
                            <FormItem className="mt-2"><FormLabel className="text-xs">Label</FormLabel><FormControl><Input {...field} placeholder="e.g. Exit building" className="h-8" /></FormControl></FormItem>
                          )} />
                        </div>
                        <div className="md:col-span-3">
                          <FormField control={form.control} name={`steps.${index}.description`} render={({ field }) => (
                            <FormItem><FormLabel className="text-xs">Detailed Procedure</FormLabel><FormControl><Textarea {...field} placeholder="How to perform this step..." rows={3} /></FormControl></FormItem>
                          )} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 5: Sign-off */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">5. Completion Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField control={form.control} name="completedBy" render={({ field }) => (
                    <FormItem><FormLabel required>Completed By</FormLabel><FormControl><Input {...field} className="bg-muted" readOnly disabled /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="completedBySignature" render={({ field }) => (
                    <FormItem><FormLabel required>Signature</FormLabel><FormControl><Input {...field} className="bg-muted" readOnly disabled /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Completion Date</FormLabel>
                      <Popover modal open={completionDatePopoverOpen} onOpenChange={setCompletionDatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl><Button variant="outline" className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : "Pick date"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar captionLayout="dropdown" mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(date.getTime()); setCompletionDatePopoverOpen(false); } }} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

            </form>
          </fieldset>
        </Form>
      </div>

      {!isInline && !viewOnly && (
        <div className="border-t pt-8 flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-6 px-6 pb-2">
          <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading} size="lg">Cancel</Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} size="lg" className="min-w-[150px]">
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              isEditMode ? "Save Changes" : "Save PEEP"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
