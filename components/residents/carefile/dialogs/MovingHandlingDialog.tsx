"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { movingHandlingAssessmentSchema } from "@/schemas/residents/care-file/movingHandlingSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface MovingHandlingDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function MovingHandlingDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false,
  isInline = false,
  viewOnly = false,
}: MovingHandlingDialogProps) {
  const [isLoading, startTransition] = useTransition();

  const form = useForm<z.infer<typeof movingHandlingAssessmentSchema>>({
    resolver: zodResolver(movingHandlingAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId,
        teamId,
        organizationId,
        userId,
        residentName: initialData.residentName || (resident ? `${resident.first_name} ${resident.last_name}` : ""),
        dateOfBirth: initialData.dateOfBirth || (resident && resident.date_of_birth ? new Date(typeof resident.date_of_birth === 'number' ? resident.date_of_birth : resident.date_of_birth).getTime() : 0),
        bedroomNumber: initialData.bedroomNumber || resident?.room_number || "",

        // Flatten mobility_assessment JSONB
        weight: initialData.mobility_assessment?.weight || initialData.weight || 0,
        height: initialData.mobility_assessment?.height || initialData.height || 0,
        independentMobility: initialData.mobility_assessment?.independentMobility || initialData.independentMobility || false,
        canWeightBear: initialData.mobility_assessment?.canWeightBear || initialData.canWeightBear,
        limbUpperRight: initialData.mobility_assessment?.limbUpperRight || initialData.limbUpperRight,
        limbUpperLeft: initialData.mobility_assessment?.limbUpperLeft || initialData.limbUpperLeft,
        limbLowerRight: initialData.mobility_assessment?.limbLowerRight || initialData.limbLowerRight,
        limbLowerLeft: initialData.mobility_assessment?.limbLowerLeft || initialData.limbLowerLeft,

        // Flatten risk_factors JSONB
        historyOfFalls: initialData.risk_factors?.historyOfFalls || initialData.historyOfFalls || false,
        deafnessState: initialData.risk_factors?.deafnessState || initialData.deafnessState,
        deafnessComments: initialData.risk_factors?.deafnessComments || initialData.deafnessComments || "",
        blindnessState: initialData.risk_factors?.blindnessState || initialData.blindnessState,
        blindnessComments: initialData.risk_factors?.blindnessComments || initialData.blindnessComments || "",
        unpredictableBehaviourState: initialData.risk_factors?.unpredictableBehaviourState || initialData.unpredictableBehaviourState,
        unpredictableBehaviourComments: initialData.risk_factors?.unpredictableBehaviourComments || initialData.unpredictableBehaviourComments || "",
        uncooperativeBehaviourState: initialData.risk_factors?.uncooperativeBehaviourState || initialData.uncooperativeBehaviourState,
        uncooperativeBehaviourComments: initialData.risk_factors?.uncooperativeBehaviourComments || initialData.uncooperativeBehaviourComments || "",
        distressedReactionState: initialData.risk_factors?.distressedReactionState || initialData.distressedReactionState,
        distressedReactionComments: initialData.risk_factors?.distressedReactionComments || initialData.distressedReactionComments || "",
        disorientatedState: initialData.risk_factors?.disorientatedState || initialData.disorientatedState,
        disorientatedComments: initialData.risk_factors?.disorientatedComments || initialData.disorientatedComments || "",
        unconsciousState: initialData.risk_factors?.unconsciousState || initialData.unconsciousState,
        unconsciousComments: initialData.risk_factors?.unconsciousComments || initialData.unconsciousComments || "",
        unbalanceState: initialData.risk_factors?.unbalanceState || initialData.unbalanceState,
        unbalanceComments: initialData.risk_factors?.unbalanceComments || initialData.unbalanceComments || "",
        spasmsState: initialData.risk_factors?.spasmsState || initialData.spasmsState,
        spasmsComments: initialData.risk_factors?.spasmsComments || initialData.spasmsComments || "",
        stiffnessState: initialData.risk_factors?.stiffnessState || initialData.stiffnessState,
        stiffnessComments: initialData.risk_factors?.stiffnessComments || initialData.stiffnessComments || "",
        cathetersState: initialData.risk_factors?.cathetersState || initialData.cathetersState,
        cathetersComments: initialData.risk_factors?.cathetersComments || initialData.cathetersComments || "",
        incontinenceState: initialData.risk_factors?.incontinenceState || initialData.incontinenceState,
        incontinenceComments: initialData.risk_factors?.incontinenceComments || initialData.incontinenceComments || "",
        localisedPain: initialData.risk_factors?.localisedPain || initialData.localisedPain,
        localisedPainComments: initialData.risk_factors?.localisedPainComments || initialData.localisedPainComments || "",
        otherState: initialData.risk_factors?.otherState || initialData.otherState,
        otherComments: initialData.risk_factors?.otherComments || initialData.otherComments || "",

        needsRiskStaff: initialData.risk_factors?.needsRiskStaff || initialData.needsRiskStaff || "",
        equipmentUsed: initialData.equipment_needed || initialData.equipmentUsed || "",

        completedBy: initialData.completed_by || initialData.completedBy || userName,
        jobRole: initialData.jobRole || "",
        signature: initialData.signature || userName,
        assessmentDate: initialData.assessment_date || initialData.completion_date || new Date().toISOString().split("T")[0]
      }
      : {
        residentId,
        teamId,
        organizationId,
        userId,
        residentName: resident ? `${resident.first_name} ${resident.last_name}` : "",
        dateOfBirth: resident && resident.date_of_birth ? new Date(typeof resident.date_of_birth === 'number' ? resident.date_of_birth : resident.date_of_birth).getTime() : 0,
        bedroomNumber: resident?.room_number || "",

        weight: 0,
        height: 0,
        historyOfFalls: false,
        independentMobility: false,
        canWeightBear: "NO-WEIGHTBEARING",
        limbUpperRight: "FULLY",
        limbUpperLeft: "FULLY",
        limbLowerRight: "FULLY",
        limbLowerLeft: "FULLY",

        equipmentUsed: "",
        needsRiskStaff: "",

        deafnessState: "NEVER",
        blindnessState: "NEVER",
        unpredictableBehaviourState: "NEVER",
        uncooperativeBehaviourState: "NEVER",
        distressedReactionState: "NEVER",
        disorientatedState: "NEVER",
        unconsciousState: "NEVER",
        unbalanceState: "NEVER",
        spasmsState: "NEVER",
        stiffnessState: "NEVER",
        cathetersState: "NEVER",
        incontinenceState: "NEVER",
        localisedPain: "NEVER",
        otherState: "NEVER",

        completedBy: userName,
        jobRole: "",
        signature: userName,
        assessmentDate: new Date().toISOString().split("T")[0]
      }
  });

  if (!resident) return null;

  const onSubmit = async (values: z.infer<typeof movingHandlingAssessmentSchema>) => {
    startTransition(async () => {
      try {
        const currentUserId = userId;
        if (!currentUserId) throw new Error("User not authenticated");

        const mobilityAssessment = {
          weight: values.weight,
          height: values.height,
          independentMobility: values.independentMobility,
          canWeightBear: values.canWeightBear,
          limbUpperRight: values.limbUpperRight,
          limbUpperLeft: values.limbUpperLeft,
          limbLowerRight: values.limbLowerRight,
          limbLowerLeft: values.limbLowerLeft,
        };

        const riskFactors = {
          historyOfFalls: values.historyOfFalls,
          needsRiskStaff: values.needsRiskStaff,
          deafnessState: values.deafnessState,
          deafnessComments: values.deafnessComments,
          blindnessState: values.blindnessState,
          blindnessComments: values.blindnessComments,
          unpredictableBehaviourState: values.unpredictableBehaviourState,
          unpredictableBehaviourComments: values.unpredictableBehaviourComments,
          uncooperativeBehaviourState: values.uncooperativeBehaviourState,
          uncooperativeBehaviourComments: values.uncooperativeBehaviourComments,
          distressedReactionState: values.distressedReactionState,
          distressedReactionComments: values.distressedReactionComments,
          disorientatedState: values.disorientatedState,
          disorientatedComments: values.disorientatedComments,
          unconsciousState: values.unconsciousState,
          unconsciousComments: values.unconsciousComments,
          unbalanceState: values.unbalanceState,
          unbalanceComments: values.unbalanceComments,
          spasmsState: values.spasmsState,
          spasmsComments: values.spasmsComments,
          stiffnessState: values.stiffnessState,
          stiffnessComments: values.stiffnessComments,
          cathetersState: values.cathetersState,
          cathetersComments: values.cathetersComments,
          incontinenceState: values.incontinenceState,
          incontinenceComments: values.incontinenceComments,
          localisedPain: values.localisedPain,
          localisedPainComments: values.localisedPainComments,
          otherState: values.otherState,
          otherComments: values.otherComments
        };

        const payload = {
          resident_id: resident.id,
          organization_id: organizationId,
          mobility_assessment: mobilityAssessment,
          risk_factors: riskFactors,
          equipment_needed: values.equipmentUsed,
          completed_by: values.completedBy,
          assessment_date: values.assessmentDate,
          created_by: currentUserId,
        };

        await submitAssessmentWithVersioning(
          'moving_handling_assessments',
          payload,
          initialData,
          isEditMode
        );

        if (isEditMode && initialData?.id) {
          await supabase.from('manager_audits').insert({
            form_type: 'moving_handling_assessments', form_id: initialData.id, resident_id: resident.id,
            audited_by: currentUserId, audit_notes: "Form updated", organization_id: organizationId
          });
          toast.success("Assessment updated");
        } else {
          toast.success("Assessment submitted");
        }
        onClose?.();
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment.");
      }
    });
  };


  const RiskEntry = ({ name, label }: { name: string, label: string }) => {
    const stateName = (name === "localisedPain" ? "localisedPain" : `${name}State`) as any;
    const commentsName = `${name}Comments` as any;
    return (
      <div className="space-y-3 p-4 border rounded-lg bg-card/50">
        <FormField control={form.control} name={stateName} render={({ field }) => (
          <FormItem>
            <FormLabel className="font-semibold">{label}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="ALWAYS">Always</SelectItem>
                <SelectItem value="SOMETIMES">Sometimes</SelectItem>
                <SelectItem value="NEVER">Never</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )} />
        <FormField control={form.control} name={commentsName} render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Comments</FormLabel>
            <FormControl><Input placeholder="Add details..." {...field} /></FormControl>
          </FormItem>
        )} />
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Moving & Handling Assessment</DialogTitle>
          <DialogDescription>
            Comprehensive assessment of mobility and risk factors.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="space-y-12">
        <Form {...form}>
          <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              <button type="submit" id="care-file-submit-btn" className="hidden" />
              {/* Section 1: Resident Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Resident Information</h3>
                </div>
                <div className="grid gap-6">
                  <FormField control={form.control} name="residentName" render={({ field }) => <FormItem><FormLabel>Resident Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <div className="grid grid-cols-2 gap-6">
                    <FormField control={form.control} name="weight" render={({ field }) => <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>} />
                    <FormField control={form.control} name="height" render={({ field }) => <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>} />
                  </div>
                  <FormField control={form.control} name="historyOfFalls" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card/50">
                      <div className="space-y-0.5"><FormLabel>History of Falls?</FormLabel></div>
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Section 2: Mobility Assessment */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Mobility Assessment</h3>
                </div>
                <div className="grid gap-6">
                  <FormField control={form.control} name="independentMobility" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card/50">
                      <div className="space-y-0.5"><FormLabel>Independent Mobility?</FormLabel></div>
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="canWeightBear" render={({ field }) => (
                    <FormItem><FormLabel>Weight Bearing Capacity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="FULLY">Fully</SelectItem>
                        <SelectItem value="PARTIALLY">Partially</SelectItem>
                        <SelectItem value="WITH-AID">With Aid</SelectItem>
                        <SelectItem value="NO-WEIGHTBEARING">No Weightbearing</SelectItem>
                      </SelectContent>
                    </Select></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {["limbUpperRight", "limbUpperLeft", "limbLowerRight", "limbLowerLeft"].map(k => (
                      <FormField key={k} control={form.control} name={k as any} render={({ field }) => (
                        <FormItem className="p-4 border rounded-lg bg-card/30">
                          <FormLabel className="capitalize font-medium">{k.replace('limb', '').replace(/([A-Z])/g, ' $1')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="FULLY">Fully</SelectItem><SelectItem value="PARTIALLY">Partially</SelectItem><SelectItem value="NONE">None</SelectItem></SelectContent>
                          </Select></FormItem>
                      )} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 3: Risk Factors */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Risk Factors</h3>
                </div>

                <div className="space-y-8">
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">Sensory & Behavioral</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <RiskEntry name="deafness" label="Deafness" />
                      <RiskEntry name="blindness" label="Blindness" />
                      <RiskEntry name="unpredictableBehaviour" label="Unpredictable Behaviour" />
                      <RiskEntry name="uncooperativeBehaviour" label="Uncooperative Behaviour" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">Cognitive & Emotional</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <RiskEntry name="distressedReaction" label="Distressed Reaction" />
                      <RiskEntry name="disorientated" label="Disorientated" />
                      <RiskEntry name="unconscious" label="Unconscious" />
                      <RiskEntry name="unbalance" label="Unbalance" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">Physical & Other</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <RiskEntry name="spasms" label="Spasms" />
                      <RiskEntry name="stiffness" label="Stiffness" />
                      <RiskEntry name="catheters" label="Catheters" />
                      <RiskEntry name="incontinence" label="Incontinence" />
                      <RiskEntry name="localisedPain" label="Localised Pain" />
                      <RiskEntry name="other" label="Other Risks" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Requirements */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Requirements & Equipment</h3>
                </div>
                <div className="grid gap-6">
                  <FormField control={form.control} name="needsRiskStaff" render={({ field }) => (<FormItem><FormLabel>Specific Risk Staff Requirements</FormLabel><FormControl><Textarea placeholder="Details..." className="min-h-[100px]" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="equipmentUsed" render={({ field }) => (<FormItem><FormLabel>Equipment Required</FormLabel><FormControl><Input placeholder="Hoist, Slide sheets, etc." {...field} /></FormControl></FormItem>)} />
                </div>
              </div>

              {/* Section 5: Completion */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Completion & Signature</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="completedBy" render={({ field }) => <FormItem><FormLabel>Completed By</FormLabel><FormControl><Input {...field} readOnly disabled className="bg-muted" /></FormControl></FormItem>} />
                  <FormField control={form.control} name="jobRole" render={({ field }) => <FormItem><FormLabel>Job Role</FormLabel><FormControl><Input placeholder="e.g. Care Manager" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="signature" render={({ field }) => <FormItem><FormLabel>Digital Signature (Name)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="assessmentDate" render={({ field }) => <FormItem><FormLabel>Completion Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </div>
            </form>
          </fieldset>
        </Form>
      </div>

      {!isInline && !viewOnly && (
        <div className="border-t pt-8 flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-6 px-6 pb-2">
          <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading} size="lg">
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} size="lg" className="min-w-[150px]">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Assessment"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
