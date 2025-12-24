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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
import { useQuery } from "convex/react";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Pill,
  Droplet
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
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
  const [selectedDate, setSelectedDate] = useState<GroupedIntake | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const resident = useQuery(api.residents.getById, {
    residentId: (id as Id<"residents">) ?? "skip"
  }) as any;

  const allIntakes = useQuery(
    api.medication.getAllMedicationIntakesByResidentId,
    id ? { residentId: id } : "skip"
  );

  // Filter and group data by date
  const filteredData = useMemo(() => {
    if (!allIntakes) return [];

    let filtered = [...allIntakes];

    // Filter out future dates - only show dates up to today
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    filtered = filtered.filter((intake) => {
      const intakeDate = new Date(intake.scheduledTime);
      return intakeDate <= today;
    });

    // Filter by date range if specified
    if (dateRange?.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);

      filtered = filtered.filter((intake) => {
        const intakeDate = new Date(intake.scheduledTime);
        intakeDate.setHours(0, 0, 0, 0);

        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return intakeDate >= fromDate && intakeDate <= toDate;
        }

        // If only "from" date is selected, filter for that specific day
        return intakeDate.getTime() === fromDate.getTime();
      });
    }

    // Group by date
    const grouped = filtered.reduce(
      (acc, intake) => {
        const date = format(new Date(intake.scheduledTime), "yyyy-MM-dd");
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
            (i) => i.state === "administered"
          ).length,
          givenCount: intakesArray.filter((i) => i.state === "given").length,
          missedCount: intakesArray.filter((i) => i.state === "missed").length,
          refusedCount: intakesArray.filter((i) => i.state === "refused")
            .length,
          skippedCount: intakesArray.filter((i) => i.state === "skipped").length
        };
      }
    );

    // Sort by date (most recent first)
    return groupedArray.sort(
      (a, b) => b.dateObj.getTime() - a.dateObj.getTime()
    );
  }, [allIntakes, dateRange]);

  // Organize intakes by time slots, PRN, and Topical
  const organizeIntakesByCategory = (intakes: any[]) => {
    const scheduled: Record<string, any[]> = {};
    const prn: any[] = [];
    const topical: any[] = [];

    intakes.forEach((intake) => {
      const medication = intake.medication;

      // Check if it's PRN or Topical
      if (medication?.scheduleType === "PRN (As Needed)") {
        prn.push(intake);
      } else if (medication?.route === "Topical") {
        topical.push(intake);
      } else {
        // Group by scheduled time
        const time = format(new Date(intake.scheduledTime), "HH:mm");
        if (!scheduled[time]) {
          scheduled[time] = [];
        }
        scheduled[time].push(intake);
      }
    });

    // Convert scheduled object to sorted array
    const scheduledArray: GroupedByTime[] = Object.entries(scheduled)
      .map(([time, intakes]) => ({ time, intakes }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return { scheduled: scheduledArray, prn, topical };
  };

  // Grouped columns
  const groupedColumns: ColumnDef<GroupedIntake>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
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
        const { totalCount, givenCount, administeredCount, missedCount, refusedCount } = row.original;
        const successCount = givenCount + administeredCount;
        return (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Total: {totalCount}</span>
            {successCount > 0 && (
              <span className="text-green-600 font-medium">✓ {successCount}</span>
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
    state: {
      sorting
    },
    initialState: {
      pagination: {
        pageSize: 25
      }
    }
  });

  const handleRowClick = (groupedIntake: GroupedIntake) => {
    setSelectedDate(groupedIntake);
    setIsDialogOpen(true);
  };

  // Function to download a specific date's data as CSV
  const downloadDateCSV = (groupedIntake: GroupedIntake) => {
    const csvData = groupedIntake.intakes.map((intake) => {
      const medication = intake.medication;

      return {
        Date: format(groupedIntake.dateObj, "MMM dd, yyyy"),
        Time: format(new Date(intake.scheduledTime), "HH:mm"),
        Medication: medication?.name || "N/A",
        Strength: medication
          ? `${medication.strength} ${medication.strengthUnit}`
          : "N/A",
        "Dosage Form": medication?.dosageForm || "N/A",
        Route: medication?.route || "N/A",
        Type: medication?.scheduleType || "N/A",
        Status: intake.state,
        "Popped Out": intake.poppedOutAt
          ? format(new Date(intake.poppedOutAt), "HH:mm")
          : "-",
        Notes: intake.notes || ""
      };
    });

    // Convert to CSV string
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            // Escape quotes and wrap in quotes if contains comma or quote
            const stringValue = String(value);
            if (
              stringValue.includes(",") ||
              stringValue.includes('"') ||
              stringValue.includes("\n")
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      )
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `medication-${resident.firstName}-${resident.lastName}-${format(groupedIntake.dateObj, "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Function to download data as CSV
  const downloadCSV = () => {
    // Flatten grouped data back to individual intakes for CSV export
    const allIntakesForExport = table
      .getFilteredRowModel()
      .rows.flatMap((row) => {
        const groupedIntake = row.original;
        return groupedIntake.intakes;
      });

    const csvData = allIntakesForExport.map((intake) => {
      const medication = intake.medication;

      return {
        Date: format(new Date(intake.scheduledTime), "MMM dd, yyyy"),
        Time: format(new Date(intake.scheduledTime), "HH:mm"),
        Medication: medication?.name || "N/A",
        Strength: medication
          ? `${medication.strength} ${medication.strengthUnit}`
          : "N/A",
        "Dosage Form": medication?.dosageForm || "N/A",
        Route: medication?.route || "N/A",
        Type: medication?.scheduleType || "N/A",
        Status: intake.state,
        "Popped Out": intake.poppedOutAt
          ? format(new Date(intake.poppedOutAt), "HH:mm")
          : "-",
        Notes: intake.notes || ""
      };
    });

    // Convert to CSV string
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            // Escape quotes and wrap in quotes if contains comma or quote
            const stringValue = String(value);
            if (
              stringValue.includes(",") ||
              stringValue.includes('"') ||
              stringValue.includes("\n")
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      )
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `medication-history-${resident.firstName}-${resident.lastName}-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to render medication badge
  const getStateBadgeVariant = (state: string) => {
    switch (state) {
      case "given":
      case "administered":
        return "default";
      case "scheduled":
        return "secondary";
      case "missed":
        return "destructive";
      case "refused":
        return "outline";
      case "skipped":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (resident === undefined || allIntakes === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="mt-2 text-muted-foreground">
            Loading medication history...
          </p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <p className="font-semibold text-xl">Medication History</p>
              <p className="text-sm text-muted-foreground">
                Complete medication intake history for {resident.firstName}{" "}
                {resident.lastName}
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={downloadCSV}
          disabled={table.getFilteredRowModel().rows.length === 0}
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {dateRange && (
          <Button
            variant="ghost"
            onClick={() => setDateRange(undefined)}
            className="px-2"
          >
            Clear Date Range
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => handleRowClick(row.original)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={groupedColumns.length}
                  className="h-24 text-center"
                >
                  No medication history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} total record(s)
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 25, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Details Sheet - Organized by Time */}
      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex flex-col gap-2">
              <SheetTitle className="text-xl">
                {selectedDate &&
                  format(selectedDate.dateObj, "EEEE, MMMM dd, yyyy")}
              </SheetTitle>
              <SheetDescription>
                Medications organized by scheduled time
              </SheetDescription>
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => selectedDate && downloadDateCSV(selectedDate)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6 py-4">
            {selectedDate && (() => {
              const { scheduled, prn, topical } = organizeIntakesByCategory(selectedDate.intakes);

              return (
                <>
                  {/* Scheduled Medications by Time */}
                  {scheduled.length > 0 && scheduled.map((timeGroup) => (
                    <Card key={timeGroup.time} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          {timeGroup.time}
                          <Badge variant="secondary" className="ml-2">
                            {timeGroup.intakes.length} {timeGroup.intakes.length === 1 ? 'medication' : 'medications'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {timeGroup.intakes.map((intake) => {
                          const medication = intake.medication;
                          return (
                            <div
                              key={intake._id}
                              className="p-3 rounded-lg bg-muted/50 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">
                                    {medication?.name || "N/A"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {medication
                                      ? `${medication.strength} ${medication.strengthUnit} • ${medication.dosageForm} • ${medication.route}`
                                      : ""}
                                  </p>
                                </div>
                                <Badge variant={getStateBadgeVariant(intake.state)} className="shrink-0">
                                  {intake.state === "given" || intake.state === "administered" ? "✓ " : ""}
                                  {intake.state.charAt(0).toUpperCase() + intake.state.slice(1)}
                                </Badge>
                              </div>
                              {intake.notes && (
                                <p className="text-xs text-muted-foreground border-t pt-2">
                                  <span className="font-medium">Note:</span> {intake.notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))}

                  {/* PRN Medications */}
                  {prn.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Pill className="h-4 w-4 text-purple-500" />
                            PRN (As Needed)
                            <Badge variant="secondary" className="ml-2">
                              {prn.length} {prn.length === 1 ? 'medication' : 'medications'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {prn.map((intake) => {
                            const medication = intake.medication;
                            return (
                              <div
                                key={intake._id}
                                className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm">
                                        {medication?.name || "N/A"}
                                      </p>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(intake.scheduledTime), "HH:mm")}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {medication
                                        ? `${medication.strength} ${medication.strengthUnit} • ${medication.dosageForm} • ${medication.route}`
                                        : ""}
                                    </p>
                                  </div>
                                  <Badge variant={getStateBadgeVariant(intake.state)} className="shrink-0">
                                    {intake.state === "given" || intake.state === "administered" ? "✓ " : ""}
                                    {intake.state.charAt(0).toUpperCase() + intake.state.slice(1)}
                                  </Badge>
                                </div>
                                {intake.notes && (
                                  <p className="text-xs text-muted-foreground border-t border-purple-200 dark:border-purple-800 pt-2">
                                    <span className="font-medium">Note:</span> {intake.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* Topical Medications */}
                  {topical.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Droplet className="h-4 w-4 text-green-500" />
                            Topical Medications
                            <Badge variant="secondary" className="ml-2">
                              {topical.length} {topical.length === 1 ? 'medication' : 'medications'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {topical.map((intake) => {
                            const medication = intake.medication;
                            return (
                              <div
                                key={intake._id}
                                className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm">
                                        {medication?.name || "N/A"}
                                      </p>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(intake.scheduledTime), "HH:mm")}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {medication
                                        ? `${medication.strength} ${medication.strengthUnit} • ${medication.dosageForm}`
                                        : ""}
                                    </p>
                                  </div>
                                  <Badge variant={getStateBadgeVariant(intake.state)} className="shrink-0">
                                    {intake.state === "given" || intake.state === "administered" ? "✓ " : ""}
                                    {intake.state.charAt(0).toUpperCase() + intake.state.slice(1)}
                                  </Badge>
                                </div>
                                {intake.notes && (
                                  <p className="text-xs text-muted-foreground border-t border-green-200 dark:border-green-800 pt-2">
                                    <span className="font-medium">Note:</span> {intake.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* Empty state */}
                  {scheduled.length === 0 && prn.length === 0 && topical.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No medications recorded for this date
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
