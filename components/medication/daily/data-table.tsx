"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
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
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="overflow-hidden rounded-md border w-full">
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
              const isDivider = (row.original as any)?.isDivider;
              const isControlled = (row.original as any).is_controlled_drug || (row.original as any).medication?.is_controlled_drug;
              
              const getDividerStyles = (label: string) => {
                const lowerLabel = label.toLowerCase();
                if (lowerLabel.includes('injection')) {
                  return {
                    bg: "bg-purple-100 hover:bg-purple-100",
                    border: "border-purple-500",
                    text: "text-purple-900"
                  };
                }
                if (lowerLabel.includes('topical')) {
                  return {
                    bg: "bg-blue-100 hover:bg-blue-100",
                    border: "border-blue-500",
                    text: "text-blue-900"
                  };
                }
                if (lowerLabel.includes('supplement')) {
                  return {
                    bg: "bg-emerald-100 hover:bg-emerald-100",
                    border: "border-emerald-500",
                    text: "text-emerald-900"
                  };
                }
                return {
                  bg: "bg-purple-100 hover:bg-purple-100",
                  border: "border-purple-500",
                  text: "text-purple-900"
                };
              };

              const styles = isDivider ? getDividerStyles((row.original as any).dividerLabel || '') : { bg: "", border: "", text: "" };
              
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    isDivider ? styles.bg : "",
                    isControlled ? "bg-red-100 hover:bg-red-200" : ""
                  )}
                >
                  {isDivider ? (
                    <TableCell colSpan={columns.length} className="p-0">
                      <div className={cn("border-l-4 px-3 py-1.5", styles.border)}>
                        <p className={cn("font-semibold uppercase text-xs tracking-wide", styles.text)}>
                          {(row.original as any)?.dividerLabel || 'Supplements'}
                        </p>
                      </div>
                    </TableCell>
                  ) : (
                    row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))
                  )}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
