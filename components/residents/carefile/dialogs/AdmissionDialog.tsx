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
import { CalendarIcon, Loader2 } from "lucide-react";
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

  const form = useForm<z.infer<typeof admissionAssessmentSchema>>({
    resolver: zodResolver(admissionAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId,
        teamId,
        organizationId,
        userId,
        ...(initialData.assessment_data || {}),
        firstName: initialData.assessment_data?.firstName || initialData.firstName || resident.first_name || "",
        lastName: initialData.assessment_data?.lastName || initialData.lastName || resident.last_name || "",
        dateOfBirth: initialData.assessment_data?.dateOfBirth ? new Date(initialData.assessment_data.dateOfBirth).getTime() : (resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now()),
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
        careManagerRelationship: "",
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
        chockingRisk: false,
        additionalComments: "",
        continence: "",
        hygiene: ""
      }
  });

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
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-12">
              <button type="submit" id="care-file-submit-btn" className="hidden" />
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
                  <FormField control={form.control} name="gender" render={({ field }) => <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
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
                    <FormField control={form.control} name="skinIntegrityWounds" render={({ field }) => <FormItem><FormLabel>Skin Integrity & Wounds</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="bedtimeRoutine" render={({ field }) => <FormItem><FormLabel>Sleep & Bedtime Routine</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                    <div className="p-4 border rounded-xl bg-card/10 grid gap-4">
                      <FormField control={form.control} name="currentInfection" render={({ field }) => <FormItem><FormLabel>Current Infection Status</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name="antibioticsPrescribed" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                          <FormLabel className="m-0">Antibiotics currently prescribed?</FormLabel>
                          <FormControl><input type="checkbox" className="h-5 w-5 rounded border-gray-300" checked={field.value} onChange={field.onChange} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="prescribedBreathing" render={({ field }) => <FormItem><FormLabel>Respiratory / Breathing Support</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                  </div>

                  <div className="grid gap-6 p-4 border rounded-xl bg-blue-50/10">
                    <h4 className="font-bold text-sm text-blue-600/80 uppercase tracking-widest">Mobility</h4>
                    <FormField control={form.control} name="mobilityIndependent" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background shadow-sm">
                        <FormLabel className="m-0 font-semibold">Independent Mobility?</FormLabel>
                        <FormControl><input type="checkbox" className="h-5 w-5 rounded border-gray-300" checked={field.value} onChange={field.onChange} /></FormControl>
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
                  <FormField control={form.control} name="chockingRisk" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-red-50/10 shadow-sm sm:col-span-2">
                      <FormLabel className="m-0 font-bold text-red-600">History of Choking / Risk?</FormLabel>
                      <FormControl><input type="checkbox" className="h-6 w-6 rounded border-red-300" checked={field.value} onChange={field.onChange} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Section 8: Continence & Hygiene */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Continence & Personal Hygiene</h3>
                </div>
                <div className="grid gap-6">
                  <FormField control={form.control} name="continence" render={({ field }) => <FormItem><FormLabel>Continence Needs</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="hygiene" render={({ field }) => <FormItem><FormLabel>Personal Hygiene & Grooming</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="additionalComments" render={({ field }) => <FormItem><FormLabel>Additional Overall Comments</FormLabel><FormControl><Textarea placeholder="Any other relevant details..." {...field} /></FormControl><FormMessage /></FormItem>} />
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
          <Button onClick={form.handleSubmit(handleSubmit)} disabled={isLoading} size="lg" className="min-w-[150px]">
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
