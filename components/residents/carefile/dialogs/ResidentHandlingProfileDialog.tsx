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
import { residentHandlingProfileSchema } from "@/schemas/residents/care-file/residentHandlingProfileSchema";
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

interface ResidentHandlingProfileProps {
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

export default function ResidentHandlingProfile({
  teamId,
  residentId,
  organizationId,
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: ResidentHandlingProfileProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [reviewDatePopovers, setReviewDatePopovers] = useState<
    Record<string, boolean>
  >({});

  const submitProfile = useMutation(
    api.careFiles.handlingProfile.submitHandlingProfile
  );
  const updateProfile = useMutation(
    api.careFiles.handlingProfile.updateHandlingProfile
  );
  const submitReviewedFormMutation = useMutation(
    api.managerAudits.submitReviewedForm
  );

  const getDefaultActivityValues = () => ({
    nStaff: 0,
    equipment: "",
    handlingPlan: "",
    dateForReview: Date.now()
  });

  const form = useForm<z.infer<typeof residentHandlingProfileSchema>>({
    resolver: zodResolver(residentHandlingProfileSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          residentId: residentId as Id<"residents">,
          teamId,
          organizationId,
          completedBy: initialData.completedBy ?? "",
          jobRole: initialData.jobRole ?? "",
          date: initialData.date ?? Date.now(),
          residentName:
            initialData.residentName ??
            `${resident.firstName} ${resident.lastName}`,
          bedroomNumber: initialData.bedroomNumber ?? resident.roomNumber ?? "",
          weight: initialData.weight ?? 0,
          weightBearing: initialData.weightBearing ?? "",
          transferBed: initialData.transferBed ?? getDefaultActivityValues(),
          transferChair:
            initialData.transferChair ?? getDefaultActivityValues(),
          walking: initialData.walking ?? getDefaultActivityValues(),
          toileting: initialData.toileting ?? getDefaultActivityValues(),
          movementInBed:
            initialData.movementInBed ?? getDefaultActivityValues(),
          bath: initialData.bath ?? getDefaultActivityValues(),
          outdoorMobility:
            initialData.outdoorMobility ?? getDefaultActivityValues()
        }
      : {
          residentId: residentId as Id<"residents">,
          teamId,
          organizationId,
          completedBy: "",
          jobRole: "",
          date: Date.now(),
          residentName: `${resident.firstName} ${resident.lastName}`,
          bedroomNumber: resident.roomNumber ?? "",
          weight: 0,
          weightBearing: "",
          transferBed: getDefaultActivityValues(),
          transferChair: getDefaultActivityValues(),
          walking: getDefaultActivityValues(),
          toileting: getDefaultActivityValues(),
          movementInBed: getDefaultActivityValues(),
          bath: getDefaultActivityValues(),
          outdoorMobility: getDefaultActivityValues()
        }
  });

  const totalSteps = 8;

  const handleNext = async () => {
    setDatePopoverOpen(false);
    Object.keys(reviewDatePopovers).forEach((key) => {
      setReviewDatePopovers((prev) => ({ ...prev, [key]: false }));
    });

    let isValid = false;

    if (step === 1) {
      const fieldsToValidate = [
        "completedBy",
        "jobRole",
        "date",
        "residentName",
        "bedroomNumber",
        "weight",
        "weightBearing"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else {
      const activityFields: Record<number, string> = {
        2: "transferBed",
        3: "transferChair",
        4: "walking",
        5: "toileting",
        6: "movementInBed",
        7: "bath",
        8: "outdoorMobility"
      };
      const activityName = activityFields[step];
      if (activityName) {
        isValid = await form.trigger([
          `${activityName}.nStaff`,
          `${activityName}.equipment`,
          `${activityName}.handlingPlan`,
          `${activityName}.dateForReview`
        ] as any);
      }
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
    setDatePopoverOpen(false);
    Object.keys(reviewDatePopovers).forEach((key) => {
      setReviewDatePopovers((prev) => ({ ...prev, [key]: false }));
    });

    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();

        if (isEditMode && initialData) {
          // In review mode, use the special submission that creates audit automatically
          const data = await submitReviewedFormMutation({
            formType: "residentHandlingProfileForm",
            formData: {
              ...formData,
              residentId: residentId as Id<"residents">
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
            toast.success("Handling profile updated successfully!");
          } else {
            toast.success("Handling profile reviewed and approved without changes!");
          }
        } else {
          await submitProfile({
            ...formData,
            residentId: residentId as Id<"residents">
          });
          toast.success("Handling profile saved successfully");
        }

        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save handling profile");
      }
    });
  };

  const renderActivityFields = (
    activityName:
      | "transferBed"
      | "transferChair"
      | "walking"
      | "toileting"
      | "movementInBed"
      | "bath"
      | "outdoorMobility",
    title: string
  ) => {
    const popoverKey = `${activityName}_review`;
    const isPopoverOpen = reviewDatePopovers[popoverKey] || false;

    return (
      <div className="space-y-4">
        <h4 className="text-md font-medium">{title}</h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`${activityName}.nStaff`}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Number of Staff</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="2"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${activityName}.equipment`}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Equipment</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Hoist, slide sheet"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name={`${activityName}.handlingPlan`}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Handling Plan</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the handling plan for this activity..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`${activityName}.dateForReview`}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Date for Review</FormLabel>
              <Popover
                open={isPopoverOpen}
                onOpenChange={(open) =>
                  setReviewDatePopovers((prev) => ({
                    ...prev,
                    [popoverKey]: open
                  }))
                }
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
                    selected={field.value ? new Date(field.value) : undefined}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      if (date) {
                        field.onChange(date.getTime());
                        setReviewDatePopovers((prev) => ({
                          ...prev,
                          [popoverKey]: false
                        }));
                      }
                    }}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4" key="step-1">
            <div className="space-y-4">
              <h4 className="text-md font-medium">Completed By</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="completedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Smith"
                          autoComplete="off"
                          {...field}
                        />
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
                        <Input
                          placeholder="Care Assistant"
                          autoComplete="off"
                          {...field}
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
                      <FormLabel required>Date</FormLabel>
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
            </div>
            <div className="space-y-4">
              <h4 className="text-md font-medium">Resident Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="residentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Resident Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jane Doe"
                          autoComplete="off"
                          {...field}
                        />
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
                        <Input
                          placeholder="Room 101"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="70"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weightBearing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Weight Bearing</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Full weight bearing"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4" key="step-2">
            {renderActivityFields("transferBed", "Transfer to or from Bed")}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4" key="step-3">
            {renderActivityFields("transferChair", "Transfer to or from Chair")}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4" key="step-4">
            {renderActivityFields("walking", "Walking")}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4" key="step-5">
            {renderActivityFields("toileting", "Toileting")}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4" key="step-6">
            {renderActivityFields("movementInBed", "Movement in Bed")}
          </div>
        );

      case 7:
        return (
          <div className="space-y-4" key="step-7">
            {renderActivityFields("bath", "Bathing")}
          </div>
        );

      case 8:
        return (
          <div className="space-y-4" key="step-8">
            {renderActivityFields("outdoorMobility", "Outdoor Mobility")}
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    if (isEditMode) return "Review Handling Profile";
    const titles: Record<number, string> = {
      1: "Resident Handling Profile",
      2: "Transfer to or from Bed",
      3: "Transfer to or from Chair",
      4: "Walking",
      5: "Toileting",
      6: "Movement in Bed",
      7: "Bathing",
      8: "Outdoor Mobility"
    };
    return titles[step] || "Resident Handling Profile";
  };

  const getStepDescription = () => {
    if (isEditMode) return "Review and update the handling profile details";
    const descriptions: Record<number, string> = {
      1: "Enter basic information and resident details",
      2: "Specify handling requirements for bed transfers",
      3: "Specify handling requirements for chair transfers",
      4: "Specify handling requirements for walking",
      5: "Specify handling requirements for toileting",
      6: "Specify handling requirements for movement in bed",
      7: "Specify handling requirements for bathing",
      8: "Specify handling requirements for outdoor mobility"
    };
    return descriptions[step] || "Complete the handling profile";
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{getStepTitle()}</DialogTitle>
        <DialogDescription>{getStepDescription()}</DialogDescription>
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
                  ? "Save Profile"
                  : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
