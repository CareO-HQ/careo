"use client";

import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BloodMonitoringSchema, type BloodMonitoringFormValues } from "@/schemas/residents/medication/bloodMonitoringSchema";

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  room_number?: string;
  care_homes?: { name: string };
}

interface BloodMonitoringChartFormProps {
  residentId: string;
  resident: Resident;
  teamId: string;
  organizationId: string;
  userId: string;
  userName: string;
}

interface BloodMonitoringRecord {
  id: string;
  date: string;
  time: string;
  blood_sugar: string;
  ketones?: string;
  meal_status: string;
  insulin_administered: boolean;
  site_used?: string;
  signature1: string;
  signature2?: string;
}

export default function BloodMonitoringChartForm({
  residentId,
  resident,
  teamId,
  organizationId,
  userId,
  userName,
}: BloodMonitoringChartFormProps) {
  const [records, setRecords] = useState<BloodMonitoringRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [dateOpen, setDateOpen] = useState(false);

  const form = useForm<BloodMonitoringFormValues>({
    resolver: zodResolver(BloodMonitoringSchema),
    mode: "onChange",
    defaultValues: {
      residentId,
      organizationId,
      teamId,
      userId,
      date: Date.now(),
      time: (() => {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const period = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
      })(),
      bloodSugar: "",
      ketones: "",
      mealStatus: "",
      insulinAdministered: false,
      siteUsed: "",
      signature1: userName,
      signature2: "",
    },
  });

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blood_monitoring_records")
      .select("id, date, time, blood_sugar, ketones, meal_status, insulin_administered, site_used, signature1, signature2")
      .eq("resident_id", residentId)
      .order("date", { ascending: false })
      .order("time", { ascending: false });

    if (error) {
      toast.error("Failed to fetch records: " + error.message);
    } else {
      setRecords(data as BloodMonitoringRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();

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

  function onSubmit(values: BloodMonitoringFormValues) {
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("blood_monitoring_records")
          .insert({
            resident_id: values.residentId,
            organization_id: values.organizationId,
            team_id: values.teamId,
            date: format(new Date(values.date), "yyyy-MM-dd"),
            time: (() => {
              // Convert "hh:mm AM/PM" to "HH:mm:ss"
              const [timePart, period] = values.time.split(" ");
              const [hStr, mStr] = timePart.split(":");
              let h = parseInt(hStr, 10);
              const m = parseInt(mStr, 10);
              if (period === "AM" && h === 12) h = 0;
              else if (period === "PM" && h !== 12) h += 12;
              return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
            })(),
            blood_sugar: values.bloodSugar,
            ketones: values.ketones,
            meal_status: values.mealStatus,
            insulin_administered: values.insulinAdministered,
            site_used: values.siteUsed,
            signature1: values.signature1,
            signature2: values.signature2,
            created_by: values.userId,
          });

        if (error) throw error;

        toast.success("Entry added successfully");
        form.reset({
          ...form.getValues(),
          date: Date.now(),
          time: (() => {
            const now = new Date();
            const h = now.getHours();
            const m = now.getMinutes();
            const period = h >= 12 ? "PM" : "AM";
            const hour12 = h % 12 === 0 ? 12 : h % 12;
            return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
          })(),
          bloodSugar: "",
          ketones: "",
          mealStatus: "",
          insulinAdministered: false,
          siteUsed: "",
          signature1: userName,
          signature2: "",
        });
        
        await fetchRecords();
      } catch (error) {
        toast.error("Error: " + (error as Error).message);
      }
    });
  }

  const handlePrintPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // --- Standard CareO Header ---
    const headerHeight = 22;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Green bottom border line
    doc.setFillColor(34, 197, 94); // #22c55e green
    doc.rect(0, headerHeight - 2, pageWidth, 1, "F");

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
        const canvas = document.createElement("canvas");
        canvas.width = logoImg.naturalWidth;
        canvas.height = logoImg.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(logoImg, 0, 0);
        const logoDataUrl = canvas.toDataURL("image/png");
        const logoSize = 14;
        const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
        const logoW = logoSize * aspect;
        doc.addImage(
          logoDataUrl,
          "PNG",
          pageWidth - margin - logoW,
          (headerHeight - logoSize) / 2,
          logoW,
          logoSize
        );
      } catch (e) {
        console.warn("Logo load failed", e);
      }
    }

    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.text("BLOOD MONITORING CHART \u2013 (BM)", margin, 14);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    let currentY = 32;

    const safeDate = (d: string | undefined) => {
      if (!d) return "—";
      try {
        return format(new Date(d), "dd/MM/yyyy");
      } catch {
        return "—";
      }
    };

    const residentFullName = `${resident.first_name || ""} ${resident.last_name || ""}`.trim();

    // Resident Info Box
    autoTable(doc, {
      startY: currentY,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
      },
      body: [
        ["Name of Home", resident.care_homes?.name || "—"],
        ["Resident's Name", residentFullName],
        ["Date of birth", safeDate(resident.date_of_birth)],
        ["Room No.", resident.room_number || "—"],
      ],
    });

    currentY = (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    // Body Table
    const tableData = records.map((r) => [
      format(new Date(r.date), "dd/MM/yyyy"),
      r.time.substring(0, 5),
      r.blood_sugar,
      r.ketones || "—",
      r.meal_status,
      r.insulin_administered ? "Yes" : "No",
      r.site_used || "—",
      r.signature1,
      r.signature2 || "—",
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Date", "Time", "Sugar", "Ketones", "Meal", "Insulin", "Site", "Sig 1", "Sig 2"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    doc.save(`Blood_Monitoring_${residentFullName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 text-foreground">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0 bg-background">
        <div>
          <h2 className="text-sm font-semibold">Blood Monitoring Chart (BM)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log and view blood monitoring entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={handlePrintPDF}
          >
            <Printer className="w-3 h-3" />
            Export PDF
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-6 max-w-4xl mx-auto space-y-8">
          {/* Add Entry Form */}
          <div className="border rounded-md p-4 bg-muted/5 shadow-sm space-y-4">
            <h3 className="text-sm font-medium">Add New Entry</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {/* Row 1: Date + Time */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs">Date</FormLabel>
                        <Popover open={dateOpen} onOpenChange={setDateOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full h-9 pl-3 text-left font-normal text-xs",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "dd/MM/yyyy")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(d) => {
                                if (d) {
                                  field.onChange(d.getTime());
                                  setDateOpen(false);
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => {
                      const parts = (field.value || "12:00 AM").split(" ");
                      const [hStr, mStr] = (parts[0] || "12:00").split(":");
                      const period = parts[1] || "AM";
                      const updateTime = (h: string, m: string, p: string) => {
                        field.onChange(`${h}:${m} ${p}`);
                      };
                      const hours = Array.from({ length: 12 }, (_, i) =>
                        String(i + 1).padStart(2, "0")
                      );
                      const minutes = Array.from({ length: 60 }, (_, i) =>
                        String(i).padStart(2, "0")
                      );
                      return (
                        <FormItem>
                          <FormLabel className="text-xs">Time</FormLabel>
                          <div className="flex items-center gap-1">
                            <Select
                              value={hStr || "12"}
                              onValueChange={(v) => updateTime(v, mStr || "00", period)}
                            >
                              <SelectTrigger className="h-9 text-xs flex-1">
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                              <SelectContent>
                                {hours.map((h) => (
                                  <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground text-xs">:</span>
                            <Select
                              value={mStr || "00"}
                              onValueChange={(v) => updateTime(hStr || "12", v, period)}
                            >
                              <SelectTrigger className="h-9 text-xs flex-1">
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                              <SelectContent>
                                {minutes.map((m) => (
                                  <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={period}
                              onValueChange={(v) => updateTime(hStr || "12", mStr || "00", v)}
                            >
                              <SelectTrigger className="h-9 text-xs w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM" className="text-xs">AM</SelectItem>
                                <SelectItem value="PM" className="text-xs">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {/* Row 2: Blood Sugar + Ketones */}
                  <FormField
                    control={form.control}
                    name="bloodSugar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Blood Sugar</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs" placeholder="e.g. 5.6" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ketones"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Ketones (Optional)</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs" placeholder="e.g. 0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Row 3: Pre/Post Meal + Insulin */}
                  <FormField
                    control={form.control}
                    name="mealStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Pre/Post Meal</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs" placeholder="e.g. Pre meal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="insulinAdministered"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Insulin Administered</FormLabel>
                        <Select
                          value={field.value ? "yes" : "no"}
                          onValueChange={(v) => field.onChange(v === "yes")}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes" className="text-xs">Yes</SelectItem>
                            <SelectItem value="no" className="text-xs">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Row 4: Site Used + Signatures */}
                  <FormField
                    control={form.control}
                    name="siteUsed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Site Used (Optional)</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs" placeholder="e.g. Left Index" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="signature1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Signature 1</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="signature2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Signature 2 (Optional)</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs" placeholder="Enter name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" className="h-8 shadow-sm" disabled={isPending}>
                    {isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                    Save Entry
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* History Table */}
          <div className="border rounded-md shadow-sm bg-background overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b">
              <h3 className="text-sm font-medium">Monitoring History</h3>
            </div>
            {records.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No blood monitoring records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/10">
                    <tr>
                      <th className="px-4 py-3 font-medium border-b">Date</th>
                      <th className="px-4 py-3 font-medium border-b">Time</th>
                      <th className="px-4 py-3 font-medium border-b">Sugar</th>
                      <th className="px-4 py-3 font-medium border-b">Ketones</th>
                      <th className="px-4 py-3 font-medium border-b">Meal</th>
                      <th className="px-4 py-3 font-medium border-b">Insulin</th>
                      <th className="px-4 py-3 font-medium border-b">Site</th>
                      <th className="px-4 py-3 font-medium border-b">Sig 1</th>
                      <th className="px-4 py-3 font-medium border-b">Sig 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {format(new Date(record.date), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {record.time.substring(0, 5)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-medium text-emerald-600">
                          {record.blood_sugar}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {record.ketones || "—"}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {record.meal_status}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase",
                            record.insulin_administered ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                          )}>
                            {record.insulin_administered ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {record.site_used || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {record.signature1}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {record.signature2 || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
