"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Search, X } from "lucide-react";
import { CreateResidentForm } from "@/components/residents/forms/CreateResidentForm";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Dialog } from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  teamName: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: "roomNumber",
      desc: false
    }
  ]);
  const [unitFilter] = React.useState<string>("all");
  const [searchValue, setSearchValue] = React.useState<string>("");


  const table = useReactTable({
    data,
    columns,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
    enableMultiSort: false,
    state: {
      columnFilters,
      sorting
    }
  });

  // Debounced search effect
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      table.getColumn("name")?.setFilterValue(searchValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue, table]);

  React.useEffect(() => {
    if (unitFilter === "all") {
      table.getColumn("unit")?.setFilterValue("");
    } else {
      table.getColumn("unit")?.setFilterValue(unitFilter);
    }
  }, [unitFilter, table]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          {/* Search by name */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search residents..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="pl-10 max-w-sm"
            />
            {searchValue && (
              <Button
                variant="ghost"
                onClick={() => setSearchValue("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

    
        </div>

        {/* Results count */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} of{" "}
            {table.getCoreRowModel().rows.length} resident(s)
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Add Resident</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Resident Profile</DialogTitle>
                <DialogDescription>
                  Enter the resident’s personal information and relevant care
                  details to create their profile.
                </DialogDescription>
              </DialogHeader>
              <CreateResidentForm />
            </DialogContent>
          </Dialog>
        </div>
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
              table.getRowModel().rows.map((row) => {
                const resident = row.original as { _id: string };
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/residents/${resident._id}`)}
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
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
