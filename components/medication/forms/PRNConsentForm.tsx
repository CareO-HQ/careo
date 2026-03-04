"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import { printPRNConsentPDF } from "@/lib/prn-consent-pdf-utils";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { PRNConsentSchema } from "@/schemas/residents/medication/prnConsentSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, Loader2, Pencil, Printer, Save } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  room_number?: string;
}

interface PRNConsentFormProps {
  residentId: string;
  resident: Resident;
  teamId: string;
  organizationId: string;
  userId: string;
  userName: string;
  onSaved: () => void;
}

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function safeDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = new Date(val as string | number);
    if (isNaN(d.getTime())) return "—";
    return format(d, "dd MMM yyyy");
  } catch {
    return "—";
  }
}

// ΓöÇΓöÇΓöÇ Completed Document View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function PRNDocumentView({
  data,
  onEdit,
}: {
  data: Record<string, unknown>;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <div>
            <h2 className="text-sm font-semibold">PRN Care Consent Form</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completed{data.submittedAt ? ` · ${safeDate(data.submittedAt)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => printPRNConsentPDF(data, String(data.residentName || ""))}
          >
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

          {/* Introduction */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>PRN (Pro Re Nata)</strong> means &quot;as needed&quot; medication. This consent form authorizes
              care staff to administer PRN medications according to the resident&apos;s care plan and medical directives.
            </p>
          </div>

          {/* Resident Information */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Resident Information
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                <p className="text-xs text-muted-foreground">Resident Name</p>
                <p className="text-sm font-medium text-foreground">{String(data.residentName || "—")}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                <p className="text-xs text-muted-foreground">Room Number</p>
                <p className="text-sm font-medium text-foreground">{String(data.bedroomNumber || "—")}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                <p className="text-xs text-muted-foreground">Date of Birth</p>
                <p className="text-sm font-medium text-foreground">{safeDate(data.dateOfBirth)}</p>
              </div>
            </div>
          </div>

          {/* Consent Agreement */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Consent Agreement
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/10">
                <div className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded-sm border-2 flex items-center justify-center ${Boolean(data.understandsPRN) ? "bg-green-500 border-green-500" : "border-muted-foreground"}`}>
                  {Boolean(data.understandsPRN) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">I understand what PRN medication means</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    I have been informed about PRN medications and when they may be administered.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/10">
                <div className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded-sm border-2 flex items-center justify-center ${Boolean(data.agreesToPRN) ? "bg-green-500 border-green-500" : "border-muted-foreground"}`}>
                  {Boolean(data.agreesToPRN) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">I consent to PRN medication administration</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    I authorize trained care staff to administer PRN medications as prescribed by my healthcare provider.
                  </p>
                </div>
              </div>

              {Boolean(data.medicationTypes) && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Specific Medication Types Consented:</p>
                  <p className="text-sm font-medium p-3 rounded-md border bg-background">{String(data.medicationTypes)}</p>
                </div>
              )}

              {Boolean(data.additionalNotes) && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Additional Notes:</p>
                  <p className="text-sm p-3 rounded-md border bg-background whitespace-pre-wrap">{String(data.additionalNotes)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Signatures
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                <p className="text-xs text-muted-foreground">Resident Signature</p>
                <p className="text-sm font-medium text-foreground">{String(data.residentSignature || "—")}</p>
              </div>
              {Boolean(data.representativeName) && (
                <>
                  <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                    <p className="text-xs text-muted-foreground">Representative Name</p>
                    <p className="text-sm font-medium text-foreground">{String(data.representativeName)}</p>
                  </div>
                  <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                    <p className="text-xs text-muted-foreground">Relationship</p>
                    <p className="text-sm font-medium text-foreground">{String(data.representativeRelationship || "—")}</p>
                  </div>
                  <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                    <p className="text-xs text-muted-foreground">Representative Signature</p>
                    <p className="text-sm font-medium text-foreground">{String(data.representativeSignature || "—")}</p>
                  </div>
                  <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                    <p className="text-xs text-muted-foreground">Date Signed</p>
                    <p className="text-sm font-medium text-foreground">{safeDate(data.representativeDate)}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Staff Verification */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-1.5 border-b">
              Staff Verification
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                <p className="text-xs text-muted-foreground">Staff Name</p>
                <p className="text-sm font-medium text-foreground">{String(data.nameStaff || "—")}</p>
              </div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                <p className="text-xs text-muted-foreground">Date Completed</p>
                <p className="text-sm font-medium text-foreground">{safeDate(data.date)}</p>
              </div>
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export default function PRNConsentForm({
  residentId,
  resident,
  teamId,
  organizationId,
  userId,
  userName,
  onSaved,
}: PRNConsentFormProps) {
  const [existingData, setExistingData] = useState<Record<string, unknown> | undefined>(undefined);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [dobOpen, setDobOpen] = useState(false);
  const [repDateOpen, setRepDateOpen] = useState(false);
  const [dateCompletedOpen, setDateCompletedOpen] = useState(false);

  const residentFullName = `${resident.first_name ?? ""} ${resident.last_name ?? ""}`.trim();

  const form = useForm<z.infer<typeof PRNConsentSchema>>({
    resolver: zodResolver(PRNConsentSchema),
    mode: "onChange",
    defaultValues: {
      residentId,
      teamId,
      organizationId,
      userId,
      residentName: residentFullName,
      bedroomNumber: resident.room_number ?? "",
      dateOfBirth: resident.date_of_birth
        ? new Date(resident.date_of_birth).getTime()
        : Date.now(),
      understandsPRN: false,
      agreesToPRN: false,
      medicationTypes: "",
      additionalNotes: "",
      residentSignature: "",
      representativeName: "",
      representativeRelationship: "",
      representativeSignature: "",
      representativeDate: undefined,
      nameStaff: userName,
      staffSignature: userName,
      date: Date.now(),
    },
  });

  // Load existing data
  useEffect(() => {
    if (!residentId) return;
    supabase
      .from("prn_consents")
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
          if (ad) {
            form.reset({ residentId, teamId, organizationId, userId, ...ad } as z.infer<typeof PRNConsentSchema>);
          }
        }
        setLoadingExisting(false);
      });
  }, [residentId]);

  function onSubmit(values: z.infer<typeof PRNConsentSchema>) {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          status: "completed",
          assessment_data: { ...values, submittedAt: new Date().toISOString() },
          assessment_date: format(new Date(values.date), "yyyy-MM-dd"),
          completed_by: values.nameStaff,
          created_by: userId,
        };
        await submitAssessmentWithVersioning(
          "prn_consents",
          payload,
          existingData as { id?: string; version_number?: number } | undefined,
          !!existingData
        );
        toast.success(existingData ? "PRN consent updated successfully" : "PRN consent submitted successfully");
        // Refresh and switch to document view
        const { data } = await supabase
          .from("prn_consents")
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
    return <PRNDocumentView data={ad} onEdit={() => setIsEditing(true)} />;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold">PRN Care Consent Form</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {existingData ? "Editing existing" : "New form"}
          </p>
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
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            {existingData ? "Save Changes" : "Submit"}
          </Button>
        </div>
      </div>

      {/* Form body */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              {/* Introduction */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>PRN (Pro Re Nata)</strong> means &quot;as needed&quot; medication. This consent form authorizes
                  care staff to administer PRN medications according to your care plan and medical directives.
                </p>
              </div>

              {/* ΓöÇΓöÇ Section 1: Resident Information ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Resident Information
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="residentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">
                          Resident Name
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bedroomNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">
                          Bedroom / Room Number
                        </FormLabel>
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
                        <FormLabel className="text-sm text-foreground">
                          Date of Birth
                        </FormLabel>
                        <Popover open={dobOpen} onOpenChange={setDobOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? format(new Date(field.value), "PPP")
                                  : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                field.onChange(date?.getTime());
                                setDobOpen(false);
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
                </div>
              </div>

              {/* ΓöÇΓöÇ Section 2: Consent Agreement ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  Consent Agreement
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Please confirm your understanding and agreement:
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="understandsPRN"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium">
                            I understand what PRN medication means
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            I have been informed about PRN medications and when they may be administered.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="agreesToPRN"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium">
                            I consent to PRN medication administration
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            I authorize trained care staff to administer PRN medications as prescribed by my healthcare provider.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="medicationTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">
                          Specific Medication Types (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Pain relief, Anxiety medication, etc." />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          List any specific PRN medications you are consenting to, or leave blank for all prescribed PRN medications.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">
                          Additional Notes (Optional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Any additional information, preferences, or concerns..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ΓöÇΓöÇ Section 3: Signatures ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Signatures
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="residentSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">
                          Resident Signature
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter resident signature or mark 'X' if applicable..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <p className="text-xs text-muted-foreground pt-2">
                    If consent is provided by a representative:
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="representativeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">
                            Representative Name
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Full name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="representativeRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">
                            Relationship to Resident
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Son, Daughter, Guardian" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="representativeSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">
                          Representative Signature
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Representative signature..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="representativeDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">
                          Date Signed by Representative
                        </FormLabel>
                        <Popover open={repDateOpen} onOpenChange={setRepDateOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? format(new Date(field.value), "PPP")
                                  : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                field.onChange(date?.getTime());
                                setRepDateOpen(false);
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
                </div>
              </div>

              {/* ΓöÇΓöÇ Section 4: Staff Verification ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Staff Verification
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nameStaff"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">
                            Staff Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              readOnly
                              disabled
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-foreground">
                            Date Completed
                          </FormLabel>
                          <Popover open={dateCompletedOpen} onOpenChange={setDateCompletedOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? format(new Date(field.value), "PPP")
                                    : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                captionLayout="dropdown"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  field.onChange(date?.getTime());
                                  setDateCompletedOpen(false);
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
                  </div>

                  <FormField
                    control={form.control}
                    name="staffSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-foreground">
                          Staff Signature
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            readOnly
                            disabled
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

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
          ) : existingData ? "Save Changes" : "Submit Consent"}
        </Button>
      </div>
    </div>
  );
}
