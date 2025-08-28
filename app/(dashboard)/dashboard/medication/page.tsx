"use client";

// import CreateMedicationDemo from "@/components/medication/demo/CreateMedicationDemo";
import ShiftTimes from "@/components/medication/daily/ShiftTimes";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { useState, useEffect } from "react";

export default function MedicationPage() {
  const { activeTeamId, activeTeam } = useActiveTeam();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [filteredIntakes, setFilteredIntakes] = useState<
    NonNullable<typeof todaysMedicationIntakes>
  >([]);
  const medications = useQuery(
    api.medication.getActiveByTeamId,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );
  const todaysMedicationIntakes = useQuery(
    api.medication.getTodaysMedicationIntakes,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // Filter intakes by selected time and current date
  useEffect(() => {
    if (selectedTime && todaysMedicationIntakes) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const filteredIntakes = todaysMedicationIntakes.filter((intake) => {
        // The scheduledTime is stored as a UTC timestamp, but it was created from local time
        // We need to interpret it as if it were stored as "local time as UTC"
        const scheduledDateUTC = new Date(intake.scheduledTime);

        // Convert back to the intended local time by applying timezone offset
        const timezoneOffset = scheduledDateUTC.getTimezoneOffset() * 60000;
        const scheduledDateLocal = new Date(
          scheduledDateUTC.getTime() + timezoneOffset
        );

        // Check if it's today in local timezone
        const intakeDate = new Date(
          scheduledDateLocal.getFullYear(),
          scheduledDateLocal.getMonth(),
          scheduledDateLocal.getDate()
        );
        const isToday = intakeDate.getTime() === today.getTime();

        // Check if the time matches selected time
        const intakeTime = scheduledDateLocal.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
        const isSelectedTime = intakeTime === selectedTime;

        // Debug logging to verify timezone handling
        console.log(`Intake debug:`, {
          originalTimestamp: intake.scheduledTime,
          scheduledDateUTC: scheduledDateUTC.toISOString(),
          timezoneOffset: timezoneOffset / 60000, // in hours
          scheduledDateLocal: scheduledDateLocal.toLocaleString(),
          intakeTime,
          selectedTime,
          isToday,
          isSelectedTime
        });

        return isToday && isSelectedTime;
      });

      console.log(
        `Filtered intakes for ${selectedTime} today:`,
        filteredIntakes
      );

      setFilteredIntakes(filteredIntakes);
    } else {
      setFilteredIntakes([]);
    }
  }, [selectedTime, todaysMedicationIntakes]);

  console.log("ACTIVE TEAM", activeTeam);
  console.dir("TODAYS MEDICATION INTAKES", todaysMedicationIntakes);
  console.dir("MEDICATIONS", medications);
  return (
    <div className="space-y-6">
      {/* <CreateMedicationDemo /> */}
      <ShiftTimes
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
      />

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
