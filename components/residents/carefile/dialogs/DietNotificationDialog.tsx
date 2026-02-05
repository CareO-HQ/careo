"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { dietNotificationSchema } from "@/schemas/residents/care-file/dietNotificationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";

interface DietNotificationDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  resident: any;
  isEditMode?: boolean;
  initialData?: any;
  onClose: () => void;
}

export default function DietNotificationDialog({
  teamId, residentId, organizationId, userId, resident,
  isEditMode = false, initialData, onClose
}: DietNotificationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useProfile();

  const form = useForm<z.infer<typeof dietNotificationSchema>>({
    resolver: zodResolver(dietNotificationSchema),
    defaultValues: initialData ? {
      residentName: initialData.residentName || `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
      roomNumber: initialData.roomNumber || resident.room_number || "",
      completedBy: initialData.completed_by || profile?.name || "",
      printName: initialData.printName || profile?.name || "",
      jobRole: initialData.jobRole || "",
      signature: initialData.signature || "",
      dateCompleted: initialData.dateCompleted || Date.now(),
      reviewDate: initialData.reviewDate || Date.now() + 30 * 24 * 60 * 60 * 1000,
      chokingRiskAssessment: initialData.choking_risk || "Low Risk",
      preferredMealSize: initialData.preferred_meal_size || "Standard",
      // Flatten from JSONB
      likesFavouriteFoods: initialData.dietary_preferences?.likesFavouriteFoods || "",
      dislikes: initialData.dietary_preferences?.dislikes || "",
      foodsToBeAvoided: initialData.dietary_preferences?.foodsToBeAvoided || "",
      dietType: initialData.dietary_preferences?.dietType || "",
      assistanceRequired: initialData.dietary_preferences?.assistanceRequired || "",
      fluidRequirements: initialData.dietary_preferences?.fluidRequirements || "",
      foodAllergyOrIntolerance: initialData.dietary_preferences?.foodAllergyOrIntolerance || "",
      // Food consistency
      foodConsistencyLevel7Regular: initialData.food_consistency?.level7Regular || false,
      foodConsistencyLevel7EasyChew: initialData.food_consistency?.level7EasyChew || false,
      foodConsistencyLevel6SoftBiteSized: initialData.food_consistency?.level6SoftBiteSized || false,
      foodConsistencyLevel5MincedMoist: initialData.food_consistency?.level5MincedMoist || false,
      foodConsistencyLevel4Pureed: initialData.food_consistency?.level4Pureed || false,
      foodConsistencyLevel3Liquidised: initialData.food_consistency?.level3Liquidised || false,
      // Fluid consistency
      fluidConsistencyLevel4ExtremelyThick: initialData.fluid_consistency?.level4ExtremelyThick || false,
      fluidConsistencyLevel3ModeratelyThick: initialData.fluid_consistency?.level3ModeratelyThick || false,
      fluidConsistencyLevel2MildlyThick: initialData.fluid_consistency?.level2MildlyThick || false,
      fluidConsistencyLevel1SlightlyThick: initialData.fluid_consistency?.level1SlightlyThick || false,
      fluidConsistencyLevel0Thin: initialData.fluid_consistency?.level0Thin || false,
      // Kitchen review
      reviewedByCookChef: initialData.kitchen_review?.reviewedByCookChef || "",
      reviewerPrintName: initialData.kitchen_review?.reviewerPrintName || "",
      reviewerJobTitle: initialData.kitchen_review?.reviewerJobTitle || ""
    } : {
      residentName: `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
      roomNumber: resident.room_number || "",
      completedBy: profile?.name || "",
      printName: profile?.name || "",
      jobRole: "", signature: "",
      dateCompleted: Date.now(),
      reviewDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      chokingRiskAssessment: "Low Risk",
      preferredMealSize: "Standard"
    }
  });

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
          reviewerJobTitle: data.reviewerJobTitle
        },
        completed_by: data.completedBy,
        print_name: data.printName,
        job_role: data.jobRole,
        created_by: currentUserId
      };

      if (isEditMode && initialData?.id) {
        const { error } = await supabase.from('diet_notifications').update(payload).eq('id', initialData.id);
        if (error) throw error;
        await supabase.from('manager_audits').insert({
          form_type: 'diet_notifications', form_id: initialData.id, resident_id: residentId,
          audited_by: currentUserId, audit_notes: "Form reviewed", organization_id: organizationId
        });
        toast.success("Diet Notification updated");
      } else {
        const { error } = await supabase.from('diet_notifications').insert(payload);
        if (error) throw error;
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit" : "New"} Diet Notification</DialogTitle>
          <DialogDescription>Complete dietary requirements for {resident?.firstName} {resident?.lastName}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Administrative Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="residentName" render={({ field }) => (<FormItem><FormLabel>Resident Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="roomNumber" render={({ field }) => (<FormItem><FormLabel>Room Number *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="completedBy" render={({ field }) => (<FormItem><FormLabel>Completed By *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="printName" render={({ field }) => (<FormItem><FormLabel>Print Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="jobRole" render={({ field }) => (<FormItem><FormLabel>Job Role *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="signature" render={({ field }) => (<FormItem><FormLabel>Signature *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dietary Preferences & Risks</h3>
              <FormField control={form.control} name="likesFavouriteFoods" render={({ field }) => (<FormItem><FormLabel>Likes / Favourite Foods</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="dislikes" render={({ field }) => (<FormItem><FormLabel>Dislikes</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
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
              <h3 className="text-lg font-semibold">Meal & Fluid Specifications</h3>
              <FormField control={form.control} name="preferredMealSize" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Preferred Meal Size *</FormLabel><FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                    {["Small", "Standard", "Large"].map(size => (
                      <div key={size} className="flex items-center space-x-2"><RadioGroupItem value={size} id={size.toLowerCase()} /><Label htmlFor={size.toLowerCase()}>{size}</Label></div>
                    ))}
                  </RadioGroup>
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dietType" render={({ field }) => (<FormItem><FormLabel>Diet Type</FormLabel><FormControl><Input {...field} placeholder="e.g., Diabetic, Fortified" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="foodAllergyOrIntolerance" render={({ field }) => (<FormItem><FormLabel>Food Allergy or Intolerance</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : isEditMode ? "Update" : "Submit"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
