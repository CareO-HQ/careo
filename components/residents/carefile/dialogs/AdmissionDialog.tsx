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

  const submitAssessment = useMutation(
    api.careFiles.admission.submitAdmissionAssessment
  );
  const updateAssessment = useMutation(
    api.careFiles.admission.updateAdmissionAssessment
  );

  const firstKin = resident.emergencyContacts?.find(
    (contact) => contact.isPrimary
  );

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
            initialData.dateOfBirth ?? resident.dateOfBirth ?? Date.now(),
          bedroomNumber: initialData.bedroomNumber ?? resident.roomNumber ?? "",
          admittedFrom: initialData.admittedFrom ?? "1",
          religion: initialData.religion ?? "1",
          telephoneNumber:
            initialData.telephoneNumber ?? resident.phoneNumber ?? "",
          gender: initialData.gender ?? undefined,
          NHSNumber: initialData.NHSNumber ?? "1",
          ethnicity: initialData.ethnicity ?? "1",
          // Next of kin
          kinFirstName: initialData.kinFirstName ?? firstKin?.name ?? "",
          kinLastName: initialData.kinLastName ?? "1",
          kinRelationship:
            initialData.kinRelationship ?? firstKin?.relationship ?? "",
          kinTelephoneNumber:
            initialData.kinTelephoneNumber ?? firstKin?.phoneNumber ?? "",
          kinAddress: initialData.kinAddress ?? "1",
          kinEmail: initialData.kinEmail ?? "example@example.com",
          // Emergency contacts
          emergencyContactName: initialData.emergencyContactName ?? "1",
          emergencyContactTelephoneNumber:
            initialData.emergencyContactTelephoneNumber ?? "1",
          emergencyContactRelationship:
            initialData.emergencyContactRelationship ?? "1",
          emergencyContactPhoneNumber:
            initialData.emergencyContactPhoneNumber ?? "1",
          // Care manager
          careManagerName: initialData.careManagerName ?? "1",
          careManagerTelephoneNumber:
            initialData.careManagerTelephoneNumber ?? "1",
          careManagerRelationship: initialData.careManagerRelationship ?? "1",
          careManagerPhoneNumber: initialData.careManagerPhoneNumber ?? "1",
          careManagerAddress: initialData.careManagerAddress ?? "1",
          careManagerJobRole: initialData.careManagerJobRole ?? "1",
          // GP
          GPName: initialData.GPName ?? "1",
          GPAddress: initialData.GPAddress ?? "1",
          GPPhoneNumber: initialData.GPPhoneNumber ?? "1",
          // Medical information
          allergies: initialData.allergies ?? "1",
          medicalHistory: initialData.medicalHistory ?? "1",
          prescribedMedications: initialData.prescribedMedications ?? "1",
          consentCapacityRights: initialData.consentCapacityRights ?? "1",
          medication: initialData.medication ?? "1",
          // Skin integrity
          skinIntegrityEquipment: initialData.skinIntegrityEquipment ?? "1",
          skinIntegrityWounds: initialData.skinIntegrityWounds ?? "1",
          // Sleep
          bedtimeRoutine: initialData.bedtimeRoutine ?? "1",
          // Infection control
          currentInfection: initialData.currentInfection ?? "1",
          antibioticsPrescribed: initialData.antibioticsPrescribed ?? false,
          // Breathing
          prescribedBreathing: initialData.prescribedBreathing ?? "1",
          // Mobility
          mobilityIndependent: initialData.mobilityIndependent ?? false,
          assistanceRequired: initialData.assistanceRequired ?? "1",
          equipmentRequired: initialData.equipmentRequired ?? "1",
          // Nutrition
          weight: initialData.weight ?? "1",
          height: initialData.height ?? "1",
          iddsiFood: initialData.iddsiFood ?? "1",
          iddsiFluid: initialData.iddsiFluid ?? "1",
          dietType: initialData.dietType ?? "1",
          nutritionalSupplements: initialData.nutritionalSupplements ?? "1",
          nutritionalAssistanceRequired:
            initialData.nutritionalAssistanceRequired ?? "1",
          chockingRisk: initialData.chockingRisk ?? false,
          additionalComments: initialData.additionalComments ?? "1",
          // Continence and hygiene
          continence: initialData.continence ?? "1",
          hygiene: initialData.hygiene ?? "1"
        }
      : {
          // Default values for new forms
          residentId: residentId as Id<"residents">,
          teamId,
          organizationId,
          userId,
          firstName: resident.firstName ?? "",
          lastName: resident.lastName ?? "",
          dateOfBirth: resident.dateOfBirth ?? Date.now(),
          bedroomNumber: resident.roomNumber ?? "",
          admittedFrom: "1",
          religion: "1",
          telephoneNumber: resident.phoneNumber ?? "",
          gender: undefined,
          NHSNumber: "1",
          ethnicity: "1",
          // Next of kin
          kinFirstName: firstKin?.name ?? "",
          kinLastName: "1",
          kinRelationship: firstKin?.relationship ?? "",
          kinTelephoneNumber: firstKin?.phoneNumber ?? "",
          kinAddress: "1",
          kinEmail: "example@example.com",
          // Emergency contacts
          emergencyContactName: "1",
          emergencyContactTelephoneNumber: "1",
          emergencyContactRelationship: "1",
          emergencyContactPhoneNumber: "1",
          // Care manager
          careManagerName: "1",
          careManagerTelephoneNumber: "1",
          careManagerRelationship: "1",
          careManagerPhoneNumber: "1",
          careManagerAddress: "1",
          careManagerJobRole: "1",
          // GP
          GPName: "1",
          GPAddress: "1",
          GPPhoneNumber: "1",
          // Medical information
          allergies: "1",
          medicalHistory: "1",
          prescribedMedications: "1",
          consentCapacityRights: "1",
          medication: "1",
          // Skin integrity
          skinIntegrityEquipment: "1",
          skinIntegrityWounds: "1",
          // Sleep
          bedtimeRoutine: "1",
          // Infection control
          currentInfection: "1",
          antibioticsPrescribed: false,
          // Breathing
          prescribedBreathing: "1",
          // Mobility
          mobilityIndependent: false,
          assistanceRequired: "1",
          equipmentRequired: "1",
          // Nutrition
          weight: "1",
          height: "1",
          iddsiFood: "1",
          iddsiFluid: "1",
          dietType: "1",
          nutritionalSupplements: "1",
          nutritionalAssistanceRequired: "1",
          chockingRisk: false,
          additionalComments: "1",
          // Continence and hygiene
          continence: "1",
          hygiene: "1"
        }
  });

  const totalSteps = 9;

  const handleNext = async () => {
    let isValid = false;

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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                          onSelect={(date) => field.onChange(date?.getTime())}
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input {...field} />
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kinFirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                    <Input className="w-full" type="email" {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Contact Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input {...field} />
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
          <div className="space-y-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium mb-3">
                  Care Manager (Optional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="careManagerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h4 className="text-md font-medium mb-3">
                  GP Information (Optional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="GPName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GP Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
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
                        <Textarea {...field} />
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
          <div className="space-y-4">
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
          <div className="space-y-4">
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
                        placeholder="Describe any equipment needed for skin integrity..."
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
                        placeholder="Describe any existing wounds..."
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
                        placeholder="Describe preferred bedtime routine..."
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
                        placeholder="Describe any current infections..."
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
                        placeholder="Describe any breathing equipment..."
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
          <div className="space-y-4">
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
                        placeholder="Describe any assistance required for mobility..."
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
                      <Textarea
                        {...field}
                        placeholder="Describe any mobility equipment required..."
                      />
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Weight</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 70kg" />
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
                      <Input {...field} placeholder="e.g., 170cm" />
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
                      <Input {...field} placeholder="e.g., Level 7" />
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
                      <Input {...field} placeholder="e.g., Level 0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dietType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Diet Type</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Regular, Diabetic, Vegetarian"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nutritionalSupplements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nutritional Supplements</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="List any nutritional supplements..."
                      />
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
                        placeholder="Describe any assistance needed with eating..."
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
                        placeholder="Any additional nutritional information..."
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
          <div className="space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="continence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Continence</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe continence status and any requirements..."
                      />
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
                        placeholder="Describe hygiene preferences and requirements..."
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
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
