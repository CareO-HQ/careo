"use client";

import { createColumns } from "@/components/medication/daily/columns";
import { DataTable } from "@/components/medication/daily/data-table";
// import CreateMedicationDemo from "@/components/medication/demo/CreateMedicationDemo";
import ShiftTimes from "@/components/medication/daily/ShiftTimes";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function MedicationPage() {
  const { activeTeamId, activeTeam } = useActiveTeam();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filteredIntakes, setFilteredIntakes] = useState<
    NonNullable<typeof selectedDateIntakes>
  >([]);
  const medications = useQuery(
    api.medication.getActiveByTeamId,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );
  const selectedDateIntakes = useQuery(
    api.medication.getMedicationIntakesByDate,
    activeTeamId
      ? {
          teamId: activeTeamId,
          date: selectedDate.getTime()
        }
      : "skip"
  );
  const teamWithMembers = useQuery(
    api.teams.getTeam,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  console.log("TEAM WITH MEMBERS", teamWithMembers?.members);

  // Filter intakes by selected time (date filtering is handled by the query)
  useEffect(() => {
    if (selectedTime && selectedDateIntakes) {
      const filteredIntakes = selectedDateIntakes.filter((intake) => {
        // The scheduledTime is stored as a UTC timestamp, but it was created from local time
        // We need to interpret it as if it were stored as "local time as UTC"
        const scheduledDateUTC = new Date(intake.scheduledTime);

        // Convert back to the intended local time by applying timezone offset
        const timezoneOffset = scheduledDateUTC.getTimezoneOffset() * 60000;
        const scheduledDateLocal = new Date(
          scheduledDateUTC.getTime() + timezoneOffset
        );

        // Check if the time matches selected time
        const intakeTime = scheduledDateLocal.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
        const isSelectedTime = intakeTime === selectedTime;

        return isSelectedTime;
      });

      console.log(
        `Filtered intakes for ${selectedTime} on ${format(selectedDate, "yyyy-MM-dd")}:`,
        filteredIntakes
      );

      setFilteredIntakes(filteredIntakes);
    } else {
      setFilteredIntakes([]);
    }
  }, [selectedTime, selectedDate, selectedDateIntakes]);

  console.log("ACTIVE TEAM", activeTeam);
  console.dir("SELECTED DATE INTAKES", selectedDateIntakes);
  console.dir("MEDICATIONS", medications);
  return (
    <div className="space-y-6 w-full">
      {/* <CreateMedicationDemo /> */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Select Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex-1">
          <ShiftTimes
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
          />
        </div>
      </div>
      <div className="w-full">
        <DataTable
          columns={createColumns(teamWithMembers?.members || [])}
          data={filteredIntakes}
        />
      </div>

      {/* Display filtered intakes */}
      {/* {selectedTime && (
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">
            Medication Intakes for {selectedTime} Today
          </h3>

          {filteredIntakes.length === 0 ? (
            <p className="text-muted-foreground">
              No medication intakes scheduled for {selectedTime} today.
            </p>
          ) : (
            <div className="grid gap-3">
              {filteredIntakes.map((intake) => (
                <div key={intake._id} className="border rounded-md p-3 bg-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">
                        {intake.medication?.name || "Unknown Medication"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Patient:{" "}
                        {intake.resident?.firstName && intake.resident?.lastName
                          ? `${intake.resident.firstName} ${intake.resident.lastName}`
                          : "Unknown Patient"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Strength: {intake.medication?.strength}
                        {intake.medication?.strengthUnit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Route: {intake.medication?.route}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          intake.state === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : intake.state === "dispensed"
                              ? "bg-yellow-100 text-yellow-800"
                              : intake.state === "administered"
                                ? "bg-green-100 text-green-800"
                                : intake.state === "missed"
                                  ? "bg-red-100 text-red-800"
                                  : intake.state === "refused"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {intake.state}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(intake.scheduledTime).toLocaleTimeString(
                          "en-GB",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  {intake.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      Notes: {intake.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )} */}
    </div>
  );
}
