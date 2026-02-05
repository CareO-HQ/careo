"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { painAssessmentSchema } from "@/schemas/residents/care-file/painAssessmentSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface PainAssessmentDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  careHomeName?: string;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function PainAssessmentDialog({
  teamId, residentId, organizationId, userId, userName, resident,
  careHomeName = "", onClose, initialData, isEditMode = false
}: PainAssessmentDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof painAssessmentSchema>>({
    resolver: zodResolver(painAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData ? {
      residentId, teamId, organizationId, userId,
      residentName: initialData.residentName || `${resident.first_name} ${resident.last_name}`,
      dateOfBirth: initialData.dateOfBirth || (resident.date_of_birth ? format(new Date(resident.date_of_birth), "dd/MM/yyyy") : ""),
      roomNumber: initialData.roomNumber || resident.room_number || "",
      nameOfHome: initialData.nameOfHome || careHomeName || "",
      assessmentDate: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : Date.now(),
      assessmentEntries: initialData.assessment_entries || []
    } : {
      residentId, teamId, organizationId, userId,
      residentName: `${resident.first_name} ${resident.last_name}`,
      dateOfBirth: resident.date_of_birth ? format(new Date(resident.date_of_birth), "dd/MM/yyyy") : "",
      roomNumber: resident.room_number || "",
      nameOfHome: careHomeName || "",
      assessmentDate: Date.now(),
      assessmentEntries: [{
        dateTime: format(new Date(), "dd/MM/yyyy HH:mm"),
        painLocation: "", descriptionOfPain: "", residentBehaviour: "",
        interventionType: "", interventionTime: "", painAfterIntervention: "",
        comments: "", signature: userName
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "assessmentEntries"
  });

  function onSubmit(values: z.infer<typeof painAssessmentSchema>) {
    startTransition(async () => {
      try {
        const currentUserId = userId;
        if (!currentUserId) throw new Error("User not authenticated");

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          assessment_date: new Date(values.assessmentDate).toISOString().split('T')[0],
          assessment_entries: values.assessmentEntries,
          created_by: currentUserId
        };

        await submitAssessmentWithVersioning(
          'pain_assessments',
          payload,
          initialData,
          isEditMode
        );

        if (isEditMode && initialData?.id) {
          await supabase.from('manager_audits').insert({
            form_type: 'pain_assessments', form_id: initialData.id, resident_id: residentId,
            audited_by: currentUserId, audit_notes: "Form reviewed", organization_id: organizationId
          });
          toast.success("Pain assessment updated!");
        } else {
          toast.success("Pain assessment submitted");
        }
        setTimeout(() => onClose?.(), 500);
      } catch (error) {
        console.error("Error submitting:", error);
        toast.error("Failed to submit assessment.");
      }
    });
  }

  const addEntry = () => {
    append({
      dateTime: format(new Date(), "dd/MM/yyyy HH:mm"),
      painLocation: "", descriptionOfPain: "", residentBehaviour: "",
      interventionType: "", interventionTime: "", painAfterIntervention: "",
      comments: "", signature: userName
    });
  };

  return (
    <>
      <DialogHeader><DialogTitle>Pain Assessment</DialogTitle><DialogDescription>Record pain assessments and interventions</DialogDescription></DialogHeader>
      <div className="max-h-[70vh] overflow-y-auto">
        <Form {...form}>
          <form className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h3 className="font-semibold">Header Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nameOfHome" render={({ field }) => <FormItem><FormLabel>Home Name</FormLabel><Input {...field} /></FormItem>} />
                <FormField control={form.control} name="residentName" render={({ field }) => <FormItem><FormLabel>Resident Name</FormLabel><Input {...field} /></FormItem>} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => <FormItem><FormLabel>DOB</FormLabel><Input {...field} /></FormItem>} />
                <FormField control={form.control} name="roomNumber" render={({ field }) => <FormItem><FormLabel>Room</FormLabel><Input {...field} /></FormItem>} />
              </div>
              <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}><PopoverTrigger asChild><Button variant="outline" className={cn("w-full text-left", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : "Pick date"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={d => { field.onChange(d?.getTime()); setDatePopoverOpen(false); }} /></PopoverContent></Popover></FormItem>
              )} />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Pain Entries</h3>
                <Button type="button" variant="outline" size="sm" onClick={addEntry}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-background">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Entry {index + 1}</h4>
                    {fields.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name={`assessmentEntries.${index}.dateTime`} render={({ field: f }) => <FormItem><FormLabel>Date/Time</FormLabel><Input type="datetime-local" value={f.value ? (() => { const m = f.value.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/); return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}` : ''; })() : ''} onChange={e => f.onChange(e.target.value ? format(new Date(e.target.value), "dd/MM/yyyy HH:mm") : '')} /></FormItem>} />
                    <FormField control={form.control} name={`assessmentEntries.${index}.painLocation`} render={({ field: f }) => <FormItem><FormLabel>Pain Location</FormLabel><Input placeholder="e.g., A - Lower back" {...f} /></FormItem>} />
                  </div>
                  <FormField control={form.control} name={`assessmentEntries.${index}.descriptionOfPain`} render={({ field: f }) => <FormItem><FormLabel>Description</FormLabel><Textarea placeholder="Describe the pain..." {...f} rows={2} /></FormItem>} />
                  <FormField control={form.control} name={`assessmentEntries.${index}.residentBehaviour`} render={({ field: f }) => <FormItem><FormLabel>Behaviour</FormLabel><Input placeholder="e.g., restless, calm" {...f} /></FormItem>} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name={`assessmentEntries.${index}.interventionType`} render={({ field: f }) => <FormItem><FormLabel>Intervention</FormLabel><Input placeholder="e.g., medication" {...f} /></FormItem>} />
                    <FormField control={form.control} name={`assessmentEntries.${index}.interventionTime`} render={({ field: f }) => <FormItem><FormLabel>Time</FormLabel><Input type="time" {...f} /></FormItem>} />
                  </div>
                  <FormField control={form.control} name={`assessmentEntries.${index}.painAfterIntervention`} render={({ field: f }) => <FormItem><FormLabel>Pain after intervention</FormLabel><Textarea placeholder="Describe pain status..." {...f} rows={2} /></FormItem>} />
                  <FormField control={form.control} name={`assessmentEntries.${index}.comments`} render={({ field: f }) => <FormItem><FormLabel>Comments</FormLabel><Textarea {...f} rows={2} /></FormItem>} />
                  <FormField control={form.control} name={`assessmentEntries.${index}.signature`} render={({ field: f }) => <FormItem><FormLabel>Signature</FormLabel><Input {...f} /></FormItem>} />
                </div>
              ))}
            </div>
          </form>
        </Form>
      </div>
      <DialogFooter>
        <Button onClick={onClose} variant="outline" disabled={isLoading}>Cancel</Button>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</Button>
      </DialogFooter>
    </>
  );
}
