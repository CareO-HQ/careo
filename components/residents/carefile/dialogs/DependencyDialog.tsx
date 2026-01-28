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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from "@/components/ui/select";
import { DependencyAssessmentSchema } from "@/schemas/residents/care-file/dependencySchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface DependencyDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function DependencyDialog({
  teamId, residentId, organizationId, userId, userName, resident,
  onClose, initialData, isEditMode = false
}: DependencyDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof DependencyAssessmentSchema>>({
    resolver: zodResolver(DependencyAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData ? {
      dependencyLevel: initialData.dependency_level || initialData.dependencyLevel || "A",
      completedBy: initialData.completedBy || initialData.completed_by || userName,
      completedBySignature: initialData.completedBySignature || initialData.completed_by || userName,
      assessmentDate: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : Date.now(),
      status: initialData.status || "draft"
    } : {
      dependencyLevel: undefined,
      completedBy: userName,
      completedBySignature: userName,
      assessmentDate: Date.now(),
      status: "draft"
    }
  });

  const totalSteps = 2;

  const getDependencyLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      A: "Level A - High Dependency",
      B: "Level B - Medium-High Dependency",
      C: "Level C - Medium Dependency",
      D: "Level D - Low Dependency"
    };
    return labels[level] || "Select dependency level";
  };

  const handleNext = async () => {
    setDatePopoverOpen(false);
    let isValid = step === 1 ? await form.trigger(["dependencyLevel"]) : await form.trigger(["completedBy", "completedBySignature", "assessmentDate"]);
    if (isValid || step === totalSteps) {
      if (step < totalSteps) setStep(step + 1);
      else await handleSubmit();
    }
  };

  const handlePrevious = () => { setDatePopoverOpen(false); if (step > 1) setStep(step - 1); };

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();
        if (!userId) throw new Error("User not authenticated");

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          dependency_level: formData.dependencyLevel,
          assessment_date: new Date(formData.assessmentDate).toISOString().split('T')[0],
          completed_by: formData.completedBy,
          created_by: userId
        };

        await submitAssessmentWithVersioning(
          'dependency_assessments',
          payload,
          initialData,
          isEditMode
        );

        if (isEditMode && initialData?.id) {
          await supabase.from('manager_audits').insert({
            form_type: 'dependency_assessments', form_id: initialData.id, resident_id: residentId,
            audited_by: userId, audit_notes: "Form reviewed", organization_id: organizationId
          });
          toast.success("Dependency assessment updated");
        } else {
          toast.success("Dependency assessment saved");
        }
        onClose?.();
      } catch (error) {
        console.error("Error submitting:", error);
        toast.error("Failed to save dependency assessment");
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditMode ? "Review Dependency Assessment" : step === 1 ? "Dependency Assessment" : "Complete Assessment"}</DialogTitle>
        <DialogDescription>{isEditMode ? "Review and update the dependency assessment details" : step === 1 ? "Determine the appropriate dependency level for this resident" : "Complete the assessment by providing your details"}</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="max-h-[60vh] overflow-y-auto px-1">
            {step === 1 && (
              <div className="space-y-6 h-20">
                <FormField control={form.control} name="dependencyLevel" render={({ field }) => (
                  <FormItem>
                    <FormLabel required className="text-base font-medium">Dependency Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">{field.value ? <span>{getDependencyLevelLabel(field.value)}</span> : <span className="text-muted-foreground">Select dependency level</span>}</SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A"><div className="flex flex-col"><span className="font-medium">Level A - High Dependency</span><span className="text-sm text-muted-foreground">Requires extensive care and supervision</span></div></SelectItem>
                        <SelectItem value="B"><div className="flex flex-col"><span className="font-medium">Level B - Medium-High Dependency</span><span className="text-sm text-muted-foreground">Requires significant care assistance</span></div></SelectItem>
                        <SelectItem value="C"><div className="flex flex-col"><span className="font-medium">Level C - Medium Dependency</span><span className="text-sm text-muted-foreground">Requires moderate care assistance</span></div></SelectItem>
                        <SelectItem value="D"><div className="flex flex-col"><span className="font-medium">Level D - Low Dependency</span><span className="text-sm text-muted-foreground">Requires minimal care assistance</span></div></SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <FormField control={form.control} name="completedBy" render={({ field }) => (<FormItem><FormLabel required>Completed By</FormLabel><FormControl><Input {...field} readOnly disabled className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="completedBySignature" render={({ field }) => (<FormItem><FormLabel required>Digital Signature</FormLabel><FormControl><Input {...field} readOnly disabled className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                  <FormItem><FormLabel required>Assessment Date</FormLabel>
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal>
                      <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDatePopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} /></PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={step === 1 ? onClose : handlePrevious} disabled={step === 1 || isLoading}>{step === 1 ? "Cancel" : "Back"}</Button>
            <Button type="button" onClick={step === totalSteps ? handleSubmit : handleNext} disabled={isLoading}>{isLoading ? "Saving..." : step === totalSteps ? "Save Assessment" : "Next"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
