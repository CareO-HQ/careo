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
import { DependencyAssessmentSchema } from "@/schemas/residents/care-file/dependencySchema";
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
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function DependencyDialog({
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
}: DependencyDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof DependencyAssessmentSchema>>({
    resolver: zodResolver(DependencyAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        dependencyLevel: initialData.dependency_level || initialData.dependencyLevel || "A",
        completedBy: initialData.completedBy || initialData.completed_by || userName,
        completedBySignature: initialData.completedBySignature || initialData.completed_by || userName,
        assessmentDate: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : Date.now(),
        status: initialData.status || "draft"
      }
      : {
        dependencyLevel: undefined,
        completedBy: userName,
        completedBySignature: userName,
        assessmentDate: Date.now(),
        status: "draft"
      }
  });

  const getDependencyLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      A: "Level A - High Dependency",
      B: "Level B - Medium-High Dependency",
      C: "Level C - Medium Dependency",
      D: "Level D - Low Dependency"
    };
    return labels[level] || "Select dependency level";
  };

  const onSubmit = async (values: z.infer<typeof DependencyAssessmentSchema>) => {
    startTransition(async () => {
      try {
        if (!userId) throw new Error("User not authenticated");

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          dependency_level: values.dependencyLevel,
          assessment_date: new Date(values.assessmentDate).toISOString().split('T')[0],
          completed_by: values.completedBy,
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
            form_type: 'dependency_assessments',
            form_id: initialData.id,
            resident_id: residentId,
            audited_by: userId,
            audit_notes: "Form reviewed",
            organization_id: organizationId
          });
          toast.success("Dependency assessment updated");
        } else {
          toast.success("Dependency assessment saved");
        }
        onClose?.();
      } catch (error: any) {
        console.error("Error submitting:", error);
        toast.error(error.message || "Failed to save dependency assessment");
      }
    });
  };

  return (
    <div className="flex flex-col space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Dependency Assessment</DialogTitle>
          <DialogDescription>
            Determine the appropriate dependency level for the resident.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="space-y-12 pb-20">
        <Form {...form}>
          <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              <button type="submit" id="care-file-submit-btn" className="hidden" />
              {/* Section 1: Assessment */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Dependency Determination</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <FormField control={form.control} name="dependencyLevel" render={({ field }) => (
                    <FormItem>
                      <FormLabel required className="text-base font-medium">Select Dependency Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-20 w-full text-left">
                            <SelectValue placeholder="Select a dependency level..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A" className="py-4">
                            <div className="flex flex-col">
                              <span className="font-bold">Level A - High Dependency</span>
                              <span className="text-sm text-muted-foreground">Requires extensive care, constant supervision, and specialized assistance.</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="B" className="py-4">
                            <div className="flex flex-col">
                              <span className="font-bold">Level B - Medium-High Dependency</span>
                              <span className="text-sm text-muted-foreground">Requires significant care assistance with most daily living tasks.</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="C" className="py-4">
                            <div className="flex flex-col">
                              <span className="font-bold">Level C - Medium Dependency</span>
                              <span className="text-sm text-muted-foreground">Requires moderate assistance or supervision for some daily activities.</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="D" className="py-4">
                            <div className="flex flex-col">
                              <span className="font-bold">Level D - Low Dependency</span>
                              <span className="text-sm text-muted-foreground">Requires minimal assistance; mostly independent with some support.</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Section 2: Completion Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Sign-off & Date</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="completedBy" render={({ field }) => (
                    <FormItem><FormLabel>Completed By</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="completedBySignature" render={({ field }) => (
                    <FormItem><FormLabel>Digital Signature</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                    <FormItem className="flex flex-col md:col-span-2">
                      <FormLabel required>Assessment Date</FormLabel>
                      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(new Date(field.value), "PPP") : <span>Pick date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDatePopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
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
