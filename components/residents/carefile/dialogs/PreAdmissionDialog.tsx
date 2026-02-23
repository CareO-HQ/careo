"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogDescription,
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface PreAdmissionDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  careHomeName: string;
  resident: Resident;
  userId: string;
  userName: string;
  userRole?: string;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function PreAdmissionDialog({
  teamId,
  residentId,
  organizationId,
  careHomeName,
  resident,
  userId,
  userName,
  userRole,
  onClose,
  initialData,
  isEditMode = false
}: PreAdmissionDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [datePopovers, setDatePopovers] = useState<Record<string, boolean>>({});

  const firstKin = resident.emergency_contacts?.find((contact) => contact.is_primary);
  const kinNameParts = (firstKin?.name || "").trim().split(/\s+/);
  const kinFirstName = kinNameParts[0] || "";
  const kinLastName = kinNameParts.slice(1).join(" ") || "";

  const form = useForm<z.infer<typeof preAdmissionSchema>>({
    resolver: zodResolver(preAdmissionSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId,
        teamId,
        organizationId,
        savedAsDraft: initialData.saved_as_draft || false,
        consentAcceptedAt: initialData.consent_accepted_at ? new Date(initialData.consent_accepted_at).getTime() : 0,
        careHomeName: initialData.care_home_name || initialData.careHomeName || careHomeName,
        nhsHealthCareNumber: initialData.nhs_number || initialData.nhsHealthCareNumber || resident.nhs_health_number || "",
        ...(initialData.assessment_data || {}),
        userName: initialData.assessment_data?.userName || initialData.userName || userName,
        jobRole: initialData.assessment_data?.jobRole || initialData.jobRole || userRole || "",
        date: initialData.assessment_data?.date || initialData.date || undefined,
        firstName: initialData.assessment_data?.firstName || initialData.firstName || resident.first_name || "",
        lastName: initialData.assessment_data?.lastName || initialData.lastName || resident.last_name || "",
        dateOfBirth: initialData.assessment_data?.dateOfBirth || initialData.dateOfBirth || resident.date_of_birth || "",
      }
      : {
        residentId,
        teamId,
        organizationId,
        savedAsDraft: false,
        consentAcceptedAt: 0,
        careHomeName,
        nhsHealthCareNumber: resident.nhs_health_number ?? "",
        userName: userName,
        jobRole: userRole || "",
        date: undefined,
        firstName: resident.first_name ?? "",
        lastName: resident.last_name ?? "",
        address: "",
        phoneNumber: resident.phone_number ?? "",
        ethnicity: "",
        gender: undefined,
        religion: "",
        dateOfBirth: resident.date_of_birth ?? "",
        kinFirstName: kinFirstName,
        kinLastName: kinLastName,
        kinRelationship: firstKin?.relationship ?? "",
        kinPhoneNumber: firstKin?.phone_number ?? "",
        careManagerName: resident.care_manager_name ?? "",
        careManagerPhoneNumber: resident.care_manager_phone ?? "",
        districtNurseName: "",
        districtNursePhoneNumber: "",
        generalPractitionerName: resident.gp_name ?? "",
        generalPractitionerPhoneNumber: resident.gp_phone ?? "",
        providerHealthcareInfoName: "",
        providerHealthcareInfoDesignation: "",
        allergies: "",
        medicalHistory: "",
        medicationPrescribed: "",
        consentCapacityRights: "",
        medication: "",
        mobility: "",
        nutrition: "",
        continence: "",
        hygieneDressing: "",
        skin: "",
        cognition: "",
        infection: "",
        breathing: "",
        alteredStateOfConsciousness: "",
        dnacpr: undefined,
        advancedDecision: undefined,
        capacity: undefined,
        advancedCarePlan: undefined,
        comments: "",
        roomPreferences: "",
        admissionContact: "",
        foodPreferences: "",
        preferedName: "",
        familyConcerns: "",
        otherHealthCareProfessional: "",
        equipment: "",
        attendFinances: undefined,
        additionalConsiderations: "",
        outcome: "",
        plannedAdmissionDate: undefined
      }
  });

  const onSubmit = async (values: z.infer<typeof preAdmissionSchema>) => {
    startTransition(async () => {
      try {
        if (!userId) throw new Error("User not authenticated");
        if (!values.consentAcceptedAt) {
          toast.error("Consent must be signed to submit.");
          return;
        }

        const {
          careHomeName,
          nhsHealthCareNumber,
          consentAcceptedAt,
          savedAsDraft,
          residentId: _rid,
          teamId: _tid,
          organizationId: _oid,
          ...assessmentDataRest
        } = values;

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          care_home_name: careHomeName,
          nhs_number: nhsHealthCareNumber,
          consent_accepted_at: consentAcceptedAt ? new Date(consentAcceptedAt).toISOString() : null,
          saved_as_draft: savedAsDraft,
          assessment_data: assessmentDataRest,
          created_by: userId,
        };

        await submitAssessmentWithVersioning(
          'pre_admission_care_files',
          payload,
          initialData,
          isEditMode
        );

        toast.success(isEditMode ? "Pre-admission updated successfully" : "Pre-admission submitted successfully");
        onClose?.();
      } catch (error: any) {
        console.error("Error submitting form:", error);
        toast.error(error.message || "Failed to submit form");
      }
    });
  };

  const setPopover = (key: string, open: boolean) => setDatePopovers(prev => ({ ...prev, [key]: open }));

  const DateField = ({ name, label, required = false }: { name: "date" | "plannedAdmissionDate" | "consentAcceptedAt", label: string, required?: boolean }) => (
    <FormField control={form.control} name={name} render={({ field }) => {
      const value = field.value as number | undefined;
      return (
        <FormItem className="flex flex-col">
          <FormLabel required={required}>{label}</FormLabel>
          <Popover open={datePopovers[name]} onOpenChange={o => setPopover(name, o)} modal>
            <PopoverTrigger asChild>
              <FormControl>
                <Button variant="outline" className={cn("pl-3 text-left font-normal", !value && "text-muted-foreground")}>
                  {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={value ? new Date(value) : undefined} captionLayout="dropdown" onSelect={d => { field.onChange(d?.getTime()); setPopover(name, false); }} disabled={d => d > new Date() || d < new Date("1900-01-01")} initialFocus />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      );
    }} />
  );

  return (
    <div className="flex flex-col space-y-8">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">Pre-Admission Assessment</DialogTitle>
        <DialogDescription>
          Record pre-admission details and suitability for the resident.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-12 pb-20">
        <Form {...form}>
          <form className="space-y-12">

            {/* Section 1: Consent */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Consent</h3>
              </div>
              <FormField control={form.control} name="consentAcceptedAt" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-xl border p-6 bg-card">
                  <FormControl>
                    <Checkbox checked={!!field.value} onCheckedChange={(checked) => field.onChange(checked ? Date.now() : 0)} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium leading-none cursor-pointer">
                      The person being assessed agrees to the assessment being completed
                    </FormLabel>
                    <FormDescription>
                      Consent must be obtained before storing sensitive information.
                    </FormDescription>
                  </div>
                </FormItem>
              )} />
            </div>

            {/* Section 2: Header Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Administrative Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="careHomeName" render={({ field }) => (<FormItem><FormLabel>Care Home Name</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="nhsHealthCareNumber" render={({ field }) => (<FormItem><FormLabel>NHS Number</FormLabel><FormControl><Input {...field} placeholder="NHS Number" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="userName" render={({ field }) => (<FormItem><FormLabel>Assessing Worker</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="jobRole" render={({ field }) => (<FormItem><FormLabel>Job Role</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <DateField name="date" label="Assessment Date" required />
              </div>
            </div>

            {/* Section 3: Resident Basic Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Resident Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Current Address</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="ethnicity" render={({ field }) => (<FormItem><FormLabel>Ethnicity</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="religion" render={({ field }) => (<FormItem><FormLabel>Religion</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </div>

            {/* Section 4: Next of Kin */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Next of Kin</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="kinFirstName" render={({ field }) => <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="kinLastName" render={({ field }) => <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="kinRelationship" render={({ field }) => <FormItem><FormLabel>Relationship</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="kinPhoneNumber" render={({ field }) => <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            </div>

            {/* Section 5: Professional Contacts */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Professional Contacts</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                {["careManager", "districtNurse", "generalPractitioner"].map(role => (
                  <div key={role} className="space-y-4 p-4 rounded-xl border bg-muted/10">
                    <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">{role.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    <FormField control={form.control} name={`${role}Name` as any} render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name={`${role}PhoneNumber` as any} render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>} />
                  </div>
                ))}
                <div className="space-y-4 p-4 rounded-xl border bg-muted/10">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Provider Info</h4>
                  <FormField control={form.control} name="providerHealthcareInfoName" render={({ field }) => <FormItem><FormLabel>Provider Name</FormLabel><FormControl><Input className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="providerHealthcareInfoDesignation" render={({ field }) => <FormItem><FormLabel>Designation</FormLabel><FormControl><Input className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </div>
            </div>

            {/* Section 6: Medical History */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Medical Assessment</h3>
              </div>
              <div className="space-y-6">
                <FormField control={form.control} name="allergies" render={({ field }) => <FormItem><FormLabel>Known Allergies</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="medicalHistory" render={({ field }) => <FormItem><FormLabel>Medical History & Diagnoses</FormLabel><FormControl><Textarea className="min-h-[120px]" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="medicationPrescribed" render={({ field }) => <FormItem><FormLabel>Medications Prescribed</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            </div>

            {/* Section 7: Detailed Needs (Grouped) */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Activities of Daily Living</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  "consentCapacityRights", "medication", "mobility", "nutrition",
                  "continence", "hygieneDressing", "skin", "cognition",
                  "infection", "breathing", "alteredStateOfConsciousness"
                ].map(key => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={key as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="capitalize font-bold">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-[100px]"
                            placeholder={`Details regarding ${key}...`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Section 8: Legal & Palliative */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Legal & End of Life</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["dnacpr", "advancedDecision", "capacity", "advancedCarePlan"].map(key => (
                  <FormField key={key} control={form.control} name={key as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === 'yes')} value={field.value !== undefined ? (field.value ? 'yes' : 'no') : undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                  />
                ))}
                <FormField control={form.control} name="comments" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Palliative Care Comments</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            </div>

            {/* Section 9: Preferences & Concerns */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Resident Preferences</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {["roomPreferences", "admissionContact", "foodPreferences", "preferedName", "familyConcerns"].map(key => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={key as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[80px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Section 10: Financial & Additional */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Financial & Final Details</h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <FormField control={form.control} name="attendFinances" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                    <FormLabel className="text-base">Does anyone attend to finances?</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === 'yes')} value={field.value !== undefined ? (field.value ? 'yes' : 'no') : undefined}>
                      <FormControl><SelectTrigger className="w-32"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="additionalConsiderations" render={({ field }) => <FormItem><FormLabel>Additional Considerations</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-xl bg-primary/5">
                  <FormField control={form.control} name="outcome" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel className="text-lg font-bold">Assessment Outcome</FormLabel><FormControl><Textarea className="min-h-[100px] bg-background" placeholder="e.g. Suitability, agreed care package..." {...field} /></FormControl><FormMessage /></FormItem>} />
                  <DateField name="plannedAdmissionDate" label="Planned Admission Date" />
                </div>
              </div>
            </div>

          </form>
        </Form>
      </div>

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
            isEditMode ? "Save Changes" : "Submit Assessment"
          )}
        </Button>
      </div>
    </div>
  );
}
