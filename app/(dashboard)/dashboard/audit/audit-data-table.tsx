"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState
} from "@tanstack/react-table";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, Search, X } from "lucide-react";
import * as React from "react";
import { DateRange } from "react-day-picker";
import { ActionPlanModal } from "./action-plan-modal";
import { ReportDetailDialog } from "./report-detail-dialog";
import { createColumns } from "./columns";
import { ActionPlanFormData, AuditItem, AuditStatus } from "./types";
import { staffMembers } from "./mock-data";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface AuditDataTableProps {
  data: AuditItem[];
  onActionPlanSubmit?: (item: AuditItem, data: ActionPlanFormData) => void;
  onStatusChange?: (itemId: string, newStatus: AuditStatus) => void;
  onAssigneeChange?: (itemId: string, assignedTo: string) => void;
}

export function AuditDataTable({ data, onActionPlanSubmit, onStatusChange, onAssigneeChange }: AuditDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AuditStatus | "all">("all");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [selectedAuditItem, setSelectedAuditItem] = React.useState<AuditItem | null>(null);
  const [actionPlanModalOpen, setActionPlanModalOpen] = React.useState(false);
  const [reportDetailOpen, setReportDetailOpen] = React.useState(false);
  const [selectedReportItem, setSelectedReportItem] = React.useState<AuditItem | null>(null);

  const filteredData = React.useMemo(() => {
    let filtered = [...data];

    if (globalFilter) {
      filtered = filtered.filter(
        (item) =>
          item.residentName.toLowerCase().includes(globalFilter.toLowerCase()) ||
          item.title.toLowerCase().includes(globalFilter.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (dateRange?.from) {
      filtered = filtered.filter((item) => {
        const itemDate = item.updatedDate;
        if (dateRange.to) {
          return itemDate >= dateRange.from! && itemDate <= dateRange.to;
        }
        return itemDate >= dateRange.from!;
      });
    }

    return filtered;
  }, [data, globalFilter, statusFilter, dateRange]);

  const handleActionPlanClick = (item: AuditItem) => {
    setSelectedAuditItem(item);
    setActionPlanModalOpen(true);
  };

  const handleActionPlanSubmit = (formData: ActionPlanFormData) => {
    if (selectedAuditItem && onActionPlanSubmit) {
      onActionPlanSubmit(selectedAuditItem, formData);
    }
    console.log("Issue submitted:", formData);
  };

  const handleReportClick = (item: AuditItem) => {
    setSelectedReportItem(item);
    setReportDetailOpen(true);
  };

  const columns = React.useMemo(
    () => createColumns(handleActionPlanClick, handleReportClick, onStatusChange, onAssigneeChange, staffMembers),
    [onStatusChange, onAssigneeChange]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const statuses: { value: AuditStatus | "all"; label: string }[] = [
    { value: "all", label: "All statuses" },
    { value: "PENDING_AUDIT", label: "Pending audit" },
    { value: "ISSUE_ASSIGNED", label: "Issue assigned" },
    { value: "REASSIGNED", label: "Reassigned" },
    { value: "IN_PROGRESS", label: "In progress" },
    { value: "PENDING_VERIFICATION", label: "Pending verification" },
    { value: "AUDITED", label: "Audited" }
  ];

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by resident or title..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AuditStatus | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
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
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {(globalFilter || statusFilter !== "all" || dateRange) && (
            <Button
              variant="ghost"
              onClick={() => {
                setGlobalFilter("");
                setStatusFilter("all");
                setDateRange(undefined);
              }}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
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
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
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
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <ActionPlanModal
        open={actionPlanModalOpen}
        onOpenChange={setActionPlanModalOpen}
        auditItem={selectedAuditItem}
        onSubmit={handleActionPlanSubmit}
      />

      <ReportDetailDialog
        item={selectedReportItem}
        open={reportDetailOpen}
        onOpenChange={setReportDetailOpen}
      />
    </div>
  );
}