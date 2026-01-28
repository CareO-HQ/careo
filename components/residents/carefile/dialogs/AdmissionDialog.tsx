"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Textarea } from "@/components/ui/textarea";
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
import { admissionAssessmentSchema } from "@/schemas/residents/care-file/admissionSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns-tz";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface AdmissionDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName?: string;
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
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: AdmissionDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const { profile } = useProfile();

  const firstKin = resident.emergency_contacts?.find(
    (contact) => contact.is_primary
  );

  const form = useForm<z.infer<typeof admissionAssessmentSchema>>({
    resolver: zodResolver(admissionAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        // Flatten: assessment_data is main source if from Supabase
        residentId,
        teamId,
        organizationId,
        userId,
        ...(initialData.assessment_data || {}),
        // Fallback to top-level if needed or strict initialData dump
        firstName: initialData.assessment_data?.firstName || initialData.firstName || resident.first_name || "",
        lastName: initialData.assessment_data?.lastName || initialData.lastName || resident.last_name || "",
        dateOfBirth: initialData.assessment_data?.dateOfBirth ? new Date(initialData.assessment_data.dateOfBirth).getTime() : (resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now()),
        // ... map other fields minimally as they likely exist in spread assessment_data
        // ensure specific complex fields are handled if they differ
        kinRelationship: initialData.assessment_data?.kinRelationship || initialData.kinRelationship || firstKin?.relationship || "",
      }
      : {
        residentId,
        teamId,
        organizationId,
        userId,
        firstName: resident.first_name ?? "",
        lastName: resident.last_name ?? "",
        dateOfBirth: resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
        bedroomNumber: resident.room_number ?? "",
        admittedFrom: "",
        religion: "",
        telephoneNumber: resident.phone_number ?? "",
        gender: undefined,
        NHSNumber: resident.nhs_health_number || "",
        ethnicity: "",
        // Next of kin
        kinFirstName: firstKin?.name ?? "",
        kinLastName: "",
        kinRelationship: firstKin?.relationship ?? "",
        kinTelephoneNumber: firstKin?.phone_number ?? "",
        kinAddress: "",
        kinEmail: "",
        // Emergency contacts
        emergencyContactName: "",
        emergencyContactTelephoneNumber: "",
        emergencyContactRelationship: "",
        emergencyContactPhoneNumber: "",
        // Care manager
        careManagerName: resident.care_manager_name ?? "",
        careManagerTelephoneNumber: resident.care_manager_phone ?? "",
        careManagerRelationship: "",
        careManagerPhoneNumber: "",
        careManagerAddress: "",
        careManagerJobRole: "",
        // GP
        GPName: resident.gp_name ?? "",
        GPAddress: "",
        GPPhoneNumber: resident.gp_phone ?? "",
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
    setDatePopoverOpen(false);

    if (step === 1) {
      isValid = await form.trigger(["firstName", "lastName", "dateOfBirth", "bedroomNumber", "NHSNumber"]);
    } else if (step === 2) {
      isValid = await form.trigger(["kinFirstName", "kinLastName", "kinRelationship", "kinTelephoneNumber", "kinAddress", "kinEmail"]);
    } else if (step === 3) {
      isValid = await form.trigger(["emergencyContactName", "emergencyContactTelephoneNumber", "emergencyContactRelationship", "emergencyContactPhoneNumber"]);
    } else if (step === 4 || step === 5 || step === 9) {
      isValid = true;
    } else if (step === 6) {
      isValid = await form.trigger(["antibioticsPrescribed"]);
    } else if (step === 7) {
      isValid = await form.trigger(["mobilityIndependent"]);
    } else if (step === 8) {
      isValid = await form.trigger(["weight", "height", "iddsiFood", "iddsiFluid", "dietType", "chockingRisk"]);
    }

    if (isValid || step === totalSteps) {
      if (step < totalSteps) setStep(step + 1);
      else await handleSubmit();
    }
  };

  const handlePrevious = () => {
    setDatePopoverOpen(false);
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();
        const currentUserId = profile?.id;

        if (!currentUserId) throw new Error("User not authenticated");

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          status: 'completed',
          assessment_data: {
            ...formData,
            submittedAt: new Date().toISOString(),
          },
          created_by: currentUserId,
        };

        await submitAssessmentWithVersioning(
          'admission_assessments',
          payload,
          initialData,
          isEditMode
        );

        toast.success(isEditMode ? "Admission assessment updated successfully" : "Admission assessment saved successfully");
        onClose?.();
      } catch (error: any) {
        console.error("Error submitting form:", error);
        toast.error(`Failed to save admission assessment: ${error.message}`);
      }
    });
  };

  // Helper to Render Steps locally to keep file small if we want, 
  // but better to keep full structure for User UX consistency.
  // I will write the full render logic as it was extensive.

  return (
    <div className="max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>
          {step === 1 && "Basic Information"}
          {step === 2 && "Next of Kin"}
          {step === 3 && "Emergency Contacts"}
          {step === 4 && "Professional Contacts"}
          {step === 5 && "Medical Information"}
          {step === 6 && "Care Assessments (1/3)"}
          {step === 7 && "Care Assessments (2/3)"}
          {step === 8 && "Nutrition & Diet"}
          {step === 9 && "Continence & Hygiene"}
        </DialogTitle>
        <DialogDescription>
          Step {step} of {totalSteps}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-1 py-2">
        <Form {...form}>
          <form className="space-y-4">
            {step === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => <FormItem><FormLabel required>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="lastName" render={({ field }) => <FormItem><FormLabel required>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem><FormLabel required>Date of Birth</FormLabel><Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDatePopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} /></PopoverContent></Popover><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bedroomNumber" render={({ field }) => <FormItem><FormLabel required>Bedroom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="NHSNumber" render={({ field }) => <FormItem><FormLabel required>NHS Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="gender" render={({ field }) => <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                <FormField control={form.control} name="telephoneNumber" render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="ethnicity" render={({ field }) => <FormItem><FormLabel>Ethnicity</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="religion" render={({ field }) => <FormItem><FormLabel>Religion</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="admittedFrom" render={({ field }) => <FormItem><FormLabel>Admitted From</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="kinFirstName" render={({ field }) => <FormItem><FormLabel required>NOK First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="kinLastName" render={({ field }) => <FormItem><FormLabel required>NOK Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="kinRelationship" render={({ field }) => <FormItem><FormLabel required>Relationship</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="kinTelephoneNumber" render={({ field }) => <FormItem><FormLabel required>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                <FormField control={form.control} name="kinEmail" render={({ field }) => <FormItem><FormLabel required>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="kinAddress" render={({ field }) => <FormItem><FormLabel required>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              </>
            )}

            {step === 3 && (
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="emergencyContactName" render={({ field }) => <FormItem><FormLabel required>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="emergencyContactRelationship" render={({ field }) => <FormItem><FormLabel required>Relationship</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="emergencyContactTelephoneNumber" render={({ field }) => <FormItem><FormLabel required>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="emergencyContactPhoneNumber" render={({ field }) => <FormItem><FormLabel>Alt. Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h4 className="font-medium">Care Manager</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="careManagerName" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="careManagerJobRole" render={({ field }) => <FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="careManagerTelephoneNumber" render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="careManagerAddress" render={({ field }) => <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                <h4 className="font-medium mt-4">GP</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="GPName" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="GPPhoneNumber" render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="GPAddress" render={({ field }) => <FormItem className="col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                {["allergies", "medicalHistory", "prescribedMedications", "consentCapacityRights", "medication"].map(key => (
                  <FormField key={key} control={form.control} name={key as any} render={({ field }) => <FormItem><FormLabel className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                ))}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <FormField control={form.control} name="skinIntegrityWounds" render={({ field }) => <FormItem><FormLabel>Skin Integrity / Wounds</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="bedtimeRoutine" render={({ field }) => <FormItem><FormLabel>Bedtime Routine</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="currentInfection" render={({ field }) => <FormItem><FormLabel>Current Infection</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="antibioticsPrescribed" render={({ field }) => <FormItem><div className="flex items-center gap-2"><FormControl><input type="checkbox" checked={field.value} onChange={field.onChange} /></FormControl><FormLabel className="m-0">Antibiotics Prescribed?</FormLabel></div><FormMessage /></FormItem>} />
                <FormField control={form.control} name="prescribedBreathing" render={({ field }) => <FormItem><FormLabel>Breathing Support</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                <FormField control={form.control} name="mobilityIndependent" render={({ field }) => <FormItem><div className="flex items-center gap-2"><FormControl><input type="checkbox" checked={field.value} onChange={field.onChange} /></FormControl><FormLabel className="m-0">Independent Mobility?</FormLabel></div><FormMessage /></FormItem>} />
                <FormField control={form.control} name="assistanceRequired" render={({ field }) => <FormItem><FormLabel>Assistance Required</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="equipmentRequired" render={({ field }) => <FormItem><FormLabel>Equipment Required</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            )}

            {step === 8 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="weight" render={({ field }) => <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="height" render={({ field }) => <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="iddsiFood" render={({ field }) => <FormItem><FormLabel>IDDSI Food</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="iddsiFluid" render={({ field }) => <FormItem><FormLabel>IDDSI Fluid</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                <FormField control={form.control} name="dietType" render={({ field }) => <FormItem><FormLabel>Diet Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="nutritionalSupplements" render={({ field }) => <FormItem><FormLabel>Supplements</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="chockingRisk" render={({ field }) => <FormItem><div className="flex items-center gap-2"><FormControl><input type="checkbox" checked={field.value} onChange={field.onChange} /></FormControl><FormLabel className="m-0">Choking Risk?</FormLabel></div><FormMessage /></FormItem>} />
              </div>
            )}

            {step === 9 && (
              <div className="space-y-4">
                <FormField control={form.control} name="continence" render={({ field }) => <FormItem><FormLabel>Continence</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="hygiene" render={({ field }) => <FormItem><FormLabel>Hygiene</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="additionalComments" render={({ field }) => <FormItem><FormLabel>Additional Comments</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            )}

          </form>
        </Form>
      </div>

      <div className="border-t pt-4 mt-auto flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={step === 1 || isLoading}>Back</Button>
        <Button onClick={handleNext} disabled={isLoading}>
          {step === totalSteps ? (isLoading ? "Saving..." : "Submit") : "Next"}
        </Button>
      </div>
    </div>
  );
}
