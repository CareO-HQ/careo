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
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { PhotographyConsentSchema } from "@/schemas/residents/care-file/photographySchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, Loader2, Pencil, Printer, Save } from "lucide-react";
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
  room_number?: string;
}

interface PhotographyConsentFormProps {
  residentId: string;
  resident: Resident;
  teamId: string;
  organizationId: string;
  userId: string;
  userName: string;
  onSaved: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Completed Document View ──────────────────────────────────────────────────

function PhotographyDocumentView({
  data,
  onEdit,
}: {
  data: Record<string, unknown>;
  onEdit: () => void;
}) {
  const consentItems = [
    { key: "healthcareRecords", label: "Healthcare Records", description: "Photography for medical documentation, wound care monitoring, and healthcare record purposes." },
    { key: "socialActivitiesInternal", label: "Internal Social Activities", description: "Photography during internal activities, celebrations, and events for internal facility use only." },
    { key: "socialActivitiesExternal", label: "External Social Activities & Marketing", description: "Photography for marketing materials, website, social media, newsletters, and promotional activities." },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <div>
            <h2 className="text-sm font-semibold">Photography Consent Form</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completed{data.submittedAt ? ` · ${safeDate(data.submittedAt)}` : ""}
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
        <div className="p-12 pb-30">
          <div className="max-w-4xl mx-auto">
            <div className="border rounded-lg bg-white shadow-sm p-8 print:border-0 print:shadow-none print:p-0">
              <div className="space-y-8 divide-y divide-border">

                {/* Resident Information */}
                <div className="pt-0">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-4">
                    Resident Information
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                      <p className="text-sm font-bold text-foreground">Resident Name</p>
                      <p className="text-sm">{String(data.residentName || "—")}</p>
                    </div>
                    <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                      <p className="text-sm font-bold text-foreground">Room Number</p>
                      <p className="text-sm">{String(data.bedroomNumber || "—")}</p>
                    </div>
                    <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                      <p className="text-sm font-bold text-foreground">Date of Birth</p>
                      <p className="text-sm">{safeDate(data.dateOfBirth)}</p>
                    </div>
                  </div>
                </div>

                {/* Consent Permissions */}
                <div className="pt-8">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-4">
                    Consent Permissions
                  </p>
                  <div className="space-y-3">
                    {consentItems.map(({ key, label, description }) => {
                      const granted = !!data[key];
                      return (
                        <div key={key} className="flex items-start gap-3 p-3 rounded-md border bg-muted/10">
                          <div className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded-sm border-2 flex items-center justify-center ${granted ? "bg-green-500 border-green-500" : "border-muted-foreground"}`}>
                            {granted && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${granted ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                            <p className={`text-xs mt-1 font-medium ${granted ? "text-green-600" : "text-red-500"}`}>
                              {granted ? "Consent granted" : "Not consented"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-8">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-4">
                    Signatures
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                      <p className="text-sm font-bold text-foreground">Resident Signature</p>
                      <p className="text-sm">{String(data.residentSignature || "—")}</p>
                    </div>
                    {data.representativeName && (
                      <>
                        <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                          <p className="text-sm font-bold text-foreground">Representative Name</p>
                          <p className="text-sm">{String(data.representativeName)}</p>
                        </div>
                        <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                          <p className="text-sm font-bold text-foreground">Relationship</p>
                          <p className="text-sm">{String(data.representativeRelationship || "—")}</p>
                        </div>
                        <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                          <p className="text-sm font-bold text-foreground">Representative Signature</p>
                          <p className="text-sm">{String(data.representativeSignature || "—")}</p>
                        </div>
                        <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                          <p className="text-sm font-bold text-foreground">Date Signed</p>
                          <p className="text-sm">{safeDate(data.representativeDate)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Staff Verification */}
                <div className="pt-8">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-4">
                    Staff Verification
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                      <p className="text-sm font-bold text-foreground">Staff Name</p>
                      <p className="text-sm">{String(data.nameStaff || "—")}</p>
                    </div>
                    <div className="grid grid-cols-[1fr_1.5fr] gap-2 items-start">
                      <p className="text-sm font-bold text-foreground">Date Completed</p>
                      <p className="text-sm">{safeDate(data.date)}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PhotographyConsentForm({
  residentId,
  resident,
  teamId,
  organizationId,
  userId,
  userName,
  onSaved,
}: PhotographyConsentFormProps) {
  const [existingData, setExistingData] = useState<Record<string, unknown> | undefined>(undefined);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [dobOpen, setDobOpen] = useState(false);
  const [repDateOpen, setRepDateOpen] = useState(false);
  const [dateCompletedOpen, setDateCompletedOpen] = useState(false);

  const residentFullName = `${resident.first_name ?? ""} ${resident.last_name ?? ""}`.trim();

  const form = useForm<z.infer<typeof PhotographyConsentSchema>>({
    resolver: zodResolver(PhotographyConsentSchema),
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
      healthcareRecords: false,
      socialActivitiesInternal: false,
      socialActivitiesExternal: false,
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
      .from("photography_consents")
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
            form.reset({ residentId, teamId, organizationId, userId, ...ad } as z.infer<typeof PhotographyConsentSchema>);
          }
        }
        setLoadingExisting(false);
      });
  }, [residentId]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: z.infer<typeof PhotographyConsentSchema>) {
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
          "photography_consents",
          payload,
          existingData as { id?: string; version_number?: number } | undefined,
          !!existingData
        );
        toast.success(existingData ? "Consent form updated successfully" : "Consent form submitted successfully");
        // Refresh and switch to document view
        const { data } = await supabase
          .from("photography_consents")
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
    return <PhotographyDocumentView data={ad} onEdit={() => setIsEditing(true)} />;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold">Photography Consent Form</h2>
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

              {/* ── Section 1: Resident Information ─────────────────── */}
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
                          <span className="text-muted-foreground mr-1.5">1.</span>
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
                          <span className="text-muted-foreground mr-1.5">2.</span>
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
                          <span className="text-muted-foreground mr-1.5">3.</span>
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

              {/* ── Section 2: Consent Permissions ──────────────────── */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  Consent Permissions
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Select the types of photography and image use you consent to:
                </p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="healthcareRecords"
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
                            Healthcare Records
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Photography for medical documentation, wound care monitoring, and healthcare record purposes.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialActivitiesInternal"
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
                            Internal Social Activities
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Photography during internal activities, celebrations, and events for internal facility use only.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialActivitiesExternal"
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
                            External Social Activities &amp; Marketing
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Photography for marketing materials, website, social media, newsletters, and promotional activities.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Section 3: Signatures ────────────────────────────── */}
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

              {/* ── Section 4: Staff Verification ───────────────────── */}
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
