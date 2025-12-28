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
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

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
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: DependencyDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const submitAssessment = useMutation(
    api.careFiles.dependency.submitDependencyAssessment
  );
  const updateAssessment = useMutation(
    api.careFiles.dependency.updateDependencyAssessment
  );

  const form = useForm<z.infer<typeof DependencyAssessmentSchema>>({
    resolver: zodResolver(DependencyAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          // Use existing data for editing
          dependencyLevel: initialData.dependencyLevel ?? "A",
          completedBy: isEditMode ? userName : (initialData.completedBy ?? userName),
          completedBySignature: isEditMode ? userName : (initialData.completedBySignature ?? userName),
          date: initialData.date ?? Date.now(),
          status: initialData.status ?? "draft"
        }
      : {
          // Default values for new forms
          dependencyLevel: undefined,
          completedBy: userName,
          completedBySignature: userName,
          date: Date.now(),
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
    let isValid = false;

    // Close the date popover when moving between steps
    setDatePopoverOpen(false);

    if (step === 1) {
      const fieldsToValidate = ["dependencyLevel"] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      const fieldsToValidate = [
        "completedBy",
        "completedBySignature",
        "date"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    }

    if (isValid || step === totalSteps) {
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        await handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    // Close the date popover when moving between steps
    setDatePopoverOpen(false);

    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();

        if (isEditMode && initialData) {
          await updateAssessment({
            assessmentId: initialData._id,
            userId,
            dependencyLevel: formData.dependencyLevel,
            completedBy: formData.completedBy,
            completedBySignature: formData.completedBySignature,
            date: formData.date,
            savedAsDraft: false
          });
          toast.success("Dependency assessment updated successfully");
        } else {
          await submitAssessment({
            residentId: residentId as Id<"residents">,
            teamId,
            organizationId,
            userId,
            dependencyLevel: formData.dependencyLevel,
            completedBy: formData.completedBy,
            completedBySignature: formData.completedBySignature,
            date: formData.date,
            savedAsDraft: false
          });
          toast.success("Dependency assessment saved successfully");
        }
        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save dependency assessment");
      }
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 h-20">
            <FormField
              control={form.control}
              name="dependencyLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required className="text-base font-medium">
                    Dependency Level
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        {field.value ? (
                          <span>{getDependencyLevelLabel(field.value)}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            Select dependency level
                          </span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">
                            Level A - High Dependency
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Requires extensive care and supervision
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="B">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">
                            Level B - Medium-High Dependency
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Requires significant care assistance
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="C">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">
                            Level C - Medium Dependency
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Requires moderate care assistance
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="D">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">
                            Level D - Low Dependency
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Requires minimal care assistance
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="completedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Completed By</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter your full name" readOnly disabled className="bg-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="completedBySignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Digital Signature</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Type your full name as digital signature"
                      readOnly
                      disabled
                      className="bg-muted"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Assessment Date</FormLabel>
                  <Popover
                    open={datePopoverOpen}
                    onOpenChange={setDatePopoverOpen}
                    modal
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date.getTime());
                            setDatePopoverOpen(false);
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditMode
            ? "Review Dependency Assessment"
            : step === 1
              ? "Dependency Assessment"
              : step === 2
                ? "Complete Assessment"
                : "Dependency Assessment"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Review and update the dependency assessment details"
            : step === 1
              ? "Determine the appropriate dependency level for this resident based on their care requirements"
              : step === 2
                ? "Complete the assessment by providing your details and signature"
                : "Assess the dependency level of the resident"}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="max-h-[60vh] overflow-y-auto px-1">
            {renderStepContent()}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? onClose : handlePrevious}
              disabled={step === 1 || isLoading}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              type="button"
              onClick={step === totalSteps ? handleSubmit : handleNext}
              disabled={isLoading}
            >
              {isLoading
                ? "Saving..."
                : step === totalSteps
                  ? "Save Assessment"
                  : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
