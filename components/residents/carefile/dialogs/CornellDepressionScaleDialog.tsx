"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cornellDepressionScaleSchema, calculateCornellScore, getDepressionSeverity, getSeverityColor } from "@/schemas/residents/care-file/cornellDepressionScaleSchema";
import { Resident } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface CornellDepressionScaleDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: { firstName?: string; lastName?: string; dateOfBirth?: number | string; first_name?: string; last_name?: string; date_of_birth?: string; care_home_id?: string };
  isEditMode?: boolean;
  initialData?: any;
  onClose: () => void;
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function CornellDepressionScaleDialog({
  teamId, residentId, organizationId, userId, userName, resident,
  isEditMode = false, initialData, onClose, isInline = false, viewOnly = false
}: CornellDepressionScaleDialogProps) {
  const [currentScore, setCurrentScore] = useState(0);
  const [currentSeverity, setCurrentSeverity] = useState("No Depression");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof cornellDepressionScaleSchema>>({
    resolver: zodResolver(cornellDepressionScaleSchema),
    defaultValues: initialData ? {
      residentName: initialData.residentName || `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
      dateOfBirth: initialData.dateOfBirth || (resident.date_of_birth ? new Date(resident.date_of_birth).toISOString().split("T")[0] : ""),
      dateOfAssessment: initialData.dateOfAssessment || initialData.assessment_date || new Date().toISOString().split("T")[0],
      assessedBy: initialData.assessedBy || initialData.assessed_by || userName,
      signature: initialData.signature || "",
      // Flatten scale_items JSONB
      anxiety: initialData.scale_items?.anxiety || "a",
      sadness: initialData.scale_items?.sadness || "a",
      lackOfReactivity: initialData.scale_items?.lackOfReactivity || "a",
      irritability: initialData.scale_items?.irritability || "a",
      agitation: initialData.scale_items?.agitation || "a",
      retardation: initialData.scale_items?.retardation || "a",
      multiplePhysicalComplaints: initialData.scale_items?.multiplePhysicalComplaints || "a",
      lossOfInterest: initialData.scale_items?.lossOfInterest || "a",
      appetiteLoss: initialData.scale_items?.appetiteLoss || "a",
      weightLoss: initialData.scale_items?.weightLoss || "a",
      lackOfEnergy: initialData.scale_items?.lackOfEnergy || "a",
      diurnalVariation: initialData.scale_items?.diurnalVariation || "a",
      difficultyFallingAsleep: initialData.scale_items?.difficultyFallingAsleep || "a",
      multipleAwakenings: initialData.scale_items?.multipleAwakenings || "a",
      earlyMorningAwakening: initialData.scale_items?.earlyMorningAwakening || "a",
      suicidalIdeation: initialData.scale_items?.suicidalIdeation || "a",
      lowSelfEsteem: initialData.scale_items?.lowSelfEsteem || "a",
      pessimism: initialData.scale_items?.pessimism || "a",
      moodCongruentDelusions: initialData.scale_items?.moodCongruentDelusions || "a"
    } : {
      residentName: `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
      dateOfBirth: resident.date_of_birth ? new Date(resident.date_of_birth).toISOString().split("T")[0] : "",
      dateOfAssessment: new Date().toISOString().split("T")[0],
      assessedBy: userName,
      signature: userName,
      anxiety: "a", sadness: "a", lackOfReactivity: "a", irritability: "a",
      agitation: "a", retardation: "a", multiplePhysicalComplaints: "a", lossOfInterest: "a",
      appetiteLoss: "a", weightLoss: "a", lackOfEnergy: "a",
      diurnalVariation: "a", difficultyFallingAsleep: "a", multipleAwakenings: "a", earlyMorningAwakening: "a",
      suicidalIdeation: "a", lowSelfEsteem: "a", pessimism: "a", moodCongruentDelusions: "a"
    }
  });

  const watchedValues = form.watch();

  useEffect(() => {
    const score = calculateCornellScore(watchedValues);
    const severity = getDepressionSeverity(score);
    setCurrentScore(score);
    setCurrentSeverity(severity);
  }, [watchedValues]);

  const onSubmit = async (data: z.infer<typeof cornellDepressionScaleSchema>) => {
    try {
      setIsSubmitting(true);
      const currentUserId = userId;
      if (!currentUserId) throw new Error("User not authenticated");

      const scaleItems = {
        anxiety: data.anxiety, sadness: data.sadness, lackOfReactivity: data.lackOfReactivity, irritability: data.irritability,
        agitation: data.agitation, retardation: data.retardation, multiplePhysicalComplaints: data.multiplePhysicalComplaints, lossOfInterest: data.lossOfInterest,
        appetiteLoss: data.appetiteLoss, weightLoss: data.weightLoss, lackOfEnergy: data.lackOfEnergy,
        diurnalVariation: data.diurnalVariation, difficultyFallingAsleep: data.difficultyFallingAsleep, multipleAwakenings: data.multipleAwakenings, earlyMorningAwakening: data.earlyMorningAwakening,
        suicidalIdeation: data.suicidalIdeation, lowSelfEsteem: data.lowSelfEsteem, pessimism: data.pessimism, moodCongruentDelusions: data.moodCongruentDelusions
      };

      const payload = {
        resident_id: residentId,
        organization_id: organizationId,
        scale_items: scaleItems,
        total_score: currentScore,
        severity_level: currentSeverity,
        assessment_date: data.dateOfAssessment,
        completed_by: data.assessedBy,
        created_by: currentUserId
      };

      await submitAssessmentWithVersioning(
        'cornell_depression_scales',
        payload,
        initialData,
        isEditMode
      );

      if (isEditMode && initialData?.id) {
        await supabase.from('manager_audits').insert({
          form_type: 'cornell_depression_scales', form_id: initialData.id, resident_id: residentId,
          audited_by: currentUserId, audit_notes: "Form reviewed", organization_id: organizationId
        });
        toast.success("Cornell Depression Scale updated");
      } else {
        toast.success("Cornell Depression Scale submitted");
      }
      onClose();
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const RatingItem = ({ name, label }: { name: keyof z.infer<typeof cornellDepressionScaleSchema>; label: string }) => {
    const value = form.watch(name) as string;
    return (
      <div className="grid grid-cols-[1fr,auto] gap-4 items-center py-3 px-4 rounded-md hover:bg-muted/30 transition-colors">
        <Label className="text-sm font-normal">{label}</Label>
        <RadioGroup value={value} onValueChange={(v) => form.setValue(name, v as any)} className="flex gap-6">
          {["a", "0", "1", "2"].map(v => (
            <div key={v} className="flex items-center space-x-2"><RadioGroupItem value={v} id={`${name}-${v}`} /><Label htmlFor={`${name}-${v}`} className="text-xs font-normal cursor-pointer uppercase">{v}</Label></div>
          ))}
        </RadioGroup>
      </div>
    );
  };

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-xl">Cornell Scale for Depression in Dementia</DialogTitle>
          <DialogDescription>Rate each item: a = Unable to evaluate, 0 = Absent, 1 = Mild/Intermittent, 2 = Severe</DialogDescription>
        </DialogHeader>
      )}

      <div className="mb-4 p-4 border-2 rounded-lg bg-muted/30">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-medium text-muted-foreground">Total Score</p><p className="text-3xl font-bold mt-1">{currentScore}</p></div>
          <div className="text-right"><p className="text-xs font-medium text-muted-foreground">Severity</p><p className={`text-xl font-bold mt-1 ${getSeverityColor(currentSeverity)}`}>{currentSeverity}</p></div>
        </div>
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground"><p>Score interpretation: 0-7 = No Depression, 8-12 = Mild Depression, 13+ = Major Depression</p></div>
      </div>

      <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
          <button
            type="button"
            id="care-file-submit-btn"
            className="hidden"
            onClick={form.handleSubmit(onSubmit, (errors) => {
              console.error("Cornell Depression form errors:", errors);
              toast.error("Please fill in all required fields correctly.");
            })}
          />
          <div className="space-y-4 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">Administrative Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-sm">Resident Name</Label><Input {...form.register("residentName")} disabled className="text-sm" /></div>
              <div className="space-y-2"><Label className="text-sm">Date of Assessment</Label><Input type="date" {...form.register("dateOfAssessment")} className="text-sm" /></div>
            </div>
          </div>

          <div className="space-y-2 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2 mb-2">A. Mood-Related Signs</h3>
            <RatingItem name="anxiety" label="Anxiety" /><RatingItem name="sadness" label="Sadness" /><RatingItem name="lackOfReactivity" label="Lack of Reactivity to Pleasant Events" /><RatingItem name="irritability" label="Irritability" />
          </div>

          <div className="space-y-2 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2 mb-2">B. Behavioral Disturbance</h3>
            <RatingItem name="agitation" label="Agitation" /><RatingItem name="retardation" label="Retardation" /><RatingItem name="multiplePhysicalComplaints" label="Multiple Physical Complaints" /><RatingItem name="lossOfInterest" label="Loss of Interest" />
          </div>

          <div className="space-y-2 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2 mb-2">C. Physical Signs</h3>
            <RatingItem name="appetiteLoss" label="Appetite Loss" /><RatingItem name="weightLoss" label="Weight Loss" /><RatingItem name="lackOfEnergy" label="Lack of Energy" />
          </div>

          <div className="space-y-2 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2 mb-2">D. Cyclic Functions</h3>
            <RatingItem name="diurnalVariation" label="Diurnal variation of mood; symptoms worse in the morning" />
            <RatingItem name="difficultyFallingAsleep" label="Difficulty falling asleep; later than usual for this individual" />
            <RatingItem name="multipleAwakenings" label="Multiple awakenings during sleep" />
            <RatingItem name="earlyMorningAwakening" label="Early morning awakening; earlier than usual for this individual" />
          </div>

          <div className="space-y-2 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2 mb-2">E. Ideational Disturbance</h3>
            <RatingItem name="suicidalIdeation" label="Suicidal Ideation" /><RatingItem name="lowSelfEsteem" label="Low Self-Esteem" /><RatingItem name="pessimism" label="Pessimism" /><RatingItem name="moodCongruentDelusions" label="Mood-Congruent Delusions" />
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">Completion</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Assessed By</Label>
                <Input {...form.register("assessedBy")} readOnly className="text-sm bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Signature</Label>
                <Input {...form.register("signature")} placeholder="Signature" className="text-sm" />
              </div>
            </div>
          </div>
        </form>
      </fieldset>

      {!isInline && !viewOnly && (
        <div className="flex items-center justify-end gap-3 pt-6 border-t sticky bottom-0 bg-background/80 backdrop-blur-sm py-4 pb-2">
          <Button type="button" variant="outline" onClick={() => onClose?.()} disabled={isSubmitting}>Cancel</Button>
          <Button
            onClick={() => {
              form.handleSubmit(onSubmit, (errors) => {
                console.error("Form errors:", errors);
                toast.error("Please fill in all required fields");
              })();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : isEditMode ? "Update" : "Submit"}
          </Button>
        </div>
      )}
    </>
  );
}
