"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bedRailsRiskAssessmentSchema,
  type BedRailsRiskAssessmentFormData,
} from "@/schemas/residents/care-file/bedRailsRiskAssessmentSchema";
import { format } from "date-fns";

interface BedRailsRiskAssessmentDialogProps {
  residentId: string;
  teamId: string;
  organizationId: string;
  userId: string;
  userName?: string;
  resident: any;
  onClose?: () => void;
  initialData?: any;
}

export default function BedRailsRiskAssessmentDialog({
  residentId,
  teamId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
}: BedRailsRiskAssessmentDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { supabase } = useSupabase();

  const form = useForm<BedRailsRiskAssessmentFormData>({
    resolver: zodResolver(bedRailsRiskAssessmentSchema) as any,
    defaultValues: initialData ? {
      residentId: initialData.residentId,
      teamId: initialData.teamId,
      organizationId: initialData.organizationId,
      userId: initialData.userId,
      residentName: initialData.residentName,
      bedroomNumber: initialData.bedroomNumber,
      dateOfBirth: initialData.dateOfBirth,
      assessmentCompletedBy: initialData.assessmentCompletedBy,
      jobRole: initialData.jobRole,
      assessmentDate: initialData.assessmentDate || initialData.date_of_assessment || initialData.assessment_date,
      alternativeEquipmentConsidered: initialData.alternativeEquipmentConsidered,
      reasonsAlternativesNotSuccessful: initialData.reasonsAlternativesNotSuccessful,
      exclusionCriteria: initialData.exclusionCriteria,
      anyExclusionChecked: initialData.anyExclusionChecked,
      authorizationRationale: initialData.authorizationRationale,
      reasonExplainedToResident: initialData.reasonExplainedToResident,
      typeOfBed: initialData.typeOfBed,
      typeOfMattress: initialData.typeOfMattress,
      typeOfBedrails: initialData.typeOfBedrails,
      safetyChecklist: initialData.safetyChecklist,
      anySafetyCheckFailed: initialData.anySafetyCheckFailed,
      hasExtendedHeightRails: initialData.hasExtendedHeightRails,
      extendedHeightChecks: initialData.extendedHeightChecks,
      consentObtained: initialData.consentObtained,
      carePlanCompleted: initialData.carePlanCompleted,
      signatureOfAssessor: initialData.signatureOfAssessor,
      signatureDate: initialData.signatureDate,
      savedAsDraft: initialData.savedAsDraft,
      createdAt: initialData.createdAt,
    } : {
      residentId,
      teamId,
      organizationId,
      userId,
      residentName: resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : "",
      bedroomNumber: resident?.room_number || "",
      dateOfBirth: resident?.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
      assessmentCompletedBy: userName || "",
      jobRole: "",
      assessmentDate: format(new Date(), "yyyy-MM-dd"),
      alternativeEquipmentConsidered: "",
      reasonsAlternativesNotSuccessful: "",
      exclusionCriteria: {
        residentRefuses: false,
        climbingRisk: false,
        entrapmentRisk: false,
        abnormalBodySize: false,
        restraintPurpose: false,
        freedomLimitation: false,
      },
      anyExclusionChecked: false,
      authorizationRationale: {
        residentRequests: false,
        mdtMeetingCompleted: false,
        riskOutweighsBenefit: false,
        alternativesExplored: false,
        bestInterestDecision: false,
      },
      reasonExplainedToResident: "NO",
      typeOfBed: "DIVAN",
      typeOfMattress: "STANDARD",
      typeOfBedrails: "INTEGRAL_FIXED",
      safetyChecklist: {
        gapBetweenRailAndMattress: "NO",
        mattressCompressesEasily: "NO",
        gapMoreThan60mm: "NO",
        bedRailInsecure: "NO",
        bedAgainstWall: "NO",
      },
      anySafetyCheckFailed: false,
      hasExtendedHeightRails: false,
      extendedHeightChecks: undefined,
      consentObtained: "NO",
      carePlanCompleted: "NO",
      signatureOfAssessor: userName || "",
      signatureDate: format(new Date(), "yyyy-MM-dd"),
      savedAsDraft: false,
    },
  });

  const watchExclusionCriteria = form.watch("exclusionCriteria");
  const watchSafetyChecklist = form.watch("safetyChecklist");
  const watchTypeOfBedrails = form.watch("typeOfBedrails");

  // Auto-calculate anyExclusionChecked
  const checkExclusions = () => {
    const exclusions = form.getValues("exclusionCriteria");
    const anyChecked =
      exclusions.residentRefuses ||
      exclusions.climbingRisk ||
      exclusions.entrapmentRisk ||
      exclusions.abnormalBodySize ||
      exclusions.restraintPurpose ||
      exclusions.freedomLimitation;
    form.setValue("anyExclusionChecked", anyChecked);
  };

  // Auto-calculate anySafetyCheckFailed
  const checkSafety = () => {
    const checks = form.getValues("safetyChecklist");
    const anyFailed =
      checks.gapBetweenRailAndMattress === "YES" ||
      checks.mattressCompressesEasily === "YES" ||
      checks.gapMoreThan60mm === "YES" ||
      checks.bedRailInsecure === "YES" ||
      checks.bedAgainstWall === "YES";
    form.setValue("anySafetyCheckFailed", anyFailed);
  };

  // Auto-set hasExtendedHeightRails
  const checkExtendedRails = () => {
    const bedrailType = form.getValues("typeOfBedrails");
    const hasExtended =
      bedrailType === "EXTENDED_HEIGHT_INTEGRAL" ||
      bedrailType === "EXTENDED_HEIGHT_NON_INTEGRAL";
    form.setValue("hasExtendedHeightRails", hasExtended);

    if (hasExtended && !form.getValues("extendedHeightChecks")) {
      form.setValue("extendedHeightChecks", {
        positionedCorrectly: "NO",
        securelyFastened: "NO",
        correctBumpersInstalled: "NO",
        mattressBelowPlimsollLine: "NO",
        staffTrained: "NO",
        checkedForDamage: "NO",
      });
    } else if (!hasExtended) {
      form.setValue("extendedHeightChecks", undefined);
    }
  };

  const onSubmit = async (data: BedRailsRiskAssessmentFormData) => {
    try {
      setIsSubmitting(true);
      checkExclusions();
      checkSafety();
      checkExtendedRails();

      const formData = form.getValues();

      const payload = {
        resident_id: residentId,
        organization_id: organizationId,
        risks_identified: formData.exclusionCriteria,
        benefits_identified: formData.authorizationRationale,
        alternatives_considered: {
          considered: formData.alternativeEquipmentConsidered,
          reasons: formData.reasonsAlternativesNotSuccessful
        },
        decision: {
          typeOfBed: formData.typeOfBed,
          typeOfMattress: formData.typeOfMattress,
          typeOfBedrails: formData.typeOfBedrails,
          safetyChecklist: formData.safetyChecklist,
          anySafetyCheckFailed: formData.anySafetyCheckFailed,
          hasExtendedHeightRails: formData.hasExtendedHeightRails,
          extendedHeightChecks: formData.extendedHeightChecks,
          consentObtained: formData.consentObtained,
          carePlanCompleted: formData.carePlanCompleted
        },
        completed_by: formData.assessmentCompletedBy,
        assessment_date: formData.assessmentDate,
        created_by: userId
      };

      await submitAssessmentWithVersioning(
        'bedrails_risk_assessments',
        payload,
        initialData,
        !!initialData // Handled by initialData check in the helper
      );

      toast.success("Risk assessment submitted successfully");
      onClose?.();
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast.error("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];

    if (currentStep === 1) {
      fieldsToValidate = [
        "residentName",
        "bedroomNumber",
        "dateOfBirth",
        "assessmentCompletedBy",
        "jobRole",
        "assessmentDate",
        "alternativeEquipmentConsidered",
        "reasonsAlternativesNotSuccessful",
      ];
    } else if (currentStep === 2) {
      fieldsToValidate = [
        "reasonExplainedToResident",
        "typeOfBed",
        "typeOfMattress",
        "typeOfBedrails",
      ];
    }

    const result = await form.trigger(fieldsToValidate as any);
    if (result) {
      if (currentStep === 1) checkExclusions();
      if (currentStep === 2) {
        checkSafety();
        checkExtendedRails();
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Risk Assessment for Use of Bed Rails</h2>
        <div className="text-sm text-muted-foreground">
          Step {currentStep} of 3
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Page 1: Resident & Initial Assessment */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Administrative Details</h3>

                <FormField
                  control={form.control}
                  name="residentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resident&apos;s Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-muted" disabled />
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
                      <FormLabel>Bedroom Number</FormLabel>
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
                          value={
                            field.value
                              ? format(new Date(field.value), "dd MMM yyyy")
                              : ""
                          }
                          className="bg-muted"
                          disabled
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessmentCompletedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Completed By</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-muted" disabled />
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
                      <FormLabel>Job Role</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Senior Care Assistant" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Assessment</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Trial & Rationale</h3>

                <FormField
                  control={form.control}
                  name="alternativeEquipmentConsidered"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternative Equipment Considered/Trialled</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="e.g., low bed, fall out mats, alert mats"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reasonsAlternativesNotSuccessful"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reasons Why Alternatives Have Not Been Successful</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="e.g., trip hazard"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-600">
                  Bedrails CANNOT BE USED if - tick applicable rationale
                </h3>

                <div className="space-y-3 border-l-4 border-red-500 pl-4">
                  <FormField
                    control={form.control}
                    name="exclusionCriteria.residentRefuses"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Resident with capacity refuses
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exclusionCriteria.climbingRisk"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Resident may be at risk of climbing over the bedrails and falling from a greater height
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exclusionCriteria.entrapmentRisk"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          The risk of head or limb entrapment in bedrails outweighs the risk of falling
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exclusionCriteria.abnormalBodySize"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Resident with an abnormally small head or body as this could result in entrapment
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exclusionCriteria.restraintPurpose"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          If the purpose is to restrain Residents who may display erratic, repetitive, or violent movements
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exclusionCriteria.freedomLimitation"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          If the purpose is to limit the freedom of Residents by preventing them from intentionally leaving their bed
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {watchExclusionCriteria &&
                  (watchExclusionCriteria.residentRefuses ||
                    watchExclusionCriteria.climbingRisk ||
                    watchExclusionCriteria.entrapmentRisk ||
                    watchExclusionCriteria.abnormalBodySize ||
                    watchExclusionCriteria.restraintPurpose ||
                    watchExclusionCriteria.freedomLimitation) && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm font-medium text-red-800">
                        ⚠️ If any of the above are highlighted, then bedrails cannot be used and the following sections do not need to be completed.
                      </p>
                      <p className="text-sm text-red-700 mt-2">
                        Please proceed to the signature section if you wish to document this assessment.
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Page 2: Equipment & Safety Check */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-600">
                  Bedrails CAN BE USED if - tick applicable rationale
                </h3>

                <div className="space-y-3 border-l-4 border-green-500 pl-4">
                  <FormField
                    control={form.control}
                    name="authorizationRationale.residentRequests"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Resident with capacity requests bedrails
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="authorizationRationale.mdtMeetingCompleted"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          MDT meeting has taken place and all parties understand the risks involved with bedrails
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="authorizationRationale.riskOutweighsBenefit"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          The risk of injury, falling from bed outweighs the risk of bedrails
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="authorizationRationale.alternativesExplored"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          All other alternatives have been explored and have been unsuccessful
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="authorizationRationale.bestInterestDecision"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Residents who lack capacity have a best interest decision completed
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="reasonExplainedToResident"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Has the reason for using bed rails been explained to the Resident, where appropriate?
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="YES" />
                          </FormControl>
                          <FormLabel className="font-normal">Yes</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="NO" />
                          </FormControl>
                          <FormLabel className="font-normal">No</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">1. Equipment Details</h3>

                <FormField
                  control={form.control}
                  name="typeOfBed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of Bed</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DIVAN">Divan</SelectItem>
                          <SelectItem value="PROFILING_BED">Profiling bed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="typeOfMattress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of Mattress</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="STANDARD">Standard</SelectItem>
                          <SelectItem value="LIGHTWEIGHT_FOAM">Lightweight foam</SelectItem>
                          <SelectItem value="STANDARD_WITH_OVERLAY">Standard mattress with overlay</SelectItem>
                          <SelectItem value="FULL_REPLACEMENT">Full replacement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="typeOfBedrails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of Bedrails</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          checkExtendedRails();
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INTEGRAL_FIXED">Integral – fixed to bed</SelectItem>
                          <SelectItem value="EXTENDED_HEIGHT_INTEGRAL">Extended height (integral)</SelectItem>
                          <SelectItem value="EXTENDED_HEIGHT_NON_INTEGRAL">Extended height (non-integral)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">2. Safety Checklist (Risk of Entrapment)</h3>
                <p className="text-sm text-muted-foreground">
                  If any answer is &quot;Yes&quot;, bed rails should not be used.
                </p>

                <div className="space-y-3">
                  {[
                    {
                      name: "gapBetweenRailAndMattress" as const,
                      label: "Is there a gap between the lower bar of the bed rail and the top of the mattress?"
                    },
                    {
                      name: "mattressCompressesEasily" as const,
                      label: "Does the mattress compress easily at its edge?"
                    },
                    {
                      name: "gapMoreThan60mm" as const,
                      label: "Is there a gap of more than 60mm between the end of the bed rail and headboard or wall?"
                    },
                    {
                      name: "bedRailInsecure" as const,
                      label: "Is the bed rail insecure?"
                    },
                    {
                      name: "bedAgainstWall" as const,
                      label: "Is the bed positioned against a wall?"
                    }
                  ].map((item) => (
                    <FormField
                      key={item.name}
                      control={form.control}
                      name={`safetyChecklist.${item.name}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{item.label}</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex gap-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="YES" />
                                </FormControl>
                                <FormLabel className="font-normal">Yes</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="NO" />
                                </FormControl>
                                <FormLabel className="font-normal">No</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {watchSafetyChecklist &&
                  (watchSafetyChecklist.gapBetweenRailAndMattress === "YES" ||
                    watchSafetyChecklist.mattressCompressesEasily === "YES" ||
                    watchSafetyChecklist.gapMoreThan60mm === "YES" ||
                    watchSafetyChecklist.bedRailInsecure === "YES" ||
                    watchSafetyChecklist.bedAgainstWall === "YES") && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm font-medium text-red-800">
                        ⚠️ One or more safety checks have failed. Bed rails should NOT be used.
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Page 3: Extended Rails & Finalization */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {(watchTypeOfBedrails === "EXTENDED_HEIGHT_INTEGRAL" ||
                watchTypeOfBedrails === "EXTENDED_HEIGHT_NON_INTEGRAL") && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">3. Extended Height Bed Rails</h3>

                    <div className="space-y-3">
                      {[
                        {
                          name: "positionedCorrectly" as const,
                          label: "Is the extended bed rail positioned as far to the head of the bed as possible with a gap of less than 60mm?"
                        },
                        {
                          name: "securelyFastened" as const,
                          label: "Is the extended height bed rail securely fastened to the integrated bed rail?"
                        },
                        {
                          name: "correctBumpersInstalled" as const,
                          label: "Are the correct bumpers installed?"
                        },
                        {
                          name: "mattressBelowPlimsollLine" as const,
                          label: "Does the mattress come below the plimsoll line on the bumper?"
                        },
                        {
                          name: "staffTrained" as const,
                          label: "Have staff been trained how to attach and remove the extended bed rail?"
                        },
                        {
                          name: "checkedForDamage" as const,
                          label: "Has the bed and bed rails been checked for any signs of damage or wear and tear?"
                        }
                      ].map((item) => (
                        <FormField
                          key={item.name}
                          control={form.control}
                          name={`extendedHeightChecks.${item.name}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{item.label}</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex gap-4"
                                >
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="YES" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Yes</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="NO" />
                                    </FormControl>
                                    <FormLabel className="font-normal">No</FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">4. General</h3>

                <FormField
                  control={form.control}
                  name="consentObtained"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Have you obtained consent from the Resident or consulted the NOK as part of the &quot;best interest&quot; decision?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="YES" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="NO" />
                            </FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carePlanCompleted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Have you completed a care plan?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="YES" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="NO" />
                            </FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sign-off</h3>

                <FormField
                  control={form.control}
                  name="signatureOfAssessor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signature of Person Completing Assessment</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-muted" disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="signatureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signature Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {currentStep < 3 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Assessment"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
