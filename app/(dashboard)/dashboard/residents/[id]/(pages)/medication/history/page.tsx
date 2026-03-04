"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { Resident } from "@/types";
import { cn } from "@/lib/utils";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo, useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

type MedicationHistoryPageProps = {
  params: Promise<{ id: string }>;
};

type GroupedIntake = {
  date: string;
  dateObj: Date;
  intakes: any[];
  totalCount: number;
  administeredCount: number;
  missedCount: number;
  refusedCount: number;
  skippedCount: number;
  givenCount: number;
};

type GroupedByTime = {
  time: string;
  intakes: any[];
};

export default function MedicationHistoryPage({
  params
}: MedicationHistoryPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedDateIntakeGroup, setSelectedDateIntakeGroup] = useState<GroupedIntake | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [resident, setResident] = useState<Resident | null>(null);
  const [allIntakes, setAllIntakes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: residentData } = await supabase
          .from("residents")
          .select("*")
          .eq("id", id)
          .single();

        if (residentData) setResident(residentData as Resident);

        // Fetch medication intakes
        const { data: intakes } = await supabase
          .from("medication_intakes")
          .select(`
            *,
            medication:medication_id (*)
          `)
          .eq("resident_id", id);

        // Fetch user names separately if we have user IDs
        if (intakes && intakes.length > 0) {
          const userIds = new Set<string>();
          intakes.forEach(intake => {
            if (intake.administered_by_id) userIds.add(intake.administered_by_id);
            if (intake.witness_id) userIds.add(intake.witness_id);
          });

          if (userIds.size > 0) {
            const { data: users } = await supabase
              .from("users")
              .select("id, name")
              .in("id", Array.from(userIds));

            // Map user data to intakes
            const userMap = new Map((users || []).map(u => [u.id, u]));
            intakes.forEach(intake => {
              if (intake.administered_by_id && userMap.has(intake.administered_by_id)) {
                intake.administered_by = userMap.get(intake.administered_by_id);
              }
              if (intake.witness_id && userMap.has(intake.witness_id)) {
                intake.witness = userMap.get(intake.witness_id);
              }
            });
          }
        }

        setAllIntakes(intakes || []);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Filter and group data by date
  const filteredData = useMemo(() => {
    if (!allIntakes) return [];

    let filtered = [...allIntakes];

    // Filter out future dates - only show dates up to today
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    filtered = filtered.filter((intake) => {
      const intakeDate = new Date(intake.scheduled_time);
      return intakeDate <= today;
    });

    // Filter by date range if specified
    if (dateRange?.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);

      filtered = filtered.filter((intake) => {
        const intakeDate = new Date(intake.scheduled_time);
        intakeDate.setHours(0, 0, 0, 0);

        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return intakeDate >= fromDate && intakeDate <= toDate;
        }

        return intakeDate.getTime() === fromDate.getTime();
      });
    }

    // Group by date
    const grouped = filtered.reduce(
      (acc, intake) => {
        const date = format(new Date(intake.scheduled_time), "yyyy-MM-dd");
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(intake);
        return acc;
      },
      {} as Record<string, any[]>
    );

    // Transform to array with aggregated stats
    const groupedArray: GroupedIntake[] = Object.entries(grouped).map(
      ([date, intakes]) => {
        const dateObj = new Date(date);
        const intakesArray = intakes as any[];
        // Use status if available, otherwise fall back to state
        const getStatus = (i: any) => i.status || i.state || "scheduled";
        return {
          date,
          dateObj,
          intakes: intakesArray,
          totalCount: intakesArray.length,
          administeredCount: intakesArray.filter(
            (i) => {
              const status = getStatus(i);
              return status === "administered" || status === "given";
            }
          ).length,
          givenCount: intakesArray.filter((i) => getStatus(i) === "given").length,
          missedCount: intakesArray.filter((i) => getStatus(i) === "missed").length,
          refusedCount: intakesArray.filter((i) => getStatus(i) === "refused").length,
          skippedCount: intakesArray.filter((i) => getStatus(i) === "skipped").length
        };
      }
    );

    // Sort by date (most recent first)
    return groupedArray.sort(
      (a, b) => b.dateObj.getTime() - a.dateObj.getTime()
    );
  }, [allIntakes, dateRange]);

  const organizeIntakesByCategory = (intakes: any[], selectedDate: Date) => {
    const scheduled: Record<string, any[]> = {};
    const prn: any[] = [];
    const topical: any[] = [];

    const now = new Date();
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    const todayStr = format(now, "yyyy-MM-dd");
    const isToday = selectedDateStr === todayStr;
    const isPastDate = selectedDate < new Date(todayStr);
    const currentTime = format(now, "HH:mm");

    const groupedByTime: Record<string, any[]> = {};

    intakes.forEach((intake) => {
      const medication = intake.medication;

      // If medication data is missing, treat as scheduled
      if (!medication) {
        const time = intake.scheduled_time ? format(new Date(intake.scheduled_time), "HH:mm") : "Unknown";
        if (!groupedByTime[time]) {
          groupedByTime[time] = [];
        }
        groupedByTime[time].push(intake);
        return;
      }

      if (medication.schedule_type === "PRN (As Needed)") {
        prn.push(intake);
      } else if (medication.route === "Topical") {
        topical.push(intake);
      } else {
        const time = intake.scheduled_time ? format(new Date(intake.scheduled_time), "HH:mm") : "Unknown";
        if (!groupedByTime[time]) {
          groupedByTime[time] = [];
        }
        groupedByTime[time].push(intake);
      }
    });

    // For past dates or today's completed rounds, show all scheduled medications
    Object.entries(groupedByTime).forEach(([time, timeIntakes]) => {
      if (isPastDate) {
        // For past dates, always show all medications
        scheduled[time] = timeIntakes;
      } else if (isToday) {
        // For today, only show if time has passed or round is completed
        const isRoundCompleted = timeIntakes.every(
          (intake) => {
            const status = intake.status || intake.state || "scheduled";
            return status !== "scheduled";
          }
        );
        if (time <= currentTime || isRoundCompleted) {
          scheduled[time] = timeIntakes;
        }
      } else {
        // For future dates (shouldn't happen in history, but handle it)
        scheduled[time] = timeIntakes;
      }
    });

    const scheduledArray: GroupedByTime[] = Object.entries(scheduled)
      .map(([time, intakes]) => ({ time, intakes }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return { scheduled: scheduledArray, prn, topical };
  };

  const generatePDFFromHTML = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medication History Report</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              color: #111827;
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            th {
              background-color: #f9fafb;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          ${content}
          <div class="no-print" style="margin-top: 24px; text-align: center;">
            <button onclick="window.print()" style="padding: 12px 24px; background-color: #111827; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;">
              Print PDF
            </button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
  };

  const generatePDFContent = ({ resident, groupedIntake, date }: { resident: Resident; groupedIntake: GroupedIntake; date: string }) => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const { scheduled, prn, topical } = organizeIntakesByCategory(groupedIntake.intakes, groupedIntake.dateObj);

    // Flatten scheduled medications (remove time grouping)
    const allScheduledMedications = scheduled.flatMap(group => group.intakes);

    const renderMedicationRow = (intake: any) => {
      const status = intake.status || intake.state || "scheduled";
      const time = intake.scheduled_time ? format(new Date(intake.scheduled_time), "HH:mm") : "-";
      const quantity = intake.quantity || 1;

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; vertical-align: top;">
            <strong>${time}</strong>
          </td>
          <td style="padding: 12px; vertical-align: top;">
            <strong>${intake.medication?.name || "N/A"}</strong><br>
            <span style="color: #6b7280; font-size: 12px;">
              ${intake.medication?.strength || ""} ${intake.medication?.strength_unit || ""} - 
              ${intake.medication?.dosage_form || "N/A"}
            </span><br>
            <span style="color: #6b7280; font-size: 12px;">Route: ${intake.medication?.route || "N/A"}</span>
          </td>
          <td style="padding: 12px; vertical-align: top;">
            ${quantity}
          </td>
          <td style="padding: 12px; vertical-align: top;">
            <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; ${getStateBadgeStyle(status).includes('green') ? 'background-color: #dcfce7; color: #166534;' : getStateBadgeStyle(status).includes('red') ? 'background-color: #fee2e2; color: #991b1b;' : getStateBadgeStyle(status).includes('orange') ? 'background-color: #fed7aa; color: #9a3412;' : 'background-color: #f3f4f6; color: #374151;'}">
              ${status}
            </span>
          </td>
          <td style="padding: 12px; vertical-align: top; font-size: 14px;">
            <div>${intake.administered_by?.name || "-"}</div>
            ${intake.witness?.name ? `<div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Witness: ${intake.witness.name}</div>` : ""}
          </td>
          <td style="padding: 12px; vertical-align: top; font-size: 14px; font-style: italic; color: #6b7280;">
            ${intake.comment || intake.notes || "-"}
          </td>
        </tr>
      `;
    };

    const tableHeaderInfo = `
      <thead style="background-color: #f9fafb;">
        <tr>
          <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Time</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Medication</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Qty</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Status</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Administered By</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Notes</th>
        </tr>
      </thead>
    `;

    let scheduledHTML = "";
    if (allScheduledMedications.length > 0) {
      scheduledHTML = `
        <div style="margin-bottom: 24px;">
          <h3 style="margin-bottom: 12px; color: #374151;">Scheduled Medications</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
            ${tableHeaderInfo}
            <tbody>
              ${allScheduledMedications.map(renderMedicationRow).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    let prnHTML = "";
    if (prn.length > 0) {
      prnHTML = `
        <div style="margin-bottom: 24px;">
          <h3 style="margin-bottom: 12px; color: #374151;">PRN (As Needed) Medications</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
            ${tableHeaderInfo}
            <tbody>
              ${prn.map(renderMedicationRow).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    let topicalHTML = "";
    if (topical.length > 0) {
      topicalHTML = `
        <div style="margin-bottom: 24px;">
          <h3 style="margin-bottom: 12px; color: #374151;">Topical Medications</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
            ${tableHeaderInfo}
            <tbody>
              ${topical.map(renderMedicationRow).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    return `
      <div class="header" style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb;">
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #111827;">Medication History Report</h1>
        <p style="margin: 0; color: #6b7280; font-size: 16px;">${resident.first_name} ${resident.last_name}</p>
      </div>

      <div class="info-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
        <div class="info-box" style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Report Date</h3>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${formattedDate}</p>
        </div>
        <div class="info-box" style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Total Medications</h3>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${groupedIntake.totalCount}</p>
        </div>
        <div class="info-box" style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Administered</h3>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #16a34a;">${groupedIntake.administeredCount}</p>
        </div>
        <div class="info-box" style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Missed / Refused</h3>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #dc2626;">${groupedIntake.missedCount + groupedIntake.refusedCount}</p>
        </div>
      </div>

      <div class="medications" style="margin-top: 24px;">
        <h2 style="margin-bottom: 16px; font-size: 18px; font-weight: 600; color: #111827;">Medication Details</h2>
        ${scheduledHTML}
        ${prnHTML}
        ${topicalHTML}
        ${allScheduledMedications.length === 0 && prn.length === 0 && topical.length === 0 ? '<p style="color: #6b7280; font-style: italic;">No medications recorded for this date.</p>' : ''}
      </div>
    `;
  };

  const handleViewClick = (groupedIntake: GroupedIntake) => {
    setSelectedDateIntakeGroup(groupedIntake);
    setIsSheetOpen(true);
  };

  const handleDownloadPDF = (groupedIntake: GroupedIntake) => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    const pdfContent = generatePDFContent({
      resident,
      groupedIntake,
      date: groupedIntake.date
    });

    generatePDFFromHTML(pdfContent);
    toast.success('Medication history report will open for printing');
  };

  const groupedColumns: ColumnDef<GroupedIntake>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dateObj = row.original.dateObj;
        const isToday = format(dateObj, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
        return (
          <div className="flex items-center gap-2">
            <p className="font-medium">{format(dateObj, "MMM dd, yyyy")}</p>
            {isToday && (
              <Badge variant="secondary" className="text-xs">Today</Badge>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: "stats",
      header: "Summary",
      cell: ({ row }) => {
        const { totalCount, administeredCount, missedCount, refusedCount } = row.original;
        return (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Total: {totalCount}</span>
            {administeredCount > 0 && (
              <span className="text-green-600 font-medium">✓ {administeredCount}</span>
            )}
            {missedCount > 0 && (
              <span className="text-red-600 font-medium">✗ {missedCount}</span>
            )}
            {refusedCount > 0 && (
              <span className="text-orange-600 font-medium">⊘ {refusedCount}</span>
            )}
          </div>
        );
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const groupedIntake = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleViewClick(groupedIntake);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadPDF(groupedIntake);
              }}
            >
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        );
      }
    }
  ];

  const table = useReactTable({
    data: filteredData,
    columns: groupedColumns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    initialState: { pagination: { pageSize: 25 } }
  });

  const downloadCSV = () => {
    const allIntakesForExport = table.getFilteredRowModel().rows.flatMap(row => row.original.intakes);
    if (!allIntakesForExport.length) return;

    const csvData = allIntakesForExport.map(intake => ({
      Date: format(new Date(intake.scheduled_time), "MMM dd, yyyy"),
      Time: format(new Date(intake.scheduled_time), "HH:mm"),
      Medication: intake.medication?.name || "N/A",
      Strength: intake.medication ? `${intake.medication.strength} ${intake.medication.strength_unit}` : "N/A",
      "Dosage Form": intake.medication?.dosage_form || "N/A",
      Route: intake.medication?.route || "N/A",
      Quantity: intake.quantity || 1,
      Status: intake.status || intake.state || "scheduled",
      "Popped Out": intake.popped_out_at ? format(new Date(intake.popped_out_at), "HH:mm") : "-",
      Notes: intake.comment || intake.notes || ""
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => headers.map(h => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `medication-history-${resident?.first_name}-${resident?.last_name}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const getStateBadgeStyle = (status: string) => {
    switch (status) {
      case "given":
      case "administered":
        return "bg-green-100 text-green-800";
      case "missed":
        return "bg-red-100 text-red-800";
      case "refused":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><p>Loading medication history...</p></div>;
  }

  if (!resident) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg font-semibold">Resident not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="font-semibold text-xl">Medication History</h1>
            <p className="text-sm text-muted-foreground">History for {resident.first_name} {resident.last_name}</p>
          </div>
        </div>
        <Button onClick={downloadCSV} variant="outline" disabled={filteredData.length === 0}><Download className="mr-2 h-4 w-4" />Download CSV</Button>
      </div>

      <div className="flex gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground text-sm")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : "Pick a date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={dateRange} onSelect={setDateRange} disabled={d => d > new Date()} numberOfMonths={2} />
          </PopoverContent>
        </Popover>
        {dateRange && <Button variant="ghost" onClick={() => setDateRange(undefined)}>Clear</Button>}
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {row.getVisibleCells().map(c => <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>)}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={groupedColumns.length} className="h-24 text-center">No history found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedDateIntakeGroup && format(selectedDateIntakeGroup.dateObj, "EEEE, MMMM dd, yyyy")}</SheetTitle>
            <SheetDescription>Detailed medication list for this date</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-8">
            {selectedDateIntakeGroup && (() => {
              const { scheduled, prn, topical } = organizeIntakesByCategory(selectedDateIntakeGroup.intakes, selectedDateIntakeGroup.dateObj);

              // Flatten scheduled medications (remove time grouping)
              const allScheduledMedications = scheduled.flatMap(group => group.intakes);

              const renderMedicationTable = (intakes: any[], title?: string) => {
                if (!intakes || intakes.length === 0) return null;

                return (
                  <div className="space-y-3">
                    {title && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md w-fit">
                        <span className="font-semibold text-sm">{title}</span>
                      </div>
                    )}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Medication</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Administered By</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {intakes.map(intake => (
                            <TableRow key={intake.id}>
                              <TableCell className="font-medium">
                                {format(new Date(intake.scheduled_time), "HH:mm")}
                              </TableCell>
                              <TableCell>
                                <p className="font-medium">{intake.medication?.name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">{intake.medication?.strength || ""} {intake.medication?.strength_unit || ""}</p>
                              </TableCell>
                              <TableCell>
                                {intake.quantity || 1}
                              </TableCell>
                              <TableCell><Badge className={getStateBadgeStyle(intake.status || intake.state || "scheduled")} variant="outline">{intake.status || intake.state || "scheduled"}</Badge></TableCell>
                              <TableCell className="text-sm">
                                <div>{intake.administered_by?.name || "-"}</div>
                                {intake.witness?.name && <div className="text-xs text-muted-foreground">Witness: {intake.witness.name}</div>}
                              </TableCell>
                              <TableCell className="text-sm italic">{intake.comment || intake.notes || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              };

              // Show all scheduled medications in a single table
              const scheduledElement = renderMedicationTable(allScheduledMedications, "Scheduled Medications");

              // Show PRN medications
              const prnElement = renderMedicationTable(prn, "PRN (As Needed) Medications");

              // Show Topical medications
              const topicalElement = renderMedicationTable(topical, "Topical Medications");

              // Check if there's any content to show
              const hasContent = allScheduledMedications.length > 0 || prn.length > 0 || topical.length > 0;

              if (!hasContent) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-muted-foreground">No medications recorded for this date.</p>
                  </div>
                );
              }

              return (
                <>
                  {scheduledElement}
                  {prnElement}
                  {topicalElement}
                </>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
