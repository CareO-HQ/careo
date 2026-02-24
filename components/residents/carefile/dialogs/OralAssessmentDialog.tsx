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
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

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
  teamId, residentId, organizationId, userId, userName, resident,
  careHomeName = "", onClose, initialData, isEditMode = false
}: OralAssessmentDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof oralAssessmentSchema>>({
    resolver: zodResolver(oralAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData ? {
      residentId, teamId, organizationId, userId,
      residentName: initialData.residentName || `${resident.first_name} ${resident.last_name}`,
      dateOfBirth: initialData.dateOfBirth || (resident.date_of_birth ? format(new Date(resident.date_of_birth), "dd/MM/yyyy") : ""),
      weight: initialData.assessment_details?.weight || "", height: initialData.assessment_details?.height || "",
      completedBy: initialData.completed_by || userName, signature: initialData.assessment_details?.signature || userName,
      assessmentDate: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : Date.now(),
      normalOralHygieneRoutine: initialData.oral_hygiene_routine || "",
      isRegisteredWithDentist: initialData.dental_info?.isRegisteredWithDentist || false,
      lastSeenByDentist: initialData.dental_info?.lastSeenByDentist || "",
      dentistName: initialData.dental_info?.dentistName || "",
      dentalPracticeAddress: initialData.dental_info?.dentalPracticeAddress || "",
      contactTelephone: initialData.dental_info?.contactTelephone || "",
      // Exam findings
      lipsDryCracked: initialData.exam_findings?.lipsDryCracked || false, lipsDryCrackedCare: initialData.care_recommendations?.lipsDryCrackedCare || "",
      tongueDryCracked: initialData.exam_findings?.tongueDryCracked || false, tongueDryCrackedCare: initialData.care_recommendations?.tongueDryCrackedCare || "",
      tongueUlceration: initialData.exam_findings?.tongueUlceration || false, tongueUlcerationCare: initialData.care_recommendations?.tongueUlcerationCare || "",
      hasTopDenture: initialData.exam_findings?.hasTopDenture || false, topDentureCare: initialData.care_recommendations?.topDentureCare || "",
      hasLowerDenture: initialData.exam_findings?.hasLowerDenture || false, lowerDentureCare: initialData.care_recommendations?.lowerDentureCare || "",
      hasDenturesAndNaturalTeeth: initialData.exam_findings?.hasDenturesAndNaturalTeeth || false, denturesAndNaturalTeethCare: initialData.care_recommendations?.denturesAndNaturalTeethCare || "",
      hasNaturalTeeth: initialData.exam_findings?.hasNaturalTeeth || false, naturalTeethCare: initialData.care_recommendations?.naturalTeethCare || "",
      evidencePlaqueDebris: initialData.exam_findings?.evidencePlaqueDebris || false, plaqueDebrisCare: initialData.care_recommendations?.plaqueDebrisCare || "",
      dryMouth: initialData.exam_findings?.dryMouth || false, dryMouthCare: initialData.care_recommendations?.dryMouthCare || "",
      painWhenEating: initialData.symptoms?.painWhenEating || false, painWhenEatingCare: initialData.care_recommendations?.painWhenEatingCare || "",
      gumsUlceration: initialData.symptoms?.gumsUlceration || false, gumsUlcerationCare: initialData.care_recommendations?.gumsUlcerationCare || "",
      difficultySwallowing: initialData.symptoms?.difficultySwallowing || false, difficultySwallowingCare: initialData.care_recommendations?.difficultySwallowingCare || "",
      poorFluidDietaryIntake: initialData.symptoms?.poorFluidDietaryIntake || false, poorFluidDietaryIntakeCare: initialData.care_recommendations?.poorFluidDietaryIntakeCare || "",
      dehydrated: initialData.symptoms?.dehydrated || false, dehydratedCare: initialData.care_recommendations?.dehydratedCare || "",
      speechDifficultyDryMouth: initialData.symptoms?.speechDifficultyDryMouth || false, speechDifficultyDryMouthCare: initialData.care_recommendations?.speechDifficultyDryMouthCare || "",
      speechDifficultyDenturesSlipping: initialData.symptoms?.speechDifficultyDenturesSlipping || false, speechDifficultyDenturesSlippingCare: initialData.care_recommendations?.speechDifficultyDenturesSlippingCare || "",
      dexterityProblems: initialData.symptoms?.dexterityProblems || false, dexterityProblemsCare: initialData.care_recommendations?.dexterityProblemsCare || "",
      cognitiveImpairment: initialData.symptoms?.cognitiveImpairment || false, cognitiveImpairmentCare: initialData.care_recommendations?.cognitiveImpairmentCare || ""
    } : {
      residentId, teamId, organizationId, userId,
      residentName: `${resident.first_name} ${resident.last_name}`,
      dateOfBirth: resident.date_of_birth ? format(new Date(resident.date_of_birth), "dd/MM/yyyy") : "",
      weight: "", height: "", completedBy: userName, signature: userName, assessmentDate: Date.now(),
      normalOralHygieneRoutine: "", isRegisteredWithDentist: false, lastSeenByDentist: "", dentistName: "",
      dentalPracticeAddress: "", contactTelephone: "",
      lipsDryCracked: false, lipsDryCrackedCare: "", tongueDryCracked: false, tongueDryCrackedCare: "",
      tongueUlceration: false, tongueUlcerationCare: "", hasTopDenture: false, topDentureCare: "",
      hasLowerDenture: false, lowerDentureCare: "", hasDenturesAndNaturalTeeth: false, denturesAndNaturalTeethCare: "",
      hasNaturalTeeth: false, naturalTeethCare: "", evidencePlaqueDebris: false, plaqueDebrisCare: "",
      dryMouth: false, dryMouthCare: "", painWhenEating: false, painWhenEatingCare: "",
      gumsUlceration: false, gumsUlcerationCare: "", difficultySwallowing: false, difficultySwallowingCare: "",
      poorFluidDietaryIntake: false, poorFluidDietaryIntakeCare: "", dehydrated: false, dehydratedCare: "",
      speechDifficultyDryMouth: false, speechDifficultyDryMouthCare: "", speechDifficultyDenturesSlipping: false, speechDifficultyDenturesSlippingCare: "",
      dexterityProblems: false, dexterityProblemsCare: "", cognitiveImpairment: false, cognitiveImpairmentCare: ""
    }
  });

  const isRegisteredWithDentist = form.watch("isRegisteredWithDentist");

  function onSubmit(values: z.infer<typeof oralAssessmentSchema>) {
    console.log("Submitting oral assessment with values:", values);
    startTransition(async () => {
      try {
        const currentUserId = userId;
        if (!currentUserId) throw new Error("User not authenticated");

        const payload = {
          resident_id: residentId, organization_id: organizationId,
          oral_hygiene_routine: values.normalOralHygieneRoutine,
          dental_info: { isRegisteredWithDentist: values.isRegisteredWithDentist, lastSeenByDentist: values.lastSeenByDentist, dentistName: values.dentistName, dentalPracticeAddress: values.dentalPracticeAddress, contactTelephone: values.contactTelephone },
          exam_findings: { lipsDryCracked: values.lipsDryCracked, tongueDryCracked: values.tongueDryCracked, tongueUlceration: values.tongueUlceration, hasTopDenture: values.hasTopDenture, hasLowerDenture: values.hasLowerDenture, hasDenturesAndNaturalTeeth: values.hasDenturesAndNaturalTeeth, hasNaturalTeeth: values.hasNaturalTeeth, evidencePlaqueDebris: values.evidencePlaqueDebris, dryMouth: values.dryMouth },
          symptoms: { painWhenEating: values.painWhenEating, gumsUlceration: values.gumsUlceration, difficultySwallowing: values.difficultySwallowing, poorFluidDietaryIntake: values.poorFluidDietaryIntake, dehydrated: values.dehydrated, speechDifficultyDryMouth: values.speechDifficultyDryMouth, speechDifficultyDenturesSlipping: values.speechDifficultyDenturesSlipping, dexterityProblems: values.dexterityProblems, cognitiveImpairment: values.cognitiveImpairment },
          care_recommendations: { lipsDryCrackedCare: values.lipsDryCrackedCare, tongueDryCrackedCare: values.tongueDryCrackedCare, tongueUlcerationCare: values.tongueUlcerationCare, topDentureCare: values.topDentureCare, lowerDentureCare: values.lowerDentureCare, denturesAndNaturalTeethCare: values.denturesAndNaturalTeethCare, naturalTeethCare: values.naturalTeethCare, plaqueDebrisCare: values.plaqueDebrisCare, dryMouthCare: values.dryMouthCare, painWhenEatingCare: values.painWhenEatingCare, gumsUlcerationCare: values.gumsUlcerationCare, difficultySwallowingCare: values.difficultySwallowingCare, poorFluidDietaryIntakeCare: values.poorFluidDietaryIntakeCare, dehydratedCare: values.dehydratedCare, speechDifficultyDryMouthCare: values.speechDifficultyDryMouthCare, speechDifficultyDenturesSlippingCare: values.speechDifficultyDenturesSlippingCare, dexterityProblemsCare: values.dexterityProblemsCare, cognitiveImpairmentCare: values.cognitiveImpairmentCare },
          assessment_details: { height: values.height, weight: values.weight, signature: values.signature },
          assessment_date: new Date(values.assessmentDate).toISOString().split('T')[0],
          completed_by: values.completedBy, status: 'completed', created_by: currentUserId
        };

        console.log("Payload for oral assessment:", payload);

        await submitAssessmentWithVersioning(
          'oral_assessments',
          payload,
          initialData,
          isEditMode
        );

        if (isEditMode && initialData?.id) {
          await supabase.from('manager_audits').insert({ form_type: 'oral_assessments', form_id: initialData.id, resident_id: residentId, audited_by: currentUserId, audit_notes: "Form reviewed", organization_id: organizationId });
          toast.success("Oral assessment updated!");
        } else {
          toast.success("Oral assessment submitted");
        }
        setTimeout(() => onClose?.(), 500);
      } catch (error) {
        console.error("Error submitting oral assessment:", error);
        toast.error("Failed to submit assessment.");
      }
    });
  }

  const onValidationError = (errors: any) => {
    console.error("Oral assessment validation errors:", errors);
    toast.error("Please fill in all required fields.");
  };

  const YesNoField = ({ fieldName, careField, label }: { fieldName: string; careField: string; label: string }) => {
    const show = form.watch(fieldName as any);
    return (
      <div className="space-y-2 p-3 border rounded bg-muted/20">
        <FormField control={form.control} name={fieldName as any} render={({ field }) => (
          <FormItem className="flex items-center gap-4"><FormLabel className="flex-1">{label}</FormLabel><FormControl>
            <RadioGroup onValueChange={v => field.onChange(v === "yes")} value={field.value ? "yes" : "no"} className="flex gap-4">
              <div className="flex items-center space-x-1"><RadioGroupItem value="yes" /><span className="text-sm">Yes</span></div>
              <div className="flex items-center space-x-1"><RadioGroupItem value="no" /><span className="text-sm">No</span></div>
            </RadioGroup>
          </FormControl></FormItem>
        )} />
        {show && <FormField control={form.control} name={careField as any} render={({ field }) => (<FormItem><FormLabel>Care</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>)} />}
      </div>
    );
  };

  return (
    <>
      <DialogHeader><DialogTitle>Oral Assessment</DialogTitle><DialogDescription>Complete the oral assessment</DialogDescription></DialogHeader>
      <div>
        <Form {...form}>
          <form className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h3 className="font-semibold">Resident Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="residentName" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><Input {...field} /></FormItem>} />
                <FormField control={form.control} name="completedBy" render={({ field }) => <FormItem><FormLabel>Completed By</FormLabel><Input {...field} /></FormItem>} />
              </div>
              <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full text-left">{field.value ? format(new Date(field.value), "PPP") : "Pick date"}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={d => { field.onChange(d?.getTime()); setDatePopoverOpen(false); }} /></PopoverContent></Popover></FormItem>
              )} />
            </div>
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <h3 className="font-semibold">Dental Info</h3>
              <FormField control={form.control} name="normalOralHygieneRoutine" render={({ field }) => <FormItem><FormLabel>Oral hygiene routine</FormLabel><Textarea {...field} rows={2} /></FormItem>} />
              <YesNoField fieldName="isRegisteredWithDentist" careField="dentistName" label="Registered with dentist?" />
            </div>
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <h3 className="font-semibold">Examination</h3>
              <YesNoField fieldName="lipsDryCracked" careField="lipsDryCrackedCare" label="Lips dry/cracked?" />
              <YesNoField fieldName="dryMouth" careField="dryMouthCare" label="Dry mouth?" />
              <YesNoField fieldName="hasNaturalTeeth" careField="naturalTeethCare" label="Natural teeth?" />
              <YesNoField fieldName="difficultySwallowing" careField="difficultySwallowingCare" label="Difficulty swallowing?" />
            </div>
          </form>
        </Form>
      </div>
      <DialogFooter>
        <Button onClick={() => onClose?.()} variant="outline" disabled={isLoading}>Cancel</Button>
        <Button onClick={form.handleSubmit(onSubmit, onValidationError)} disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</Button>
      </DialogFooter>
    </>
  );
}
