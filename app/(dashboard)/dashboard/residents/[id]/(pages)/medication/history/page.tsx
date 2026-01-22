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
  Download
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo, useState, useEffect } from "react";
import { DateRange } from "react-day-picker";

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

        const { data: intakes } = await supabase
          .from("medication_intakes")
          .select(`
            *,
            medication:medication_id (*),
            administered_by:administered_by_id (name),
            witness:witness_id (name)
          `)
          .eq("resident_id", id);

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
        return {
          date,
          dateObj,
          intakes: intakesArray,
          totalCount: intakesArray.length,
          administeredCount: intakesArray.filter(
            (i) => i.status === "administered" || i.status === "given"
          ).length,
          givenCount: intakesArray.filter((i) => i.status === "given").length,
          missedCount: intakesArray.filter((i) => i.status === "missed").length,
          refusedCount: intakesArray.filter((i) => i.status === "refused").length,
          skippedCount: intakesArray.filter((i) => i.status === "skipped").length
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
    const isToday = format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
    const currentTime = format(now, "HH:mm");

    const groupedByTime: Record<string, any[]> = {};

    intakes.forEach((intake) => {
      const medication = intake.medication;

      if (medication?.schedule_type === "PRN (As Needed)") {
        prn.push(intake);
      } else if (medication?.route === "Topical") {
        topical.push(intake);
      } else {
        const time = format(new Date(intake.scheduled_time), "HH:mm");
        if (!groupedByTime[time]) {
          groupedByTime[time] = [];
        }
        groupedByTime[time].push(intake);
      }
    });

    Object.entries(groupedByTime).forEach(([time, timeIntakes]) => {
      const isRoundCompleted = timeIntakes.every(
        (intake) => intake.status !== "scheduled"
      );

      if (!isToday || time <= currentTime || isRoundCompleted) {
        scheduled[time] = timeIntakes;
      }
    });

    const scheduledArray: GroupedByTime[] = Object.entries(scheduled)
      .map(([time, intakes]) => ({ time, intakes }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return { scheduled: scheduledArray, prn, topical };
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

  const handleRowClick = (groupedIntake: GroupedIntake) => {
    setSelectedDateIntakeGroup(groupedIntake);
    setIsSheetOpen(true);
  };

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
      Status: intake.status,
      "Popped Out": intake.popped_out_at ? format(new Date(intake.popped_out_at), "HH:mm") : "-",
      Notes: intake.comment || ""
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
                <TableRow key={row.id} onClick={() => handleRowClick(row.original)} className="cursor-pointer hover:bg-muted/30">
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
              const { scheduled } = organizeIntakesByCategory(selectedDateIntakeGroup.intakes, selectedDateIntakeGroup.dateObj);
              return scheduled.map(group => (
                <div key={group.time} className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md w-fit">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{group.time}</span>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Medication</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Administered By</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.intakes.map(intake => (
                          <TableRow key={intake.id}>
                            <TableCell>
                              <p className="font-medium">{intake.medication?.name}</p>
                              <p className="text-xs text-muted-foreground">{intake.medication?.strength} {intake.medication?.strength_unit}</p>
                            </TableCell>
                            <TableCell><Badge className={getStateBadgeStyle(intake.status)} variant="outline">{intake.status}</Badge></TableCell>
                            <TableCell className="text-sm">
                              <div>{intake.administered_by?.name || "-"}</div>
                              {intake.witness?.name && <div className="text-xs text-muted-foreground">Witness: {intake.witness.name}</div>}
                            </TableCell>
                            <TableCell className="text-sm italic">{intake.comment || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ));
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
