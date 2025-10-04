"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getAge } from "@/lib/utils";
import { Resident } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { useState, useEffect } from "react";

// Component for displaying handover report
const HandoverReportCell = ({ residentId, teamId }: { residentId: string; teamId?: string }) => {
  // Get the last handover timestamp for this team
  const lastHandoverTimestamp = useQuery(
    api.handoverReports.getLastHandoverTimestamp,
    teamId ? { teamId } : "skip"
  );

  const report = useQuery(api.handover.getHandoverReport, {
    residentId: residentId as Id<"residents">,
    afterTimestamp: lastHandoverTimestamp ?? undefined,
  });

  if (!report) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (report.foodIntakeCount === 0) {
    return (
      <Badge variant="table" className="bg-green-50 text-green-700 border-green-300">
        0 meals
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-green-50 text-green-700 border-green-300 cursor-pointer">
          {report.foodIntakeCount} meals
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-white border max-w-md">
        <div className="flex flex-col gap-2">
          {report.foodIntakeLogs.map((log, index) => (
            <div key={log.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-primary">
                  {log.typeOfFoodDrink}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Amount: {log.amountEaten}
              </div>
              <div className="text-sm">
                Section: {log.section}
              </div>
              {index < report.foodIntakeLogs.length - 1 && (
                <div className="border-t my-1" />
              )}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Component for displaying fluid total
const FluidTotalCell = ({ residentId, teamId }: { residentId: string; teamId?: string }) => {
  // Get the last handover timestamp for this team
  const lastHandoverTimestamp = useQuery(
    api.handoverReports.getLastHandoverTimestamp,
    teamId ? { teamId } : "skip"
  );

  const report = useQuery(api.handover.getHandoverReport, {
    residentId: residentId as Id<"residents">,
    afterTimestamp: lastHandoverTimestamp ?? undefined,
  });

  if (!report) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (report.totalFluid === 0 || !report.fluidLogs || report.fluidLogs.length === 0) {
    return (
      <Badge variant="table" className="bg-blue-50 text-blue-700 border-blue-300">
        0 ml
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-blue-50 text-blue-700 border-blue-300 cursor-pointer">
          {report.totalFluid} ml
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-white border max-w-md">
        <div className="flex flex-col gap-2">
          {report.fluidLogs.map((log, index) => (
            <div key={log.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-primary">
                  {log.typeOfFoodDrink}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Amount: {log.fluidConsumedMl} ml
              </div>
              <div className="text-sm">
                Section: {log.section}
              </div>
              {index < report.fluidLogs.length - 1 && (
                <div className="border-t my-1" />
              )}
            </div>
          ))}
          <div className="border-t my-1" />
          <div className="font-medium text-sm text-primary">
            Total: {report.totalFluid} ml
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Component for displaying incidents
const IncidentsCell = ({ residentId, teamId }: { residentId: string; teamId?: string }) => {
  // Get the last handover timestamp for this team
  const lastHandoverTimestamp = useQuery(
    api.handoverReports.getLastHandoverTimestamp,
    teamId ? { teamId } : "skip"
  );

  const report = useQuery(api.handover.getHandoverReport, {
    residentId: residentId as Id<"residents">,
    afterTimestamp: lastHandoverTimestamp ?? undefined,
  });

  if (!report) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (report.incidentCount === 0) {
    return (
      <Badge variant="table" className="bg-green-50 text-green-700 border-green-300">
        0
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-red-50 text-red-700 border-red-300 cursor-pointer">
          {report.incidentCount}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-white border max-w-md">
        <div className="flex flex-col gap-2">
          {report.incidents.map((incident, index) => (
            <div key={incident.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-primary">
                  Incident {index + 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  {incident.time}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Type: {incident.type.join(", ") || "Not specified"}
              </div>
              <div className="text-sm">
                Level: <span className="capitalize">{incident.level.replace("_", " ")}</span>
              </div>
              {index < report.incidents.length - 1 && (
                <div className="border-t my-1" />
              )}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Component for displaying hospital transfers
const HospitalTransferCell = ({ residentId, teamId }: { residentId: string; teamId?: string }) => {
  // Get the last handover timestamp for this team
  const lastHandoverTimestamp = useQuery(
    api.handoverReports.getLastHandoverTimestamp,
    teamId ? { teamId } : "skip"
  );

  const report = useQuery(api.handover.getHandoverReport, {
    residentId: residentId as Id<"residents">,
    afterTimestamp: lastHandoverTimestamp ?? undefined,
  });

  if (!report) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (report.hospitalTransferCount === 0) {
    return (
      <Badge variant="table" className="bg-green-50 text-green-700 border-green-300">
        0
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-purple-50 text-purple-700 border-purple-300 cursor-pointer">
          {report.hospitalTransferCount}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-white border max-w-md">
        <div className="flex flex-col gap-2">
          {report.hospitalTransfers.map((transfer, index) => (
            <div key={transfer.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-primary">
                  Transfer {index + 1}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Hospital: {transfer.hospitalName}
              </div>
              <div className="text-sm">
                Reason: {transfer.reason}
              </div>
              {index < report.hospitalTransfers.length - 1 && (
                <div className="border-t my-1" />
              )}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Component for comments with localStorage persistence
const CommentsCell = ({ residentId }: { residentId: string }) => {
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `handover-comment-${today}-${residentId}`;

  const [comment, setComment] = useState("");

  // Load comment from localStorage on mount
  useEffect(() => {
    const savedComment = localStorage.getItem(storageKey);
    if (savedComment) {
      setComment(savedComment);
    }
  }, [storageKey]);

  // Save comment to localStorage on change
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);
    localStorage.setItem(storageKey, value);
  };

  return (
    <Textarea
      placeholder="Add handover comments..."
      className="h-[60px] resize-none w-full max-w-md"
      data-resident-id={residentId}
      value={comment}
      onChange={handleCommentChange}
    />
  );
};

export const getColumns = (teamId?: string): ColumnDef<Resident, unknown>[] => [
  {
    id: "name",
    accessorFn: (row) => `${row.firstName || ''} ${row.lastName || ''}`.trim(),
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">Name</div>
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

      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={resident.imageUrl} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="font-medium">
            <p>
              {resident.firstName} {resident.lastName}
            </p>
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

      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;

      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

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
    accessorKey: "foodIntake",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          Food Intake
        </div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const resident = row.original;
      return <HandoverReportCell residentId={resident._id} teamId={teamId} />;
    }
  },
  {
    accessorKey: "fluidTotal",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          Fluid Total
        </div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const resident = row.original;
      return <FluidTotalCell residentId={resident._id} teamId={teamId} />;
    }
  },
  {
    accessorKey: "incidents",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">Incidents</div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const resident = row.original;
      return <IncidentsCell residentId={resident._id} teamId={teamId} />;
    }
  },
  {
    accessorKey: "hospitalTransfer",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">
          Hospital Transfer
        </div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      const resident = row.original;
      return <HospitalTransferCell residentId={resident._id} teamId={teamId} />;
    }
  },
  {
    accessorKey: "medication",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">Medication</div>
      );
    },
    enableSorting: false,
    cell: ({ row }) => {
      return (
        <div className="text-sm text-muted-foreground">—</div>
      );
    }
  },
  {
    accessorKey: "comments",
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">Comments</div>
      );
    },
    enableSorting: false,
    size: 400,
    cell: ({ row }) => {
      const resident = row.original;
      return <CommentsCell residentId={resident._id} />;
    }
  }
];