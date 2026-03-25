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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { oralAssessmentSchema } from "@/schemas/residents/care-file/oralAssessmentSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
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
  isInline?: boolean;
  viewOnly?: boolean;
}

// ── Evaluation constants ───────────────────────────────────────────────────────

const EVAL_FIELDS: { key: string; label: string }[] = [
  { key: "lips", label: "Lips" },
  { key: "tongue", label: "Tongue" },
  { key: "dentures", label: "Dentures" },
  { key: "teeth", label: "Teeth" },
  { key: "saliva", label: "Saliva" },
  { key: "pain", label: "Pain" },
  { key: "gums_soft_tissue", label: "Gums/Soft Tissue" },
  { key: "swallowing", label: "Swallowing" },
  { key: "nutrition", label: "Nutrition" },
  { key: "speech_difficulty", label: "Speech Difficulty" },
  { key: "dexterity_problems", label: "Dexterity Problems" },
  { key: "cognitive_function", label: "Cognitive Function" },
];

const defaultEvalState = () =>
  Object.fromEntries(EVAL_FIELDS.map((f) => [f.key, false])) as Record<string, boolean>;

export default function OralAssessmentDialog({
  teamId, residentId, organizationId, userId, userName, resident,
  careHomeName = "", onClose, initialData, isEditMode = false, isInline = false, viewOnly = false
}: OralAssessmentDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // ── Evaluation state ────────────────────────────────────────────────────────
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [evalValues, setEvalValues] = useState<Record<string, boolean>>(defaultEvalState());
  const [evalCompletedBy, setEvalCompletedBy] = useState(userName || "");
  const [evalDate, setEvalDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);

  const fetchEvaluations = async () => {
    if (!residentId) return;
    const { data, error } = await supabase
      .from("oral_assessment_evaluations")
      .select("*")
      .eq("resident_id", residentId)
      .order("evaluation_date", { ascending: false });
    if (!error && data) setEvaluations(data);
  };

  useEffect(() => {
    fetchEvaluations();
  }, [residentId]);

  const handleSubmitEval = async () => {
    if (!evalCompletedBy.trim()) {
      toast.error("Please enter who completed this evaluation.");
      return;
    }
    setIsSubmittingEval(true);
    try {
      const payload = {
        resident_id: residentId,
        organization_id: organizationId,
        completed_by: evalCompletedBy.trim(),
        evaluation_date: evalDate,
        ...evalValues,
      };
      const { error } = await supabase
        .from("oral_assessment_evaluations")
        .insert(payload);
      if (error) throw error;
      toast.success("Evaluation submitted successfully.");
      setShowEvalForm(false);
      setEvalValues(defaultEvalState());
      setEvalDate(format(new Date(), "yyyy-MM-dd"));
      await fetchEvaluations();
    } catch (err) {
      console.error("Error submitting evaluation:", err);
      toast.error("Failed to submit evaluation.");
    } finally {
      setIsSubmittingEval(false);
    }
  };

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
          assessment_date: new Date(values.assessmentDate || Date.now()).toISOString().split('T')[0],
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

  const renderInput = (field: any, props: any = {}) => viewOnly ? (
    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[40px]">
      {field.value || " "}
    </div>
  ) : <Input {...field} {...props} />;

  const renderTextarea = (field: any, props: any = {}) => viewOnly ? (
    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[80px]">
      {field.value || " "}
    </div>
  ) : <Textarea {...field} {...props} />;

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
        {show && <FormField control={form.control} name={careField as any} render={({ field }) => (<FormItem><FormLabel>Care</FormLabel><FormControl>{renderTextarea(field, { rows: 2 })}</FormControl></FormItem>)} />}
      </div>
    );
  };

  return (
    <>
      {!isInline && (
        <DialogHeader><DialogTitle>Oral Assessment</DialogTitle><DialogDescription>Complete the oral assessment</DialogDescription></DialogHeader>
      )}
      <div>
        <Form {...form}>
          <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
            <form onSubmit={form.handleSubmit(onSubmit, onValidationError)} className="space-y-4">
              <button
                type="button"
                id="care-file-submit-btn"
                className="hidden"
                onClick={form.handleSubmit(onSubmit, onValidationError)}
              />
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h3 className="font-semibold">Resident Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="residentName" render={({ field }) => <FormItem><FormLabel>Resident Name</FormLabel><FormControl>{renderInput(field, { disabled: true })}</FormControl></FormItem>} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => <FormItem><FormLabel>Date of Birth</FormLabel><FormControl>{renderInput(field, { disabled: true })}</FormControl></FormItem>} />
                  <FormField control={form.control} name="weight" render={({ field }) => <FormItem><FormLabel>Weight</FormLabel><FormControl>{renderInput(field, { placeholder: "e.g. 70kg" })}</FormControl></FormItem>} />
                  <FormField control={form.control} name="height" render={({ field }) => <FormItem><FormLabel>Height</FormLabel><FormControl>{renderInput(field, { placeholder: "e.g. 175cm" })}</FormControl></FormItem>} />

                  <FormField control={form.control} name="completedBy" render={({ field }) => <FormItem><FormLabel>Name of Person Completing Assessment</FormLabel><FormControl>{renderInput(field)}</FormControl></FormItem>} />
                  <FormField control={form.control} name="signature" render={({ field }) => <FormItem><FormLabel>Signature</FormLabel><FormControl>{renderInput(field)}</FormControl></FormItem>} />
                </div>

                <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                  <FormItem className="w-full md:w-1/2"><FormLabel>Date of Assessment</FormLabel><Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full text-left">{field.value ? format(new Date(field.value), "PPP") : "Pick date"}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={d => { field.onChange(d?.getTime()); setDatePopoverOpen(false); }} /></PopoverContent></Popover></FormItem>
                )} />
              </div>

              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h3 className="font-semibold">Dental Info</h3>
                <FormField control={form.control} name="normalOralHygieneRoutine" render={({ field }) => <FormItem><FormLabel>What is the normal oral hygiene routine at home?</FormLabel><FormControl>{renderTextarea(field, { rows: 2 })}</FormControl></FormItem>} />

                <div className="space-y-4 border p-4 rounded-md">
                  <FormField control={form.control} name="isRegisteredWithDentist" render={({ field }) => (
                    <FormItem className="flex items-center gap-4"><FormLabel className="flex-1">Is the resident registered with a Dentist?</FormLabel><FormControl>
                      <RadioGroup onValueChange={v => field.onChange(v === "yes")} value={field.value ? "yes" : "no"} className="flex gap-4">
                        <div className="flex items-center space-x-1"><RadioGroupItem value="yes" /><span className="text-sm">Yes</span></div>
                        <div className="flex items-center space-x-1"><RadioGroupItem value="no" /><span className="text-sm">No</span></div>
                      </RadioGroup>
                    </FormControl></FormItem>
                  )} />

                  {form.watch("isRegisteredWithDentist") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <FormField control={form.control} name="lastSeenByDentist" render={({ field }) => (
                        <FormItem className="flex flex-col pt-2 md:col-span-1">
                          <FormLabel>When was the resident last seen by a Dentist?</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    isNaN(new Date(field.value).getTime()) ? field.value : format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value) : undefined}
                                onSelect={d => d ? field.onChange(d.toISOString()) : field.onChange("")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="dentistName" render={({ field }) => <FormItem><FormLabel>Dentist&apos;s Name</FormLabel><FormControl>{renderInput(field)}</FormControl></FormItem>} />
                      <FormField control={form.control} name="dentalPracticeAddress" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Dental Practice Address</FormLabel><FormControl>{renderTextarea(field, { rows: 2 })}</FormControl></FormItem>} />
                      <FormField control={form.control} name="contactTelephone" render={({ field }) => <FormItem><FormLabel>Contact Telephone</FormLabel><FormControl>{renderInput(field)}</FormControl></FormItem>} />
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h3 className="font-semibold">Oral Assessment - Examination</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground border-b pb-1">Lips, Tongue &amp; Saliva</h4>
                    <YesNoField fieldName="lipsDryCracked" careField="lipsDryCrackedCare" label="Lips: Dry / Cracked" />
                    <YesNoField fieldName="tongueDryCracked" careField="tongueDryCrackedCare" label="Tongue: Dry / Cracked" />
                    <YesNoField fieldName="tongueUlceration" careField="tongueUlcerationCare" label="Tongue: Evidence of ulceration/soreness" />
                    <YesNoField fieldName="dryMouth" careField="dryMouthCare" label="Saliva: Dry Mouth" />

                    <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mt-6">Dentures &amp; Teeth</h4>
                    <YesNoField fieldName="hasTopDenture" careField="topDentureCare" label="Dentures: Top Denture?" />
                    <YesNoField fieldName="hasLowerDenture" careField="lowerDentureCare" label="Dentures: Lower Denture?" />
                    <YesNoField fieldName="hasDenturesAndNaturalTeeth" careField="denturesAndNaturalTeethCare" label="Dentures and natural teeth?" />
                    <YesNoField fieldName="hasNaturalTeeth" careField="naturalTeethCare" label="Teeth: Natural teeth" />
                    <YesNoField fieldName="evidencePlaqueDebris" careField="plaqueDebrisCare" label="Teeth: Evidence of plaque / debris" />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground border-b pb-1">Pain, Gums &amp; Swallowing</h4>
                    <YesNoField fieldName="painWhenEating" careField="painWhenEatingCare" label="Pain: When eating/drinking caused by teeth/dentures" />
                    <YesNoField fieldName="gumsUlceration" careField="gumsUlcerationCare" label="Gums / Soft tissue: Evidence of soreness/ulceration" />
                    <YesNoField fieldName="difficultySwallowing" careField="difficultySwallowingCare" label="Swallowing: Difficulty with swallowing" />

                    <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mt-6">Nutrition</h4>
                    <YesNoField fieldName="poorFluidDietaryIntake" careField="poorFluidDietaryIntakeCare" label="Fluid/dietary intake poor" />
                    <YesNoField fieldName="dehydrated" careField="dehydratedCare" label="Dehydrated" />

                    <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mt-6">Speech, Dexterity &amp; Cognition</h4>
                    <YesNoField fieldName="speechDifficultyDryMouth" careField="speechDifficultyDryMouthCare" label="Speech Difficulty: Due to dry mouth?" />
                    <YesNoField fieldName="speechDifficultyDenturesSlipping" careField="speechDifficultyDenturesSlippingCare" label="Speech Difficulty: Due to dentures slipping" />
                    <YesNoField fieldName="dexterityProblems" careField="dexterityProblemsCare" label="Dexterity: Difficulty or unable to hold a toothbrush" />
                    <YesNoField fieldName="cognitiveImpairment" careField="cognitiveImpairmentCare" label="Cognitive: Evidence of short-term memory loss/confusion" />
                  </div>
                </div>
              </div>

            </form>
          </fieldset>

          {/* ── Evaluations Section ────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 mt-6 p-4 border rounded-lg bg-card mb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Evaluations
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {evaluations.length}
                </span>
              </h3>
              {!showEvalForm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEvalForm(true)}
                  className="gap-2 keep-interactive"
                >
                  <Plus className="h-4 w-4 keep-interactive" />
                  Add Evaluation
                </Button>
              )}
            </div>

            {/* Add Evaluation inline form */}
            {showEvalForm && (
              <div className="border rounded-lg p-4 bg-muted/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">New Evaluation</h4>
                  <button
                    type="button"
                    onClick={() => { setShowEvalForm(false); setEvalValues(defaultEvalState()); }}
                    className="text-muted-foreground hover:text-foreground transition-colors keep-interactive"
                  >
                    <X className="h-4 w-4 keep-interactive" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Completed By</label>
                    <Input
                      value={evalCompletedBy}
                      onChange={e => setEvalCompletedBy(e.target.value)}
                      placeholder="Enter name"
                      className="keep-interactive"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={evalDate}
                      onChange={e => setEvalDate(e.target.value)}
                      className="keep-interactive"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EVAL_FIELDS.map((f) => (
                    <div key={f.key} className="flex items-center justify-between p-2 border rounded bg-background">
                      <span className="text-sm font-medium">{f.label}</span>
                      <RadioGroup
                        value={evalValues[f.key] ? "yes" : "no"}
                        onValueChange={v => setEvalValues(prev => ({ ...prev, [f.key]: v === "yes" }))}
                        className="flex gap-3 keep-interactive"
                      >
                        <div className="flex items-center space-x-1 keep-interactive">
                          <RadioGroupItem value="yes" id={`eval-${f.key}-yes`} className="keep-interactive" />
                          <label htmlFor={`eval-${f.key}-yes`} className="text-sm cursor-pointer keep-interactive">Yes</label>
                        </div>
                        <div className="flex items-center space-x-1 keep-interactive">
                          <RadioGroupItem value="no" id={`eval-${f.key}-no`} className="keep-interactive" />
                          <label htmlFor={`eval-${f.key}-no`} className="text-sm cursor-pointer keep-interactive">No</label>
                        </div>
                      </RadioGroup>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowEvalForm(false); setEvalValues(defaultEvalState()); }}
                    disabled={isSubmittingEval}
                    className="keep-interactive"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmitEval}
                    disabled={isSubmittingEval}
                    className="keep-interactive"
                  >
                    {isSubmittingEval ? "Submitting..." : "Submit Evaluation"}
                  </Button>
                </div>
              </div>
            )}

            {/* Evaluations Table */}
            {evaluations.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Completed By</TableHead>
                      {EVAL_FIELDS.map(f => (
                        <TableHead key={f.key} className="text-center whitespace-nowrap text-xs px-2">{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((ev) => (
                      <TableRow key={ev.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium whitespace-nowrap">
                          {ev.evaluation_date ? format(new Date(ev.evaluation_date), "dd/MM/yyyy") : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap max-w-[120px] truncate">
                          {ev.completed_by || "—"}
                        </TableCell>
                        {EVAL_FIELDS.map(f => (
                          <TableCell key={f.key} className="text-center px-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${ev[f.key]
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}>
                              {ev[f.key] ? "Yes" : "No"}
                            </span>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : !showEvalForm ? (
              <div className="text-center py-8 rounded-xl border border-dashed text-sm text-muted-foreground bg-muted/20">
                No evaluations found for this assessment.
              </div>
            ) : null}
          </div>
        </Form>
      </div>
      {!isInline && !viewOnly && (
        <DialogFooter>
          <Button onClick={() => onClose?.()} variant="outline" disabled={isLoading}>Cancel</Button>
          <Button onClick={form.handleSubmit(onSubmit, onValidationError)} disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      )}
    </>
  );
}
