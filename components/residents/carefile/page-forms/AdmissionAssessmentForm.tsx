"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import { supabase } from "@/lib/supabase";
import { admissionAssessmentSchema } from "@/schemas/residents/care-file/admissionSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Pencil, Printer, Save } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone_number?: string;
  room_number?: string;
  nhs_health_number?: string;
  gp_name?: string;
  gp_phone?: string;
  care_manager_name?: string;
  care_manager_phone?: string;
  emergency_contacts?: Array<{
    id: string;
    name: string;
    relationship?: string;
    phone_number?: string;
    is_primary?: boolean;
  }>;
}

interface AdmissionAssessmentFormProps {
  residentId: string;
  resident: Resident;
  teamId: string;
  organizationId: string;
  userId: string;
  userName: string;
  onSaved: () => void;
}

// ─── 30 Questions config ──────────────────────────────────────────────────────

const QUESTIONS: {
  number: number;
  label: string;
  field: keyof z.infer<typeof admissionAssessmentSchema>;
  type: "text" | "textarea" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  section: string;
}[] = [
  // Resident Info
  { number: 1,  label: "First Name",              field: "firstName",                    type: "text",     section: "Resident Information" },
  { number: 2,  label: "Last Name",               field: "lastName",                     type: "text",     section: "Resident Information" },
  { number: 3,  label: "Bedroom / Room Number",   field: "bedroomNumber",                type: "text",     section: "Resident Information" },
  { number: 4,  label: "NHS Number",              field: "NHSNumber",                    type: "text",     section: "Resident Information" },
  { number: 5,  label: "Gender",                  field: "gender",                       type: "select",   section: "Resident Information", options: [{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }] },
  { number: 6,  label: "Phone Number",            field: "telephoneNumber",              type: "text",     section: "Resident Information" },
  { number: 7,  label: "Ethnicity",               field: "ethnicity",                    type: "text",     section: "Resident Information" },
  { number: 8,  label: "Religion",                field: "religion",                     type: "text",     section: "Resident Information" },
  { number: 9,  label: "Admitted From",           field: "admittedFrom",                 type: "text",     section: "Resident Information" },
  // Next of Kin
  { number: 10, label: "NOK First Name",          field: "kinFirstName",                 type: "text",     section: "Next of Kin" },
  { number: 11, label: "NOK Last Name",           field: "kinLastName",                  type: "text",     section: "Next of Kin" },
  { number: 12, label: "NOK Relationship",        field: "kinRelationship",              type: "text",     section: "Next of Kin" },
  { number: 13, label: "NOK Phone",               field: "kinTelephoneNumber",           type: "text",     section: "Next of Kin" },
  { number: 14, label: "NOK Email",               field: "kinEmail",                     type: "text",     section: "Next of Kin" },
  { number: 15, label: "NOK Address",             field: "kinAddress",                   type: "text",     section: "Next of Kin" },
  // Emergency Contact
  { number: 16, label: "Emergency Contact Name",  field: "emergencyContactName",         type: "text",     section: "Emergency Contact" },
  { number: 17, label: "Emergency Relationship",  field: "emergencyContactRelationship", type: "text",     section: "Emergency Contact" },
  { number: 18, label: "Emergency Phone",         field: "emergencyContactTelephoneNumber", type: "text", section: "Emergency Contact" },
  // Professional Contacts
  { number: 19, label: "GP Name",                 field: "GPName",                       type: "text",     section: "Professional Contacts" },
  { number: 20, label: "GP Phone",                field: "GPPhoneNumber",                type: "text",     section: "Professional Contacts" },
  { number: 21, label: "Care Manager Name",       field: "careManagerName",              type: "text",     section: "Professional Contacts" },
  { number: 22, label: "Care Manager Phone",      field: "careManagerTelephoneNumber",   type: "text",     section: "Professional Contacts" },
  // Medical
  { number: 23, label: "Allergies",               field: "allergies",                    type: "textarea", section: "Medical Information" },
  { number: 24, label: "Medical History",         field: "medicalHistory",               type: "textarea", section: "Medical Information" },
  { number: 25, label: "Prescribed Medications",  field: "prescribedMedications",        type: "textarea", section: "Medical Information" },
  { number: 26, label: "Current Infection",       field: "currentInfection",             type: "textarea", section: "Medical Information" },
  { number: 27, label: "Antibiotics Prescribed",  field: "antibioticsPrescribed",        type: "checkbox", section: "Medical Information" },
  // Care
  { number: 28, label: "Continence",              field: "continence",                   type: "textarea", section: "Care Needs" },
  { number: 29, label: "Hygiene",                 field: "hygiene",                      type: "textarea", section: "Care Needs" },
  { number: 30, label: "Additional Comments",     field: "additionalComments",           type: "textarea", section: "Care Needs" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = new Date(val as string | number);
    if (isNaN(d.getTime())) return String(val);
    return format(d, "dd MMM yyyy");
  } catch {
    return String(val);
  }
}

function fieldDisplayValue(
  q: (typeof QUESTIONS)[number],
  data: Record<string, unknown>
): string {
  const v = data[q.field];
  if (q.type === "checkbox") return v ? "Yes" : "No";
  if (q.field === "dateOfBirth") return safeDate(v);
  if (!v || v === "") return "—";
  const opt = q.options?.find((o) => o.value === v);
  return opt ? opt.label : String(v);
}

// ─── Completed Document View ──────────────────────────────────────────────────

function AdmissionDocumentView({
  data,
  submittedAt,
  onEdit,
}: {
  data: Record<string, unknown>;
  submittedAt?: string;
  onEdit: () => void;
}) {
  const sections = QUESTIONS.reduce<Record<string, typeof QUESTIONS>>((acc, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <div>
            <h2 className="text-sm font-semibold">Admission Assessment Form</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completed{submittedAt ? ` · ${safeDate(submittedAt)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => window.print()}>
            <Printer className="w-3 h-3" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={onEdit}>
            <Pencil className="w-3 h-3" />
            Edit
          </Button>
        </div>
      </div>

      {/* Document body */}
      <ScrollArea className="flex-1 print:overflow-visible">
        <div className="px-6 py-6 max-w-2xl mx-auto space-y-8 print:px-0 print:py-0">
          {Object.entries(sections).map(([sectionName, questions]) => (
            <div key={sectionName}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
                {sectionName}
              </p>
              <div className="space-y-3">
                {questions.map((q) => (
                  <div key={q.field} className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                    <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                      <span className="mr-1">{q.number}.</span>{q.label}
                    </p>
                    <p className="text-sm font-medium text-foreground leading-relaxed break-words">
                      {fieldDisplayValue(q, data)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdmissionAssessmentForm({
  residentId,
  resident,
  teamId,
  organizationId,
  userId,
  onSaved,
}: AdmissionAssessmentFormProps) {
  const [existingData, setExistingData] = useState<Record<string, unknown> | undefined>(undefined);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const firstKin = resident.emergency_contacts?.find((c) => c.is_primary);

  const form = useForm<z.infer<typeof admissionAssessmentSchema>>({
    resolver: zodResolver(admissionAssessmentSchema),
    mode: "onChange",
    defaultValues: {
      residentId,
      teamId,
      organizationId,
      userId,
      firstName: resident.first_name ?? "",
      lastName: resident.last_name ?? "",
      dateOfBirth: resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
      bedroomNumber: resident.room_number ?? "",
      NHSNumber: resident.nhs_health_number ?? "",
      telephoneNumber: resident.phone_number ?? "",
      gender: undefined,
      ethnicity: "",
      religion: "",
      admittedFrom: "",
      kinFirstName: firstKin?.name?.split(" ")[0] ?? "",
      kinLastName: firstKin?.name?.split(" ").slice(1).join(" ") ?? "",
      kinRelationship: firstKin?.relationship ?? "",
      kinTelephoneNumber: firstKin?.phone_number ?? "",
      kinEmail: "",
      kinAddress: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactTelephoneNumber: "",
      emergencyContactPhoneNumber: "",
      careManagerName: resident.care_manager_name ?? "",
      careManagerTelephoneNumber: resident.care_manager_phone ?? "",
      careManagerRelationship: "",
      careManagerPhoneNumber: "",
      careManagerAddress: "",
      careManagerJobRole: "",
      GPName: resident.gp_name ?? "",
      GPPhoneNumber: resident.gp_phone ?? "",
      GPAddress: "",
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
      hygiene: "",
    },
  });

  // Load existing data
  useEffect(() => {
    if (!residentId) return;
    supabase
      .from("admission_assessments")
      .select("*")
      .eq("resident_id", residentId)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setExistingData(data as Record<string, unknown>);
          const ad = (data as Record<string, unknown>).assessment_data as Record<string, unknown> | undefined;
          if (ad) form.reset({ residentId, teamId, organizationId, userId, ...ad } as z.infer<typeof admissionAssessmentSchema>);
        }
        setLoadingExisting(false);
      });
  }, [residentId]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: z.infer<typeof admissionAssessmentSchema>) {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          status: "completed",
          assessment_data: { ...values, submittedAt: new Date().toISOString() },
          created_by: userId,
        };
        await submitAssessmentWithVersioning(
          "admission_assessments",
          payload,
          existingData as { id?: string; version_number?: number } | undefined,
          !!existingData
        );
        toast.success(existingData ? "Assessment updated successfully" : "Assessment submitted successfully");
        // Refresh existing data and switch to document view
        const { data } = await supabase
          .from("admission_assessments")
          .select("*")
          .eq("resident_id", residentId)
          .neq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (data) setExistingData(data as Record<string, unknown>);
        setIsEditing(false);
        onSaved();
      } catch (error) {
        toast.error("Error: " + (error as Error).message);
      }
    });
  }

  if (loadingExisting) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show completed document view when data exists and not editing
  if (existingData && !isEditing) {
    const ad = (existingData.assessment_data as Record<string, unknown>) ?? existingData;
    return (
      <AdmissionDocumentView
        data={ad}
        submittedAt={ad.submittedAt as string | undefined}
        onEdit={() => setIsEditing(true)}
      />
    );
  }

  // Group questions by section
  const sections = QUESTIONS.reduce<Record<string, typeof QUESTIONS>>((acc, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold">Admission Assessment Form</h2>
          <p className="text-xs text-muted-foreground mt-0.5">30 questions · {existingData ? "Editing existing" : "New form"}</p>
        </div>
        <div className="flex items-center gap-2">
          {existingData && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            {existingData ? "Save Changes" : "Submit"}
          </Button>
        </div>
      </div>

      {/* Questions */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {Object.entries(sections).map(([sectionName, questions]) => (
                <div key={sectionName}>
                  {/* Section heading */}
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                    {sectionName}
                  </p>
                  <div className="space-y-4">
                    {questions.map((q) => (
                      <FormField
                        key={q.field}
                        control={form.control}
                        name={q.field}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-foreground">
                              <span className="text-muted-foreground mr-1.5">{q.number}.</span>
                              {q.label}
                            </FormLabel>
                            <FormControl>
                              {q.type === "text" ? (
                                <Input
                                  value={typeof field.value === "boolean" ? "" : (field.value ?? "")}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              ) : q.type === "textarea" ? (
                                <Textarea
                                  rows={3}
                                  value={typeof field.value === "boolean" ? "" : (field.value ?? "")}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              ) : q.type === "select" ? (
                                <Select
                                  onValueChange={field.onChange}
                                  value={typeof field.value === "string" ? field.value : undefined}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {q.options?.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="flex items-center gap-2 pt-1">
                                  <Checkbox
                                    checked={typeof field.value === "boolean" ? field.value : false}
                                    onCheckedChange={field.onChange}
                                  />
                                  <span className="text-sm text-muted-foreground">Yes</span>
                                </div>
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </form>
          </Form>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-3 border-t flex-shrink-0 flex justify-end bg-muted/10">
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={form.handleSubmit(onSubmit)}
          disabled={isPending}
        >
          {isPending ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
          ) : existingData ? "Save Changes" : "Submit Assessment"}
        </Button>
      </div>
    </div>
  );
}
