"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { chokingRiskAssessmentSchema, calculateChokingRiskScore, getChokingRiskLevel } from "@/schemas/residents/care-file/chokingRiskAssessmentSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import { Resident } from "@/types";

interface ChokingRiskAssessmentDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName?: string;
  resident: Resident;
  isEditMode?: boolean;
  initialData?: any;
  onClose: () => void;
}

export default function ChokingRiskAssessmentDialog({
  teamId, residentId, organizationId, userId, userName, resident,
  isEditMode = false, initialData, onClose
}: ChokingRiskAssessmentDialogProps) {
  const [currentScore, setCurrentScore] = useState(0);
  const [currentRiskLevel, setCurrentRiskLevel] = useState("No Risk");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { profile } = useProfile();

  const form = useForm<z.infer<typeof chokingRiskAssessmentSchema>>({
    resolver: zodResolver(chokingRiskAssessmentSchema),
    defaultValues: initialData ? {
      residentName: initialData.residentName || `${resident.first_name} ${resident.last_name}`,
      dateOfBirth: initialData.dateOfBirth || (resident.date_of_birth ? new Date(resident.date_of_birth).toISOString().split("T")[0] : ""),
      dateOfAssessment: initialData.dateOfAssessment || new Date().toISOString().split("T")[0],
      time: initialData.time || new Date().toTimeString().slice(0, 5),
      completedBy: initialData.completedBy || profile?.name || "",
      signature: initialData.signature || "",
      // Flatten risk_factors JSONB
      weakCough: initialData.risk_factors?.weakCough || false,
      chestInfections: initialData.risk_factors?.chestInfections || false,
      breathingDifficulties: initialData.risk_factors?.breathingDifficulties || false,
      knownToAspirate: initialData.risk_factors?.knownToAspirate || false,
      chokingHistory: initialData.risk_factors?.chokingHistory || false,
      gurgledVoice: initialData.risk_factors?.gurgledVoice || false,
      epilepsy: initialData.risk_factors?.epilepsy || false,
      cerebralPalsy: initialData.risk_factors?.cerebralPalsy || false,
      dementia: initialData.risk_factors?.dementia || false,
      mentalHealth: initialData.risk_factors?.mentalHealth || false,
      neurologicalConditions: initialData.risk_factors?.neurologicalConditions || false,
      learningDisabilities: initialData.risk_factors?.learningDisabilities || false,
      posturalProblems: initialData.risk_factors?.posturalProblems || false,
      poorHeadControl: initialData.risk_factors?.poorHeadControl || false,
      tongueThrust: initialData.risk_factors?.tongueThrust || false,
      chewingDifficulties: initialData.risk_factors?.chewingDifficulties || false,
      slurredSpeech: initialData.risk_factors?.slurredSpeech || false,
      neckTrauma: initialData.risk_factors?.neckTrauma || false,
      poorDentition: initialData.risk_factors?.poorDentition || false,
      eatsRapidly: initialData.risk_factors?.eatsRapidly || false,
      drinksRapidly: initialData.risk_factors?.drinksRapidly || false,
      eatsWhileCoughing: initialData.risk_factors?.eatsWhileCoughing || false,
      drinksWhileCoughing: initialData.risk_factors?.drinksWhileCoughing || false,
      crammingFood: initialData.risk_factors?.crammingFood || false,
      pocketingFood: initialData.risk_factors?.pocketingFood || false,
      swallowingWithoutChewing: initialData.risk_factors?.swallowingWithoutChewing || false,
      wouldTakeFood: initialData.risk_factors?.wouldTakeFood || false,
      drinksIndependently: initialData.risk_factors?.drinksIndependently ?? true,
      eatsIndependently: initialData.risk_factors?.eatsIndependently ?? true
    } : {
      residentName: `${resident.first_name} ${resident.last_name}`,
      dateOfBirth: resident.date_of_birth ? new Date(typeof resident.date_of_birth === 'number' ? resident.date_of_birth : resident.date_of_birth).toISOString().split("T")[0] : "",
      dateOfAssessment: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
      completedBy: userName || profile?.name || "",
      signature: "",
      weakCough: false, chestInfections: false, breathingDifficulties: false, knownToAspirate: false,
      chokingHistory: false, gurgledVoice: false, epilepsy: false, cerebralPalsy: false, dementia: false,
      mentalHealth: false, neurologicalConditions: false, learningDisabilities: false, posturalProblems: false,
      poorHeadControl: false, tongueThrust: false, chewingDifficulties: false, slurredSpeech: false,
      neckTrauma: false, poorDentition: false, eatsRapidly: false, drinksRapidly: false,
      eatsWhileCoughing: false, drinksWhileCoughing: false, crammingFood: false, pocketingFood: false,
      swallowingWithoutChewing: false, wouldTakeFood: false, drinksIndependently: true, eatsIndependently: true
    }
  });

  const watchedValues = form.watch();

  useEffect(() => {
    const score = calculateChokingRiskScore(watchedValues);
    const riskLevel = getChokingRiskLevel(score);
    setCurrentScore(score);
    setCurrentRiskLevel(riskLevel);
  }, [watchedValues]);

  // Sync completedBy with userName or profile name when they load
  useEffect(() => {
    if (!form.getValues("completedBy")) {
      const name = userName || profile?.name;
      if (name) {
        form.setValue("completedBy", name);
      }
    }
  }, [userName, profile, form]);

  const onSubmit = async (data: z.infer<typeof chokingRiskAssessmentSchema>) => {
    try {
      setIsSubmitting(true);
      const currentUserId = userId;
      if (!currentUserId) throw new Error("User not authenticated");

      const riskFactors = {
        weakCough: data.weakCough, chestInfections: data.chestInfections, breathingDifficulties: data.breathingDifficulties,
        knownToAspirate: data.knownToAspirate, chokingHistory: data.chokingHistory, gurgledVoice: data.gurgledVoice,
        epilepsy: data.epilepsy, cerebralPalsy: data.cerebralPalsy, dementia: data.dementia, mentalHealth: data.mentalHealth,
        neurologicalConditions: data.neurologicalConditions, learningDisabilities: data.learningDisabilities,
        posturalProblems: data.posturalProblems, poorHeadControl: data.poorHeadControl, tongueThrust: data.tongueThrust,
        chewingDifficulties: data.chewingDifficulties, slurredSpeech: data.slurredSpeech, neckTrauma: data.neckTrauma,
        poorDentition: data.poorDentition, eatsRapidly: data.eatsRapidly, drinksRapidly: data.drinksRapidly,
        eatsWhileCoughing: data.eatsWhileCoughing, drinksWhileCoughing: data.drinksWhileCoughing,
        crammingFood: data.crammingFood, pocketingFood: data.pocketingFood, swallowingWithoutChewing: data.swallowingWithoutChewing,
        wouldTakeFood: data.wouldTakeFood, drinksIndependently: data.drinksIndependently, eatsIndependently: data.eatsIndependently
      };

      const payload = {
        resident_id: residentId,
        organization_id: organizationId,
        risk_factors: riskFactors,
        total_score: currentScore,
        risk_level: currentRiskLevel,
        assessment_date: data.dateOfAssessment,
        completed_by: data.completedBy,
        created_by: currentUserId
      };

      await submitAssessmentWithVersioning(
        'choking_risk_assessments',
        payload,
        initialData,
        isEditMode
      );

      if (isEditMode && initialData?.id) {
        await supabase.from('manager_audits').insert({
          form_type: 'choking_risk_assessments', form_id: initialData.id, resident_id: residentId,
          audited_by: currentUserId, audit_notes: "Form reviewed", organization_id: organizationId
        });
        toast.success("Choking Risk Assessment updated");
      } else {
        toast.success("Choking Risk Assessment submitted");
      }
      onClose();
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const RiskCheckbox = ({ name, label, points }: { name: keyof z.infer<typeof chokingRiskAssessmentSchema>; label: string; points: number }) => {
    const value = form.watch(name) as boolean;
    return (
      <div className="flex items-start space-x-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
        <Checkbox checked={value || false} onCheckedChange={(checked) => form.setValue(name, checked as boolean)} id={name} />
        <div className="flex-1 flex items-center justify-between">
          <Label htmlFor={name} className="text-sm font-normal cursor-pointer leading-relaxed">{label}</Label>
          <span className="text-xs text-muted-foreground font-medium ml-2">{points} pts</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Choking Risk Assessment</DialogTitle>
        <DialogDescription>Complete the assessment by checking all applicable risk factors</DialogDescription>
      </DialogHeader>

      <div className="mb-4 p-4 border-2 rounded-lg bg-muted/30">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-medium text-muted-foreground">Total Risk Score</p><p className="text-3xl font-bold mt-1">{currentScore}</p></div>
          <div className="text-right"><p className="text-xs font-medium text-muted-foreground">Risk Level</p>
            <p className={`text-xl font-bold mt-1 ${currentRiskLevel === "No Risk" ? "text-green-600" : currentRiskLevel === "Low Risk" ? "text-blue-600" : currentRiskLevel === "Medium Risk" ? "text-yellow-600" : currentRiskLevel === "High Risk" ? "text-orange-600" : "text-red-600"}`}>{currentRiskLevel}</p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
        <div className="space-y-4 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-sm border-b pb-2">Administrative Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="residentName" className="text-sm">Resident Name</Label><Input id="residentName" {...form.register("residentName")} disabled className="text-sm" /></div>
            <div className="space-y-2"><Label htmlFor="dateOfAssessment" className="text-sm">Date</Label><Input id="dateOfAssessment" type="date" {...form.register("dateOfAssessment")} className="text-sm" /></div>
          </div>
        </div>

        <div className="space-y-3 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-sm border-b pb-2">Respiratory Risks <span className="text-xs font-normal text-muted-foreground ml-2">(10 pts each)</span></h3>
          {["weakCough", "chestInfections", "breathingDifficulties", "knownToAspirate", "chokingHistory", "gurgledVoice"].map(k => <RiskCheckbox key={k} name={k as any} label={k.replace(/([A-Z])/g, ' $1').trim()} points={10} />)}
        </div>

        <div className="space-y-3 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-sm border-b pb-2">At Risk Groups</h3>
          <RiskCheckbox name="epilepsy" label="Epilepsy" points={4} />
          <RiskCheckbox name="cerebralPalsy" label="Cerebral Palsy" points={10} />
          <RiskCheckbox name="dementia" label="Dementia" points={4} />
          <RiskCheckbox name="mentalHealth" label="Mental Health Conditions" points={4} />
          <RiskCheckbox name="neurologicalConditions" label="Neurological Conditions" points={10} />
          <RiskCheckbox name="learningDisabilities" label="Learning Disabilities" points={10} />
        </div>

        <div className="space-y-3 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-sm border-b pb-2">Physical Risks</h3>
          {["posturalProblems", "poorHeadControl", "tongueThrust", "chewingDifficulties"].map(k => <RiskCheckbox key={k} name={k as any} label={k.replace(/([A-Z])/g, ' $1').trim()} points={10} />)}
          {["slurredSpeech", "neckTrauma", "poorDentition"].map(k => <RiskCheckbox key={k} name={k as any} label={k.replace(/([A-Z])/g, ' $1').trim()} points={8} />)}
        </div>

        <div className="space-y-3 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-sm border-b pb-2">Eating Behaviours</h3>
          {["eatsRapidly", "drinksRapidly", "eatsWhileCoughing", "drinksWhileCoughing", "crammingFood"].map(k => <RiskCheckbox key={k} name={k as any} label={k.replace(/([A-Z])/g, ' $1').trim()} points={10} />)}
          {["pocketingFood", "swallowingWithoutChewing"].map(k => <RiskCheckbox key={k} name={k as any} label={k.replace(/([A-Z])/g, ' $1').trim()} points={8} />)}
          <RiskCheckbox name="wouldTakeFood" label="Would Take Any Food" points={4} />
        </div>

        <div className="space-y-3 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-sm border-b pb-2">Protective Factors <span className="text-xs font-normal text-muted-foreground ml-2">(+2 pts if NO)</span></h3>
          <RiskCheckbox name="drinksIndependently" label="Drinks Independently" points={-2} />
          <RiskCheckbox name="eatsIndependently" label="Eats Independently" points={-2} />
        </div>

        <div className="space-y-4 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-sm border-b pb-2">Completion</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="completedBy" className="text-sm">Completed By</Label>
              <Input id="completedBy" {...form.register("completedBy")} readOnly className="text-sm bg-muted cursor-not-allowed" />
            </div>
            <div className="space-y-2"><Label htmlFor="signature" className="text-sm">Signature</Label><Input id="signature" {...form.register("signature")} placeholder="Signature" className="text-sm" /></div>
          </div>
        </div>
      </form>

      <div className="flex items-center justify-end gap-3 pt-6 border-t sticky bottom-0 bg-background/80 backdrop-blur-sm py-4">
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
    </>
  );
}
