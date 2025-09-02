"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { IconDotsVertical } from "@tabler/icons-react";
import {
  ChevronDown,
  CircleQuestionMark,
  FileQuestionIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";

export type Resident = {
  _id: string;
  firstName: string;
  lastName: string;
  roomNumber?: string;
  healthConditions?: string[] | { condition: string }[];
  risks?: string[] | { risk: string; level?: "low" | "medium" | "high" }[];
  dependencies?:
    | string[]
    | {
        mobility: string;
        eating: string;
        dressing: string;
        toileting: string;
      };
  phoneNumber?: string;
  dateOfBirth: string;
  admissionDate: string;
  imageUrl: string;
};

export const columns: ColumnDef<Resident>[] = [
  {
    accessorKey: "avatar",
    header: "",
    cell: ({ row }) => {
      const resident = row.original;
      const name = `${resident.firstName} ${resident.lastName}`;
      const initials =
        `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

      return (
        <Avatar className="h-8 w-8">
          <AvatarImage src={resident.imageUrl} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      );
    }
  },
  {
    accessorKey: "details",
    header: "Name",
    cell: ({ row }) => {
      const resident = row.original;
      return (
        <div>
          <div className="font-medium">
            {resident.firstName} {resident.lastName}
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: "roomNumber",
    header: "Room No",
    cell: ({ row }) => row.original.roomNumber || "-"
  },
  {
    accessorKey: "healthConditions",
    header: "Health Conditions",
    cell: ({ row }) => {
      const conditions = row.original.healthConditions;
      console.log(conditions);
      if (!conditions || conditions.length === 0) {
        return <Badge variant="secondary">No conditions</Badge>;
      }

      if (conditions.length > 2) {
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline">
                <p className="flex items-center gap-2 group">
                  {conditions.length} conditions
                  <CircleQuestionMark className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </p>
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="flex flex-row gap-2">
              {conditions.map((condition, index: number) => (
                <Badge key={index} variant="secondary">
                  {condition.toString()}
                </Badge>
              ))}
            </TooltipContent>
          </Tooltip>
        );
      }

      return (
        <div className="flex gap-2 max-w-48 overflow-x-auto scrollbar-hide text-ellipsis">
          {conditions?.map((condition, index: number) => (
            <Badge key={index} variant="outline">
              {condition.toString()}
            </Badge>
          ))}
        </div>
      );
    }
  },
  {
    accessorKey: "risks",
    header: "Risks",
    cell: ({ row }) => {
      const risks = row.original.risks;
      if (!risks || risks.length === 0) {
        return <Badge variant="secondary">No risks</Badge>;
      }

      console.log("RISKS", risks);

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline">
              <p className="flex items-center gap-2 group">
                {risks.length} risks
                <CircleQuestionMark className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </p>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="flex flex-row gap-2">
            {(risks as { risk: string; level?: string }[]).map(
              (riskItem, index: number) => (
                <Badge key={index} variant="secondary">
                  {riskItem.risk} {riskItem.level && `(${riskItem.level})`}
                </Badge>
              )
            )}
          </TooltipContent>
        </Tooltip>
      );
    }
  },
  {
    accessorKey: "dependencies",
    header: "Dependency",
    cell: ({ row }) => {
      const deps = row.original.dependencies;

      if (!deps) {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 px-2 text-muted-foreground"
              >
                No dependencies
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem disabled>
                No dependencies recorded
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }

      if (Array.isArray(deps)) {
        const depsList = deps as string[];
        const displayText =
          depsList.length > 2
            ? `${depsList.slice(0, 2).join(", ")}... (+${depsList.length - 2})`
            : depsList.join(", ");

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2">
                {displayText}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {depsList.map((dep, index) => (
                <DropdownMenuItem
                  key={index}
                  className="flex items-center gap-2"
                >
                  <Badge variant="outline" className="text-xs">
                    {dep}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      } else if (typeof deps === "object") {
        const depObj = deps as {
          mobility: string;
          eating: string;
          dressing: string;
          toileting: string;
        };
        const activeDeps = Object.entries(depObj).filter(
          ([, value]) => value && value !== "Independent"
        );
        const displayText =
          activeDeps.length > 0
            ? `${activeDeps.length} dependencies`
            : "Independent";

        const getDependencyColor = (level: string) => {
          switch (level) {
            case "Fully Dependent":
              return "destructive";
            case "Assistance Needed":
              return "default";
            case "Supervision Needed":
              return "secondary";
            case "Independent":
              return "outline";
            default:
              return "outline";
          }
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2">
                {displayText}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {Object.entries(depObj).map(([category, level]) => (
                <DropdownMenuItem
                  key={category}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="capitalize font-medium">{category}</span>
                  <Badge
                    variant={getDependencyColor(level)}
                    className="text-xs"
                  >
                    {level}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }

      return "-";
    }
  },
  {
    accessorKey: "medication",
    header: "Next Scheduled Medication",
    cell: () => "-" // Leave blank as requested
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Make a copy</DropdownMenuItem>
          <DropdownMenuItem>Favorite</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
];
