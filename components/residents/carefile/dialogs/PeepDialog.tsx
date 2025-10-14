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
import { Textarea } from "@/components/ui/textarea";
import { peepSchema } from "@/schemas/residents/care-file/peepSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface PeepDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function PeepDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: PeepDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [completionDatePopoverOpen, setCompletionDatePopoverOpen] =
    useState(false);

  // Using type-safe mutations for PEEP functionality
  const submitPeep = useMutation("careFiles/peep:submitPeep" as any);
  const updatePeep = useMutation("careFiles/peep:updatePeep" as any);

  const form = useForm<z.infer<typeof peepSchema>>({
    resolver: zodResolver(peepSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          // Use existing data for editing
          residentName:
            initialData.residentName ??
            `${resident.firstName} ${resident.lastName}`,
          residentDateOfBirth:
            typeof initialData.residentDateOfBirth === "number"
              ? initialData.residentDateOfBirth
              : typeof resident.dateOfBirth === "number"
                ? resident.dateOfBirth
                : resident.dateOfBirth
                  ? new Date(resident.dateOfBirth).getTime()
                  : Date.now(),
          bedroomNumber: initialData.bedroomNumber ?? resident.roomNumber ?? "",
          understands: initialData.understands ?? false,
          staffNeeded: initialData.staffNeeded ?? 1,
          equipmentNeeded: initialData.equipmentNeeded ?? "",
          communicationNeeds: initialData.communicationNeeds ?? "",
          steps: initialData.steps ?? [],
          oxigenInUse: initialData.oxigenInUse ?? false,
          oxigenComments: initialData.oxigenComments ?? "",
          residentSmokes: initialData.residentSmokes ?? false,
          residentSmokesComments: initialData.residentSmokesComments ?? "",
          furnitureFireRetardant: initialData.furnitureFireRetardant ?? false,
          furnitureFireRetardantComments:
            initialData.furnitureFireRetardantComments ?? "",
          completedBy: initialData.completedBy ?? "",
          completedBySignature: initialData.completedBySignature ?? "",
          date:
            typeof initialData.date === "number"
              ? initialData.date
              : initialData.date
                ? new Date(initialData.date).getTime()
                : Date.now(),
          status: initialData.status ?? "draft"
        }
      : {
          // Default values for new forms
          residentName: `${resident.firstName} ${resident.lastName}`,
          residentDateOfBirth:
            typeof resident.dateOfBirth === "number"
              ? resident.dateOfBirth
              : resident.dateOfBirth
                ? new Date(resident.dateOfBirth).getTime()
                : Date.now(),
          bedroomNumber: resident.roomNumber ?? "",
          understands: false,
          staffNeeded: 0,
          equipmentNeeded: "",
          communicationNeeds: "",
          steps: [],
          oxigenInUse: false,
          oxigenComments: "",
          residentSmokes: false,
          residentSmokesComments: "",
          furnitureFireRetardant: false,
          furnitureFireRetardantComments: "",
          completedBy: "",
          completedBySignature: "",
          date: Date.now(),
          status: "draft"
        }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "steps"
  });

  const totalSteps = 5;

  const handleNext = async () => {
    let isValid = false;

    // Close all date popovers when moving between steps
    setDobPopoverOpen(false);
    setCompletionDatePopoverOpen(false);

    if (step === 1) {
      // Resident Information
      const fieldsToValidate = [
        "residentName",
        "residentDateOfBirth",
        "bedroomNumber"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      // Assessment Questions
      const fieldsToValidate = ["understands", "staffNeeded"] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 3) {
      // Evacuation Steps - no specific validation needed, steps are optional
      isValid = true;
    } else if (step === 4) {
      // Safety Questions
      const fieldsToValidate = [
        "oxigenInUse",
        "residentSmokes",
        "furnitureFireRetardant"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 5) {
      // Completion Details
      const fieldsToValidate = [
        "completedBy",
        "completedBySignature",
        "date"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    }

    if (isValid) {
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        await handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    // Close all date popovers when moving between steps
    setDobPopoverOpen(false);
    setCompletionDatePopoverOpen(false);

    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();

        if (isEditMode && initialData) {
          await updatePeep({
            peepId: initialData._id,
            ...formData,
            residentId: residentId as Id<"residents">,
            teamId,
            organizationId,
            userId,
            savedAsDraft: false
          });
          toast.success("PEEP updated successfully");
        } else {
          await submitPeep({
            ...formData,
            residentId: residentId as Id<"residents">,
            teamId,
            organizationId,
            userId,
            savedAsDraft: false
          });
          toast.success("PEEP saved successfully");
        }

        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save PEEP");
      }
    });
  };

  const addStep = () => {
    append({ name: "", description: "" });
  };

  const removeStep = (index: number) => {
    remove(index);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4" key="step-1">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="residentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Resident Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="residentDateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Date of Birth</FormLabel>
                    <Popover
                      modal
                      open={dobPopoverOpen}
                      onOpenChange={setDobPopoverOpen}
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
                          captionLayout="dropdown"
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date.getTime());
                              setDobPopoverOpen(false);
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
              <FormField
                control={form.control}
                name="bedroomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Bedroom Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4" key="step-2">
            <FormField
              control={form.control}
              name="understands"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    Resident understanding of evacuation plan
                  </FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select understanding level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="staffNeeded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Number of Staff Needed</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="equipmentNeeded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment Needed</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe any special equipment needed for evacuation..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="communicationNeeds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Communication Needs</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe any special communication requirements..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4" key="step-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Evacuation Steps</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="space-y-2 p-4 border rounded-md">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Step {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <FormField
                    control={form.control}
                    name={`steps.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Step Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Move to assembly point"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`steps.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Step Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Detailed description of this evacuation step..."
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4" key="step-4">
            <FormField
              control={form.control}
              name="oxigenInUse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oxygen in use</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="oxigenComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oxygen Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional details about oxygen use..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="residentSmokes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resident smokes</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="residentSmokesComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Smoking Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional details about smoking habits..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="furnitureFireRetardant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Furniture is fire retardant</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="furnitureFireRetardantComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Furniture Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional details about furniture fire safety..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-4" key="step-5">
            <FormField
              control={form.control}
              name="completedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Completed By</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Staff member name" />
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
                  <FormLabel required>Signature</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Digital signature or staff initials"
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
                  <FormLabel required>Completion Date</FormLabel>
                  <Popover
                    modal
                    open={completionDatePopoverOpen}
                    onOpenChange={setCompletionDatePopoverOpen}
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
                        captionLayout="dropdown"
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date.getTime());
                            setCompletionDatePopoverOpen(false);
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
            ? "Review PEEP Assessment"
            : step === 1
              ? "Personal Emergency Evacuation Plan"
              : step === 2
                ? "Assessment Questions"
                : step === 3
                  ? "Evacuation Steps"
                  : step === 4
                    ? "Safety Considerations"
                    : step === 5
                      ? "Completion Details"
                      : "Personal Emergency Evacuation Plan"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Review and update the Personal Emergency Evacuation Plan"
            : step === 1
              ? "Enter the resident's basic information for the evacuation plan"
              : step === 2
                ? "Assess evacuation needs and communication requirements"
                : step === 3
                  ? "Define the specific evacuation steps and procedures"
                  : step === 4
                    ? "Identify safety considerations and fire risks"
                    : step === 5
                      ? "Complete the PEEP with staff signature and date"
                      : "Create a Personal Emergency Evacuation Plan for the resident"}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-6"
          autoComplete="off"
        >
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
                  ? "Save PEEP"
                  : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
