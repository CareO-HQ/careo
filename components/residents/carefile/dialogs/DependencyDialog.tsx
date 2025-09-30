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
  SelectTrigger,
  SelectValue
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
  resident,
  onClose,
  initialData,
  isEditMode = false
}: DependencyDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();

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
          completedBy: initialData.completedBy ?? "",
          completedBySignature: initialData.completedBySignature ?? "",
          date: initialData.date ?? Date.now(),
          status: initialData.status ?? "draft"
        }
      : {
          // Default values for new forms
          dependencyLevel: "A",
          completedBy: "",
          completedBySignature: "",
          date: Date.now(),
          status: "draft"
        }
  });

  const totalSteps = 2;

  const handleNext = async () => {
    let isValid = false;

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

  const getDependencyLevelDescription = (level: string) => {
    switch (level) {
      case "A":
        return "High dependency - Requires extensive care and supervision";
      case "B":
        return "Medium-high dependency - Requires significant care assistance";
      case "C":
        return "Medium dependency - Requires moderate care assistance";
      case "D":
        return "Low dependency - Requires minimal care assistance";
      default:
        return "";
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Please select the appropriate dependency level for{" "}
                <span className="font-medium">
                  {resident.firstName} {resident.lastName}
                </span>
              </div>

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
                          <SelectValue placeholder="Select dependency level" />
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
                    {field.value && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">
                            Level {field.value}:
                          </span>{" "}
                          {getDependencyLevelDescription(field.value)}
                        </p>
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Please complete the assessment details and provide your signature.
            </div>

            <FormField
              control={form.control}
              name="completedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Completed By</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter your full name" />
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
                  <Popover>
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
                        onSelect={(date) => field.onChange(date?.getTime())}
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

            {/* Summary of selected dependency level */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h4 className="font-medium text-sm mb-2">Assessment Summary</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Resident:</span>{" "}
                  <span className="font-medium">
                    {resident.firstName} {resident.lastName}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Room:</span>{" "}
                  <span className="font-medium">{resident.roomNumber}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Dependency Level:
                  </span>{" "}
                  <span className="font-medium">
                    Level {form.watch("dependencyLevel")}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getDependencyLevelDescription(form.watch("dependencyLevel"))}
                </p>
              </div>
            </div>
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
