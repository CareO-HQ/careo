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
import { skinIntegrityAssessmentSchema } from "@/schemas/residents/care-file/skinIntegritySchema";
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

interface SkinIntegrityDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function SkinIntegrityDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: SkinIntegrityDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();

  const submitAssessment = useMutation(
    api.careFiles.skinIntegrity.submitSkinIntegrityAssessment
  );
  const updateAssessment = useMutation(
    api.careFiles.skinIntegrity.updateSkinIntegrityAssessment
  );

  const form = useForm<z.infer<typeof skinIntegrityAssessmentSchema>>({
    resolver: zodResolver(skinIntegrityAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          // Use existing data for editing
          residentId: residentId as Id<"residents">,
          teamId,
          organizationId,
          userId,
          residentName:
            initialData.residentName ??
            `${resident.firstName} ${resident.lastName}`,
          bedroomNumber: initialData.bedroomNumber ?? resident.roomNumber ?? "",
          date: initialData.date ?? Date.now(),
          sensoryPerception: initialData.sensoryPerception ?? 1,
          moisture: initialData.moisture ?? 1,
          activity: initialData.activity ?? 1,
          mobility: initialData.mobility ?? 1,
          nutrition: initialData.nutrition ?? 1,
          frictionShear: initialData.frictionShear ?? 1
        }
      : {
          // Default values for new forms
          residentId: residentId as Id<"residents">,
          teamId,
          organizationId,
          userId,
          residentName: `${resident.firstName} ${resident.lastName}`,
          bedroomNumber: resident.roomNumber ?? "",
          date: Date.now(),
          sensoryPerception: 1,
          moisture: 1,
          activity: 1,
          mobility: 1,
          nutrition: 1,
          frictionShear: 1
        }
  });

  const totalSteps = 2;

  const handleNext = async () => {
    let isValid = false;

    if (step === 1) {
      const fieldsToValidate = [
        "residentName",
        "bedroomNumber",
        "date"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      const fieldsToValidate = [
        "sensoryPerception",
        "moisture",
        "activity",
        "mobility",
        "nutrition",
        "frictionShear"
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
            ...formData,
            residentId: residentId as Id<"residents">,
            savedAsDraft: false
          });
          toast.success("Skin integrity assessment updated successfully");
        } else {
          await submitAssessment({
            ...formData,
            residentId: residentId as Id<"residents">,
            savedAsDraft: false
          });
          toast.success("Skin integrity assessment saved successfully");
        }

        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save skin integrity assessment");
      }
    });
  };

  const getScoreDescription = (category: string, score: number): string => {
    const descriptions = {
      sensoryPerception: {
        1: "Completely Limited - Unresponsive to painful stimuli due to diminished consciousness or sedation",
        2: "Very Limited - Responds only to painful stimuli, cannot communicate discomfort",
        3: "Slightly Limited - Responds to verbal commands but cannot always communicate discomfort",
        4: "No Impairment - Responds to verbal commands, has no sensory deficit"
      },
      moisture: {
        1: "Constantly Moist - Skin is kept moist almost constantly by perspiration, urine etc.",
        2: "Very Moist - Skin is often but not always moist, linen must be changed at least once a shift",
        3: "Occasionally Moist - Skin is occasionally moist requiring an extra linen change approximately once a day",
        4: "Rarely Moist - Skin is usually dry, linen only requires changing at routine intervals"
      },
      activity: {
        1: "Bedfast - Confined to bed",
        2: "Chairfast - Ability to walk severely limited or non-existent",
        3: "Walks Occasionally - Walks occasionally during day but for very short distances",
        4: "Walks Frequently - Walks outside room at least twice a day and inside room at least once every 2 hours"
      },
      mobility: {
        1: "Completely Immobile - Does not make even slight changes in body or extremity position",
        2: "Very Limited - Makes occasional slight changes in body or extremity position",
        3: "Slightly Limited - Makes frequent though slight changes in body or extremity position",
        4: "No Limitation - Makes major and frequent changes in position without assistance"
      },
      nutrition: {
        1: "Very Poor - Never eats a complete meal, rarely eats more than 1/3 of any food offered",
        2: "Probably Inadequate - Rarely eats a complete meal and generally eats only about 1/2 of any food offered",
        3: "Adequate - Eats over half of most meals, eats a total of 4 servings of protein daily",
        4: "Excellent - Eats most of every meal, never refuses a meal"
      },
      frictionShear: {
        1: "Problem - Requires moderate to maximum assistance in moving",
        2: "Potential Problem - Moves feebly or requires minimum assistance",
        3: "No Apparent Problem - Moves in bed and in chair independently"
      }
    };

    return (
      descriptions[category as keyof typeof descriptions]?.[
        score as keyof (typeof descriptions)[keyof typeof descriptions]
      ] || ""
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-lg font-medium">Braden Scale Assessment</h4>
              <p className="text-sm text-muted-foreground">
                Rate each category from 1 (highest risk) to 4 (lowest risk),
                except Friction & Shear which is 1-3.
              </p>
            </div>

            <FormField
              control={form.control}
              name="sensoryPerception"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Sensory Perception</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select score" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 - Completely Limited</SelectItem>
                      <SelectItem value="2">2 - Very Limited</SelectItem>
                      <SelectItem value="3">3 - Slightly Limited</SelectItem>
                      <SelectItem value="4">4 - No Impairment</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getScoreDescription("sensoryPerception", field.value)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="moisture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Moisture</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select score" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 - Constantly Moist</SelectItem>
                      <SelectItem value="2">2 - Very Moist</SelectItem>
                      <SelectItem value="3">3 - Occasionally Moist</SelectItem>
                      <SelectItem value="4">4 - Rarely Moist</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getScoreDescription("moisture", field.value)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Activity</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select score" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 - Bedfast</SelectItem>
                      <SelectItem value="2">2 - Chairfast</SelectItem>
                      <SelectItem value="3">3 - Walks Occasionally</SelectItem>
                      <SelectItem value="4">4 - Walks Frequently</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getScoreDescription("activity", field.value)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Mobility</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select score" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 - Completely Immobile</SelectItem>
                      <SelectItem value="2">2 - Very Limited</SelectItem>
                      <SelectItem value="3">3 - Slightly Limited</SelectItem>
                      <SelectItem value="4">4 - No Limitation</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getScoreDescription("mobility", field.value)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nutrition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nutrition</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select score" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 - Very Poor</SelectItem>
                      <SelectItem value="2">2 - Probably Inadequate</SelectItem>
                      <SelectItem value="3">3 - Adequate</SelectItem>
                      <SelectItem value="4">4 - Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getScoreDescription("nutrition", field.value)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frictionShear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Friction & Shear</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select score" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 - Problem</SelectItem>
                      <SelectItem value="2">2 - Potential Problem</SelectItem>
                      <SelectItem value="3">3 - No Apparent Problem</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getScoreDescription("frictionShear", field.value)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h5 className="font-medium mb-2">Total Score</h5>
              <p className="text-2xl font-bold">
                {form.watch("sensoryPerception") +
                  form.watch("moisture") +
                  form.watch("activity") +
                  form.watch("mobility") +
                  form.watch("nutrition") +
                  form.watch("frictionShear")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {(() => {
                  const total =
                    form.watch("sensoryPerception") +
                    form.watch("moisture") +
                    form.watch("activity") +
                    form.watch("mobility") +
                    form.watch("nutrition") +
                    form.watch("frictionShear");
                  if (total < 12)
                    return "High Risk - Implement preventive measures immediately";
                  if (total === 13 || total === 14)
                    return "Moderate Risk - Implement preventive measures";
                  return "Low Risk - Continue routine care";
                })()}
              </p>
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
            ? "Review Skin Integrity Assessment"
            : step === 1
              ? "Skin Integrity Assessment - Resident Information"
              : step === 2
                ? "Skin Integrity Assessment - Braden Scale"
                : "Skin Integrity Assessment"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Review and update the skin integrity assessment details"
            : step === 1
              ? "Enter the resident's basic information for the assessment"
              : step === 2
                ? "Complete the Braden Scale assessment for pressure ulcer risk"
                : "Complete the skin integrity assessment using the Braden Scale"}
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
