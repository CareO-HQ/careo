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
import { InfectionPreventionAssessmentSchema } from "@/schemas/residents/care-file/infectionPrevention";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface InfectionPreventionDialogProps {
  teamId: string;
  organizationId: string;
  resident: Resident;
  userName: string;
  userId: string;
  onClose?: (assessmentId?: string) => void;
  initialData?: any;
  isEditMode?: boolean;
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function InfectionPreventionDialog({
  resident,
  teamId,
  organizationId,
  userName,
  userId,
  onClose,
  initialData,
  isEditMode = false,
  isInline = false,
  viewOnly = false
}: InfectionPreventionDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [datePopovers, setDatePopovers] = useState<Record<string, boolean>>({});

  const form = useForm<z.infer<typeof InfectionPreventionAssessmentSchema>>({
    resolver: zodResolver(InfectionPreventionAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId: resident.id,
        organizationId: organizationId,
        teamId: teamId,
        name: initialData.name || initialData.symptoms?.details?.name || `${resident.first_name} ${resident.last_name}`,
        dateOfBirth: initialData.date_of_birth || initialData.symptoms?.details?.dateOfBirth || (resident.date_of_birth ? new Date(resident.date_of_birth).toISOString().split("T")[0] : ""),
        homeAddress: initialData.symptoms?.details?.homeAddress || "",
        assessmentType: initialData.assessment_type || "Pre-admission",
        informationProvidedBy: initialData.symptoms?.details?.informationProvidedBy || "",
        admittedFrom: initialData.exposure_history?.admittedFrom || "",
        consultantGP: initialData.symptoms?.details?.consultantGP || resident.gp_name || resident.gpName || "",
        reasonForAdmission: initialData.exposure_history?.reasonForAdmission || "",
        dateOfAdmission: initialData.exposure_history?.dateOfAdmission || undefined,

        newContinuousCough: initialData.symptoms?.respiratory?.newContinuousCough ?? false,
        worseningCough: initialData.symptoms?.respiratory?.worseningCough ?? false,
        temperatureHigh: initialData.symptoms?.respiratory?.temperatureHigh ?? false,
        otherRespiratorySymptoms: initialData.symptoms?.respiratory?.otherRespiratorySymptoms || "",
        testedForCovid19: initialData.symptoms?.respiratory?.testedForCovid19 ?? false,
        testedForInfluenzaA: initialData.symptoms?.respiratory?.testedForInfluenzaA ?? false,
        testedForInfluenzaB: initialData.symptoms?.respiratory?.testedForInfluenzaB ?? false,
        testedForRespiratoryScreen: initialData.symptoms?.respiratory?.testedForRespiratoryScreen ?? false,
        influenzaB: initialData.symptoms?.respiratory?.influenzaB ?? false,
        respiratoryScreen: initialData.symptoms?.respiratory?.respiratoryScreen ?? false,

        exposureToPatientsCovid: initialData.exposure_history?.exposureToPatientsCovid ?? false,
        exposureToStaffCovid: initialData.exposure_history?.exposureToStaffCovid ?? false,
        isolationRequired: initialData.isolation_required ?? false,
        isolationDetails: initialData.exposure_history?.isolationDetails || "",
        furtherTreatmentRequired: initialData.exposure_history?.furtherTreatmentRequired ?? false,

        diarrheaVomitingCurrentSymptoms: initialData.symptoms?.diarrheaVomiting?.currentSymptoms ?? false,
        diarrheaVomitingContactWithOthers: initialData.symptoms?.diarrheaVomiting?.contactWithOthers ?? false,
        diarrheaVomitingFamilyHistory72h: initialData.symptoms?.diarrheaVomiting?.familyHistory72h ?? false,

        clostridiumActive: initialData.symptoms?.clostridium?.active ?? false,
        clostridiumHistory: initialData.symptoms?.clostridium?.history ?? false,
        clostridiumStoolCount72h: initialData.symptoms?.clostridium?.stoolCount72h || "",
        clostridiumLastPositiveSpecimenDate: initialData.symptoms?.clostridium?.lastPositiveSpecimenDate || undefined,
        clostridiumResult: initialData.symptoms?.clostridium?.result || "",
        clostridiumTreatmentReceived: initialData.symptoms?.clostridium?.treatmentReceived || "",
        clostridiumTreatmentComplete: initialData.symptoms?.clostridium?.treatmentComplete ?? false,
        ongoingDetails: initialData.symptoms?.clostridium?.ongoingDetails || "",
        ongoingDateCommenced: initialData.symptoms?.clostridium?.ongoingDateCommenced || undefined,
        ongoingLengthOfCourse: initialData.symptoms?.clostridium?.ongoingLengthOfCourse || "",
        ongoingFollowUpRequired: initialData.symptoms?.clostridium?.ongoingFollowUpRequired || undefined,

        mrsaMssaColonised: initialData.symptoms?.mrsa?.colonised ?? false,
        mrsaMssaInfected: initialData.symptoms?.mrsa?.infected ?? false,
        mrsaMssaLastPositiveSwabDate: initialData.symptoms?.mrsa?.lastPositiveSwabDate || undefined,
        mrsaMssaSitesPositive: initialData.symptoms?.mrsa?.sitesPositive || "",
        mrsaMssaTreatmentReceived: initialData.symptoms?.mrsa?.treatmentReceived || "",
        mrsaMssaTreatmentComplete: initialData.symptoms?.mrsa?.treatmentComplete || "",
        mrsaMssaDetails: initialData.symptoms?.mrsa?.mrsaMssaDetails || "",
        mrsaMssaDateCommenced: initialData.symptoms?.mrsa?.mrsaMssaDateCommenced || undefined,
        mrsaMssaLengthOfCourse: initialData.symptoms?.mrsa?.mrsaMssaLengthOfCourse || "",
        mrsaMssaFollowUpRequired: initialData.symptoms?.mrsa?.mrsaMssaFollowUpRequired || "",

        esbl: initialData.symptoms?.multiDrugResistance?.esbl ?? false,
        vreGre: initialData.symptoms?.multiDrugResistance?.vreGre ?? false,
        cpe: initialData.symptoms?.multiDrugResistance?.cpe ?? false,
        otherMultiDrugResistance: initialData.symptoms?.multiDrugResistance?.other || "",
        relevantInformationMultiDrugResistance: initialData.symptoms?.multiDrugResistance?.relevantInformation || "",

        awarenessOfInfection: initialData.exposure_history?.awarenessOfInfection ?? false,
        lastFluVaccinationDate: initialData.exposure_history?.lastFluVaccinationDate || undefined,

        completedBy: initialData.completed_by || userName,
        jobRole: initialData.symptoms?.details?.jobRole || initialData.jobRole || "",
        signature: initialData.signature || userName,
        assessmentDate: (initialData.assessment_date || initialData.completion_date) ? new Date(initialData.assessment_date || initialData.completion_date).getTime() : Date.now()
      }
      : {
        residentId: resident.id,
        organizationId: organizationId,
        teamId: teamId,
        name: `${resident.first_name} ${resident.last_name}`,
        dateOfBirth: resident.date_of_birth ? new Date(typeof resident.date_of_birth === 'number' ? resident.date_of_birth : resident.date_of_birth).toISOString().split("T")[0] : "",
        homeAddress: "",
        assessmentType: "Pre-admission",
        informationProvidedBy: "",
        admittedFrom: "",
        consultantGP: resident.gp_name || resident.gpName || "",
        reasonForAdmission: "",
        dateOfAdmission: undefined,
        newContinuousCough: false,
        worseningCough: false,
        temperatureHigh: false,
        otherRespiratorySymptoms: "",
        testedForCovid19: false,
        testedForInfluenzaA: false,
        testedForInfluenzaB: false,
        testedForRespiratoryScreen: false,
        influenzaB: false,
        respiratoryScreen: false,
        exposureToPatientsCovid: false,
        exposureToStaffCovid: false,
        isolationRequired: false,
        isolationDetails: "",
        furtherTreatmentRequired: false,
        diarrheaVomitingCurrentSymptoms: false,
        diarrheaVomitingContactWithOthers: false,
        diarrheaVomitingFamilyHistory72h: false,
        clostridiumActive: false,
        clostridiumHistory: false,
        clostridiumStoolCount72h: "",
        clostridiumLastPositiveSpecimenDate: undefined,
        clostridiumResult: "",
        clostridiumTreatmentReceived: "",
        clostridiumTreatmentComplete: false,
        ongoingDetails: "",
        ongoingDateCommenced: undefined,
        ongoingLengthOfCourse: "",
        ongoingFollowUpRequired: undefined,
        mrsaMssaColonised: false,
        mrsaMssaInfected: false,
        mrsaMssaLastPositiveSwabDate: undefined,
        mrsaMssaSitesPositive: "",
        mrsaMssaTreatmentReceived: "",
        mrsaMssaTreatmentComplete: "",
        mrsaMssaDetails: "",
        mrsaMssaDateCommenced: undefined,
        mrsaMssaLengthOfCourse: "",
        mrsaMssaFollowUpRequired: "",
        esbl: false,
        vreGre: false,
        cpe: false,
        otherMultiDrugResistance: "",
        relevantInformationMultiDrugResistance: "",
        awarenessOfInfection: false,
        lastFluVaccinationDate: undefined,
        completedBy: userName,
        jobRole: "",
        signature: userName,
        assessmentDate: Date.now()
      }
  });

  const onSubmit = async (values: z.infer<typeof InfectionPreventionAssessmentSchema>) => {
    startTransition(async () => {
      try {
        if (!userId) throw new Error("User not authenticated");

        const symptomsPayload = {
          details: {
            name: values.name,
            dateOfBirth: values.dateOfBirth,
            homeAddress: values.homeAddress,
            informationProvidedBy: values.informationProvidedBy,
            consultantGP: values.consultantGP,
            jobRole: values.jobRole,
          },
          respiratory: {
            newContinuousCough: values.newContinuousCough,
            worseningCough: values.worseningCough,
            temperatureHigh: values.temperatureHigh,
            otherRespiratorySymptoms: values.otherRespiratorySymptoms,
            testedForCovid19: values.testedForCovid19,
            testedForInfluenzaA: values.testedForInfluenzaA,
            testedForInfluenzaB: values.testedForInfluenzaB,
            testedForRespiratoryScreen: values.testedForRespiratoryScreen,
            influenzaB: values.influenzaB,
            respiratoryScreen: values.respiratoryScreen,
          },
          diarrheaVomiting: {
            currentSymptoms: values.diarrheaVomitingCurrentSymptoms,
            contactWithOthers: values.diarrheaVomitingContactWithOthers,
            familyHistory72h: values.diarrheaVomitingFamilyHistory72h,
          },
          clostridium: {
            active: values.clostridiumActive,
            history: values.clostridiumHistory,
            stoolCount72h: values.clostridiumStoolCount72h,
            lastPositiveSpecimenDate: values.clostridiumLastPositiveSpecimenDate,
            result: values.clostridiumResult,
            treatmentReceived: values.clostridiumTreatmentReceived,
            treatmentComplete: values.clostridiumTreatmentComplete,
            ongoingDetails: values.ongoingDetails,
            ongoingDateCommenced: values.ongoingDateCommenced,
            ongoingLengthOfCourse: values.ongoingLengthOfCourse,
            ongoingFollowUpRequired: values.ongoingFollowUpRequired,
          },
          mrsa: {
            colonised: values.mrsaMssaColonised,
            infected: values.mrsaMssaInfected,
            lastPositiveSwabDate: values.mrsaMssaLastPositiveSwabDate,
            sitesPositive: values.mrsaMssaSitesPositive,
            treatmentReceived: values.mrsaMssaTreatmentReceived,
            treatmentComplete: values.mrsaMssaTreatmentComplete,
            mrsaMssaDetails: values.mrsaMssaDetails,
            mrsaMssaDateCommenced: values.mrsaMssaDateCommenced,
            mrsaMssaLengthOfCourse: values.mrsaMssaLengthOfCourse,
            mrsaMssaFollowUpRequired: values.mrsaMssaFollowUpRequired,
          },
          multiDrugResistance: {
            esbl: values.esbl,
            vreGre: values.vreGre,
            cpe: values.cpe,
            other: values.otherMultiDrugResistance,
            relevantInformation: values.relevantInformationMultiDrugResistance,
          }
        };

        const exposurePayload = {
          admittedFrom: values.admittedFrom,
          reasonForAdmission: values.reasonForAdmission,
          dateOfAdmission: values.dateOfAdmission,
          exposureToPatientsCovid: values.exposureToPatientsCovid,
          exposureToStaffCovid: values.exposureToStaffCovid,
          isolationDetails: values.isolationDetails,
          furtherTreatmentRequired: values.furtherTreatmentRequired,
          awarenessOfInfection: values.awarenessOfInfection,
          lastFluVaccinationDate: values.lastFluVaccinationDate,
        };

        const payload = {
          resident_id: resident.id,
          organization_id: organizationId,
          assessment_type: values.assessmentType,
          symptoms: symptomsPayload,
          exposure_history: exposurePayload,
          isolation_required: values.isolationRequired,
          completed_by: values.completedBy,
          assessment_date: new Date(values.assessmentDate || Date.now()).toISOString(),
          created_by: userId,
        };

        const result = await submitAssessmentWithVersioning(
          'infection_prevention_assessments',
          payload,
          initialData,
          isEditMode
        );

        if (isEditMode && initialData?.id) {
          await supabase.from('manager_audits').insert({
            form_type: 'infection_prevention_assessments',
            form_id: result.id,
            resident_id: resident.id,
            audited_by: userId,
            audit_notes: "Form updated (New Version)",
            organization_id: organizationId
          });
          toast.success("Assessment updated");
        } else {
          toast.success("Assessment submitted");
        }
        onClose?.();
      } catch (error: any) {
        console.error("Error submitting:", error);
        toast.error(error.message || "Failed to submit assessment");
      }
    });
  };

  const setPopover = (key: string, open: boolean) => setDatePopovers(prev => ({ ...prev, [key]: open }));

  const BooleanField = ({ name, label }: { name: keyof z.infer<typeof InfectionPreventionAssessmentSchema>, label: string }) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
        <div className="space-y-0.5"><FormLabel className="cursor-pointer">{label}</FormLabel></div>
        <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
      </FormItem>
    )} />
  );

  const DateField = ({ name, label, required = false, allowFuture = false }: { name: keyof z.infer<typeof InfectionPreventionAssessmentSchema>, label: string, required?: boolean, allowFuture?: boolean }) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className="flex flex-col">
        <FormLabel required={required}>{label}</FormLabel>
        <Popover open={datePopovers[name]} onOpenChange={o => setPopover(name, o)} modal>
          <PopoverTrigger asChild>
            <FormControl>
              <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                {field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? new Date(field.value) : undefined} captionLayout="dropdown" onSelect={d => { field.onChange(d?.getTime()); setPopover(name, false); }} disabled={d => (!allowFuture && d > new Date()) || d < new Date("1900-01-01")} initialFocus />
          </PopoverContent>
        </Popover>
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
    <div className="flex flex-col space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Infection Prevention Assessment</DialogTitle>
          <DialogDescription>
            Record infectious risk and exposure history for the resident.
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
                  console.error("Infection Prevention form errors:", errors);
                  toast.error("Please fill in all required fields correctly.");
                })}
              />
              {/* Section 1: Resident Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Resident Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Resident Name</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="assessmentType" render={({ field }) => (
                    <FormItem><FormLabel required>Assessment Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Pre-admission">Pre-admission</SelectItem><SelectItem value="Admission">Admission</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="informationProvidedBy" render={({ field }) => <FormItem><FormLabel>Information Provided By</FormLabel><FormControl><Input placeholder="e.g. Resident, Social Worker, Hospital Staff" {...field} /></FormControl></FormItem>} />
                  <FormField control={form.control} name="homeAddress" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Home Address / Current Location</FormLabel><FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="consultantGP" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Consultant / GP Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                  <FormField control={form.control} name="admittedFrom" render={({ field }) => <FormItem><FormLabel>Location Admitted From</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                  <DateField name="dateOfAdmission" label="Admission Date" allowFuture />
                  <FormField control={form.control} name="reasonForAdmission" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Reason for Admission</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                </div>
              </div>

              {/* Section 2: Respiratory Health */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Acute Respiratory Illness (ARI)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Current Symptoms</h4>
                    <div className="grid gap-3">
                      <BooleanField name="newContinuousCough" label="New Continuous Cough" />
                      <BooleanField name="worseningCough" label="Worsening Cough" />
                      <BooleanField name="temperatureHigh" label="High Temperature (>37.8°C)" />
                      <FormField control={form.control} name="otherRespiratorySymptoms" render={({ field }) => <FormItem><FormLabel>Other Symptoms</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Recent Testing</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <BooleanField name="testedForCovid19" label="Tested for COVID-19" />
                      <BooleanField name="testedForInfluenzaA" label="Tested for Influenza A" />
                      <BooleanField name="testedForInfluenzaB" label="Tested for Influenza B" />
                      <BooleanField name="testedForRespiratoryScreen" label="Tested for Resp Screen" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Exposure History */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Exposure & Isolation History</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 grid gap-3 p-6 border rounded-xl bg-muted/20">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">COVID-19 Exposure</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <BooleanField name="exposureToPatientsCovid" label="Exposed to COVID+ patients?" />
                      <BooleanField name="exposureToStaffCovid" label="Exposed to COVID+ staff?" />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <BooleanField name="isolationRequired" label="Is current isolation required?" />
                    <FormField control={form.control} name="isolationDetails" render={({ field }) => <FormItem><FormLabel>Isolation Details & Recommendations</FormLabel><FormControl><Textarea placeholder="Duration, type of precautions..." {...field} /></FormControl></FormItem>} />
                    <BooleanField name="furtherTreatmentRequired" label="Further treatment for ARI required?" />
                  </div>
                </div>
              </div>

              {/* Section 4: Gastric Symptoms */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Diarrhoea & Vomiting</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <BooleanField name="diarrheaVomitingCurrentSymptoms" label="Does the person currently have diarrhoea and/or vomiting where infection has not been confirmed as the cause?" />
                  <BooleanField name="diarrheaVomitingContactWithOthers" label="Has the person been in contact with others who have had diarrhoea and/or vomiting within the past 72 hours?" />
                  <BooleanField name="diarrheaVomitingFamilyHistory72h" label="Has anyone in the persons family had diarrhoea and/or vomiting in the past 72 hours?" />
                </div>
              </div>

              {/* Section 5: C. Difficile */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Clostridium Difficile</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <BooleanField name="clostridiumActive" label="Active C.Diff Case?" />
                    <BooleanField name="clostridiumHistory" label="Past Medical History of C.Diff?" />
                  </div>
                  <FormField control={form.control} name="clostridiumStoolCount72h" render={({ field }) => <FormItem><FormLabel>Stool Count (last 72h)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                  <DateField name="clostridiumLastPositiveSpecimenDate" label="Last positive specimen date" />
                  <FormField control={form.control} name="clostridiumResult" render={({ field }) => <FormItem><FormLabel>Specimen Result</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                  <FormField control={form.control} name="clostridiumTreatmentReceived" render={({ field }) => <FormItem><FormLabel>Treatment Received</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                  <div className="md:col-span-2">
                    <BooleanField name="clostridiumTreatmentComplete" label="Initial treatment regimen complete?" />
                  </div>

                  <div className="md:col-span-2 grid gap-4 p-6 border rounded-xl bg-card/10">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Ongoing Regimen</h4>
                    <FormField control={form.control} name="ongoingDetails" render={({ field }) => <FormItem><FormLabel>Active Antibiotic Details</FormLabel><FormControl><Textarea className="bg-background" {...field} /></FormControl></FormItem>} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DateField name="ongoingDateCommenced" label="Course Start Date" />
                      <FormField control={form.control} name="ongoingLengthOfCourse" render={({ field }) => <FormItem><FormLabel>Projected Length (e.g. 10 days)</FormLabel><FormControl><Input className="bg-background" {...field} /></FormControl></FormItem>} />
                      <FormField control={form.control} name="ongoingFollowUpRequired" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Follow-up required in ongoing regimen</FormLabel><FormControl><Textarea className="min-h-[80px] bg-background" {...field} /></FormControl></FormItem>} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 6: MRSA / MSSA */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">MRSA / MSSA Status</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <BooleanField name="mrsaMssaColonised" label="Known Colonisation?" />
                    <BooleanField name="mrsaMssaInfected" label="Active Infection?" />
                  </div>
                  <DateField name="mrsaMssaLastPositiveSwabDate" label="Last positive swab date" />
                  <FormField control={form.control} name="mrsaMssaSitesPositive" render={({ field }) => <FormItem><FormLabel>Sites Positive (e.g Nose, Wound)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                  <FormField control={form.control} name="mrsaMssaTreatmentReceived" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Treatment Regimen Received</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />

                  <div className="md:col-span-2 grid gap-4 p-6 border rounded-xl bg-card/10">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Ongoing Decolonisation</h4>
                    <FormField control={form.control} name="mrsaMssaDetails" render={({ field }) => <FormItem><FormLabel>Active Decolonisation Details</FormLabel><FormControl><Textarea className="bg-background" {...field} /></FormControl></FormItem>} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DateField name="mrsaMssaDateCommenced" label="Regimen Start Date" />
                      <FormField control={form.control} name="mrsaMssaLengthOfCourse" render={({ field }) => <FormItem><FormLabel>Projected Duration</FormLabel><FormControl><Input className="bg-background" {...field} /></FormControl></FormItem>} />
                      <FormField control={form.control} name="mrsaMssaFollowUpRequired" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Follow-up required in ongoing Decolonisation</FormLabel><FormControl><Textarea className="min-h-[80px] bg-background" {...field} /></FormControl></FormItem>} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 7: Multi-drug Resistance */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Multi-drug Resistant Organisms (MDRO)</h3>
                </div>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <BooleanField name="esbl" label="ESBL" />
                    <BooleanField name="vreGre" label="VRE / GRE" />
                    <BooleanField name="cpe" label="CPE" />
                  </div>
                  <FormField control={form.control} name="otherMultiDrugResistance" render={({ field }) => <FormItem><FormLabel>Other MDR Organisms (e.g. Pseudomonas)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                  <FormField control={form.control} name="relevantInformationMultiDrugResistance" render={({ field }) => <FormItem><FormLabel>Additional Clinical Notes</FormLabel><FormControl><Textarea placeholder="Past infections, hospitalisations..." {...field} /></FormControl></FormItem>} />
                </div>
              </div>

              {/* Section 8: Vaccinations & Awareness */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Vaccinations & Awareness</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <BooleanField name="awarenessOfInfection" label="Personal awareness of infection status?" />
                  <DateField name="lastFluVaccinationDate" label="Date of last Flu Vaccination" />
                </div>
              </div>

              {/* Section 9: Completion */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold">Completion & Sign-off</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="completedBy" render={({ field }) => <FormItem><FormLabel>Completed By</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="jobRole" render={({ field }) => <FormItem><FormLabel required>Job Role</FormLabel><FormControl><Input {...field} placeholder="e.g. Registered Nurse, Care Manager" /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="signature" render={({ field }) => <FormItem><FormLabel required>Digital Signature (Name)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <DateField name="assessmentDate" label="Completion Date" required />
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
              isEditMode ? "Save Changes" : "Save Assessment"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
