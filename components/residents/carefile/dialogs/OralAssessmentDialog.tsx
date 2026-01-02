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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { oralAssessmentSchema } from "@/schemas/residents/care-file/oralAssessmentSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface OralAssessmentDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  careHomeName?: string;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function OralAssessmentDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  careHomeName = "",
  onClose,
  initialData,
  isEditMode = false
}: OralAssessmentDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [assessmentDatePopoverOpen, setAssessmentDatePopoverOpen] = useState(false);

  const submitAssessment = useMutation(
    api.careFiles.oralAssessment.submitOralAssessment
  );
  const submitReviewedFormMutation = useMutation(
    api.managerAudits.submitReviewedForm
  );

  const form = useForm<z.infer<typeof oralAssessmentSchema>>({
    resolver: zodResolver(oralAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          residentId,
          teamId,
          organizationId,
          userId,
          residentName: initialData.residentName || `${resident.firstName} ${resident.lastName}`,
          dateOfBirth: initialData.dateOfBirth || format(new Date(resident.dateOfBirth), "dd/MM/yyyy"),
          weight: initialData.weight || "",
          height: initialData.height || "",
          completedBy: initialData.completedBy || userName,
          signature: initialData.signature || userName,
          assessmentDate: initialData.assessmentDate || Date.now(),
          normalOralHygieneRoutine: initialData.normalOralHygieneRoutine || "",
          isRegisteredWithDentist: initialData.isRegisteredWithDentist || false,
          lastSeenByDentist: initialData.lastSeenByDentist || "",
          dentistName: initialData.dentistName || "",
          dentalPracticeAddress: initialData.dentalPracticeAddress || "",
          contactTelephone: initialData.contactTelephone || "",
          lipsDryCracked: initialData.lipsDryCracked || false,
          lipsDryCrackedCare: initialData.lipsDryCrackedCare || "",
          tongueDryCracked: initialData.tongueDryCracked || false,
          tongueDryCrackedCare: initialData.tongueDryCrackedCare || "",
          tongueUlceration: initialData.tongueUlceration || false,
          tongueUlcerationCare: initialData.tongueUlcerationCare || "",
          hasTopDenture: initialData.hasTopDenture || false,
          topDentureCare: initialData.topDentureCare || "",
          hasLowerDenture: initialData.hasLowerDenture || false,
          lowerDentureCare: initialData.lowerDentureCare || "",
          hasDenturesAndNaturalTeeth: initialData.hasDenturesAndNaturalTeeth || false,
          denturesAndNaturalTeethCare: initialData.denturesAndNaturalTeethCare || "",
          hasNaturalTeeth: initialData.hasNaturalTeeth || false,
          naturalTeethCare: initialData.naturalTeethCare || "",
          evidencePlaqueDebris: initialData.evidencePlaqueDebris || false,
          plaqueDebrisCare: initialData.plaqueDebrisCare || "",
          dryMouth: initialData.dryMouth || false,
          dryMouthCare: initialData.dryMouthCare || "",
          painWhenEating: initialData.painWhenEating || false,
          painWhenEatingCare: initialData.painWhenEatingCare || "",
          gumsUlceration: initialData.gumsUlceration || false,
          gumsUlcerationCare: initialData.gumsUlcerationCare || "",
          difficultySwallowing: initialData.difficultySwallowing || false,
          difficultySwallowingCare: initialData.difficultySwallowingCare || "",
          poorFluidDietaryIntake: initialData.poorFluidDietaryIntake || false,
          poorFluidDietaryIntakeCare: initialData.poorFluidDietaryIntakeCare || "",
          dehydrated: initialData.dehydrated || false,
          dehydratedCare: initialData.dehydratedCare || "",
          speechDifficultyDryMouth: initialData.speechDifficultyDryMouth || false,
          speechDifficultyDryMouthCare: initialData.speechDifficultyDryMouthCare || "",
          speechDifficultyDenturesSlipping: initialData.speechDifficultyDenturesSlipping || false,
          speechDifficultyDenturesSlippingCare: initialData.speechDifficultyDenturesSlippingCare || "",
          dexterityProblems: initialData.dexterityProblems || false,
          dexterityProblemsCare: initialData.dexterityProblemsCare || "",
          cognitiveImpairment: initialData.cognitiveImpairment || false,
          cognitiveImpairmentCare: initialData.cognitiveImpairmentCare || ""
        }
      : {
          residentId,
          teamId,
          organizationId,
          userId,
          residentName: `${resident.firstName} ${resident.lastName}`,
          dateOfBirth: format(new Date(resident.dateOfBirth), "dd/MM/yyyy"),
          weight: "",
          height: "",
          completedBy: userName,
          signature: userName,
          assessmentDate: Date.now(),
          normalOralHygieneRoutine: "",
          isRegisteredWithDentist: false,
          lastSeenByDentist: "",
          dentistName: "",
          dentalPracticeAddress: "",
          contactTelephone: "",
          lipsDryCracked: false,
          lipsDryCrackedCare: "",
          tongueDryCracked: false,
          tongueDryCrackedCare: "",
          tongueUlceration: false,
          tongueUlcerationCare: "",
          hasTopDenture: false,
          topDentureCare: "",
          hasLowerDenture: false,
          lowerDentureCare: "",
          hasDenturesAndNaturalTeeth: false,
          denturesAndNaturalTeethCare: "",
          hasNaturalTeeth: false,
          naturalTeethCare: "",
          evidencePlaqueDebris: false,
          plaqueDebrisCare: "",
          dryMouth: false,
          dryMouthCare: "",
          painWhenEating: false,
          painWhenEatingCare: "",
          gumsUlceration: false,
          gumsUlcerationCare: "",
          difficultySwallowing: false,
          difficultySwallowingCare: "",
          poorFluidDietaryIntake: false,
          poorFluidDietaryIntakeCare: "",
          dehydrated: false,
          dehydratedCare: "",
          speechDifficultyDryMouth: false,
          speechDifficultyDryMouthCare: "",
          speechDifficultyDenturesSlipping: false,
          speechDifficultyDenturesSlippingCare: "",
          dexterityProblems: false,
          dexterityProblemsCare: "",
          cognitiveImpairment: false,
          cognitiveImpairmentCare: ""
        }
  });

  const isRegisteredWithDentist = form.watch("isRegisteredWithDentist");

  function onSubmit(values: z.infer<typeof oralAssessmentSchema>) {
    console.log("Form submission triggered - values:", values);
    startTransition(async () => {
      try {
        if (isEditMode) {
          const data = await submitReviewedFormMutation({
            formType: "oralAssessment",
            formData: {
              ...values,
              residentId: residentId as Id<"residents">,
              savedAsDraft: false
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
            toast.success("Form reviewed and updated successfully!");
          } else {
            toast.success("Form reviewed and approved without changes!");
          }
        } else {
          await submitAssessment({
            ...values,
            residentId: residentId as Id<"residents">,
            savedAsDraft: false
          });
          toast.success("Oral assessment submitted successfully");
        }
        setTimeout(() => {
          onClose?.();
        }, 500);
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment. Please try again.");
      }
    });
  }

  const renderYesNoField = (
    fieldName: string,
    careFieldName: string,
    label: string,
    showValue: boolean
  ) => (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
      <FormField
        control={form.control}
        name={fieldName as any}
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(value) => field.onChange(value === "yes")}
                value={field.value ? "yes" : "no"}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`${fieldName}-yes`} />
                  <label htmlFor={`${fieldName}-yes`} className="text-sm font-normal cursor-pointer">
                    Yes
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`${fieldName}-no`} />
                  <label htmlFor={`${fieldName}-no`} className="text-sm font-normal cursor-pointer">
                    No
                  </label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {showValue && (
        <FormField
          control={form.control}
          name={careFieldName as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Suggested Care</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe suggested care..."
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Oral Assessment</DialogTitle>
        <DialogDescription>
          Complete the oral assessment for the resident
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[70vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Basic Resident Information */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">1. Basic Resident Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="residentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Resident Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                      <FormControl>
                        <Input placeholder="DD/MM/YYYY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Weight</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 70kg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Height</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 170cm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="completedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Name of Person Completing Assessment</FormLabel>
                      <FormControl>
                        <Input placeholder="Staff name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Signature</FormLabel>
                      <FormControl>
                        <Input placeholder="Staff signature" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="assessmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Date of Assessment</FormLabel>
                    <Popover modal open={assessmentDatePopoverOpen} onOpenChange={setAssessmentDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
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
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                        onInteractOutside={(e) => e.preventDefault()}
                      >
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) => {
                            field.onChange(date?.getTime());
                            setAssessmentDatePopoverOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 2: Dental History and Registration */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">2. Dental History and Registration</h3>
              <FormField
                control={form.control}
                name="normalOralHygieneRoutine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>What is the normal oral hygiene routine at home?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the oral hygiene routine..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isRegisteredWithDentist"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Is the resident registered with a Dentist?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(value === "yes")}
                        value={field.value ? "yes" : "no"}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="dentist-yes" />
                          <label htmlFor="dentist-yes" className="text-sm font-normal cursor-pointer">
                            Yes
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="dentist-no" />
                          <label htmlFor="dentist-no" className="text-sm font-normal cursor-pointer">
                            No
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isRegisteredWithDentist && (
                <div className="ml-6 space-y-4 border-l-2 border-muted-foreground/20 pl-4">
                  <FormField
                    control={form.control}
                    name="lastSeenByDentist"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>When was the resident last seen by a Dentist?</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 6 months ago, January 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dentistName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dentist's Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dentalPracticeAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dental Practice Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Full address of dental practice"
                            {...field}
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactTelephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Telephone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Section 3: Physical Oral Examination */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">3. Physical Oral Examination</h3>

              {renderYesNoField(
                "lipsDryCracked",
                "lipsDryCrackedCare",
                "Lips: Dry / Cracked",
                form.watch("lipsDryCracked")
              )}

              {renderYesNoField(
                "tongueDryCracked",
                "tongueDryCrackedCare",
                "Tongue: Dry / Cracked",
                form.watch("tongueDryCracked")
              )}

              {renderYesNoField(
                "tongueUlceration",
                "tongueUlcerationCare",
                "Tongue: Evidence of ulceration/soreness",
                form.watch("tongueUlceration")
              )}

              {renderYesNoField(
                "hasTopDenture",
                "topDentureCare",
                "Dentures: Top Denture?",
                form.watch("hasTopDenture")
              )}

              {renderYesNoField(
                "hasLowerDenture",
                "lowerDentureCare",
                "Dentures: Lower Denture?",
                form.watch("hasLowerDenture")
              )}

              {renderYesNoField(
                "hasDenturesAndNaturalTeeth",
                "denturesAndNaturalTeethCare",
                "Dentures and natural teeth?",
                form.watch("hasDenturesAndNaturalTeeth")
              )}

              {renderYesNoField(
                "hasNaturalTeeth",
                "naturalTeethCare",
                "Teeth: Natural teeth",
                form.watch("hasNaturalTeeth")
              )}

              {renderYesNoField(
                "evidencePlaqueDebris",
                "plaqueDebrisCare",
                "Teeth: Evidence of plaque / debris",
                form.watch("evidencePlaqueDebris")
              )}

              {renderYesNoField(
                "dryMouth",
                "dryMouthCare",
                "Saliva: Dry Mouth",
                form.watch("dryMouth")
              )}
            </div>

            {/* Section 4: Symptoms and Functional Assessment */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">4. Symptoms and Functional Assessment</h3>

              {renderYesNoField(
                "painWhenEating",
                "painWhenEatingCare",
                "Pain: When eating or drinking caused by teeth/dentures",
                form.watch("painWhenEating")
              )}

              {renderYesNoField(
                "gumsUlceration",
                "gumsUlcerationCare",
                "Gums / Soft tissue: Evidence of soreness/ulceration",
                form.watch("gumsUlceration")
              )}

              {renderYesNoField(
                "difficultySwallowing",
                "difficultySwallowingCare",
                "Swallowing: Difficulty with swallowing",
                form.watch("difficultySwallowing")
              )}

              {renderYesNoField(
                "poorFluidDietaryIntake",
                "poorFluidDietaryIntakeCare",
                "Nutrition: Fluid/dietary intake poor",
                form.watch("poorFluidDietaryIntake")
              )}

              {renderYesNoField(
                "dehydrated",
                "dehydratedCare",
                "Nutrition: Dehydrated",
                form.watch("dehydrated")
              )}

              {renderYesNoField(
                "speechDifficultyDryMouth",
                "speechDifficultyDryMouthCare",
                "Speech Difficulty: Due to dry mouth?",
                form.watch("speechDifficultyDryMouth")
              )}

              {renderYesNoField(
                "speechDifficultyDenturesSlipping",
                "speechDifficultyDenturesSlippingCare",
                "Speech Difficulty: Due to dentures slipping when speaking",
                form.watch("speechDifficultyDenturesSlipping")
              )}

              {renderYesNoField(
                "dexterityProblems",
                "dexterityProblemsCare",
                "Dexterity problems: Having difficulty or unable to hold a toothbrush",
                form.watch("dexterityProblems")
              )}

              {renderYesNoField(
                "cognitiveImpairment",
                "cognitiveImpairmentCare",
                "Cognitive function: Evidence of short-term memory loss/confusion",
                form.watch("cognitiveImpairment")
              )}
            </div>
          </form>
        </Form>
      </div>
      <DialogFooter>
        <Button onClick={onClose} variant="outline" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Saving..." : "Save Assessment"}
        </Button>
      </DialogFooter>
    </>
  );
}
