"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown } from "lucide-react";
import { AuditItem, AuditStatus } from "./types";

const statusColorMap: Record<AuditStatus, string> = {
  PENDING_AUDIT: "bg-red-100 text-red-800 hover:bg-red-100",
  ISSUE_ASSIGNED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  REASSIGNED: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  PENDING_VERIFICATION: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  AUDITED: "bg-green-100 text-green-800 hover:bg-green-100"
};

const typeColorMap = {
  "Care Plan": "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  "Risk Assessment": "bg-rose-100 text-rose-800 hover:bg-rose-100",
  "Incident Report": "bg-amber-100 text-amber-800 hover:bg-amber-100"
};

export const createColumns = (
  onActionPlanClick: (item: AuditItem) => void,
  onReportClick?: (item: AuditItem) => void,
  onStatusChange?: (itemId: string, newStatus: AuditStatus) => void,
  onAssigneeChange?: (itemId: string, assignedTo: string) => void,
  staffMembers?: { id: string; name: string }[]
): ColumnDef<AuditItem>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "residentPhoto",
    header: "Resident",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={item.residentPhoto} alt={item.residentName} />
            <AvatarFallback>
              {item.residentName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{item.residentName}</p>
            <p className="text-sm text-muted-foreground">{item.residentId}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const type = row.getValue("type") as AuditItem["type"];
      return (
        <Badge className={typeColorMap[type]} variant="secondary">
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Report Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const title = row.getValue("title") as string;
      const item = row.original;
      const words = title.split(" ");
      const truncatedTitle = words.slice(0, 2).join(" ");
      const needsTruncation = words.length > 2;

      const handleClick = () => {
        if (onReportClick) {
          onReportClick(item);
        }
      };

      if (!needsTruncation) {
        return (
          <button
            onClick={handleClick}
            className="max-w-[300px] text-left hover:text-blue-600 hover:underline cursor-pointer transition-colors"
          >
            {title}
          </button>
        );
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleClick}
                className="max-w-[300px] text-left hover:text-blue-600 hover:underline cursor-pointer transition-colors"
              >
                {truncatedTitle}...
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{title}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "actionPlan",
    header: "Issues",
    cell: ({ row }) => {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onActionPlanClick(row.original)}
        >
          {row.original.followUpNote ? "Edit" : "Create"}
        </Button>
      );
    },
  },
  {
    accessorKey: "status",
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
      const status = row.getValue("status") as AuditStatus;
      const itemId = row.original.id;
      
      const statuses: { value: AuditStatus; label: string }[] = [
        { value: "PENDING_AUDIT", label: "Pending audit" },
        { value: "ISSUE_ASSIGNED", label: "Issue assigned" },
        { value: "REASSIGNED", label: "Reassigned" },
        { value: "IN_PROGRESS", label: "In progress" },
        { value: "PENDING_VERIFICATION", label: "Pending verification" },
        { value: "AUDITED", label: "Audited" }
      ];
      
      return (
        <Select
          value={status}
          onValueChange={(newStatus: AuditStatus) => {
            if (onStatusChange) {
              onStatusChange(itemId, newStatus);
            }
          }}
        >
          <SelectTrigger className="w-[140px] h-8 border-0 p-0 focus:ring-0">
            <SelectValue>
              <Badge className={statusColorMap[status]} variant="secondary">
                {status.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statuses.map((statusOption) => (
              <SelectItem key={statusOption.value} value={statusOption.value}>
                <Badge 
                  className={statusColorMap[statusOption.value]} 
                  variant="secondary"
                >
                  {statusOption.label}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    },
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
    cell: ({ row }) => {
      const assignedTo = row.getValue("assignedTo") as string | undefined;
      const itemId = row.original.id;
      
      if (!onAssigneeChange || !staffMembers) {
        return assignedTo ? (
          <span>{assignedTo}</span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        );
      }
      
      return (
        <Select
          value={assignedTo || "unassigned"}
          onValueChange={(value) => {
            const newAssignee = value === "unassigned" ? "" : value;
            onAssigneeChange(itemId, newAssignee);
          }}
        >
          <SelectTrigger className="w-[160px] h-8 border-0 p-2 focus:ring-0">
            <SelectValue>
              {assignedTo || <span className="text-muted-foreground">Unassigned</span>}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <span className="text-muted-foreground">Unassigned</span>
            </SelectItem>
            {staffMembers.map((staff) => (
              <SelectItem key={staff.id} value={staff.name}>
                {staff.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    },
  },
  {
    accessorKey: "updatedDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("updatedDate") as Date;
      return <div>{format(date, "MMM d, yyyy")}</div>;
    },
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("dueDate") as Date | undefined;
      if (!date) return <span className="text-muted-foreground">No due date</span>;
      
      const isOverdue = date < new Date();
      return (
        <div className={isOverdue ? "text-red-600 font-medium" : ""}>
          {format(date, "MMM d, yyyy")}
        </div>
      );
    },
  },
];