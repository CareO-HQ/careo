"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Id } from "@/convex/_generated/dataModel";
import { getLabelClassName } from "@/lib/settings/labels";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { FileIcon, MoreHorizontal, PencilIcon, Trash2Icon } from "lucide-react";

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
        <div
          className={cn(
            "text-left font-medium w-fit px-2 rounded-md",
            labelClassName
          )}
        >
          {row.getValue("name")}
        </div>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                <PencilIcon />
                Edit label
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileIcon />
                View labeled files
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Trash2Icon />
                Delete label
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }
  }
];
