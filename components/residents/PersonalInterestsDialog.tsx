"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

const PersonalInterestsSchema = z.object({
  mainInterests: z.array(z.object({ value: z.string().min(1, "Interest is required") })).optional(),
  hobbies: z.array(z.object({ value: z.string().min(1, "Hobby is required") })).optional(),
  socialPreferences: z.array(z.object({ value: z.string().min(1, "Preference is required") })).optional(),
  favoriteActivities: z.array(z.object({ value: z.string().min(1, "Activity is required") })).optional(),
});

type PersonalInterestsFormData = z.infer<typeof PersonalInterestsSchema>;

interface PersonalInterestsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: string;
  residentName: string;
  organizationId: string;
  createdBy: string;
  existingData?: {
    mainInterests?: string[];
    hobbies?: string[];
    socialPreferences?: string[];
    favoriteActivities?: string[];
  };
}

export function PersonalInterestsDialog({
  isOpen,
  onOpenChange,
  residentId,
  residentName,
  organizationId,
  createdBy,
  existingData,
}: PersonalInterestsDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(1);
  const createOrUpdateMutation = useMutation(api.personalInterests.createOrUpdatePersonalInterests);

  const form = useForm<PersonalInterestsFormData>({
    resolver: zodResolver(PersonalInterestsSchema),
    defaultValues: {
      mainInterests: existingData?.mainInterests?.map(v => ({ value: v })) || [{ value: "" }],
      hobbies: existingData?.hobbies?.map(v => ({ value: v })) || [{ value: "" }],
      socialPreferences: existingData?.socialPreferences?.map(v => ({ value: v })) || [{ value: "" }],
      favoriteActivities: existingData?.favoriteActivities?.map(v => ({ value: v })) || [{ value: "" }],
    },
  });

  const { fields: mainInterestsFields, append: appendMainInterest, remove: removeMainInterest } = useFieldArray({
    control: form.control,
    name: "mainInterests",
  });

  const { fields: hobbiesFields, append: appendHobby, remove: removeHobby } = useFieldArray({
    control: form.control,
    name: "hobbies",
  });

  const { fields: socialPreferencesFields, append: appendSocialPreference, remove: removeSocialPreference } = useFieldArray({
    control: form.control,
    name: "socialPreferences",
  });

  const { fields: favoriteActivitiesFields, append: appendFavoriteActivity, remove: removeFavoriteActivity } = useFieldArray({
    control: form.control,
    name: "favoriteActivities",
  });

  const onSubmit = async (values: PersonalInterestsFormData) => {
    // Prevent submission if not on the final step
    if (currentStep !== 2) {
      return;
    }

    setIsLoading(true);
    try {
      // Filter out empty values
      const mainInterests = values.mainInterests?.map(i => i.value).filter(v => v.trim() !== "") || [];
      const hobbies = values.hobbies?.map(h => h.value).filter(v => v.trim() !== "") || [];
      const socialPreferences = values.socialPreferences?.map(s => s.value).filter(v => v.trim() !== "") || [];
      const favoriteActivities = values.favoriteActivities?.map(a => a.value).filter(v => v.trim() !== "") || [];

      await createOrUpdateMutation({
        residentId: residentId as Id<"residents">,
        mainInterests: mainInterests.length > 0 ? mainInterests : undefined,
        hobbies: hobbies.length > 0 ? hobbies : undefined,
        socialPreferences: socialPreferences.length > 0 ? socialPreferences : undefined,
        favoriteActivities: favoriteActivities.length > 0 ? favoriteActivities : undefined,
        organizationId,
        createdBy,
      });

      toast.success(existingData ? "Personal interests updated successfully" : "Personal interests saved successfully");
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save personal interests");
      console.error("Error saving personal interests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setCurrentStep(1);
          // Reset form to current existing data or defaults when closing
          if (existingData) {
            form.reset({
              mainInterests: existingData.mainInterests?.map(v => ({ value: v })) || [{ value: "" }],
              hobbies: existingData.hobbies?.map(v => ({ value: v })) || [{ value: "" }],
              socialPreferences: existingData.socialPreferences?.map(v => ({ value: v })) || [{ value: "" }],
              favoriteActivities: existingData.favoriteActivities?.map(v => ({ value: v })) || [{ value: "" }],
            });
          } else {
            form.reset({
              mainInterests: [{ value: "" }],
              hobbies: [{ value: "" }],
              socialPreferences: [{ value: "" }],
              favoriteActivities: [{ value: "" }],
            });
          }
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{existingData ? 'Edit' : 'Add'} Personal Interests for {residentName}</DialogTitle>
          <DialogDescription>
            Step {currentStep} of 2: {currentStep === 1 ? 'Interests & Hobbies' : 'Social Preferences & Summary'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Main Interests & Hobbies */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Main Interests */}
                <div className="space-y-3">
                  <FormLabel>Main Interests</FormLabel>
                  {mainInterestsFields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name={`mainInterests.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="e.g., Reading, Classical Music" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeMainInterest(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendMainInterest({ value: "" })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Interest
                  </Button>
                </div>

                {/* Hobbies */}
                <div className="space-y-3">
                  <FormLabel>Hobbies</FormLabel>
                  {hobbiesFields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name={`hobbies.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="e.g., Knitting, Bird Watching" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeHobby(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendHobby({ value: "" })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Hobby
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Social Preferences & Favorite Activities */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Social Preferences */}
                <div className="space-y-3">
                  <FormLabel>Social Preferences</FormLabel>
                  {socialPreferencesFields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name={`socialPreferences.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="e.g., Small Groups, Morning Sessions" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSocialPreference(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendSocialPreference({ value: "" })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Preference
                  </Button>
                </div>

                {/* Favorite Activities */}
                <div className="space-y-3">
                  <FormLabel>Favorite Activities</FormLabel>
                  {favoriteActivitiesFields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name={`favoriteActivities.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="e.g., Bingo, Music Therapy" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeFavoriteActivity(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendFavoriteActivity({ value: "" })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Activity
                  </Button>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    {(() => {
                      const formValues = form.watch();
                      const interests = formValues.mainInterests?.filter(i => i.value.trim() !== "").length || 0;
                      const hobbies = formValues.hobbies?.filter(h => h.value.trim() !== "").length || 0;
                      const preferences = formValues.socialPreferences?.filter(s => s.value.trim() !== "").length || 0;
                      const activities = formValues.favoriteActivities?.filter(a => a.value.trim() !== "").length || 0;

                      return (
                        <>
                          {interests > 0 && <p>Main Interests: {interests} item{interests !== 1 ? 's' : ''}</p>}
                          {hobbies > 0 && <p>Hobbies: {hobbies} item{hobbies !== 1 ? 's' : ''}</p>}
                          {preferences > 0 && <p>Social Preferences: {preferences} item{preferences !== 1 ? 's' : ''}</p>}
                          {activities > 0 && <p>Favorite Activities: {activities} item{activities !== 1 ? 's' : ''}</p>}
                          {interests === 0 && hobbies === 0 && preferences === 0 && activities === 0 && (
                            <p className="text-muted-foreground italic">No items added yet</p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>

                {currentStep < 2 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      // Only submit when explicitly clicking save
                      form.handleSubmit(onSubmit)();
                    }}
                  >
                    {isLoading ? "Saving..." : existingData ? "Update Personal Interests" : "Save Personal Interests"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
