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
}

export default function InfectionPreventionDialog({
  resident,
  teamId,
  organizationId
}: InfectionPreventionDialogProps) {
  const [step, setStep] = useState(2);
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
      respiratoryScreen: undefined
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
    }
    if (isValid) {
      if (step === 9) {
        console.log(form.getValues());
      } else {
        setStep(step + 1);
      }
    } else {
      toast.error("Please fill in all required fields correctly");
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
