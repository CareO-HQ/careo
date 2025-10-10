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
import { useQuery, useMutation } from "convex/react";
import { useState, useEffect, useRef } from "react";
import { getCurrentShift } from "@/lib/config/shift-config";
import { toast } from "sonner";

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
      <Badge variant="table" className="bg-green-50 text-green-700 border-green-300 rounded-sm">
        0 meals
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-green-50 text-green-700 border-green-300 rounded-sm cursor-pointer">
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
      <Badge variant="table" className="bg-blue-50 text-blue-700 border-blue-300 rounded-sm">
        0 ml
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-blue-50 text-blue-700 border-blue-300 rounded-sm cursor-pointer">
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
      <Badge variant="table" className="bg-green-50 text-green-700 border-green-300 rounded-sm">
        0
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-red-50 text-red-700 border-red-300 rounded-sm cursor-pointer">
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
      <Badge variant="table" className="bg-green-50 text-green-700 border-green-300 rounded-sm">
        0
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-purple-50 text-purple-700 border-purple-300 rounded-sm cursor-pointer">
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

// Component for comments with database persistence and auto-save
const CommentsCell = ({
  residentId,
  teamId,
  currentUserId,
  currentUserName
}: {
  residentId: string;
  teamId?: string;
  currentUserId?: string;
  currentUserName?: string;
}) => {
  const today = new Date().toISOString().split('T')[0];
  const shift = getCurrentShift();

  // Fetch existing comment from database
  const existingComment = useQuery(
    teamId && currentUserId
      ? api.handoverComments.getComment
      : "skip",
    teamId && currentUserId ? {
      teamId,
      residentId: residentId as Id<"residents">,
      date: today,
      shift,
    } : "skip"
  );

  const saveComment = useMutation(api.handoverComments.saveComment);

  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const initialLoadComplete = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load existing comment on mount
  useEffect(() => {
    if (existingComment && !initialLoadComplete.current) {
      setComment(existingComment.comment);
      setLastSavedAt(existingComment.updatedAt);
      initialLoadComplete.current = true;
    }
  }, [existingComment]);

  // Auto-save with debounce
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds)
    saveTimeoutRef.current = setTimeout(async () => {
      if (!teamId || !currentUserId || !currentUserName) return;
      if (value === existingComment?.comment) return;

      setIsSaving(true);
      try {
        await saveComment({
          teamId,
          residentId: residentId as Id<"residents">,
          date: today,
          shift,
          comment: value,
          createdBy: currentUserId,
          createdByName: currentUserName,
        });
        setLastSavedAt(Date.now());
      } catch (error) {
        console.error("Failed to save comment:", error);
        toast.error("Failed to save comment. Please check your connection and try again.");
      } finally {
        setIsSaving(false);
      }
    }, 2000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Format last saved time
  const getLastSavedText = () => {
    if (!lastSavedAt) return null;

    return `Edited at ${new Date(lastSavedAt).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <div className="relative">
      <Textarea
        placeholder="Add handover comments..."
        className="h-[40px] resize-none w-full max-w-md pb-5 text-sm border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
        data-resident-id={residentId}
        value={comment}
        onChange={handleCommentChange}
      />
      {(isSaving || lastSavedAt) && (
        <div className="absolute bottom-1 right-2 text-xs text-muted-foreground italic">
          {isSaving ? "Saving..." : getLastSavedText()}
        </div>
      )}
    </div>
  );
};

export const getColumns = (
  teamId?: string,
  currentUserId?: string,
  currentUserName?: string
): ColumnDef<Resident, unknown>[] => [
  {
    id: "name",
    accessorFn: (row) => `${row.firstName || ''} ${row.lastName || ''}`.trim(),
    header: () => {
      return (
        <div className="text-left text-muted-foreground text-sm">Name</div>
      );
    },
    enableSorting: false,
    size: 180,
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

      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={resident.imageUrl} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="font-medium text-sm">
            {resident.firstName} {resident.lastName}
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
    size: 80,
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
    size: 100,
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
    size: 90,
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
    size: 80,
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
    size: 130,
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
    size: 100,
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
    size: 300,
    cell: ({ row }) => {
      const resident = row.original;
      return (
        <CommentsCell
          residentId={resident._id}
          teamId={teamId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      );
    }
  }
];