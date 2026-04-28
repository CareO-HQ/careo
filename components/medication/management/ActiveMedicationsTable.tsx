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
import { cn } from "@/lib/utils";
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
  created_at: string;
  name: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  route: string;
  frequency: string;
  schedule_type: string;
  times: string[];
  time_quantities: Record<string, number> | null;
  total_count: number;
  is_controlled_drug: boolean;
  controlled_drug_schedule: string | null;
  status: string;
  prescriber_name: string;
  start_date: string;
  end_date?: string;
  instructions?: string;
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
  const [activeDialog, setActiveDialog] = useState<
    "edit" | "receive" | "adjust" | "history" | "discontinue" | null
  >(null);

  const getStockStatus = (count: number | null) => {
    if (count === null || count === undefined) return "unknown";
    if (count === 0) return "out";
    if (count < 20) return "low";
    return "ok";
  };

  const getStockUnitLabel = (medication: MedicationData) => {
    // For PRN and Supplements, check frequency field (stores dosage unit)
    if (medication.schedule_type === "PRN (As Needed)" || medication.schedule_type === "Supplement") {
      const dosageUnit = medication.frequency || "";
      if (dosageUnit.includes('mL')) return 'mL';
      if (dosageUnit.includes('Drops')) return 'drops';
      if (dosageUnit.includes('Puffs')) return 'puffs';
      if (dosageUnit.includes('Patches')) return 'patches';
      if (dosageUnit.includes('Sachets')) return 'sachets';
      if (dosageUnit.includes('Injections')) return 'mL';
      if (dosageUnit.includes('Tablets')) return 'tablets';
    }

    // For scheduled medications, determine from dosage form
    const dosageForm = medication.dosage_form?.toLowerCase() || "";
    if (dosageForm.includes('liquid') || dosageForm.includes('syrup')) return 'mL';
    if (dosageForm.includes('drops')) return 'drops';
    if (dosageForm.includes('inhaler')) return 'puffs';
    if (dosageForm.includes('spray')) return 'sprays';
    if (dosageForm.includes('injection')) return 'mL';
    if (dosageForm.includes('sachet') || dosageForm.includes('powder')) return 'sachets';
    if (dosageForm.includes('patch')) return 'patches';
    if (dosageForm.includes('tablet')) return 'tablets';
    if (dosageForm.includes('capsule')) return 'capsules';
    if (dosageForm.includes('softgel')) return 'softgels';
    if (dosageForm.includes('gummy')) return 'gummies';
    if (dosageForm.includes('cream') || dosageForm.includes('ointment') || dosageForm.includes('gel')) return 'packs';

    return medication.strength_unit === 'mg' ? 'units' : medication.strength_unit || 'units';
  };

  const getStockBadge = (medication: MedicationData) => {
    const count = medication.total_count;
    const status = getStockStatus(count);
    const unitLabel = getStockUnitLabel(medication);
    const displayCount = count !== null && count !== undefined ? `${count} ${unitLabel}` : "-";

    switch (status) {
      case "out":
        return (
          <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-300">
            <AlertCircle className="h-3 w-3" />
            Out of Stock
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-300">
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
    setTimeout(() => {
      setSelectedMedication(med);
      setActiveDialog("edit");
    }, 0);
  }, []);

  const handleReceiveStockClick = useCallback((med: MedicationData) => {
    setTimeout(() => {
      setSelectedMedication(med);
      setActiveDialog("receive");
    }, 0);
  }, []);

  const handleAdjustStockClick = useCallback((med: MedicationData) => {
    setTimeout(() => {
      setSelectedMedication(med);
      setActiveDialog("adjust");
    }, 0);
  }, []);

  const handleStockHistoryClick = useCallback((med: MedicationData) => {
    setTimeout(() => {
      setSelectedMedication(med);
      setActiveDialog("history");
    }, 0);
  }, []);

  const handleDiscontinueClick = useCallback((med: MedicationData) => {
    setTimeout(() => {
      setSelectedMedication(med);
      setActiveDialog("discontinue");
    }, 0);
  }, []);

  // Handler for closing any dialog - useCallback to prevent re-renders
  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setActiveDialog(null);
      setSelectedMedication(null);
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
                <Badge variant="outline" className="w-fit text-xs bg-red-200 text-red-800 border-red-300">
                  Controlled Medication
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
        cell: ({ row }) => getStockBadge(row.original),
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
                  onSelect={() => handleEditClick(med)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Stock Management
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => handleReceiveStockClick(med)}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Receive Stock
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleAdjustStockClick(med)}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Adjust Stock
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleStockHistoryClick(med)}
                >
                  <Package className="mr-2 h-4 w-4" />
                  View Stock History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => handleDiscontinueClick(med)}
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

    [handleEditClick, handleReceiveStockClick, handleAdjustStockClick, handleStockHistoryClick, handleDiscontinueClick]
  );

  // Sort medications: non-PRN first, then PRN at the bottom
  const sortedMedications = useMemo(() => {
    return [...medications].sort((a, b) => {
      // 1. Controlled drugs first
      if (a.is_controlled_drug && !b.is_controlled_drug) return -1;
      if (!a.is_controlled_drug && b.is_controlled_drug) return 1;

      const aIsPRN = a.schedule_type === "PRN (As Needed)";
      const bIsPRN = b.schedule_type === "PRN (As Needed)";

      if (aIsPRN && !bIsPRN) return 1;  // a goes to bottom
      if (!aIsPRN && bIsPRN) return -1; // b goes to bottom
      return 0; // maintain original order for same type
    });
  }, [medications]);

  const table = useReactTable({
    data: sortedMedications,
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
                <TableRow 
                  key={row.id}
                  className={cn(row.original.is_controlled_drug ? "bg-red-100 hover:bg-red-200" : "")}
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
                  No active medications found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs - Always mounted to prevent abrupt mounting/unmounting during close */}
      <EditMedicationDialog
        medication={selectedMedication}
        open={activeDialog === "edit"}
        onOpenChange={handleDialogClose}
        onSuccess={onRefresh}
      />

      <ReceiveStockDialog
        medication={selectedMedication ? {
          ...selectedMedication,
          dosage_form: selectedMedication.dosage_form
        } : null}
        residentId={residentId}
        residentName={residentName}
        open={activeDialog === "receive"}
        onOpenChange={handleDialogClose}
        onSuccess={onRefresh}
      />

      <AdjustStockDialog
        medication={selectedMedication ? {
          ...selectedMedication,
          dosage_form: selectedMedication.dosage_form
        } : null}
        residentId={residentId}
        residentName={residentName}
        open={activeDialog === "adjust"}
        onOpenChange={handleDialogClose}
        onSuccess={onRefresh}
      />

      <DiscontinueMedicationDialog
        medication={selectedMedication}
        residentName={residentName}
        open={activeDialog === "discontinue"}
        onOpenChange={handleDialogClose}
        onSuccess={onRefresh}
      />

      <StockHistoryDialog
        medication={selectedMedication ? {
          ...selectedMedication,
          dosage_form: selectedMedication.dosage_form
        } : null}
        open={activeDialog === "history"}
        onOpenChange={handleDialogClose}
      />
    </div>
  );
}
