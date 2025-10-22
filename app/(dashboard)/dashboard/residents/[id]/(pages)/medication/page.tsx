"use client";

import { createColumns } from "@/components/medication/daily/columns";
import { createMedicationColumns } from "@/components/medication/daily/medication-columns";
import { DataTable } from "@/components/medication/daily/data-table";
import ShiftTimes from "@/components/medication/daily/ShiftTimes";
import CreateResidentMedication from "@/components/medication/forms/CreateResidentMedication";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useActiveTeam } from "@/hooks/use-active-team";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ClockIcon, Pill } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { config } from "@/config";

type MedicationPageProps = {
  params: Promise<{ id: string }>;
};

export default function MedicationPage({ params }: MedicationPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { activeTeamId } = useActiveTeam();
  const { data: currentUser } = authClient.useSession();
  const [selectedTime, setSelectedTime] = useState<string | null>(
    config.times[0]?.values[0] || null
  );
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

  const prnOrTopicalMedications = useQuery(
    api.medication.getPrnOrTopicalMedicationsByResidentId,
    id ? { residentId: id } : "skip"
  );

  const allActiveMedications = useQuery(
    api.medication.getActiveMedicationsByResidentId,
    id ? { residentId: id } : "skip"
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
  const createAndAdministerMedicationIntake = useMutation(
    api.medication.createAndAdministerMedicationIntake
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
  console.log("Active Team ID:", activeTeamId);
  console.log("Team with members:", teamWithMembers);
  console.log("Organization ID:", teamWithMembers?.organizationId);

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

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials =
    `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage
            src={resident.imageUrl}
            alt={fullName}
            className="border"
          />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Medication</h1>
          <p className="text-muted-foreground text-sm">
            View and manage medication schedule for {resident.firstName}{" "}
            {resident.lastName}.
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <Link href={`/dashboard/residents/${id}/medication/history`}>
            <Button variant="outline">
              <ClockIcon className="w-4 h-4 mr-2" />
              View History
            </Button>
          </Link>
          <CreateResidentMedication
            residentId={id as Id<"residents">}
            residentName={`${resident.firstName} ${resident.lastName}`}
            teamId={activeTeamId || resident.teamId || undefined}
            organizationId={teamWithMembers?.organizationId || resident.organizationId || undefined}
          />
        </div>
      </div>

      <div className="flex flex-col items-start">
        <p className="font-semibold mb-1">Today&apos;s Medications</p>
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
            saveMedicationIntakeComment,
            currentUser?.user
              ? {
                  name: currentUser.user.name,
                  userId: currentUser.user.id
                }
              : undefined
          )}
          data={filteredIntakes}
        />
      </div>

      <div className="flex flex-col gap-4 mt-8">
        <div className="flex flex-col">
          <p className="font-semibold">PRN & Topical Medications</p>
        </div>
        <div className="w-full">
          <DataTable
            columns={createMedicationColumns(
              createAndAdministerMedicationIntake,
              true,
              teamWithMembers?.members || [],
              currentUser?.user
                ? {
                    name: currentUser.user.name,
                    userId: currentUser.user.id
                  }
                : undefined
            )}
            data={prnOrTopicalMedications || []}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-8">
        <div className="flex flex-col">
          <p className="font-semibold">All Active Medications</p>
        </div>
        <div className="w-full">
          <DataTable
            columns={createMedicationColumns(
              createAndAdministerMedicationIntake,
              false,
              teamWithMembers?.members || [],
              currentUser?.user
                ? {
                    name: currentUser.user.name,
                    userId: currentUser.user.id
                  }
                : undefined
            )}
            data={allActiveMedications || []}
          />
        </div>
      </div>
    </div>
  );
}