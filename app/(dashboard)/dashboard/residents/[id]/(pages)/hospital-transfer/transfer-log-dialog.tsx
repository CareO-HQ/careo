"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, X, Pill, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Form validation schema
const TransferLogSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hospitalName: z.string().min(1, "Hospital name is required"),
  reason: z.string().min(1, "Reason for transfer is required"),
  outcome: z.string().optional(),
  followUp: z.string().optional(),
  filesChanged: z.object({
    carePlan: z.boolean(),
    riskAssessment: z.boolean(),
    other: z.string().optional(),
  }).optional(),
  medicationChanges: z.object({
    medicationsAdded: z.boolean(),
    addedMedications: z.string().optional(),
    medicationsRemoved: z.boolean(),
    removedMedications: z.string().optional(),
    medicationsModified: z.boolean(),
    modifiedMedications: z.string().optional(),
  }).optional(),
});

type TransferLogFormData = z.infer<typeof TransferLogSchema>;

interface TransferLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TransferLogFormData) => Promise<void> | void;
  residentName: string;
  transferLog?: any; // For editing existing transfer logs
  isEditMode?: boolean;
}

export function TransferLogDialog({
  open,
  onOpenChange,
  onSubmit,
  residentName,
  transferLog,
  isEditMode = false,
}: TransferLogDialogProps) {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Step state management
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const totalSteps = 3;

  const form = useForm<TransferLogFormData>({
    resolver: zodResolver(TransferLogSchema),
    defaultValues: {
      date: today,
      hospitalName: "",
      reason: "",
      outcome: "",
      followUp: "",
      filesChanged: {
        carePlan: false,
        riskAssessment: false,
        other: "",
      },
      medicationChanges: {
        medicationsAdded: false,
        addedMedications: "",
        medicationsRemoved: false,
        removedMedications: "",
        medicationsModified: false,
        modifiedMedications: "",
      },
    },
  });

  // Reset form and step when dialog opens/closes or when transferLog changes
  React.useEffect(() => {
    if (open) {
      setCurrentStep(1); // Always reset to first step when dialog opens
      if (isEditMode && transferLog) {
        form.reset({
          date: transferLog.date || today,
          hospitalName: transferLog.hospitalName || "",
          reason: transferLog.reason || "",
          outcome: transferLog.outcome || "",
          followUp: transferLog.followUp || "",
          filesChanged: {
            carePlan: transferLog.filesChanged?.carePlan || false,
            riskAssessment: transferLog.filesChanged?.riskAssessment || false,
            other: transferLog.filesChanged?.other || "",
          },
          medicationChanges: {
            medicationsAdded: transferLog.medicationChanges?.medicationsAdded || false,
            addedMedications: transferLog.medicationChanges?.addedMedications || "",
            medicationsRemoved: transferLog.medicationChanges?.medicationsRemoved || false,
            removedMedications: transferLog.medicationChanges?.removedMedications || "",
            medicationsModified: transferLog.medicationChanges?.medicationsModified || false,
            modifiedMedications: transferLog.medicationChanges?.modifiedMedications || "",
          },
        });
      } else {
        form.reset({
          date: today,
          hospitalName: "",
          reason: "",
          outcome: "",
          followUp: "",
          filesChanged: {
            carePlan: false,
            riskAssessment: false,
            other: "",
          },
          medicationChanges: {
            medicationsAdded: false,
            addedMedications: "",
            medicationsRemoved: false,
            removedMedications: "",
            medicationsModified: false,
            modifiedMedications: "",
          },
        });
      }
    }
  }, [open, isEditMode, transferLog, form, today]);

  const handleSubmit = async (data: TransferLogFormData) => {
    setIsSubmitting(true);
    try {
      const result = await onSubmit(data);
      // The parent component will close the dialog on success
    } catch (error) {
      console.error('Form submission failed:', error);
      // Stay on current step if submission fails
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step validation
  const validateCurrentStep = async () => {
    let fieldsToValidate: (keyof TransferLogFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = [
          'date',
          'hospitalName',
          'reason',
        ];
        break;
      case 2:
        // Files changed step - no required validation
        return true;
      case 3:
        // Medication changes step - no required validation
        return true;
      default:
        return true;
    }

    if (fieldsToValidate.length === 0) {
      return true;
    }

    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const handleNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      nextStep();
    } else {
    }
  };

  // Get step title and description
  const getStepInfo = () => {
    switch (currentStep) {
      case 1:
        return {
          title: "Transfer Details",
          description: "Basic information about the hospital transfer",
          icon: Calendar
        };
      case 2:
        return {
          title: "Files Changed",
          description: "Document updates resulting from the transfer",
          icon: FileText
        };
      case 3:
        return {
          title: "Medication Changes",
          description: "Any medication adjustments during transfer",
          icon: Pill
        };
      default:
        return {
          title: "Transfer Details",
          description: "Basic information about the hospital transfer",
          icon: Calendar
        };
    }
  };

  const stepInfo = getStepInfo();
  const StepIcon = stepInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
          
            <span>
              {isEditMode ? "Edit Transfer Log" : "Add Hospital Transfer"} - {stepInfo.title}
            </span>
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div>{stepInfo.description} for {residentName}</div>

          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-1">

              {/* Step 1: Transfer Details */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Transfer Date <span className="text-red-500">*</span></FormLabel>
                            <Popover modal>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    type="button"
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
                                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      field.onChange(format(date, "yyyy-MM-dd"));
                                    }
                                  }}
                                  disabled={(date) => {
                                    const today = new Date();
                                    today.setHours(23, 59, 59, 999);
                                    return date > today;
                                  }}
                                  captionLayout="dropdown"
                                  defaultMonth={field.value ? new Date(field.value) : new Date()}
                                  startMonth={new Date(new Date().getFullYear() - 1, 0)}
                                  endMonth={new Date()}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hospitalName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hospital Name <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Royal London Hospital" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Transfer <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="e.g., Emergency admission due to chest pain"
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="outcome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Outcome</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="e.g., Discharged after treatment"
                              className="min-h-[80px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="followUp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow Up Required</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="e.g., GP follow-up in 1 week"
                              className="min-h-[80px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Files Changed */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Indicate if any care documents were updated as a result of this transfer.
                  </p>

                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="filesChanged.carePlan"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer">
                            Care Plan updated
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="filesChanged.riskAssessment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer">
                            Risk Assessment updated
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="filesChanged.other"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other files changed</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Medication record, Dietary requirements"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Medication Changes */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Record any medication changes that occurred during or after the hospital transfer.
                  </p>

                  <div className="space-y-4">
                    {/* Medications Added */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="medicationChanges.medicationsAdded"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer text-green-700 font-medium">
                              Medications Added
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="medicationChanges.addedMedications"
                        render={({ field }) => (
                          <FormItem className={`ml-6 ${!form.watch('medicationChanges.medicationsAdded') ? 'opacity-50' : ''}`}>
                            <FormLabel>Medications Added (list names and dosages)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="e.g., Metformin 500mg twice daily, Lisinopril 10mg once daily"
                                className="min-h-[60px]"
                                disabled={!form.watch('medicationChanges.medicationsAdded')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Medications Removed */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="medicationChanges.medicationsRemoved"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer  font-medium">
                              Medications Removed/Discontinued
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="medicationChanges.removedMedications"
                        render={({ field }) => (
                          <FormItem className={`ml-6 ${!form.watch('medicationChanges.medicationsRemoved') ? 'opacity-50' : ''}`}>
                            <FormLabel>Medications Removed (list names and reasons)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="e.g., Warfarin discontinued due to bleeding risk, Aspirin stopped per hospital recommendation"
                                className="min-h-[60px]"
                                disabled={!form.watch('medicationChanges.medicationsRemoved')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Medications Modified */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="medicationChanges.medicationsModified"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer  font-medium">
                              Medications Modified (dosage/frequency changes)
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="medicationChanges.modifiedMedications"
                        render={({ field }) => (
                          <FormItem className={`ml-6 ${!form.watch('medicationChanges.medicationsModified') ? 'opacity-50' : ''}`}>
                            <FormLabel>Medications Modified (list changes)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="e.g., Furosemide increased from 20mg to 40mg daily, Insulin units adjusted per hospital protocol"
                                className="min-h-[60px]"
                                disabled={!form.watch('medicationChanges.medicationsModified')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t mt-6">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>

                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex space-x-2">
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className=""
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      form.handleSubmit(handleSubmit)();
                    }}
                    disabled={isSubmitting}
                    className=""
                  >
                    {isSubmitting ? "Saving..." : (isEditMode ? "Update Transfer Log" : "Add Transfer Log")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}