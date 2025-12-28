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
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

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
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  careHomeName = "",
  onClose,
  initialData,
  isEditMode = false
}: PainAssessmentDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [assessmentDatePopoverOpen, setAssessmentDatePopoverOpen] = useState(false);
  const [dateOfBirthPopoverOpen, setDateOfBirthPopoverOpen] = useState(false);

  const submitAssessment = useMutation(
    api.careFiles.painAssessment.submitPainAssessment
  );
  const submitReviewedFormMutation = useMutation(
    api.managerAudits.submitReviewedForm
  );

  const form = useForm<z.infer<typeof painAssessmentSchema>>({
    resolver: zodResolver(painAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          residentId,
          teamId,
          organizationId,
          userId,
          residentName: initialData.residentName || `${resident.firstName} ${resident.lastName}`,
          dateOfBirth: initialData.dateOfBirth || format(new Date(resident.dateOfBirth), "dd/MM/yyyy"),
          roomNumber: initialData.roomNumber || resident.roomNumber || "",
          nameOfHome: initialData.nameOfHome || careHomeName || "",
          assessmentDate: initialData.assessmentDate || Date.now(),
          assessmentEntries: initialData.assessmentEntries || []
        }
      : {
          residentId,
          teamId,
          organizationId,
          userId,
          residentName: `${resident.firstName} ${resident.lastName}`,
          dateOfBirth: format(new Date(resident.dateOfBirth), "dd/MM/yyyy"),
          roomNumber: resident.roomNumber || "",
          nameOfHome: careHomeName || "",
          assessmentDate: Date.now(),
          assessmentEntries: [
            {
              dateTime: format(new Date(), "dd/MM/yyyy HH:mm"),
              painLocation: "",
              descriptionOfPain: "",
              residentBehaviour: "",
              interventionType: "",
              interventionTime: "",
              painAfterIntervention: "",
              comments: "",
              signature: userName
            }
          ]
        }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "assessmentEntries"
  });

  function onSubmit(values: z.infer<typeof painAssessmentSchema>) {
    console.log("Form submission triggered - values:", values);
    startTransition(async () => {
      try {
        if (isEditMode) {
          const data = await submitReviewedFormMutation({
            formType: "painAssessment",
            formData: {
              ...values,
              residentId: residentId as Id<"residents">,
              savedAsDraft: false
            },
            originalFormData: initialData,
            originalFormId: initialData?._id,
            residentId: residentId as Id<"residents">,
            auditedBy: userName,
            auditNotes: "Form reviewed and updated",
            teamId,
            organizationId
          });
          if (data.hasChanges) {
            toast.success("Form reviewed and updated successfully!");
          } else {
            toast.success("Form reviewed and approved without changes!");
          }
        } else {
          await submitAssessment({
            ...values,
            residentId: residentId as Id<"residents">,
            savedAsDraft: false
          });
          toast.success("Pain assessment submitted successfully");
        }
        setTimeout(() => {
          onClose?.();
        }, 500);
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment. Please try again.");
      }
    });
  }

  const addAssessmentEntry = () => {
    append({
      dateTime: format(new Date(), "dd/MM/yyyy HH:mm"),
      painLocation: "",
      descriptionOfPain: "",
      residentBehaviour: "",
      interventionType: "",
      interventionTime: "",
      painAfterIntervention: "",
      comments: "",
      signature: userName
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Pain Assessment and Evaluation</DialogTitle>
        <DialogDescription>
          Record pain assessments and interventions for the resident
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[70vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Information */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">Header Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nameOfHome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Name of Home</FormLabel>
                      <FormControl>
                        <Input placeholder="Care Home Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="residentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Resident's Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Date of Birth</FormLabel>
                      <FormControl>
                        <Input placeholder="DD/MM/YYYY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roomNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Room Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Room 101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="assessmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Assessment Date</FormLabel>
                    <Popover modal open={assessmentDatePopoverOpen} onOpenChange={setAssessmentDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
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
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                        onInteractOutside={(e) => e.preventDefault()}
                      >
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) => {
                            field.onChange(date?.getTime());
                            setAssessmentDatePopoverOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Assessment Entries Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">Pain Assessment Entries</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAssessmentEntry}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Entry
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 border rounded-lg space-y-4 bg-background"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Entry {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`assessmentEntries.${index}.dateTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Date and Time</FormLabel>
                          <FormControl>
                            <Input placeholder="DD/MM/YYYY HH:MM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`assessmentEntries.${index}.painLocation`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Pain Location (A, B, etc)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., A - Lower back, B - Right knee" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`assessmentEntries.${index}.descriptionOfPain`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Description of Pain</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the pain (e.g., sharp, dull, throbbing)"
                            {...field}
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`assessmentEntries.${index}.residentBehaviour`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Resident Behaviour</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., restless, calm, sleepy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`assessmentEntries.${index}.interventionType`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Type of Intervention</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., medication, repositioning" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`assessmentEntries.${index}.interventionTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Time</FormLabel>
                          <FormControl>
                            <Input placeholder="HH:MM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`assessmentEntries.${index}.painAfterIntervention`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Pain Description After Intervention</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe pain level/status after intervention"
                            {...field}
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`assessmentEntries.${index}.comments`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comments</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., 'give painkillers at 1400hrs, after 20 mins, Mrs Smith appeared settled/stated she felt better'"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`assessmentEntries.${index}.signature`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Signature</FormLabel>
                        <FormControl>
                          <Input placeholder="Staff signature" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
          </form>
        </Form>
      </div>
      <DialogFooter>
        <Button onClick={onClose} variant="outline" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Saving..." : "Save Assessment"}
        </Button>
      </DialogFooter>
    </>
  );
}
