"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface BedRailsRiskAssessmentDialogProps {
  residentId: string;
  teamId: string;
  organizationId: string;
  userId: string;
  userName?: string;
  resident: any;
  onClose?: () => void;
  initialData?: any;
  isInline?: boolean;
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
  isInline = false,
}: BedRailsRiskAssessmentDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const { supabase } = useSupabase();

  const form = useForm<BedRailsRiskAssessmentFormData>({
    resolver: zodResolver(bedRailsRiskAssessmentSchema) as any,
    mode: "onChange",
    defaultValues: initialData ? {
      residentId: residentId,
      teamId,
      organizationId,
      userId,
      residentName: initialData.residentName || (resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : ""),
      bedroomNumber: initialData.bedroomNumber || resident?.room_number || "",
      dateOfBirth: initialData.dateOfBirth || (resident?.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now()),
      assessmentCompletedBy: initialData.assessmentCompletedBy || initialData.completed_by || (userName || ""),
      jobRole: initialData.jobRole || initialData.job_role || "",
      assessmentDate: initialData.assessmentDate || initialData.date_of_assessment || initialData.assessment_date || format(new Date(), "yyyy-MM-dd"),
      // Map JSONB structures from DB
      alternativeEquipmentConsidered: initialData.alternatives_considered?.considered || initialData.alternativeEquipmentConsidered || "",
      reasonsAlternativesNotSuccessful: initialData.alternatives_considered?.reasons || initialData.reasonsAlternativesNotSuccessful || "",
      exclusionCriteria: initialData.risks_identified || initialData.exclusionCriteria || {
        residentRefuses: false,
        climbingRisk: false,
        entrapmentRisk: false,
        abnormalBodySize: false,
        restraintPurpose: false,
        freedomLimitation: false,
      },
      anyExclusionChecked: initialData.anyExclusionChecked ?? (!!initialData.risks_identified && Object.values(initialData.risks_identified).some((v: any) => v === true)),
      authorizationRationale: initialData.benefits_identified || initialData.authorizationRationale || {
        residentRequests: false,
        mdtMeetingCompleted: false,
        riskOutweighsBenefit: false,
        alternativesExplored: false,
        bestInterestDecision: false,
      },
      reasonExplainedToResident: initialData.decision?.reasonExplainedToResident || initialData.reasonExplainedToResident || "NO",
      typeOfBed: initialData.decision?.typeOfBed || initialData.typeOfBed || "DIVAN",
      typeOfMattress: initialData.decision?.typeOfMattress || initialData.typeOfMattress || "STANDARD",
      typeOfBedrails: initialData.decision?.typeOfBedrails || initialData.typeOfBedrails || "INTEGRAL_FIXED",
      safetyChecklist: initialData.decision?.safetyChecklist || initialData.safetyChecklist || {
        gapBetweenRailAndMattress: "NO",
        mattressCompressesEasily: "NO",
        gapMoreThan60mm: "NO",
        bedRailInsecure: "NO",
        bedAgainstWall: "NO",
      },
      anySafetyCheckFailed: initialData.decision?.anySafetyCheckFailed ?? initialData.anySafetyCheckFailed ?? false,
      hasExtendedHeightRails: initialData.decision?.hasExtendedHeightRails ?? initialData.hasExtendedHeightRails ?? false,
      extendedHeightChecks: initialData.decision?.extendedHeightChecks || initialData.extendedHeightChecks,
      consentObtained: initialData.decision?.consentObtained || initialData.consentObtained || "NO",
      carePlanCompleted: initialData.decision?.carePlanCompleted || initialData.carePlanCompleted || "NO",
      signatureOfAssessor: initialData.signatureOfAssessor || userName || "",
      signatureDate: initialData.signatureDate || format(new Date(), "yyyy-MM-dd"),
      savedAsDraft: initialData.savedAsDraft ?? false,
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

  const checkExclusions = () => {
    const exclusions = form.getValues("exclusionCriteria");
    const anyChecked = Object.values(exclusions).some(val => val === true);
    form.setValue("anyExclusionChecked", anyChecked);
    return anyChecked;
  };

  const checkSafety = () => {
    const checks = form.getValues("safetyChecklist");
    const anyFailed = Object.values(checks).some(val => val === "YES");
    form.setValue("anySafetyCheckFailed", anyFailed);
    return anyFailed;
  };

  const onSubmit = async (data: BedRailsRiskAssessmentFormData) => {
    startTransition(async () => {
      try {
        const anyExclusion = checkExclusions();
        const anySafetyFailed = checkSafety();

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          risks_identified: data.exclusionCriteria,
          benefits_identified: data.authorizationRationale,
          alternatives_considered: {
            considered: data.alternativeEquipmentConsidered,
            reasons: data.reasonsAlternativesNotSuccessful
          },
          decision: {
            typeOfBed: data.typeOfBed,
            typeOfMattress: data.typeOfMattress,
            typeOfBedrails: data.typeOfBedrails,
            safetyChecklist: data.safetyChecklist,
            anySafetyCheckFailed: anySafetyFailed,
            hasExtendedHeightRails: data.hasExtendedHeightRails,
            extendedHeightChecks: data.extendedHeightChecks,
            consentObtained: data.consentObtained,
            carePlanCompleted: data.carePlanCompleted
          },
          completed_by: data.assessmentCompletedBy,
          assessment_date: data.assessmentDate,
          created_by: userId
        };

        await submitAssessmentWithVersioning(
          'bedrails_risk_assessments',
          payload,
          initialData,
          !!initialData
        );

        toast.success("Risk assessment saved successfully");
        onClose?.();
      } catch (error: any) {
        console.error("Error submitting assessment:", error);
        toast.error(error.message || "Failed to submit assessment");
      }
    });
  };

  const exclusionAlert = watchExclusionCriteria && Object.values(watchExclusionCriteria).some(v => v === true);
  const safetyAlert = watchSafetyChecklist && Object.values(watchSafetyChecklist).some(v => v === "YES");

  return (
    <div className="flex flex-col space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Bed Rails Risk Assessment</DialogTitle>
          <DialogDescription>
            Identify risks and necessity for bed rail usage to ensure resident safety.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="space-y-12 pb-20">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
            <button type="submit" id="care-file-submit-btn" className="hidden" />

            {/* Section 1: Administrative */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Administrative Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="residentName" render={({ field }) => (
                  <FormItem><FormLabel>Resident Name</FormLabel><FormControl><Input {...field} className="bg-muted" readOnly /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="bedroomNumber" render={({ field }) => (
                  <FormItem><FormLabel>Bedroom Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="assessmentCompletedBy" render={({ field }) => (
                  <FormItem><FormLabel>Completed By</FormLabel><FormControl><Input {...field} className="bg-muted" readOnly /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="jobRole" render={({ field }) => (
                  <FormItem><FormLabel required>Job Role</FormLabel><FormControl><Input {...field} placeholder="e.g. Registered Nurse" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                  <FormItem><FormLabel required>Date of Assessment</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Section 2: Trials & Alternatives */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Trial & Rationale</h3>
              </div>
              <div className="space-y-6">
                <FormField control={form.control} name="alternativeEquipmentConsidered" render={({ field }) => (
                  <FormItem><FormLabel required>Alternative Equipment Considered/Trialled</FormLabel><FormControl><Textarea {...field} placeholder="e.g., low bed, fall out mats, alert mats" rows={3} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="reasonsAlternativesNotSuccessful" render={({ field }) => (
                  <FormItem><FormLabel required>Reasons Why Alternatives Have Not Been Successful</FormLabel><FormControl><Textarea {...field} placeholder="e.g., trip hazard, resident preference" rows={3} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Section 3: Exclusion Criteria */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Exclusion Criteria (When Rails CANNOT Be Used)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-l-4 border-red-500 pl-6 py-2 bg-red-50/30 rounded-r-xl">
                {[
                  { name: "residentRefuses", label: "Resident with capacity refuses" },
                  { name: "climbingRisk", label: "Risk of climbing over rails" },
                  { name: "entrapmentRisk", label: "Risk of head/limb entrapment" },
                  { name: "abnormalBodySize", label: "Abnormally small body size" },
                  { name: "restraintPurpose", label: "Used for restraint of violent movement" },
                  { name: "freedomLimitation", label: "Used solely to prevent leaving bed" }
                ].map((crit) => (
                  <FormField key={crit.name} control={form.control} name={`exclusionCriteria.${crit.name}` as any} render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0 p-2 hover:bg-red-100/50 rounded-lg transition-colors">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal cursor-pointer">{crit.label}</FormLabel>
                    </FormItem>
                  )} />
                ))}
              </div>
              {exclusionAlert && (
                <div className="p-4 bg-red-100 border border-red-200 rounded-xl text-red-800 text-sm">
                  ⚠️ <strong>Stop:</strong> One or more exclusion criteria are met. Bed rails should <strong>not</strong> be used. You may still save this form to document the decision.
                </div>
              )}
            </div>

            {/* Section 4: Benefits & Authorization */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Benefits & Authorization (When Rails CAN Be Used)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-l-4 border-green-500 pl-6 py-2 bg-green-50/30 rounded-r-xl">
                {[
                  { name: "residentRequests", label: "Resident with capacity requests" },
                  { name: "mdtMeetingCompleted", label: "MDT meeting understands risks" },
                  { name: "riskOutweighsBenefit", label: "Falling risk outweighs rail risk" },
                  { name: "alternativesExplored", label: "All other alternatives unsuccessful" },
                  { name: "bestInterestDecision", label: "Best interest decision (if no capacity)" }
                ].map((auth) => (
                  <FormField key={auth.name} control={form.control} name={`authorizationRationale.${auth.name}` as any} render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0 p-2 hover:bg-green-100/50 rounded-lg transition-colors">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal cursor-pointer">{auth.label}</FormLabel>
                    </FormItem>
                  )} />
                ))}
              </div>
              <FormField control={form.control} name="reasonExplainedToResident" render={({ field }) => (
                <FormItem className="space-y-3 p-4 bg-muted/20 rounded-xl">
                  <FormLabel>Has the reason for using bed rails been explained to the Resident?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                      <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="YES" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="NO" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )} />
            </div>

            {/* Section 5: Equipment */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Equipment Specification</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="typeOfBed" render={({ field }) => (
                  <FormItem><FormLabel>Type of Bed</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="DIVAN">Divan</SelectItem><SelectItem value="PROFILING_BED">Profiling bed</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="typeOfMattress" render={({ field }) => (
                  <FormItem><FormLabel>Type of Mattress</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="STANDARD">Standard</SelectItem><SelectItem value="LIGHTWEIGHT_FOAM">Lightweight foam</SelectItem><SelectItem value="STANDARD_WITH_OVERLAY">Standard with overlay</SelectItem><SelectItem value="FULL_REPLACEMENT">Full replacement</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="typeOfBedrails" render={({ field }) => (
                  <FormItem><FormLabel>Type of Bedrails</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="INTEGRAL_FIXED">Integral – fixed to bed</SelectItem><SelectItem value="EXTENDED_HEIGHT_INTEGRAL">Extended height (integral)</SelectItem><SelectItem value="EXTENDED_HEIGHT_NON_INTEGRAL">Extended height (non-integral)</SelectItem></SelectContent></Select></FormItem>
                )} />
              </div>
            </div>

            {/* Section 6: Safety Checklist */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Safety Checklist (Entrapment Risk)</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { name: "gapBetweenRailAndMattress", label: "Gap between lower bar and top of mattress?" },
                  { name: "mattressCompressesEasily", label: "Does mattress compress easily at edge?" },
                  { name: "gapMoreThan60mm", label: "Gap >60mm between rail and headboard/wall?" },
                  { name: "bedRailInsecure", label: "Is the bed rail insecure?" },
                  { name: "bedAgainstWall", label: "Is the bed positioned against a wall?" }
                ].map((item) => (
                  <FormField key={item.name} control={form.control} name={`safetyChecklist.${item.name}` as any} render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <FormLabel className="max-w-[70%]">{item.label}</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                          <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="YES" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="NO" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )} />
                ))}
              </div>
              {safetyAlert && (
                <div className="p-4 bg-red-100 border border-red-200 rounded-xl text-red-800 text-sm">
                  ⚠️ <strong>Warning:</strong> One or more safety checks failed. Bed rails <strong>not</strong> recommended.
                </div>
              )}
            </div>

            {/* Section 7: Extended Height Checks (Conditional) */}
            {(watchTypeOfBedrails?.includes("EXTENDED")) && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Extended Height Checklist</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "positionedCorrectly", label: "Positioned with gap <60mm to head?" },
                    { name: "securelyFastened", label: "Securely fastened to integral rail?" },
                    { name: "correctBumpersInstalled", label: "Correct bumpers installed?" },
                    { name: "mattressBelowPlimsollLine", label: "Below plimsoll line on bumper?" },
                    { name: "staffTrained", label: "Staff trained on removal/attachment?" },
                    { name: "checkedForDamage", label: "Checked for damage/wear?" }
                  ].map((item) => (
                    <FormField key={item.name} control={form.control} name={`extendedHeightChecks.${item.name}` as any} render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/20">
                        <FormLabel className="max-w-[70%] text-sm">{item.label}</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-3">
                            <FormItem className="flex items-center space-x-1 space-y-0"><FormControl><RadioGroupItem value="YES" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-1 space-y-0"><FormControl><RadioGroupItem value="NO" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>
            )}

            {/* Section 8: Finalization */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">General & Sign-off</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="consentObtained" render={({ field }) => (
                  <FormItem className="p-4 rounded-xl border bg-muted/10">
                    <FormLabel>Obtained consent from Resident or consulted NOK?</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6 mt-2">
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="YES" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="NO" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="carePlanCompleted" render={({ field }) => (
                  <FormItem className="p-4 rounded-xl border bg-muted/10">
                    <FormLabel>Have you completed a care plan?</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6 mt-2">
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="YES" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="NO" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="signatureOfAssessor" render={({ field }) => (
                  <FormItem><FormLabel>Digital Signature (Assessor)</FormLabel><FormControl><Input {...field} className="bg-muted" readOnly /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="signatureDate" render={({ field }) => (
                  <FormItem><FormLabel required>Signature Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

          </form>
        </Form>
      </div>

      {!isInline && (
        <div className="border-t pt-8 flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-6 px-6 pb-2">
          <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading} size="lg">
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} size="lg" className="min-w-[150px]">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              !!initialData ? "Save Changes" : "Save Assessment"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
