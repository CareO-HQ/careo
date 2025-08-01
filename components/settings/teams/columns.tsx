"use client";

import { ColumnDef } from "@tanstack/react-table";

interface Team {
  id: string;
  name: string;
  organizationId: string;
  createdAt: number;
  members: number;
}

export const columns: ColumnDef<Team>[] = [
  {
    accessorKey: "name",
    header: () => <div className="text-left">Name</div>,
    cell: ({ row }) => {
      return (
        <div className="text-left font-medium">{row.getValue("name")}</div>
      );
    }
  },
  {
    accessorKey: "members",
    header: () => <div className="text-right">Members</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right font-medium">{row.getValue("members")}</div>
      );
    }
  },
  {
    accessorKey: "createdAt",
    header: () => <div className="text-right">Created At</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right font-medium">
          {new Date(row.getValue("createdAt")).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          })}
        </div>
      );
    }
  }
];
