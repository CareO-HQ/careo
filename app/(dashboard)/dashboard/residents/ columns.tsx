"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn, getAge, getColorForBadge } from "@/lib/utils";
import { Resident } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { Clock } from "lucide-react";

// Component for displaying allergies
const AllergiesCell = ({ residentId }: { residentId: string }) => {
  const dietInfo = useQuery(
    api.diet.getDietByResidentId,
    {
      residentId: residentId as Id<"residents">
    }
  );

  if (dietInfo === undefined) {
    // Loading state
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (!dietInfo?.allergies || dietInfo.allergies.length === 0) {
    // No allergies
    return <Badge variant="outline">No allergies</Badge>;
  }

  const allergies = dietInfo.allergies;

  if (allergies.length > 2) {
    const extraAllergies = allergies.length - 2;
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-hide text-ellipsis">
        {allergies.slice(0, 2).map((allergyItem, index: number) => (
          <Badge
            key={index}
            variant="table"
            className="bg-orange-50 text-orange-700 border-orange-300"
          >
            {allergyItem.allergy}
          </Badge>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="table" className="bg-orange-50 text-orange-700 border-orange-300">+{extraAllergies}</Badge>
          </TooltipTrigger>
          <TooltipContent className="bg-white border flex flex-row gap-2">
            {allergies.slice(2).map((allergyItem, index: number) => (
              <Badge
                key={index}
                variant="table"
                className="bg-orange-50 text-orange-700 border-orange-300"
              >
                {allergyItem.allergy}
              </Badge>
            ))}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide text-ellipsis">
      {allergies.map((allergyItem, index: number) => (
        <Badge
          key={index}
          variant="table"
          className="bg-orange-50 text-orange-700 border-orange-300"
        >
          {allergyItem.allergy}
        </Badge>
      ))}
    </div>
  );
};

// Component for displaying next medication intake
const NextMedicationCell = ({ residentId }: { residentId: string }) => {
  const nextIntake = useQuery(
    api.medication.getNextMedicationIntakeByResidentId,
    {
      residentId: residentId as Id<"residents">
    }
  );

  if (nextIntake === undefined) {
    // Loading state
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (!nextIntake) {
    // No upcoming medication
    return <Badge variant="outline">No upcoming medication</Badge>;
  }

  const scheduledDate = new Date(nextIntake.scheduledTime);
  const now = new Date();
  const isToday = scheduledDate.toDateString() === now.toDateString();
  const timeString = scheduledDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  console.log("NEXT INTAKE", nextIntake);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="table"
          className={cn(
            "flex items-center gap-1 text-primary",
            isToday && "bg-blue-50 text-blue-700 border-blue-300"
          )}
        >
          <Clock className="w-3 h-3" />
          {isToday ? `Today ${timeString}` : scheduledDate.toLocaleDateString()}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="bg-white border">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm text-primary">
            {nextIntake.medication?.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {nextIntake.medication?.strength}
            {nextIntake.medication?.strengthUnit} -{" "}
            {nextIntake.medication?.dosageForm}
          </p>
          <p className="text-sm text-muted-foreground">
            Scheduled:{" "}
            {scheduledDate.toLocaleString("en-GB", {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export const columns: ColumnDef<Resident, unknown>[] = [
  {
    id: "name",
    accessorFn: (row) => `${row.firstName || ''} ${row.lastName || ''}`.trim(),
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm"> Name </div>
      );
    },
    enableSorting: false,
    filterFn: (row, columnId, value) => {
      const resident = row.original;
      if (!value || typeof value !== 'string') return true;

      const searchTerm = value.toLowerCase().trim();
      if (!searchTerm) return true;

      const firstName = (resident.firstName || '').toLowerCase();
      const lastName = (resident.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      // Search in first name, last name, and full name
      return firstName.includes(searchTerm) ||
             lastName.includes(searchTerm) ||
             fullName.includes(searchTerm);
    },
    cell: ({ row }) => {
      const resident = row.original;
      const name = `${resident.firstName} ${resident.lastName}`;
      const initials =
        `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();
      const age = getAge(resident.dateOfBirth);

      console.log("RESIDENT", resident);
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
        <div className="text-left text-muted-foreground text-sm">Room No</div>
      );
    },
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.roomNumber;
      const b = rowB.original.roomNumber;

      // Handle null/undefined values
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;

      // Try to parse as numbers for numeric sorting
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      // Fall back to string sorting
      return a.localeCompare(b);
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
    enableSorting: false,
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
    enableSorting: false,
    cell: ({ row }) => {
      const risks = row.original.risks as { risk: string; level?: string }[];
      if (!risks || risks.length === 0) {
        return <Badge variant="outline">No risks</Badge>;
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
    accessorKey: "allergies",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">Allergies</div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const resident = row.original;
      return <AllergiesCell residentId={resident._id} />;
    }
  },
  {
    accessorKey: "dependencies",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          Dependencies
        </div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const deps = row.original.dependencies;

      if (!deps) {
        return <Badge variant="outline">No dependencies</Badge>;
      }

      if (Array.isArray(deps)) {
        const depsList = (deps as string[]).filter(dep =>
          dep && dep.toLowerCase().trim() !== "independent"
        );

        if (depsList.length === 0) {
          return <Badge variant="outline">No dependencies</Badge>;
        }

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="table" className="bg-red-50 text-red-700 border-red-300">
                <p className="flex items-center gap-2">
                  {depsList.length}{" "}
                  {depsList.length > 1 ? "dependencies" : "dependency"}
                </p>
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="flex flex-col gap-2 bg-red-50 border-red-300">
              {depsList.map((dep, index: number) => (
                <div
                  key={index}
                  className="flex flex-row justify-between items-center text-primary w-full gap-4"
                >
                  <p className="text-primary font-medium">{dep}</p>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        );
      } else if (typeof deps === "object") {
        const depObj = deps as {
          mobility: string;
          eating: string;
          dressing: string;
          toileting: string;
        };

        const activeDeps = Object.entries(depObj).filter(
          ([, value]) => value && value.toLowerCase().trim() !== "independent"
        );

        if (activeDeps.length === 0) {
          return <Badge variant="outline">Independent</Badge>;
        }

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="table" className="bg-red-50 text-red-700 border-red-300">
                <p className="flex items-center gap-2">
                  {activeDeps.length}{" "}
                  {activeDeps.length > 1 ? "dependencies" : "dependency"}
                </p>
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="flex flex-col gap-2 bg-red-50 border-red-300">
              {activeDeps.map(([category, level], index: number) => (
                <div
                  key={index}
                  className="flex flex-row justify-between items-center text-primary w-full gap-4"
                >
                  <p className="text-primary font-medium capitalize">
                    {category}
                  </p>
                  <p className="text-muted-foreground">{level}</p>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
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
    enableSorting: false,
    cell: ({ row }) => {
      const resident = row.original;
      return <NextMedicationCell residentId={resident._id} />;
    }
  }
];
