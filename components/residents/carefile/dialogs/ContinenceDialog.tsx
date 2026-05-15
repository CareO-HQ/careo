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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import NextReviewDateField from "./NextReviewDateField";

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

  const isMissingNextReviewDateColumn = (error: any) => {
    return (error?.code === "PGRST204" || error?.code === "42703") &&
      error?.message?.toLowerCase().includes("next_review_date");
  };

  // Helper to map old YES/NO values to new Yes/No
  const mapYesNo = (val: any) => {
    if (val === "YES") return "Yes";
    if (val === "NO") return "No";
    if (val === "NOT-KNOWN") return "No"; // Default to NO if Not Known was previously selected but now removed
    return val;
  };

  const form = useForm<z.infer<typeof bladderBowelAssessmentSchema>>({
    resolver: zodResolver(bladderBowelAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId,
        teamId,
        organizationId,
        userId,
        residentName: initialData.residentName || initialData.resident_name || initialData.lifestyle_factors?.resident_name || (resident ? `${resident.first_name} ${resident.last_name}` : ""),
        dateOfBirth: initialData.dateOfBirth || initialData.date_of_birth || initialData.lifestyle_factors?.date_of_birth ? new Date(initialData.dateOfBirth || initialData.date_of_birth || initialData.lifestyle_factors?.date_of_birth).getTime() : (resident && resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : 0),
        bedroomNumber: initialData.bedroomNumber || initialData.bedroom_number || initialData.lifestyle_factors?.bedroom_number || resident?.room_number || "",
        informationObtainedFrom: initialData.informationObtainedFrom || initialData.information_obtained_from || initialData.lifestyle_factors?.information_obtained_from || "",
        completedBy: initialData.completed_by || initialData.lifestyle_factors?.completed_by || userName,
        assessmentDate: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : Date.now(),
        sigantureCompletingAssessment: initialData.sigantureCompletingAssessment || initialData.signature_completing_assessment || initialData.lifestyle_factors?.signature_completing_assessment || userName,
        sigantureResident: initialData.sigantureResident || initialData.signature_resident || initialData.lifestyle_factors?.signature_resident || "",

        // Section 2 - Infections
        hepatitisAB: mapYesNo(initialData.symptoms?.infections?.hepatitisAB || initialData.hepatitisAB || "No"),
        bloodBorneVirus: mapYesNo(initialData.symptoms?.infections?.bloodBorneVirus || initialData.bloodBorneVirus || "No"),
        mrsa: mapYesNo(initialData.symptoms?.infections?.mrsa || initialData.mrsa || "No"),
        esbl: mapYesNo(initialData.symptoms?.infections?.esbl || initialData.esbl || "No"),
        otherInfection: initialData.symptoms?.infections?.other || initialData.other || "",

        // Section 3 - Urinalysis
        ph: initialData.symptoms?.urinalysis?.ph || initialData.ph || "NORMAL",
        nitrates: initialData.symptoms?.urinalysis?.nitrates || initialData.nitrates || "NEGATIVE",
        protein: initialData.symptoms?.urinalysis?.protein || initialData.protein || "NEGATIVE",
        leucocytes: initialData.symptoms?.urinalysis?.leucocytes || initialData.leucocytes || "NEGATIVE",
        glucose: initialData.symptoms?.urinalysis?.glucose || initialData.glucose || "NEGATIVE",
        bloodResult: initialData.symptoms?.urinalysis?.bloodResult || initialData.bloodResult || "NEGATIVE",
        urinalysisResult: initialData.symptoms?.urinalysis?.result || initialData.urinalysisResult || "",
        mssuDate: initialData.symptoms?.urinalysis?.mssuDate || initialData.mssuDate || 0,

        // Section 4 - Medication
        antiHypertensives: mapYesNo(initialData.symptoms?.medications?.antiHypertensives || initialData.antiHypertensives || "No"),
        antiParkinsonDrugs: mapYesNo(initialData.symptoms?.medications?.antiParkinsonDrugs || initialData.antiParkinsonDrugs || "No"),
        ironSupplement: mapYesNo(initialData.symptoms?.medications?.ironSupplement || initialData.ironSupplement || "No"),
        laxatives: mapYesNo(initialData.symptoms?.medications?.laxatives || initialData.laxatives || "No"),
        diuretics: mapYesNo(initialData.symptoms?.medications?.diuretics || initialData.diuretics || "No"),
        histamine: mapYesNo(initialData.symptoms?.medications?.histamine || initialData.histamine || "No"),
        antiDepressants: mapYesNo(initialData.symptoms?.medications?.antiDepressants || initialData.antiDepressants || "No"),
        cholinergic: mapYesNo(initialData.symptoms?.medications?.cholinergic || initialData.cholinergic || "No"),
        sedativesHypnotic: mapYesNo(initialData.symptoms?.medications?.sedativesHypnotic || initialData.sedativesHypnotic || "No"),
        antiPsychotic: mapYesNo(initialData.symptoms?.medications?.antiPsychotic || initialData.antiPsychotic || "No"),
        antihistamines: mapYesNo(initialData.symptoms?.medications?.antihistamines || initialData.antihistamines || "No"),
        narcoticAnalgesics: mapYesNo(initialData.symptoms?.medications?.narcoticAnalgesics || initialData.narcoticAnalgesics || "No"),

        // Section 5 - Risk Factors
        caffeineMls24h: initialData.lifestyle_factors?.caffeine?.mls24h || initialData.lifestyle_factors?.caffeineMls24h || initialData.caffeineMls24h || 0,
        caffeineFrequency: initialData.lifestyle_factors?.caffeine?.frequency || initialData.lifestyle_factors?.caffeineFrequency || initialData.caffeineFrequency || "",
        caffeineTimeOfDay: initialData.lifestyle_factors?.caffeine?.timeOfDay || initialData.lifestyle_factors?.caffeineTimeOfDay || initialData.caffeineTimeOfDay || "",
        exerciseType: initialData.lifestyle_factors?.exercise?.type || initialData.lifestyle_factors?.exerciseType || initialData.lifestyle_factors?.excersiceType || initialData.exerciseType || "",
        exerciseFrequency: initialData.lifestyle_factors?.exercise?.frequency || initialData.lifestyle_factors?.exerciseFrequency || initialData.lifestyle_factors?.excersiceFrequency || initialData.exerciseFrequency || "",
        exerciseTimeOfDay: initialData.lifestyle_factors?.exercise?.timeOfDay || initialData.lifestyle_factors?.exerciseTimeOfDay || initialData.lifestyle_factors?.excersiceTimeOfDay || initialData.exerciseTimeOfDay || "",
        skinCondition: initialData.lifestyle_factors?.skinCondition || initialData.skinCondition || "HEALTHY",
        alcoholAmount24h: initialData.lifestyle_factors?.alcohol?.amount24h || initialData.lifestyle_factors?.alcoholAmount24h || initialData.alcoholAmount24h || 0,
        alcoholFrequency: initialData.lifestyle_factors?.alcohol?.frequency || initialData.lifestyle_factors?.alcoholFrequency || initialData.alcoholFrequency || "",
        alcoholTimeOfDay: initialData.lifestyle_factors?.alcohol?.timeOfDay || initialData.lifestyle_factors?.alcoholTimeOfDay || initialData.alcoholTimeOfDay || "",
        weight: initialData.lifestyle_factors?.weight || initialData.weight || "NORMAL",
        smoking: initialData.lifestyle_factors?.smoking || initialData.smoking || "NON-SMOKER",
        constipationHistory: mapYesNo(initialData.lifestyle_factors?.constipationHistory || initialData.constipationHistory || "No"),
        mentalState: initialData.lifestyle_factors?.mentalState || initialData.mentalState || "ALERT",
        mobilityIssues: initialData.lifestyle_factors?.mobilityIssues || initialData.mobilityIssues || "INDEPENDENT",
        historyRecurrentUTIs: mapYesNo(initialData.lifestyle_factors?.historyRecurrentUTIs || initialData.historyRecurrentUTIs || "No"),

        // Section 6 - Urinary Continence History
        incontinenceFrequency: initialData.bladder_pattern?.frequency || initialData.bladder_pattern?.incontinence || initialData.incontinenceFrequency || "NONE",
        incontinenceVolume: initialData.bladder_pattern?.volume || initialData.incontinenceVolume || "UNABLE-DETERMINE",
        onset: initialData.bladder_pattern?.onset || initialData.onset || "GRADUAL",
        duration: initialData.bladder_pattern?.duration || initialData.duration || "LESS-6M",
        symptomsPast6Months: initialData.bladder_pattern?.symptomsPast6Months || initialData.bladder_pattern?.symptompsLastSix || initialData.symptomsPast6Months || "STABLE",
        physicianConsulted: mapYesNo(initialData.bladder_pattern?.physicianConsulted || initialData.physicianConsulted || "No"),

        // Section 7 - Bowel Pattern
        bowelPattern: initialData.bowel_pattern?.pattern || initialData.bowel_pattern?.bowelState || initialData.bowelPattern || "NORMAL",
        bowelFrequency: initialData.bowel_pattern?.frequency || initialData.bowelFrequency || "",
        bowelUsualTimeOfDay: initialData.bowel_pattern?.timeOfDay || initialData.bowel_pattern?.usualTimeOfDat || initialData.bowelUsualTimeOfDay || "",
        bowelAmountStoolType: initialData.bowel_pattern?.stoolTypeAmount || initialData.bowel_pattern?.amountAndStoolType || initialData.bowelAmountStoolType || "",
        bowelLiquidFeeds: initialData.bowel_pattern?.liquidFeeds || initialData.bowelLiquidFeeds || "",
        bowelOtherFactors: initialData.bowel_pattern?.otherFactors || initialData.bowelOtherFactors || "",
        bowelOtherRemedies: initialData.bowel_pattern?.otherRemedies || initialData.bowelOtherRemedies || "",
        medicalOfficerConsulted: (initialData.bowel_pattern?.medicalOfficerConsulted || initialData.medicalOfficerConsulted) ? "Yes" : "No",
        medicalOfficerName: initialData.medicalOfficerName || initialData.bowel_pattern?.medicalOfficerName || (initialData.bowel_pattern?.medicalOfficerConsulted !== "No" ? initialData.bowel_pattern?.medicalOfficerName : ""),

        // Section 8 - Toileting
        dayPattern: initialData.bladder_pattern?.toiletingHabits?.day || initialData.bladder_pattern?.dayPattern || initialData.dayPattern || "TOILET",
        eveningPattern: initialData.bladder_pattern?.toiletingHabits?.evening || initialData.bladder_pattern?.eveningPattern || initialData.eveningPattern || "TOILET",
        nightPattern: initialData.bladder_pattern?.toiletingHabits?.night || initialData.bladder_pattern?.nightPattern || initialData.nightPattern || "TOILET",
        typesOfPads: initialData.bladder_pattern?.padsAids || initialData.bladder_pattern?.typesOfPads || initialData.typesOfPads || "",

        // Section 9 - Symptoms
        leakCoughLaugh: mapYesNo(initialData.symptoms?.specific?.leakCoughLaugh || "No"),
        leakStandingUp: mapYesNo(initialData.symptoms?.specific?.leakStandingUp || "No"),
        leakUpstairsDownhill: mapYesNo(initialData.symptoms?.specific?.leakUpstairsDownhill || "No"),
        passesUrineFrequently: mapYesNo(initialData.symptoms?.specific?.passesUrineFrequently || "No"),
        desirePassUrineStrong: mapYesNo(initialData.symptoms?.specific?.desirePassUrine || "No"),
        leaksBeforeToilet: mapYesNo(initialData.symptoms?.specific?.leaksBeforeToilet || "No"),
        getsUpMoreThanTwiceNight: mapYesNo(initialData.symptoms?.specific?.moreThanTwiceAtNight || "No"),
        anxietyContributesFrequency: mapYesNo(initialData.symptoms?.specific?.anxiety || "No"),
        difficultyBeginningUrine: mapYesNo(initialData.symptoms?.specific?.difficultyStarting || "No"),
        hesitancyStraining: mapYesNo(initialData.symptoms?.specific?.hesitancy || initialData.symptoms?.specific?.hesintancy || "No"),
        dribblesAfterUrine: mapYesNo(initialData.symptoms?.specific?.dribbles || "No"),
        feelsBladderFullAfterUrine: mapYesNo(initialData.symptoms?.specific?.feelsFull || "No"),
        recurrentUTIs: mapYesNo(initialData.symptoms?.specific?.recurrentTractInfections || "No"),
        limitedMobility: mapYesNo(initialData.symptoms?.functional?.limitedMobility || "No"),
        unableToiletOnTime: mapYesNo(initialData.symptoms?.functional?.unableOnTime || "No"),
        cannotHoldUrinalOrSit: mapYesNo(initialData.symptoms?.functional?.notHoldUrinalOrSeat || "No"),
        cannotReachCallBell: mapYesNo(initialData.symptoms?.functional?.notuseCallBell || "No"),
        poorVision: mapYesNo(initialData.symptoms?.functional?.poorVision || "No"),
        needsAssistedTransfer: mapYesNo(initialData.symptoms?.functional?.assistedTransfer || "No"),
        pain: mapYesNo(initialData.symptoms?.specific?.pain || "No"),

        // Section 10 - Quality of Life
        qualityOfLife: initialData.bladder_pattern?.qualityOfLife || initialData.quality_of_life || "",

        // Section 11 - Summary
        bladderContinent: mapYesNo(initialData.bladder_pattern?.bladderContinent ? "Yes" : "No"),
        bladderIncontinent: mapYesNo(initialData.bladder_pattern?.bladderIncontinent ? "Yes" : "No"),
        bladderIncontinentType: initialData.bladder_pattern?.bladderIncontinentType || "FUNCTIONAL",
        bladderCarePlanCommenced: mapYesNo(initialData.bladder_pattern?.bladderPlanCommenced ? "Yes" : "No"),
        bladderReferralRequired: initialData.bladder_pattern?.bladderReferralRequired || "NONE",
        bladderTreatmentPlanFollowed: initialData.bladder_pattern?.bladderPlanFollowed || "URGE",
        bowelContinent: mapYesNo(initialData.bowel_pattern?.bowelContinent ? "Yes" : "No"),
        bowelIncontinent: mapYesNo(initialData.bowel_pattern?.bowelIncontinent ? "Yes" : "No"),
        bowelCarePlanCommenced: mapYesNo(initialData.bowel_pattern?.bowelPlanCommenced ? "Yes" : "No"),
        bowelRecordCommenced: mapYesNo(initialData.bowel_pattern?.bowelRecordCommenced ? "Yes" : "No"),
        bowelReferralRequired: initialData.bowel_pattern?.bowelReferralRequired || "NONE",

        dateNextReview: initialData.next_review_date ? new Date(initialData.next_review_date).getTime() : new Date().getTime(),
        nextReviewDate: initialData.next_review_date || ""
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

        hepatitisAB: "No", bloodBorneVirus: "No", mrsa: "No", esbl: "No", otherInfection: "",
        ph: "NORMAL", nitrates: "NEGATIVE", protein: "NEGATIVE", leucocytes: "NEGATIVE", glucose: "NEGATIVE", bloodResult: "NEGATIVE", urinalysisResult: "", mssuDate: 0,
        antiHypertensives: "No", antiParkinsonDrugs: "No", ironSupplement: "No", laxatives: "No", diuretics: "No", histamine: "No", antiDepressants: "No",
        cholinergic: "No", sedativesHypnotic: "No", antiPsychotic: "No", antihistamines: "No", narcoticAnalgesics: "No",

        smoking: "NON-SMOKER", weight: "NORMAL", skinCondition: "HEALTHY", mentalState: "ALERT", mobilityIssues: "INDEPENDENT", constipationHistory: "No", historyRecurrentUTIs: "No",
        caffeineMls24h: 0, caffeineFrequency: "", caffeineTimeOfDay: "", exerciseType: "", exerciseFrequency: "", exerciseTimeOfDay: "", alcoholAmount24h: 0, alcoholFrequency: "", alcoholTimeOfDay: "",

        incontinenceFrequency: "NONE", incontinenceVolume: "UNABLE-DETERMINE", onset: "GRADUAL", duration: "LESS-6M", symptomsPast6Months: "STABLE", physicianConsulted: "No",
        bowelPattern: "NORMAL",
        bowelFrequency: "",
        bowelUsualTimeOfDay: "",
        bowelAmountStoolType: "",
        bowelLiquidFeeds: "",
        bowelOtherFactors: "",
        bowelOtherRemedies: "",
        medicalOfficerConsulted: "No",
        medicalOfficerName: "",

        dayPattern: "TOILET", eveningPattern: "TOILET", nightPattern: "TOILET", typesOfPads: "",
        qualityOfLife: "",

        leakCoughLaugh: "No", leakStandingUp: "No", leakUpstairsDownhill: "No", passesUrineFrequently: "No", desirePassUrineStrong: "No", leaksBeforeToilet: "No",
        getsUpMoreThanTwiceNight: "No", anxietyContributesFrequency: "No", difficultyBeginningUrine: "No", hesitancyStraining: "No", dribblesAfterUrine: "No",
        feelsBladderFullAfterUrine: "No", recurrentUTIs: "No", limitedMobility: "No", unableToiletOnTime: "No", cannotHoldUrinalOrSit: "No", cannotReachCallBell: "No",
        poorVision: "No", needsAssistedTransfer: "No", pain: "No",

        bladderContinent: "No", bladderIncontinent: "No", bladderIncontinentType: "FUNCTIONAL", bladderCarePlanCommenced: "No", bladderReferralRequired: "NONE", bladderTreatmentPlanFollowed: "URGE",
        bowelContinent: "No", bowelIncontinent: "No", bowelCarePlanCommenced: "No", bowelRecordCommenced: "No", bowelReferralRequired: "NONE",

        dateNextReview: new Date().getTime() + (30 * 24 * 60 * 60 * 1000),
        nextReviewDate: ""
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
          exerciseType: values.exerciseType, exerciseFrequency: values.exerciseFrequency, exerciseTimeOfDay: values.exerciseTimeOfDay,
          alcoholAmount24h: values.alcoholAmount24h, alcoholFrequency: values.alcoholFrequency, alcoholTimeOfDay: values.alcoholTimeOfDay,
          // Nesting meta fields here to avoid schema mismatch
          resident_name: values.residentName,
          date_of_birth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : null,
          bedroom_number: values.bedroomNumber,
          information_obtained_from: values.informationObtainedFrom,
          signature_completing_assessment: values.sigantureCompletingAssessment,
          signature_resident: values.sigantureResident,
          completed_by: values.completedBy,
          assessment_date: new Date(values.assessmentDate || Date.now()).toISOString()
        };
 
         const bladderPattern = {
          frequency: values.incontinenceFrequency,
          volume: values.incontinenceVolume,
          onset: values.onset,
          duration: values.duration,
          symptomsPast6Months: values.symptomsPast6Months,
          physicianConsulted: values.physicianConsulted === "Yes",
          toiletingHabits: { day: values.dayPattern, evening: values.eveningPattern, night: values.nightPattern },
          padsAids: values.typesOfPads,
          qualityOfLife: values.qualityOfLife,
          // Summary fields
          bladderContinent: values.bladderContinent === "Yes",
          bladderIncontinent: values.bladderIncontinent === "Yes",
          bladderIncontinentType: values.bladderIncontinentType,
          bladderPlanCommenced: values.bladderCarePlanCommenced === "Yes",
          bladderReferralRequired: values.bladderReferralRequired,
          bladderPlanFollowed: values.bladderTreatmentPlanFollowed,
          // Legacy keys for safety
          incontinenceFrequency: values.incontinenceFrequency,
          symptompsLastSix: values.symptomsPast6Months,
          dayPattern: values.dayPattern, eveningPattern: values.eveningPattern, nightPattern: values.nightPattern,
          typesOfPads: values.typesOfPads
        };
 
        const bowelPattern = {
          pattern: values.bowelPattern,
          frequency: values.bowelFrequency,
          timeOfDay: values.bowelUsualTimeOfDay,
          stoolTypeAmount: values.bowelAmountStoolType,
          liquidFeeds: values.bowelLiquidFeeds,
          otherFactors: values.bowelOtherFactors,
          otherRemedies: values.bowelOtherRemedies,
          medicalOfficerConsulted: values.medicalOfficerConsulted === "Yes" ? "Yes" : "No",
          medicalOfficerName: values.medicalOfficerName,
          // Summary fields
          bowelContinent: values.bowelContinent === "Yes",
          bowelIncontinent: values.bowelIncontinent === "Yes",
          bowelPlanCommenced: values.bowelCarePlanCommenced === "Yes",
          bowelRecordCommenced: values.bowelRecordCommenced === "Yes",
          bowelReferralRequired: values.bowelReferralRequired,
          // Legacy keys
          bowelState: values.bowelPattern,
          usualTimeOfDat: values.bowelUsualTimeOfDay,
          amountAndStoolType: values.bowelAmountStoolType
        };
 
        const symptoms = {
          infections: {
            hepatitisAB: values.hepatitisAB, bloodBorneVirus: values.bloodBorneVirus, mrsa: values.mrsa, esbl: values.esbl, other: values.otherInfection
          },
          urinalysis: {
            ph: values.ph, nitrates: values.nitrates, protein: values.protein, leucocytes: values.leucocytes,
            glucose: values.glucose, bloodResult: values.bloodResult, mssuDate: values.mssuDate, result: values.urinalysisResult
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
            passesUrineFrequently: values.passesUrineFrequently, desirePassUrine: values.desirePassUrineStrong, leaksBeforeToilet: values.leaksBeforeToilet,
            moreThanTwiceAtNight: values.getsUpMoreThanTwiceNight, anxiety: values.anxietyContributesFrequency, difficultyStarting: values.difficultyBeginningUrine,
            hesitancy: values.hesitancyStraining, dribbles: values.dribblesAfterUrine, feelsFull: values.feelsBladderFullAfterUrine,
            recurrentTractInfections: values.recurrentUTIs, pain: values.pain
          },
          functional: {
            limitedMobility: values.limitedMobility, unableOnTime: values.unableToiletOnTime, notHoldUrinalOrSeat: values.cannotHoldUrinalOrSit,
            notuseCallBell: values.cannotReachCallBell, poorVision: values.poorVision, assistedTransfer: values.needsAssistedTransfer
          }
        };
 
        const payload = {
          resident_id: resident.id,
          organization_id: organizationId,
          lifestyle_factors: lifestyleFactors,
          bladder_pattern: bladderPattern,
          bowel_pattern: bowelPattern,
          symptoms: symptoms,
          plan_commenced: values.bladderCarePlanCommenced === "Yes" || values.bowelCarePlanCommenced === "Yes",
          next_review_date: values.nextReviewDate || null,
          created_by: userId,
        };

        try {
          await submitAssessmentWithVersioning(
            'bladder_bowel_assessments',
            payload,
            initialData,
            isEditMode
          );
        } catch (error: any) {
          if (isMissingNextReviewDateColumn(error)) {
            const { next_review_date: _, ...fallbackPayload } = payload;
            await submitAssessmentWithVersioning(
              'bladder_bowel_assessments',
              fallbackPayload,
              initialData,
              isEditMode
            );
          } else {
            throw error;
          }
        }

        toast.success(isEditMode ? "Assessment updated" : "Assessment submitted");
        onClose?.();
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment.");
      }
    });
  };


  const RadioEntry = ({ name, label, options, required = false }: { name: string, label: string, options: { label: string, value: string }[], required?: boolean }) => (
    <FormField control={form.control} name={name as any} render={({ field }) => (
      <FormItem className="space-y-3 border rounded-lg p-4 bg-background shadow-sm hover:bg-muted/5 transition-colors">
        <FormLabel className="text-base font-semibold">{label}{required && <span className="text-destructive ml-1">*</span>}</FormLabel>
        <FormControl>
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className="flex flex-wrap gap-4"
          >
            {options.map((option) => (
              <FormItem key={option.value} className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <RadioGroupItem value={option.value} />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">
                  {option.label}
                </FormLabel>
              </FormItem>
            ))}
          </RadioGroup>
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  const YesNoRadio = ({ name, label, required = false }: { name: string, label: string, required?: boolean }) => (
    <RadioEntry
      name={name}
      label={label}
      required={required}
      options={[
        { label: "Yes", value: "Yes" },
        { label: "No", value: "No" }
      ]}
    />
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
              <div className="mb-6 p-4 border rounded-lg bg-muted/40">
                <FormField
                  control={form.control}
                  name="nextReviewDate"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormControl>
                        <NextReviewDateField
                          value={field.value || ""}
                          onChange={field.onChange}
                          disabled={viewOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                  <FormField control={form.control} name="residentName" render={({ field }) => <FormItem><FormLabel>Resident Name</FormLabel><FormControl><div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="bedroomNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedroom Number</FormLabel>
                      <FormControl>
                        <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={form.control} name="informationObtainedFrom" render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel required>Information obtained from</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[60px] text-sm">{field.value}</div>
                        ) : (
                          <Textarea className="min-h-[60px]" placeholder="e.g. Resident, GP Notes, Family" {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>Assessment Date</FormLabel>
                      {viewOnly ? (
                        <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value ? format(new Date(field.value), "PPP") : ""}</div>
                      ) : (
                        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal>
                          <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDatePopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} /></PopoverContent>
                        </Popover>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Section 2: Infections */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Infections</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <YesNoRadio name="hepatitisAB" label="Hepatitis A/B" />
                  <YesNoRadio name="bloodBorneVirus" label="Blood Borne Virus" />
                  <YesNoRadio name="mrsa" label="MRSA" />
                  <YesNoRadio name="esbl" label="ESBL" />
                   <FormField
                    control={form.control}
                    name="otherInfection"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Other Infections</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[60px] text-sm">{field.value}</div>
                          ) : (
                            <Textarea className="min-h-[60px]" placeholder="Provide details if applicable..." {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2 p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-blue-800">
                    <strong>Note:</strong> If Resident has an infection, treat the infection, and reassess in two weeks&apos; time.
                  </div>
                  <div className="md:col-span-2 p-4 bg-orange-50/50 border border-orange-100 rounded-lg text-sm text-orange-800">
                    <strong>Note:</strong> If the Resident has diarrhoea, treat and reassess in two weeks&apos; time.
                  </div>
                </div>
              </div>
              {/* Section 3: Urinalysis */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Urinalysis Result on Admission</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <RadioEntry
                    name="ph"
                    label="pH"
                    options={[
                      { label: "Normal", value: "NORMAL" },
                      { label: "Abnormal", value: "ABNORMAL" }
                    ]}
                  />
                  <RadioEntry
                    name="nitrates"
                    label="Nitrates"
                    options={[
                      { label: "Negative", value: "NEGATIVE" },
                      { label: "Positive", value: "POSITIVE" }
                    ]}
                  />
                  <RadioEntry
                    name="protein"
                    label="Protein"
                    options={[
                      { label: "Negative", value: "NEGATIVE" },
                      { label: "Positive", value: "POSITIVE" }
                    ]}
                  />
                  <RadioEntry
                    name="leucocytes"
                    label="Leucocytes"
                    options={[
                      { label: "Negative", value: "NEGATIVE" },
                      { label: "Positive", value: "POSITIVE" }
                    ]}
                  />
                  <RadioEntry
                    name="glucose"
                    label="Glucose"
                    options={[
                      { label: "Negative", value: "NEGATIVE" },
                      { label: "Positive", value: "POSITIVE" }
                    ]}
                  />
                  <RadioEntry
                    name="bloodResult"
                    label="Blood"
                    options={[
                      { label: "Negative", value: "NEGATIVE" },
                      { label: "Positive", value: "POSITIVE" }
                    ]}
                  />
                   <FormField
                    control={form.control}
                    name="urinalysisResult"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 lg:col-span-3">
                        <FormLabel>Result Details</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[60px] text-sm">{field.value}</div>
                          ) : (
                            <Textarea className="min-h-[60px]" placeholder="Provide details..." {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField control={form.control} name="mssuDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>MSSU (if indicated) Date</FormLabel>
                      {viewOnly ? (
                        <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value ? format(new Date(field.value), "PPP") : ""}</div>
                      ) : (
                        <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : "Pick a date"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={d => field.onChange(d?.getTime())} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Section 4: Prescribed Medication */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Prescribed Medication</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  <YesNoRadio name="antiHypertensives" label="Anti-hypertensives" />
                  <YesNoRadio name="antiParkinsonDrugs" label="Anti-Parkinson drugs" />
                  <YesNoRadio name="ironSupplement" label="Iron supplements" />
                  <YesNoRadio name="laxatives" label="Laxatives" />
                  <YesNoRadio name="diuretics" label="Diuretic" />
                  <YesNoRadio name="histamine" label="Histamine" />
                  <YesNoRadio name="antiDepressants" label="Antidepressants" />
                  <YesNoRadio name="cholinergic" label="Cholinergic" />
                  <YesNoRadio name="sedativesHypnotic" label="Sedative/Hypnotic" />
                  <YesNoRadio name="antiPsychotic" label="Anti-psychotic" />
                  <YesNoRadio name="antihistamines" label="Antihistamines" />
                  <YesNoRadio name="narcoticAnalgesics" label="Narcotic analgesic" />
                </div>
              </div>

              {/* Section 5: Contributing Risk Factors */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Contributing Risk Factors</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 border rounded-lg">
                    <h4 className="md:col-span-3 font-semibold text-sm">Caffeine use (Coffee, tea, fizzy drinks)</h4>
                    <FormField control={form.control} name="caffeineMls24h" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount in 24 hours (mls)</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                          ) : (
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="caffeineFrequency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="caffeineTimeOfDay" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time of Day</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 border rounded-lg">
                    <h4 className="md:col-span-3 font-semibold text-sm">Exercise</h4>
                    <FormField control={form.control} name="exerciseType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="exerciseFrequency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="exerciseTimeOfDay" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time of Day</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <RadioEntry
                    name="smoking"
                    label="Smoking"
                    options={[
                      { label: "Smoker", value: "SMOKER" },
                      { label: "Non-Smoker", value: "NON-SMOKER" },
                      { label: "Ex-Smoker", value: "EX-SMOKER" }
                    ]}
                  />
                  <RadioEntry
                    name="skinCondition"
                    label="Skin Condition"
                    options={[
                      { label: "Healthy", value: "HEALTHY" },
                      { label: "Red/Inflamed", value: "RED" },
                      { label: "Excoriated", value: "EXCORIATED" },
                      { label: "Broken", value: "BROKEN" }
                    ]}
                  />
                  <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 border rounded-lg">
                    <h4 className="md:col-span-3 font-semibold text-sm">Alcohol</h4>
                    <FormField control={form.control} name="alcoholAmount24h" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount in 24 hours</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                          ) : (
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="alcoholFrequency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="alcoholTimeOfDay" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time of Day</FormLabel>
                        <FormControl>
                          {viewOnly ? (
                            <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <RadioEntry
                    name="weight"
                    label="Weight"
                    options={[
                      { label: "Normal", value: "NORMAL" },
                      { label: "Obese", value: "OBESE" },
                      { label: "Underweight", value: "UNDERWEIGHT" }
                    ]}
                  />
                  <RadioEntry
                    name="mentalState"
                    label="Mental State"
                    options={[
                      { label: "Alert", value: "ALERT" },
                      { label: "Confused", value: "CONFUSED" },
                      { label: "Learning Disability", value: "LEARNING-DISABLED" },
                      { label: "Cognitively Impaired", value: "COGNITIVELY-IMPAIRED" }
                    ]}
                  />
                  <RadioEntry
                    name="mobilityIssues"
                    label="Mobility"
                    options={[
                      { label: "Independent", value: "INDEPENDENT" },
                      { label: "Assistance", value: "ASSISTANCE" },
                      { label: "Hoisted", value: "HOISTED" }
                    ]}
                  />
                  <YesNoRadio name="constipationHistory" label="History of constipation?" />
                  <YesNoRadio name="historyRecurrentUTIs" label="History of recurrent UTIs?" />
                </div>
              </div>

              {/* Section 6: Urinary Continence History */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Urinary Continence History</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <RadioEntry
                    name="incontinenceFrequency"
                    label="Frequency of Urinary Incontinence"
                    options={[
                      { label: "None", value: "NONE" },
                      { label: "Once a day", value: "ONCE-A-DAY" },
                      { label: "1-2/day", value: "1-2-DAY" },
                      { label: "3/d", value: "3-DAY" },
                      { label: "Nightime", value: "NIGHTTIME" },
                      { label: "Day and night", value: "DAY-AND-NIGHT" }
                    ]}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RadioEntry
                      name="incontinenceVolume"
                      label="Typical Volume"
                      options={[
                        { label: "Entire Bladder", value: "ENTIRE-BLADDER" },
                        { label: "Small Volume Leaks", value: "SMALL-VOL-LEAKS" },
                        { label: "Unable to determine", value: "UNABLE-DETERMINE" }
                      ]}
                    />
                    <RadioEntry
                      name="onset"
                      label="Onset of symptoms"
                      options={[
                        { label: "Sudden", value: "SUDDEN" },
                        { label: "Gradual", value: "GRADUAL" }
                      ]}
                    />
                    <RadioEntry
                      name="duration"
                      label="Duration"
                      options={[
                        { label: "Less than 6 months", value: "LESS-6M" },
                        { label: "6 months-1 year", value: "6M-1Y" },
                        { label: "More than 1 year", value: "MORE-1Y" }
                      ]}
                    />
                    <RadioEntry
                      name="symptomsPast6Months"
                      label="Symptoms in the past 6 months"
                      options={[
                        { label: "Stable", value: "STABLE" },
                        { label: "Worsening", value: "WORSENING" },
                        { label: "Improving", value: "IMPROVING" },
                        { label: "Fluctuating", value: "FLUCTUATING" }
                      ]}
                    />
                    <YesNoRadio name="physicianConsulted" label="Physician consulted regarding incontinence?" />
                  </div>
                </div>
              </div>
              <div className="p-6 border rounded-xl bg-card/10 space-y-4">
                <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Urinary Symptoms (Leakage Triggers)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <YesNoRadio name="leakCoughLaugh" label="Do you leak when you cough or laugh?" />
                  <YesNoRadio name="leakStandingUp" label="Do you leak when you get up from a chair?" />
                  <YesNoRadio name="leakUpstairsDownhill" label="Do you leak when you go upstairs/downhill?" />
                  <YesNoRadio name="passesUrineFrequently" label="Passes urine frequently?" />
                  <YesNoRadio name="desirePassUrineStrong" label="Desire to pass urine very strong?" />
                  <YesNoRadio name="leaksBeforeToilet" label="Leaks urine before reaching the toilet?" />
                  <YesNoRadio name="getsUpMoreThanTwiceNight" label="Gets up more than twice during the night?" />
                  <YesNoRadio name="anxietyContributesFrequency" label="Anxiety contributes to frequency?" />
                  <YesNoRadio name="difficultyBeginningUrine" label="Difficulty in beginning to pass urine?" />
                  <YesNoRadio name="hesitancyStraining" label="Hesitancy/Straining?" />
                  <YesNoRadio name="dribblesAfterUrine" label="Dribbles after passing urine?" />
                  <YesNoRadio name="feelsBladderFullAfterUrine" label="Still feels bladder is full after passing urine?" />
                  <YesNoRadio name="recurrentUTIs" label="Has recurrent urinary tract infections?" />
                  <YesNoRadio name="limitedMobility" label="Limited mobility?" />
                  <YesNoRadio name="unableToiletOnTime" label="Unable to get to the toilet on time?" />
                  <YesNoRadio name="cannotHoldUrinalOrSit" label="Cannot hold urinal or sit on toilet?" />
                  <YesNoRadio name="cannotReachCallBell" label="Cannot reach/use call bell?" />
                  <YesNoRadio name="poorVision" label="Poor vision?" />
                  <YesNoRadio name="needsAssistedTransfer" label="Needs to be assisted to transfer?" />
                  <YesNoRadio name="pain" label="Pain?" />
                </div>
              </div>

              {/* Section 7: Bowel Pattern */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Bowel Pattern</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <RadioEntry
                    name="bowelPattern"
                    label="Bowel Pattern"
                    options={[
                      { label: "Normal", value: "NORMAL" },
                      { label: "Constipation", value: "CONSTIPATION" },
                      { label: "Diarrhoea", value: "DIARRHOEA" },
                      { label: "Irritable Bowel", value: "IRRITABLE-BOWEL" },
                      { label: "Stoma", value: "STOMA" },
                      { label: "Faecal incontinence", value: "FAECAL-INCONTINENCE" }
                    ]}
                  />
                   <FormField control={form.control} name="bowelFrequency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[60px] text-sm">{field.value}</div>
                        ) : (
                          <Textarea className="min-h-[60px]" {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bowelUsualTimeOfDay" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usual Time of Day</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[60px] text-sm">{field.value}</div>
                        ) : (
                          <Textarea className="min-h-[60px]" {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bowelAmountStoolType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bristol Stool Type & Amount</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[60px] text-sm">{field.value}</div>
                        ) : (
                          <Textarea className="min-h-[60px]" placeholder="e.g. Type 4, Moderate amount" {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <YesNoRadio name="bowelLiquidFeeds" label="Liquid Feeds?" />
                   <FormField control={form.control} name="bowelOtherFactors" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Factors (e.g. Diet/Fluid)</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[60px] text-sm">{field.value}</div>
                        ) : (
                          <Textarea className="min-h-[60px]" {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bowelOtherRemedies" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Remedies (e.g. prune juice)</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[60px] text-sm">{field.value}</div>
                        ) : (
                          <Textarea className="min-h-[60px]" {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="space-y-4">
                    <YesNoRadio name="medicalOfficerConsulted" label="Medical Officer Consulted?" />
                    {form.watch("medicalOfficerConsulted") === "Yes" && (
                        <FormField
                        control={form.control}
                        name="medicalOfficerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medical Officer Name/Date</FormLabel>
                            <FormControl>
                              {viewOnly ? (
                                <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[60px] text-sm">{field.value}</div>
                              ) : (
                                <Textarea className="min-h-[60px]" placeholder="Enter name and date..." {...field} />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Section 8: Toileting Pattern & Aids */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Toileting Habits & Aids</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {["day", "evening", "night"].map(p => (
                    <FormField key={p} control={form.control} name={`${p}Pattern` as any} render={({ field }) => (
                      <FormItem><FormLabel className="capitalize">{p} Pattern</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="TOILET">Toilet</SelectItem><SelectItem value="COMMODE">Commode</SelectItem><SelectItem value="BED-PAN">Bed-pan</SelectItem><SelectItem value="URINAL">Urinal</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  ))}
                </div>
                 <FormField control={form.control} name="typesOfPads" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Continence Pads/Aids In Use</FormLabel>
                    <FormControl>
                      {viewOnly ? (
                        <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[80px] text-sm">{field.value}</div>
                      ) : (
                        <Textarea className="min-h-[80px]" placeholder="List products and sizes..." {...field} />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Section 9: Quality of Life */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Quality of Life</h3>
                </div>
                 <FormField
                  control={form.control}
                  name="qualityOfLife"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>On a scale of 0 (not at all) to 10 (greatly), how much does your urinary incontinence affect your quality of life?</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[60px] text-sm">{field.value}</div>
                        ) : (
                          <Textarea className="min-h-[60px]" placeholder="Scale 0-10 or details..." {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section 10: Summary & Planning */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Summary & Planning</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4 p-4 bg-muted/20 border rounded-lg">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Bladder Decisions</h4>
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-4">
                        <YesNoRadio name="bladderContinent" label="Continent?" />
                        <YesNoRadio name="bladderIncontinent" label="Incontinent?" />
                      </div>
                      <RadioEntry
                        name="bladderIncontinentType"
                        label="If Incontinent, Type:"
                        options={[
                          { label: "Stress", value: "STRESS" },
                          { label: "Urge", value: "URGE" },
                          { label: "Mixed", value: "MIXED" },
                          { label: "Functional", value: "FUNCTIONAL" },
                          { label: "Retention/overflow", value: "RETENTION-OVERFLOW" }
                        ]}
                      />
                      <YesNoRadio name="bladderCarePlanCommenced" label="Care Plan Commenced?" />
                      <RadioEntry
                        name="bladderReferralRequired"
                        label="Referral Required?"
                        options={[
                          { label: "None", value: "NONE" },
                          { label: "GP", value: "GP" },
                          { label: "OT", value: "OT" },
                          { label: "Continence Nurse Specialist", value: "CONTINENCE-NURSE" },
                          { label: "Physiotherapist", value: "PHYSIOTHERAPIST" }
                        ]}
                      />
                      <RadioEntry
                        name="bladderTreatmentPlanFollowed"
                        label="Treatment Plan Followed:"
                        options={[
                          { label: "Urge", value: "URGE" },
                          { label: "Stress", value: "STRESS" },
                          { label: "Mixed", value: "MIXED" },
                          { label: "Retention/overflow", value: "RETENTION-OVERFLOW" }
                        ]}
                      />
                    </div>
                  </div>
                  <div className="space-y-4 p-4 bg-muted/20 border rounded-lg">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Bowel Decisions</h4>
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-4">
                        <YesNoRadio name="bowelContinent" label="Continent?" />
                        <YesNoRadio name="bowelIncontinent" label="Incontinent?" />
                      </div>
                      <YesNoRadio name="bowelCarePlanCommenced" label="Care Plan Commenced?" />
                      <YesNoRadio name="bowelRecordCommenced" label="Bowel Record Commenced?" />
                      <RadioEntry
                        name="bowelReferralRequired"
                        label="Referral Required?"
                        options={[
                          { label: "None", value: "NONE" },
                          { label: "GP", value: "GP" },
                          { label: "Dietician", value: "DIETICIAN" },
                          { label: "OT", value: "OT" },
                          { label: "Physiotherapist", value: "PHYSIOTHERAPIST" }
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 11: Sign-off & Review */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Sign-off & Review</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="sigantureCompletingAssessment" render={({ field }) => <FormItem><FormLabel>Staff Name</FormLabel><FormControl><div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div></FormControl><FormMessage /></FormItem>} />
                   <FormField control={form.control} name="sigantureResident" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resident/Representative Signature</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className="p-2 border rounded bg-muted whitespace-pre-wrap break-words min-h-[38px] text-sm">{field.value}</div>
                        ) : (
                          <Input {...field} />
                        )}
                      </FormControl>
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
