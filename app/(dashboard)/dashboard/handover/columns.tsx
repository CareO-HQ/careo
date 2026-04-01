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
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useHandoverComment } from "@/hooks/use-handover-comment";
import { useProfile } from "@/hooks/use-profile";
import { getUKTodayDate } from "@/lib/date-utils";

// Helper function to fetch handover report data
const useHandoverReport = (residentId: string, teamId?: string) => {
  const { supabase } = useSupabase();
  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!residentId || !supabase) {
      setIsLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        const today = getUKTodayDate();
        const fluidTypes = ["Water", "Tea", "Coffee", "Juice", "Milk"];

        // Fetch food/fluid logs for today
        const { data: logs, error: logsError } = await supabase
          .from("food_fluid_logs")
          .select("*")
          .eq("resident_id", residentId)
          .eq("date", today)
          .eq("is_archived", false)
          .order("timestamp", { ascending: false });

        if (logsError) throw logsError;

        // Separate food and fluid logs
        const foodLogs = (logs || []).filter(log =>
          log.type_of_food_drink &&
          !fluidTypes.includes(log.type_of_food_drink) &&
          !log.fluid_consumed_ml &&
          log.amount_eaten &&
          log.amount_eaten !== "None" &&
          log.amount_eaten.trim() !== ""
        );

        const fluidLogs = (logs || []).filter(log =>
          fluidTypes.includes(log.type_of_food_drink) || (log.fluid_consumed_ml && log.fluid_consumed_ml > 0)
        );

        const totalFluid = fluidLogs.reduce((sum, log) => sum + (log.fluid_consumed_ml || 0), 0);

        // Fetch incidents for today
        const { data: incidents, error: incidentsError } = await supabase
          .from("incidents")
          .select("*")
          .eq("resident_id", residentId)
          .eq("date", today)
          .order("time", { ascending: false });

        if (incidentsError) throw incidentsError;

        // Fetch hospital transfers for today
        const { data: transfers, error: transfersError } = await supabase
          .from("hospital_transfer_logs")
          .select("*")
          .eq("resident_id", residentId)
          .eq("date", today);

        if (transfersError) throw transfersError;

        // Fetch appointments for today
        const { data: appointments, error: appointmentsError } = await supabase
          .from("appointments")
          .select("*")
          .eq("resident_id", residentId)
          .gte("start_time", `${today}T00:00:00Z`)
          .lte("start_time", `${today}T23:59:59Z`);

        if (appointmentsError) throw appointmentsError;

        setReport({
          foodIntakeCount: foodLogs.length,
          foodIntakeLogs: foodLogs.map(log => ({
            id: log.id,
            typeOfFoodDrink: log.type_of_food_drink,
            amountEaten: log.amount_eaten,
            section: log.section,
            timestamp: new Date(log.timestamp).getTime(),
          })),
          totalFluid,
          fluidLogs: fluidLogs.map(log => ({
            id: log.id,
            typeOfFoodDrink: log.type_of_food_drink,
            fluidConsumedMl: log.fluid_consumed_ml,
            section: log.section,
            timestamp: new Date(log.timestamp).getTime(),
          })),
          incidentCount: incidents?.length || 0,
          incidents: (incidents || []).map(inc => ({
            id: inc.id,
            type: inc.incident_types || [],
            level: inc.incident_level,
            time: inc.time,
          })),
          hospitalTransferCount: transfers?.length || 0,
          hospitalTransfers: (transfers || []).map(transfer => ({
            id: transfer.id,
            hospitalName: transfer.hospital_name,
            reason: transfer.reason,
          })),
          appointmentCount: appointments?.length || 0,
          appointments: (appointments || []).map(apt => ({
            id: apt.id,
            title: apt.title,
            startTime: apt.start_time,
            location: apt.location,
          })),
        });
      } catch (error) {
        console.error("Error fetching handover report:", error);
        setReport(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [residentId, teamId, supabase]);

  return { report, isLoading };
};

// Component for displaying handover report
const HandoverReportCell = ({ residentId, teamId }: { residentId: string; teamId?: string }) => {
  const { report, isLoading } = useHandoverReport(residentId, teamId);

  if (isLoading || !report) {
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
  const { report, isLoading } = useHandoverReport(residentId, teamId);

  if (isLoading || !report) {
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
  const { report, isLoading } = useHandoverReport(residentId, teamId);

  if (isLoading || !report) {
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
                Type: {Array.isArray(incident.type) ? incident.type.join(", ") : incident.type || "Not specified"}
              </div>
              <div className="text-sm">
                Level: <span className="capitalize">{incident.level?.replace("_", " ") || "Not specified"}</span>
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
  const { report, isLoading } = useHandoverReport(residentId, teamId);

  if (isLoading || !report) {
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

// Component for displaying appointments
const AppointmentsCell = ({ residentId, teamId }: { residentId: string; teamId?: string }) => {
  const { report, isLoading } = useHandoverReport(residentId, teamId);

  if (isLoading || !report) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (report.appointmentCount === 0) {
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
          {report.appointmentCount}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-white border max-w-md">
        <div className="flex flex-col gap-2 p-2">
          {report.appointments.map((apt: any, index: number) => (
            <div key={apt.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-primary">
                  {new Date(apt.startTime).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
                <span className="font-medium text-sm">
                  {apt.title}
                </span>
              </div>
              {apt.location && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  Location: {apt.location}
                </div>
              )}
              {index < report.appointments.length - 1 && (
                <div className="border-t my-1" />
              )}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
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
  const today = getUKTodayDate();
  const shift = getCurrentShift();

  const {
    comment,
    setComment,
    isSaving,
    lastSavedText,
  } = useHandoverComment({
    teamId: teamId || "",
    residentId,
    date: today,
    shift,
    currentUserId: currentUserId || "",
    currentUserName: currentUserName || "",
    organizationId: organizationId || "",
  });

  return (
    <div className="relative w-full h-full">
      <Input
        placeholder="Add handover comments..."
        className="h-8 w-full text-sm border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-2"
        data-resident-id={residentId}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {(isSaving || lastSavedText) && (
        <div className="absolute bottom-0 right-2 text-[10px] text-muted-foreground italic">
          {isSaving ? "Saving..." : lastSavedText}
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
      accessorFn: (row) => `${row.first_name || ''} ${row.last_name || ''}`.trim(),
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

        const firstName = (resident.first_name || '').toLowerCase();
        const lastName = (resident.last_name || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();

        return firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          fullName.includes(searchTerm);
      },
      cell: ({ row }) => {
        const resident = row.original;
        const name = `${resident.first_name} ${resident.last_name}`;
        const initials =
          `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();

        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={resident.image_url} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="font-medium text-sm">
              {resident.first_name} {resident.last_name}
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
        const a = rowA.original.room_number;
        const b = rowB.original.room_number;

        if (!a && !b) return 0;
        if (!a) return 1;
        if (!b) return -1;

        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);

        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return 0;
      },
      cell: ({ row }) => {
        return (
          <p className="text-muted-foreground">
            {row.original.room_number || "-"}
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
      size: 90,
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
      size: 80,
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
      size: 130,
      cell: ({ row }) => {
        const resident = row.original;
        return <HospitalTransferCell residentId={resident.id} teamId={teamId} />;
      }
    },
    {
      accessorKey: "appointments",
      header: () => {
        return (
          <div className="text-left text-muted-foreground text-sm">
            Appointments
          </div>
        );
      },
      enableSorting: false,
      size: 100,
      cell: ({ row }) => {
        const resident = row.original;
        return <AppointmentsCell residentId={resident.id} teamId={teamId} />;
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
