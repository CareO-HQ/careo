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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { carePlanAssessmentSchema } from "@/schemas/residents/care-file/carePlanSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface CarePlanDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  folderKey?: string;
  initialData?: any;
  isEditMode?: boolean;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isInline?: boolean;
}

const generateTimeOptions = () => {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour.toString().padStart(2, "0");
      const minuteStr = minute.toString().padStart(2, "0");
      times.push(`${hourStr}:${minuteStr}`);
    }
  }
  return times;
};

export default function CarePlanDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  folderKey,
  initialData,
  isEditMode = false,
  onClose,
  isInline = false,
}: CarePlanDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [dateWrittenPopoverOpen, setDateWrittenPopoverOpen] = useState(false);
  const [reviewDatePopoverOpen, setReviewDatePopoverOpen] = useState(false);
  const [plannedCareDatePopovers, setPlannedCareDatePopovers] = useState<
    Record<number, boolean>
  >({});

  const timeOptions = generateTimeOptions();

  const form = useForm<z.infer<typeof carePlanAssessmentSchema>>({
    resolver: zodResolver(carePlanAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId: residentId as any,
        userId,
        nameOfCarePlan: initialData.care_plan_type || initialData.nameOfCarePlan || "",
        residentName:
          initialData.residentName ||
          `${resident.first_name} ${resident.last_name}`.trim(),
        dob:
          typeof initialData.dob === "number"
            ? initialData.dob
            : resident.date_of_birth
              ? new Date(resident.date_of_birth).getTime()
              : Date.now(),
        bedroomNumber: initialData.bedroomNumber || resident.room_number || "",
        writtenBy: isEditMode ? (userName || "Unknown") : (initialData.writtenBy || userName || "Unknown"),
        dateWritten: initialData.dateWritten || Date.now(),
        carePlanNumber: initialData.carePlanNumber || "",
        identifiedNeeds: initialData.need_identified || initialData.identifiedNeeds || "",
        aims: initialData.goals?.aims || initialData.aims || "",
        plannedCareDate: initialData.interventions || initialData.plannedCareDate || [
          {
            date: Date.now(),
            time: "",
            details: "",
            signature: userName || "Unknown"
          }
        ],
        discussedWith: initialData.goals?.discussedWith || initialData.discussedWith || "",
        signature: initialData.goals?.signature || initialData.signature || userName || "Unknown",
        date: initialData.date || Date.now(),
        staffSignature: initialData.goals?.staffSignature || initialData.staffSignature || userName || "Unknown"
      }
      : {
        residentId: residentId as any,
        userId,
        nameOfCarePlan: "",
        residentName: resident
          ? `${resident.first_name} ${resident.last_name}`.trim()
          : "",
        dob: resident
          ? resident.date_of_birth
            ? new Date(resident.date_of_birth).getTime()
            : Date.now()
          : Date.now(),
        bedroomNumber: resident?.room_number || "",
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
            signature: userName || "Unknown"
          }
        ],
        discussedWith: "",
        signature: userName || "Unknown",
        date: Date.now(),
        staffSignature: userName || "Unknown"
      }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "plannedCareDate"
  });

  const onSubmit = async (values: z.infer<typeof carePlanAssessmentSchema>) => {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId || (await supabase.auth.getUser()).data.user?.user_metadata?.organization_id, // Fallback
          care_plan_type: values.nameOfCarePlan,
          need_identified: values.identifiedNeeds,
          interventions: values.plannedCareDate as any, // Store array directly as JSON
          goals: {
            aims: values.aims,
            discussedWith: values.discussedWith || "",
            signature: values.signature || "",
            staffSignature: values.staffSignature || "",
            // Meta fields
            residentName: values.residentName,
            dob: values.dob,
            bedroomNumber: values.bedroomNumber,
            writtenBy: values.writtenBy,
            dateWritten: values.dateWritten,
            carePlanNumber: values.carePlanNumber,
            folderKey: folderKey
          },
          status: 'active',
          created_by: userId,
        };

        if (isEditMode && initialData?.id) {
          // Update mode: Archive the old plan and create a new version
          const archivePayload = {
            status: 'archived',
            archived_at: new Date().toISOString()
          };

          const { error: archiveError } = await supabase
            .from('care_plan_assessments')
            .update(archivePayload)
            .eq('id', initialData.id);

          if (archiveError) throw archiveError;

          const newVersionPayload = {
            ...payload,
            previous_care_plan_id: initialData.id
          };

          const { error: insertError } = await supabase
            .from('care_plan_assessments')
            .insert(newVersionPayload);

          if (insertError) throw insertError;

          toast.success("Care plan assessment updated successfully. Previous version archived.");
        } else {
          const { error } = await supabase
            .from('care_plan_assessments')
            .insert(payload);

          if (error) throw error;
          toast.success("Care plan assessment submitted successfully");
        }

        onClose?.();
      } catch (error: any) {
        console.error("Error submitting care plan assessment:", error);
        toast.error(error.message || "Failed to submit care plan assessment");
      }
    });
  };

  return (
    <div className="flex flex-col space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Care Plan</DialogTitle>
          <DialogDescription>
            Record and update the personalized care plan for the resident.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="space-y-12 pb-20">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
            <button type="submit" id="care-file-submit-btn" className="hidden" />
            {/* Section 1: Basic Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField control={form.control} name="nameOfCarePlan" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel required>Name of Care Plan</FormLabel>
                    <FormControl><Input placeholder="e.g. Personal Care, Nutrition, etc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="residentName" render={({ field }) => (
                  <FormItem><FormLabel>Resident Name</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dob" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel>
                    <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen} modal>
                      <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDobPopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} /></PopoverContent>
                    </Popover>
                    <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bedroomNumber" render={({ field }) => (
                  <FormItem><FormLabel>Bedroom Number</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="carePlanNumber" render={({ field }) => (
                  <FormItem><FormLabel>Care Plan Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="writtenBy" render={({ field }) => (
                  <FormItem><FormLabel>Written By</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dateWritten" render={({ field }) => (
                  <FormItem><FormLabel>Date Written</FormLabel>
                    <Popover open={dateWrittenPopoverOpen} onOpenChange={setDateWrittenPopoverOpen} modal>
                      <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDateWrittenPopoverOpen(false); } }} /></PopoverContent>
                    </Popover>
                    <FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Section 2: Care Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Care Needs & Goals</h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <FormField control={form.control} name="identifiedNeeds" render={({ field }) => (
                  <FormItem><FormLabel required>Identified Needs</FormLabel><FormControl><Textarea className="min-h-[120px]" placeholder="What does the resident need support with?" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="aims" render={({ field }) => (
                  <FormItem><FormLabel required>Aims / Desired Outcomes</FormLabel><FormControl><Textarea className="min-h-[120px]" placeholder="What are we trying to achieve?" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Section 3: Planned Care / Interventions */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Planned Care & Interventions</h3>
              </div>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-xl p-4 space-y-4 bg-muted/20">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Intervention {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`plannedCareDate.${index}.date`} render={({ field }) => (
                        <FormItem><FormLabel>Date</FormLabel>
                          <Popover open={plannedCareDatePopovers[index] || false} onOpenChange={(open) => setPlannedCareDatePopovers(prev => ({ ...prev, [index]: open }))} modal>
                            <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setPlannedCareDatePopovers(prev => ({ ...prev, [index]: false })); } }} /></PopoverContent>
                          </Popover>
                          <FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`plannedCareDate.${index}.time`} render={({ field }) => (
                        <FormItem><FormLabel>Time</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name={`plannedCareDate.${index}.details`} render={({ field }) => (
                      <FormItem><FormLabel>Details of Care Provided</FormLabel><FormControl><Textarea placeholder="Specific steps, assistance needed, or routines..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`plannedCareDate.${index}.signature`} render={({ field }) => (
                      <FormItem><FormLabel>Signature</FormLabel><FormControl><Input readOnly className="bg-muted" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ date: Date.now(), time: "", details: "", signature: userName })} className="w-full border-dashed">
                  <Plus className="h-4 w-4 mr-2" /> Add Another Intervention
                </Button>
              </div>
            </div>

            {/* Section 4: Reviews & Signatures */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Review & Sign-off</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField control={form.control} name="discussedWith" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Discussed With</FormLabel><FormControl><Input placeholder="Resident, Family, or Staff Member" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="signature" render={({ field }) => (
                  <FormItem><FormLabel>Resident / Representative Signature</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="staffSignature" render={({ field }) => (
                  <FormItem><FormLabel>Staff Signature</FormLabel><FormControl><Input readOnly className="bg-muted" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Next Review Date</FormLabel>
                    <Popover open={reviewDatePopoverOpen} onOpenChange={setReviewDatePopoverOpen} modal>
                      <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(date.getTime()); setReviewDatePopoverOpen(false); } }} /></PopoverContent>
                    </Popover>
                    <FormMessage /></FormItem>
                )} />
              </div>
            </div>
          </form>
        </Form>
      </div>

      {!isInline && (
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
              isEditMode ? "Save Changes" : "Save Care Plan"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
