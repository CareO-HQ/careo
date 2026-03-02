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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  longTermFallsRiskAssessmentSchema,
  calculateFallsRiskScore
} from "@/schemas/residents/care-file/longTermFallSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Calendar } from "@/components/ui/calendar";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface LongTermFallRiskDialogProps {
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

export default function LongTermFallRiskDialog({
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
  viewOnly = false
}: LongTermFallRiskDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof longTermFallsRiskAssessmentSchema>>({
    resolver: zodResolver(longTermFallsRiskAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId,
        teamId,
        organizationId,
        userId,
        age: initialData.assessment_fields?.age || initialData.age,
        gender: initialData.assessment_fields?.gender || initialData.gender,
        historyOfFalls: initialData.assessment_fields?.historyOfFalls || initialData.historyOfFalls,
        mobilityLevel: initialData.assessment_fields?.mobilityLevel || initialData.mobilityLevel,
        standUnsupported: initialData.assessment_fields?.standUnsupported || initialData.standUnsupported || false,
        personalActivities: initialData.assessment_fields?.personalActivities || initialData.personalActivities,
        domesticActivities: initialData.assessment_fields?.domesticActivities || initialData.domesticActivities,
        footwear: initialData.assessment_fields?.footwear || initialData.footwear,
        visionProblems: initialData.assessment_fields?.visionProblems || initialData.visionProblems || false,
        bladderBowelMovement: initialData.assessment_fields?.bladderBowelMovement || initialData.bladderBowelMovement,
        residentEnvironmentalRisks: initialData.assessment_fields?.residentEnvironmentalRisks || initialData.residentEnvironmentalRisks || false,
        socialRisks: initialData.assessment_fields?.socialRisks || initialData.socialRisks,
        medicalCondition: initialData.assessment_fields?.medicalCondition || initialData.medicalCondition,
        medicines: initialData.assessment_fields?.medicines || initialData.medicines,
        safetyAwarness: initialData.assessment_fields?.safetyAwarness || initialData.safetyAwarness || false,
        mentalState: initialData.assessment_fields?.mentalState || initialData.mentalState,
        completedBy: initialData.completed_by || initialData.completedBy || userName,
        assessmentDate: initialData.assessment_date || initialData.completion_date || initialData.completionDate || new Date().toISOString().split("T")[0]
      }
      : {
        residentId,
        teamId,
        organizationId,
        userId,
        completedBy: userName,
        assessmentDate: new Date().toISOString().split("T")[0],
        standUnsupported: false,
        visionProblems: false,
        residentEnvironmentalRisks: false,
        safetyAwarness: false
      }
  });

  const onSubmit = async (
    data: z.infer<typeof longTermFallsRiskAssessmentSchema>
  ) => {
    startTransition(async () => {
      try {
        const currentUserId = userId;
        if (!currentUserId) throw new Error("User not authenticated");

        const scoreResult = calculateFallsRiskScore(data);
        const riskLevel = scoreResult.riskLevel;

        const assessmentFields = {
          age: data.age,
          gender: data.gender,
          historyOfFalls: data.historyOfFalls,
          mobilityLevel: data.mobilityLevel,
          standUnsupported: data.standUnsupported,
          personalActivities: data.personalActivities,
          domesticActivities: data.domesticActivities,
          footwear: data.footwear,
          visionProblems: data.visionProblems,
          bladderBowelMovement: data.bladderBowelMovement,
          residentEnvironmentalRisks: data.residentEnvironmentalRisks,
          socialRisks: data.socialRisks,
          medicalCondition: data.medicalCondition,
          medicines: data.medicines,
          safetyAwarness: data.safetyAwarness,
          mentalState: data.mentalState
        };

        const payload = {
          resident_id: resident.id,
          organization_id: organizationId,
          assessment_fields: assessmentFields,
          total_score: scoreResult.totalScore,
          risk_level: riskLevel,
          completed_by: data.completedBy,
          assessment_date: data.assessmentDate,
          status: 'completed',
          created_by: currentUserId
        };

        await submitAssessmentWithVersioning(
          'long_term_falls_risk_assessments',
          payload,
          initialData,
          isEditMode
        );

        if (isEditMode && initialData?.id) {
          await supabase.from('manager_audits').insert({
            form_type: 'long_term_falls_risk_assessments',
            form_id: initialData.id,
            resident_id: resident.id,
            audited_by: currentUserId,
            audit_notes: "Form reviewed and updated",
            organization_id: organizationId,
            care_home_id: resident.care_home_id || initialData.care_home_id
          });
          toast.success("Assessment reviewed successfully");
        } else {
          toast.success("Assessment submitted successfully");
        }
        onClose?.();
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment.");
      }
    });
  };

  const currentValues = form.watch();
  const scoreResult = calculateFallsRiskScore(currentValues);

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Review" : "Complete"} Long Term Falls Risk Assessment
          </DialogTitle>
          <DialogDescription>
            Complete all sections below to assess the resident&apos;s fall risk
          </DialogDescription>
        </DialogHeader>
      )}

      <Form {...form}>
        <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <button type="submit" id="care-file-submit-btn" className="hidden" />
            <div className="space-y-8 px-1">

              {/* Section 1: Demographics */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Demographics</h4>
                  <p className="text-sm text-muted-foreground">Age, gender, and falls history</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <FormField control={form.control} name="age" render={({ field }) => <FormItem><FormLabel>Age</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="65-80">65-80</SelectItem><SelectItem value="81-85">81-85</SelectItem><SelectItem value="86+">86+</SelectItem></SelectContent></Select></FormItem>} />
                  <FormField control={form.control} name="gender" render={({ field }) => <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem></SelectContent></Select></FormItem>} />
                  <FormField control={form.control} name="historyOfFalls" render={({ field }) => <FormItem><FormLabel>Falls History</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NEVER">Never</SelectItem><SelectItem value="FALL-MORE-THAN-12">More than 12 mos</SelectItem><SelectItem value="FALL-LAST-12">Last 12 mos</SelectItem><SelectItem value="RECURRENT-LAST-12">Recurrent last 12 mos</SelectItem></SelectContent></Select></FormItem>} />
                </div>
              </div>

              {/* Section 2: Mobility & Activities */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Mobility & Activities</h4>
                  <p className="text-sm text-muted-foreground">Mobility level and daily activities</p>
                </div>
                <div className="space-y-4">
                  <FormField control={form.control} name="mobilityLevel" render={({ field }) => <FormItem><FormLabel>Mobility</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INDEPENDENT-SAFE-UNAIDED">Independent</SelectItem><SelectItem value="INDEPENDENT-WITH-AID">With Aid</SelectItem><SelectItem value="ASSISTANCE-1-AID">Assist 1</SelectItem><SelectItem value="ASSISTANCE-2-AID">Assist 2</SelectItem><SelectItem value="IMMOBILE">Immobile</SelectItem></SelectContent></Select></FormItem>} />
                  <FormField control={form.control} name="standUnsupported" render={({ field }) => <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Can stand unsupported</FormLabel></FormItem>} />
                  <FormField control={form.control} name="personalActivities" render={({ field }) => <FormItem><FormLabel>Personal Activities</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INDEPENDENT-SAFE">Independent</SelectItem><SelectItem value="INDEPENDENT-EQUIPMENT">With Equipment</SelectItem><SelectItem value="ASSISTANCE">Assistance</SelectItem></SelectContent></Select></FormItem>} />
                  <FormField control={form.control} name="domesticActivities" render={({ field }) => <FormItem><FormLabel>Domestic Activities</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INDEPENDENT-SAFE">Independent</SelectItem><SelectItem value="INDEPENDENT-EQUIPMENT">With Equipment</SelectItem><SelectItem value="ASSISTANCE">Assistance</SelectItem></SelectContent></Select></FormItem>} />
                </div>
              </div>

              {/* Section 3: Physical & Environmental */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Physical & Environmental</h4>
                  <p className="text-sm text-muted-foreground">Footwear, vision, and environmental risks</p>
                </div>
                <div className="space-y-4">
                  <FormField control={form.control} name="footwear" render={({ field }) => <FormItem><FormLabel>Footwear</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SAFE">Safe</SelectItem><SelectItem value="UNSAFE">Unsafe</SelectItem></SelectContent></Select></FormItem>} />
                  <FormField control={form.control} name="visionProblems" render={({ field }) => <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Vision Problems</FormLabel></FormItem>} />
                  <FormField control={form.control} name="bladderBowelMovement" render={({ field }) => <FormItem><FormLabel>Bladder/Bowel</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NO-PROBLEMS">No problems</SelectItem><SelectItem value="IDENTIFIED-PROBLEMS">Problems</SelectItem><SelectItem value="FREQUENCY">Frequency</SelectItem></SelectContent></Select></FormItem>} />
                  <FormField control={form.control} name="residentEnvironmentalRisks" render={({ field }) => <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Environmental Risks</FormLabel></FormItem>} />
                </div>
              </div>

              {/* Section 4: Medical & Social */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Medical & Social</h4>
                  <p className="text-sm text-muted-foreground">Social risks, medical conditions, and medications</p>
                </div>
                <div className="space-y-4">
                  <FormField control={form.control} name="socialRisks" render={({ field }) => <FormItem><FormLabel>Social</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="24H-CARE">24h Care</SelectItem><SelectItem value="LIMITED-SUPPORT">Limited</SelectItem><SelectItem value="LIVES-ALONE">Alone</SelectItem></SelectContent></Select></FormItem>} />
                  <FormField control={form.control} name="medicalCondition" render={({ field }) => <FormItem><FormLabel>Medical</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NO-IDENTIFIED">None</SelectItem><SelectItem value="POSTURAL">Postural</SelectItem><SelectItem value="CARDIAC">Cardiac</SelectItem><SelectItem value="SKELETAL-CONDITION">Skeletal</SelectItem><SelectItem value="FRACTURES">Fractures</SelectItem><SelectItem value="NEUROLOGICAL-PROBLEMS">Neuro</SelectItem><SelectItem value="LISTED-CONDITIONS">Multi</SelectItem></SelectContent></Select></FormItem>} />
                  <FormField control={form.control} name="medicines" render={({ field }) => <FormItem><FormLabel>Meds Count</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NO-MEDICATIONS">None</SelectItem><SelectItem value="LESS-4">Less than 4</SelectItem><SelectItem value="4-OR-MORE">4+</SelectItem></SelectContent></Select></FormItem>} />
                </div>
              </div>

              {/* Section 5: Mental State & Completion */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Mental State & Completion</h4>
                  <p className="text-sm text-muted-foreground">Safety awareness, mental state, and assessment details</p>
                </div>
                <div className="space-y-4">
                  <FormField control={form.control} name="safetyAwarness" render={({ field }) => <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Safety Awareness</FormLabel></FormItem>} />
                  <FormField control={form.control} name="mentalState" render={({ field }) => <FormItem><FormLabel>Mental State</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ORIENTATED">Orientated</SelectItem><SelectItem value="CONFUSED">Confused</SelectItem></SelectContent></Select></FormItem>} />
                  <FormField control={form.control} name="completedBy" render={({ field }) => <FormItem><FormLabel>Completed By</FormLabel><Input {...field} /></FormItem>} />
                  <FormField control={form.control} name="assessmentDate" render={({ field }) => <FormItem><FormLabel>Date</FormLabel><Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full text-left">{field.value ? format(new Date(field.value), 'PPP') : 'Pick date'}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={d => { field.onChange(d?.toISOString().split('T')[0]); setDatePopoverOpen(false); }} /></PopoverContent></Popover></FormItem>} />

                  <div className="p-4 bg-muted rounded">
                    <p className="font-bold">Total Score: {scoreResult.totalScore}</p>
                    <p className="text-sm">Risk Level: {scoreResult.riskLevel}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            {!isInline && !viewOnly && (
              <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onClose?.()} disabled={isLoading}>Cancel</Button>
                <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Submit Assessment"
                  )}
                </Button>
              </DialogFooter>
            )}
          </form>
        </fieldset>
      </Form>
    </>
  );
}
