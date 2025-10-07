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
import { admissionAssessmentSchema } from "@/schemas/residents/care-file/admissionSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface AdmissionDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function AdmissionDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: AdmissionDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const submitAssessment = useMutation(
    api.careFiles.admission.submitAdmissionAssessment
  );
  const updateAssessment = useMutation(
    api.careFiles.admission.updateAdmissionAssessment
  );

  const firstKin = resident.emergencyContacts?.find(
    (contact) => contact.isPrimary
  );

  // Debug: Log initialData to check for data issues
  if (initialData) {
    if (
      typeof initialData.kinRelationship !== "string" &&
      initialData.kinRelationship !== undefined
    ) {
      console.warn(
        "⚠️ Invalid kinRelationship type:",
        typeof initialData.kinRelationship,
        "Value:",
        initialData.kinRelationship
      );
      console.warn("Full initialData:", initialData);
    }
  }

  const form = useForm<z.infer<typeof admissionAssessmentSchema>>({
    resolver: zodResolver(admissionAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          // Use existing data for editing
          residentId: residentId as Id<"residents">,
          teamId,
          organizationId,
          userId,
          firstName: initialData.firstName ?? resident.firstName ?? "",
          lastName: initialData.lastName ?? resident.lastName ?? "",
          dateOfBirth:
            typeof initialData.dateOfBirth === "number"
              ? initialData.dateOfBirth
              : typeof resident.dateOfBirth === "number"
                ? resident.dateOfBirth
                : resident.dateOfBirth
                  ? new Date(resident.dateOfBirth).getTime()
                  : Date.now(),
          bedroomNumber: initialData.bedroomNumber ?? resident.roomNumber ?? "",
          admittedFrom: initialData.admittedFrom ?? "",
          religion: initialData.religion ?? "",
          telephoneNumber:
            initialData.telephoneNumber ?? resident.phoneNumber ?? "",
          gender: initialData.gender ?? undefined,
          NHSNumber: initialData.NHSNumber ?? "",
          ethnicity: initialData.ethnicity ?? "",
          // Next of kin
          kinFirstName: initialData.kinFirstName ?? firstKin?.name ?? "",
          kinLastName: initialData.kinLastName ?? "",
          kinRelationship:
            typeof initialData.kinRelationship === "string"
              ? initialData.kinRelationship
              : (firstKin?.relationship ?? ""),
          kinTelephoneNumber:
            initialData.kinTelephoneNumber ?? firstKin?.phoneNumber ?? "",
          kinAddress: initialData.kinAddress ?? "",
          kinEmail: initialData.kinEmail ?? "",
          // Emergency contacts
          emergencyContactName: initialData.emergencyContactName ?? "",
          emergencyContactTelephoneNumber:
            initialData.emergencyContactTelephoneNumber ?? "",
          emergencyContactRelationship:
            initialData.emergencyContactRelationship ?? "",
          emergencyContactPhoneNumber:
            initialData.emergencyContactPhoneNumber ?? "",
          // Care manager
          careManagerName: initialData.careManagerName ?? "",
          careManagerTelephoneNumber:
            initialData.careManagerTelephoneNumber ?? "",
          careManagerRelationship: initialData.careManagerRelationship ?? "",
          careManagerPhoneNumber: initialData.careManagerPhoneNumber ?? "",
          careManagerAddress: initialData.careManagerAddress ?? "",
          careManagerJobRole: initialData.careManagerJobRole ?? "",
          // GP
          GPName: initialData.GPName ?? "",
          GPAddress: initialData.GPAddress ?? "",
          GPPhoneNumber: initialData.GPPhoneNumber ?? "",
          // Medical information
          allergies: initialData.allergies ?? "",
          medicalHistory: initialData.medicalHistory ?? "",
          prescribedMedications: initialData.prescribedMedications ?? "",
          consentCapacityRights: initialData.consentCapacityRights ?? "",
          medication: initialData.medication ?? "",
          // Skin integrity
          skinIntegrityEquipment: initialData.skinIntegrityEquipment ?? "",
          skinIntegrityWounds: initialData.skinIntegrityWounds ?? "",
          // Sleep
          bedtimeRoutine: initialData.bedtimeRoutine ?? "",
          // Infection control
          currentInfection: initialData.currentInfection ?? "",
          antibioticsPrescribed: initialData.antibioticsPrescribed ?? false,
          // Breathing
          prescribedBreathing: initialData.prescribedBreathing ?? "",
          // Mobility
          mobilityIndependent: initialData.mobilityIndependent ?? false,
          assistanceRequired: initialData.assistanceRequired ?? "",
          equipmentRequired: initialData.equipmentRequired ?? "",
          // Nutrition
          weight: initialData.weight ?? "",
          height: initialData.height ?? "",
          iddsiFood: initialData.iddsiFood ?? "",
          iddsiFluid: initialData.iddsiFluid ?? "",
          dietType: initialData.dietType ?? "",
          nutritionalSupplements: initialData.nutritionalSupplements ?? "",
          nutritionalAssistanceRequired:
            initialData.nutritionalAssistanceRequired ?? "",
          chockingRisk: initialData.chockingRisk ?? false,
          additionalComments: initialData.additionalComments ?? "",
          // Continence and hygiene
          continence: initialData.continence ?? "",
          hygiene: initialData.hygiene ?? ""
        }
      : {
          // Default values for new forms
          residentId: residentId as Id<"residents">,
          teamId,
          organizationId,
          userId,
          firstName: resident.firstName ?? "",
          lastName: resident.lastName ?? "",
          dateOfBirth:
            typeof resident.dateOfBirth === "number"
              ? resident.dateOfBirth
              : resident.dateOfBirth
                ? new Date(resident.dateOfBirth).getTime()
                : Date.now(),
          bedroomNumber: resident.roomNumber ?? "",
          admittedFrom: "",
          religion: "",
          telephoneNumber: resident.phoneNumber ?? "",
          gender: undefined,
          NHSNumber: "",
          ethnicity: "",
          // Next of kin
          kinFirstName: firstKin?.name ?? "",
          kinLastName: "",
          kinRelationship: "",
          kinTelephoneNumber: "",
          kinAddress: "",
          kinEmail: "",
          // Emergency contacts
          emergencyContactName: "",
          emergencyContactTelephoneNumber: "",
          emergencyContactRelationship: "",
          emergencyContactPhoneNumber: "",
          // Care manager
          careManagerName: "",
          careManagerTelephoneNumber: "",
          careManagerRelationship: "",
          careManagerPhoneNumber: "",
          careManagerAddress: "",
          careManagerJobRole: "",
          // GP
          GPName: "",
          GPAddress: "",
          GPPhoneNumber: "",
          // Medical information
          allergies: "",
          medicalHistory: "",
          prescribedMedications: "",
          consentCapacityRights: "",
          medication: "",
          // Skin integrity
          skinIntegrityEquipment: "",
          skinIntegrityWounds: "",
          // Sleep
          bedtimeRoutine: "",
          // Infection control
          currentInfection: "",
          antibioticsPrescribed: false,
          // Breathing
          prescribedBreathing: "",
          // Mobility
          mobilityIndependent: false,
          assistanceRequired: "",
          equipmentRequired: "",
          // Nutrition
          weight: "",
          height: "",
          iddsiFood: "",
          iddsiFluid: "",
          dietType: "",
          nutritionalSupplements: "",
          nutritionalAssistanceRequired: "",
          chockingRisk: false,
          additionalComments: "",
          // Continence and hygiene
          continence: "",
          hygiene: ""
        }
  });

  const totalSteps = 9;

  const handleNext = async () => {
    let isValid = false;

    // Close the date popover when moving between steps
    setDatePopoverOpen(false);

    if (step === 1) {
      const fieldsToValidate = [
        "firstName",
        "lastName",
        "dateOfBirth",
        "bedroomNumber",
        "NHSNumber"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      const fieldsToValidate = [
        "kinFirstName",
        "kinLastName",
        "kinRelationship",
        "kinTelephoneNumber",
        "kinAddress",
        "kinEmail"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 3) {
      const fieldsToValidate = [
        "emergencyContactName",
        "emergencyContactTelephoneNumber",
        "emergencyContactRelationship",
        "emergencyContactPhoneNumber"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 4) {
      // Care manager and GP details are all optional
      isValid = true;
    } else if (step === 5) {
      // Medical information is mostly optional
      isValid = true;
    } else if (step === 6) {
      // Care assessments
      isValid = await form.trigger(["antibioticsPrescribed"]);
    } else if (step === 7) {
      // Mobility assessment
      isValid = await form.trigger(["mobilityIndependent"]);
    } else if (step === 8) {
      const fieldsToValidate = [
        "weight",
        "height",
        "iddsiFood",
        "iddsiFluid",
        "dietType",
        "chockingRisk"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 9) {
      // Final step - all optional fields
      isValid = true;
    }

    if (isValid || step === totalSteps) {
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        await handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    // Close the date popover when moving between steps
    setDatePopoverOpen(false);

    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();

        if (isEditMode && initialData) {
          await updateAssessment({
            assessmentId: initialData._id,
            ...formData,
            residentId: residentId as Id<"residents">,
            savedAsDraft: false
          });
          toast.success("Admission assessment updated successfully");
        } else {
          await submitAssessment({
            ...formData,
            residentId: residentId as Id<"residents">,
            savedAsDraft: false
          });
          toast.success("Admission assessment saved successfully");
        }

        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save admission assessment");
      }
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4" key="step-1">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" autoComplete="off" {...field} />
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
                      <Input
                        placeholder="Smith"
                        autoComplete="off"
                        {...field}
                      />
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
                    <Popover
                      open={datePopoverOpen}
                      onOpenChange={setDatePopoverOpen}
                      modal
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
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
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          captionLayout="dropdown"
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date.getTime());
                              setDatePopoverOpen(false);
                            }
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
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
                name="bedroomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Bedroom Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Room 101"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="NHSNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>NHS Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 456 7890"
                        autoComplete="off"
                        {...field}
                      />
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
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telephoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telephone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="07123 456789"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ethnicity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ethnicity</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="White British"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="religion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Religion</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Christian"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="admittedFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admitted From</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Hospital"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4" key="step-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kinFirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Next of Kin First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane" autoComplete="off" {...field} />
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
                    <FormLabel required>Next of Kin Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kinRelationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Relationship</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Daughter"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kinTelephoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Telephone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="07123 456789"
                        autoComplete="off"
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
              name="kinEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Email</FormLabel>
                  <FormControl>
                    <Input
                      className="w-full"
                      type="email"
                      placeholder="jane.doe@example.com"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kinAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main Street, London, SW1A 1AA"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4" key="step-3">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Contact Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Robert Smith"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactRelationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Relationship</FormLabel>
                    <FormControl>
                      <Input placeholder="Son" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactTelephoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Telephone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="07987 654321"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactPhoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Alternative Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="020 1234 5678"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4" key="step-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium mb-3">Care Manager</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="careManagerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Sarah Johnson" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="careManagerJobRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Role</FormLabel>
                        <FormControl>
                          <Input placeholder="Social Worker" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="careManagerTelephoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telephone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="020 7946 0958" {...field} />
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
                        <FormLabel>Alternative Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="07700 900123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="careManagerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Social Services Office, Town Hall, London, EC1A 1AA"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h4 className="text-md font-medium mb-3">GP Information</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="GPName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GP Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. Michael Brown" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="GPPhoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GP Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="020 7946 0123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="GPAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GP Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="City Medical Centre, 45 High Street, London, W1A 2BC"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4" key="step-5">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergies</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="List any known allergies..."
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
                    <FormLabel>Medical History</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe medical history..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prescribedMedications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescribed Medications</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="List current medications..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consentCapacityRights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consent, Capacity & Rights</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe consent and capacity information..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4" key="step-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="skinIntegrityEquipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skin Integrity Equipment</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Pressure relieving mattress"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="skinIntegrityWounds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Existing Wounds</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Stage 2 pressure ulcer on left heel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bedtimeRoutine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedtime Routine</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Prefers to go to bed at 10pm with a warm drink"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentInfection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Infection</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Urinary tract infection"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="antibioticsPrescribed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Antibiotics Prescribed</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prescribedBreathing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescribed Breathing Equipment</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Oxygen therapy 2L/min"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4" key="step-7">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="mobilityIndependent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mobility Independent</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assistanceRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assistance Required</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Requires assistance of 2 people for transfers"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="equipmentRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment Required</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Walking frame" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4" key="step-8">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Weight</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="70kg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Height</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="170cm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iddsiFood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>IDDSI Food Level</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Level 7" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iddsiFluid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>IDDSI Fluid Level</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Level 0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dietType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Diet Type</FormLabel>
                  <FormControl>
                    <Input
                      className="w-full"
                      {...field}
                      placeholder="Regular"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nutritionalSupplements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nutritional Supplements</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Fortisip twice daily" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nutritionalAssistanceRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nutritional Assistance Required</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Requires full assistance with feeding"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="chockingRisk"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Choking Risk Present</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additionalComments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Comments</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Food preferences and dining habits"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-4" key="step-9">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="continence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Continence</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Fully continent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hygiene"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hygiene</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Requires full assistance with bathing"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditMode
            ? "Review Admission Assessment"
            : step === 1
              ? "Admission Assessment"
              : step === 2
                ? "Next of Kin Information"
                : step === 3
                  ? "Emergency Contact Information"
                  : step === 4
                    ? "Care Manager & GP Information"
                    : step === 5
                      ? "Medical Information"
                      : step === 6
                        ? "Care Assessments"
                        : step === 7
                          ? "Mobility Assessment"
                          : step === 8
                            ? "Nutrition Information"
                            : step === 9
                              ? "Personal Care"
                              : "Admission Assessment"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Review and update the admission assessment details"
            : step === 1
              ? "Enter the resident's personal information and demographics"
              : step === 2
                ? "Provide next of kin contact details and relationship information"
                : step === 3
                  ? "Add emergency contact information for the resident"
                  : step === 4
                    ? "Optional care manager and GP contact information"
                    : step === 5
                      ? "Medical history, allergies, and medication information"
                      : step === 6
                        ? "Skin integrity, sleep routines, and infection control"
                        : step === 7
                          ? "Mobility independence and assistance requirements"
                          : step === 8
                            ? "Nutritional needs, diet requirements, and IDDSI levels"
                            : step === 9
                              ? "Continence management and hygiene preferences"
                              : "Complete the admission assessment for the new resident"}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-6"
          autoComplete="off"
        >
          <div className="max-h-[60vh] overflow-y-auto px-1">
            {renderStepContent()}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? onClose : handlePrevious}
              disabled={step === 1 || isLoading}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              type="button"
              onClick={step === totalSteps ? handleSubmit : handleNext}
              disabled={isLoading}
            >
              {isLoading
                ? "Saving..."
                : step === totalSteps
                  ? "Save Assessment"
                  : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
