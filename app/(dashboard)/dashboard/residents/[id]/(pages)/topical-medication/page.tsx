"use client";

import { createTopicalMedicationColumns } from "@/components/medication/daily/medication-columns";
import { DataTable } from "@/components/medication/daily/data-table";
import ShiftTimes from "@/components/medication/daily/ShiftTimes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { config } from "@/config";
import { useProfile } from "@/hooks/use-profile";
import { UK_TIMEZONE, getUKTodayDate } from "@/lib/date-utils";
import { supabase } from "@/lib/supabase";
import { Resident } from "@/types";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type TopicalMedicationPageProps = {
  params: Promise<{ id: string }>;
};

const getNearestMedicationTime = (): string | null => {
  const now = new Date();
  const ukNow = toZonedTime(now, UK_TIMEZONE);
  const currentHour = ukNow.getHours();
  const currentMinute = ukNow.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const allTimes = config.times.flatMap((timeGroup) => timeGroup.values);

  if (allTimes.length === 0) return null;

  let nearestTime = allTimes[0];
  let smallestDiff = Infinity;

  allTimes.forEach((time) => {
    const [hours, minutes] = time.split(":").map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const diff = Math.abs(timeInMinutes - currentTimeInMinutes);

    if (diff < smallestDiff) {
      smallestDiff = diff;
      nearestTime = time;
    }
  });

  return nearestTime;
};

const normalizeTimeToHHmm = (value: string | null | undefined): string | null => {
  if (!value) return null;

  // Handles "HH:mm" and "HH:mm:ss"
  const timeOnlyMatch = value.match(/^(\d{2}):(\d{2})(:\d{2})?$/);
  if (timeOnlyMatch) {
    return `${timeOnlyMatch[1]}:${timeOnlyMatch[2]}`;
  }

  // Handles ISO timestamps or datetime strings
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: UK_TIMEZONE,
    });
  }

  return null;
};

const normalizeToUKDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-CA", { timeZone: UK_TIMEZONE });
};

export default function TopicalMedicationPage({ params }: TopicalMedicationPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const [resident, setResident] = useState<Resident | null>(null);
  const [topicalMedications, setTopicalMedications] = useState<any[]>([]);
  const [selectedDateIntakes, setSelectedDateIntakes] = useState<any[]>([]);
  const [topicalAdministrations, setTopicalAdministrations] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTime, setSelectedTime] = useState<string | null>(
    getNearestMedicationTime() || config.times[0]?.values[0] || null
  );
  const [selectedDate] = useState<Date>(() => toZonedTime(new Date(), UK_TIMEZONE));

  const fetchData = React.useCallback(async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const { data: residentData, error: residentError } = await supabase
        .from("residents")
        .select("*")
        .eq("id", id)
        .single();

      if (residentError) throw residentError;
      setResident(residentData as Resident);

      const { data: meds, error: medsError } = await supabase
        .from("medications")
        .select("*")
        .eq("resident_id", id)
        .eq("status", "active");

      if (medsError) throw medsError;

      setTopicalMedications(
        (meds || []).filter(
          (med) => med.schedule_type === "Topical" || med.route === "Topical"
        )
      );

      const startOfDayStr = format(selectedDate, "yyyy-MM-dd");
      const { data: intakes, error: intakesError } = await supabase
        .from("medication_intakes")
        .select("id, medication_id, scheduled_time, status, state")
        .eq("resident_id", id)
        .order("scheduled_time", { ascending: false })
        .limit(500);

      if (intakesError) throw intakesError;
      setSelectedDateIntakes(intakes || []);

      const { data: topicalSheets, error: topicalSheetsError } = await supabase
        .from("emar_sheets")
        .select("id")
        .eq("resident_id", id)
        .eq("type", "topical");

      if (topicalSheetsError) throw topicalSheetsError;

      const topicalSheetIds = (topicalSheets || []).map((sheet) => sheet.id);
      if (topicalSheetIds.length > 0) {
        const { data: administrations, error: administrationsError } = await supabase
          .from("emar_administrations")
          .select("medication_id, scheduled_time, status, administration_date, administered_at")
          .in("emar_sheet_id", topicalSheetIds);

        if (administrationsError) throw administrationsError;
        setTopicalAdministrations(administrations || []);
      } else {
        setTopicalAdministrations([]);
      }

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("active_organization_id", profile.active_organization_id);

      if (usersError) throw usersError;
      setAllUsers(users || []);
    } catch (error) {
      console.error("Error fetching topical medication data:", error);
      toast.error("Failed to load topical medications");
    } finally {
      setIsLoading(false);
    }
  }, [id, profile, selectedDate]);

  useEffect(() => {
    if (isProfileLoading) return;
    if (!profile) return;

    if (profile.role !== "care_assistant") {
      toast.error("Only care assistants can access topical medication.");
      router.replace(`/dashboard/residents/${id}`);
      return;
    }

    fetchData();
  }, [fetchData, id, isProfileLoading, profile, router]);

  const administeredTimesToday = useMemo(() => {
    const map: Record<string, Array<{ time: string, by: string }>> = {};

    selectedDateIntakes.forEach((intake) => {
      const intakeStatus = intake.status || intake.state;
      const isAdministeredOutcome = intakeStatus && intakeStatus !== "scheduled" && intakeStatus !== "pending";
      if (!isAdministeredOutcome) return;

      const intakeUkDate = normalizeToUKDate(intake.scheduled_time);
      if (intakeUkDate !== format(selectedDate, "yyyy-MM-dd")) return;

      const intakeTime = normalizeTimeToHHmm(intake.scheduled_time);
      if (!intakeTime) return;

      const administeredBy = allUsers.find(u => u.id === intake.administered_by_id)?.name || "Staff";

      if (!map[intake.medication_id]) map[intake.medication_id] = [];
      if (!map[intake.medication_id].some(v => v.time === intakeTime)) {
        map[intake.medication_id].push({ time: intakeTime, by: administeredBy });
      }
    });

    topicalAdministrations.forEach((administration) => {
      const status = administration.status;
      const isAdministeredOutcome = status && status !== "scheduled" && status !== "pending";
      if (!isAdministeredOutcome) return;

      const ukDateFromAdministeredAt = normalizeToUKDate(administration.administered_at);
      const adminDate = normalizeToUKDate(administration.administration_date) || ukDateFromAdministeredAt;
      if (adminDate !== format(selectedDate, "yyyy-MM-dd")) return;

      const adminTime =
        normalizeTimeToHHmm(administration.scheduled_time) ||
        normalizeTimeToHHmm(administration.administered_at);
      if (!adminTime) return;

      const administeredBy = allUsers.find(u => u.id === administration.administered_by)?.name || "Staff";

      if (!map[administration.medication_id]) {
        map[administration.medication_id] = [];
      }

      if (!map[administration.medication_id].some(v => v.time === adminTime)) {
        map[administration.medication_id].push({ time: adminTime, by: administeredBy });
      }
    });

    return map;
  }, [selectedDate, selectedDateIntakes, topicalAdministrations, allUsers]);

  const createAndAdministerMedicationIntake = async (
    medicationId: string,
    residentId: string,
    time: string,
    quantity: number = 1,
    notes?: string,
    witnessId?: string,
    status: string = "taken",
    prnReason?: string,
    prnOutcome?: string
  ) => {
    const { data: medication } = await supabase
      .from("medications")
      .select("schedule_type, total_count, dosage_form, strength, strength_unit")
      .eq("id", medicationId)
      .single();

    const isTopical =
      medication?.schedule_type === "Topical" ||
      medication?.dosage_form?.toLowerCase().includes("cream") ||
      medication?.dosage_form?.toLowerCase().includes("ointment");

    const isPRN = medication?.schedule_type === "PRN (As Needed)";
    const currentStock = medication?.total_count ?? 0;
    const newStock = Math.max(0, currentStock - quantity);

    if (status === "taken" || status === "given") {
      await supabase.from("medications").update({ total_count: newStock }).eq("id", medicationId);
    }

    const administrationTimestamp = time
      ? fromZonedTime(`${getUKTodayDate()}T${time}:00`, UK_TIMEZONE).toISOString()
      : new Date().toISOString();

    const intakePayload = {
      medication_id: medicationId,
      resident_id: residentId,
      scheduled_time: administrationTimestamp,
      status,
      quantity,
      comment: notes,
      administered_by_id: profile?.id,
      administered_at: administrationTimestamp,
      witness_id: witnessId || null,
      witness_at: witnessId ? administrationTimestamp : null,
      popped_out_at: administrationTimestamp,
      popped_out_by_id: profile?.id,
      organization_id: profile?.active_organization_id,
      care_home_id: profile?.active_care_home_id,
    };

    const { data: existingIntake } = await supabase
      .from("medication_intakes")
      .select("id")
      .eq("medication_id", medicationId)
      .eq("scheduled_time", administrationTimestamp)
      .maybeSingle();

    if (existingIntake?.id) {
      const { error } = await supabase
        .from("medication_intakes")
        .update({
          status: intakePayload.status,
          quantity: intakePayload.quantity,
          comment: intakePayload.comment,
          administered_by_id: intakePayload.administered_by_id,
          administered_at: intakePayload.administered_at,
          witness_id: intakePayload.witness_id,
          witness_at: intakePayload.witness_at,
          popped_out_at: intakePayload.popped_out_at,
          popped_out_by_id: intakePayload.popped_out_by_id,
        })
        .eq("id", existingIntake.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("medication_intakes").insert(intakePayload);
      if (error) throw error;
    }

    if (isTopical || isPRN) {
      const sheetType = isTopical ? "topical" : "prn";
      const { data: emarSheet } = await supabase.rpc("get_or_create_emar_sheet", {
        p_resident_id: residentId,
        p_type: sheetType,
        p_organization_id: profile?.active_organization_id || "",
        p_care_home_id: profile?.active_care_home_id || "",
      });

      if (emarSheet) {
        const administrationDate = format(new Date(), "yyyy-MM-dd");
        await supabase.from("emar_administrations").insert({
          emar_sheet_id: emarSheet,
          medication_id: medicationId,
          administration_date: administrationDate,
          scheduled_time: time,
          administered_at: administrationTimestamp,
          administered_by: profile?.id,
          status,
          quantity,
          notes,
          prn_reason: prnReason,
          prn_outcome: prnOutcome,
          prn_dose_administered: prnReason
            ? `${quantity} x ${medication?.strength || ""}${medication?.strength_unit || ""}`
            : null,
          witness_id: witnessId || null,
          witness_at: witnessId ? administrationTimestamp : null,
          organization_id: profile?.active_organization_id,
          care_home_id: profile?.active_care_home_id,
        });
      }
    }

    await fetchData();
  };

  const availableMembers = useMemo(
    () =>
      allUsers.map((u) => ({
        userId: u.id,
        name: u.name || u.email || "Unknown",
      })),
    [allUsers]
  );

  const topicalMedicationColumns = useMemo(
    () =>
      createTopicalMedicationColumns(
        createAndAdministerMedicationIntake,
        true,
        availableMembers,
        profile ? { name: profile.name || "", userId: profile.id } : undefined,
        administeredTimesToday,
        selectedTime
      ),
    [availableMembers, profile, administeredTimesToday, selectedTime]
  );

  const filteredTopicalMedications = useMemo(() => {
    if (!selectedTime) return [];
    return topicalMedications.filter(
      (med) => Array.isArray(med.times) && med.times.includes(selectedTime)
    );
  }, [selectedTime, topicalMedications]);

  if (isLoading || isProfileLoading) {
    return <div className="flex items-center justify-center h-64"><p>Loading...</p></div>;
  }

  if (!resident) {
    return <div className="flex items-center justify-center h-64"><p>Resident not found</p></div>;
  }

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name?.[0]}${resident.last_name?.[0]}`.toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-16 h-16">
          <AvatarImage src={resident.image_url || ""} alt={fullName} className="border" />
          <AvatarFallback className="text-base bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-black text-xl">{fullName}</span>
            <span className="text-muted-foreground">/ Topical Medication</span>
          </div>
          <p className="text-muted-foreground text-sm">Apply topical medication by medication time section</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <ShiftTimes selectedTime={selectedTime} setSelectedTime={setSelectedTime} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm px-3 py-1.5 bg-blue-100 text-blue-900 border border-blue-200 rounded-md">Topical Medications</p>
          {selectedTime && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Showing for {selectedTime}
            </span>
          )}
        </div>
        {filteredTopicalMedications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center border rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">
              No topical medications for {selectedTime || "this time"}
            </p>
            <p className="text-xs text-muted-foreground">
              Topical medications scheduled at this time will appear here.
            </p>
          </div>
        ) : (
          <DataTable columns={topicalMedicationColumns} data={filteredTopicalMedications} />
        )}
      </div>
    </div>
  );
}
