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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { carePlanAssessmentSchema } from "@/schemas/residents/care-file/carePlanSchema";
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
  onClose?: () => void; // For review mode only
}

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

  const submitAssessment = useMutation(
    api.careFiles.carePlan.submitCarePlanAssessment
  );
  const submitReviewedFormMutation = useMutation(
    api.managerAudits.submitReviewedForm
  );

  const form = useForm<z.infer<typeof carePlanAssessmentSchema>>({
    resolver: zodResolver(carePlanAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          residentId: residentId as Id<"residents">,
          userId,
          nameOfCarePlan: initialData.nameOfCarePlan || "",
          residentName:
            initialData.residentName ||
            `${resident.firstName} ${resident.lastName}`,
          dob: initialData.dob || new Date(resident.dateOfBirth).getTime(),
          bedroomNumber: initialData.bedroomNumber || resident.roomNumber || "",
          writtenBy: isEditMode ? userName : initialData.writtenBy || userName,
          dateWritten: initialData.dateWritten || Date.now(),
          carePlanNumber: initialData.carePlanNumber || "",
          identifiedNeeds: initialData.identifiedNeeds || "",
          aims: initialData.aims || "",
          plannedCareDate: initialData.plannedCareDate || [
            {
              date: Date.now(),
              time: "",
              details: "",
              signature: ""
            }
          ],
          discussedWith: initialData.discussedWith || "",
          signature: initialData.signature || "",
          date: initialData.date || Date.now(),
          staffSignature: initialData.staffSignature || ""
        }
      : {
          residentId: residentId as Id<"residents">,
          userId,
          nameOfCarePlan: "",
          residentName: resident
            ? `${resident.firstName} ${resident.lastName}`
            : "",
          dob: resident ? new Date(resident.dateOfBirth).getTime() : Date.now(),
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
              signature: ""
            }
          ],
          discussedWith: "",
          signature: "",
          date: Date.now(),
          staffSignature: ""
        }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "plannedCareDate"
  });

  const onSubmit = async (values: z.infer<typeof carePlanAssessmentSchema>) => {
    startTransition(async () => {
      try {
        if (isEditMode && initialData?._id) {
          await submitReviewedFormMutation({
            formType: "carePlanAssessment",
            formData: {
              ...values,
              residentId: residentId as Id<"residents">
            },
            originalFormData: initialData,
            originalFormId: initialData._id,
            residentId: residentId as Id<"residents">,
            auditedBy: userId,
            teamId: "placeholder", // Will be filled from context
            organizationId: "placeholder" // Will be filled from context
          });
          toast.success("Care plan assessment updated successfully");
        } else {
          await submitAssessment({
            ...values,
            residentId: residentId as Id<"residents">,
            folderKey
          });
          toast.success("Care plan assessment submitted successfully");
        }

        // Reset form and close modal
        setStep(1);
        if (onClose) {
          onClose(); // For review mode
        } else {
          setIsOpen(false); // For standalone mode
        }
      } catch (error) {
        console.error("Error submitting care plan assessment:", error);
        toast.error("Failed to submit care plan assessment");
      }
    });
  };

  const handleNextStep = async () => {
    let isValid = false;

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
      console.log("Step 1 validation result:", isValid);
      console.log("Step 1 form errors:", form.formState.errors);
    } else if (step === 2) {
      const fieldsToValidate = ["identifiedNeeds", "aims"] as const;
      isValid = await form.trigger(fieldsToValidate);
      console.log("Step 2 validation result:", isValid);
      console.log("Step 2 form errors:", form.formState.errors);
    } else if (step === 3) {
      // Validate planned care entries - validate the entire plannedCareDate array
      const plannedCareEntries = form.getValues("plannedCareDate");
      console.log("Planned care entries:", plannedCareEntries);
      if (plannedCareEntries.length === 0) {
        toast.error("Please add at least one planned care entry");
        isValid = false;
      } else {
        isValid = await form.trigger("plannedCareDate");
        console.log("Step 3 validation result:", isValid);
        console.log("Step 3 form errors:", form.formState.errors);
      }
    } else if (step === 4) {
      const fieldsToValidate = ["date"] as const;
      isValid = await form.trigger(fieldsToValidate);
      console.log("Step 4 validation result:", isValid);
      console.log("Step 4 form errors:", form.formState.errors);
    }

    if (isValid) {
      if (step === 4) {
        // Submit the form when on step 4
        form.handleSubmit(onSubmit)();
      } else {
        setStep(step + 1);
      }
    } else {
      toast.error("Please fill in all required fields correctly");
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleClose = () => {
    setStep(1);
    if (onClose) {
      onClose(); // For review mode
    } else {
      setIsOpen(false); // For standalone mode
    }
    form.reset();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <DialogHeader>
              <DialogTitle>
                Care Plan Assessment - Basic Information
              </DialogTitle>
              <DialogDescription>
                Enter the basic resident and care plan information.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 mb-4">
              <FormField
                control={form.control}
                name="nameOfCarePlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Name of Care Plan</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter care plan name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="residentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Resident Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Resident Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Date of Birth</FormLabel>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bedroomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Bedroom Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Bedroom Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carePlanNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Care Plan Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Care Plan Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="writtenBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Written By</FormLabel>
                    <FormControl>
                      <Input placeholder="Written By" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateWritten"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Date Written</FormLabel>
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
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        );

      case 2:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Care Plan Assessment - Care Details</DialogTitle>
              <DialogDescription>
                Describe the identified needs and aims of the care plan.
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="identifiedNeeds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Identified Needs</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the identified care needs..."
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
              name="aims"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Aims</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the aims and goals of the care plan..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      case 3:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Care Plan Assessment - Planned Care</DialogTitle>
              <DialogDescription>
                Add specific planned care activities with dates, times, and
                details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">
                      Planned Care Entry {index + 1}
                    </h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`plannedCareDate.${index}.date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Date</FormLabel>
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
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                onSelect={(date) =>
                                  field.onChange(date?.getTime())
                                }
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
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
                      name={`plannedCareDate.${index}.time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 09:00 AM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`plannedCareDate.${index}.details`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Details</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the planned care activity..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`plannedCareDate.${index}.signature`}
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

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({
                    date: Date.now(),
                    time: "",
                    details: "",
                    signature: ""
                  })
                }
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Planned Care Entry
              </Button>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <DialogHeader>
              <DialogTitle>
                Care Plan Assessment - Review & Signatures
              </DialogTitle>
              <DialogDescription>
                Review and add signatures for the care plan assessment.
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="discussedWith"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discussed With</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Patient/Representative name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="signature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient/Representative Signature</FormLabel>
                  <FormControl>
                    <Input placeholder="Signature" {...field} />
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
                  <FormLabel required>Review Date</FormLabel>
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
                        disabled={(date) => date < new Date("1900-01-01")}
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
              name="staffSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Signature</FormLabel>
                  <FormControl>
                    <Input placeholder="Staff signature" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      default:
        return null;
    }
  };

  // If this is review mode (onClose exists), render without Dialog wrapper
  if (onClose) {
    return (
      <Form {...form}>
        <form className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {renderStepContent()}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? handleClose : handlePreviousStep}
              disabled={step === 1 || isLoading}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <Button onClick={handleNextStep} disabled={isLoading} type="button">
              {isLoading
                ? "Saving..."
                : step === 1
                  ? "Start Assessment"
                  : step === 4
                    ? "Save Assessment"
                    : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  }

  // Otherwise, render as standalone Dialog
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <p className="text-muted-foreground text-xs cursor-pointer hover:text-primary">
          Create Care Plan
        </p>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <Form {...form}>
          <form className="space-y-6">
            {renderStepContent()}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={step === 1 ? handleClose : handlePreviousStep}
                disabled={step === 1 || isLoading}
              >
                {step === 1 ? "Cancel" : "Back"}
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={isLoading}
                type="button"
              >
                {isLoading
                  ? "Saving..."
                  : step === 1
                    ? "Start Assessment"
                    : step === 4
                      ? "Save Assessment"
                      : "Next"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
