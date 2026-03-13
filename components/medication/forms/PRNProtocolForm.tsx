"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { PRNProtocolSchema } from "@/schemas/residents/medication/prnProtocolSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, Loader2, Pencil, Save, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  care_homes?: { name: string };
}

interface PRNProtocolFormProps {
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
    return format(d, "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

// ─── Completed Document View ──────────────────────────────────────────────────

function PRNProtocolDocumentView({
  data,
  orgLogoUrl,
  onEdit,
}: {
  data: Record<string, unknown>;
  orgLogoUrl?: string | null;
  onEdit: () => void;
}) {
  const handlePrintPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // --- Standard CareO Header ---
    const headerHeight = 22;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Green bottom border line
    doc.setFillColor(34, 197, 94); // #22c55e green
    doc.rect(0, headerHeight - 2, pageWidth, 1, 'F');

    // Title
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PRN PROTOCOL", margin, 14);

    // Org Logo
    if (orgLogoUrl) {
      try {
        const loadImage = (src: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        };
        const logoImg = await loadImage(orgLogoUrl);
        const canvas = document.createElement('canvas');
        canvas.width = logoImg.naturalWidth;
        canvas.height = logoImg.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(logoImg, 0, 0);
        const logoDataUrl = canvas.toDataURL('image/png');
        const logoSize = 14;
        const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
        const logoW = logoSize * aspect;
        doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - logoW, (headerHeight - logoSize) / 2, logoW, logoSize);
      } catch (e) {
        console.warn("Logo load failed", e);
      }
    }

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    let currentY = 32;
    doc.text(
      `Resident: ${data.serviceUsersName || "—"} (DOB: ${safeDate(data.dob)})`,
      margin,
      currentY
    );
    doc.text(`Medication: ${data.nameOfMedication || "—"}`, margin, currentY + 6);
    currentY += 12;

    // Document Data Array for the main table
    const tableData = [
      ["Home Name", String(data.homeName || "—"), "Room No.", String(data.roomNo || "—")],
      ["Service User's Name", String(data.serviceUsersName || "—"), "D.O.B", safeDate(data.dob)],
      ["Name of medication", String(data.nameOfMedication || "—"), "Form", String(data.form || "—")],
      ["Route of administration", String(data.routeOfAdministration || "—"), "Strength", String(data.strength || "—")],
      ["Name of prescriber", { content: String(data.nameOfPrescriber || "—"), colSpan: 3 }],
      // Empty row acting as separator
      [{ content: "", colSpan: 4, styles: { fillColor: [240, 240, 240], minCellHeight: 6 } }],
      ["Dosage", { content: String(data.dosageCircumstances || "—"), colSpan: 3 }],
      ["Frequency of doses", { content: String(data.frequencyOfDoses || "—"), colSpan: 3 }],
      ["Minimum time interval between doses", String(data.minimumTimeInterval || "—"), "Maximum dose in 24 hours", String(data.maximumDose24Hours || "—")],
      [{ content: "", colSpan: 4, styles: { fillColor: [240, 240, 240], minCellHeight: 6 } }],
      [{ content: "Purpose of administration", colSpan: 2 }, { content: String(data.purposeOfAdministration || "—"), colSpan: 2 }],
      [{ content: "Expected/desired outcome", colSpan: 2 }, { content: String(data.expectedOutcome || "—"), colSpan: 2 }],
      [{ content: "Other medicines being taken to be aware of", colSpan: 2 }, { content: String(data.otherMedicinesAwareness || "—"), colSpan: 2 }],
      ["Review date", safeDate(data.reviewDate), "Special instructions or additional information", String(data.specialInstructions || "—")],
      [{ content: "", colSpan: 4, styles: { fillColor: [240, 240, 240], minCellHeight: 6 } }],
      ["Name of person completing this form", { content: String(data.nameOfPersonCompleting || "—"), colSpan: 2 }, `Date: ${safeDate(data.dateCompleted)}`],
      ["Countersigned", { content: String(data.countersigned || "—"), colSpan: 2 }, `Date: ${safeDate(data.countersignedDate)}`]
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoTable(doc, {
      startY: currentY,
      body: tableData as any,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 45 },
        2: { fontStyle: "bold", cellWidth: 45 },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: function (data: { row: { index: number }, cell: any, column: { index: number } }) {
        // Additional styling for two column rows where the second column is value
        if (data.row.index >= 10 && data.row.index <= 12) {
            if(data.column.index === 0) data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    const finalY = (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 42;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Please note this protocol should be completed according to guidance from the prescriber and your care setting's policies and procedures.",
      14,
      finalY + 10,
      { maxWidth: 180 }
    );
    doc.text("©2016 Boots UK", 14, finalY + 16);
    doc.text("v.2 July 2016", 185, finalY + 16, { align: "right" });

    doc.save(`PRN_Protocol_${data.serviceUsersName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 text-foreground">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <div>
            <h2 className="text-sm font-semibold">PRN Protocol Form</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completed{data.submittedAt ? ` · ${safeDate(data.submittedAt)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-foreground">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={handlePrintPDF}>
            <Printer className="w-3 h-3" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={onEdit}>
            <Pencil className="w-3 h-3" />
            Edit
          </Button>
        </div>
      </div>

      {/* Document body */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 max-w-4xl mx-auto">
          
          <div className="border border-foreground/20 rounded-sm mb-6 bg-white text-black text-sm">
            {/* Table Header Section */}
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10">Home Name</div>
              <div className="p-2">{String(data.homeName || "—")}</div>
              <div className="p-2 font-semibold bg-muted/10">Room No.</div>
              <div className="p-2">{String(data.roomNo || "—")}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10">Service User&apos;s Name</div>
              <div className="p-2">{String(data.serviceUsersName || "—")}</div>
              <div className="p-2 font-semibold bg-muted/10">D.O.B</div>
              <div className="p-2">{safeDate(data.dob)}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10">Name of medication</div>
              <div className="p-2">{String(data.nameOfMedication || "—")}</div>
              <div className="p-2 font-semibold bg-muted/10">Form</div>
              <div className="p-2">{String(data.form || "—")}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10">Route of administration</div>
              <div className="p-2">{String(data.routeOfAdministration || "—")}</div>
              <div className="p-2 font-semibold bg-muted/10">Strength</div>
              <div className="p-2">{String(data.strength || "—")}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10 text-nowrap">Name of prescriber</div>
              <div className="p-2 col-span-3">{String(data.nameOfPrescriber || "—")}</div>
            </div>

            {/* Gap */}
            <div className="h-6 bg-muted/5 border-b border-foreground/20"></div>

            {/* Dosage Section */}
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10">
                Dosage <span className="font-normal text-xs block">(if variable, the circumstances under which each dose is required)</span>
              </div>
              <div className="p-2 col-span-3 whitespace-pre-wrap">{String(data.dosageCircumstances || "—")}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10">Frequency of doses</div>
              <div className="p-2 col-span-3 whitespace-pre-wrap">{String(data.frequencyOfDoses || "—")}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10">
                Minimum time interval between doses
              </div>
              <div className="p-2">{String(data.minimumTimeInterval || "—")}</div>
              <div className="p-2 font-semibold bg-muted/10">Maximum dose in 24 hours</div>
              <div className="p-2">{String(data.maximumDose24Hours || "—")}</div>
            </div>

            {/* Gap */}
            <div className="h-6 bg-muted/5 border-b border-foreground/20"></div>

            {/* Purpose Section */}
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10 col-span-2">
                Purpose of administration <span className="font-normal text-xs">(When it should be given, signs and symptoms)</span>
              </div>
              <div className="p-2 col-span-2 whitespace-pre-wrap">{String(data.purposeOfAdministration || "—")}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10 col-span-2">
                Expected/desired outcome <span className="font-normal text-xs">(Has it worked? Observations)</span>
              </div>
              <div className="p-2 col-span-2 whitespace-pre-wrap">{String(data.expectedOutcome || "—")}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10 col-span-2">
                Other medicines being taken to be aware of <span className="font-normal text-xs">(e.g. possible interactions)</span>
              </div>
              <div className="p-2 col-span-2 whitespace-pre-wrap">{String(data.otherMedicinesAwareness || "—")}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10">Review date</div>
              <div className="p-2">{safeDate(data.reviewDate)}</div>
              <div className="p-2 font-semibold bg-muted/10">Special instructions or additional information</div>
              <div className="p-2 whitespace-pre-wrap">{String(data.specialInstructions || "—")}</div>
            </div>

            {/* Gap */}
            <div className="h-6 bg-muted/5 border-b border-foreground/20"></div>

            {/* Signatures Section */}
            <div className="grid grid-cols-4 border-b border-foreground/20 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10">Name of person completing this form</div>
              <div className="p-2 col-span-2 font-handwriting text-lg">{String(data.nameOfPersonCompleting || "—")}</div>
              <div className="p-2 border-l border-foreground/20 flex flex-col justify-center">
                <span className="font-semibold text-xs text-muted-foreground uppercase">Date</span>
                {safeDate(data.dateCompleted)}
              </div>
            </div>
            <div className="grid grid-cols-4 divide-x divide-foreground/20">
              <div className="p-2 font-semibold bg-muted/10">Countersigned</div>
              <div className="p-2 col-span-2 font-handwriting text-lg">{String(data.countersigned || "—")}</div>
              <div className="p-2 border-l border-foreground/20 flex flex-col justify-center">
                <span className="font-semibold text-xs text-muted-foreground uppercase">Date</span>
                {safeDate(data.countersignedDate)}
              </div>
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PRNProtocolForm({
  residentId,
  resident,
  teamId,
  organizationId,
  userId,
  userName,
  onSaved,
}: PRNProtocolFormProps) {
  const [existingData, setExistingData] = useState<Record<string, unknown> | undefined>(undefined);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  
  const [dobOpen, setDobOpen] = useState(false);
  const [reviewDateOpen, setReviewDateOpen] = useState(false);
  const [dateCompletedOpen, setDateCompletedOpen] = useState(false);
  const [countersignedDateOpen, setCountersignedDateOpen] = useState(false);

  const residentFullName = `${resident.first_name ?? ""} ${resident.last_name ?? ""}`.trim();

  const form = useForm<z.infer<typeof PRNProtocolSchema>>({
    resolver: zodResolver(PRNProtocolSchema),
    mode: "onChange",
    defaultValues: {
      residentId,
      teamId,
      organizationId,
      userId,
      homeName: resident.care_homes?.name || "",
      roomNo: resident.room_number || "",
      serviceUsersName: residentFullName,
      dob: resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
      nameOfMedication: "",
      form: "",
      routeOfAdministration: "",
      strength: "",
      nameOfPrescriber: "",
      dosageCircumstances: "",
      frequencyOfDoses: "",
      minimumTimeInterval: "",
      maximumDose24Hours: "",
      purposeOfAdministration: "",
      expectedOutcome: "",
      otherMedicinesAwareness: "",
      reviewDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
      specialInstructions: "",
      nameOfPersonCompleting: userName,
      dateCompleted: Date.now(),
      countersigned: "",
      countersignedDate: undefined,
    },
  });

  // Load existing data
  useEffect(() => {
    if (!residentId) return;
    supabase
      .from("prn_protocols")
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
            form.reset({ residentId, teamId, organizationId, userId, ...ad } as z.infer<typeof PRNProtocolSchema>);
          }
        }
        setLoadingExisting(false);
      });

    if (organizationId) {
      supabase
        .from("organizations")
        .select("logo_url")
        .eq("id", organizationId)
        .single()
        .then(({ data }) => {
          if (data?.logo_url) setOrgLogoUrl(data.logo_url);
        });
    }
  }, [residentId, organizationId]);

  function onSubmit(values: z.infer<typeof PRNProtocolSchema>) {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          status: "completed",
          assessment_data: { ...values, submittedAt: new Date().toISOString() },
          assessment_date: format(new Date(values.dateCompleted), "yyyy-MM-dd"),
          completed_by: values.nameOfPersonCompleting,
          created_by: userId,
        };
        await submitAssessmentWithVersioning(
          "prn_protocols",
          payload,
          existingData as { id?: string; version_number?: number } | undefined,
          !!existingData
        );
        toast.success(existingData ? "PRN protocol updated successfully" : "PRN protocol submitted successfully");
        
        // Refresh local state
        const { data } = await supabase
          .from("prn_protocols")
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

  if (existingData && !isEditing) {
    const ad = (existingData.assessment_data as Record<string, unknown>) ?? existingData;
    return <PRNProtocolDocumentView data={ad} orgLogoUrl={orgLogoUrl} onEdit={() => setIsEditing(true)} />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 text-foreground">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold">PRN Protocol Form</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {existingData ? "Editing protocol" : "New protocol"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {existingData && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
          <Button
            variant="default"
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
            {existingData ? "Save Changes" : "Submit Protocol"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-6 max-w-4xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Header Section */}
              <div className="grid grid-cols-4 gap-4 p-4 border rounded-md bg-muted/5">
                <FormField control={form.control} name="homeName" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-xs">Home Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="roomNo" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-xs">Room No.</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="serviceUsersName" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-xs">Service User&apos;s Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dob" render={({ field }) => (
                  <FormItem className="col-span-2 flex flex-col">
                    <FormLabel className="text-xs mt-2 mb-1">D.O.B</FormLabel>
                    <Popover open={dobOpen} onOpenChange={setDobOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full h-10 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => { field.onChange(d?.getTime()); setDobOpen(false); }} disabled={(d) => d > new Date() || d < new Date("1900-01-01")} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="nameOfMedication" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-xs">Name of medication</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="form" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-xs">Form</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="routeOfAdministration" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-xs">Route of administration</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="strength" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-xs">Strength</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="nameOfPrescriber" render={({ field }) => (
                  <FormItem className="col-span-4">
                    <FormLabel className="text-xs">Name of prescriber</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Dosage Details Section */}
              <div className="p-4 border rounded-md space-y-4 shadow-sm">
                <FormField control={form.control} name="dosageCircumstances" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Dosage <span className="font-normal text-muted-foreground">(if variable, the circumstances under which each dose is required)</span>
                    </FormLabel>
                    <FormControl><Textarea {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="frequencyOfDoses" render={({ field }) => (
                  <FormItem>
                     <FormLabel className="text-xs">Frequency of doses</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="minimumTimeInterval" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Minimum time interval between doses</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="maximumDose24Hours" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Maximum dose in 24 hours</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Administration & Outcomes Section */}
              <div className="space-y-4 p-4 border rounded-md shadow-sm">
                <FormField control={form.control} name="purposeOfAdministration" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Purpose of administration <span className="font-normal text-muted-foreground">(When it should be given, signs and symptoms)</span>
                    </FormLabel>
                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expectedOutcome" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Expected/desired outcome <span className="font-normal text-muted-foreground">(Has it worked? Observations)</span>
                    </FormLabel>
                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="otherMedicinesAwareness" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Other medicines being taken to be aware of <span className="font-normal text-muted-foreground">(e.g. possible interactions)</span>
                    </FormLabel>
                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

               {/* Review & Instructions Section */}
               <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/5 shadow-sm">
                <FormField control={form.control} name="reviewDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs mt-2 mb-1">Review date</FormLabel>
                    <Popover open={reviewDateOpen} onOpenChange={setReviewDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full h-10 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => { field.onChange(d?.getTime()); setReviewDateOpen(false); }} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="specialInstructions" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs mt-2 mb-1">
                      Special instructions or additional information
                    </FormLabel>
                    <FormControl><Textarea {...field} className="min-h-[40px] resize-y" rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Signing Section */}
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-md shadow-sm">
                <FormField control={form.control} name="nameOfPersonCompleting" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Name of person completing this form</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dateCompleted" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs mt-2 mb-1">Date</FormLabel>
                    <Popover open={dateCompletedOpen} onOpenChange={setDateCompletedOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full h-10 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => { field.onChange(d?.getTime()); setDateCompletedOpen(false); }} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="countersigned" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Countersigned</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="countersignedDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs mt-2 mb-1">Date</FormLabel>
                    <Popover open={countersignedDateOpen} onOpenChange={setCountersignedDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full h-10 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => { field.onChange(d?.getTime()); setCountersignedDateOpen(false); }} disabled={(d) => d > new Date()} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

            </form>
          </Form>
        </div>
      </ScrollArea>
    </div>
  );
}
