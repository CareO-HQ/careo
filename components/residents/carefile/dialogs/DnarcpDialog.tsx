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
import { DnacprSchema } from "@/schemas/residents/care-file/dnacprSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface DnacprDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function DnacprDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: DnacprDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [residentDatePopoverOpen, setResidentDatePopoverOpen] = useState(false);
  const [relativeDatePopoverOpen, setRelativeDatePopoverOpen] = useState(false);
  const [nokDatePopoverOpen, setNokDatePopoverOpen] = useState(false);
  const [gpDatePopoverOpen, setGpDatePopoverOpen] = useState(false);

  const { supabase } = useSupabase();

  const getDateOfBirthTimestamp = (): number => {
    if (typeof resident.date_of_birth === "number") {
      return resident.date_of_birth;
    }
    if (resident.date_of_birth && typeof resident.date_of_birth === "string") {
      const timestamp = new Date(resident.date_of_birth).getTime();
      if (!isNaN(timestamp) && timestamp > 0) {
        return timestamp;
      }
    }
    const defaultAge = 70;
    return Date.now() - (defaultAge * 365.25 * 24 * 60 * 60 * 1000);
  };

  const form = useForm<z.infer<typeof DnacprSchema>>({
    resolver: zodResolver(DnacprSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId: residentId,
        teamId,
        organizationId,
        userId,
        residentName:
          initialData.residentName ??
          `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
        bedroomNumber: initialData.bedroomNumber ?? resident.room_number ?? "",
        dateOfBirth:
          typeof initialData.dateOfBirth === "number" && initialData.dateOfBirth > 0
            ? initialData.dateOfBirth
            : getDateOfBirthTimestamp(),
        dnacpr: initialData.dnacpr ?? false,
        dnacprComments: initialData.dnacprComments ?? "",
        reason: initialData.reason ?? "TERMINAL-PROGRESSIVE",
        date: initialData.date ?? Date.now(),
        discussedResident: initialData.discussedResident ?? false,
        discussedResidentComments:
          initialData.discussedResidentComments ?? "",
        discussedResidentDate: initialData.discussedResidentDate ?? undefined,
        discussedRelatives: initialData.discussedRelatives ?? false,
        discussedRelativesComments:
          initialData.discussedRelativesComments ?? "",
        discussedRelativeDate: initialData.discussedRelativeDate ?? undefined,
        discussedNOKs: initialData.discussedNOKs ?? false,
        discussedNOKsComments: initialData.discussedNOKsComments ?? "",
        discussedNOKsDate: initialData.discussedNOKsDate ?? undefined,
        comments: initialData.comments ?? "",
        gpDate: initialData.gpDate ?? Date.now(),
        gpSignature: initialData.gpSignature ?? "",
        residentNokSignature: initialData.residentNokSignature ?? "",
        registeredNurseSignature: initialData.registeredNurseSignature ?? ""
      }
      : {
        residentId: residentId,
        teamId,
        organizationId,
        userId,
        residentName: `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
        bedroomNumber: resident.room_number ?? "",
        dateOfBirth: getDateOfBirthTimestamp(),
        dnacpr: false,
        dnacprComments: "",
        reason: "TERMINAL-PROGRESSIVE",
        date: Date.now(),
        discussedResident: false,
        discussedResidentComments: "",
        discussedResidentDate: undefined,
        discussedRelatives: false,
        discussedRelativesComments: "",
        discussedRelativeDate: undefined,
        discussedNOKs: false,
        discussedNOKsComments: "",
        discussedNOKsDate: undefined,
        comments: "",
        gpDate: Date.now(),
        gpSignature: "",
        residentNokSignature: "",
        registeredNurseSignature: ""
      }
  });

  const onSubmit = async (values: z.infer<typeof DnacprSchema>) => {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          dnacpr_active: values.dnacpr,
          reason: values.reason,
          discussion_history: {
            discussedResident: values.discussedResident,
            discussedResidentComments: values.discussedResidentComments,
            discussedResidentDate: values.discussedResidentDate,
            discussedRelatives: values.discussedRelatives,
            discussedRelativesComments: values.discussedRelativesComments,
            discussedRelativeDate: values.discussedRelativeDate,
            discussedNOKs: values.discussedNOKs,
            discussedNOKsComments: values.discussedNOKsComments,
            discussedNOKsDate: values.discussedNOKsDate,
            comments: values.comments,
            residentNokSignature: values.residentNokSignature,
            registeredNurseSignature: values.registeredNurseSignature
          },
          gp_signature: values.gpSignature,
          gp_date: format(new Date(values.gpDate), "yyyy-MM-dd"),
          assessment_date: format(new Date(values.date), "yyyy-MM-dd"),
          completed_by: values.registeredNurseSignature,
          created_by: userId,
          status: "completed"
        };

        await submitAssessmentWithVersioning(
          'dnacprs',
          payload,
          initialData,
          isEditMode
        );

        toast.success(isEditMode ? "DNACPR form updated successfully" : "DNACPR form saved successfully");
        onClose?.();
      } catch (error) {
        console.error("Error submitting DNACPR form:", error);
        toast.error("Failed to save DNACPR form");
      }
    });
  };

  return (
    <div className="flex flex-col space-y-8">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">DNACPR Decision Form</DialogTitle>
        <DialogDescription>
          Do Not Attempt Cardiopulmonary Resuscitation (DNACPR) decision and discussion record.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-12 pb-20">
        <Form {...form}>
          <form className="space-y-12">

            {/* Section 1: Resident & Decision */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">1. Resident Information & Decision</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="residentName" render={({ field }) => (
                  <FormItem><FormLabel required>Resident Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bedroomNumber" render={({ field }) => (
                  <FormItem><FormLabel required>Bedroom Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Date of Birth</FormLabel>
                    <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen} modal>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar captionLayout="dropdown" mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDobPopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Date of Decision</FormLabel>
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" captionLayout="dropdown" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDatePopoverOpen(false); } }} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-red-50/50 rounded-xl border border-red-100">
                <FormField control={form.control} name="dnacpr" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>DNACPR Decision</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="false">CPR should be attempted</SelectItem>
                        <SelectItem value="true">DNACPR - Do not attempt CPR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reason" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Primary Reason</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="TERMINAL-PROGRESSIVE">Terminal Progressive Illness</SelectItem>
                        <SelectItem value="UNSUCCESSFUL-CPR">Unsuccessful CPR Likely</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="md:col-span-2">
                  <FormField control={form.control} name="dnacprComments" render={({ field }) => (
                    <FormItem><FormLabel>Decision Comments</FormLabel><FormControl><Textarea {...field} placeholder="Details regarding the decision..." rows={2} /></FormControl></FormItem>
                  )} />
                </div>
              </div>
            </div>

            {/* Section 2: Discussion Record */}
            <div className="space-y-8">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">2. Discussion Record</h3>
              </div>

              <div className="space-y-8">
                {/* Resident Discussion */}
                <div className="p-6 bg-muted/20 rounded-xl space-y-4 border">
                  <FormField control={form.control} name="discussedResident" render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-base">Discussed with resident?</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                          <FormControl><SelectTrigger className="w-40"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="discussedResidentDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discussion Date</FormLabel>
                        <Popover open={residentDatePopoverOpen} onOpenChange={setResidentDatePopoverOpen} modal>
                          <PopoverTrigger asChild>
                            <FormControl><Button variant="outline" className="w-full text-left font-normal">{field.value ? format(new Date(field.value), "PPP") : "Pick date"}</Button></FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => { if (d) field.onChange(d.getTime()); setResidentDatePopoverOpen(false); }} /></PopoverContent>
                        </Popover>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="discussedResidentComments" render={({ field }) => (
                      <FormItem><FormLabel>Comments</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>

                {/* Relatives Discussion */}
                <div className="p-6 bg-muted/20 rounded-xl space-y-4 border">
                  <FormField control={form.control} name="discussedRelatives" render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-base">Discussed with relatives?</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                          <FormControl><SelectTrigger className="w-40"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="discussedRelativeDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discussion Date</FormLabel>
                        <Popover open={relativeDatePopoverOpen} onOpenChange={setRelativeDatePopoverOpen} modal>
                          <PopoverTrigger asChild>
                            <FormControl><Button variant="outline" className="w-full text-left font-normal">{field.value ? format(new Date(field.value), "PPP") : "Pick date"}</Button></FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => { if (d) field.onChange(d.getTime()); setRelativeDatePopoverOpen(false); }} /></PopoverContent>
                        </Popover>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="discussedRelativesComments" render={({ field }) => (
                      <FormItem><FormLabel>Comments</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>

                {/* Next of Kin Discussion */}
                <div className="p-6 bg-muted/20 rounded-xl space-y-4 border">
                  <FormField control={form.control} name="discussedNOKs" render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-base">Discussed with next of kin?</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                          <FormControl><SelectTrigger className="w-40"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="discussedNOKsDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discussion Date</FormLabel>
                        <Popover open={nokDatePopoverOpen} onOpenChange={setNokDatePopoverOpen} modal>
                          <PopoverTrigger asChild>
                            <FormControl><Button variant="outline" className="w-full text-left font-normal">{field.value ? format(new Date(field.value), "PPP") : "Pick date"}</Button></FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => { if (d) field.onChange(d.getTime()); setNokDatePopoverOpen(false); }} /></PopoverContent>
                        </Popover>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="discussedNOKsComments" render={({ field }) => (
                      <FormItem><FormLabel>Comments</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>
              </div>

              <FormField control={form.control} name="comments" render={({ field }) => (
                <FormItem><FormLabel>General Discussion Comments</FormLabel><FormControl><Textarea {...field} placeholder="Summary of outcomes and consensus..." rows={3} /></FormControl></FormItem>
              )} />
            </div>

            {/* Section 3: Sign-off */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">3. Final Sign-off</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="gpSignature" render={({ field }) => (
                  <FormItem><FormLabel required>GP Signature</FormLabel><FormControl><Input {...field} placeholder="Full name of GP" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gpDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>GP Signing Date</FormLabel>
                    <Popover open={gpDatePopoverOpen} onOpenChange={setGpDatePopoverOpen} modal>
                      <PopoverTrigger asChild>
                        <FormControl><Button variant="outline" className="w-full text-left font-normal">{field.value ? format(new Date(field.value), "PPP") : "Pick date"}</Button></FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => { if (d) field.onChange(d.getTime()); setGpDatePopoverOpen(false); }} /></PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="residentNokSignature" render={({ field }) => (
                  <FormItem><FormLabel required>Resident / NOK / Proxy Signature</FormLabel><FormControl><Input {...field} placeholder="Full name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="registeredNurseSignature" render={({ field }) => (
                  <FormItem><FormLabel required>Registered Nurse Signature</FormLabel><FormControl><Input {...field} placeholder="Full name" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

          </form>
        </Form>
      </div>

      <div className="border-t pt-8 flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-6 px-6 pb-2">
        <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading} size="lg">Cancel</Button>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} size="lg" className="min-w-[150px]">
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
          ) : (
            isEditMode ? "Save Changes" : "Save Form"
          )}
        </Button>
      </div>
    </div>
  );
}
