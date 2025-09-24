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
import { Calendar, X, Pill } from "lucide-react";

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
  onSubmit: (data: TransferLogFormData) => void;
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

  // Reset form when dialog opens/closes or when transferLog changes
  React.useEffect(() => {
    if (open) {
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

  const handleSubmit = (data: TransferLogFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>
              {isEditMode ? "Edit Transfer Log" : "Add Hospital Transfer"} for {residentName}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the hospital transfer log details."
              : "Record a new hospital transfer with basic details and any file changes."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-1 space-y-6">

              {/* Basic Details */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Transfer Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transfer Date <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
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

              {/* Files Changed */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Files Changed</h3>
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

              {/* Medication Changes */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2 flex items-center space-x-2">
                  <Pill className="w-4 h-4 text-blue-600" />
                  <span>Medication Changes</span>
                </h3>
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
                          <FormLabel className="cursor-pointer text-red-700 font-medium">
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
                          <FormLabel className="cursor-pointer text-orange-700 font-medium">
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
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>

              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {isEditMode ? "Update Transfer Log" : "Add Transfer Log"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}