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
import { ArrowLeft, ClockIcon, Pill, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { config } from "@/config";
import { toast } from "sonner";

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

  const discontinuedMedications = useQuery(
    api.medication.getDiscontinuedMedicationsByResidentId,
    id ? { residentId: id } : "skip"
  );

  const teamWithMembers = useQuery(
    api.teams.getTeam,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // Get all users for staff selection (same as daily-care page)
  const allUsers = useQuery(api.user.getAllUsers);

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
  const completeMedicationRound = useMutation(
    api.medication.completeMedicationRound
  );

  // Get medication round status for the selected date and time
  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const medicationRoundStatus = useQuery(
    api.medication.getMedicationRoundStatus,
    id && selectedTime
      ? {
          residentId: id,
          date: selectedDateStr,
          time: selectedTime
        }
      : "skip"
  );

  // Memoize columns to prevent recreation on every render
  // Must be before early returns to follow Rules of Hooks
  // Map all users to the format expected by the columns (same as daily-care page)
  const availableMembers = React.useMemo(() => {
    if (!allUsers) return [];
    return allUsers.map(u => ({
      userId: u._id,
      name: u.name || u.email?.split('@')[0] || "Unknown",
      email: u.email
    }));
  }, [allUsers]);

  const dailyMedicationColumns = useMemo(
    () =>
      createColumns(
        availableMembers,
        markMedicationIntakeAsPoppedOut,
        setWithnessForMedicationIntake,
        updateMedicationIntakeStatus,
        saveMedicationIntakeComment,
        currentUser?.user
          ? {
              name: currentUser.user.name,
              userId: currentUser.user.id
            }
          : undefined,
        medicationRoundStatus?.isCompleted || false
      ),
    [
      availableMembers,
      markMedicationIntakeAsPoppedOut,
      setWithnessForMedicationIntake,
      updateMedicationIntakeStatus,
      saveMedicationIntakeComment,
      currentUser?.user,
      medicationRoundStatus?.isCompleted
    ]
  );

  const prnTopicalColumns = useMemo(
    () =>
      createMedicationColumns(
        createAndAdministerMedicationIntake,
        true,
        availableMembers,
        currentUser?.user
          ? {
              name: currentUser.user.name,
              userId: currentUser.user.id
            }
          : undefined
      ),
    [
      createAndAdministerMedicationIntake,
      availableMembers,
      currentUser?.user
    ]
  );

  const allActiveMedicationColumns = useMemo(
    () =>
      createMedicationColumns(
        createAndAdministerMedicationIntake,
        false,
        availableMembers,
        currentUser?.user
          ? {
              name: currentUser.user.name,
              userId: currentUser.user.id
            }
          : undefined
      ),
    [
      createAndAdministerMedicationIntake,
      availableMembers,
      currentUser?.user
    ]
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

  // Handle completing medication round
  const handleCompleteMedicationRound = async () => {
    if (!id) {
      toast.error("Missing resident information");
      return;
    }

    if (!selectedTime) {
      toast.error("Please select a medication time");
      return;
    }

    // Use activeTeamId or fall back to resident's teamId
    const teamId = activeTeamId || resident?.teamId;
    if (!teamId) {
      toast.error("No team found for this resident");
      return;
    }

    const organizationId = teamWithMembers?.organizationId || resident?.organizationId;
    if (!organizationId) {
      toast.error("Missing organization information");
      return;
    }

    try {
      await completeMedicationRound({
        residentId: id,
        date: selectedDateStr,
        time: selectedTime,
        teamId: teamId,
        organizationId: organizationId
      });

      toast.success("Medication round completed successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to complete medication round");
    }
  };

  console.log("All intakes", selectedDateIntakes);
  console.log("Active Team ID:", activeTeamId);
  console.log("Team with members:", teamWithMembers);
  console.log("All Users:", allUsers);
  console.log("Available Members:", availableMembers);
  console.log("Available Members count:", availableMembers?.length);
  console.log("Complete Round Debug:", {
    id,
    selectedTime,
    selectedDateStr,
    activeTeamId,
    residentTeamId: resident?.teamId,
    effectiveTeamId: activeTeamId || resident?.teamId,
    organizationId: teamWithMembers?.organizationId || resident?.organizationId
  });

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
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
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
        <DataTable columns={dailyMedicationColumns} data={filteredIntakes} />
      </div>

      {/* Complete Medication Round Section */}
      {selectedTime && (
        <div className="w-full mt-4">
          {medicationRoundStatus?.isCompleted ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">
                      Medication Round Completed
                    </p>
                    <p className="text-sm text-green-700">
                      Completed by {medicationRoundStatus.completedByName} on{" "}
                      {new Date(medicationRoundStatus.completedAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Given: {medicationRoundStatus.givenCount} | Refused:{" "}
                      {medicationRoundStatus.refusedCount} | Missed:{" "}
                      {medicationRoundStatus.missedCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-800">
                    Complete Medication Round
                  </p>
                  <p className="text-sm text-blue-700">
                    {medicationRoundStatus?.pendingCount || 0} medication(s) still pending.
                    All medications must be marked as given, refused, or missed before completing.
                  </p>
                </div>
                <Button
                  onClick={handleCompleteMedicationRound}
                  disabled={
                    !medicationRoundStatus ||
                    medicationRoundStatus.pendingCount > 0 ||
                    medicationRoundStatus.totalMedications === 0 ||
                    (!activeTeamId && !resident?.teamId) ||
                    !id ||
                    !selectedTime ||
                    (!teamWithMembers?.organizationId && !resident?.organizationId)
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Round
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 mt-8">
        <div className="flex flex-col">
          <p className="font-semibold">PRN & Topical Medications</p>
        </div>
        <div className="w-full">
          <DataTable
            columns={prnTopicalColumns}
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
            columns={allActiveMedicationColumns}
            data={allActiveMedications || []}
          />
        </div>
      </div>

      {/* Discontinued Medications Section */}
      {discontinuedMedications && discontinuedMedications.length > 0 && (
        <div className="flex flex-col gap-4 mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex flex-col">
            <p className="font-semibold text-red-800">Discontinued Medications</p>
            <p className="text-sm text-red-600">
              Medications that have been discontinued for this resident
            </p>
          </div>
          <div className="w-full">
            <DataTable
              columns={allActiveMedicationColumns}
              data={discontinuedMedications}
            />
          </div>
        </div>
      )}
    </div>
  );
}