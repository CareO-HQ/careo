"use client";

import { createColumns } from "@/components/medication/daily/columns";
import { createMedicationColumns } from "@/components/medication/daily/medication-columns";
import { DataTable } from "@/components/medication/daily/data-table";
import { MedicationAlertBanner } from "@/components/medication/alerts/MedicationAlertBanner";
import ShiftTimes from "@/components/medication/daily/ShiftTimes";
import CreateResidentMedication from "@/components/medication/forms/CreateResidentMedication";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Resident } from "@/types";
import { ArrowLeft, ClockIcon, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { config } from "@/config";
import { toast } from "sonner";
import { formatTimestampToUKTime, formatTimestampToUKDateTime } from "@/lib/date-utils";

import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

type MedicationPageProps = {
  params: Promise<{ id: string }>;
};

const UK_TIMEZONE = "Europe/London";

// Helper function to find the nearest medication time
const getNearestMedicationTime = (): string | null => {
  const now = new Date();
  const ukNow = toZonedTime(now, UK_TIMEZONE);
  const currentHour = ukNow.getHours();
  const currentMinute = ukNow.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Flatten all times from config
  const allTimes = config.times.flatMap(timeGroup => timeGroup.values);

  if (allTimes.length === 0) return null;

  // Convert time strings to minutes and find the nearest one
  let nearestTime = allTimes[0];
  let smallestDiff = Infinity;

  allTimes.forEach(time => {
    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const diff = Math.abs(timeInMinutes - currentTimeInMinutes);

    if (diff < smallestDiff) {
      smallestDiff = diff;
      nearestTime = time;
    }
  });

  return nearestTime;
};

export default function MedicationPage({ params }: MedicationPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile } = useProfile();

  const [resident, setResident] = useState<Resident | null>(null);
  const [selectedDateIntakes, setSelectedDateIntakes] = useState<any[]>([]);
  const [prnOrTopicalMedications, setPrnOrTopicalMedications] = useState<any[]>([]);
  const [allActiveMedications, setAllActiveMedications] = useState<any[]>([]);
  const [discontinuedMedications, setDiscontinuedMedications] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [medicationRoundStatus, setMedicationRoundStatus] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedTime, setSelectedTime] = useState<string | null>(
    getNearestMedicationTime() || config.times[0]?.values[0] || null
  );
  // Initialize with UK Today
  const [selectedDate, setSelectedDate] = useState<Date>(() => toZonedTime(new Date(), UK_TIMEZONE));
  const [filteredIntakes, setFilteredIntakes] = useState<any[]>([]);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch resident
      const { data: residentData } = await supabase
        .from("residents")
        .select("*")
        .eq("id", id)
        .single();

      if (residentData) setResident(residentData as Resident);

      // Construct UK day range for query
      const startOfDayStr = format(selectedDate, "yyyy-MM-dd");
      const rangeStart = fromZonedTime(`${startOfDayStr}T00:00:00`, UK_TIMEZONE);
      const rangeEnd = fromZonedTime(`${startOfDayStr}T23:59:59.999`, UK_TIMEZONE);

      console.log("DEBUG: Fetching medication data for:", {
        id,
        selectedDate,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString()
      });

      // Fetch intakes for selected date
      const { data: intakes, error: intakesError } = await supabase
        .from("medication_intakes")
        .select(`
          *,
          medication:medication_id (*)
        `)
        .eq("resident_id", id)
        .gte("scheduled_time", rangeStart.toISOString())
        .lte("scheduled_time", rangeEnd.toISOString());

      if (intakesError) {
        console.error("DEBUG: Error fetching intakes:", intakesError);
      } else {
        console.log("DEBUG: Raw intakes fetched:", intakes);
      }

      setSelectedDateIntakes(intakes || []);

      // Fetch medications by group
      const { data: meds } = await supabase
        .from("medications")
        .select("*")
        .eq("resident_id", id);

      console.log("DEBUG: All medications fetched:", meds);

      if (meds) {
        setAllActiveMedications(meds.filter(m => m.status === 'active'));
        setPrnOrTopicalMedications(meds.filter(m =>
          m.status === 'active' &&
          (m.schedule_type === 'PRN (As Needed)' || m.route === 'Topical')
        ));
        setDiscontinuedMedications(meds.filter(m => m.status === 'discontinued'));
      }


      // Fetch all users
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .eq("active_organization_id", profile?.active_organization_id);

      setAllUsers(users || []);

      // Fetch round status
      if (selectedTime) {
        const dateStr = selectedDate.toISOString().split("T")[0];
        const { data: round } = await supabase
          .from("medication_rounds")
          .select("*")
          .eq("resident_id", id)
          .eq("date", dateStr)
          .eq("time", selectedTime)
          .single();

        setMedicationRoundStatus(round);
      }

    } catch (error) {
      console.error("Error fetching medication data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, selectedDate, selectedTime, profile?.active_organization_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch alerts and setup real-time subscription
  useEffect(() => {
    if (!id) return;

    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .eq("resident_id", id)
        .eq("type", "medication")
        .eq("is_resolved", false);

      setActiveAlerts(data || []);
    };

    fetchAlerts();

    // Subscribe to new alerts or updates
    const subscription = supabase
      .channel(`resident-alerts-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `resident_id=eq.${id}`
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const markMedicationIntakeAsPoppedOut = async (intakeId: string, isPoppedOut: boolean) => {
    const { error } = await supabase
      .from("medication_intakes")
      .update({ popped_out_at: isPoppedOut ? new Date().toISOString() : null, popped_out_by_id: profile?.id })
      .eq("id", intakeId);
    if (error) throw error;
    fetchData();
  };

  const setWithnessForMedicationIntake = async (intakeId: string, witnessId: string | null) => {
    const { error } = await supabase
      .from("medication_intakes")
      .update({ witness_id: witnessId, witness_at: witnessId ? new Date().toISOString() : null })
      .eq("id", intakeId);
    if (error) throw error;
    fetchData();
  };

  const updateMedicationIntakeStatus = async (intakeId: string, state: "given" | "refused" | "missed") => {
    const { error } = await supabase
      .from("medication_intakes")
      .update({ status: state, administered_by_id: profile?.id, administered_at: new Date().toISOString() })
      .eq("id", intakeId);
    if (error) throw error;
    fetchData();
  };

  const saveMedicationIntakeComment = async (intakeId: string, comment: string) => {
    const { error } = await supabase
      .from("medication_intakes")
      .update({ comment: comment })
      .eq("id", intakeId);
    if (error) throw error;
    fetchData();
  };

  const handleUpdateMedicationIntakeStatus = async (args: {
    intakeId: string;
    state: "scheduled" | "dispensed" | "administered" | "refused" | "missed" | "skipped";
  }) => {
    let mappedState: "given" | "refused" | "missed";
    if (args.state === "administered" || args.state === "dispensed") {
      mappedState = "given";
    } else if (args.state === "refused") {
      mappedState = "refused";
    } else if (args.state === "missed") {
      mappedState = "missed";
    } else {
      return null;
    }
    return await updateMedicationIntakeStatus(args.intakeId, mappedState);
  };

  const createAndAdministerMedicationIntake = async (medicationId: string, residentId: string, time: string, quantity: number = 1, notes?: string) => {
    const { data, error } = await supabase
      .from("medication_intakes")
      .insert({
        medication_id: medicationId,
        resident_id: residentId,
        scheduled_time: new Date().toISOString(),
        status: "given",
        quantity: quantity,
        comment: notes,
        administered_by_id: profile?.id,
        administered_at: new Date().toISOString(),
        organization_id: profile?.active_organization_id,
        care_home_id: profile?.active_care_home_id
      })
      .select()
      .single();
    if (error) throw error;
    fetchData();
    return data;
  };

  const handleCompleteMedicationRound = async () => {
    if (!id || !selectedTime || !profile) return;
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const { error } = await supabase
        .from("medication_rounds")
        .upsert({
          resident_id: id,
          date: dateStr,
          time: selectedTime,
          status: 'completed',
          completed_by: profile.id,
          completed_at: new Date().toISOString(),
          organization_id: profile.active_organization_id!,
          care_home_id: profile.active_care_home_id!
        }, { onConflict: 'resident_id,date,time' });

      if (error) throw error;
      toast.success("Medication round completed!");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to complete round");
    }
  };

  const availableMembers = useMemo(() => {
    return allUsers.map(u => ({
      userId: u.id,
      name: u.name || u.email || "Unknown",
      email: u.email
    }));
  }, [allUsers]);

  const dailyMedicationColumns = useMemo(
    () => createColumns(
      availableMembers,
      markMedicationIntakeAsPoppedOut,
      setWithnessForMedicationIntake,
      handleUpdateMedicationIntakeStatus,
      saveMedicationIntakeComment,
      profile ? { name: profile.name || "", userId: profile.id } : undefined,
      medicationRoundStatus?.status === 'completed'
    ),
    [availableMembers, profile, medicationRoundStatus]
  );

  const prnTopicalColumns = useMemo(
    () => createMedicationColumns(
      createAndAdministerMedicationIntake,
      true,
      availableMembers,
      profile ? { name: profile.name || "", userId: profile.id } : undefined
    ),
    [availableMembers, profile]
  );

  const allActiveMedicationColumns = useMemo(
    () => createMedicationColumns(
      createAndAdministerMedicationIntake,
      false,
      availableMembers,
      profile ? { name: profile.name || "", userId: profile.id } : undefined
    ),
    [availableMembers, profile]
  );

  useEffect(() => {
    console.log("DEBUG: Filtering intakes for time:", selectedTime);
    if (selectedTime && selectedDateIntakes) {
      console.log("DEBUG: Total intakes to filter:", selectedDateIntakes.length);
      const filtered = selectedDateIntakes.filter((intake) => {
        const intakeTime = formatTimestampToUKTime(intake.scheduled_time);
        const match = intakeTime === selectedTime;
        console.log(`DEBUG: Checking intake ${intake.id}:`, {
          scheduled_time: intake.scheduled_time,
          formatted_time: intakeTime,
          target_time: selectedTime,
          match
        });
        return match;
      });
      console.log("DEBUG: Filtered intakes count:", filtered.length);
      setFilteredIntakes(filtered);
    } else {
      setFilteredIntakes([]);
    }
  }, [selectedTime, selectedDateIntakes]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><p>Loading...</p></div>;
  }

  if (!resident) {
    return <div className="flex items-center justify-center h-64"><p>Resident not found</p></div>;
  }

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name?.[0]}${resident.last_name?.[0]}`.toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={resident.image_url || ""} alt={fullName} className="border" />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Medication</h1>
          <p className="text-muted-foreground text-sm">View and manage medication schedule for {fullName}.</p>
        </div>
        <div className="flex flex-row gap-2">
          <Link href={`/dashboard/residents/${id}/medication/history`}>
            <Button variant="outline"><ClockIcon className="w-4 h-4 mr-2" />History</Button>
          </Link>
          <CreateResidentMedication
            residentId={id}
            residentName={fullName}
            teamId={profile?.active_team_id || resident.team_id || undefined}
            organizationId={profile?.active_organization_id || resident.organization_id || undefined}
          />
        </div>
      </div>

      <MedicationAlertBanner
        alerts={activeAlerts}
        onDismiss={async (alertId) => {
          try {
            const { error } = await supabase
              .from('alerts')
              .update({
                is_resolved: true,
                resolved_at: new Date().toISOString(),
                resolved_by: profile?.id,
                resolution_note: 'Dismissed by user from medication tab'
              })
              .eq('id', alertId);

            if (error) throw error;
            setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
          } catch (error) {
            console.error('Error resolving alert:', error);
            toast.error('Failed to dismiss alert');
          }
        }}
      />

      <div className="flex flex-col items-start">
        <p className="font-semibold mb-1">Today&apos;s Medications</p>
        <ShiftTimes selectedTime={selectedTime} setSelectedTime={setSelectedTime} />
      </div>

      <div className="w-full">
        <DataTable columns={dailyMedicationColumns} data={filteredIntakes} />
      </div>

      {selectedTime && (
        <div className="w-full mt-4">
          {medicationRoundStatus?.status === 'completed' ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Medication Round Completed</p>
                  <p className="text-sm text-green-700">Finished on {formatTimestampToUKDateTime(medicationRoundStatus.completed_at)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-800">Complete Medication Round</p>
                <p className="text-sm text-blue-700">Ensure all medications are administered before completing.</p>
              </div>
              <Button onClick={handleCompleteMedicationRound} className="bg-blue-600 hover:bg-blue-700">
                <CheckCircle className="w-4 h-4 mr-2" />Complete Round
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 mt-8">
        <p className="font-semibold">PRN & Topical Medications</p>
        <DataTable columns={prnTopicalColumns} data={prnOrTopicalMedications} />
      </div>

      <div className="flex flex-col gap-4 mt-8">
        <p className="font-semibold">All Active Medications</p>
        <DataTable columns={allActiveMedicationColumns} data={allActiveMedications} />
      </div>

      {discontinuedMedications.length > 0 && (
        <div className="flex flex-col gap-4 mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-semibold text-red-800">Discontinued Medications</p>
          <DataTable columns={allActiveMedicationColumns} data={discontinuedMedications} />
        </div>
      )}
    </div>
  );
}