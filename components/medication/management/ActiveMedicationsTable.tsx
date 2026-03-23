"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Edit,
  MoreVertical,
  Package,
  StopCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import EditMedicationDialog from "@/components/medication/forms/EditMedicationDialog";
import { ReceiveStockDialog } from "./ReceiveStockDialog";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { DiscontinueMedicationDialog } from "./DiscontinueMedicationDialog";
import { StockHistoryDialog } from "./StockHistoryDialog";

export type MedicationData = {
  id: string;
  name: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  route: string;
  frequency: string;
  schedule_type: string;
  times: string[];
  time_quantities: Record<string, number> | null;
  total_count: number | null;
  is_controlled_drug: boolean;
  controlled_drug_schedule: string | null;
  status: string;
  prescriber_name: string | null;
  start_date: string | null;
  end_date: string | null;
  instructions: string | null;
  resident_id: string;
  organization_id: string;
  care_home_id: string | null;
  team_id: string | null;
};

interface ActiveMedicationsTableProps {
  medications: MedicationData[];
  residentId: string;
  residentName: string;
  onRefresh: () => void;
}

export function ActiveMedicationsTable({
  medications,
  residentId,
  residentName,
  onRefresh,
}: ActiveMedicationsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedMedication, setSelectedMedication] = useState<MedicationData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [receiveStockOpen, setReceiveStockOpen] = useState(false);
  const [adjustStockOpen, setAdjustStockOpen] = useState(false);
  const [discontinueOpen, setDiscontinueOpen] = useState(false);
  const [stockHistoryOpen, setStockHistoryOpen] = useState(false);

  const getStockStatus = (count: number | null) => {
    if (count === null || count === undefined) return "unknown";
    if (count === 0) return "out";
    if (count <= 10) return "low";
    return "ok";
  };

  const getStockBadge = (count: number | null) => {
    const status = getStockStatus(count);
    const displayCount = count ?? "-";

    switch (status) {
      case "out":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Out of Stock
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-300">
            <TrendingDown className="h-3 w-3" />
            Low ({displayCount})
          </Badge>
        );
      case "ok":
        return (
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-300">
            <TrendingUp className="h-3 w-3" />
            {displayCount} in stock
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 bg-gray-50 text-gray-600">
            Not tracked
          </Badge>
        );
    }
  };

  // Handlers for opening dialogs - useCallback to prevent re-renders
  const handleEditClick = useCallback((med: MedicationData) => {
    setSelectedMedication(med);
    setEditDialogOpen(true);
  }, []);

  const handleReceiveStockClick = useCallback((med: MedicationData) => {
    setSelectedMedication(med);
    setReceiveStockOpen(true);
  }, []);

  const handleAdjustStockClick = useCallback((med: MedicationData) => {
    setSelectedMedication(med);
    setAdjustStockOpen(true);
  }, []);

  const handleStockHistoryClick = useCallback((med: MedicationData) => {
    setSelectedMedication(med);
    setStockHistoryOpen(true);
  }, []);

  const handleDiscontinueClick = useCallback((med: MedicationData) => {
    setSelectedMedication(med);
    setDiscontinueOpen(true);
  }, []);

  // Handlers for closing dialogs - useCallback to prevent re-renders
  const handleEditClose = useCallback((open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      // Use setTimeout to defer state clearing to avoid re-render during close animation
      setTimeout(() => setSelectedMedication(null), 0);
    }
  }, []);

  const handleReceiveStockClose = useCallback((open: boolean) => {
    setReceiveStockOpen(open);
    if (!open) {
      setTimeout(() => setSelectedMedication(null), 0);
    }
  }, []);

  const handleAdjustStockClose = useCallback((open: boolean) => {
    setAdjustStockOpen(open);
    if (!open) {
      setTimeout(() => setSelectedMedication(null), 0);
    }
  }, []);

  const handleStockHistoryClose = useCallback((open: boolean) => {
    setStockHistoryOpen(open);
    if (!open) {
      setTimeout(() => setSelectedMedication(null), 0);
    }
  }, []);

  const handleDiscontinueClose = useCallback((open: boolean) => {
    setDiscontinueOpen(open);
    if (!open) {
      setTimeout(() => setSelectedMedication(null), 0);
    }
  }, []);

  const columns: ColumnDef<MedicationData>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Medication",
        cell: ({ row }) => {
          const med = row.original;
          return (
            <div className="flex flex-col gap-1">
              <div className="font-medium">{med.name}</div>
              <div className="text-xs text-muted-foreground">
                {med.strength} {med.strength_unit} - {med.dosage_form}
              </div>
              {med.is_controlled_drug && (
                <Badge variant="outline" className="w-fit text-xs bg-red-50 text-red-700 border-red-300">
                  CD Schedule {med.controlled_drug_schedule}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "route",
        header: "Route",
        cell: ({ row }) => row.original.route,
      },
      {
        accessorKey: "schedule_type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.original.schedule_type;
          const variants: Record<string, string> = {
            "Scheduled": "bg-blue-50 text-blue-700",
            "PRN (As Needed)": "bg-purple-50 text-purple-700",
            "Topical": "bg-teal-50 text-teal-700",
            "Supplement": "bg-amber-50 text-amber-700",
          };
          return (
            <Badge variant="outline" className={variants[type] || "bg-gray-50 text-gray-700"}>
              {type}
            </Badge>
          );
        },
      },
      {
        accessorKey: "frequency",
        header: "Frequency",
        cell: ({ row }) => {
          const med = row.original;
          if (med.schedule_type === "PRN (As Needed)") return "As Needed";
          if (med.times && med.times.length > 0) {
            return (
              <div className="flex flex-col gap-1">
                <span className="text-sm">{med.frequency}</span>
                <span className="text-xs text-muted-foreground">
                  {med.times.join(", ")}
                </span>
              </div>
            );
          }
          return med.frequency;
        },
      },
      {
        accessorKey: "total_count",
        header: "Stock",
        cell: ({ row }) => getStockBadge(row.original.total_count),
      },
      {
        accessorKey: "prescriber_name",
        header: "Prescriber",
        cell: ({ row }) => row.original.prescriber_name || "-",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const med = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Medication Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    handleEditClick(med);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Stock Management
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    handleReceiveStockClick(med);
                  }}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Receive Stock
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    handleAdjustStockClick(med);
                  }}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Adjust Stock
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    handleStockHistoryClick(med);
                  }}
                >
                  <Package className="mr-2 h-4 w-4" />
                  View Stock History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    handleDiscontinueClick(med);
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Discontinue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: medications,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const stockStats = useMemo(() => {
    const total = medications.length;
    const outOfStock = medications.filter(m => getStockStatus(m.total_count) === "out").length;
    const lowStock = medications.filter(m => getStockStatus(m.total_count) === "low").length;
    const controlled = medications.filter(m => m.is_controlled_drug).length;

    return { total, outOfStock, lowStock, controlled };
  }, [medications]);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground">Total Active</div>
          <div className="text-2xl font-bold">{stockStats.total}</div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground">Out of Stock</div>
          <div className="text-2xl font-bold text-red-600">{stockStats.outOfStock}</div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground">Low Stock</div>
          <div className="text-2xl font-bold text-orange-600">{stockStats.lowStock}</div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground">Controlled Drugs</div>
          <div className="text-2xl font-bold text-purple-600">{stockStats.controlled}</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search medications..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  No active medications found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs - Only render when open to avoid premature data fetching */}
      {selectedMedication && editDialogOpen && (
        <EditMedicationDialog
          medication={selectedMedication}
          open={editDialogOpen}
          onOpenChange={handleEditClose}
          onSuccess={onRefresh}
        />
      )}

      {selectedMedication && receiveStockOpen && (
        <ReceiveStockDialog
          medication={selectedMedication}
          residentId={residentId}
          residentName={residentName}
          open={receiveStockOpen}
          onOpenChange={handleReceiveStockClose}
          onSuccess={onRefresh}
        />
      )}

      {selectedMedication && adjustStockOpen && (
        <AdjustStockDialog
          medication={selectedMedication}
          residentId={residentId}
          residentName={residentName}
          open={adjustStockOpen}
          onOpenChange={handleAdjustStockClose}
          onSuccess={onRefresh}
        />
      )}

      {selectedMedication && discontinueOpen && (
        <DiscontinueMedicationDialog
          medication={selectedMedication}
          residentName={residentName}
          open={discontinueOpen}
          onOpenChange={handleDiscontinueClose}
          onSuccess={onRefresh}
        />
      )}

      {selectedMedication && stockHistoryOpen && (
        <StockHistoryDialog
          medication={selectedMedication}
          open={stockHistoryOpen}
          onOpenChange={handleStockHistoryClose}
        />
      )}
    </div>
  );
}
