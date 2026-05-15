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
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { bedrailConsentSchema } from "@/schemas/residents/care-file/bedrailConsentSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import NextReviewDateField from "./NextReviewDateField";

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
  isInline?: boolean;
  viewOnly?: boolean;
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
  isEditMode = false,
  isInline = false,
  viewOnly = false
}: BedrailConsentDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [loadingState, setLoadingState] = useState<string>("");

  const { supabase } = useSupabase();

  const form = useForm<z.infer<typeof bedrailConsentSchema>>({
    resolver: zodResolver(bedrailConsentSchema) as any,
    mode: "onChange",
    defaultValues: initialData ? {
      residentId: initialData.assessment_data?.residentId ?? initialData.residentId ?? initialData.resident_id ?? residentId,
      teamId: initialData.assessment_data?.teamId ?? initialData.teamId ?? teamId,
      organizationId: initialData.assessment_data?.organizationId ?? initialData.organizationId ?? initialData.organization_id ?? organizationId,
      userId: initialData.assessment_data?.userId ?? initialData.userId ?? initialData.created_by ?? userId,
      // Recovery from assessment_data (preferred) or flat fields (legacy)
      ...(initialData.assessment_data || {}),
      residentName: initialData.assessment_data?.residentName ?? initialData.residentName ?? (resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : ""),
      bedroomNumber: initialData.assessment_data?.bedroomNumber ?? initialData.bedroomNumber ?? resident?.room_number ?? "",
      dateOfBirth: initialData.assessment_data?.dateOfBirth ?? initialData.dateOfBirth ?? (resident?.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now()),
      consentType: initialData.assessment_data?.consentType ?? (initialData.capacity_assessed ? "ABLE_TO_CONSENT" : "UNABLE_TO_CONSENT"),

      ableToConsentSection: (initialData.assessment_data?.consentType === "ABLE_TO_CONSENT" || initialData.capacity_assessed)
        ? (initialData.assessment_data?.ableToConsentSection || {
          consentChoice: initialData.consent_given ? "CONSENT_TO_USE" : (initialData.consent_given === false ? "REFUSE_TO_USE" : undefined as any),
          residentSignature: "",
          staffMemberName: initialData.completed_by || userName || "",
          staffMemberSignature: initialData.completed_by || userName || "",
          staffSignatureDate: initialData.assessment_date || new Date().toISOString().split("T")[0]
        })
        : undefined,

      unableToConsentSection: (initialData.assessment_data?.consentType === "UNABLE_TO_CONSENT" || (!initialData.capacity_assessed && initialData.id))
        ? (initialData.assessment_data?.unableToConsentSection || {
          representativeName: initialData.representative_name || "",
          discussionAcknowledged: true,
          residentPreference: initialData.consent_given ? "WOULD_PREFER_USE" : (initialData.consent_given === false ? "WOULD_NOT_PREFER_USE" : undefined as any),
          representativeSignature: "",
          staffMemberName: initialData.completed_by || userName || "",
          staffMemberSignature: initialData.completed_by || userName || "",
          staffSignatureDate: initialData.assessment_date || new Date().toISOString().split("T")[0]
        })
        : undefined
    }
      : {
        residentId,
        teamId,
        organizationId,
        userId,
        residentName:
          `${resident.first_name || ""} ${resident.last_name || ""}`.trim() ||
          "",
        bedroomNumber: resident.room_number ?? "",
        dateOfBirth: resident.date_of_birth
          ? new Date(resident.date_of_birth).getTime()
          : Date.now(),
        nextReviewDate: "",
        consentType: "ABLE_TO_CONSENT",
        ableToConsentSection: {
          consentChoice: undefined as any,
          residentSignature: "",
          staffMemberName: userName || "",
          staffMemberSignature: userName || "",
          staffSignatureDate: new Date().toISOString().split("T")[0]
        },
        unableToConsentSection: undefined
      }
  });

  const consentType = form.watch("consentType");

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();

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

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          capacity_assessed: formData.consentType === "ABLE_TO_CONSENT",
          consent_given: formData.consentType === "ABLE_TO_CONSENT"
            ? formData.ableToConsentSection?.consentChoice === "CONSENT_TO_USE"
            : formData.unableToConsentSection?.residentPreference === "WOULD_PREFER_USE",
          representative_name: formData.unableToConsentSection?.representativeName,
          assessment_date: new Date().toISOString().split("T")[0],
          completed_by: userName,
          created_by: userId,
          assessment_data: preparedData // Store full form state
        };

        await submitAssessmentWithVersioning(
          'bedrail_consents',
          payload,
          initialData,
          isEditMode
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast.success(isEditMode ? "Bedrail consent updated successfully" : "Bedrail consent saved successfully");

        setLoadingState("");
        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        setLoadingState("");
        toast.error("Failed to save bedrail consent");
      }
    });
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
      {!isInline && (
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Review" : "Complete"} Bedrails Consent / Agreement
          </DialogTitle>
          <DialogDescription>
            Complete all sections below for the bedrail consent form
          </DialogDescription>
        </DialogHeader>
      )}

      <Form {...form}>
        <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
          <div className="mb-6 p-4 border rounded-lg bg-muted/40 px-1">
            <FormField
              control={form.control}
              name="nextReviewDate"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormControl>
                    <NextReviewDateField value={field.value || ""} onChange={field.onChange} disabled={viewOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <button
              type="button"
              id="care-file-submit-btn"
              className="hidden"
              onClick={form.handleSubmit(handleSubmit as any, (errors) => {
                console.error("Bedrail Consent form errors:", errors);
                toast.error("Please fill in all required fields correctly.");
              })}
            />
            <div className="space-y-8 px-1">

              {/* Section 1: Header Information */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
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
                        <Input
                          {...field}
                          value={field.value ?? ""}
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
                          {...field}
                          value={field.value ?? ""}
                        />
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

              {/* Section 2: Consent Type */}
              <div className="space-y-6">
                <div className="space-y-1 pb-2 border-b">
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
                            if (value === "ABLE_TO_CONSENT") {
                              form.setValue("unableToConsentSection", undefined);
                              form.setValue("ableToConsentSection", {
                                consentChoice: undefined as any,
                                residentSignature: "",
                                staffMemberName: userName || "",
                                staffMemberSignature: userName || "",
                                staffSignatureDate: new Date().toISOString().split("T")[0]
                              });
                            } else {
                              form.setValue("ableToConsentSection", undefined);
                              form.setValue("unableToConsentSection", {
                                representativeName: "",
                                discussionAcknowledged: true,
                                residentPreference: undefined as any,
                                representativeSignature: "",
                                staffMemberName: userName || "",
                                staffMemberSignature: userName || "",
                                staffSignatureDate: new Date().toISOString().split("T")[0]
                              });
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

                {/* Able to Consent Sub-Section */}
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
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Type name to sign"
                            />
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
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Staff member completing this assessment
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
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Staff signature for confirmation
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
                              value={field.value ?? ""}
                              type="date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Unable to Consent Sub-Section */}
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
                            <Input
                              {...field}
                              value={field.value ?? ""}
                            />
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
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Type name to sign"
                            />
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
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Staff member completing this assessment
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
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Staff signature for confirmation
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
                              value={field.value ?? ""}
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
            </div>

            {/* Sticky Footer */}
            {!isInline && !viewOnly && (
              <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose?.()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={form.handleSubmit(handleSubmit as any)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {loadingState || "Submitting..."}
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            )}
          </form>
        </fieldset>
      </Form>
    </>
  );
}
