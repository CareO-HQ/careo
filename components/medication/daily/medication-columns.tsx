"use client";

import { ColumnDef } from "@tanstack/react-table";

interface Medication {
  _id: string;
  _creationTime: number;
  name: string;
  strength: string;
  strengthUnit: string;
  dosageForm: string;
  route: string;
  frequency: string;
  scheduleType: string;
  times: string[];
  instructions?: string;
  prescriberName: string;
  startDate: number;
  endDate?: number;
  status: string;
  totalCount: number;
}

export const medicationColumns: ColumnDef<Medication>[] = [
  {
    id: "medication",
    header: "Medication",
    cell: ({ row }) => {
      const medication = row.original;

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
      return <p>{row.original.route}</p>;
    }
  },
  {
    id: "scheduleType",
    header: "Schedule Type",
    cell: ({ row }) => {
      return <p>{row.original.scheduleType}</p>;
    }
  },
  {
    id: "frequency",
    header: "Frequency",
    cell: ({ row }) => {
      return <p>{row.original.frequency}</p>;
    }
  },
  {
    id: "totalCount",
    header: "Total Count",
    cell: ({ row }) => {
      return <p>{row.original.totalCount}</p>;
    }
  },
  {
    id: "prescriber",
    header: "Prescriber",
    cell: ({ row }) => {
      return <p className="text-sm">{row.original.prescriberName}</p>;
    }
  },
  {
    id: "instructions",
    header: "Instructions",
    cell: ({ row }) => {
      const instructions = row.original.instructions;
      return (
        <p className="text-sm text-muted-foreground">
          {instructions || "No instructions"}
        </p>
      );
    }
  }
];
