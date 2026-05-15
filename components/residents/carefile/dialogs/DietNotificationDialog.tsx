"use client";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { dietNotificationSchema } from "@/schemas/residents/care-file/dietNotificationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import NextReviewDateField from "./NextReviewDateField";

interface DietNotificationDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  resident: any;
  isEditMode?: boolean;
  initialData?: any;
  onClose: () => void;
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function DietNotificationDialog({
  teamId, residentId, organizationId, userId, resident,
  isEditMode = false, initialData, onClose, isInline = false, viewOnly = false
}: DietNotificationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useProfile();

  const isMissingColumn = (error: any) => {
    const message = String(error?.message ?? "").toLowerCase();
    const code = String(error?.code ?? "");
    const cause = (error?.cause ?? null) as { message?: string; code?: string } | null;
    const causeMessage = String(cause?.message ?? "").toLowerCase();
    const causeCode = String(cause?.code ?? "");

    const hasMissingColumnMessage =
      message.includes("next_review_date") ||
      message.includes("assessment_data") ||
      causeMessage.includes("next_review_date") ||
      causeMessage.includes("assessment_data");

    const hasKnownMissingColumnCode =
      code === "PGRST204" ||
      code === "42703" ||
      causeCode === "PGRST204" ||
      causeCode === "42703";

    // Wrapped errors from submitAssessmentWithVersioning may keep the real code in error.cause
    // and include only message text at top level.
    return hasMissingColumnMessage && (hasKnownMissingColumnCode || message.includes("schema cache") || causeMessage.includes("schema cache"));
  };

  const removeMissingColumnsFromPayload = (
    error: any,
    targetPayload: {
      next_review_date?: string | null;
      assessment_data?: z.infer<typeof dietNotificationSchema>;
    }
  ): boolean => {
    const message = String(error?.message ?? "").toLowerCase();
    const causeMessage = String(error?.cause?.message ?? "").toLowerCase();
    let changed = false;

    const mentionsNextReviewDate =
      message.includes("next_review_date") || causeMessage.includes("next_review_date");
    const mentionsAssessmentData =
      message.includes("assessment_data") || causeMessage.includes("assessment_data");

    if (mentionsNextReviewDate && "next_review_date" in targetPayload) {
      delete targetPayload.next_review_date;
      changed = true;
    }
    if (mentionsAssessmentData && "assessment_data" in targetPayload) {
      delete targetPayload.assessment_data;
      changed = true;
    }

    return changed;
  };

  const form = useForm<z.infer<typeof dietNotificationSchema>>({
    resolver: zodResolver(dietNotificationSchema) as any,
    defaultValues: initialData ? {
      residentId: initialData.assessment_data?.residentId || initialData.residentId || initialData.resident_id || residentId,
      teamId: initialData.assessment_data?.teamId || initialData.teamId || initialData.team_id || teamId,
      organizationId: initialData.assessment_data?.organizationId || initialData.organizationId || initialData.organization_id || organizationId,
      userId: initialData.assessment_data?.userId || initialData.userId || initialData.user_id || initialData.created_by || userId,
      residentName: initialData.assessment_data?.residentName || initialData.residentName || `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
      roomNumber: initialData.assessment_data?.roomNumber || initialData.roomNumber || resident.room_number || "",
      completedBy: initialData.assessment_data?.completedBy || initialData.completed_by || profile?.name || "",
      printName: initialData.assessment_data?.printName || initialData.printName || profile?.name || "",
      jobRole: initialData.assessment_data?.jobRole || initialData.jobRole || profile?.role || "",
      signature: initialData.assessment_data?.signature || initialData.signature || "",
      dateCompleted: initialData.assessment_data?.dateCompleted || initialData.date_completed || initialData.dateCompleted || Date.now(),
      reviewDate: initialData.assessment_data?.reviewDate || initialData.review_date || initialData.reviewDate || Date.now() + 30 * 24 * 60 * 60 * 1000,
      nextReviewDate:
        initialData.assessment_data?.nextReviewDate ||
        initialData.next_review_date ||
        initialData.kitchen_review?.nextReviewDate ||
        "",
      chokingRiskAssessment: initialData.assessment_data?.chokingRiskAssessment || initialData.choking_risk || "Low Risk",
      preferredMealSize: initialData.assessment_data?.preferredMealSize || initialData.preferred_meal_size || "Standard",
      // Flatten from JSONB
      likesFavouriteFoods: initialData.assessment_data?.likesFavouriteFoods || initialData.dietary_preferences?.likesFavouriteFoods || "",
      dislikes: initialData.assessment_data?.dislikes || initialData.dietary_preferences?.dislikes || "",
      foodsToBeAvoided: initialData.assessment_data?.foodsToBeAvoided || initialData.dietary_preferences?.foodsToBeAvoided || "",
      dietType: initialData.assessment_data?.dietType || initialData.dietary_preferences?.dietType || "",
      assistanceRequired: initialData.assessment_data?.assistanceRequired || initialData.dietary_preferences?.assistanceRequired || "",
      fluidRequirements: initialData.assessment_data?.fluidRequirements || initialData.dietary_preferences?.fluidRequirements || "",
      foodAllergyOrIntolerance: initialData.assessment_data?.foodAllergyOrIntolerance || initialData.dietary_preferences?.foodAllergyOrIntolerance || "",
      // Food consistency
      foodConsistencyLevel7Regular: initialData.assessment_data?.foodConsistencyLevel7Regular ?? initialData.food_consistency?.level7Regular ?? false,
      foodConsistencyLevel7EasyChew: initialData.assessment_data?.foodConsistencyLevel7EasyChew ?? initialData.food_consistency?.level7EasyChew ?? false,
      foodConsistencyLevel6SoftBiteSized: initialData.assessment_data?.foodConsistencyLevel6SoftBiteSized ?? initialData.food_consistency?.level6SoftBiteSized ?? false,
      foodConsistencyLevel5MincedMoist: initialData.assessment_data?.foodConsistencyLevel5MincedMoist ?? initialData.food_consistency?.level5MincedMoist ?? false,
      foodConsistencyLevel4Pureed: initialData.assessment_data?.foodConsistencyLevel4Pureed ?? initialData.food_consistency?.level4Pureed ?? false,
      foodConsistencyLevel3Liquidised: initialData.assessment_data?.foodConsistencyLevel3Liquidised ?? initialData.food_consistency?.level3Liquidised ?? false,
      // Fluid consistency
      fluidConsistencyLevel4ExtremelyThick: initialData.assessment_data?.fluidConsistencyLevel4ExtremelyThick ?? initialData.fluid_consistency?.level4ExtremelyThick ?? false,
      fluidConsistencyLevel3ModeratelyThick: initialData.assessment_data?.fluidConsistencyLevel3ModeratelyThick ?? initialData.fluid_consistency?.level3ModeratelyThick ?? false,
      fluidConsistencyLevel2MildlyThick: initialData.assessment_data?.fluidConsistencyLevel2MildlyThick ?? initialData.fluid_consistency?.level2MildlyThick ?? false,
      fluidConsistencyLevel1SlightlyThick: initialData.assessment_data?.fluidConsistencyLevel1SlightlyThick ?? initialData.fluid_consistency?.level1SlightlyThick ?? false,
      fluidConsistencyLevel0Thin: initialData.assessment_data?.fluidConsistencyLevel0Thin ?? initialData.fluid_consistency?.level0Thin ?? false,
      // Kitchen review
      reviewedByCookChef: initialData.assessment_data?.reviewedByCookChef || initialData.kitchen_review?.reviewedByCookChef || "",
      reviewerPrintName: initialData.assessment_data?.reviewerPrintName || initialData.kitchen_review?.reviewerPrintName || "",
      reviewerJobTitle: initialData.assessment_data?.reviewerJobTitle || initialData.kitchen_review?.reviewerJobTitle || "",
      reviewerSignature: initialData.assessment_data?.reviewerSignature || initialData.kitchen_review?.reviewerSignature || "",
      reviewerDate: initialData.assessment_data?.reviewerDate || initialData.kitchen_review?.reviewerDate || Date.now()
    } : {
      residentName: `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
      roomNumber: resident.room_number || "",
      completedBy: profile?.name || "",
      printName: profile?.name || "",
      jobRole: profile?.role || "",
      signature: "",
      dateCompleted: Date.now(),
      reviewDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      nextReviewDate: "",
      chokingRiskAssessment: "Low Risk",
      preferredMealSize: "Standard",
      likesFavouriteFoods: "",
      dislikes: "",
      foodsToBeAvoided: "",
      dietType: "",
      assistanceRequired: "",
      fluidRequirements: "",
      foodAllergyOrIntolerance: "",
      foodConsistencyLevel7Regular: false,
      foodConsistencyLevel7EasyChew: false,
      foodConsistencyLevel6SoftBiteSized: false,
      foodConsistencyLevel5MincedMoist: false,
      foodConsistencyLevel4Pureed: false,
      foodConsistencyLevel3Liquidised: false,
      fluidConsistencyLevel4ExtremelyThick: false,
      fluidConsistencyLevel3ModeratelyThick: false,
      fluidConsistencyLevel2MildlyThick: false,
      fluidConsistencyLevel1SlightlyThick: false,
      fluidConsistencyLevel0Thin: false,
      reviewedByCookChef: "",
      reviewerPrintName: "",
      reviewerJobTitle: "",
      reviewerSignature: "",
      reviewerDate: Date.now()
    }
  });

  // Autofill completion details when profile loads
  useEffect(() => {
    if (profile) {
      if (!form.getValues("completedBy")) {
        form.setValue("completedBy", profile.name || "");
      }
      if (!form.getValues("printName")) {
        form.setValue("printName", profile.name || "");
      }
      if (!form.getValues("jobRole")) {
        form.setValue("jobRole", profile.role || "");
      }
    }
  }, [profile, form]);

  const renderInput = (field: any, props: any = {}) => viewOnly ? (
    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[40px]">
      {field.value || " "}
    </div>
  ) : <Input {...field} {...props} />;

  const renderTextarea = (field: any, props: any = {}) => viewOnly ? (
    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[40px]">
      {field.value || " "}
    </div>
  ) : <Textarea {...field} {...props} />;

  const renderDate = (field: any) => viewOnly ? (
    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[40px]">
      {field.value ? new Date(field.value).toLocaleDateString('en-GB') : " "}
    </div>
  ) : (
    <Input type="date" value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).getTime() : Date.now())} />
  );

  const onSubmit = async (data: z.infer<typeof dietNotificationSchema>) => {
    try {
      setIsSubmitting(true);
      const currentUserId = userId;
      if (!currentUserId) throw new Error("User not authenticated");

      const payload = {
        resident_id: residentId,
        organization_id: organizationId,
        choking_risk: data.chokingRiskAssessment,
        preferred_meal_size: data.preferredMealSize,
        dietary_preferences: {
          likesFavouriteFoods: data.likesFavouriteFoods,
          dislikes: data.dislikes,
          foodsToBeAvoided: data.foodsToBeAvoided,
          dietType: data.dietType,
          assistanceRequired: data.assistanceRequired,
          fluidRequirements: data.fluidRequirements,
          foodAllergyOrIntolerance: data.foodAllergyOrIntolerance
        },
        food_consistency: {
          level7Regular: data.foodConsistencyLevel7Regular,
          level7EasyChew: data.foodConsistencyLevel7EasyChew,
          level6SoftBiteSized: data.foodConsistencyLevel6SoftBiteSized,
          level5MincedMoist: data.foodConsistencyLevel5MincedMoist,
          level4Pureed: data.foodConsistencyLevel4Pureed,
          level3Liquidised: data.foodConsistencyLevel3Liquidised
        },
        fluid_consistency: {
          level4ExtremelyThick: data.fluidConsistencyLevel4ExtremelyThick,
          level3ModeratelyThick: data.fluidConsistencyLevel3ModeratelyThick,
          level2MildlyThick: data.fluidConsistencyLevel2MildlyThick,
          level1SlightlyThick: data.fluidConsistencyLevel1SlightlyThick,
          level0Thin: data.fluidConsistencyLevel0Thin
        },
        kitchen_review: {
          reviewedByCookChef: data.reviewedByCookChef,
          reviewerPrintName: data.reviewerPrintName,
          reviewerJobTitle: data.reviewerJobTitle,
          reviewerSignature: data.reviewerSignature,
          reviewerDate: data.reviewerDate,
          nextReviewDate: data.nextReviewDate || null
        },
        completed_by: data.completedBy,
        print_name: data.printName,
        job_role: data.jobRole,
        signature: data.signature,
        team_id: teamId,
        created_by: currentUserId,
        next_review_date: data.nextReviewDate || null,
        assessment_data: data
      };

      try {
        await submitAssessmentWithVersioning(
          'diet_notifications',
          payload,
          initialData,
          isEditMode
        );
      } catch (error: any) {
        if (isMissingColumn(error)) {
          const fallbackPayload: typeof payload = { ...payload };
          const changed = removeMissingColumnsFromPayload(error, fallbackPayload);
          if (!changed) {
            throw error;
          }

          try {
            await submitAssessmentWithVersioning(
              'diet_notifications',
              fallbackPayload,
              initialData,
              isEditMode
            );
          } catch (retryError: any) {
            if (!isMissingColumn(retryError)) {
              throw retryError;
            }

            const secondFallbackPayload: typeof payload = { ...fallbackPayload };
            const secondChanged = removeMissingColumnsFromPayload(retryError, secondFallbackPayload);
            if (!secondChanged) {
              throw retryError;
            }

            await submitAssessmentWithVersioning(
              'diet_notifications',
              secondFallbackPayload,
              initialData,
              isEditMode
            );
          }
        } else {
          throw error;
        }
      }

      if (isEditMode && initialData?.id) {
        await supabase.from('manager_audits').insert({
          form_type: 'diet_notifications', form_id: initialData.id, resident_id: residentId,
          audited_by: currentUserId, audit_notes: "Form reviewed", organization_id: organizationId
        });
        toast.success("Diet Notification updated");
      } else {
        toast.success("Diet Notification submitted");
      }
      onClose();
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Failed to submit diet notification");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit" : "New"} Diet Notification</DialogTitle>
          <DialogDescription>Complete dietary requirements for {resident?.first_name} {resident?.last_name}</DialogDescription>
        </DialogHeader>
      )}

      <Form {...form}>
        <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
            <div className="mb-6 p-4 border rounded-lg bg-muted/40">
              <FormField
                control={form.control}
                name="nextReviewDate"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormControl>
                      <NextReviewDateField
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={viewOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <button
              type="button"
              id="care-file-submit-btn"
              className="hidden"
              onClick={form.handleSubmit(onSubmit, (errors) => {
                console.error("Diet Notification form errors:", errors);
                toast.error("Please fill in all required fields correctly.");
              })}
            />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Administrative Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="residentName" render={({ field }) => (<FormItem><FormLabel>Resident Name *</FormLabel><FormControl>{renderInput(field)}</FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="roomNumber" render={({ field }) => (<FormItem><FormLabel>Room Number *</FormLabel><FormControl>{renderInput(field)}</FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="completedBy" render={({ field }) => (<FormItem><FormLabel>Completed By *</FormLabel><FormControl>{renderInput(field)}</FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="printName" render={({ field }) => (<FormItem><FormLabel>Print Name *</FormLabel><FormControl>{renderInput(field)}</FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="jobRole" render={({ field }) => (<FormItem><FormLabel>Job Role *</FormLabel><FormControl>{renderInput(field)}</FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="signature" render={({ field }) => (<FormItem><FormLabel>Signature *</FormLabel><FormControl>{renderInput(field)}</FormControl><FormMessage /></FormItem>)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dietary Preferences &amp; Risks</h3>
              <FormField control={form.control} name="likesFavouriteFoods" render={({ field }) => (<FormItem><FormLabel>Likes / Favourite Foods</FormLabel><FormControl>{renderTextarea(field, { rows: 2 })}</FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="dislikes" render={({ field }) => (<FormItem><FormLabel>Dislikes</FormLabel><FormControl>{renderTextarea(field, { rows: 2 })}</FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="foodsToBeAvoided" render={({ field }) => (<FormItem><FormLabel>Foods to be avoided (eg due to medication, alcohol not allowed)</FormLabel><FormControl>{renderTextarea(field, { rows: 2 })}</FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="chokingRiskAssessment" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Choking Risk *</FormLabel><FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                    {["Low Risk", "Medium Risk", "High Risk"].map(risk => (
                      <div key={risk} className="flex items-center space-x-2"><RadioGroupItem value={risk} id={risk.toLowerCase().replace(' ', '-')} /><Label htmlFor={risk.toLowerCase().replace(' ', '-')}>{risk}</Label></div>
                    ))}
                  </RadioGroup>
                </FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Meal &amp; Fluid Specifications</h3>
              <FormField control={form.control} name="preferredMealSize" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Preferred Meal Size *</FormLabel><FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                    {["Small", "Standard", "Large"].map(size => (
                      <div key={size} className="flex items-center space-x-2"><RadioGroupItem value={size} id={size.toLowerCase()} /><Label htmlFor={size.toLowerCase()}>{size}</Label></div>
                    ))}
                  </RadioGroup>
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dietType" render={({ field }) => (<FormItem><FormLabel>Diet Type</FormLabel><FormControl>{renderInput(field, { placeholder: "e.g., Diabetic, Fortified" })}</FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="foodAllergyOrIntolerance" render={({ field }) => (<FormItem><FormLabel>Food Allergy or Intolerance</FormLabel><FormControl>{renderTextarea(field, { rows: 2 })}</FormControl><FormMessage /></FormItem>)} />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Food &amp; Fluid Consistency</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mb-2">FOOD CONSISTENCY</h4>
                  <FormField control={form.control} name="foodConsistencyLevel7Regular" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 7 Regular</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="foodConsistencyLevel7EasyChew" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 7 Easy Chew</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="foodConsistencyLevel6SoftBiteSized" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 6 Soft &amp; BiteSized</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="foodConsistencyLevel5MincedMoist" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 5 Minced &amp; Moist</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="foodConsistencyLevel4Pureed" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 4 Pureed</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="foodConsistencyLevel3Liquidised" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 3 Liquidised</FormLabel></FormItem>
                  )} />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mb-2">FLUID CONSISTENCY</h4>
                  <FormField control={form.control} name="fluidConsistencyLevel4ExtremelyThick" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 4 Extremely Thick</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="fluidConsistencyLevel3ModeratelyThick" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 3 Moderately Thick</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="fluidConsistencyLevel2MildlyThick" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 2 Mildly Thick</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="fluidConsistencyLevel1SlightlyThick" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 1 Slightly Thick</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="fluidConsistencyLevel0Thin" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Level 0 Thin</FormLabel></FormItem>
                  )} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Kitchen Review</h3>
              <p className="text-sm text-muted-foreground">Reviewed by Cook/Chef and copy retained in Residents care file kitchen</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="reviewerPrintName" render={({ field }) => (<FormItem><FormLabel>Print Name</FormLabel><FormControl>{renderInput(field)}</FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="reviewerJobTitle" render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl>{renderInput(field)}</FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="reviewerSignature" render={({ field }) => (<FormItem><FormLabel>Signature (optional)</FormLabel><FormControl>{renderInput(field)}</FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="reviewerDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      {renderDate(field)}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          </form>
        </fieldset>
      </Form>

      {!isInline && !viewOnly && (
        <div className="flex items-center justify-end gap-3 pt-6 border-t sticky bottom-0 bg-background/80 backdrop-blur-sm py-4">
          <Button type="button" variant="outline" onClick={() => onClose?.()} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>{isSubmitting ? "Submitting..." : isEditMode ? "Update" : "Submit"}</Button>
        </div>
      )}
    </>
  );
}
