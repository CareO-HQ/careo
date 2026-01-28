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
}

export default function InfectionPreventionDialog({
  resident,
  teamId,
  organizationId,
  userName,
  userId,
  onClose,
  initialData,
  isEditMode = false
}: InfectionPreventionDialogProps) {
  const [step, setStep] = useState(1);
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
        name: initialData.symptoms?.details?.name || `${resident.first_name} ${resident.last_name}`,
        dateOfBirth: initialData.symptoms?.details?.dateOfBirth || (resident.date_of_birth ? new Date(resident.date_of_birth).toISOString().split("T")[0] : ""),
        homeAddress: initialData.symptoms?.details?.homeAddress || "",
        assessmentType: initialData.assessment_type || "Pre-admission",
        informationProvidedBy: initialData.symptoms?.details?.informationProvidedBy || "",
        admittedFrom: initialData.exposure_history?.admittedFrom || "",
        consultantGP: initialData.symptoms?.details?.consultantGP || "",
        reasonForAdmission: initialData.exposure_history?.reasonForAdmission || "",
        dateOfAdmission: initialData.exposure_history?.dateOfAdmission || undefined,

        // Respiratory
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

        // Exposure
        exposureToPatientsCovid: initialData.exposure_history?.exposureToPatientsCovid ?? false,
        exposureToStaffCovid: initialData.exposure_history?.exposureToStaffCovid ?? false,
        isolationRequired: initialData.isolation_required ?? false,
        isolationDetails: initialData.exposure_history?.isolationDetails || "",
        furtherTreatmentRequired: initialData.exposure_history?.furtherTreatmentRequired ?? false,

        // Diarrhea
        diarrheaVomitingCurrentSymptoms: initialData.symptoms?.diarrheaVomiting?.currentSymptoms ?? false,
        diarrheaVomitingContactWithOthers: initialData.symptoms?.diarrheaVomiting?.contactWithOthers ?? false,
        diarrheaVomitingFamilyHistory72h: initialData.symptoms?.diarrheaVomiting?.familyHistory72h ?? false,

        // Clostridium
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

        // MRSA
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

        // MultiDrug
        esbl: initialData.symptoms?.multiDrugResistance?.esbl ?? false,
        vreGre: initialData.symptoms?.multiDrugResistance?.vreGre ?? false,
        cpe: initialData.symptoms?.multiDrugResistance?.cpe ?? false,
        otherMultiDrugResistance: initialData.symptoms?.multiDrugResistance?.other || "",
        relevantInformationMultiDrugResistance: initialData.symptoms?.multiDrugResistance?.relevantInformation || "",

        // Other
        awarenessOfInfection: initialData.exposure_history?.awarenessOfInfection ?? false,
        lastFluVaccinationDate: initialData.exposure_history?.lastFluVaccinationDate || undefined,

        // Completion
        completedBy: initialData.completed_by || userName,
        jobRole: initialData.jobRole || "",
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
        consultantGP: "",
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
          assessment_date: new Date(values.assessmentDate).toISOString(),
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
            form_id: result.id, // Use new version ID
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
      } catch (error) {
        console.error("Error submitting:", error);
        toast.error("Failed to submit assessment");
      }
    });
  };

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["name", "dateOfBirth", "homeAddress", "assessmentType"];
    else if (step === 2) fieldsToValidate = ["newContinuousCough", "worseningCough", "temperatureHigh"];
    else if (step === 9) fieldsToValidate = ["completedBy", "jobRole", "signature", "assessmentDate"];

    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) setStep(prev => prev + 1);
  };

  const setPopover = (key: string, open: boolean) => setDatePopovers(prev => ({ ...prev, [key]: open }));

  const BooleanField = ({ name, label }: { name: keyof z.infer<typeof InfectionPreventionAssessmentSchema>, label: string }) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5"><FormLabel>{label}</FormLabel></div>
        <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
      </FormItem>
    )} />
  );

  const DateField = ({ name, label }: { name: keyof z.infer<typeof InfectionPreventionAssessmentSchema>, label: string }) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className="flex flex-col">
        <FormLabel>{label}</FormLabel>
        <Popover open={datePopovers[name]} onOpenChange={o => setPopover(name, o)}>
          <PopoverTrigger asChild>
            <FormControl>
              <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                {field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? new Date(field.value) : undefined} onSelect={d => { field.onChange(d?.getTime()); setPopover(name, false); }} disabled={d => d > new Date() || d < new Date("1900-01-01")} initialFocus />
          </PopoverContent>
        </Popover>
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
    <div className="max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Infection Prevention Assessment (Step {step}/9)</DialogTitle>
        <DialogDescription>
          {step === 1 && "Resident details"}
          {step === 2 && "Acute Respiratory Illness (ARI)"}
          {step === 3 && "Exposure History"}
          {step === 4 && "Diarrhoea and Vomiting"}
          {step === 5 && "Clostridium Difficile"}
          {step === 6 && "MRSA / MSSA"}
          {step === 7 && "Multi-drug Resistance"}
          {step === 8 && "Other Information"}
          {step === 9 && "Completion"}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-1 py-4">
        <Form {...form}>
          <form className="space-y-4 px-1">
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="assessmentType" render={({ field }) => (
                    <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Pre-admission">Pre-admission</SelectItem><SelectItem value="Admission">Admission</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="homeAddress" render={({ field }) => <FormItem><FormLabel>Home Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="informationProvidedBy" render={({ field }) => <FormItem><FormLabel>Info Provided By</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                  <FormField control={form.control} name="consultantGP" render={({ field }) => <FormItem><FormLabel>Consultant / GP</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <BooleanField name="newContinuousCough" label="New Continuous Cough?" />
                  <BooleanField name="worseningCough" label="Worsening Cough?" />
                  <BooleanField name="temperatureHigh" label="Temperature High (>37.8°C)?" />
                  <FormField control={form.control} name="otherRespiratorySymptoms" render={({ field }) => <FormItem><FormLabel>Other Respiratory Symptoms</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <BooleanField name="testedForCovid19" label="Tested for COVID-19?" />
                  <BooleanField name="testedForInfluenzaA" label="Tested for Influenza A?" />
                  <BooleanField name="testedForInfluenzaB" label="Tested for Influenza B?" />
                  <BooleanField name="testedForRespiratoryScreen" label="Tested for Resp Screen?" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="admittedFrom" render={({ field }) => <FormItem><FormLabel>Admitted From</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                  <DateField name="dateOfAdmission" label="Date of Admission" />
                </div>
                <FormField control={form.control} name="reasonForAdmission" render={({ field }) => <FormItem><FormLabel>Reason for Admission</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                <Separator />
                <BooleanField name="exposureToPatientsCovid" label="Exposure to patients with COVID-19?" />
                <BooleanField name="exposureToStaffCovid" label="Exposure to staff with COVID-19?" />
                <BooleanField name="isolationRequired" label="Isolation Required?" />
                <FormField control={form.control} name="isolationDetails" render={({ field }) => <FormItem><FormLabel>Isolation Details</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
                <BooleanField name="furtherTreatmentRequired" label="Further treatment for ARI required?" />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <BooleanField name="diarrheaVomitingCurrentSymptoms" label="Current symptoms of diarrhoea/vomiting?" />
                <BooleanField name="diarrheaVomitingContactWithOthers" label="Contact with others with symptoms (48h)?" />
                <BooleanField name="diarrheaVomitingFamilyHistory72h" label="Family/Home members with symptoms (72h)?" />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <BooleanField name="clostridiumActive" label="Active C.Diff?" />
                  <BooleanField name="clostridiumHistory" label="History of C.Diff?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="clostridiumStoolCount72h" render={({ field }) => <FormItem><FormLabel>Stool Count (72h)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                  <DateField name="clostridiumLastPositiveSpecimenDate" label="Last positive specimen date" />
                </div>
                <FormField control={form.control} name="clostridiumResult" render={({ field }) => <FormItem><FormLabel>Result</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="clostridiumTreatmentReceived" render={({ field }) => <FormItem><FormLabel>Treatment Received</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                <BooleanField name="clostridiumTreatmentComplete" label="Treatment Complete?" />
                <Separator />
                <h4 className="text-sm font-medium">Ongoing Treatment</h4>
                <FormField control={form.control} name="ongoingDetails" render={({ field }) => <FormItem><FormLabel>Details</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
                <div className="grid grid-cols-2 gap-4">
                  <DateField name="ongoingDateCommenced" label="Date Commenced" />
                  <FormField control={form.control} name="ongoingLengthOfCourse" render={({ field }) => <FormItem><FormLabel>Length of Course</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <BooleanField name="mrsaMssaColonised" label="MRSA/MSSA Colonised?" />
                  <BooleanField name="mrsaMssaInfected" label="MRSA/MSSA Infected?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DateField name="mrsaMssaLastPositiveSwabDate" label="Last positive swab date" />
                  <FormField control={form.control} name="mrsaMssaSitesPositive" render={({ field }) => <FormItem><FormLabel>Sites Positive</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                </div>
                <FormField control={form.control} name="mrsaMssaTreatmentReceived" render={({ field }) => <FormItem><FormLabel>Treatment Received</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                <Separator />
                <h4 className="text-sm font-medium">Ongoing Treatment</h4>
                <FormField control={form.control} name="mrsaMssaDetails" render={({ field }) => <FormItem><FormLabel>Details</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
                <div className="grid grid-cols-2 gap-4">
                  <DateField name="mrsaMssaDateCommenced" label="Date Commenced" />
                  <FormField control={form.control} name="mrsaMssaLengthOfCourse" render={({ field }) => <FormItem><FormLabel>Length of Course</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <BooleanField name="esbl" label="ESBL?" />
                  <BooleanField name="vreGre" label="VRE / GRE?" />
                  <BooleanField name="cpe" label="CPE?" />
                </div>
                <FormField control={form.control} name="otherMultiDrugResistance" render={({ field }) => <FormItem><FormLabel>Other MDR Organisms</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="relevantInformationMultiDrugResistance" render={({ field }) => <FormItem><FormLabel>Relevant Information</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
              </div>
            )}

            {step === 8 && (
              <div className="space-y-4">
                <BooleanField name="awarenessOfInfection" label="Personal awareness of infection status?" />
                <DateField name="lastFluVaccinationDate" label="Date of last Flu Vaccination" />
              </div>
            )}

            {step === 9 && (
              <div className="space-y-4">
                <FormField control={form.control} name="completedBy" render={({ field }) => <FormItem><FormLabel>Completed By</FormLabel><FormControl><Input {...field} readOnly disabled className="bg-muted" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="jobRole" render={({ field }) => <FormItem><FormLabel>Job Role</FormLabel><FormControl><Input {...field} placeholder="e.g. Registered Nurse" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="signature" render={({ field }) => <FormItem><FormLabel>Digital Signature (Name)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <DateField name="assessmentDate" label="Date Completed" />
              </div>
            )}
          </form>
        </Form>
      </div>

      <DialogFooter className="border-t p-4 mt-auto">
        <Button variant="outline" onClick={step === 1 ? () => onClose?.() : () => setStep(step - 1)} disabled={isLoading}>
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        <Button onClick={step === 9 ? form.handleSubmit(onSubmit) : handleNext} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {step === 9 ? "Save Assessment" : "Next"}
        </Button>
      </DialogFooter>
    </div>
  );
}

const Separator = () => <div className="h-px bg-border my-6" />;
