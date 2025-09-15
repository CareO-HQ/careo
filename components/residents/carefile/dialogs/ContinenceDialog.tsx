"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface BladderBowelDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  onClose?: () => void;
}

export default function BladderBowelDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose
}: BladderBowelDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const submitAssessment = useMutation(
    api.careFiles.bladderBowel.submitBladderBowelAssessment
  );

  const form = useForm<z.infer<typeof bladderBowelAssessmentSchema>>({
    resolver: zodResolver(bladderBowelAssessmentSchema),
    mode: "onChange",
    defaultValues: {
      residentId,
      teamId,
      organizationId,
      userId,
      residentName: `${resident.firstName} ${resident.lastName}`,
      dateOfBirth: new Date(resident.dateOfBirth).getTime(),
      bedroomNumber: resident.roomNumber || "",
      informationObtainedFrom: "",
      sigantureCompletingAssessment: userName,
      // Required enum fields
      smoking: undefined,
      weight: undefined,
      skinCondition: undefined,
      mentalState: undefined,
      mobilityIssues: undefined,
      incontinence: undefined,
      volume: undefined,
      onset: undefined,
      duration: undefined,
      symptompsLastSix: undefined,
      bowelState: undefined,
      bowelFrequency: undefined,
      usualTimeOfDat: undefined,
      amountAndStoolType: undefined,
      liquidFeeds: undefined,
      otherFactors: undefined,
      otherRemedies: undefined,
      dayPattern: undefined,
      eveningPattern: undefined,
      nightPattern: undefined,
      typesOfPads: undefined,
      bladderIncontinentType: undefined,
      bladderReferralRequired: undefined,
      bladderPlanFollowed: undefined,
      // Initialize all boolean checkboxes as false
      hepatitisAB: false,
      bloodBorneVirues: false,
      mrsa: false,
      esbl: false,
      ph: false,
      nitrates: false,
      protein: false,
      leucocytes: false,
      glucose: false,
      bloodResult: false,
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
      constipationHistory: false,
      historyRecurrentUTIs: false,
      physicianConsulted: false,
      medicalOfficerConsulted: false,
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
      limitedMobility: false,
      unableOnTime: false,
      notHoldUrinalOrSeat: false,
      notuseCallBell: false,
      poorVision: false,
      assistedTransfer: false,
      pain: false,
      bladderContinent: false,
      bladderIncontinent: false,
      bladderPlanCommenced: false,
      bowelContinent: false,
      bowelIncontinent: false,
      bowelPlanCommenced: false,
      bowelRecordCommenced: false,
      bowelReferralRequired: undefined,
      sigantureResident: undefined,
      dateNextReview: new Date().getTime()
    }
  });

  function onSubmit(values: z.infer<typeof bladderBowelAssessmentSchema>) {
    console.log("Form submission triggered - values:", values);
    startTransition(async () => {
      try {
        await submitAssessment({
          ...values,
          residentId: residentId as Id<"residents">,
          savedAsDraft: false
        });
        toast.success("Bladder bowel assessment submitted successfully");
        onClose?.();
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment. Please try again.");
      }
    });
  }

  const saveDraft = async () => {
    const values = form.getValues();
    try {
      await submitAssessment({
        ...values,
        residentId: residentId as Id<"residents">,
        savedAsDraft: true
      });
      toast.success("Draft saved successfully");
      onClose?.();
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft. Please try again.");
    }
  };

  const handleNext = async () => {
    let isValid = false;

    if (step === 1) {
      const fieldsToValidate = [
        "residentName",
        "dateOfBirth",
        "bedroomNumber",
        "informationObtainedFrom"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      const fieldsToValidate = [
        "hepatitisAB",
        "bloodBorneVirues",
        "mrsa",
        "esbl"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 3) {
      const fieldsToValidate = [
        "ph",
        "nitrates",
        "protein",
        "leucocytes",
        "glucose",
        "bloodResult"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 4) {
      const fieldsToValidate = [
        "antiHypertensives",
        "antiParkinsonDrugs",
        "ironSupplement",
        "laxatives",
        "diuretics",
        "histamine",
        "antiDepressants",
        "cholinergic",
        "sedativesHypnotic",
        "antiPsychotic",
        "antihistamines",
        "narcoticAnalgesics"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 5) {
      const fieldsToValidate = [
        "smoking",
        "weight",
        "skinCondition",
        "constipationHistory",
        "mentalState",
        "mobilityIssues",
        "historyRecurrentUTIs"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 6) {
      const fieldsToValidate = [
        "incontinence",
        "volume",
        "onset",
        "duration",
        "symptompsLastSix",
        "physicianConsulted"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 7) {
      const fieldsToValidate = [
        "bowelState",
        "bowelFrequency",
        "usualTimeOfDat",
        "amountAndStoolType",
        "liquidFeeds",
        "otherFactors",
        "otherRemedies",
        "medicalOfficerConsulted"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 8) {
      const fieldsToValidate = [
        "dayPattern",
        "eveningPattern",
        "nightPattern",
        "typesOfPads"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 9) {
      const fieldsToValidate = [
        "leakCoughLaugh",
        "leakStandingUp",
        "leakUpstairsDownhill",
        "passesUrineFrequently",
        "desirePassUrine",
        "leaksBeforeToilet",
        "moreThanTwiceAtNight",
        "anxiety"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 10) {
      const fieldsToValidate = [
        "difficultyStarting",
        "hesintancy",
        "dribbles",
        "feelsFull",
        "recurrentTractInfections"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 11) {
      const fieldsToValidate = [
        "limitedMobility",
        "unableOnTime",
        "notHoldUrinalOrSeat",
        "notuseCallBell",
        "poorVision",
        "assistedTransfer",
        "pain"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 12) {
      const fieldsToValidate = [
        "bladderContinent",
        "bladderIncontinent",
        "bladderIncontinentType",
        "bladderPlanCommenced",
        "bladderReferralRequired",
        "bladderPlanFollowed",
        "bowelContinent",
        "bowelIncontinent",
        "bowelPlanCommenced",
        "bowelRecordCommenced",
        "bowelReferralRequired"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 13) {
      const fieldsToValidate = [
        "sigantureCompletingAssessment",
        "sigantureResident",
        "dateNextReview"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    }

    if (isValid) {
      if (step === 13) {
        console.log(form.getValues());
        form.handleSubmit(onSubmit)();
      } else {
        setStep(step + 1);
      }
    } else {
      toast.error("Please fill in all required fields correctly");
    }
  };

  const handleBack = () => {
    if (step === 1) {
      return;
    }
    setStep(step - 1);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {step === 1 && "Resident Information"}
          {step === 2 && "Infections"}
          {step === 3 && "Urinalysis on Admission"}
          {step === 4 && "Prescribed Medication"}
          {step === 5 && "Lifestyle Factors"}
          {step === 6 && "Urinary Continence"}
          {step === 7 && "Bowel Pattern"}
          {step === 8 && "Toileting Patterns & Products"}
          {step === 9 && "Symptoms - Stress/Urge Incontinence"}
          {step === 10 && "Symptoms - Retention/Overflow"}
          {step === 11 && "Symptoms - Functional Issues"}
          {step === 12 && "Assessment Summary"}
          {step === 13 && "Signatures"}
        </DialogTitle>
        <DialogDescription>
          {step === 1 && "Basic information about the resident"}
          {step === 2 && "Check for any current infections"}
          {step === 3 && "Urinalysis results on admission"}
          {step === 4 && "Current prescribed medications"}
          {step === 5 && "Lifestyle factors that may affect continence"}
          {step === 6 && "Urinary continence assessment"}
          {step === 7 && "Bowel pattern assessment"}
          {step === 8 && "Current toileting patterns and products used"}
          {step === 9 && "Symptoms associated with stress/urge incontinence"}
          {step === 10 && "Symptoms associated with retention/overflow"}
          {step === 11 && "Symptoms associated with functional issues"}
          {step === 12 && "Assessment summary and care planning"}
          {step === 13 && "Assessment completion and signatures"}
        </DialogDescription>
      </DialogHeader>
      <div className="">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 1 - Resident Information */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="residentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Resident Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bedroomNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Bedroom Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Room 101" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Date of Birth</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
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
                              captionLayout="dropdown"
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              onSelect={(date) =>
                                field.onChange(date?.getTime())
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="informationObtainedFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          Information Obtained From
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Family member, medical records, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Step 2 - Infections */}
            {step === 2 && (
              <>
                <p className="text-sm font-medium mb-4">
                  Check all that apply:
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hepatitisAB"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Hepatitis A/B</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bloodBorneVirues"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Blood Borne Viruses</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mrsa"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>MRSA</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="esbl"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>ESBL</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="other"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Infections</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Specify other infections"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 3 - Urinalysis */}
            {step === 3 && (
              <>
                <p className="text-sm font-medium mb-4">
                  Urinalysis results (check positive results):
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ph"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>pH Abnormal</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nitrates"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Nitrates Positive</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="protein"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Protein Positive</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leucocytes"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Leucocytes Positive</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="glucose"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Glucose Positive</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bloodResult"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Blood Positive</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="mssuDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MSSU Date (if applicable)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
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
                            captionLayout="dropdown"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) => field.onChange(date?.getTime())}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 4 - Prescribed Medication */}
            {step === 4 && (
              <>
                <p className="text-sm font-medium mb-4">
                  Current prescribed medications (check all that apply):
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="antiHypertensives"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Anti-hypertensives</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="antiParkinsonDrugs"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Anti-Parkinson Drugs</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ironSupplement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Iron Supplement</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="laxatives"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Laxatives</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="diuretics"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Diuretics</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="histamine"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Histamine</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="antiDepressants"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Anti-depressants</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cholinergic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Cholinergic</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sedativesHypnotic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Sedatives/Hypnotic</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="antiPsychotic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Anti-psychotic</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="antihistamines"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Antihistamines</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="narcoticAnalgesics"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Narcotic Analgesics</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Step 5 - Lifestyle Factors */}
            {step === 5 && (
              <>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="caffeineMls24h"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Caffeine (mls/24h)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="caffeineFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Caffeine Frequency</FormLabel>
                          <FormControl>
                            <Input placeholder="Frequency" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="caffeineTimeOfDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Caffeine Time of Day</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Morning, evening, etc."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="alcoholAmount24h"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alcohol (units/24h)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="alcoholFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alcohol Frequency</FormLabel>
                          <FormControl>
                            <Input placeholder="Frequency" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="alcoholTimeOfDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alcohol Time of Day</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Evening, afternoon, etc."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="smoking"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Smoking Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select smoking status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SMOKER">Smoker</SelectItem>
                              <SelectItem value="NON-SMOKER">
                                Non-smoker
                              </SelectItem>
                              <SelectItem value="EX-SMOKER">
                                Ex-smoker
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Weight Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select weight status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NORMAL">Normal</SelectItem>
                              <SelectItem value="OBESE">Obese</SelectItem>
                              <SelectItem value="UNDERWEIGHT">
                                Underweight
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="skinCondition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Skin Condition</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select skin condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="HEALTHY">Healthy</SelectItem>
                              <SelectItem value="RED">Red</SelectItem>
                              <SelectItem value="EXCORIATED">
                                Excoriated
                              </SelectItem>
                              <SelectItem value="BROKEN">Broken</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mentalState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Mental State</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select mental state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ALERT">Alert</SelectItem>
                              <SelectItem value="CONFUSED">Confused</SelectItem>
                              <SelectItem value="LEARNING-DISABLED">
                                Learning Disabled
                              </SelectItem>
                              <SelectItem value="COGNITIVELY-IMPAIRED">
                                Cognitively Impaired
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="mobilityIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Mobility Issues</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select mobility level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="INDEPENDENT">
                              Independent
                            </SelectItem>
                            <SelectItem value="ASSISTANCE">
                              Assistance
                            </SelectItem>
                            <SelectItem value="HOISTED">Hoisted</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <FormField
                      control={form.control}
                      name="constipationHistory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>History of Constipation</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="historyRecurrentUTIs"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>History of Recurrent UTIs</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 6 - Urinary Continence */}
            {step === 6 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="incontinence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Incontinence Frequency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            <SelectItem value="ONE">One</SelectItem>
                            <SelectItem value="1-2DAY">1-2 per day</SelectItem>
                            <SelectItem value="3DAY">3+ per day</SelectItem>
                            <SelectItem value="NIGHT">Night only</SelectItem>
                            <SelectItem value="DAYANDNIGHT">
                              Day and night
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Volume</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select volume" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ENTIRE-BLADDER">
                              Entire bladder
                            </SelectItem>
                            <SelectItem value="SMALL-VOL">
                              Small volume
                            </SelectItem>
                            <SelectItem value="UNABLE-DETERMINE">
                              Unable to determine
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="onset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Onset</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select onset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SUDDEN">Sudden</SelectItem>
                            <SelectItem value="GRADUAL">Gradual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Duration</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LESS-6M">
                              Less than 6 months
                            </SelectItem>
                            <SelectItem value="6M-1Y">
                              6 months to 1 year
                            </SelectItem>
                            <SelectItem value="MORE-1Y">
                              More than 1 year
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="symptompsLastSix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Symptoms Last 6 Months</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select trend" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="STABLE">Stable</SelectItem>
                          <SelectItem value="WORSENING">Worsening</SelectItem>
                          <SelectItem value="IMPROVING">Improving</SelectItem>
                          <SelectItem value="FLUCTUATING">
                            Fluctuating
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="physicianConsulted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Physician Consulted</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 7 - Bowel Pattern */}
            {step === 7 && (
              <>
                <FormField
                  control={form.control}
                  name="bowelState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Bowel State</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select bowel state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="CONSTIPATION">
                            Constipation
                          </SelectItem>
                          <SelectItem value="DIARRHOEA">Diarrhoea</SelectItem>
                          <SelectItem value="STOMA">Stoma</SelectItem>
                          <SelectItem value="FAECAL-INCONTINENCE">
                            Faecal Incontinence
                          </SelectItem>
                          <SelectItem value="IRRITABLE-BOWEL">
                            Irritable Bowel
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bowelFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Bowel Frequency</FormLabel>
                        <FormControl>
                          <Input placeholder="Frequency" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="usualTimeOfDat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Usual Time of Day</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Morning, After meals"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="amountAndStoolType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Amount and Stool Type</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe amount and consistency"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="liquidFeeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Liquid Feeds</FormLabel>
                        <FormControl>
                          <Input placeholder="Type and frequency" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="otherFactors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Other Factors</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Contributing factors"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="otherRemedies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Other Remedies</FormLabel>
                        <FormControl>
                          <Input placeholder="Current treatments" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="medicalOfficerConsulted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-8">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Medical Officer Consulted</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Step 8 - Toileting Patterns & Products */}
            {step === 8 && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="dayPattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Day Pattern</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select pattern" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="TOILET">Toilet</SelectItem>
                            <SelectItem value="COMMODE">Commode</SelectItem>
                            <SelectItem value="BED-PAN">Bed Pan</SelectItem>
                            <SelectItem value="URINAL">Urinal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eveningPattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Evening Pattern</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select pattern" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="TOILET">Toilet</SelectItem>
                            <SelectItem value="COMMODE">Commode</SelectItem>
                            <SelectItem value="BED-PAN">Bed Pan</SelectItem>
                            <SelectItem value="URINAL">Urinal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nightPattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Night Pattern</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select pattern" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="TOILET">Toilet</SelectItem>
                            <SelectItem value="COMMODE">Commode</SelectItem>
                            <SelectItem value="BED-PAN">Bed Pan</SelectItem>
                            <SelectItem value="URINAL">Urinal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="typesOfPads"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Types of Pads</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe types and sizes of incontinence products used"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 9 - Symptoms - Stress/Urge Incontinence */}
            {step === 9 && (
              <>
                <p className="text-sm font-medium mb-4">
                  Symptoms associated with stress/urge incontinence (check all
                  that apply):
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leakCoughLaugh"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Leak when cough/laugh</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leakStandingUp"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Leak when standing up</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leakUpstairsDownhill"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Leak upstairs/downhill</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="passesUrineFrequently"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Passes urine frequently</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="desirePassUrine"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Strong desire to pass urine</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leaksBeforeToilet"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Leaks before reaching toilet</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="moreThanTwiceAtNight"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>More than twice at night</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="anxiety"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Anxiety about incontinence</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Step 10 - Symptoms - Retention/Overflow */}
            {step === 10 && (
              <>
                <p className="text-sm font-medium mb-4">
                  Symptoms associated with retention/overflow (check all that
                  apply):
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="difficultyStarting"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Difficulty starting stream</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hesintancy"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Hesitancy</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dribbles"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Dribbles after passing urine</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="feelsFull"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>
                          Feels bladder not completely empty
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recurrentTractInfections"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>
                          Recurrent urinary tract infections
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Step 11 - Symptoms - Functional Issues */}
            {step === 11 && (
              <>
                <p className="text-sm font-medium mb-4">
                  Symptoms associated with functional issues (check all that
                  apply):
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="limitedMobility"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Limited mobility</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unableOnTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Unable to get to toilet on time</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notHoldUrinalOrSeat"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Cannot hold urinal or sit on seat</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notuseCallBell"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Cannot use call bell</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="poorVision"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Poor vision</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assistedTransfer"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Requires assisted transfer</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pain"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Pain affecting mobility</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Step 12 - Assessment Summary */}
            {step === 12 && (
              <>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bladderIncontinentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Incontinence Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="STRESS">Stress</SelectItem>
                              <SelectItem value="URGE">Urge</SelectItem>
                              <SelectItem value="MIXED">Mixed</SelectItem>
                              <SelectItem value="FUNCTIONAL">
                                Functional
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bladderReferralRequired"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>
                            Bladder Referral Required
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select referral" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="DIETICIAN">
                                Dietician
                              </SelectItem>
                              <SelectItem value="GP">GP</SelectItem>
                              <SelectItem value="OT">OT</SelectItem>
                              <SelectItem value="PHYSIOTHERAPIST">
                                Physiotherapist
                              </SelectItem>
                              <SelectItem value="CONTINENCE-NURSE">
                                Continence Nurse
                              </SelectItem>
                              <SelectItem value="NONE">None</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>{" "}
                  <FormField
                    control={form.control}
                    name="bladderPlanFollowed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Plan Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="STRESS">Stress</SelectItem>
                            <SelectItem value="URGE">Urge</SelectItem>
                            <SelectItem value="MIXED">Mixed</SelectItem>
                            <SelectItem value="RETENTION-OVERFLOW">
                              Retention/Overflow
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bladderContinent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Bladder Continent</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bladderIncontinent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Bladder Incontinent</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="bladderPlanCommenced"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Bladder Plan Commenced</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bowelContinent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Bowel Continent</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bowelIncontinent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Bowel Incontinent</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="bowelPlanCommenced"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Bowel Plan Commenced</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bowelRecordCommenced"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Bowel Record Commenced</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="bowelReferralRequired"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel required>Bowel Referral Required</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select referral" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DIETICIAN">Dietician</SelectItem>
                            <SelectItem value="GP">GP</SelectItem>
                            <SelectItem value="OT">OT</SelectItem>
                            <SelectItem value="PHYSIOTHERAPIST">
                              Physiotherapist
                            </SelectItem>
                            <SelectItem value="NONE">None</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Step 13 - Signatures */}
            {step === 13 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sigantureCompletingAssessment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          Signature - Completing Assessment
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Staff member signature"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sigantureResident"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          Signature - Resident/Representative
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Resident or representative signature"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dateNextReview"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Date of Next Review</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
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
                            captionLayout="dropdown"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) => field.onChange(date?.getTime())}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </form>
        </Form>
      </div>
      <DialogFooter>
        <Button
          onClick={handleBack}
          variant="outline"
          disabled={step === 1 || isLoading}
        >
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        {/* {step > 1 && (
          <Button
            onClick={saveDraft}
            variant="secondary"
            disabled={isLoading}
            type="button"
          >
            Save Draft
          </Button>
        )} */}
        <Button
          onClick={
            step === 13
              ? () => {
                  console.log(
                    "Step 13 button clicked - attempting form submission"
                  );
                  console.log("Form errors:", form.formState.errors);
                  console.log("Form is valid:", form.formState.isValid);
                  console.log("Form values:", form.getValues());

                  const submitHandler = form.handleSubmit(onSubmit);
                  console.log("Submit handler created, calling it now...");
                  submitHandler();
                }
              : handleNext
          }
          disabled={isLoading}
          type={step === 13 ? "submit" : "button"}
        >
          {isLoading
            ? "Saving..."
            : step === 1
              ? "Start Assessment"
              : step === 13
                ? "Save Assessment"
                : "Next"}
        </Button>
      </DialogFooter>
    </>
  );
}
