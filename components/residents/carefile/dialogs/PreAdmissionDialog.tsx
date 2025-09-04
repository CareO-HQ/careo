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
import { preAdmissionSchema } from "@/schemas/residents/care-file/preAdmissionSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns-tz";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface PreAdmissionDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  careHomeName: string;
  userName: string;
  resident: Resident;
}

export default function PreAdmissionDialog({
  teamId,
  residentId,
  organizationId,
  careHomeName,
  userName,
  resident
}: PreAdmissionDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [consentAcceptedAt, setConsentAcceptedAt] = useState(false);

  const firstKin = resident.emergencyContacts?.find(
    (contact) => contact.isPrimary
  );

  const form = useForm<z.infer<typeof preAdmissionSchema>>({
    resolver: zodResolver(preAdmissionSchema),
    defaultValues: {
      residentId,
      teamId,
      organizationId,
      savedAsDraft: false,
      consentAcceptedAt: 0,
      careHomeName,
      nhsHealthCareNumber: "",
      userName,
      jobRole: "",
      date: new Date().getTime(),
      firstName: resident.firstName ?? "",
      lastName: resident.lastName ?? "",
      address: "",
      phoneNumber: resident.phoneNumber ?? "",
      ethnicity: "",
      gender: undefined,
      religion: "",
      dateOfBirth: resident.dateOfBirth ?? "",
      kinFirstName: firstKin?.name ?? "",
      kinLastName: "",
      kinRelationship: firstKin?.relationship ?? "",
      kinPhoneNumber: firstKin?.phoneNumber ?? ""
    }
  });

  function onSubmit(values: z.infer<typeof preAdmissionSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  }

  const handleNext = () => {
    setStep(step + 1);
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
          {step === 1 && "Pre-Admission Assessment Form"}
          {step === 2 && "Header information"}
          {step === 3 && "About the resident"}
          {step === 4 && "First of kin"}
          {step === 5 && "Professional contacts"}
          {step === 6 && "Medical information"}
          {step === 7 && "Assessment sections"}
          {step === 8 && "Assessment sections"}
          {step === 9 && "Assessment sections"}
          {step === 10 && "Palliative and End of life care"}
        </DialogTitle>
        <DialogDescription>
          {step === 1 &&
            "Gather essential information about the resident before their admission."}
          {step === 2 && "Basic information about the care home"}
          {step === 3 && "Basic resident information"}
          {step === 4 && "First of kin information"}
          {step === 5 &&
            "Add information about different professional contacts"}
          {step === 6 && "Add known allergies and medical history"}
          {step === 7 && "Add information about the assessment sections"}
          {step === 8 && "Add information about the assessment sections"}
          {step === 9 && "Add information about the assessment sections"}
          {step === 10 &&
            "Add information about the palliative and end of life care"}
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
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
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
                            <Calendar
                              mode="single"
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              onSelect={(date) => {
                                if (date) field.onChange(date);
                              }}
                              captionLayout="dropdown"
                            />
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
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
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
                            >
                              <Calendar
                                mode="single"
                                selected={
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                onSelect={(date) => {
                                  if (date) field.onChange(date);
                                }}
                                captionLayout="dropdown"
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
          </form>
        </Form>
      </div>
      <DialogFooter>
        <Button onClick={handleBack} variant="outline">
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        <Button onClick={handleNext} disabled={!consentAcceptedAt}>
          {step === 1 ? "Start Assessment" : "Next"}
        </Button>
      </DialogFooter>
    </>
  );
}
