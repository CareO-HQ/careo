"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
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
import { CalendarIcon, Pen, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
// import { api } from "../../../../convex/_generated/api";
// import { Id } from "../../../../convex/_generated/dataModel";
// import { useMutation } from "convex/react";
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
  onClose
}: CarePlanDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<number>(1);
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
        // Flattened Supabase data mapping back to form might be needed here if initialData comes from DB
        // For now assuming initialData acts as 'values' directly
        residentId: residentId as any,
        userId,
        nameOfCarePlan: initialData.care_plan_type || initialData.nameOfCarePlan || "",
        residentName:
          initialData.residentName ||
          `${resident.firstName} ${resident.lastName}`,
        dob:
          typeof initialData.dob === "number"
            ? initialData.dob
            : typeof resident.dateOfBirth === "number"
              ? resident.dateOfBirth
              : resident.dateOfBirth
                ? new Date(resident.dateOfBirth).getTime()
                : Date.now(),
        bedroomNumber: initialData.bedroomNumber || resident.roomNumber || "",
        writtenBy: isEditMode ? userName : initialData.writtenBy || userName,
        dateWritten: initialData.dateWritten || Date.now(),
        carePlanNumber: initialData.carePlanNumber || "",
        identifiedNeeds: initialData.need_identified || initialData.identifiedNeeds || "",
        aims: initialData.goals?.aims || initialData.aims || "",
        plannedCareDate: initialData.interventions || initialData.plannedCareDate || [
          {
            date: Date.now(),
            time: "",
            details: "",
            signature: userName
          }
        ],
        discussedWith: initialData.goals?.discussedWith || initialData.discussedWith || "",
        signature: initialData.goals?.signature || initialData.signature || userName,
        date: initialData.date || Date.now(),
        staffSignature: initialData.goals?.staffSignature || initialData.staffSignature || userName
      }
      : {
        residentId: residentId as any,
        userId,
        nameOfCarePlan: "",
        residentName: resident
          ? `${resident.firstName} ${resident.lastName}`
          : "",
        dob: resident
          ? typeof resident.dateOfBirth === "number"
            ? resident.dateOfBirth
            : resident.dateOfBirth
              ? new Date(resident.dateOfBirth).getTime()
              : Date.now()
          : Date.now(),
        bedroomNumber: resident?.roomNumber || "",
        writtenBy: userName,
        dateWritten: Date.now(),
        carePlanNumber: "",
        identifiedNeeds: "",
        aims: "",
        plannedCareDate: [
          {
            date: Date.now(),
            time: "",
            details: "",
            signature: userName
          }
        ],
        discussedWith: "",
        signature: userName,
        date: Date.now(),
        staffSignature: userName
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
            discussedWith: values.discussedWith,
            signature: values.signature,
            staffSignature: values.staffSignature,
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
          // Audit fields ? 
        };

        if (isEditMode && initialData?.id) {
          // Update
          const { error } = await supabase
            .from('care_plan_assessments')
            .update(payload)
            .eq('id', initialData.id);

          if (error) throw error;
          toast.success("Care plan assessment updated successfully");

        } else {
          // Insert
          const { error } = await supabase
            .from('care_plan_assessments')
            .insert(payload);

          if (error) throw error;
          toast.success("Care plan assessment submitted successfully");
        }

        // Reset form and close modal
        setStep(1);
        if (onClose) {
          onClose();
        } else {
          setIsOpen(false);
          form.reset();
        }
      } catch (error) {
        console.error("Error submitting care plan assessment:", error);
        toast.error("Failed to submit care plan assessment");
      }
    });
  };

  const handleNextStep = async () => {
    let isValid = false;

    // Close all date popovers
    setDobPopoverOpen(false);
    setDateWrittenPopoverOpen(false);
    setReviewDatePopoverOpen(false);
    setPlannedCareDatePopovers({});

    if (step === 1) {
      const fieldsToValidate = [
        "nameOfCarePlan",
        "residentName",
        "dob",
        "bedroomNumber",
        "writtenBy",
        "dateWritten",
        "carePlanNumber"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      const fieldsToValidate = ["identifiedNeeds", "aims"] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 3) {
      const plannedCareEntries = form.getValues("plannedCareDate");
      if (plannedCareEntries.length === 0) {
        toast.error("Please add at least one planned care entry");
        isValid = false;
      } else {
        isValid = await form.trigger("plannedCareDate");
      }
    } else if (step === 4) {
      const fieldsToValidate = ["date"] as const;
      isValid = await form.trigger(fieldsToValidate);
    }

    if (isValid) {
      if (step === 4) {
        form.handleSubmit(onSubmit)();
      } else {
        setStep(step + 1);
      }
    } else {
      toast.error("Please fill in all required fields correctly");
      console.log("Form Errors:", form.formState.errors);
    }
  };

  const handlePreviousStep = () => {
    setDobPopoverOpen(false);
    setDateWrittenPopoverOpen(false);
    setReviewDatePopoverOpen(false);
    setPlannedCareDatePopovers({});

    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleClose = () => {
    setStep(1);
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
    form.reset();
  };

  // Render content logic unchanged (boilerplate)
  // ... (Keeping the render logic same as before but wrapping in Dialog if not isEditMode)

  const content = (
    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
      <Form {...form}>
        {/* Step 1 */}
        <div className={step === 1 ? "block space-y-4" : "hidden"}>
          <DialogHeader>
            <DialogTitle>Basic Information</DialogTitle>
            <DialogDescription>Enter basic resident and care plan info.</DialogDescription>
          </DialogHeader>

          <FormField control={form.control} name="nameOfCarePlan" render={({ field }) => (
            <FormItem><FormLabel>Name of Care Plan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="residentName" render={({ field }) => (
              <FormItem><FormLabel>Resident Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="dob" render={({ field }) => (
              <FormItem><FormLabel>Date of Birth</FormLabel>
                <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen} modal>
                  <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDobPopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} /></PopoverContent>
                </Popover>
                <FormMessage /></FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="bedroomNumber" render={({ field }) => (
              <FormItem><FormLabel>Bedroom Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="carePlanNumber" render={({ field }) => (
              <FormItem><FormLabel>Care Plan Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="writtenBy" render={({ field }) => (
              <FormItem><FormLabel>Written By</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="dateWritten" render={({ field }) => (
              <FormItem><FormLabel>Date Written</FormLabel>
                <Popover open={dateWrittenPopoverOpen} onOpenChange={setDateWrittenPopoverOpen} modal>
                  <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDateWrittenPopoverOpen(false); } }} disabled={(date) => date < new Date("1900-01-01")} /></PopoverContent>
                </Popover>
                <FormMessage /></FormItem>
            )} />
          </div>
        </div>

        {/* Step 2 */}
        <div className={step === 2 ? "block space-y-4" : "hidden"}>
          <DialogHeader><DialogTitle>Care Details</DialogTitle><DialogDescription>Needs and aims.</DialogDescription></DialogHeader>
          <FormField control={form.control} name="identifiedNeeds" render={({ field }) => (
            <FormItem><FormLabel>Identified Needs</FormLabel><FormControl><Textarea className="min-h-[120px]" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="aims" render={({ field }) => (
            <FormItem><FormLabel>Aims</FormLabel><FormControl><Textarea className="min-h-[120px]" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        {/* Step 3 */}
        <div className={step === 3 ? "block space-y-4" : "hidden"}>
          <DialogHeader><DialogTitle>Planned Care</DialogTitle><DialogDescription>Add care activities.</DialogDescription></DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center"><h4 className="font-medium">Entry {index + 1}</h4>{fields.length > 1 && <Button type="button" variant="outline" size="sm" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name={`plannedCareDate.${index}.date`} render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><Popover open={plannedCareDatePopovers[index] || false} onOpenChange={(open) => setPlannedCareDatePopovers(prev => ({ ...prev, [index]: open }))} modal><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(date.getTime()); setPlannedCareDatePopovers(prev => ({ ...prev, [index]: false })); } }} /></PopoverContent></Popover><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`plannedCareDate.${index}.time`} render={({ field }) => (
                      <FormItem><FormLabel>Time</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Time" /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name={`plannedCareDate.${index}.details`} render={({ field }) => (
                    <FormItem><FormLabel>Details</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`plannedCareDate.${index}.signature`} render={({ field }) => (
                    <FormItem><FormLabel>Signature</FormLabel><FormControl><Input readOnly className="bg-muted" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => append({ date: Date.now(), time: "", details: "", signature: userName })} className="w-full"><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>
            </div>
          </ScrollArea>
        </div>

        {/* Step 4 */}
        <div className={step === 4 ? "block space-y-4" : "hidden"}>
          <DialogHeader><DialogTitle>Review & Signatures</DialogTitle><DialogDescription>Review and sign.</DialogDescription></DialogHeader>
          <FormField control={form.control} name="discussedWith" render={({ field }) => (
            <FormItem><FormLabel>Discussed With</FormLabel><FormControl><Input placeholder="Patient/Rep Name" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="signature" render={({ field }) => (
            <FormItem><FormLabel>Signature</FormLabel><FormControl><Input readOnly className="bg-muted" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem><FormLabel>Review Date</FormLabel><Popover open={reviewDatePopoverOpen} onOpenChange={setReviewDatePopoverOpen} modal><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { if (date) { field.onChange(date.getTime()); setReviewDatePopoverOpen(false); } }} /></PopoverContent></Popover><FormMessage /></FormItem>
          )} />
        </div>

      </Form>
    </div>
  );

  const footer = (
    <DialogFooter className="mt-4">
      {step > 1 && (
        <Button type="button" variant="outline" onClick={handlePreviousStep} disabled={isLoading}>Back</Button>
      )}
      <Button type="button" onClick={handleNextStep} disabled={isLoading}>
        {step === 4 ? (isLoading ? "Submitting..." : (isEditMode ? "Save Changes" : "Submit")) : "Next"}
      </Button>
    </DialogFooter>
  );

  if (isEditMode) {
    // In Edit Mode, we assume we are inside a larger container or just render content + footer
    return (
      <div className="w-full">
        {content}
        {footer}
      </div>
    );
  }

  // Standalone Dialog Mode
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> Create Care Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        {content}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
