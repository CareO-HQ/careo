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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

export default function CornellDepressionScaleDialog({
  teamId, residentId, organizationId, userId, userName, resident,
  isEditMode = false, initialData, onClose
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
      anxiety: initialData.scale_items?.anxiety || "0",
      sadness: initialData.scale_items?.sadness || "0",
      lackOfReactivity: initialData.scale_items?.lackOfReactivity || "0",
      irritability: initialData.scale_items?.irritability || "0",
      agitation: initialData.scale_items?.agitation || "0",
      retardation: initialData.scale_items?.retardation || "0",
      multiplePhysicalComplaints: initialData.scale_items?.multiplePhysicalComplaints || "0",
      lossOfInterest: initialData.scale_items?.lossOfInterest || "0",
      appetiteLoss: initialData.scale_items?.appetiteLoss || "0",
      weightLoss: initialData.scale_items?.weightLoss || "0",
      diurnalVariation: initialData.scale_items?.diurnalVariation || "0",
      sleepDisturbance: initialData.scale_items?.sleepDisturbance || "0",
      suicidalIdeation: initialData.scale_items?.suicidalIdeation || "0",
      lowSelfEsteem: initialData.scale_items?.lowSelfEsteem || "0",
      pessimism: initialData.scale_items?.pessimism || "0",
      moodCongruentDelusions: initialData.scale_items?.moodCongruentDelusions || "0"
    } : {
      residentName: `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
      dateOfBirth: resident.date_of_birth ? new Date(resident.date_of_birth).toISOString().split("T")[0] : "",
      dateOfAssessment: new Date().toISOString().split("T")[0],
      assessedBy: userName,
      signature: userName,
      anxiety: "0", sadness: "0", lackOfReactivity: "0", irritability: "0",
      agitation: "0", retardation: "0", multiplePhysicalComplaints: "0", lossOfInterest: "0",
      appetiteLoss: "0", weightLoss: "0", diurnalVariation: "0", sleepDisturbance: "0",
      suicidalIdeation: "0", lowSelfEsteem: "0", pessimism: "0", moodCongruentDelusions: "0"
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
        appetiteLoss: data.appetiteLoss, weightLoss: data.weightLoss, diurnalVariation: data.diurnalVariation, sleepDisturbance: data.sleepDisturbance,
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
          {["0", "1", "2"].map(v => (
            <div key={v} className="flex items-center space-x-2"><RadioGroupItem value={v} id={`${name}-${v}`} /><Label htmlFor={`${name}-${v}`} className="text-xs font-normal cursor-pointer">{v}</Label></div>
          ))}
        </RadioGroup>
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Cornell Scale for Depression in Dementia</DialogTitle>
          <DialogDescription>Rate each item: 0 = Absent, 1 = Mild/Intermittent, 2 = Severe</DialogDescription>
        </DialogHeader>

        <div className="mx-6 mb-4 p-4 border-2 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-medium text-muted-foreground">Total Score</p><p className="text-3xl font-bold mt-1">{currentScore}</p></div>
            <div className="text-right"><p className="text-xs font-medium text-muted-foreground">Severity</p><p className={`text-xl font-bold mt-1 ${getSeverityColor(currentSeverity)}`}>{currentSeverity}</p></div>
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground"><p>Score interpretation: 0-7 = No Depression, 8-12 = Mild Depression, 13+ = Major Depression</p></div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-280px)] px-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
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
              <RatingItem name="appetiteLoss" label="Appetite Loss" /><RatingItem name="weightLoss" label="Weight Loss" />
            </div>

            <div className="space-y-2 p-4 border rounded-lg bg-card">
              <h3 className="font-semibold text-sm border-b pb-2 mb-2">D. Cyclic Functions</h3>
              <RatingItem name="diurnalVariation" label="Diurnal Variation of Mood" /><RatingItem name="sleepDisturbance" label="Sleep Disturbance" />
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
                  <Input
                    {...form.register("assessedBy")}
                    readOnly
                    className="text-sm bg-muted cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Signature</Label>
                  <Input
                    {...form.register("signature")}
                    placeholder="Signature"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onClose?.()} disabled={isSubmitting}>Cancel</Button>
          <Button
            type="submit"
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
      </DialogContent>
    </Dialog>
  );
}
