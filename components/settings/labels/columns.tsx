"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Id } from "@/convex/_generated/dataModel";
import { getLabelClassName } from "@/lib/settings/labels";
import { cn } from "@/lib/utils";

interface Label {
  _id: Id<"labels">;
  _creationTime: number;
  name: string;
  color: string;
  organizationId: string;
}

export const columns: ColumnDef<Label>[] = [
  {
    accessorKey: "name",
    header: () => <div className="text-left">Name</div>,
    cell: ({ row }) => {
      const color = row.original.color;
      const labelClassName = getLabelClassName(color);
      return (
        <div className={cn("text-left font-medium w-fit px-2 rounded-md", labelClassName)}>
          {row.getValue("name")}
        </div>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return <div className="text-right font-medium"></div>;
    }
  }
];
