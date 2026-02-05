"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { getAge } from "@/lib/utils";
import { Resident } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { useState, useEffect, useRef } from "react";
import { getCurrentShift } from "@/lib/config/shift-config";
import { toast } from "sonner";
import { handoverService } from "@/lib/handover-service";

// Helper hook for handover stats
const useHandoverStats = (residentId: string, teamId?: string) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!residentId) return;
      setLoading(true);
      try {
        const timestamp = teamId ? await handoverService.getLastHandoverTimestamp(teamId) : undefined;
        const data = await handoverService.getHandoverStats(residentId, timestamp || undefined);
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch handover stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [residentId, teamId]);

  return { stats, loading };
};

// Component for displaying handover report
const HandoverReportCell = ({ residentId, teamId }: { residentId: string; teamId?: string }) => {
  const { stats: report, loading } = useHandoverStats(residentId, teamId);

  if (loading || !report) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (report.foodIntakeCount === 0) {
    return (
      <Badge variant="table" className="bg-green-50 text-green-700 border-green-300 rounded-sm text-[10px] px-1 py-0 h-5">
        0 meals
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-green-50 text-green-700 border-green-300 rounded-sm cursor-pointer text-[10px] px-1 py-0 h-5">
          {report.foodIntakeCount} meals
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-white border max-w-md">
        <div className="flex flex-col gap-2">
          {report.foodIntakeLogs.map((log: any, index: number) => (
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
  const { stats: report, loading } = useHandoverStats(residentId, teamId);

  if (loading || !report) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (report.totalFluid === 0 || !report.fluidLogs || report.fluidLogs.length === 0) {
    return (
      <Badge variant="table" className="bg-blue-50 text-blue-700 border-blue-300 rounded-sm text-[10px] px-1 py-0 h-5">
        0 ml
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-blue-50 text-blue-700 border-blue-300 rounded-sm cursor-pointer text-[10px] px-1 py-0 h-5">
          {report.totalFluid} ml
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-white border max-w-md">
        <div className="flex flex-col gap-2">
          {report.fluidLogs.map((log: any, index: number) => (
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
  const { stats: report, loading } = useHandoverStats(residentId, teamId);

  if (loading || !report) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (report.incidentCount === 0) {
    return (
      <Badge variant="table" className="bg-green-50 text-green-700 border-green-300 rounded-sm text-[10px] px-1 py-0 h-5">
        0
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-red-50 text-red-700 border-red-300 rounded-sm cursor-pointer text-[10px] px-1 py-0 h-5">
          {report.incidentCount}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-white border max-w-md">
        <div className="flex flex-col gap-2">
          {report.incidents.map((incident: any, index: number) => (
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
                Level: <span className="capitalize">{(incident.level || "").replace("_", " ")}</span>
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
  const { stats: report, loading } = useHandoverStats(residentId, teamId);

  if (loading || !report) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (report.hospitalTransferCount === 0) {
    return (
      <Badge variant="table" className="bg-green-50 text-green-700 border-green-300 rounded-sm text-[10px] px-1 py-0 h-5">
        0
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="table" className="bg-purple-50 text-purple-700 border-purple-300 rounded-sm cursor-pointer text-[10px] px-1 py-0 h-5">
          {report.hospitalTransferCount}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-white border max-w-md">
        <div className="flex flex-col gap-2">
          {report.hospitalTransfers.map((transfer: any, index: number) => (
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
  currentUserName,
  organizationId,
}: {
  residentId: string;
  teamId?: string;
  currentUserId?: string;
  currentUserName?: string;
  organizationId?: string;
}) => {
  const today = new Date().toISOString().split('T')[0];
  const shift = getCurrentShift();

  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const initialLoadComplete = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load existing comment on mount
  useEffect(() => {
    async function loadComment() {
      if (!residentId) return;
      try {
        const data = await handoverService.getComment(residentId, today, shift);
        if (data && !initialLoadComplete.current) {
          setComment(data.comment);
          setLastSavedAt(new Date(data.updated_at).getTime());
          initialLoadComplete.current = true;
        }
      } catch (error) {
        console.error("Failed to load comment:", error);
      }
    }
    loadComment();
  }, [residentId, today, shift]);

  // Auto-save with debounce
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setComment(value);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds)
    saveTimeoutRef.current = setTimeout(async () => {
      if (!teamId || !currentUserId || !currentUserName) return;

      setIsSaving(true);
      try {
        await handoverService.saveComment({
          teamId,
          residentId: residentId,
          date: today,
          shift,
          comment: value,
          createdBy: currentUserId,
          organizationId: organizationId || "",
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
    <div className="relative w-full h-full">
      <Input
        placeholder="Add handover comments..."
        className="h-8 w-full text-sm border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-2"
        data-resident-id={residentId}
        value={comment}
        onChange={handleCommentChange}
      />
      {(isSaving || lastSavedAt) && (
        <div className="absolute bottom-0 right-2 text-[10px] text-muted-foreground italic">
          {isSaving ? "Saving..." : getLastSavedText()}
        </div>
      )}
    </div>
  );
};

export const getColumns = (
  teamId?: string,
  currentUserId?: string,
  currentUserName?: string,
  organizationId?: string
): ColumnDef<Resident, unknown>[] => [
    {
      id: "name",
      accessorFn: (row) => `${row.firstName || row.first_name || ''} ${row.lastName || row.last_name || ''}`.trim(),
      header: () => {
        return (
          <div className="text-left text-muted-foreground text-sm">Name</div>
        );
      },
      enableSorting: false,
      size: 130,
      filterFn: (row, columnId, value) => {
        const resident = row.original;
        if (!value || typeof value !== 'string') return true;

        const searchTerm = value.toLowerCase().trim();
        if (!searchTerm) return true;

        const firstName = (resident.firstName || resident.first_name || '').toLowerCase();
        const lastName = (resident.lastName || resident.last_name || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();

        return firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          fullName.includes(searchTerm);
      },
      cell: ({ row }) => {
        const resident = row.original;
        const firstName = resident.firstName || resident.first_name || '';
        const lastName = resident.lastName || resident.last_name || '';
        const name = `${firstName} ${lastName}`;
        const initials =
          `${(firstName[0] || '')}${(lastName[0] || '')}`.toUpperCase();

        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={resident.imageUrl || resident.image_url} alt={name} />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <div className="font-medium text-xs truncate max-w-[90px]">
              {firstName} {lastName}
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
      size: 50,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.roomNumber || rowA.original.room_number;
        const b = rowB.original.roomNumber || rowB.original.room_number;

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
          <p className="text-muted-foreground text-xs">
            {row.original.roomNumber || row.original.room_number || "-"}
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
      size: 70,
      cell: ({ row }) => {
        const resident = row.original;
        return <HandoverReportCell residentId={resident.id} teamId={teamId} />;
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
      size: 70,
      cell: ({ row }) => {
        const resident = row.original;
        return <FluidTotalCell residentId={resident.id} teamId={teamId} />;
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
      size: 50,
      cell: ({ row }) => {
        const resident = row.original;
        return <IncidentsCell residentId={resident.id} teamId={teamId} />;
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
      size: 100,
      cell: ({ row }) => {
        const resident = row.original;
        return <HospitalTransferCell residentId={resident.id} teamId={teamId} />;
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
      size: 70,
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
      size: 200,
      cell: ({ row }) => {
        const resident = row.original;
        return (
          <CommentsCell
            residentId={resident.id}
            teamId={teamId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            organizationId={organizationId}
          />
        );
      }
    }
  ];
