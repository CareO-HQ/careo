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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { bladderBowelAssessmentSchema } from "@/schemas/residents/care-file/bladderBowelSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Calendar } from "@/components/ui/calendar";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface BladderBowelDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function ContinenceDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: BladderBowelDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [loadingState, setLoadingState] = useState("");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isLoading, startTransition] = useTransition();

  const form = useForm<z.infer<typeof bladderBowelAssessmentSchema>>({
    resolver: zodResolver(bladderBowelAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId,
        teamId,
        organizationId,
        userId,
        residentName: initialData.residentName || (resident ? `${resident.first_name} ${resident.last_name}` : ""),
        dateOfBirth: initialData.dateOfBirth || (resident && resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : 0),
        bedroomNumber: initialData.bedroomNumber || resident?.room_number || "",
        informationObtainedFrom: initialData.informationObtainedFrom || "",
        completedBy: initialData.completed_by || userName,
        assessmentDate: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : Date.now(),

        // Flatten Lifestyle Factors
        smoking: initialData.lifestyle_factors?.smoking || initialData.smoking || "NON-SMOKER",
        weight: initialData.lifestyle_factors?.weight || initialData.weight || "NORMAL",
        skinCondition: initialData.lifestyle_factors?.skinCondition || initialData.skinCondition || "HEALTHY",
        mentalState: initialData.lifestyle_factors?.mentalState || initialData.mentalState || "ALERT",
        mobilityIssues: initialData.lifestyle_factors?.mobilityIssues || initialData.mobilityIssues || "INDEPENDENT",
        constipationHistory: initialData.lifestyle_factors?.constipationHistory || initialData.constipationHistory || false,
        historyRecurrentUTIs: initialData.lifestyle_factors?.historyRecurrentUTIs || initialData.historyRecurrentUTIs || false,
        caffeineMls24h: initialData.lifestyle_factors?.caffeineMls24h || initialData.caffeineMls24h || 0,
        caffeineFrequency: initialData.lifestyle_factors?.caffeineFrequency || initialData.caffeineFrequency || "",
        caffeineTimeOfDay: initialData.lifestyle_factors?.caffeineTimeOfDay || initialData.caffeineTimeOfDay || "",
        excersiceType: initialData.lifestyle_factors?.excersiceType || initialData.excersiceType || "",
        excersiceFrequency: initialData.lifestyle_factors?.excersiceFrequency || initialData.excersiceFrequency || "",
        excersiceTimeOfDay: initialData.lifestyle_factors?.excersiceTimeOfDay || initialData.excersiceTimeOfDay || "",
        alcoholAmount24h: initialData.lifestyle_factors?.alcoholAmount24h || initialData.alcoholAmount24h || 0,
        alcoholFrequency: initialData.lifestyle_factors?.alcoholFrequency || initialData.alcoholFrequency || "",
        alcoholTimeOfDay: initialData.lifestyle_factors?.alcoholTimeOfDay || initialData.alcoholTimeOfDay || "",

        // Flatten Bladder Pattern
        incontinence: initialData.bladder_pattern?.incontinence || initialData.incontinence || "NONE",
        volume: initialData.bladder_pattern?.volume || initialData.volume || "UNABLE-DETERMINE",
        onset: initialData.bladder_pattern?.onset || initialData.onset || "GRADUAL",
        duration: initialData.bladder_pattern?.duration || initialData.duration || "LESS-6M",
        dayPattern: initialData.bladder_pattern?.dayPattern || initialData.dayPattern || "TOILET",
        eveningPattern: initialData.bladder_pattern?.eveningPattern || initialData.eveningPattern || "TOILET",
        nightPattern: initialData.bladder_pattern?.nightPattern || initialData.nightPattern || "TOILET",
        typesOfPads: initialData.bladder_pattern?.typesOfPads || initialData.typesOfPads || "",
        bladderIncontinentType: initialData.bladder_pattern?.bladderIncontinentType || initialData.bladderIncontinentType || "FUNCTIONAL",
        bladderReferralRequired: initialData.bladder_pattern?.bladderReferralRequired || initialData.bladderReferralRequired || "NONE",
        bladderPlanFollowed: initialData.bladder_pattern?.bladderPlanFollowed || initialData.bladderPlanFollowed || "URGE",
        bladderContinent: initialData.bladder_pattern?.bladderContinent || initialData.bladderContinent || false,
        bladderIncontinent: initialData.bladder_pattern?.bladderIncontinent || initialData.bladderIncontinent || false,
        bladderPlanCommenced: initialData.bladder_pattern?.bladderPlanCommenced || initialData.bladderPlanCommenced || false,
        symptompsLastSix: initialData.bladder_pattern?.symptompsLastSix || initialData.symptompsLastSix || "STABLE",
        physicianConsulted: initialData.bladder_pattern?.physicianConsulted || initialData.physicianConsulted || false,

        // Flatten Bowel Pattern
        bowelState: initialData.bowel_pattern?.bowelState || initialData.bowelState || "NORMAL",
        bowelFrequency: initialData.bowel_pattern?.bowelFrequency || initialData.bowelFrequency || "",
        usualTimeOfDat: initialData.bowel_pattern?.usualTimeOfDat || initialData.usualTimeOfDat || "",
        amountAndStoolType: initialData.bowel_pattern?.amountAndStoolType || initialData.amountAndStoolType || "",
        liquidFeeds: initialData.bowel_pattern?.liquidFeeds || initialData.liquidFeeds || "",
        otherFactors: initialData.bowel_pattern?.otherFactors || initialData.otherFactors || "",
        otherRemedies: initialData.bowel_pattern?.otherRemedies || initialData.otherRemedies || "",
        bowelReferralRequired: initialData.bowel_pattern?.bowelReferralRequired || initialData.bowelReferralRequired || "NONE",
        bowelContinent: initialData.bowel_pattern?.bowelContinent || initialData.bowelContinent || false,
        bowelIncontinent: initialData.bowel_pattern?.bowelIncontinent || initialData.bowelIncontinent || false,
        bowelPlanCommenced: initialData.bowel_pattern?.bowelPlanCommenced || initialData.bowelPlanCommenced || false,
        bowelRecordCommenced: initialData.bowel_pattern?.bowelRecordCommenced || initialData.bowelRecordCommenced || false,
        medicalOfficerConsulted: initialData.bowel_pattern?.medicalOfficerConsulted || initialData.medicalOfficerConsulted || false,

        // Symptoms etc
        hepatitisAB: initialData.symptoms?.infections?.hepatitisAB || initialData.hepatitisAB || false,
        bloodBorneVirues: initialData.symptoms?.infections?.bloodBorneVirues || initialData.bloodBorneVirues || false,
        mrsa: initialData.symptoms?.infections?.mrsa || initialData.mrsa || false,
        esbl: initialData.symptoms?.infections?.esbl || initialData.esbl || false,
        other: initialData.symptoms?.infections?.other || initialData.other || "",

        ph: initialData.symptoms?.urinalysis?.ph || initialData.ph || false,
        nitrates: initialData.symptoms?.urinalysis?.nitrates || initialData.nitrates || false,
        protein: initialData.symptoms?.urinalysis?.protein || initialData.protein || false,
        leucocytes: initialData.symptoms?.urinalysis?.leucocytes || initialData.leucocytes || false,
        glucose: initialData.symptoms?.urinalysis?.glucose || initialData.glucose || false,
        bloodResult: initialData.symptoms?.urinalysis?.bloodResult || initialData.bloodResult || false,
        mssuDate: initialData.symptoms?.urinalysis?.mssuDate || initialData.mssuDate || 0,

        antiHypertensives: initialData.symptoms?.medications?.antiHypertensives || initialData.antiHypertensives || false,
        antiParkinsonDrugs: initialData.symptoms?.medications?.antiParkinsonDrugs || initialData.antiParkinsonDrugs || false,
        ironSupplement: initialData.symptoms?.medications?.ironSupplement || initialData.ironSupplement || false,
        laxatives: initialData.symptoms?.medications?.laxatives || initialData.laxatives || false,
        diuretics: initialData.symptoms?.medications?.diuretics || initialData.diuretics || false,
        histamine: initialData.symptoms?.medications?.histamine || initialData.histamine || false,
        antiDepressants: initialData.symptoms?.medications?.antiDepressants || initialData.antiDepressants || false,
        cholinergic: initialData.symptoms?.medications?.cholinergic || initialData.cholinergic || false,
        sedativesHypnotic: initialData.symptoms?.medications?.sedativesHypnotic || initialData.sedativesHypnotic || false,
        antiPsychotic: initialData.symptoms?.medications?.antiPsychotic || initialData.antiPsychotic || false,
        antihistamines: initialData.symptoms?.medications?.antihistamines || initialData.antihistamines || false,
        narcoticAnalgesics: initialData.symptoms?.medications?.narcoticAnalgesics || initialData.narcoticAnalgesics || false,

        leakCoughLaugh: initialData.symptoms?.specific?.leakCoughLaugh || initialData.leakCoughLaugh || false,
        leakStandingUp: initialData.symptoms?.specific?.leakStandingUp || initialData.leakStandingUp || false,
        leakUpstairsDownhill: initialData.symptoms?.specific?.leakUpstairsDownhill || initialData.leakUpstairsDownhill || false,
        passesUrineFrequently: initialData.symptoms?.specific?.passesUrineFrequently || initialData.passesUrineFrequently || false,
        desirePassUrine: initialData.symptoms?.specific?.desirePassUrine || initialData.desirePassUrine || false,
        leaksBeforeToilet: initialData.symptoms?.specific?.leaksBeforeToilet || initialData.leaksBeforeToilet || false,
        moreThanTwiceAtNight: initialData.symptoms?.specific?.moreThanTwiceAtNight || initialData.moreThanTwiceAtNight || false,
        anxiety: initialData.symptoms?.specific?.anxiety || initialData.anxiety || false,
        difficultyStarting: initialData.symptoms?.specific?.difficultyStarting || initialData.difficultyStarting || false,
        hesintancy: initialData.symptoms?.specific?.hesintancy || initialData.hesintancy || false,
        dribbles: initialData.symptoms?.specific?.dribbles || initialData.dribbles || false,
        feelsFull: initialData.symptoms?.specific?.feelsFull || initialData.feelsFull || false,
        recurrentTractInfections: initialData.symptoms?.specific?.recurrentTractInfections || initialData.recurrentTractInfections || false,
        pain: initialData.symptoms?.specific?.pain || initialData.pain || false,

        limitedMobility: initialData.symptoms?.functional?.limitedMobility || initialData.limitedMobility || false,
        unableOnTime: initialData.symptoms?.functional?.unableOnTime || initialData.unableOnTime || false,
        notHoldUrinalOrSeat: initialData.symptoms?.functional?.notHoldUrinalOrSeat || initialData.notHoldUrinalOrSeat || false,
        notuseCallBell: initialData.symptoms?.functional?.notuseCallBell || initialData.notuseCallBell || false,
        poorVision: initialData.symptoms?.functional?.poorVision || initialData.poorVision || false,
        assistedTransfer: initialData.symptoms?.functional?.assistedTransfer || initialData.assistedTransfer || false,

        sigantureCompletingAssessment: initialData.completed_by || initialData.sigantureCompletingAssessment || userName,
        sigantureResident: initialData.sigantureResident || "",
        dateNextReview: initialData.next_review_date ? new Date(initialData.next_review_date).getTime() : new Date().getTime()
      }
      : {
        residentId,
        teamId,
        organizationId,
        userId,
        residentName: resident ? `${resident.first_name} ${resident.last_name}` : "",
        dateOfBirth: resident && resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : 0,
        bedroomNumber: resident?.room_number || "",
        informationObtainedFrom: "",
        completedBy: userName,
        assessmentDate: Date.now(),
        sigantureCompletingAssessment: userName,
        sigantureResident: "",

        smoking: "NON-SMOKER",
        weight: "NORMAL",
        skinCondition: "HEALTHY",
        mentalState: "ALERT",
        mobilityIssues: "INDEPENDENT",
        incontinence: "NONE",
        volume: "UNABLE-DETERMINE",
        onset: "GRADUAL",
        duration: "LESS-6M",
        dayPattern: "TOILET",
        eveningPattern: "TOILET",
        nightPattern: "TOILET",
        bladderIncontinentType: "FUNCTIONAL",
        bladderReferralRequired: "NONE",
        bladderPlanFollowed: "URGE",
        bowelState: "NORMAL",
        bowelReferralRequired: "NONE",
        symptompsLastSix: "STABLE",

        bowelFrequency: "",
        usualTimeOfDat: "",
        amountAndStoolType: "",
        liquidFeeds: "",
        otherFactors: "",
        otherRemedies: "",
        typesOfPads: "",

        dateNextReview: new Date().getTime() + (30 * 24 * 60 * 60 * 1000) // 30 days default
      }
  });

  if (!resident) return null;

  const onSubmit = async (values: z.infer<typeof bladderBowelAssessmentSchema>) => {
    startTransition(async () => {
      try {
        const lifestyleFactors = {
          smoking: values.smoking, weight: values.weight, skinCondition: values.skinCondition,
          mentalState: values.mentalState, mobilityIssues: values.mobilityIssues,
          constipationHistory: values.constipationHistory, historyRecurrentUTIs: values.historyRecurrentUTIs,
          caffeineMls24h: values.caffeineMls24h, caffeineFrequency: values.caffeineFrequency, caffeineTimeOfDay: values.caffeineTimeOfDay,
          excersiceType: values.excersiceType, excersiceFrequency: values.excersiceFrequency, excersiceTimeOfDay: values.excersiceTimeOfDay,
          alcoholAmount24h: values.alcoholAmount24h, alcoholFrequency: values.alcoholFrequency, alcoholTimeOfDay: values.alcoholTimeOfDay
        };

        const bladderPattern = {
          incontinence: values.incontinence, volume: values.volume, onset: values.onset, duration: values.duration,
          dayPattern: values.dayPattern, eveningPattern: values.eveningPattern, nightPattern: values.nightPattern,
          typesOfPads: values.typesOfPads, bladderIncontinentType: values.bladderIncontinentType,
          bladderReferralRequired: values.bladderReferralRequired, bladderPlanFollowed: values.bladderPlanFollowed,
          bladderContinent: values.bladderContinent, bladderIncontinent: values.bladderIncontinent,
          bladderPlanCommenced: values.bladderPlanCommenced, symptompsLastSix: values.symptompsLastSix,
          physicianConsulted: values.physicianConsulted
        };

        const bowelPattern = {
          bowelState: values.bowelState, bowelFrequency: values.bowelFrequency, usualTimeOfDat: values.usualTimeOfDat,
          amountAndStoolType: values.amountAndStoolType, liquidFeeds: values.liquidFeeds,
          otherFactors: values.otherFactors, otherRemedies: values.otherRemedies,
          bowelReferralRequired: values.bowelReferralRequired, bowelContinent: values.bowelContinent,
          bowelIncontinent: values.bowelIncontinent, bowelPlanCommenced: values.bowelPlanCommenced,
          bowelRecordCommenced: values.bowelRecordCommenced, medicalOfficerConsulted: values.medicalOfficerConsulted
        };

        const symptoms = {
          infections: {
            hepatitisAB: values.hepatitisAB, bloodBorneVirues: values.bloodBorneVirues, mrsa: values.mrsa, esbl: values.esbl, other: values.other
          },
          urinalysis: {
            ph: values.ph, nitrates: values.nitrates, protein: values.protein, leucocytes: values.leucocytes,
            glucose: values.glucose, bloodResult: values.bloodResult, mssuDate: values.mssuDate
          },
          medications: {
            antiHypertensives: values.antiHypertensives, antiParkinsonDrugs: values.antiParkinsonDrugs,
            ironSupplement: values.ironSupplement, laxatives: values.laxatives, diuretics: values.diuretics,
            histamine: values.histamine, antiDepressants: values.antiDepressants, cholinergic: values.cholinergic,
            sedativesHypnotic: values.sedativesHypnotic, antiPsychotic: values.antiPsychotic,
            antihistamines: values.antihistamines, narcoticAnalgesics: values.narcoticAnalgesics
          },
          specific: {
            leakCoughLaugh: values.leakCoughLaugh, leakStandingUp: values.leakStandingUp, leakUpstairsDownhill: values.leakUpstairsDownhill,
            passesUrineFrequently: values.passesUrineFrequently, desirePassUrine: values.desirePassUrine, leaksBeforeToilet: values.leaksBeforeToilet,
            moreThanTwiceAtNight: values.moreThanTwiceAtNight, anxiety: values.anxiety, difficultyStarting: values.difficultyStarting,
            hesintancy: values.hesintancy, dribbles: values.dribbles, feelsFull: values.feelsFull,
            recurrentTractInfections: values.recurrentTractInfections, pain: values.pain
          },
          functional: {
            limitedMobility: values.limitedMobility, unableOnTime: values.unableOnTime, notHoldUrinalOrSeat: values.notHoldUrinalOrSeat,
            notuseCallBell: values.notuseCallBell, poorVision: values.poorVision, assistedTransfer: values.assistedTransfer
          }
        };

        const payload = {
          resident_id: resident.id,
          organization_id: organizationId,
          lifestyle_factors: lifestyleFactors,
          bladder_pattern: bladderPattern,
          bowel_pattern: bowelPattern,
          symptoms: symptoms,
          plan_commenced: values.bladderPlanCommenced || values.bowelPlanCommenced,
          next_review_date: values.dateNextReview ? new Date(values.dateNextReview).toISOString().split('T')[0] : null,
          assessment_date: new Date(values.assessmentDate).toISOString().split('T')[0],
          completed_by: values.completedBy,
          created_by: userId,
        };

        await submitAssessmentWithVersioning(
          'bladder_bowel_assessments',
          payload,
          initialData,
          isEditMode
        );

        toast.success(isEditMode ? "Assessment updated" : "Assessment submitted");
        onClose?.();
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment.");
      }
    });
  };

  const StepAction = async () => {
    let fields: string[] = [];
    if (step === 1) fields = ["residentName", "dateOfBirth", "informationObtainedFrom", "completedBy", "assessmentDate"];
    else if (step === 5) fields = ["smoking", "weight", "skinCondition"];
    else if (step === 6) fields = ["incontinence", "volume", "onset"];
    else if (step === 7) fields = ["bowelState"];
    else if (step === 8) fields = ["dayPattern", "eveningPattern", "nightPattern"];
    else if (step === 12) fields = ["bladderReferralRequired", "bowelReferralRequired", "bladderIncontinentType"];

    const isValid = await form.trigger(fields as any);
    if (isValid) setStep(step + 1);
    else {
      toast.error("Please complete all required fields in this step.");
    }
  };

  const CheckboxEntry = ({ name, label }: { name: string, label: string }) => (
    <FormField control={form.control} name={name as any} render={({ field }) => (
      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-card/50">
        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
        <div className="space-y-1 leading-none"><FormLabel className="cursor-pointer">{label}</FormLabel></div>
      </FormItem>
    )} />
  );

  return (
    <div className="max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Bladder & Bowel Assessment (Step {step}/13)</DialogTitle>
        <DialogDescription>
          {step === 1 && "General Information"}
          {step === 2 && "Infection Risks"}
          {step === 3 && "Urinalysis"}
          {step === 4 && "Medications"}
          {step === 5 && "Lifestyle Factors"}
          {step === 6 && "Urinary Continence Level"}
          {step === 7 && "Bowel Pattern"}
          {step === 8 && "Toileting Habits & Products"}
          {step === 9 && "Bladder Symptoms (Trigger Leakage)"}
          {step === 10 && "Bladder Symptoms (Slow Voiding)"}
          {step === 11 && "Functional Factors"}
          {step === 12 && "Plan & Referral Decisions"}
          {step === 13 && "Assessment Completion"}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto py-6 px-1">
        <Form {...form}>
          <form className="space-y-6">
            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="residentName" render={({ field }) => <FormItem><FormLabel>Resident Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="bedroomNumber" render={({ field }) => <FormItem><FormLabel>Bedroom Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="informationObtainedFrom" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Information Obtained From (e.g. Resident, Note, Staff)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="completedBy" render={({ field }) => (<FormItem><FormLabel>Completed By</FormLabel><FormControl><Input {...field} readOnly disabled className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Assessment Date</FormLabel>
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal>
                      <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDatePopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} /></PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CheckboxEntry name="hepatitisAB" label="Hepatitis A/B" />
                <CheckboxEntry name="bloodBorneVirues" label="Blood Borne Viruses" />
                <CheckboxEntry name="mrsa" label="MRSA" />
                <CheckboxEntry name="esbl" label="ESBL" />
                <FormField control={form.control} name="other" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Other Infectious Checks</FormLabel><FormControl><Input placeholder="Details..." {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <CheckboxEntry name="ph" label="pH Result" />
                  <CheckboxEntry name="nitrates" label="Nitrates" />
                  <CheckboxEntry name="protein" label="Protein" />
                  <CheckboxEntry name="leucocytes" label="Leucocytes" />
                  <CheckboxEntry name="glucose" label="Glucose" />
                  <CheckboxEntry name="bloodResult" label="Blood" />
                </div>
                <FormField control={form.control} name="mssuDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>MSSU Sent Date (if applicable)</FormLabel>
                    <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : "Pick a date"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={d => field.onChange(d?.getTime())} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { n: "antiHypertensives", l: "Anti-hypertensives" }, { n: "antiParkinsonDrugs", l: "Anti-Parkinson Drugs" },
                  { n: "ironSupplement", l: "Iron Supplement" }, { n: "laxatives", l: "Laxatives" },
                  { n: "diuretics", l: "Diuretics" }, { n: "histamine", l: "Histamine blockers" },
                  { n: "antiDepressants", l: "Anti-depressants" }, { n: "cholinergic", l: "Cholinergic agents" },
                  { n: "sedativesHypnotic", l: "Sedatives/Hypnotics" }, { n: "antiPsychotic", l: "Anti-psychotics" },
                  { n: "antihistamines", l: "Antihistamines" }, { n: "narcoticAnalgesics", l: "Narcotic Analgesics" }
                ].map(med => <CheckboxEntry key={med.n} name={med.n} label={med.l} />)}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="smoking" render={({ field }) => <FormItem><FormLabel>Smoking Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="SMOKER">Smoker</SelectItem><SelectItem value="NON-SMOKER">Non-Smoker</SelectItem><SelectItem value="EX-SMOKER">Ex-Smoker</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="weight" render={({ field }) => <FormItem><FormLabel>Weight Check</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="OBESE">Obese</SelectItem><SelectItem value="UNDERWEIGHT">Underweight</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="skinCondition" render={({ field }) => <FormItem><FormLabel>Skin Conditioning</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="HEALTHY">Healthy</SelectItem><SelectItem value="RED">Red/Inflamed</SelectItem><SelectItem value="EXCORIATED">Excoriated</SelectItem><SelectItem value="BROKEN">Broken</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CheckboxEntry name="constipationHistory" label="History of Constipation?" />
                  <CheckboxEntry name="historyRecurrentUTIs" label="History of Recurrent UTIs?" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/30">
                  <h4 className="md:col-span-2 font-bold border-b pb-2">Lifestyle Details</h4>
                  <FormField control={form.control} name="caffeineMls24h" render={({ field }) => <FormItem><FormLabel>Caffeine (24hr ml)</FormLabel><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="alcoholAmount24h" render={({ field }) => <FormItem><FormLabel>Alcohol (Units/day)</FormLabel><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /><FormMessage /></FormItem>} />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                <FormField control={form.control} name="incontinence" render={({ field }) => (
                  <FormItem><FormLabel>Frequency of Urinary Incontinence</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger><SelectContent>
                    <SelectItem value="NONE">None</SelectItem><SelectItem value="ONE">Less than 1 episode/week</SelectItem>
                    <SelectItem value="1-2DAY">1 or 2 episodes every day/night</SelectItem><SelectItem value="3DAY">3 or more episodes during day/night</SelectItem>
                    <SelectItem value="NIGHT">Night incidents only</SelectItem><SelectItem value="DAYANDNIGHT">Both Day and Night</SelectItem>
                  </SelectContent></Select><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="volume" render={({ field }) => <FormItem><FormLabel>Volume</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ENTIRE-BLADDER">Entire Bladder</SelectItem><SelectItem value="SMALL-VOL">Small Volume</SelectItem><SelectItem value="UNABLE-DETERMINE">Unable to determine</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="onset" render={({ field }) => <FormItem><FormLabel>Onset</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SUDDEN">Sudden</SelectItem><SelectItem value="GRADUAL">Gradual</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                </div>
                <CheckboxEntry name="physicianConsulted" label="Has Physician been consulted about these issues?" />
              </div>
            )}

            {step === 7 && (
              <div className="space-y-6">
                <FormField control={form.control} name="bowelState" render={({ field }) => (
                  <FormItem><FormLabel>Bowel Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="CONSTIPATION">Constipation</SelectItem>
                    <SelectItem value="DIARRHOEA">Diarrhoea</SelectItem><SelectItem value="STOMA">Stoma in situ</SelectItem>
                    <SelectItem value="FAECAL-INCONTINENCE">Faecal Incontinence</SelectItem><SelectItem value="IRRITABLE-BOWEL">IBS History</SelectItem>
                  </SelectContent></Select><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="bowelFrequency" render={({ field }) => <FormItem><FormLabel>Frequency</FormLabel><Input {...field} /><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="usualTimeOfDat" render={({ field }) => <FormItem><FormLabel>Usual Time of Day</FormLabel><Input {...field} /><FormMessage /></FormItem>} />
                </div>
                <FormField control={form.control} name="amountAndStoolType" render={({ field }) => <FormItem><FormLabel>Bristol Stool Type & Amount</FormLabel><Input {...field} /><FormMessage /></FormItem>} />
                <CheckboxEntry name="medicalOfficerConsulted" label="Medical Officer Consulted?" />
              </div>
            )}

            {step === 8 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {["day", "evening", "night"].map(p => (
                    <FormField key={p} control={form.control} name={`${p}Pattern` as any} render={({ field }) => (
                      <FormItem><FormLabel className="capitalize">{p} Toileting Pattern</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TOILET">Toilet</SelectItem><SelectItem value="COMMODE">Commode</SelectItem><SelectItem value="BED-PAN">Bed-pan</SelectItem><SelectItem value="URINAL">Urinal</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  ))}
                </div>
                <FormField control={form.control} name="typesOfPads" render={({ field }) => <FormItem><FormLabel>Specify Types of Continance Pads/Aids In Use</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            )}

            {step === 9 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { n: "leakCoughLaugh", l: "Leaks when sneezing/coughing/laughing?" },
                  { n: "leakStandingUp", l: "Leaks when standing up from chair/bed?" },
                  { n: "leakUpstairsDownhill", l: "Leaks going upstairs or downhill?" },
                  { n: "passesUrineFrequently", l: "Passes urine frequently (more than 7 x day)?" },
                  { n: "desirePassUrine", l: "Desire to pass urine is powerful & overwhelming?" },
                  { n: "leaksBeforeToilet", l: "Leakage occurs before reaching toilet?" },
                  { n: "moreThanTwiceAtNight", l: "Passes urine more than twice at night?" },
                  { n: "anxiety", l: "Anxious and constantly looks for a toilet?" }
                ].map(s => <CheckboxEntry key={s.n} name={s.n} label={s.l} />)}
              </div>
            )}

            {step === 10 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { n: "difficultyStarting", l: "Difficulty starting urine stream?" },
                  { n: "hesintancy", l: "Hesitancy or slow stream?" },
                  { n: "dribbles", l: "Dribbles after finishing micturition?" },
                  { n: "feelsFull", l: "Bladder feels full after finishing?" },
                  { n: "recurrentTractInfections", l: "Recent recurrent tract infections?" },
                  { n: "pain", l: "Pain on passing urine?" }
                ].map(s => <CheckboxEntry key={s.n} name={s.n} label={s.l} />)}
              </div>
            )}

            {step === 11 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { n: "limitedMobility", l: "Limited mobility and cannot get to toilet?" },
                  { n: "unableOnTime", l: "Not agile enough to manage clothes in time?" },
                  { n: "notHoldUrinalOrSeat", l: "Unable to hold urinal/transfer to seat?" },
                  { n: "notuseCallBell", l: "Unable to use call bell for aid?" },
                  { n: "poorVision", l: "Poor vision affecting toileting?" },
                  { n: "assistedTransfer", l: "Requires assisted transfer to toilet?" }
                ].map(s => <CheckboxEntry key={s.n} name={s.n} label={s.l} />)}
              </div>
            )}

            {step === 12 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold border-b">Bladder Decisions</h4>
                    <CheckboxEntry name="bladderContinent" label="Resident is Continent" />
                    <CheckboxEntry name="bladderIncontinent" label="Incontinent of Urine" />
                    <FormField control={form.control} name="bladderIncontinentType" render={({ field }) => (
                      <FormItem><FormLabel>Incontinence Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="STRESS">Stress</SelectItem><SelectItem value="URGE">Urge</SelectItem><SelectItem value="MIXED">Mixed</SelectItem><SelectItem value="FUNCTIONAL">Functional</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="bladderReferralRequired" render={({ field }) => (
                      <FormItem><FormLabel>Referral Required?</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                        <SelectItem value="NONE">None</SelectItem><SelectItem value="GP">General Practitioner</SelectItem><SelectItem value="OT">Occupational Therapist</SelectItem>
                        <SelectItem value="CONTINENCE-NURSE">Continence Nurse</SelectItem><SelectItem value="PHYSIOTHERAPIST">Physiotherapist</SelectItem>
                      </SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold border-b">Bowel Decisions</h4>
                    <CheckboxEntry name="bowelContinent" label="Resident is Continent" />
                    <CheckboxEntry name="bowelIncontinent" label="Incontinent of Faeces" />
                    <FormField control={form.control} name="bowelReferralRequired" render={({ field }) => (
                      <FormItem><FormLabel>Bowel Referral</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                        <SelectItem value="NONE">None</SelectItem><SelectItem value="GP">GP</SelectItem><SelectItem value="DIETICIAN">Dietician</SelectItem><SelectItem value="OT">OT</SelectItem>
                      </SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
              </div>
            )}

            {step === 13 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="sigantureCompletingAssessment" render={({ field }) => <FormItem><FormLabel>Completing Staff Name</FormLabel><FormControl><Input {...field} readOnly disabled className="bg-muted" /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="sigantureResident" render={({ field }) => <FormItem><FormLabel>Resident/Representative Signature</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                <FormField control={form.control} name="dateNextReview" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Next Review</FormLabel>
                    <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : "Pick a date"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={d => field.onChange(d?.getTime())} initialFocus /></PopoverContent></Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}
          </form>
        </Form>
      </div>

      <DialogFooter className="border-t p-4 mt-auto">
        <Button variant="outline" onClick={() => (step === 1 ? onClose?.() : setStep(step - 1))} disabled={isLoading}>
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        <Button onClick={step === 13 ? form.handleSubmit(onSubmit) : StepAction} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {step === 13 ? (isEditMode ? "Save Changes" : "Save Assessment") : "Next"}
        </Button>
      </DialogFooter>
    </div>
  );
}
