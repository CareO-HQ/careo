"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { z } from "zod";
import { cornellDepressionScaleSchema, calculateCornellScore, getDepressionSeverity, getSeverityColor } from "@/schemas/residents/care-file/cornellDepressionScaleSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";

interface CornellDepressionScaleDialogProps {
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
  initialData?: z.infer<typeof cornellDepressionScaleSchema>;
  onClose: () => void;
}

export default function CornellDepressionScaleDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  resident,
  isEditMode = false,
  initialData,
  onClose
}: CornellDepressionScaleDialogProps) {
  const [currentScore, setCurrentScore] = useState(0);
  const [currentSeverity, setCurrentSeverity] = useState("No Depression");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session } = authClient.useSession();
  const submitCornellScale = useMutation(api.careFiles.cornellDepressionScale.submitCornellDepressionScale);

  const form = useForm<z.infer<typeof cornellDepressionScaleSchema>>({
    resolver: zodResolver(cornellDepressionScaleSchema),
    defaultValues: initialData || {
      residentName: `${resident.firstName} ${resident.lastName}`,
      dateOfBirth: new Date(resident.dateOfBirth).toISOString().split("T")[0],
      dateOfAssessment: new Date().toISOString().split("T")[0],
      assessedBy: session?.user?.name || "",
      signature: "",

      // All items default to "0" (Absent)
      anxiety: "0",
      sadness: "0",
      lackOfReactivity: "0",
      irritability: "0",

      agitation: "0",
      retardation: "0",
      multiplePhysicalComplaints: "0",
      lossOfInterest: "0",

      appetiteLoss: "0",
      weightLoss: "0",

      diurnalVariation: "0",
      sleepDisturbance: "0",

      suicidalIdeation: "0",
      lowSelfEsteem: "0",
      pessimism: "0",
      moodCongruentDelusions: "0"
    }
  });

  const watchedValues = form.watch();

  // Recalculate score whenever any rating changes
  useEffect(() => {
    const score = calculateCornellScore(watchedValues);
    const severity = getDepressionSeverity(score);
    setCurrentScore(score);
    setCurrentSeverity(severity);
  }, [watchedValues]);

  const onSubmit = async (data: z.infer<typeof cornellDepressionScaleSchema>) => {
    try {
      setIsSubmitting(true);
      await submitCornellScale({
        residentId,
        teamId,
        organizationId,
        userId,
        ...data,
        savedAsDraft: false
      });

      toast.success("Cornell Depression Scale submitted successfully");
      onClose();
    } catch (error) {
      console.error("Error submitting Cornell Depression Scale:", error);
      toast.error("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const RatingItem = ({
    name,
    label
  }: {
    name: keyof z.infer<typeof cornellDepressionScaleSchema>;
    label: string;
  }) => {
    const value = form.watch(name) as string;

    return (
      <div className="grid grid-cols-[1fr,auto] gap-4 items-center py-3 px-4 rounded-md hover:bg-muted/30 transition-colors">
        <Label className="text-sm font-normal">{label}</Label>
        <RadioGroup
          value={value}
          onValueChange={(newValue) => form.setValue(name, newValue as any)}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="0" id={`${name}-0`} />
            <Label htmlFor={`${name}-0`} className="text-xs font-normal cursor-pointer">0</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1" id={`${name}-1`} />
            <Label htmlFor={`${name}-1`} className="text-xs font-normal cursor-pointer">1</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="2" id={`${name}-2`} />
            <Label htmlFor={`${name}-2`} className="text-xs font-normal cursor-pointer">2</Label>
          </div>
        </RadioGroup>
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Cornell Scale for Depression in Dementia</DialogTitle>
          <DialogDescription>
            Rate each item: 0 = Absent, 1 = Mild/Intermittent, 2 = Severe
          </DialogDescription>
        </DialogHeader>

        {/* Score Display */}
        <div className="mx-6 mb-4 p-4 border-2 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Score</p>
              <p className="text-3xl font-bold mt-1">{currentScore}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">Severity</p>
              <p className={`text-xl font-bold mt-1 ${getSeverityColor(currentSeverity)}`}>
                {currentSeverity}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            <p>Score interpretation: 0-7 = No Depression, 8-12 = Mild Depression, 13+ = Major Depression</p>
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
                  <Label htmlFor="assessedBy" className="text-sm">Assessed By</Label>
                  <Input
                    id="assessedBy"
                    {...form.register("assessedBy")}
                    disabled
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* A. Mood-Related Signs */}
            <div className="space-y-2 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2 mb-2">A. Mood-Related Signs</h3>
              <RatingItem name="anxiety" label="Anxiety" />
              <RatingItem name="sadness" label="Sadness" />
              <RatingItem name="lackOfReactivity" label="Lack of Reactivity to Pleasant Events" />
              <RatingItem name="irritability" label="Irritability" />
            </div>

            {/* B. Behavioral Disturbance */}
            <div className="space-y-2 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2 mb-2">B. Behavioral Disturbance</h3>
              <RatingItem name="agitation" label="Agitation" />
              <RatingItem name="retardation" label="Retardation" />
              <RatingItem name="multiplePhysicalComplaints" label="Multiple Physical Complaints" />
              <RatingItem name="lossOfInterest" label="Loss of Interest" />
            </div>

            {/* C. Physical Signs */}
            <div className="space-y-2 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2 mb-2">C. Physical Signs</h3>
              <RatingItem name="appetiteLoss" label="Appetite Loss" />
              <RatingItem name="weightLoss" label="Weight Loss" />
            </div>

            {/* D. Cyclic Functions */}
            <div className="space-y-2 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2 mb-2">D. Cyclic Functions</h3>
              <RatingItem name="diurnalVariation" label="Diurnal Variation of Mood" />
              <RatingItem name="sleepDisturbance" label="Difficulty Falling Asleep / Sleep Disturbance" />
            </div>

            {/* E. Ideational Disturbance */}
            <div className="space-y-2 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2 mb-2">E. Ideational Disturbance</h3>
              <RatingItem name="suicidalIdeation" label="Suicidal Ideation" />
              <RatingItem name="lowSelfEsteem" label="Low Self-Esteem / Self-Deprecation" />
              <RatingItem name="pessimism" label="Pessimism / Hopelessness" />
              <RatingItem name="moodCongruentDelusions" label="Mood-Congruent Delusions" />
            </div>

            {/* Completion Details */}
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2">Completion Details</h3>

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
          </form>
        </ScrollArea>

        {/* Footer */}
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
