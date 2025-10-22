"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

interface MedicationIntakeHistory {
  _id: string;
  scheduledTime: number;
  state: string;
  notes?: string;
  poppedOutAt?: number;
  medication: {
    name: string;
    dosageForm: string;
    strength: string;
    strengthUnit: string;
    route: string;
  } | null;
}

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

export const historyColumns: ColumnDef<MedicationIntakeHistory>[] = [
  {
    accessorKey: "scheduledTime",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date & Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const scheduledTime = row.original.scheduledTime;
      const date = new Date(scheduledTime);

      return (
        <div className="flex flex-col">
          <p className="font-medium">
            {formatInTimeZone(date, "UTC", "MMM dd, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatInTimeZone(date, "UTC", "HH:mm")}
          </p>
        </div>
      );
    }
  },
  {
    id: "medication",
    accessorFn: (row) => row.medication?.name || "",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Medication
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const medication = row.original.medication;

      if (!medication) {
        return (
          <div className="flex flex-col">
            <p className="font-medium text-muted-foreground">No medication</p>
          </div>
        );
      }

      return (
        <div className="flex flex-col">
          <p className="font-medium">{medication.name}</p>
          <p className="text-xs text-muted-foreground">
            {medication.strength} {medication.strengthUnit} -{" "}
            {medication.dosageForm}
          </p>
        </div>
      );
    }
  },
  {
    id: "route",
    header: "Route",
    cell: ({ row }) => {
      const medication = row.original.medication;
      return <p className="text-sm">{medication?.route || "N/A"}</p>;
    }
  },
  {
    accessorKey: "state",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const state = row.original.state;
      return (
        <Badge variant={getStateBadgeVariant(state)}>
          {state.charAt(0).toUpperCase() + state.slice(1)}
        </Badge>
      );
    }
  },
  {
    id: "poppedOut",
    header: "Popped Out",
    cell: ({ row }) => {
      const poppedOutAt = row.original.poppedOutAt;

      if (poppedOutAt) {
        return (
          <p className="font-medium text-primary text-sm">
            {formatInTimeZone(new Date(poppedOutAt), "UTC", "HH:mm")}
          </p>
        );
      }

      return <p className="text-sm text-muted-foreground">-</p>;
    }
  },
  {
    id: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.original.notes;
      return (
        <p className="text-sm text-muted-foreground max-w-xs truncate">
          {notes || "-"}
        </p>
      );
    }
  }
];
