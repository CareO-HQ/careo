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
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

interface DietNotificationDialogProps {
  teamId: string;
  residentId: Id<"residents">;
  organizationId: string;
  userId: string;
  resident: any;
  isEditMode?: boolean;
  initialData?: any;
  onClose: () => void;
}

export default function DietNotificationDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  resident,
  isEditMode = false,
  initialData,
  onClose
}: DietNotificationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = authClient.useSession();
  const submitDietNotification = useMutation(api.careFiles.dietNotification.submitDietNotification);

  const form = useForm<z.infer<typeof dietNotificationSchema>>({
    resolver: zodResolver(dietNotificationSchema),
    defaultValues: initialData || {
      residentName: resident?.firstName + " " + resident?.lastName || "",
      roomNumber: resident?.roomNumber || "",
      completedBy: session?.user?.name || "",
      printName: session?.user?.name || "",
      jobRole: "",
      signature: "",
      dateCompleted: Date.now(),
      reviewDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      chokingRiskAssessment: "Low Risk",
      preferredMealSize: "Standard"
    }
  });

  const onSubmit = async (data: z.infer<typeof dietNotificationSchema>) => {
    try {
      setIsSubmitting(true);
      await submitDietNotification({
        residentId,
        teamId,
        organizationId,
        userId,
        ...data,
        savedAsDraft: false
      });
      toast.success("Diet Notification submitted successfully");
      onClose();
    } catch (error) {
      console.error("Error submitting diet notification:", error);
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
          <DialogDescription>
            Complete dietary requirements and specifications for {resident?.firstName} {resident?.lastName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Administrative Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="residentName" render={({ field }) => (
                  <FormItem><FormLabel>Resident Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="roomNumber" render={({ field }) => (
                  <FormItem><FormLabel>Room Number *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="completedBy" render={({ field }) => (
                  <FormItem><FormLabel>Completed By *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="printName" render={({ field }) => (
                  <FormItem><FormLabel>Print Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="jobRole" render={({ field }) => (
                  <FormItem><FormLabel>Job Role *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="signature" render={({ field }) => (
                  <FormItem><FormLabel>Signature *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dietary Preferences & Risks</h3>
              <FormField control={form.control} name="likesFavouriteFoods" render={({ field }) => (
                <FormItem><FormLabel>Likes / Favourite Foods</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dislikes" render={({ field }) => (
                <FormItem><FormLabel>Dislikes</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="foodsToBeAvoided" render={({ field }) => (
                <FormItem><FormLabel>Foods to be Avoided</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="chokingRiskAssessment" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Choking Risk Assessment *</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Low Risk" id="low-risk" />
                        <Label htmlFor="low-risk">Low Risk</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Medium Risk" id="medium-risk" />
                        <Label htmlFor="medium-risk">Medium Risk</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="High Risk" id="high-risk" />
                        <Label htmlFor="high-risk">High Risk</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Meal & Fluid Specifications</h3>
              <FormField control={form.control} name="preferredMealSize" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Preferred Meal Size *</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                      {["Small", "Standard", "Large"].map((size) => (
                        <div key={size} className="flex items-center space-x-2">
                          <RadioGroupItem value={size} id={size.toLowerCase()} />
                          <Label htmlFor={size.toLowerCase()}>{size}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="assistanceRequired" render={({ field }) => (
                <FormItem><FormLabel>Assistance Required</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dietType" render={({ field }) => (
                <FormItem><FormLabel>Diet Type</FormLabel><FormControl><Input {...field} placeholder="e.g., Diabetic, Fortified, Coeliac" /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="space-y-3">
                <Label className="text-base font-medium">Food Consistency (IDDSI Levels)</Label>
                <div className="space-y-2 pl-4">
                  {[
                    { name: "foodConsistencyLevel7Regular", label: "Level 7 - Regular" },
                    { name: "foodConsistencyLevel7EasyChew", label: "Level 7 - Easy Chew" },
                    { name: "foodConsistencyLevel6SoftBiteSized", label: "Level 6 - Soft & Bite Sized" },
                    { name: "foodConsistencyLevel5MincedMoist", label: "Level 5 - Minced & Moist" },
                    { name: "foodConsistencyLevel4Pureed", label: "Level 4 - Pureed" },
                    { name: "foodConsistencyLevel3Liquidised", label: "Level 3 - Liquidised" }
                  ].map(({ name, label }) => (
                    <FormField key={name} control={form.control} name={name as any} render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">{label}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Fluid Consistency (IDDSI Levels)</Label>
                <div className="space-y-2 pl-4">
                  {[
                    { name: "fluidConsistencyLevel4ExtremelyThick", label: "Level 4 - Extremely Thick" },
                    { name: "fluidConsistencyLevel3ModeratelyThick", label: "Level 3 - Moderately Thick" },
                    { name: "fluidConsistencyLevel2MildlyThick", label: "Level 2 - Mildly Thick" },
                    { name: "fluidConsistencyLevel1SlightlyThick", label: "Level 1 - Slightly Thick" },
                    { name: "fluidConsistencyLevel0Thin", label: "Level 0 - Thin" }
                  ].map(({ name, label }) => (
                    <FormField key={name} control={form.control} name={name as any} render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">{label}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>

              <FormField control={form.control} name="fluidRequirements" render={({ field }) => (
                <FormItem><FormLabel>Fluid Requirements</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="foodAllergyOrIntolerance" render={({ field }) => (
                <FormItem><FormLabel>Food Allergy or Intolerance</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Kitchen Review</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="reviewedByCookChef" render={({ field }) => (
                  <FormItem><FormLabel>Reviewed by Cook/Chef (Signature)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="reviewerPrintName" render={({ field }) => (
                  <FormItem><FormLabel>Print Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="reviewerJobTitle" render={({ field }) => (
                  <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
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
