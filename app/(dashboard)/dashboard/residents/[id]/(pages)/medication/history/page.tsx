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
  Download
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

    // Filter by date range
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
        return <p className="font-medium">{format(dateObj, "MMM dd, yyyy")}</p>;
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

  // Function to download a specific date's data as PDF
  const downloadDatePDF = (groupedIntake: GroupedIntake) => {
    // Create a printable HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medication History - ${format(groupedIntake.dateObj, "MMM dd, yyyy")}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }
            h1 {
              color: #333;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .header-info {
              margin: 20px 0;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f4f4f4;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .medication-name {
              font-weight: 600;
            }
            .medication-details {
              font-size: 0.9em;
              color: #666;
            }
            .status-badge {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 0.85em;
              font-weight: 500;
            }
            .status-administered { background-color: #e8f5e9; color: #2e7d32; }
            .status-scheduled { background-color: #f5f5f5; color: #616161; }
            .status-missed { background-color: #ffebee; color: #c62828; }
            .status-refused { background-color: #fff3e0; color: #e65100; }
            .status-skipped { background-color: #e3f2fd; color: #1565c0; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Medication History</h1>
          <div class="header-info">
            <p><strong>Resident:</strong> ${resident.firstName} ${resident.lastName}</p>
            <p><strong>Date:</strong> ${format(groupedIntake.dateObj, "EEEE, MMMM dd, yyyy")}</p>
            <p><strong>Total Medications:</strong> ${groupedIntake.totalCount}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Medication</th>
                <th>Route</th>
                <th>Status</th>
                <th>Popped Out</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${groupedIntake.intakes
                .map((intake) => {
                  const medication = intake.medication;
                  const statusClass = `status-${intake.state}`;
                  return `
                    <tr>
                      <td>${format(new Date(intake.scheduledTime), "HH:mm")}</td>
                      <td>
                        <div class="medication-name">${medication?.name || "N/A"}</div>
                        <div class="medication-details">${
                          medication
                            ? `${medication.strength} ${medication.strengthUnit} - ${medication.dosageForm}`
                            : ""
                        }</div>
                      </td>
                      <td>${medication?.route || "N/A"}</td>
                      <td>
                        <span class="status-badge ${statusClass}">
                          ${intake.state.charAt(0).toUpperCase() + intake.state.slice(1)}
                        </span>
                      </td>
                      <td>${
                        intake.poppedOutAt
                          ? format(new Date(intake.poppedOutAt), "HH:mm")
                          : "-"
                      }</td>
                      <td>${intake.notes || "-"}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Create a new window and print
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Small delay to ensure content is loaded
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
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
                {resident.lastName}, including missed medications.
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

      {/* Details Sheet */}
      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent size="lg">
          <SheetHeader>
            <div className="flex flex-col gap-2">
              <SheetTitle>
                Medication Details -{" "}
                {selectedDate &&
                  format(selectedDate.dateObj, "EEEE, MMMM dd, yyyy")}
              </SheetTitle>
              <SheetDescription>
                Detailed view of all medication intakes for this date
              </SheetDescription>
              <div className="flex items-center gap-2 pt-2">
                <Select
                  onValueChange={(value: "csv" | "pdf") => {
                    if (selectedDate) {
                      if (value === "csv") {
                        downloadDateCSV(selectedDate);
                      } else {
                        downloadDatePDF(selectedDate);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <Download className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Download" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">Download as CSV</SelectItem>
                    <SelectItem value="pdf">Download as PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetHeader>
          <div className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Medication</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Popped Out</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDate?.intakes.map((intake) => {
                    const medication = intake.medication;
                    const getStateBadgeVariant = (state: string) => {
                      switch (state) {
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

                    return (
                      <TableRow key={intake._id}>
                        <TableCell>
                          {format(new Date(intake.scheduledTime), "HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <p className="font-medium">
                              {medication?.name || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {medication
                                ? `${medication.strength} ${medication.strengthUnit} - ${medication.dosageForm}`
                                : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {medication?.route || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStateBadgeVariant(intake.state)}>
                            {intake.state.charAt(0).toUpperCase() +
                              intake.state.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {intake.poppedOutAt
                            ? format(new Date(intake.poppedOutAt), "HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {intake.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
