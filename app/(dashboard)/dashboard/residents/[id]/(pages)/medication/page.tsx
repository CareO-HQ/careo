"use client";

import ShiftTimes from "@/components/medication/daily/ShiftTimes";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createColumns } from "@/components/medication/daily/columns";
import { DataTable } from "@/components/medication/daily/data-table";
import { useActiveTeam } from "@/hooks/use-active-team";
import CreateResidentMedication from "@/components/medication/forms/CreateResidentMedication";

type MedicationPageProps = {
  params: Promise<{ id: string }>;
};

export default function MedicationPage({ params }: MedicationPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { activeTeamId } = useActiveTeam();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filteredIntakes, setFilteredIntakes] = useState<
    NonNullable<typeof selectedDateIntakes>
  >([]);

  const resident = useQuery(api.residents.getById, {
    residentId: (id as Id<"residents">) ?? "skip"
  }) as any;

  const selectedDateIntakes = useQuery(
    api.medication.getMedicationIntakesByResidentAndDate,
    id
      ? {
          residentId: id,
          date: selectedDate.getTime()
        }
      : "skip"
  );

  const teamWithMembers = useQuery(
    api.teams.getTeam,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  const markMedicationIntakeAsPoppedOut = useMutation(
    api.medication.markMedicationIntakeAsPoppedOut
  );
  const setWithnessForMedicationIntake = useMutation(
    api.medication.setWithnessForMedicationIntake
  );
  const updateMedicationIntakeStatus = useMutation(
    api.medication.updateMedicationIntakeStatus
  );
  const saveMedicationIntakeComment = useMutation(
    api.medication.saveMedicationIntakeComment
  );

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

      setFilteredIntakes(filteredIntakes);
    } else {
      setFilteredIntakes([]);
    }
  }, [selectedTime, selectedDate, selectedDateIntakes]);

  console.log("All intakes", selectedDateIntakes);

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="mt-2 text-muted-foreground">Loading medications...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col">
          <p className="font-semibold text-xl">Medication</p>
          <p className="text-sm text-muted-foreground">
            View and manage medication schedule for {resident.firstName}{" "}
            {resident.lastName}.
          </p>
        </div>
        <CreateResidentMedication
          residentId={id as Id<"residents">}
          residentName={`${resident.firstName} ${resident.lastName}`}
        />
      </div>

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
          columns={createColumns(
            teamWithMembers?.members || [],
            markMedicationIntakeAsPoppedOut,
            setWithnessForMedicationIntake,
            updateMedicationIntakeStatus,
            saveMedicationIntakeComment
          )}
          data={filteredIntakes}
        />
      </div>
    </div>
  );
}
