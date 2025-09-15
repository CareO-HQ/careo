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
  FormDescription,
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
import { preAdmissionSchema } from "@/schemas/residents/care-file/preAdmissionSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns-tz";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface BladderBowelDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
}

export default function BladderBowelDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident
}: BladderBowelDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();

  const form = useForm<z.infer<typeof bladderBowelAssessmentSchema>>({
    resolver: zodResolver(bladderBowelAssessmentSchema),
    mode: "onChange",
    defaultValues: {}
  });

  function onSubmit(values: z.infer<typeof bladderBowelAssessmentSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log("Form submission triggered - values:", values);
    startTransition(async () => {
      try {
        console.log("Attempting to submit form...");
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Error submitting form: " + (error as Error).message);
      }
    });
  }

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
      isValid = true;
    } else if (step === 2) {
      const fieldsToValidate = [
        "hepatitisAB",
        "bloodBorneVirues",
        "mrsa",
        "esbl",
        "other"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 3) {
      const fieldsToValidate = [
        "ph",
        "nitrates",
        "protein",
        "leucocytes",
        "glucose",
        "bloodResult",
        "mssuDate"
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
        "caffeineMls24h",
        "caffeineFrequency",
        "caffeineTimeOfDay",
        "excersiceType",
        "excersiceFrequency",
        "excersiceTimeOfDay",
        "alcoholAmount24h",
        "alcoholFrequency",
        "alcoholTimeOfDay",
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

    if (isValid) {
      if (step === 13) {
        console.log(form.getValues());
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
          {step === 1 && "Resident information"}
          {step === 2 && "Infections information"}
          {step === 3 && "Urinalysis information"}
          {step === 4 && "Prescribed medication"}
          {step === 5 && "Contributing risk factors"}
          {step === 6 && "Urinay continence"}
          {step === 7 && "Bowel pattern"}
          {step === 8 && "Toileting patterns and products"}
          {step === 9 && "Symptoms associates with incontinence"}
          {step === 10 && "Symptoms associates with incontinence"}
          {step === 11 && "Symptoms associates with incontinence"}
          {step === 12 && "Quality of life"}
          {step === 13 && "Signatures"}
        </DialogTitle>
        <DialogDescription>
          {step === 1 &&
            "Basic information about the resident"}
          {step === 2 && "Basic information about the infections"}
          {step === 3 && "Information about the urinalysis"}
          {step === 4 && "Prescribed medication information"}
          {step === 5 &&
            "Contributing risk factors information"}
          {step === 6 && "Add known allergies and medical history"}
          {step === 7 && "Urinay continence information"}
          {step === 8 && "Bowel pattern information"}
          {step === 9 && "Toileting patterns and products information"}
          {step === 10 && "Symptoms associates with incontinence information"}
          {step === 11 && "Symptoms associates with incontinence information"}
          {step === 12 && "Quality of life information"}
          {step === 13 && "Signatures information"}
        </DialogDescription>
      </DialogHeader>
      <div className="">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <FormField
                control={form.control}
                name="consentAcceptedAt"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={consentAcceptedAt}
                          id="terms-2"
                          {...field}
                          onCheckedChange={(e) => {
                            form.setValue(
                              "consentAcceptedAt",
                              new Date().getTime()
                            );

                            setConsentAcceptedAt(Boolean(e));
                          }}
                        />
                      </FormControl>
                      <FormLabel htmlFor="terms-2">
                        The person being assessed agree to the assessment being
                        completed
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="careHomeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Care home name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nhsHealthCareNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>NHS Health & Care Number</FormLabel>
                        <FormControl>
                          <Input placeholder="A345657" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Job Role</FormLabel>
                        <FormControl>
                          <Input placeholder="Nurse" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expected admission date</FormLabel>
                        <Popover
                          open={datePopoverOpen}
                          onOpenChange={setDatePopoverOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" captionLayout="dropdown" />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Main St, London, UK"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ethnicity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Ethnicity</FormLabel>
                        <FormControl>
                          <Input placeholder="White" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Gender</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
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
                    name="religion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Religion</FormLabel>
                        <FormControl>
                          <Input placeholder="Catholic" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Date of Birth</FormLabel>
                        <FormControl>
                          <Popover
                            open={dobPopoverOpen}
                            onOpenChange={setDobPopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "w-[240px] pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                              onInteractOutside={(e) => e.preventDefault()}
                            >
                              <Calendar
                                mode="single"
                                selected={
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                captionLayout="dropdown"
                                onSelect={(date) => {
                                  if (date) {
                                    field.onChange(date);
                                    setDobPopoverOpen(true);
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="kinFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kinLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="kinRelationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Relationship</FormLabel>
                        <FormControl>
                          <Input placeholder="Mother" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kinPhoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 987-6543" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
            {step === 5 && (
              <>
                <div>
                  <p className="font-semibold mb-2">
                    Care Manager / Social Worker
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="careManagerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Care Manager Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="careManagerPhoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 987-6543" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2">District Nurse</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="districtNurseName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>District Nurse Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="districtNursePhoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 987-6543" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2">General Practitioner</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="generalPractitionerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>
                            General Practitioner Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="generalPractitionerPhoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 987-6543" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2">
                    Person Providing Healthcare Info
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="providerHealthcareInfoName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="providerHealthcareInfoDesignation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Designation</FormLabel>
                          <FormControl>
                            <Input placeholder="Nurse" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}
            {step === 6 && (
              <>
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Known Allergies</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List of known allergies"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medicalHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Medical History</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Medical history" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medicationPrescribed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Medication Prescribed</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List of medication prescribed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 7 && (
              <>
                <FormField
                  control={form.control}
                  name="consentCapacityRights"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Consent Capacity Rights</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Consent capacity rights"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include MCA, DoLs, Guardianship or detention
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medication"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Medication</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Medication" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Mobility</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Mobility" {...field} />
                      </FormControl>{" "}
                      <FormDescription>
                        Refere to current risk assessment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nutrition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Nutrition</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Nutrition" {...field} />
                      </FormControl>{" "}
                      <FormDescription>
                        Include MUST score if known, weight, height, BMI, IDDSI
                        requirements, diet type and any other relevant
                        information
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 8 && (
              <>
                <FormField
                  control={form.control}
                  name="continence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Continence</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Continence" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hygieneDressing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Personal Hygiene & Dressing
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="Hygiene & Dressing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="skin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Skin Integrity / Tissue Viability
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Skin Integrity / Tissue Viability"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include any pressure relieving equipment required
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cognition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Cognition</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Cognition" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 9 && (
              <>
                <FormField
                  control={form.control}
                  name="infection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Infection Control</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Infection Control" {...field} />
                      </FormControl>
                      <FormDescription>
                        Does the person have a current infection? If required,
                        complete Infection Prevention and Control Pre-Admission
                        Assessment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="breathing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Breathing</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Breathing" {...field} />
                      </FormControl>
                      <FormDescription>
                        Include details on prescribed inhalers, nebuliser,
                        oxygen and possible smoking risk
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="alteredStateOfConsciousness"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Altered State of Consciousness
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Altered State of Consciousness"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Epilepsy, Diabetes, TIA,...
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 10 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dnacpr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>DNACPR in place?</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === "true")
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Has capacity?</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === "true")
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="advancedDecision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          Requirements regarding advanced decision?
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === "true")
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="advancedCarePlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Advanced Care Plan?</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === "true")
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add details if needed"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        If any answer is yes, please provide details.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 11 && (
              <>
                <FormField
                  control={form.control}
                  name="roomPreferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        What would you like in your room prior to admission?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add details if needed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="admissionContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Is there anyone else you would like us to contact about
                        your admission to the home? List name and contact
                        details{" "}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add details if needed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="foodPreferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are your food likes/dislikes?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add details if needed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferedName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        What do you prefer to be called or known as?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add details if needed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="familyConcerns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Do you or your family have any worries or concerns about
                        moving to the home?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add details if needed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 12 && (
              <>
                <FormField
                  control={form.control}
                  name="otherHealthCareProfessional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Other Health Care Professional Involved in the
                        resident&apos;s care{" "}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tissue viability, Consultant,
                        Physiotherapist, Dietician, Continence Nurse
                        Advisor, Palliative Care Specialist, Advocate"
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="equipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment required</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Bed rails, Pressure relieving equipment, Hoist, Sling, Walking Aid, oxygen therapy,..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 13 && (
              <FormField
                control={form.control}
                name="attendFinances"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>
                      Can the person attend to own finances?
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {step === 14 && (
              <FormField
                control={form.control}
                name="additionalConsiderations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Are there any additional factors to be considered?{" "}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Level of observation, 1:1 or specialist equipment required"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {step === 15 && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment outcome</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => field.onChange(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plannedAdmissionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Planned admission date</FormLabel>
                      <Popover
                        open={plannedDatePopoverOpen}
                        onOpenChange={setPlannedDatePopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0"
                          align="start"
                          onInteractOutside={(e) => e.preventDefault()}
                        >
                          <Calendar
                            mode="single"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            captionLayout="dropdown"
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                setPlannedDatePopoverOpen(true);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
        <Button
          onClick={
            step === 15
              ? () => {
                  console.log(
                    "Step 15 button clicked - attempting form submission"
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
          disabled={(step === 1 && !consentAcceptedAt) || isLoading}
          type={step === 15 ? "submit" : "button"}
        >
          {isLoading
            ? "Saving..."
            : step === 1
              ? "Start Assessment"
              : step === 15
                ? "Save Assessment"
                : "Next"}
        </Button>
      </DialogFooter>
    </>
  );
}
