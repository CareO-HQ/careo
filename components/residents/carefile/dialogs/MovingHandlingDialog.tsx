"use client";

import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { movingHandlingAssessmentSchema } from "@/schemas/residents/care-file/movingHandlingSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface MovingHandlingDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any; // Data from existing assessment for editing
  isEditMode?: boolean; // Whether this is an edit/review mode
}

export default function MovingHandlingDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: MovingHandlingDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const submitAssessment = useMutation(
    api.careFiles.movingHandling.submitMovingHandlingAssessment
  );

  const form = useForm<z.infer<typeof movingHandlingAssessmentSchema>>({
    resolver: zodResolver(movingHandlingAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          // Use existing data for editing
          residentId,
          teamId,
          organizationId,
          userId,
          residentName:
            initialData.residentName ||
            (resident ? `${resident.firstName} ${resident.lastName}` : ""),
          dateOfBirth:
            initialData.dateOfBirth ||
            (resident ? new Date(resident.dateOfBirth).getTime() : 0),
          bedroomNumber:
            initialData.bedroomNumber || resident?.roomNumber || "",
          weight: initialData.weight || 0,
          height: initialData.height || 0,
          historyOfFalls: initialData.historyOfFalls || false,
          independentMobility: initialData.independentMobility || false,
          canWeightBear: initialData.canWeightBear,
          limbUpperRight: initialData.limbUpperRight,
          limbUpperLeft: initialData.limbUpperLeft,
          limbLowerRight: initialData.limbLowerRight,
          limbLowerLeft: initialData.limbLowerLeft,
          equipmentUsed: initialData.equipmentUsed || "",
          needsRiskStaff: initialData.needsRiskStaff || "",
          deafnessState: initialData.deafnessState,
          deafnessComments: initialData.deafnessComments || "",
          blindnessState: initialData.blindnessState,
          blindnessComments: initialData.blindnessComments || "",
          unpredictableBehaviourState: initialData.unpredictableBehaviourState,
          unpredictableBehaviourComments:
            initialData.unpredictableBehaviourComments || "",
          uncooperativeBehaviourState: initialData.uncooperativeBehaviourState,
          uncooperativeBehaviourComments:
            initialData.uncooperativeBehaviourComments || "",
          distressedReactionState: initialData.distressedReactionState,
          distressedReactionComments:
            initialData.distressedReactionComments || "",
          disorientatedState: initialData.disorientatedState,
          disorientatedComments: initialData.disorientatedComments || "",
          unconsciousState: initialData.unconsciousState,
          unconsciousComments: initialData.unconsciousComments || "",
          unbalanceState: initialData.unbalanceState,
          unbalanceComments: initialData.unbalanceComments || "",
          spasmsState: initialData.spasmsState,
          spasmsComments: initialData.spasmsComments || "",
          stiffnessState: initialData.stiffnessState,
          stiffnessComments: initialData.stiffnessComments || "",
          cathetersState: initialData.cathetersState,
          cathetersComments: initialData.cathetersComments || "",
          incontinenceState: initialData.incontinenceState,
          incontinenceComments: initialData.incontinenceComments || "",
          localisedPain: initialData.localisedPain,
          localisedPainComments: initialData.localisedPainComments || "",
          otherState: initialData.otherState,
          otherComments: initialData.otherComments || "",
          completedBy: isEditMode
            ? userName
            : initialData.completedBy || userName,
          jobRole: initialData.jobRole || "",
          signature: isEditMode ? userName : initialData.signature || userName,
          completionDate: isEditMode
            ? new Date().toISOString().split("T")[0]
            : initialData.completionDate ||
              new Date().toISOString().split("T")[0]
        }
      : {
          // Default values for new forms
          residentId,
          teamId,
          organizationId,
          userId,
          residentName: resident
            ? `${resident.firstName} ${resident.lastName}`
            : "",
          dateOfBirth: resident ? new Date(resident.dateOfBirth).getTime() : 0,
          bedroomNumber: resident?.roomNumber || "",
          weight: 0,
          height: 0,
          historyOfFalls: false,
          independentMobility: false,
          canWeightBear: undefined,
          limbUpperRight: undefined,
          limbUpperLeft: undefined,
          limbLowerRight: undefined,
          limbLowerLeft: undefined,
          deafnessState: undefined,
          blindnessState: undefined,
          unpredictableBehaviourState: undefined,
          uncooperativeBehaviourState: undefined,
          distressedReactionState: undefined,
          disorientatedState: undefined,
          unconsciousState: undefined,
          unbalanceState: undefined,
          spasmsState: undefined,
          stiffnessState: undefined,
          cathetersState: undefined,
          incontinenceState: undefined,
          localisedPain: undefined,
          otherState: undefined,
          completedBy: userName,
          jobRole: "",
          signature: userName,
          completionDate: new Date().toISOString().split("T")[0]
        }
  });

  // Don't render form if resident data is not available yet
  if (!resident) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Loading...</DialogTitle>
          <DialogDescription>Loading resident information...</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading form...</div>
        </div>
      </>
    );
  }

  function onSubmit(values: z.infer<typeof movingHandlingAssessmentSchema>) {
    console.log("Form submission triggered - values:", values);
    startTransition(async () => {
      try {
        console.log("Starting form submission...");

        // Check if this is edit mode and if there are changes
        if (isEditMode && initialData) {
          const hasChanges = Object.keys(values).some((key) => {
            if (
              key === "completedBy" ||
              key === "signature" ||
              key === "completionDate"
            ) {
              return false; // Ignore these fields for change detection
            }
            return values[key as keyof typeof values] !== initialData[key];
          });

          if (hasChanges) {
            // Create new entry if changes were made
            const result = await submitAssessment({
              ...values,
              residentId: residentId as Id<"residents">,
              savedAsDraft: false
            });
            console.log("Form updated with new entry:", result);
            toast.success(
              "Assessment updated successfully - new version created"
            );
          } else {
            // No changes, just mark as audited
            console.log("No changes detected, marking as audited");
            toast.success("Assessment reviewed - no changes made");
          }
        } else {
          // New form submission
          const result = await submitAssessment({
            ...values,
            residentId: residentId as Id<"residents">,
            savedAsDraft: false
          });
          console.log("Form submitted successfully:", result);
          toast.success(
            "Moving and handling assessment submitted successfully"
          );
        }

        // Small delay to show success message before closing
        setTimeout(() => {
          onClose?.();
        }, 1500);
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment. Please try again.");
      }
    });
  }

  const handleNext = async () => {
    let isValid = false;

    if (step === 1) {
      const fieldsToValidate = [
        "residentName",
        "dateOfBirth",
        "bedroomNumber",
        "weight",
        "height"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      const fieldsToValidate = [
        "independentMobility",
        "canWeightBear",
        "limbUpperRight",
        "limbUpperLeft",
        "limbLowerRight",
        "limbLowerLeft"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 3) {
      const fieldsToValidate = [
        "deafnessState",
        "blindnessState",
        "unpredictableBehaviourState",
        "uncooperativeBehaviourState"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 4) {
      const fieldsToValidate = [
        "distressedReactionState",
        "disorientatedState",
        "unconsciousState",
        "unbalanceState"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 5) {
      const fieldsToValidate = [
        "spasmsState",
        "stiffnessState",
        "cathetersState",
        "incontinenceState"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 6) {
      const fieldsToValidate = ["localisedPain", "otherState"] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 7) {
      const fieldsToValidate = [
        "completedBy",
        "jobRole",
        "signature",
        "completionDate"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    }

    if (isValid) {
      if (step === 7) {
        console.log(form.getValues());
        form.handleSubmit(onSubmit)();
      } else {
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => {
    if (step === 1) {
      return;
    }
    setStep(step - 1);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {step === 1 && "Resident Information"}
          {step === 2 && "Mobility Assessment"}
          {step === 3 && "Sensory & Behavioral Factors"}
          {step === 4 && "Cognitive & Emotional Factors"}
          {step === 5 && "Physical Risk Factors"}
          {step === 6 && "Additional Risk Factors"}
          {step === 7 && "Assessment Completion"}
        </DialogTitle>
        <DialogDescription>
          {step === 1 && "Basic information about the resident"}
          {step === 2 && "Assessment of mobility and weight bearing capacity"}
          {step === 3 && "Sensory impairments and behavioral considerations"}
          {step === 4 && "Cognitive and emotional risk factors"}
          {step === 5 && "Physical conditions affecting movement"}
          {step === 6 && "Additional factors that may affect handling"}
          {step === 7 && "Complete the assessment with signatures"}
        </DialogDescription>
      </DialogHeader>
      <div className="">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Height (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="historyOfFalls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>History of Falls</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
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
              </>
            )}

            {step === 2 && (
              <>
                <FormField
                  control={form.control}
                  name="independentMobility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Independent Mobility</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
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
                  name="canWeightBear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Weight Bearing Capacity</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select weight bearing capacity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FULLY">Fully</SelectItem>
                          <SelectItem value="PARTIALLY">Partially</SelectItem>
                          <SelectItem value="WITH-AID">With Aid</SelectItem>
                          <SelectItem value="NO-WEIGHTBEARING">
                            No Weight Bearing
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Limb Mobility</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="limbUpperRight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Upper Right</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select mobility" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FULLY">
                                Fully Mobile
                              </SelectItem>
                              <SelectItem value="PARTIALLY">
                                Partially Mobile
                              </SelectItem>
                              <SelectItem value="NONE">No Mobility</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="limbUpperLeft"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Upper Left</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select mobility" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FULLY">
                                Fully Mobile
                              </SelectItem>
                              <SelectItem value="PARTIALLY">
                                Partially Mobile
                              </SelectItem>
                              <SelectItem value="NONE">No Mobility</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="limbLowerRight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Lower Right</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select mobility" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FULLY">
                                Fully Mobile
                              </SelectItem>
                              <SelectItem value="PARTIALLY">
                                Partially Mobile
                              </SelectItem>
                              <SelectItem value="NONE">No Mobility</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="limbLowerLeft"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Lower Left</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select mobility" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FULLY">
                                Fully Mobile
                              </SelectItem>
                              <SelectItem value="PARTIALLY">
                                Partially Mobile
                              </SelectItem>
                              <SelectItem value="NONE">No Mobility</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="equipmentUsed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Used</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe any equipment used for mobility"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="needsRiskStaff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Staff Risk Assessment</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe any staff risks or special requirements"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-sm font-medium mb-4">
                  Assess how often these sensory and behavioral factors present
                  a risk during handling
                </p>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="deafnessState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Deafness</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deafnessComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deafness comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="blindnessState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          Blindness/Visual Impairment
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="blindnessComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blindness comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unpredictableBehaviourState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Unpredictable Behavior</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unpredictableBehaviourComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unpredictable behavior comments</FormLabel>
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
                  name="uncooperativeBehaviourState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Uncooperative Behavior</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ALWAYS">Always</SelectItem>
                          <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                          <SelectItem value="NEVER">Never</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="uncooperativeBehaviourComments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uncooperative behavior comments</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 4 && (
              <>
                <p className="text-sm font-medium mb-4">
                  Assess cognitive and emotional factors that may affect
                  handling
                </p>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="distressedReactionState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Distressed Reaction</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="distressedReactionComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distressed reaction comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="disorientatedState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Disorientation</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="disorientatedComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disorientation comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unconsciousState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Unconscious/Sedated</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unconsciousComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unconscious comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unbalanceState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Unbalanced/Unstable</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unbalanceComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unbalanced comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <p className="text-sm font-medium mb-4">
                  Assess physical conditions that may affect safe handling
                </p>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="spasmsState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Spasms</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="spasmsComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spasms comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stiffnessState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Stiffness/Rigidity</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stiffnessComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stiffness comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cathetersState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Catheters/Tubes</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cathetersComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catheters comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incontinenceState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Incontinence</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="incontinenceComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incontinence comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {step === 6 && (
              <>
                <p className="text-sm font-medium mb-4">
                  Additional factors that may affect safe handling
                </p>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="localisedPain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Localized Pain</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="localisedPainComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localized pain comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="otherState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Other Risk Factors</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ALWAYS">Always</SelectItem>
                            <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                            <SelectItem value="NEVER">Never</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="otherComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other risk factors comments</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {step === 7 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="completedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Completed By</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Job Role</FormLabel>
                        <FormControl>
                          <Input placeholder="Role" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="signature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Signature</FormLabel>
                        <FormControl>
                          <Input placeholder="Signature" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="completionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Completion Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            placeholder="Completion Date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </form>
        </Form>
      </div>
      <DialogFooter>
        <Button
          onClick={handleBack}
          variant="outline"
          disabled={step === 1 || isLoading}
        >
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        <Button
          onClick={
            step === 7
              ? () => {
                  console.log(
                    "Step 7 button clicked - attempting form submission"
                  );
                  console.log("Form errors:", form.formState.errors);
                  console.log("Form is valid:", form.formState.isValid);
                  console.log("Form values:", form.getValues());

                  const submitHandler = form.handleSubmit(onSubmit);
                  console.log("Submit handler created, calling it now...");
                  submitHandler();
                }
              : handleNext
          }
          disabled={isLoading}
          type={step === 7 ? "submit" : "button"}
        >
          {isLoading
            ? "Saving..."
            : step === 1
              ? "Start Assessment"
              : step === 7
                ? "Save Assessment"
                : "Next"}
        </Button>
      </DialogFooter>
    </>
  );
}
