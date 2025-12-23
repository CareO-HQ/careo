"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PhotographyConsentSchema } from "@/schemas/residents/care-file/photographySchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface PhotographyConsentDialogProps {
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

export default function PhotographyConsentDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: PhotographyConsentDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [loadingState, setLoadingState] = useState<string>("");
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [representativeDatePopoverOpen, setRepresentativeDatePopoverOpen] = useState(false);
  const [dateCompletedPopoverOpen, setDateCompletedPopoverOpen] = useState(false);

  const submitPhotographyConsent = useMutation(
    api.careFiles.photographyConsent.submitPhotographyConsent
  );
  const updatePhotographyConsent = useMutation(
    api.careFiles.photographyConsent.updatePhotographyConsent
  );

  const form = useForm<z.infer<typeof PhotographyConsentSchema>>({
    resolver: zodResolver(PhotographyConsentSchema),
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
            (`${resident.firstName || ""} ${resident.lastName || ""}`.trim() ||
              ""),
          bedroomNumber: initialData.bedroomNumber ?? resident.roomNumber ?? "",
          dateOfBirth:
            initialData.dateOfBirth ??
            (resident.dateOfBirth
              ? new Date(resident.dateOfBirth).getTime()
              : Date.now()),

          // Consent fields
          healthcareRecords: initialData.healthcareRecords ?? false,
          socialActivitiesInternal:
            initialData.socialActivitiesInternal ?? false,
          socialActivitiesExternal:
            initialData.socialActivitiesExternal ?? false,

          // Signature fields
          residentSignature: initialData.residentSignature ?? "",

          // Representative fields
          representativeName: initialData.representativeName ?? "",
          representativeRelationship:
            initialData.representativeRelationship ?? "",
          representativeSignature: initialData.representativeSignature ?? "",
          representativeDate: initialData.representativeDate ?? undefined,

          // Staff fields
          nameStaff: initialData.nameStaff ?? userName,
          staffSignature: initialData.staffSignature ?? userName,
          date: initialData.date ?? Date.now()
        }
      : {
          // Default values for new forms
          residentId: residentId as Id<"residents">,
          teamId,
          organizationId,
          userId,
          residentName:
            `${resident.firstName || ""} ${resident.lastName || ""}`.trim() ||
            "",
          bedroomNumber: resident.roomNumber ?? "",
          dateOfBirth: resident.dateOfBirth
            ? new Date(resident.dateOfBirth).getTime()
            : Date.now(),

          // Consent fields
          healthcareRecords: false,
          socialActivitiesInternal: false,
          socialActivitiesExternal: false,

          // Signature fields
          residentSignature: "",

          // Representative fields
          representativeName: "",
          representativeRelationship: "",
          representativeSignature: "",
          representativeDate: undefined,

          // Staff fields
          nameStaff: userName,
          staffSignature: userName,
          date: Date.now()
        }
  });

  const totalSteps = 4;

  const handleNext = async () => {
    let isValid = false;

    if (step === 1) {
      const fieldsToValidate = [
        "residentName",
        "bedroomNumber",
        "dateOfBirth"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      // Consent fields - no validation needed as they're booleans
      isValid = true;
    } else if (step === 3) {
      // Either resident signature OR complete representative info must be provided
      const formValues = form.getValues();
      const hasResidentSignature = formValues.residentSignature?.trim();
      const hasCompleteRepresentativeInfo =
        formValues.representativeName?.trim() &&
        formValues.representativeRelationship?.trim() &&
        formValues.representativeSignature?.trim() &&
        formValues.representativeDate;

      isValid = !!(hasResidentSignature || hasCompleteRepresentativeInfo);

      if (!isValid) {
        // Clear any existing errors first
        form.clearErrors();

        // Set errors on both sections to indicate the requirement
        form.setError("residentSignature", {
          type: "manual",
          message:
            "Either provide resident signature or complete representative information below"
        });
        form.setError("representativeName", {
          type: "manual",
          message:
            "All representative fields required if not using resident signature"
        });
      } else {
        // Clear errors if validation passes
        form.clearErrors("residentSignature");
        form.clearErrors("representativeName");
        form.clearErrors("representativeRelationship");
        form.clearErrors("representativeSignature");
        form.clearErrors("representativeDate");
      }
    } else if (step === 4) {
      const fieldsToValidate = ["nameStaff", "staffSignature", "date"] as const;
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

        setLoadingState("Saving consent form...");

        if (isEditMode && initialData) {
          await updatePhotographyConsent({
            consentId: initialData._id,
            ...formData,
            residentId: residentId as Id<"residents">,
            savedAsDraft: false
          });

          setLoadingState("Generating PDF document...");

          // Give a brief delay to show the PDF generation state
          await new Promise((resolve) => setTimeout(resolve, 1000));

          toast.success("Photography consent updated successfully");
        } else {
          await submitPhotographyConsent({
            ...formData,
            residentId: residentId as Id<"residents">,
            savedAsDraft: false
          });

          setLoadingState("Generating PDF document...");

          // Give a brief delay to show the PDF generation state
          await new Promise((resolve) => setTimeout(resolve, 1000));

          toast.success("Photography consent saved successfully");
        }

        setLoadingState("");
        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        setLoadingState("");
        toast.error("Failed to save photography consent");
      }
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-4">
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
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Date of Birth</FormLabel>
                    <Popover modal open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
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
                          captionLayout="dropdown"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) => {
                            field.onChange(date?.getTime());
                            setDobPopoverOpen(false);
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
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">
                Photography and Image Use Consent
              </h4>
              <p className="text-sm text-muted-foreground">
                Please select the types of photography and image use you consent
                to:
              </p>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="healthcareRecords"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        Healthcare Records
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Photography for medical documentation, wound care
                        monitoring, and healthcare record purposes.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialActivitiesInternal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        Internal Social Activities
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Photography during internal activities, celebrations,
                        and events for internal facility use only.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialActivitiesExternal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        External Social Activities & Marketing
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Photography for marketing materials, website, social
                        media, newsletters, and promotional activities.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Resident Signature</h4>
              <p className="text-sm text-muted-foreground">
                If the resident is able to provide consent and signature:
              </p>
            </div>

            <FormField
              control={form.control}
              name="residentSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resident Signature</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter resident signature or mark 'X' if applicable..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 mt-6">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">
                  Representative Information
                </h4>
                <p className="text-sm text-muted-foreground">
                  If consent is provided by a representative (family member,
                  guardian, etc.):
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="representativeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Representative Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="representativeRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship to Resident</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Son, Daughter, Guardian"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="representativeSignature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Representative Signature</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Representative signature..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="representativeDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Signed by Representative</FormLabel>
                    <Popover modal open={representativeDatePopoverOpen} onOpenChange={setRepresentativeDatePopoverOpen}>
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
                          captionLayout="dropdown"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) => {
                            field.onChange(date?.getTime());
                            setRepresentativeDatePopoverOpen(false);
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
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Staff Verification</h4>
              <p className="text-sm text-muted-foreground">
                Staff member completing this consent form:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nameStaff"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Staff Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full name" readOnly disabled className="bg-muted" />
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
                    <FormLabel required>Date Completed</FormLabel>
                    <Popover modal open={dateCompletedPopoverOpen} onOpenChange={setDateCompletedPopoverOpen}>
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
                          captionLayout="dropdown"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) => {
                            field.onChange(date?.getTime());
                            setDateCompletedPopoverOpen(false);
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

            <FormField
              control={form.control}
              name="staffSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Staff Signature</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Staff member signature..."
                      rows={2}
                      readOnly
                      disabled
                      className="bg-muted"
                    />
                  </FormControl>
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
            ? "Review Photography Consent"
            : step === 1
              ? "Photography Consent Form"
              : step === 2
                ? "Consent Permissions"
                : step === 3
                  ? "Signatures"
                  : step === 4
                    ? "Staff Verification"
                    : "Photography Consent Form"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Review and update the photography consent details"
            : step === 1
              ? "Enter the resident's basic information for the photography consent form"
              : step === 2
                ? "Select the types of photography and image use permissions"
                : step === 3
                  ? "Obtain resident or representative consent and signatures"
                  : step === 4
                    ? "Complete staff verification and final signatures"
                    : "Obtain consent for photography and image use for the resident"}
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
                  ? "Save Consent"
                  : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
