"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { chokingRiskAssessmentSchema, calculateChokingRiskScore, getChokingRiskLevel, type ChokingRiskAssessmentFormData } from "@/schemas/residents/care-file/chokingRiskAssessmentSchema";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

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
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function ChokingRiskAssessmentDialog({
  teamId, residentId, organizationId, userId, userName, resident,
  isEditMode = false, initialData, onClose, isInline = false, viewOnly = false
}: ChokingRiskAssessmentDialogProps) {
  const [currentScore, setCurrentScore] = useState(0);
  const [currentRiskLevel, setCurrentRiskLevel] = useState<string>("Low Risk");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pastAssessments, setPastAssessments] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { profile } = useProfile();

  const form = useForm<ChokingRiskAssessmentFormData>({
    resolver: zodResolver(chokingRiskAssessmentSchema) as any,
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
      eatsRapidly: initialData.risk_factors?.eatsRapidly || false,
      drinksRapidly: initialData.risk_factors?.drinksRapidly || false,
      eatsWhileCoughing: initialData.risk_factors?.eatsWhileCoughing || false,
      drinksWhileCoughing: initialData.risk_factors?.drinksWhileCoughing || false,
      crammingFood: initialData.risk_factors?.crammingFood || false,
      pocketingFood: initialData.risk_factors?.pocketingFood || false,
      swallowingWithoutChewing: initialData.risk_factors?.swallowingWithoutChewing || false,
      wouldTakeFood: initialData.risk_factors?.wouldTakeFood || false,
      drinksIndependentlySafely: initialData.risk_factors?.drinksIndependentlySafely || false,
      eatsIndependentlySafely: initialData.risk_factors?.eatsIndependentlySafely || false,
      poorDentition: initialData.risk_factors?.poorDentition || false,
      fatigueAtMealtimes: initialData.risk_factors?.fatigueAtMealtimes || false,
      needsFoodCutting: initialData.risk_factors?.needsFoodCutting || false,
      texturedModifiedDiet: initialData.risk_factors?.texturedModifiedDiet || false,
      thickenedFluids: initialData.risk_factors?.thickenedFluids || false,
      specialistFeedingAids: initialData.risk_factors?.specialistFeedingAids || false,
      specialistDrinkingAids: initialData.risk_factors?.specialistDrinkingAids || false,
      acceptAnyItem: initialData.risk_factors?.acceptAnyItem || false,
      acceptAnyItemAndSwallow: initialData.risk_factors?.acceptAnyItemAndSwallow || false,
      medicationAffectingSwallowing: initialData.risk_factors?.medicationAffectingSwallowing || false
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
      neckTrauma: false, eatsRapidly: false, drinksRapidly: false, eatsWhileCoughing: false,
      drinksWhileCoughing: false, crammingFood: false, pocketingFood: false, swallowingWithoutChewing: false,
      wouldTakeFood: false, drinksIndependentlySafely: false, eatsIndependentlySafely: false, poorDentition: false,
      fatigueAtMealtimes: false, needsFoodCutting: false, texturedModifiedDiet: false, thickenedFluids: false,
      specialistFeedingAids: false, specialistDrinkingAids: false, acceptAnyItem: false,
      acceptAnyItemAndSwallow: false, medicationAffectingSwallowing: false
    }
  });

  const watchedValues = form.watch();

  useEffect(() => {
    const score = calculateChokingRiskScore(watchedValues);
    const riskLevel = getChokingRiskLevel(score);
    setCurrentScore(score);
    setCurrentRiskLevel(riskLevel);
  }, [watchedValues]);

  const fetchHistory = async () => {
    if (!residentId) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('choking_risk_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('assessment_date', { ascending: false });

      if (error) throw error;
      setPastAssessments(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [residentId]);

  // Sync completedBy with userName or profile name when they load
  useEffect(() => {
    if (!form.getValues("completedBy")) {
      const name = userName || profile?.name;
      if (name) {
        form.setValue("completedBy", name);
      }
    }
  }, [userName, profile, form]);

  const onSubmit = async (data: ChokingRiskAssessmentFormData) => {
    try {
      setIsSubmitting(true);
      const currentUserId = userId;
      if (!currentUserId) throw new Error("User not authenticated");

      // Flatten data for the JSONB field risk_factors
      const riskFactors: any = {};
      const schemaFields = Object.keys(chokingRiskAssessmentSchema.shape);
      schemaFields.forEach(field => {
        if (!['residentName', 'dateOfBirth', 'dateOfAssessment', 'time', 'completedBy', 'signature', 'residentId', 'teamId', 'organizationId', 'userId', 'savedAsDraft'].includes(field)) {
          riskFactors[field] = (data as any)[field];
        }
      });

      const payload = {
        resident_id: residentId,
        team_id: teamId,
        organization_id: organizationId,
        user_id: currentUserId,
        created_by: currentUserId,
        assessment_date: data.dateOfAssessment ? new Date(`${data.dateOfAssessment}T${data.time || "00:00"}`).toISOString() : new Date().toISOString(),
        completed_by: data.completedBy,
        risk_factors: riskFactors,
        total_score: currentScore,
        risk_level: currentRiskLevel,
        signature: data.signature,
        saved_as_draft: data.savedAsDraft || false
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
        form.reset({
          ...form.getValues(),
          weakCough: false, chestInfections: false, breathingDifficulties: false, knownToAspirate: false,
          chokingHistory: false, gurgledVoice: false, epilepsy: false, cerebralPalsy: false, dementia: false,
          mentalHealth: false, neurologicalConditions: false, learningDisabilities: false, posturalProblems: false,
          poorHeadControl: false, tongueThrust: false, chewingDifficulties: false, slurredSpeech: false,
          neckTrauma: false, eatsRapidly: false, drinksRapidly: false, eatsWhileCoughing: false,
          drinksWhileCoughing: false, crammingFood: false, pocketingFood: false, swallowingWithoutChewing: false,
          wouldTakeFood: false, drinksIndependentlySafely: false, eatsIndependentlySafely: false, poorDentition: false,
          fatigueAtMealtimes: false, needsFoodCutting: false, texturedModifiedDiet: false, thickenedFluids: false,
          specialistFeedingAids: false, specialistDrinkingAids: false, acceptAnyItem: false,
          acceptAnyItemAndSwallow: false, medicationAffectingSwallowing: false
        });
        fetchHistory();
      }
      if (!isInline) onClose();
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const RiskCheckbox = ({ name, label, points }: { name: keyof ChokingRiskAssessmentFormData; label: string; points: number }) => {
    const value = form.watch(name as any) as boolean;
    return (
      <div className="flex items-start space-x-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
        <Checkbox
          checked={value || false}
          onCheckedChange={(checked) => form.setValue(name as any, checked as boolean)}
          id={name as string}
        />
        <div className="flex-1 flex items-center justify-between">
          <Label htmlFor={name as string} className="text-sm font-normal cursor-pointer leading-relaxed">{label}</Label>
          <span className="text-xs text-muted-foreground font-medium ml-2">{points > 0 ? `+${points}` : points} pts</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-xl">Choking Risk Assessment</DialogTitle>
          <DialogDescription>Complete the assessment by checking all applicable risk factors</DialogDescription>
        </DialogHeader>
      )}

      <div className="mb-4 p-4 border-2 rounded-lg bg-muted/30">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-medium text-muted-foreground">Total Risk Score</p><p className="text-3xl font-bold mt-1">{currentScore}</p></div>
          <div className="text-right"><p className="text-xs font-medium text-muted-foreground">Risk Level</p>
            <p className={`text-xl font-bold mt-1 ${currentRiskLevel === "Low Risk" ? "text-blue-600" : currentRiskLevel === "Medium Risk" ? "text-yellow-600" : "text-red-600"}`}>{currentRiskLevel}</p>
          </div>
        </div>
      </div>

      <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 pb-20">
          <button
            type="button"
            id="care-file-submit-btn"
            className="hidden"
            onClick={form.handleSubmit(onSubmit as any, (errors) => {
              console.error("Choking Risk form errors:", errors);
              toast.error("Please fill in all required fields correctly.");
            })}
          />

          <div className="space-y-4 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">Resident Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="residentName" className="text-sm">Resident Name</Label>
                <Input id="residentName" {...form.register("residentName")} disabled className="text-sm bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-sm">Date of Birth</Label>
                <Input id="dateOfBirth" {...form.register("dateOfBirth")} disabled className="text-sm bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfAssessment" className="text-sm">Date of Assessment</Label>
                <Input id="dateOfAssessment" type="date" {...form.register("dateOfAssessment")} className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm">Time of Assessment</Label>
                <Input id="time" type="time" {...form.register("time")} className="text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">1. Respiratory Risks <span className="text-xs font-normal text-muted-foreground ml-2">(10 pts each)</span></h3>
            <RiskCheckbox name="weakCough" label="Weak cough and/or inability to clear throat" points={10} />
            <RiskCheckbox name="chestInfections" label="History of chest infections" points={10} />
            <RiskCheckbox name="breathingDifficulties" label="Breathing difficulties/COPD" points={10} />
            <RiskCheckbox name="knownToAspirate" label="Known to Aspirate" points={10} />
            <RiskCheckbox name="chokingHistory" label="History of choking/requiring intervention" points={10} />
            <RiskCheckbox name="gurgledVoice" label="Gurgled or wet voice after swallowing" points={10} />
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">2. At Risk Groups</h3>
            <RiskCheckbox name="epilepsy" label="Epilepsy" points={4} />
            <RiskCheckbox name="cerebralPalsy" label="Cerebral Palsy" points={4} />
            <RiskCheckbox name="dementia" label="Dementia/confusion" points={4} />
            <RiskCheckbox name="mentalHealth" label="Mental health history" points={4} />
            <RiskCheckbox name="neurologicalConditions" label="Known neurological conditions (e.g., CVA, Parkinson's, Huntington's)" points={10} />
            <RiskCheckbox name="learningDisabilities" label="Learning Disabilities" points={10} />
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">3. Physical Risks</h3>
            <RiskCheckbox name="posturalProblems" label="Postural problems/increased rigidity/severe flexion/cannot sit upright" points={8} />
            <RiskCheckbox name="poorHeadControl" label="Poor head control" points={8} />
            <RiskCheckbox name="tongueThrust" label="Tongue Thrust" points={8} />
            <RiskCheckbox name="chewingDifficulties" label="Difficulties chewing or prolonged chewing time" points={8} />
            <RiskCheckbox name="slurredSpeech" label="Slurred speech and/or facial weakness" points={10} />
            <RiskCheckbox name="neckTrauma" label="Any known injury/trauma to neck or throat" points={10} />
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">4. Risks Associated with Eating Behaviours</h3>
            <RiskCheckbox name="eatsRapidly" label="Eats rapidly" points={8} />
            <RiskCheckbox name="drinksRapidly" label="Drinks rapidly" points={8} />
            <RiskCheckbox name="eatsWhileCoughing" label="Continues to eat whilst coughing" points={8} />
            <RiskCheckbox name="drinksWhileCoughing" label="Continues to drink while coughing" points={8} />
            <RiskCheckbox name="crammingFood" label="Cramming food in mouth" points={10} />
            <RiskCheckbox name="pocketingFood" label="Pocketing food or drink in mouth" points={10} />
            <RiskCheckbox name="swallowingWithoutChewing" label="Swallowing without chewing" points={10} />
            <RiskCheckbox name="wouldTakeFood" label="Would take food from others/cupboards/fruit bowls if not supervised" points={4} />
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">5. Risks Associated with Eating</h3>
            <RiskCheckbox name="drinksIndependentlySafely" label="Drinks independently and safely" points={-2} />
            <RiskCheckbox name="eatsIndependentlySafely" label="Eats independently and safely" points={-2} />
            <RiskCheckbox name="poorDentition" label="Poor fitting/missing dentures/poor dentition/dental pain" points={8} />
            <RiskCheckbox name="fatigueAtMealtimes" label="Fatigue at mealtimes" points={8} />
            <RiskCheckbox name="needsFoodCutting" label="Needs food cutting up or prepared prior to eating" points={6} />
            <RiskCheckbox name="texturedModifiedDiet" label="Is on a textured modified diet" points={10} />
            <RiskCheckbox name="thickenedFluids" label="Requires thickened fluids" points={10} />
            <RiskCheckbox name="specialistFeedingAids" label="Requires specialist feeding aids to reduce the risk of choking" points={5} />
            <RiskCheckbox name="specialistDrinkingAids" label="Requires specialist drinking aids to reduce the risk of choking" points={5} />
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">6. Food Recognition <span className="text-xs font-normal text-muted-foreground ml-2">(10 pts each)</span></h3>
            <RiskCheckbox name="acceptAnyItem" label="Will accept/put any item into mouth (including non-food items)" points={10} />
            <RiskCheckbox name="acceptAnyItemAndSwallow" label="Will accept/put any item into mouth (including non-food items) and swallow" points={10} />
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">7. Medication</h3>
            <RiskCheckbox name="medicationAffectingSwallowing" label="Taking medication that can affect swallowing" points={10} />
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-sm border-b pb-2">Completion</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="completedBy" className="text-sm">Name of Person Filling</Label>
                <Input id="completedBy" {...form.register("completedBy")} className="text-sm" placeholder="Enter name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature" className="text-sm">Signature</Label>
                <Input id="signature" {...form.register("signature")} className="text-sm" placeholder="e-Signature" />
              </div>
            </div>
          </div>

          {!isInline && !viewOnly && (
            <div className="flex items-center justify-end gap-3 pt-6 border-t sticky bottom-0 bg-background/80 backdrop-blur-sm py-4 pb-2 z-10">
              <Button type="button" variant="outline" onClick={() => onClose?.()} disabled={isSubmitting}>Cancel</Button>
              <Button
                onClick={() => {
                  form.handleSubmit(onSubmit as any, (errors) => {
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
        </form>
      </fieldset>

      <div className="mt-12 space-y-6">
        <h3 className="text-xl font-bold border-b pb-2">Past Assessments</h3>
        {isLoadingHistory ? (
          <div className="flex justify-center p-8"><p className="text-muted-foreground animate-pulse text-sm">Loading history...</p></div>
        ) : pastAssessments.length === 0 ? (
          <div className="text-center p-8 border rounded-lg bg-muted/20"><p className="text-muted-foreground text-sm">No previous assessments found</p></div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Completed By</TableHead>
                  <TableHead className="text-center">Respiratory (Score)</TableHead>
                  <TableHead className="text-center">At Risk Groups (Score)</TableHead>
                  <TableHead className="text-center">Physical (Score)</TableHead>
                  <TableHead className="text-center">Behaviours (Score)</TableHead>
                  <TableHead className="text-center">Eating Risks (Score)</TableHead>
                  <TableHead className="text-center">Recognition (Score)</TableHead>
                  <TableHead className="text-center">Medication (Score)</TableHead>
                  <TableHead className="text-center font-bold">Total Score</TableHead>
                  <TableHead className="text-right">Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastAssessments.map((assessment) => {
                  const factors = assessment.risk_factors || {};

                  const getSectionScore = (sectionKeys: { [key: string]: number }) => {
                    return Object.entries(sectionKeys).reduce((acc, [key, pts]) => {
                      return factors[key] ? acc + pts : acc;
                    }, 0);
                  };

                  return (
                    <TableRow key={assessment.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(assessment.assessment_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">{assessment.completed_by}</TableCell>
                      <TableCell className="text-center font-medium">
                        {getSectionScore({ weakCough: 10, chestInfections: 10, breathingDifficulties: 10, knownToAspirate: 10, chokingHistory: 10, gurgledVoice: 10 })}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {getSectionScore({ epilepsy: 4, cerebralPalsy: 4, dementia: 4, mentalHealth: 4, neurologicalConditions: 10, learningDisabilities: 10 })}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {getSectionScore({ posturalProblems: 8, poorHeadControl: 8, tongueThrust: 8, chewingDifficulties: 8, slurredSpeech: 10, neckTrauma: 10 })}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {getSectionScore({ eatsRapidly: 8, drinksRapidly: 8, eatsWhileCoughing: 8, drinksWhileCoughing: 8, crammingFood: 10, pocketingFood: 10, swallowingWithoutChewing: 10, wouldTakeFood: 4 })}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {getSectionScore({ drinksIndependentlySafely: -2, eatsIndependentlySafely: -2, poorDentition: 8, fatigueAtMealtimes: 8, needsFoodCutting: 6, texturedModifiedDiet: 10, thickenedFluids: 10, specialistFeedingAids: 5, specialistDrinkingAids: 5 })}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {getSectionScore({ acceptAnyItem: 10, acceptAnyItemAndSwallow: 10 })}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {getSectionScore({ medicationAffectingSwallowing: 10 })}
                      </TableCell>
                      <TableCell className="text-center font-bold text-lg">{assessment.total_score}</TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${assessment.risk_level === "Low Risk" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          assessment.risk_level === "Medium Risk" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                            "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                          {assessment.risk_level}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
