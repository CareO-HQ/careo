"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
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
import { Calendar, X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TransferLogInlineFormProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => Promise<void> | void;
  residentName: string;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  handleNextStep: () => void;
  prevStep: () => void;
  isEditMode?: boolean;
  onCancel: () => void;
}

export function TransferLogInlineForm({
  form,
  onSubmit,
  residentName,
  currentStep,
  setCurrentStep,
  handleNextStep,
  prevStep,
  isEditMode = false,
  onCancel,
}: TransferLogInlineFormProps) {
  const handleFormSubmit = async (data: any) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Transfer Details Section */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Transfer Details</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Enter information about the hospital transfer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Transfer Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="hospitalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hospital Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Royal London Hospital" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Transfer *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the reason for hospital transfer..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="outcome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Outcome</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the outcome of the transfer..."
                    className="min-h-[120px]"
                    {...field}
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
                <FormLabel>Follow-up Actions</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any follow-up actions required..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Files Changed */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">Files Changed</h4>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="filesChanged.carePlan"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Care Plan Updated
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="filesChanged.riskAssessment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Risk Assessment Updated
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="filesChanged.other"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Files Changed</FormLabel>
                    <FormControl>
                      <Input placeholder="List other files..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Medication Changes */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">Medication Changes</h4>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="medicationChanges.medicationsAdded"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Medications Added
                    </FormLabel>
                  </FormItem>
                )}
              />

              {form.watch("medicationChanges.medicationsAdded") && (
                <FormField
                  control={form.control}
                  name="medicationChanges.addedMedications"
                  render={({ field }) => (
                    <FormItem className="ml-6">
                      <FormControl>
                        <Textarea
                          placeholder="List added medications..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="medicationChanges.medicationsRemoved"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Medications Removed
                    </FormLabel>
                  </FormItem>
                )}
              />

              {form.watch("medicationChanges.medicationsRemoved") && (
                <FormField
                  control={form.control}
                  name="medicationChanges.removedMedications"
                  render={({ field }) => (
                    <FormItem className="ml-6">
                      <FormControl>
                        <Textarea
                          placeholder="List removed medications..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="medicationChanges.medicationsModified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Medications Modified
                    </FormLabel>
                  </FormItem>
                )}
              />

              {form.watch("medicationChanges.medicationsModified") && (
                <FormField
                  control={form.control}
                  name="medicationChanges.modifiedMedications"
                  render={({ field }) => (
                    <FormItem className="ml-6">
                      <FormControl>
                        <Textarea
                          placeholder="List modified medications..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <Button type="submit">
            <Save className="w-4 h-4 mr-2" />
            {isEditMode ? "Update Transfer Log" : "Save Transfer Log"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
