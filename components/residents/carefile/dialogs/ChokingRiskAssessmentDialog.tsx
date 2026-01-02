"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { z } from "zod";
import { chokingRiskAssessmentSchema, calculateChokingRiskScore, getChokingRiskLevel } from "@/schemas/residents/care-file/chokingRiskAssessmentSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";

interface ChokingRiskAssessmentDialogProps {
  teamId: string;
  residentId: Id<"residents">;
  organizationId: string;
  userId: string;
  resident: {
    firstName: string;
    lastName: string;
    dateOfBirth: number;
  };
  isEditMode?: boolean;
  initialData?: z.infer<typeof chokingRiskAssessmentSchema>;
  onClose: () => void;
}

export default function ChokingRiskAssessmentDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  resident,
  isEditMode = false,
  initialData,
  onClose
}: ChokingRiskAssessmentDialogProps) {
  const [currentScore, setCurrentScore] = useState(0);
  const [currentRiskLevel, setCurrentRiskLevel] = useState("No Risk");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session } = authClient.useSession();
  const submitChokingRiskAssessment = useMutation(api.careFiles.chokingRiskAssessment.submitChokingRiskAssessment);

  const form = useForm<z.infer<typeof chokingRiskAssessmentSchema>>({
    resolver: zodResolver(chokingRiskAssessmentSchema),
    defaultValues: initialData || {
      residentName: `${resident.firstName} ${resident.lastName}`,
      dateOfBirth: new Date(resident.dateOfBirth).toISOString().split("T")[0],
      dateOfAssessment: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
      completedBy: session?.user?.name || "",
      signature: "",

      // All risk factors default to false/unchecked
      weakCough: false,
      chestInfections: false,
      breathingDifficulties: false,
      knownToAspirate: false,
      chokingHistory: false,
      gurgledVoice: false,

      epilepsy: false,
      cerebralPalsy: false,
      dementia: false,
      mentalHealth: false,
      neurologicalConditions: false,
      learningDisabilities: false,

      posturalProblems: false,
      poorHeadControl: false,
      tongueThrust: false,
      chewingDifficulties: false,
      slurredSpeech: false,
      neckTrauma: false,
      poorDentition: false,

      eatsRapidly: false,
      drinksRapidly: false,
      eatsWhileCoughing: false,
      drinksWhileCoughing: false,
      crammingFood: false,
      pocketingFood: false,
      swallowingWithoutChewing: false,
      wouldTakeFood: false,

      drinksIndependently: true,
      eatsIndependently: true
    }
  });

  const watchedValues = form.watch();

  // Recalculate score whenever any checkbox changes
  useEffect(() => {
    const score = calculateChokingRiskScore(watchedValues);
    const riskLevel = getChokingRiskLevel(score);
    setCurrentScore(score);
    setCurrentRiskLevel(riskLevel);
  }, [watchedValues]);

  const onSubmit = async (data: z.infer<typeof chokingRiskAssessmentSchema>) => {
    try {
      setIsSubmitting(true);
      await submitChokingRiskAssessment({
        residentId,
        teamId,
        organizationId,
        userId,
        ...data,
        savedAsDraft: false
      });

      toast.success("Choking Risk Assessment submitted successfully");
      onClose();
    } catch (error) {
      console.error("Error submitting choking risk assessment:", error);
      toast.error("Failed to submit choking risk assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const RiskCheckbox = ({
    name,
    label,
    points
  }: {
    name: keyof z.infer<typeof chokingRiskAssessmentSchema>;
    label: string;
    points: number;
  }) => {
    const value = form.watch(name) as boolean;

    return (
      <div className="flex items-start space-x-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
        <Checkbox
          checked={value || false}
          onCheckedChange={(checked) => form.setValue(name, checked as boolean)}
          id={name}
        />
        <div className="flex-1 flex items-center justify-between">
          <Label htmlFor={name} className="text-sm font-normal cursor-pointer leading-relaxed">
            {label}
          </Label>
          <span className="text-xs text-muted-foreground font-medium ml-2">{points} pts</span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Choking Risk Assessment</DialogTitle>
          <DialogDescription>
            Complete the assessment by checking all applicable risk factors
          </DialogDescription>
        </DialogHeader>

        {/* Score Display - Fixed at top */}
        <div className="mx-6 mb-4 p-4 border-2 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Risk Score</p>
              <p className="text-3xl font-bold mt-1">{currentScore}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">Risk Level</p>
              <p className={`text-xl font-bold mt-1 ${
                currentRiskLevel === "No Risk" ? "text-green-600" :
                currentRiskLevel === "Low Risk" ? "text-blue-600" :
                currentRiskLevel === "Medium Risk" ? "text-yellow-600" :
                currentRiskLevel === "High Risk" ? "text-orange-600" :
                "text-red-600"
              }`}>
                {currentRiskLevel}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="max-h-[calc(90vh-280px)] px-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
            {/* Administrative Information */}
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2">Administrative Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="residentName" className="text-sm">Resident Name</Label>
                  <Input
                    id="residentName"
                    {...form.register("residentName")}
                    disabled
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-sm">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...form.register("dateOfBirth")}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfAssessment" className="text-sm">Date of Assessment</Label>
                  <Input
                    id="dateOfAssessment"
                    type="date"
                    {...form.register("dateOfAssessment")}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    {...form.register("time")}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Respiratory Risks */}
            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2">
                Respiratory Risks
                <span className="text-xs font-normal text-muted-foreground ml-2">(10 points each)</span>
              </h3>
              <RiskCheckbox name="weakCough" label="Weak Cough" points={10} />
              <RiskCheckbox name="chestInfections" label="Chest Infections" points={10} />
              <RiskCheckbox name="breathingDifficulties" label="Breathing Difficulties" points={10} />
              <RiskCheckbox name="knownToAspirate" label="Known to Aspirate" points={10} />
              <RiskCheckbox name="chokingHistory" label="History of Choking" points={10} />
              <RiskCheckbox name="gurgledVoice" label="Gurgled Voice" points={10} />
            </div>

            {/* At Risk Groups */}
            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2">At Risk Groups</h3>
              <RiskCheckbox name="epilepsy" label="Epilepsy" points={4} />
              <RiskCheckbox name="cerebralPalsy" label="Cerebral Palsy" points={10} />
              <RiskCheckbox name="dementia" label="Dementia" points={4} />
              <RiskCheckbox name="mentalHealth" label="Mental Health Conditions" points={4} />
              <RiskCheckbox name="neurologicalConditions" label="Neurological Conditions" points={10} />
              <RiskCheckbox name="learningDisabilities" label="Learning Disabilities" points={10} />
            </div>

            {/* Physical Risks */}
            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2">Physical Risks</h3>
              <RiskCheckbox name="posturalProblems" label="Postural Problems" points={10} />
              <RiskCheckbox name="poorHeadControl" label="Poor Head Control" points={10} />
              <RiskCheckbox name="tongueThrust" label="Tongue Thrust" points={10} />
              <RiskCheckbox name="chewingDifficulties" label="Chewing Difficulties" points={10} />
              <RiskCheckbox name="slurredSpeech" label="Slurred Speech" points={8} />
              <RiskCheckbox name="neckTrauma" label="Neck Trauma" points={8} />
              <RiskCheckbox name="poorDentition" label="Poor Dentition" points={8} />
            </div>

            {/* Eating Behaviours */}
            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2">Eating Behaviours</h3>
              <RiskCheckbox name="eatsRapidly" label="Eats Rapidly" points={10} />
              <RiskCheckbox name="drinksRapidly" label="Drinks Rapidly" points={10} />
              <RiskCheckbox name="eatsWhileCoughing" label="Eats While Coughing" points={10} />
              <RiskCheckbox name="drinksWhileCoughing" label="Drinks While Coughing" points={10} />
              <RiskCheckbox name="crammingFood" label="Cramming Food" points={10} />
              <RiskCheckbox name="pocketingFood" label="Pocketing Food" points={8} />
              <RiskCheckbox name="swallowingWithoutChewing" label="Swallowing Without Chewing" points={8} />
              <RiskCheckbox name="wouldTakeFood" label="Would Take Any Food Offered/Available" points={4} />
            </div>

            {/* Protective Factors */}
            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2">
                Protective Factors
                <span className="text-xs font-normal text-muted-foreground ml-2">(2 points added if NO)</span>
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Check the boxes below if the resident CAN do these independently. Unchecking adds 2 points each.
              </p>
              <RiskCheckbox name="drinksIndependently" label="Drinks Independently" points={-2} />
              <RiskCheckbox name="eatsIndependently" label="Eats Independently" points={-2} />
            </div>

            {/* Completion Details */}
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2">Completion Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="completedBy" className="text-sm">Completed By</Label>
                  <Input
                    id="completedBy"
                    {...form.register("completedBy")}
                    disabled
                    className="text-sm"
                  />
                  {form.formState.errors.completedBy && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.completedBy.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signature" className="text-sm">Signature</Label>
                  <Input
                    id="signature"
                    {...form.register("signature")}
                    placeholder="Signature"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>

        {/* Footer with Action Buttons - Fixed at bottom */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : isEditMode ? "Update Assessment" : "Submit Assessment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
