"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogDescription,
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
  isInline?: boolean;
  viewOnly?: boolean;
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
  isEditMode = false,
  isInline = false,
  viewOnly = false,
}: BladderBowelDialogProps) {
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
        constipationHistory: false,
        historyRecurrentUTIs: false,
        caffeineMls24h: 0,
        caffeineFrequency: "",
        caffeineTimeOfDay: "",
        excersiceType: "",
        excersiceFrequency: "",
        excersiceTimeOfDay: "",
        alcoholAmount24h: 0,
        alcoholFrequency: "",
        alcoholTimeOfDay: "",

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
        bladderContinent: false,
        bladderIncontinent: false,
        bladderPlanCommenced: false,
        symptompsLastSix: "STABLE",
        physicianConsulted: false,

        bowelState: "NORMAL",
        bowelReferralRequired: "NONE",
        bowelContinent: false,
        bowelIncontinent: false,
        bowelPlanCommenced: false,
        bowelRecordCommenced: false,
        medicalOfficerConsulted: false,

        bowelFrequency: "",
        usualTimeOfDat: "",
        amountAndStoolType: "",
        liquidFeeds: "",
        otherFactors: "",
        otherRemedies: "",
        typesOfPads: "",

        hepatitisAB: false,
        bloodBorneVirues: false,
        mrsa: false,
        esbl: false,
        other: "",

        ph: false,
        nitrates: false,
        protein: false,
        leucocytes: false,
        glucose: false,
        bloodResult: false,
        mssuDate: 0,

        antiHypertensives: false,
        antiParkinsonDrugs: false,
        ironSupplement: false,
        laxatives: false,
        diuretics: false,
        histamine: false,
        antiDepressants: false,
        cholinergic: false,
        sedativesHypnotic: false,
        antiPsychotic: false,
        antihistamines: false,
        narcoticAnalgesics: false,

        leakCoughLaugh: false,
        leakStandingUp: false,
        leakUpstairsDownhill: false,
        passesUrineFrequently: false,
        desirePassUrine: false,
        leaksBeforeToilet: false,
        moreThanTwiceAtNight: false,
        anxiety: false,
        difficultyStarting: false,
        hesintancy: false,
        dribbles: false,
        feelsFull: false,
        recurrentTractInfections: false,
        pain: false,

        limitedMobility: false,
        unableOnTime: false,
        notHoldUrinalOrSeat: false,
        notuseCallBell: false,
        poorVision: false,
        assistedTransfer: false,

        dateNextReview: new Date().getTime() + (30 * 24 * 60 * 60 * 1000)
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

  const CheckboxEntry = ({ name, label }: { name: string, label: string }) => (
    <FormField control={form.control} name={name as any} render={({ field }) => (
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm hover:bg-muted/30 transition-colors">
        <FormLabel className="m-0 cursor-pointer">{label}</FormLabel>
        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
      </FormItem>
    )} />
  );

  return (
    <div className="flex flex-col space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Bladder & Bowel Assessment</DialogTitle>
          <DialogDescription>
            Comprehensive assessment of continence needs and patterns.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="space-y-12 pb-20">
        <Form {...form}>
          <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              <button
                type="button"
                id="care-file-submit-btn"
                className="hidden"
                onClick={form.handleSubmit(onSubmit, (errors) => {
                  console.error("Continence form errors:", errors);
                  toast.error("Please fill in all required fields correctly.");
                })}
              />
              {/* Section 1: General Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">General Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="residentName" render={({ field }) => <FormItem><FormLabel>Resident Name</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="bedroomNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedroom Number</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="informationObtainedFrom" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel required>Information Obtained From</FormLabel><FormControl><Input placeholder="e.g. Resident, GP Notes, Family" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>Assessment Date</FormLabel>
                      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal>
                        <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDatePopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} /></PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="completedBy" render={({ field }) => (<FormItem><FormLabel>Completed By</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>

              {/* Section 2: Clinical Risks & Urinalysis */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Clinical Risks & Urinalysis</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Infection Risks</h4>
                    <div className="grid gap-3">
                      <CheckboxEntry name="hepatitisAB" label="Hepatitis A/B" />
                      <CheckboxEntry name="bloodBorneVirues" label="Blood Borne Viruses" />
                      <CheckboxEntry name="mrsa" label="MRSA" />
                      <CheckboxEntry name="esbl" label="ESBL" />
                      <FormField control={form.control} name="other" render={({ field }) => <FormItem><FormLabel>Other Infectious Checks</FormLabel><FormControl><Input placeholder="Details..." {...field} /></FormControl><FormMessage /></FormItem>} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Urinalysis Results</h4>
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <CheckboxEntry name="ph" label="pH" />
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
                  </div>
                </div>
              </div>

              {/* Section 3: Medication Check */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Relevant Medications</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { n: "antiHypertensives", l: "Anti-hypertensives" }, { n: "antiParkinsonDrugs", l: "Anti-Parkinson Drugs" },
                    { n: "ironSupplement", l: "Iron Supplement" }, { n: "laxatives", l: "Laxatives" },
                    { n: "diuretics", l: "Diuretics" }, { n: "histamine", l: "Histamine blockers" },
                    { n: "antiDepressants", l: "Anti-depressants" }, { n: "cholinergic", l: "Cholinergic agents" },
                    { n: "sedativesHypnotic", l: "Sedatives/Hypnotics" }, { n: "antiPsychotic", l: "Anti-psychotics" },
                    { n: "antihistamines", l: "Antihistamines" }, { n: "narcoticAnalgesics", l: "Narcotic Analgesics" }
                  ].map(med => <CheckboxEntry key={med.n} name={med.n} label={med.l} />)}
                </div>
              </div>

              {/* Section 4: Lifestyle Factors */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Lifestyle & Physical Factors</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="smoking" render={({ field }) => <FormItem><FormLabel>Smoking Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="SMOKER">Smoker</SelectItem><SelectItem value="NON-SMOKER">Non-Smoker</SelectItem><SelectItem value="EX-SMOKER">Ex-Smoker</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="weight" render={({ field }) => <FormItem><FormLabel>Weight Check</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="OBESE">Obese</SelectItem><SelectItem value="UNDERWEIGHT">Underweight</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="skinCondition" render={({ field }) => <FormItem><FormLabel>Skin Condition</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="HEALTHY">Healthy</SelectItem><SelectItem value="RED">Red/Inflamed</SelectItem><SelectItem value="EXCORIATED">Excoriated</SelectItem><SelectItem value="BROKEN">Broken</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CheckboxEntry name="constipationHistory" label="History of Constipation?" />
                  <CheckboxEntry name="historyRecurrentUTIs" label="History of Recurrent UTIs?" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-xl bg-muted/20">
                  <h4 className="md:col-span-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">Hydration & Habits</h4>
                  <FormField control={form.control} name="caffeineMls24h" render={({ field }) => <FormItem><FormLabel>Caffeine Intake (24hr ml)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="alcoholAmount24h" render={({ field }) => <FormItem><FormLabel>Alcohol Intake (Units/day)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </div>

              {/* Section 5: Bladder Pattern */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Bladder Pattern & Symptoms</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <FormField control={form.control} name="incontinence" render={({ field }) => (
                    <FormItem><FormLabel required>Frequency of Urinary Incontinence</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                      <SelectItem value="NONE">None</SelectItem><SelectItem value="ONE">Less than 1 episode/week</SelectItem>
                      <SelectItem value="1-2DAY">1 or 2 episodes every day/night</SelectItem><SelectItem value="3DAY">3 or more episodes during day/night</SelectItem>
                      <SelectItem value="NIGHT">Night incidents only</SelectItem><SelectItem value="DAYANDNIGHT">Both Day and Night</SelectItem>
                    </SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="volume" render={({ field }) => <FormItem><FormLabel required>Typical Volume</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="ENTIRE-BLADDER">Entire Bladder</SelectItem><SelectItem value="SMALL-VOL">Small Volume</SelectItem><SelectItem value="UNABLE-DETERMINE">Unable to determine</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="onset" render={({ field }) => <FormItem><FormLabel required>Onset of Symptoms</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="SUDDEN">Sudden</SelectItem><SelectItem value="GRADUAL">Gradual</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                  </div>
                  <div className="p-6 border rounded-xl bg-card/10 space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Leakage Triggers</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <CheckboxEntry name="leakCoughLaugh" label="Coughing/Laughing" />
                      <CheckboxEntry name="leakStandingUp" label="Standing up" />
                      <CheckboxEntry name="leakUpstairsDownhill" label="Moving upstairs/downhill" />
                      <CheckboxEntry name="passesUrineFrequently" label="Frequent voiding (>7x)" />
                      <CheckboxEntry name="desirePassUrine" label="Powerful urge" />
                      <CheckboxEntry name="leaksBeforeToilet" label="Urge Incontinence" />
                      <CheckboxEntry name="moreThanTwiceAtNight" label="Nocturia (>2x)" />
                      <CheckboxEntry name="anxiety" label="Constant anxiety" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 6: Bowel Pattern */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Bowel Pattern</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <FormField control={form.control} name="bowelState" render={({ field }) => (
                    <FormItem><FormLabel required>Bowel Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                      <SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="CONSTIPATION">Constipation</SelectItem>
                      <SelectItem value="DIARRHOEA">Diarrhoea</SelectItem><SelectItem value="STOMA">Stoma in situ</SelectItem>
                      <SelectItem value="FAECAL-INCONTINENCE">Faecal Incontinence</SelectItem><SelectItem value="IRRITABLE-BOWEL">IBS History</SelectItem>
                    </SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="bowelFrequency" render={({ field }) => <FormItem><FormLabel>Frequency</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="usualTimeOfDat" render={({ field }) => <FormItem><FormLabel>Usual Time of Day</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  </div>
                  <FormField control={form.control} name="amountAndStoolType" render={({ field }) => <FormItem><FormLabel>Bristol Stool Type & Amount</FormLabel><FormControl><Input placeholder="e.g. Type 4, Moderate amount" {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </div>

              {/* Section 7: Toileting Habits & Aids */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Toileting Habits & Aids</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {["day", "evening", "night"].map(p => (
                    <FormField key={p} control={form.control} name={`${p}Pattern` as any} render={({ field }) => (
                      <FormItem><FormLabel className="capitalize">{p} Pattern</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="TOILET">Toilet</SelectItem><SelectItem value="COMMODE">Commode</SelectItem><SelectItem value="BED-PAN">Bed-pan</SelectItem><SelectItem value="URINAL">Urinal</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  ))}
                </div>
                <FormField control={form.control} name="typesOfPads" render={({ field }) => <FormItem><FormLabel>Continence Pads/Aids In Use</FormLabel><FormControl><Textarea className="min-h-[80px]" placeholder="List products and sizes..." {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>

              {/* Section 8: Referral & Plan decisions */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Referral & Planning</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Bladder Decisions</h4>
                    <div className="grid gap-3">
                      <CheckboxEntry name="bladderContinent" label="Continent" />
                      <CheckboxEntry name="bladderIncontinent" label="Incontinent" />
                      <FormField control={form.control} name="bladderIncontinentType" render={({ field }) => (
                        <FormItem><FormLabel>If Incontinent, Type:</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="STRESS">Stress</SelectItem><SelectItem value="URGE">Urge</SelectItem><SelectItem value="MIXED">Mixed</SelectItem><SelectItem value="FUNCTIONAL">Functional</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="bladderReferralRequired" render={({ field }) => (
                        <FormItem><FormLabel>Referral Required?</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                          <SelectItem value="NONE">None</SelectItem><SelectItem value="GP">General Practitioner</SelectItem><SelectItem value="OT">Occupational Therapist</SelectItem>
                          <SelectItem value="CONTINENCE-NURSE">Continence Nurse</SelectItem><SelectItem value="PHYSIOTHERAPIST">Physiotherapist</SelectItem>
                        </SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Bowel Decisions</h4>
                    <div className="grid gap-3">
                      <CheckboxEntry name="bowelContinent" label="Continent" />
                      <CheckboxEntry name="bowelIncontinent" label="Incontinent" />
                      <FormField control={form.control} name="bowelReferralRequired" render={({ field }) => (
                        <FormItem><FormLabel>Referral Required?</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                          <SelectItem value="NONE">None</SelectItem><SelectItem value="GP">GP</SelectItem><SelectItem value="DIETICIAN">Dietician</SelectItem><SelectItem value="OT">OT</SelectItem>
                        </SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 9: Signatures & Review */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Sign-off & Review</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="sigantureCompletingAssessment" render={({ field }) => <FormItem><FormLabel>Staff Name</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="sigantureResident" render={({ field }) => <FormItem><FormLabel>Resident/Representative Signature</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="dateNextReview" render={({ field }) => (
                    <FormItem className="flex flex-col sm:col-span-2">
                      <FormLabel required>Date of Next Review</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={d => field.onChange(d?.getTime())} initialFocus /></PopoverContent></Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
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
              isEditMode ? "Save Changes" : "Save Assessment"
            )}
          </Button>
        </div>
      )}
    </div >
  );
}
