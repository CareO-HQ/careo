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
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { bedrailConsentSchema } from "@/schemas/residents/care-file/bedrailConsentSchema";
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

interface BedrailConsentDialogProps {
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

export default function BedrailConsentDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: BedrailConsentDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [loadingState, setLoadingState] = useState<string>("");
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const submitBedrailConsent = useMutation(
    api.careFiles.bedrailConsent.submitBedrailConsent
  );
  const updateBedrailConsent = useMutation(
    api.careFiles.bedrailConsent.updateBedrailConsent
  );

  const form = useForm<z.infer<typeof bedrailConsentSchema>>({
    resolver: zodResolver(bedrailConsentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          residentId,
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
          consentType: initialData.consentType ?? "ABLE_TO_CONSENT",
          ableToConsentSection: initialData.ableToConsentSection,
          unableToConsentSection: initialData.unableToConsentSection
        }
      : {
          residentId,
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
          consentType: "ABLE_TO_CONSENT",
          ableToConsentSection: {
            consentChoice: undefined,
            residentSignature: "",
            staffMemberName: userName || "",
            staffMemberSignature: userName || "",
            staffSignatureDate: new Date().toISOString().split("T")[0]
          },
          unableToConsentSection: {
            representativeName: "",
            discussionAcknowledged: true,
            residentPreference: undefined,
            representativeSignature: "",
            staffMemberName: userName || "",
            staffMemberSignature: userName || "",
            staffSignatureDate: new Date().toISOString().split("T")[0]
          }
        }
  });

  const consentType = form.watch("consentType");
  const totalSteps = 3;

  const handleNext = async () => {
    let isValid = false;

    if (step === 1) {
      // Validate header information
      const fieldsToValidate = [
        "residentName",
        "bedroomNumber",
        "dateOfBirth"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      // Validate consent type selection and corresponding section
      const consentTypeValue = form.getValues("consentType");

      if (consentTypeValue === "ABLE_TO_CONSENT") {
        const section = form.getValues("ableToConsentSection");
        isValid = !!(
          section?.consentChoice &&
          section?.residentSignature?.trim()
        );

        if (!isValid) {
          toast.error("Please select consent choice and provide resident signature");
        }
      } else {
        const section = form.getValues("unableToConsentSection");
        isValid = !!(
          section?.representativeName?.trim() &&
          section?.residentPreference &&
          section?.representativeSignature?.trim()
        );

        if (!isValid) {
          toast.error(
            "Please complete representative name, preference, and signature"
          );
        }
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
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();

        // Ensure staff fields are populated with current user
        const preparedData = {
          ...formData,
          ableToConsentSection: formData.ableToConsentSection
            ? {
                ...formData.ableToConsentSection,
                staffMemberName: userName || "",
                staffMemberSignature: userName || "",
                staffSignatureDate:
                  formData.ableToConsentSection.staffSignatureDate ||
                  new Date().toISOString().split("T")[0]
              }
            : undefined,
          unableToConsentSection: formData.unableToConsentSection
            ? {
                ...formData.unableToConsentSection,
                staffMemberName: userName || "",
                staffMemberSignature: userName || "",
                staffSignatureDate:
                  formData.unableToConsentSection.staffSignatureDate ||
                  new Date().toISOString().split("T")[0]
              }
            : undefined
        };

        setLoadingState("Saving bedrail consent form...");

        if (isEditMode && initialData) {
          await updateBedrailConsent({
            id: initialData._id,
            updates: {
              residentName: preparedData.residentName,
              bedroomNumber: preparedData.bedroomNumber,
              dateOfBirth: preparedData.dateOfBirth,
              consentType: preparedData.consentType,
              ableToConsentSection: preparedData.ableToConsentSection,
              unableToConsentSection: preparedData.unableToConsentSection,
              savedAsDraft: false
            }
          });

          setLoadingState("Generating PDF document...");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          toast.success("Bedrail consent updated successfully");
        } else {
          await submitBedrailConsent({
            residentId: residentId as Id<"residents">,
            teamId,
            organizationId,
            userId,
            residentName: preparedData.residentName,
            bedroomNumber: preparedData.bedroomNumber,
            dateOfBirth: preparedData.dateOfBirth,
            consentType: preparedData.consentType,
            ableToConsentSection: preparedData.ableToConsentSection,
            unableToConsentSection: preparedData.unableToConsentSection,
            savedAsDraft: false
          });

          setLoadingState("Generating PDF document...");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          toast.success("Bedrail consent saved successfully");
        }

        setLoadingState("");
        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        setLoadingState("");
        toast.error("Failed to save bedrail consent");
      }
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-1 pb-2">
              <h4 className="text-sm font-medium">Header Information</h4>
              <p className="text-sm text-muted-foreground">
                Basic resident information for the bedrail consent form
              </p>
            </div>
            <FormField
              control={form.control}
              name="residentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Resident&apos;s Name</FormLabel>
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
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value ? format(new Date(field.value), "PPP") : ""}
                      readOnly
                      disabled
                      className="bg-muted"
                    />
                  </FormControl>
                  <FormDescription>
                    Automatically populated from resident information
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-1 pb-2">
              <h4 className="text-sm font-medium">Consent Type</h4>
              <p className="text-sm text-muted-foreground">
                Select whether the resident is able to consent themselves
              </p>
            </div>

            <FormField
              control={form.control}
              name="consentType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Clear the opposite section when switching
                        if (value === "ABLE_TO_CONSENT") {
                          form.setValue("unableToConsentSection", undefined);
                        } else {
                          form.setValue("ableToConsentSection", undefined);
                        }
                      }}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="ABLE_TO_CONSENT" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Resident is able to consent
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="UNABLE_TO_CONSENT" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Resident is unable to consent
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {consentType === "ABLE_TO_CONSENT" && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Resident Consent</h4>
                  <p className="text-sm text-muted-foreground">
                    The resident&apos;s choice regarding bedrail usage
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="ableToConsentSection.consentChoice"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel required>Consent Choice</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <RadioGroupItem value="CONSENT_TO_USE" />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-normal">
                                I understand that I may be at risk of falling
                                out of bed and would therefore like bed
                                rails/bumpers to be used on my bed.
                              </FormLabel>
                            </div>
                          </FormItem>
                          <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <RadioGroupItem value="REFUSE_TO_USE" />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-normal">
                                I understand that I may be at risk of falling
                                out of bed, but I do NOT want bed rails or
                                bumpers to be used on my bed.
                              </FormLabel>
                            </div>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ableToConsentSection.residentSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Resident Signature</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Type name to sign" />
                      </FormControl>
                      <FormDescription>
                        Type the resident&apos;s name to serve as their
                        signature
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ableToConsentSection.staffMemberName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name of Staff Member</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={userName || ""}
                          readOnly
                          disabled
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormDescription>
                        Automatically populated with current user
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ableToConsentSection.staffMemberSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Member Signature</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={userName || ""}
                          readOnly
                          disabled
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormDescription>
                        Automatically populated with current user
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ableToConsentSection.staffSignatureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={
                            field.value ||
                            new Date().toISOString().split("T")[0]
                          }
                          type="date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {consentType === "UNABLE_TO_CONSENT" && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">
                    Representative Information
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    For residents unable to consent, a next of kin, advocate, or
                    MDT member must provide input
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="unableToConsentSection.representativeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Next of Kin / Advocate / MDT Member Name
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm">
                    I (Next of Kin/Advocate/MDT member) have discussed the issue
                    of using bed rails/bumpers with the professionals concerned
                    and based on my knowledge of the resident&apos;s previously
                    expressed wishes and beliefs:
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="unableToConsentSection.residentPreference"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel required>Resident Preference</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <RadioGroupItem value="WOULD_PREFER_USE" />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-normal">
                                The resident would have preferred to use bed
                                rails/bumpers
                              </FormLabel>
                            </div>
                          </FormItem>
                          <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <RadioGroupItem value="WOULD_NOT_PREFER_USE" />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-normal">
                                The resident would not have preferred to use bed
                                rails/bumpers
                              </FormLabel>
                            </div>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unableToConsentSection.representativeSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Signature of Relative / Next of Kin
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Type name to sign" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unableToConsentSection.staffMemberName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name of Staff Member</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={userName || ""}
                          readOnly
                          disabled
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormDescription>
                        Automatically populated with current user
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unableToConsentSection.staffMemberSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Member Signature</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={userName || ""}
                          readOnly
                          disabled
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormDescription>
                        Automatically populated with current user
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unableToConsentSection.staffSignatureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={
                            field.value ||
                            new Date().toISOString().split("T")[0]
                          }
                          type="date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Review and Submit</h4>
              <p className="text-sm text-muted-foreground">
                Please review the information before submitting
              </p>
            </div>

            <div className="rounded-md bg-muted p-4 space-y-2">
              <div>
                <p className="text-sm font-medium">Resident:</p>
                <p className="text-sm text-muted-foreground">
                  {form.getValues("residentName")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Bedroom Number:</p>
                <p className="text-sm text-muted-foreground">
                  {form.getValues("bedroomNumber")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Consent Type:</p>
                <p className="text-sm text-muted-foreground">
                  {consentType === "ABLE_TO_CONSENT"
                    ? "Resident is able to consent"
                    : "Resident is unable to consent"}
                </p>
              </div>
              {consentType === "ABLE_TO_CONSENT" &&
                form.getValues("ableToConsentSection") && (
                  <div>
                    <p className="text-sm font-medium">Resident Choice:</p>
                    <p className="text-sm text-muted-foreground">
                      {form.getValues("ableToConsentSection.consentChoice") ===
                      "CONSENT_TO_USE"
                        ? "Consents to use bed rails/bumpers"
                        : "Refuses to use bed rails/bumpers"}
                    </p>
                  </div>
                )}
              {consentType === "UNABLE_TO_CONSENT" &&
                form.getValues("unableToConsentSection") && (
                  <>
                    <div>
                      <p className="text-sm font-medium">Representative:</p>
                      <p className="text-sm text-muted-foreground">
                        {form.getValues(
                          "unableToConsentSection.representativeName"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Resident&apos;s Presumed Preference:
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {form.getValues(
                          "unableToConsentSection.residentPreference"
                        ) === "WOULD_PREFER_USE"
                          ? "Would have preferred to use bed rails/bumpers"
                          : "Would not have preferred to use bed rails/bumpers"}
                      </p>
                    </div>
                  </>
                )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Review" : "Complete"} Bedrails Consent / Agreement
        </DialogTitle>
        <DialogDescription>
          Step {step} of {totalSteps} - {step === 1 ? "Header Information" : step === 2 ? "Consent Details" : "Review"}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form className="space-y-6">
          <div className="max-h-[60vh] overflow-y-auto px-1">
            {renderStepContent()}
          </div>

          <DialogFooter className="flex flex-row justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 1 || isLoading}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {loadingState || "Submitting..."}
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
