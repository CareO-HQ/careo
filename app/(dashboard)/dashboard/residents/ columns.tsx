"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Resident } from "@/types";
import { IconDotsVertical } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, CircleQuestionMark } from "lucide-react";
import { cn, getAge, getColorForBadge } from "@/lib/utils";

export const columns: ColumnDef<Resident>[] = [
  {
    accessorKey: "details",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm"> Name </div>
      );
    },
    cell: ({ row }) => {
      const resident = row.original;
      const name = `${resident.firstName} ${resident.lastName}`;
      const initials =
        `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();
      const age = getAge(resident.dateOfBirth);
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={resident.imageUrl} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="font-medium">
            <p>
              {resident.firstName} {resident.lastName}
            </p>{" "}
            <span className="text-muted-foreground">{age} years old</span>
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: "roomNumber",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm"> Room No </div>
      );
    },
    cell: ({ row }) => {
      return (
        <p className="text-muted-foreground">
          {row.original.roomNumber || "-"}
        </p>
      );
    }
  },
  {
    accessorKey: "healthConditions",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          Health Conditions
        </div>
      );
    },
    cell: ({ row }) => {
      const conditions = row.original.healthConditions;
      console.log(conditions);
      if (!conditions || conditions.length === 0) {
        return <Badge variant="table">No conditions</Badge>;
      }

      if (conditions.length > 2) {
        const extraConditions = conditions.length - 2;
        return (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide text-ellipsis">
            {conditions.slice(0, 2).map((condition, index: number) => (
              <Badge
                key={index}
                variant="table"
                className={getColorForBadge(condition.toString())}
              >
                {condition.toString()}
              </Badge>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="table">+{extraConditions}</Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-white border flex flex-row gap-2">
                {conditions.slice(2).map((condition, index: number) => (
                  <Badge
                    key={index}
                    variant="table"
                    className={getColorForBadge(condition.toString())}
                  >
                    {condition.toString()}
                  </Badge>
                ))}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      }

      return (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide text-ellipsis">
          {conditions?.map((condition, index: number) => (
            <Badge
              key={index}
              variant="table"
              className={getColorForBadge(condition.toString())}
            >
              {condition.toString()}
            </Badge>
          ))}
        </div>
      );
    }
  },
  {
    accessorKey: "risks",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm"> Risks </div>
      );
    },
    cell: ({ row }) => {
      const risks = row.original.risks as { risk: string; level?: string }[];
      if (!risks || risks.length === 0) {
        return <Badge variant="secondary">No risks</Badge>;
      }

      // Get the higher level risk
      const higherLevelRisk = risks.reduce((max, risk) => {
        return risk.level === "high" ? risk : max;
      }, risks[0]);

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="table"
              className={cn(
                higherLevelRisk.level === "high" &&
                  "bg-red-50 text-red-700 border-red-300",
                higherLevelRisk.level === "medium" &&
                  "bg-yellow-50 text-yellow-700 border-yellow-300",
                higherLevelRisk.level === "low" &&
                  "bg-blue-50 text-blue-700 border-blue-300"
              )}
            >
              <p className="flex items-center gap-2">
                {risks.length} {risks.length > 1 ? "risks" : "risk"}
              </p>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="flex flex-col gap-2 bg-white border">
            {(risks as { risk: string; level?: string }[]).map(
              (riskItem, index: number) => (
                <div
                  key={index}
                  className="flex flex-row justify-between items-center text-primary w-full gap-4"
                >
                  <p className="text-primary font-medium">{riskItem.risk}</p>
                  <p className="text-muted-foreground">
                    {/* first letter uppercase */}
                    {riskItem.level
                      ? riskItem.level.charAt(0).toUpperCase() +
                        riskItem.level.slice(1)
                      : "Low"}
                  </p>
                </div>
              )
            )}
          </TooltipContent>
        </Tooltip>
      );
    }
  },
  {
    accessorKey: "dependencies",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          {" "}
          Dependency{" "}
        </div>
      );
    },
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
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          Next Scheduled Medication
        </div>
      );
    },
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
