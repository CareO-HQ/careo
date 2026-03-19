"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
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
import { admissionAssessmentSchema, type AdmissionAssessment } from "@/schemas/residents/care-file/admissionSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns-tz";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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
  isInline?: boolean;
  viewOnly?: boolean;
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
  isEditMode = false,
  isInline = false,
  viewOnly = false
}: AdmissionDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const { profile } = useProfile();

  const firstKin = resident.emergency_contacts?.find(
    (contact) => contact.is_primary
  );

  const baseDefaultValues: AdmissionAssessment = {
    residentId,
    teamId,
    organizationId,
    userId,
    firstName: resident.first_name || "",
    lastName: resident.last_name || "",
    dateOfBirth: resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
    bedroomNumber: resident.room_number || "",
    admittedFrom: "",
    religion: "",
    telephoneNumber: resident.phone_number ?? "",
    gender: undefined,
    NHSNumber: resident.nhs_health_number || "",
    ethnicity: "",
    kinFirstName: firstKin?.name ?? "",
    kinLastName: "",
    kinRelationship: firstKin?.relationship ?? "",
    kinTelephoneNumber: firstKin?.phone_number ?? "",
    kinAddress: "",
    kinEmail: "",
    emergencyContactName: "",
    emergencyContactTelephoneNumber: "",
    emergencyContactRelationship: "",
    emergencyContactPhoneNumber: "",
    careManagerName: resident.care_manager_name ?? "",
    careManagerTelephoneNumber: resident.care_manager_phone ?? "",
    careManagerEmail: "",
    careManagerPhoneNumber: "",
    careManagerAddress: "",
    careManagerJobRole: "",
    GPName: resident.gp_name ?? "",
    GPAddress: "",
    GPPhoneNumber: resident.gp_phone ?? "",
    allergies: "",
    medicalHistory: "",
    prescribedMedications: "",
    consentCapacityRights: "",
    medication: "",
    skinIntegrityEquipment: "",
    skinIntegrityWounds: "",
    bedtimeRoutine: "",
    currentInfection: "",
    antibioticsPrescribed: false,
    prescribedBreathing: "",
    mobilityIndependent: false,
    assistanceRequired: "",
    equipmentRequired: "",
    weight: "",
    height: "",
    iddsiFood: "",
    iddsiFluid: "",
    dietType: "",
    nutritionalSupplements: "",
    nutritionalAssistanceRequired: "",
    chokingRisk: false,
    additionalComments: "",
    continenceIndependent: false,
    continence: "",
    hygieneIndependent: false,
    hygiene: "",
    sleepPsychologicalIndependent: false,
    psychologicalNeeds: "",
    breathingIndependent: false,
    alteredConsciousness: "",
    communicationIndependent: false,
    communication: "",
    behaviourIndependent: false,
    behaviour: "",
    cognitionIndependent: false,
    cognition: "",

    // Assessment Completion
    completedBy: profile?.name || "",
    jobRole: profile?.role || "",
    signature: "",
    assessmentDate: Date.now()
  };

  const defaultValues: AdmissionAssessment = initialData
    ? {
        ...baseDefaultValues,
        ...(initialData.assessment_data || {}),
        residentId,
        teamId,
        organizationId,
        userId,
        firstName: initialData.assessment_data?.firstName || initialData.firstName || resident.first_name || "",
        lastName: initialData.assessment_data?.lastName || initialData.lastName || resident.last_name || "",
        dateOfBirth: initialData.assessment_data?.dateOfBirth ? new Date(initialData.assessment_data.dateOfBirth).getTime() : (resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now()),
        bedroomNumber: initialData.assessment_data?.bedroomNumber || resident.room_number || "",
        kinRelationship: initialData.assessment_data?.kinRelationship || initialData.kinRelationship || firstKin?.relationship || "",
        careManagerEmail: initialData.assessment_data?.careManagerEmail || "",
        
        // Ensure no undefined booleans from spread
        antibioticsPrescribed: initialData.assessment_data?.antibioticsPrescribed ?? false,
        mobilityIndependent: initialData.assessment_data?.mobilityIndependent ?? false,
        chokingRisk: initialData.assessment_data?.chokingRisk ?? false,
        continenceIndependent: initialData.assessment_data?.continenceIndependent ?? false,
        hygieneIndependent: initialData.assessment_data?.hygieneIndependent ?? false,
        sleepPsychologicalIndependent: initialData.assessment_data?.sleepPsychologicalIndependent ?? false,
        breathingIndependent: initialData.assessment_data?.breathingIndependent ?? false,
        communicationIndependent: initialData.assessment_data?.communicationIndependent ?? false,
        behaviourIndependent: initialData.assessment_data?.behaviourIndependent ?? false,
        cognitionIndependent: initialData.assessment_data?.cognitionIndependent ?? false,

        completedBy: initialData.assessmentBy || initialData.completedBy || initialData.assessment_data?.completedBy || profile?.name || "",
        jobRole: initialData.jobRole || initialData.assessment_data?.jobRole || profile?.role || "",
        signature: initialData.signature || initialData.assessment_data?.signature || "",
        assessmentDate: initialData.assessmentDate || initialData.assessment_data?.assessmentDate || Date.now(),
      }
    : baseDefaultValues;

  const form = useForm<AdmissionAssessment>({
    resolver: zodResolver(admissionAssessmentSchema),
    mode: "onChange",
    defaultValues
  });

  // Autofill completion details when profile loads
  useEffect(() => {
    if (profile) {
      if (!form.getValues("completedBy")) {
        form.setValue("completedBy", profile.name || "");
      }
      if (!form.getValues("jobRole")) {
        form.setValue("jobRole", profile.role || "");
      }
    }
  }, [profile, form]);

  const onSubmit = async (formData: AdmissionAssessment) => {
    startTransition(async () => {
      try {
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

  return (
    <div className="flex flex-col space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Admission Assessment</DialogTitle>
          <DialogDescription>
            Record essential information for resident admission.
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
                  console.error("Admission form errors:", errors);
                  toast.error("Please fill in all required fields correctly.");
                })}
              />
              {/* Section 1: Basic Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="firstName" render={({ field }) => <FormItem><FormLabel required>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="lastName" render={({ field }) => <FormItem><FormLabel required>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem><FormLabel required>Date of Birth</FormLabel><Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={(date) => { if (date) { field.onChange(date.getTime()); setDatePopoverOpen(false); } }} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} /></PopoverContent></Popover><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bedroomNumber" render={({ field }) => <FormItem><FormLabel required>Bedroom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="NHSNumber" render={({ field }) => <FormItem><FormLabel required>NHS Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="gender" render={({ field }) => <FormItem><FormLabel>Gender</FormLabel>                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
<FormMessage /></FormItem>} />
                  <FormField control={form.control} name="telephoneNumber" render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="ethnicity" render={({ field }) => <FormItem><FormLabel>Ethnicity</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="religion" render={({ field }) => <FormItem><FormLabel>Religion</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="admittedFrom" render={({ field }) => <FormItem><FormLabel>Admitted From</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </div>

              {/* Section 2: Next of Kin */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Next of Kin</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="kinFirstName" render={({ field }) => <FormItem><FormLabel required>NOK First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="kinLastName" render={({ field }) => <FormItem><FormLabel required>NOK Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="kinRelationship" render={({ field }) => <FormItem><FormLabel required>Relationship</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="kinTelephoneNumber" render={({ field }) => <FormItem><FormLabel required>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="kinEmail" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel required>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="kinAddress" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel required>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </div>

              {/* Section 3: Emergency Contacts */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Emergency Contacts</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="emergencyContactName" render={({ field }) => <FormItem><FormLabel required>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="emergencyContactRelationship" render={({ field }) => <FormItem><FormLabel required>Relationship</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="emergencyContactTelephoneNumber" render={({ field }) => <FormItem><FormLabel required>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="emergencyContactPhoneNumber" render={({ field }) => <FormItem><FormLabel>Alt. Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </div>

              {/* Section 4: Professional Contacts */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Professional Contacts</h3>
                </div>
                <div className="space-y-8">
                  <div className="p-4 border rounded-xl bg-card/30 space-y-6">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Care Manager</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="careManagerName" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="careManagerJobRole" render={({ field }) => <FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="careManagerTelephoneNumber" render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="careManagerPhoneNumber" render={({ field }) => <FormItem><FormLabel>Alt. Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="careManagerEmail" render={({ field }) => <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="careManagerAddress" render={({ field }) => <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                    </div>
                  </div>
                  <div className="p-4 border rounded-xl bg-card/30 space-y-6">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">GP Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="GPName" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="GPPhoneNumber" render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="GPAddress" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Medical Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Medical Information</h3>
                </div>
                <div className="grid gap-6">
                  <FormField control={form.control} name="allergies" render={({ field }) => <FormItem><FormLabel>Allergies</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="medicalHistory" render={({ field }) => <FormItem><FormLabel>Full Medical History</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="prescribedMedications" render={({ field }) => <FormItem><FormLabel>Prescribed Medications</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="consentCapacityRights" render={({ field }) => <FormItem><FormLabel>Consent & Capacity</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </div>

              {/* Section 6: Care Assessments */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Integrated Care Assessments</h3>
                </div>
                <div className="grid gap-8">
                  <div className="grid gap-6">
                    <FormField control={form.control} name="skinIntegrityEquipment" render={({ field }) => <FormItem><FormLabel>Skin Integrity Equipment Required</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="skinIntegrityWounds" render={({ field }) => <FormItem><FormLabel>Are there any wounds present?</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                    <div className="p-4 border rounded-xl bg-card/10 grid gap-4">
                      <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Sleep, Psychological & Emotional Needs</h4>
                      <FormField control={form.control} name="sleepPsychologicalIndependent" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                          <FormLabel className="m-0 font-semibold text-xs">No impact on health/wellbeing (Care plan not required)?</FormLabel>
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="bedtimeRoutine" render={({ field }) => <FormItem><FormLabel>Normal Bedtime Routine</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="psychologicalNeeds" render={({ field }) => <FormItem><FormLabel>Psychological & Emotional Needs</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                    </div>
                    <div className="p-4 border rounded-xl bg-card/10 grid gap-4">
                      <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Infection Control</h4>
                      <FormField control={form.control} name="currentInfection" render={({ field }) => <FormItem><FormLabel>Does the resident have a current infection?</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="antibioticsPrescribed" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                          <FormLabel className="m-0 font-semibold text-xs">Antibiotics currently prescribed?</FormLabel>
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <p className="text-xs text-muted-foreground italic">Note: If required and not completed during Pre-admission, please complete the Infection Prevention and Control Pre-Admission/Admission Risk Assessment</p>
                    </div>

                    <div className="p-4 border rounded-xl bg-card/10 grid gap-4">
                      <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Breathing</h4>
                      <FormField control={form.control} name="breathingIndependent" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                          <FormLabel className="m-0 font-semibold text-xs">Breathing normally (Care plan not required)?</FormLabel>
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="prescribedBreathing" render={({ field }) => <FormItem><FormLabel>Details on prescribed inhalers, nebuliser, oxygen and possible smoking risk</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                    </div>
                  </div>

                  <div className="grid gap-6 p-4 border rounded-xl bg-blue-50/10">
                    <h4 className="font-bold text-sm text-blue-600/80 uppercase tracking-widest">Mobility</h4>
                    <FormField control={form.control} name="mobilityIndependent" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                        <FormLabel className="m-0 font-semibold">Independent Mobility?</FormLabel>
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="assistanceRequired" render={({ field }) => <FormItem><FormLabel>Assistance Required</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="equipmentRequired" render={({ field }) => <FormItem><FormLabel>Mobility Equipment Required</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                  </div>
                </div>
              </div>

              {/* Section 7: Nutrition & Diet */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Nutrition, Diet & Hydration</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="weight" render={({ field }) => <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="height" render={({ field }) => <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="iddsiFood" render={({ field }) => <FormItem><FormLabel>IDDSI Food Level</FormLabel><FormControl><Input placeholder="e.g. Level 4" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="iddsiFluid" render={({ field }) => <FormItem><FormLabel>IDDSI Fluid Level</FormLabel><FormControl><Input placeholder="e.g. Level 2" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="dietType" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel>Diet Type / Preferences</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="nutritionalSupplements" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel>Nutritional Supplements</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="nutritionalAssistanceRequired" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel>Nutritional Assistance Required</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="chokingRisk" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-red-50/10 shadow-sm sm:col-span-2">
                      <FormLabel className="m-0 font-bold text-red-600">History of Choking / Risk?</FormLabel>
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

                  <div className="grid gap-6 p-4 border rounded-xl bg-[#f0f9ff]/30">
                    <h4 className="font-bold text-sm text-blue-600/80 uppercase tracking-widest">Continence & Personal Hygiene</h4>
                    <div className="grid gap-4">
                      <FormField control={form.control} name="continenceIndependent" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                          <FormLabel className="m-0 font-semibold text-xs text-blue-600">Continence: Independent (Care plan not required)?</FormLabel>
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="continence" render={({ field }) => <FormItem><FormLabel>Continence Needs</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                    </div>
                    <div className="grid gap-4">
                      <FormField control={form.control} name="hygieneIndependent" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                          <FormLabel className="m-0 font-semibold text-xs text-blue-600">Hygiene & Dressing: Independent (Care plan not required)?</FormLabel>
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="hygiene" render={({ field }) => <FormItem><FormLabel>Personal Hygiene & Grooming</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                    </div>
                  </div>

                  {/* Section 9: Consciousness, Communication, Behaviour & Cognition */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <div className="h-6 w-1 bg-primary rounded-full" />
                      <h3 className="text-lg font-semibold">Cognitive & Behavioural Assessment</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 border rounded-xl bg-card/10 grid gap-4">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Altered state of Consciousness</h4>
                        <FormField control={form.control} name="alteredConsciousness" render={({ field }) => <FormItem><FormLabel className="text-xs">Note: Epilepsy, Diabetes, TIA, etc</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                      </div>
                      <div className="p-4 border rounded-xl bg-card/10 grid gap-4">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Communication</h4>
                        <FormField control={form.control} name="communicationIndependent" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                            <FormLabel className="m-0 font-semibold text-xs">Independent (Care plan not required)?</FormLabel>
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="communication" render={({ field }) => <FormItem><FormLabel>Communication Needs</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                      </div>
                      <div className="p-4 border rounded-xl bg-card/10 grid gap-4">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Behaviour</h4>
                        <FormField control={form.control} name="behaviourIndependent" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                            <FormLabel className="m-0 font-semibold text-xs">No challenging behaviour (Care plan not required)?</FormLabel>
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="behaviour" render={({ field }) => <FormItem><FormLabel>Behavioural Needs</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                      </div>
                      <div className="p-4 border rounded-xl bg-card/10 grid gap-4">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Cognition</h4>
                        <FormField control={form.control} name="cognitionIndependent" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                            <FormLabel className="m-0 font-semibold text-xs">Fully orientated (Care plan not required)?</FormLabel>
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="cognition" render={({ field }) => <FormItem><FormLabel>Cognitive Needs</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                      </div>
                    </div>
                  </div>
                  <FormField control={form.control} name="additionalComments" render={({ field }) => <FormItem><FormLabel>Additional Overall Comments</FormLabel><FormControl><Textarea placeholder="Any other relevant details..." {...field} /></FormControl><FormMessage /></FormItem>} />

                  {/* Section 10: Assessment Completion */}
                  <div className="space-y-6 pt-6 border-t">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <div className="h-6 w-1 bg-green-500 rounded-full" />
                      <h3 className="text-lg font-semibold">Assessment Completion</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="completedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name of person completing form</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="jobRole"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Role</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="assessmentDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date of Completion</FormLabel>
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
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => field.onChange(date?.getTime())}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="signature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Signature (Print Name)</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
              "Save Admission"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
