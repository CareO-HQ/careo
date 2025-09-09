"use client";
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
import { InfectionPreventionAssessmentSchema } from "@/schemas/residents/care-file/infectionPrevention";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns-tz";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
interface InfectionPreventionDialogProps {
  teamId: string;
  organizationId: string;
  resident: Resident;
  userName: string;
}

export default function InfectionPreventionDialog({
  resident,
  teamId,
  organizationId,
  userName
}: InfectionPreventionDialogProps) {
  const [step, setStep] = useState(1);
  const [isLoading, startTransition] = useTransition();

  const form = useForm<z.infer<typeof InfectionPreventionAssessmentSchema>>({
    resolver: zodResolver(InfectionPreventionAssessmentSchema),
    mode: "onChange",
    defaultValues: {
      // Metadata
      residentId: resident._id,
      organizationId: organizationId,
      teamId: teamId,

      // 1. Person's details
      name: resident.firstName + " " + resident.lastName,
      dateOfBirth: resident.dateOfBirth,
      homeAddress: "",
      assessmentType: "Pre-admission",
      informationProvidedBy: "",
      admittedFrom: "",
      consultantGP: "",
      reasonForAdmission: "",
      dateOfAdmission: undefined,

      // 2. Acute Respiratory Illness (ARI)
      newContinuousCough: undefined,
      worseningCough: undefined,
      temperatureHigh: undefined,
      otherRespiratorySymptoms: "",
      testedForCovid19: undefined,
      testedForInfluenzaA: undefined,
      testedForInfluenzaB: undefined,
      testedForRespiratoryScreen: undefined,
      influenzaB: undefined,
      respiratoryScreen: undefined,

      // 3. Exposure
      exposureToPatientsCovid: undefined,
      exposureToStaffCovid: undefined,
      isolationRequired: undefined,
      isolationDetails: "",
      furtherTreatmentRequired: undefined,

      // 4. Diarrhea and Vomiting
      diarrheaVomitingCurrentSymptoms: undefined,
      diarrheaVomitingContactWithOthers: undefined,
      diarrheaVomitingFamilyHistory72h: undefined,

      // 5. Clostridium Difficile
      clostridiumActive: undefined,
      clostridiumHistory: undefined,
      clostridiumStoolCount72h: "",
      clostridiumLastPositiveSpecimenDate: undefined,
      clostridiumResult: "",
      clostridiumTreatmentReceived: "",
      clostridiumTreatmentComplete: undefined,
      ongoingDetails: "",
      ongoingDateCommenced: "",
      ongoingLengthOfCourse: "",
      ongoingFollowUpRequired: "",

      // 6. MRSA / MSSA
      mrsaMssaColonised: undefined,
      mrsaMssaInfected: undefined,
      mrsaMssaLastPositiveSwabDate: "",
      mrsaMssaSitesPositive: "",
      mrsaMssaTreatmentReceived: "",
      mrsaMssaTreatmentComplete: undefined,
      mrsaMssaDetails: "",
      mrsaMssaDateCommenced: new Date().getTime(),
      mrsaMssaLengthOfCourse: "",
      mrsaMssaFollowUpRequired: "",

      // 7. Multi-drug resistant organisms
      esbl: undefined,
      vreGre: undefined,
      cpe: undefined,
      otherMultiDrugResistance: "",
      relevantInformationMultiDrugResistance: "",

      // 8. Other Information
      awarenessOfInfection: undefined,
      lastFluVaccinationDate: new Date().getTime(),

      // 9. Assessment Completion
      completedBy: userName,
      jobRole: "",
      signature: userName,
      completionDate: new Date().getTime()
    }
  });

  function onSubmit(
    values: z.infer<typeof InfectionPreventionAssessmentSchema>
  ) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log("Form submission triggered - values:", values);
  }

  const handleNext = async () => {
    let isValid = false;
    if (step === 1) {
      const fieldsToValidate = [
        "name",
        "dateOfBirth",
        "homeAddress",
        "assessmentType",
        "informationProvidedBy",
        "admittedFrom",
        "consultantGP",
        "reasonForAdmission",
        "dateOfAdmission"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      const fieldsToValidate = [
        "newContinuousCough",
        "worseningCough",
        "temperatureHigh",
        "testedForCovid19",
        "testedForInfluenzaA",
        "testedForInfluenzaB",
        "testedForRespiratoryScreen"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 3) {
      const fieldsToValidate = [
        "exposureToPatientsCovid",
        "exposureToStaffCovid",
        "isolationRequired",
        "isolationDetails",
        "furtherTreatmentRequired"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 4) {
      const fieldsToValidate = [
        "diarrheaVomitingCurrentSymptoms",
        "diarrheaVomitingContactWithOthers",
        "diarrheaVomitingFamilyHistory72h"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 5) {
      const fieldsToValidate = [
        "clostridiumActive",
        "clostridiumHistory",
        "clostridiumStoolCount72h",
        "clostridiumLastPositiveSpecimenDate",
        "clostridiumResult",
        "clostridiumTreatmentReceived",
        "clostridiumTreatmentComplete",
        "ongoingDetails",
        "ongoingDateCommenced",
        "ongoingLengthOfCourse",
        "ongoingFollowUpRequired"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 6) {
      const fieldsToValidate = [
        "mrsaMssaColonised",
        "mrsaMssaInfected",
        "mrsaMssaLastPositiveSwabDate",
        "mrsaMssaSitesPositive",
        "mrsaMssaTreatmentReceived",
        "mrsaMssaTreatmentComplete",
        "mrsaMssaDetails",
        "mrsaMssaDateCommenced",
        "mrsaMssaLengthOfCourse",
        "mrsaMssaFollowUpRequired"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 7) {
      const fieldsToValidate = [
        "esbl",
        "vreGre",
        "cpe",
        "otherMultiDrugResistance",
        "relevantInformationMultiDrugResistance"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 8) {
      const fieldsToValidate = [
        "awarenessOfInfection",
        "lastFluVaccinationDate"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 9) {
      const fieldsToValidate = [
        "completedBy",
        "jobRole",
        "signature",
        "completionDate"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);

      if (isValid) {
        if (step === 9) {
          console.log(form.getValues());
        } else {
          setStep(step + 1);
        }
      } else {
        toast.error("Please fill in all required fields correctly");
      }
    }
  };

  const handleBack = () => {
    if (step === 1) return;
    setStep(step - 1);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {step === 1 && "Resident's details"}
          {step === 2 && "Acute Respiratory Illness (ARI)"}
          {step === 3 && "Exposure"}
          {step === 4 && "Diarrhea and Vomiting"}
          {step === 5 && "Clostridium Difficile"}
          {step === 6 && "MRSA / MSSA"}
          {step === 7 && "Multi-drug resistant organisms"}
          {step === 8 && "Other Information"}
          {step === 9 && "Assessment Completion"}
        </DialogTitle>
        <DialogDescription>
          {step === 1 && "Gather essential information about the resident"}
          {step === 2 && "Check for ARI symptoms"}
          {step === 3 && "Check for exposure to patients or staff"}
          {step === 4 && "Check for diarrhea and vomiting"}
          {step === 5 && "Check for Clostridium Difficile"}
          {step === 6 && "Check for MRSA / MSSA"}
          {step === 7 && "Check for multi-drug resistant organisms"}
          {step === 8 && "Check for other information"}
          {step === 9 && "Who completed the assessment?"}
        </DialogDescription>
      </DialogHeader>
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
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
                <FormField
                  control={form.control}
                  name="homeAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Home Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Main St, Anytown, USA"
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
                    name="assessmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Assessment Type</FormLabel>
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
                            <SelectItem value="Pre-admission">
                              Pre-admission
                            </SelectItem>
                            <SelectItem value="Admission">Admission</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="informationProvidedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Information Provided By</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe (Family Member)"
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
                    name="admittedFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admitted From</FormLabel>
                        <FormControl>
                          <Input placeholder="Hospital Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="consultantGP"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consultant GP</FormLabel>
                        <FormControl>
                          <Input placeholder="GP Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reasonForAdmission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Admission</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Reason for Admission"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfAdmission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Admission</FormLabel>
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
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newContinuousCough"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>New Continuous Cough</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="worseningCough"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Worsening Cough</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
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
                    name="temperatureHigh"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Is temperature high?</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="testedForCovid19"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Tested for Covid-19?</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
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
                    name="testedForInfluenzaA"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Tested for Influenza A?</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="testedForInfluenzaB"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Tested for Influenza B?</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />{" "}
                </div>
                <FormField
                  control={form.control}
                  name="testedForRespiratoryScreen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Tested for Respiratory Screen?
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="otherRespiratorySymptoms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other respiratory symptoms?</FormLabel>
                      <Textarea
                        placeholder="Other respiratory symptoms"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 3 && (
              <>
                <FormField
                  control={form.control}
                  name="exposureToPatientsCovid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Exposure to Patients with Covid-19?
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="exposureToStaffCovid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Exposure to Staff with Covid-19?
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isolationRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Isolation Required?</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isolationDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Isolation Details</FormLabel>
                      <Textarea placeholder="Isolation Details" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="furtherTreatmentRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Further Treatment Required?
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 4 && (
              <>
                <FormField
                  control={form.control}
                  name="diarrheaVomitingCurrentSymptoms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Current symptoms of diarrhea and vomiting?
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diarrheaVomitingContactWithOthers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Contact with others?</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diarrheaVomitingFamilyHistory72h"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Family history of diarrhea and vomiting in the last 72
                        hours?
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 5 && (
              <>
                <FormField
                  control={form.control}
                  name="clostridiumActive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Has the person Active Clostridium Difficile?
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clostridiumHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        Has the person a history of Clostridium Difficile?
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clostridiumStoolCount72h"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Number of type 6 or 7 stools in the past 72 hours?
                      </FormLabel>
                      <Input placeholder="Number of stools" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clostridiumLastPositiveSpecimenDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Last Positive Specimen</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="clostridiumResult"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Result of Clostridium Difficile?</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="clostridiumTreatmentReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment received?</FormLabel>
                      <Textarea
                        placeholder="If relevant, treatment received"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clostridiumTreatmentComplete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment completed?</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ongoingDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ongoing details</FormLabel>
                      <Textarea placeholder="Ongoing details" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ongoingDateCommenced"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date commenced</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="ongoingLengthOfCourse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length of course</FormLabel>
                        <Input placeholder="Length of course" {...field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="ongoingFollowUpRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow up required</FormLabel>
                      <Input placeholder="Follow up required" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 6 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mrsaMssaColonised"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Is the person colonised?</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mrsaMssaInfected"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Is the person infected?</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mrsaMssaLastPositiveSwabDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Last Positive Swab</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="mrsaMssaSitesPositive"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sites positive</FormLabel>
                        <Input placeholder="Sites positive" {...field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="mrsaMssaTreatmentReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment received</FormLabel>
                      <Textarea
                        placeholder="Details of treatment received"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mrsaMssaTreatmentComplete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment completed</FormLabel>
                      <Textarea placeholder="Treatment completed" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mrsaMssaDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details</FormLabel>
                      <Textarea placeholder="Details" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mrsaMssaDateCommenced"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date commenced</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="mrsaMssaLengthOfCourse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length of course</FormLabel>
                        <Input placeholder="Length of course" {...field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="mrsaMssaFollowUpRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Any follow up required?</FormLabel>
                      <Textarea
                        placeholder="Any details of follow up required?"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {step === 7 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="esbl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>History of ESBLs?</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vreGre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>History of VRE/GRE?</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="cpe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>History of CPE?</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="otherMultiDrugResistance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other multi-drug resistance</FormLabel>
                      <Textarea
                        placeholder="Other multi-drug resistance"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="relevantInformationMultiDrugResistance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relevant information</FormLabel>
                      <Textarea placeholder="Relevant information" {...field} />
                      <FormDescription>
                        Detail other relevant information including treatment,
                        planned screening, recent anitbiotic therapy,...
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
                  name="awarenessOfInfection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Awareness of infection</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "true")
                        }
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastFluVaccinationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of last flu vaccination</FormLabel>
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
              </>
            )}
            {step === 9 && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="completedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completed by</FormLabel>
                      <Input placeholder="Full name" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job role</FormLabel>
                      <Input placeholder="Job role" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signature</FormLabel>
                      <Input placeholder="Signature" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="completionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completion date</FormLabel>
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
            step === 9
              ? () => {
                  console.log(
                    "Step 9 button clicked - attempting form submission"
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
          type={step === 9 ? "submit" : "button"}
        >
          {isLoading
            ? "Saving..."
            : step === 1
              ? "Start Assessment"
              : step === 9
                ? "Save Assessment"
                : "Next"}
        </Button>
      </DialogFooter>
    </>
  );
}
