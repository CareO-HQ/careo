"use client";

import { createColumns } from "@/components/medication/daily/columns";
import { createMedicationColumns, createTopicalMedicationColumns } from "@/components/medication/daily/medication-columns";
import { DataTable } from "@/components/medication/daily/data-table";
import { MedicationAlertBanner } from "@/components/medication/alerts/MedicationAlertBanner";
import ShiftTimes from "@/components/medication/daily/ShiftTimes";
import CreateResidentMedication from "@/components/medication/forms/CreateResidentMedication";
import KardexModal from "@/components/medication/KardexModal";
import { EmarSheet } from "@/components/medication/emar/EmarSheet";
import { ActiveMedicationsTable } from "@/components/medication/management/ActiveMedicationsTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { Resident } from "@/types";
import { ArrowLeft, CalendarIcon, CheckCircle, Download, Eye, FileDown, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import { config } from "@/config";
import { toast } from "sonner";
import { formatTimestampToUKTime, formatTimestampToUKDateTime, getUKTodayDate, UK_TIMEZONE } from "@/lib/date-utils";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { DateRange } from "react-day-picker";

type MedicationPageProps = {
  params: Promise<{ id: string }>;
};

type GroupedIntake = {
  date: string;
  dateObj: Date;
  intakes: any[];
  totalCount: number;
  administeredCount: number;
  missedCount: number;
  refusedCount: number;
  skippedCount: number;
  givenCount: number;
};

// UK_TIMEZONE is now imported from @/lib/date-utils

const normalizeTimeToHHmm = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const timeOnlyMatch = value.match(/^(\d{2}):(\d{2})(:\d{2})?$/);
  if (timeOnlyMatch) {
    return `${timeOnlyMatch[1]}:${timeOnlyMatch[2]}`;
  }

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
  const autoGenInProgress = React.useRef(false);

  const [resident, setResident] = useState<Resident | null>(null);
  const [selectedDateIntakes, setSelectedDateIntakes] = useState<any[]>([]);
  const [topicalAdministrations, setTopicalAdministrations] = useState<any[]>([]);
  const [prnOrTopicalMedications, setPrnOrTopicalMedications] = useState<any[]>([]);
  const [topicalMedications, setTopicalMedications] = useState<any[]>([]);
  const [supplementMedications, setSupplementMedications] = useState<any[]>([]);
  const [allActiveMedications, setAllActiveMedications] = useState<any[]>([]);
  const [discontinuedMedications, setDiscontinuedMedications] = useState<any[]>([]);
  const [completedCancelledMedications, setCompletedCancelledMedications] = useState<any[]>([]);
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

  // History tab state
  const [historySorting, setHistorySorting] = useState<SortingState>([]);
  const [historyDateRange, setHistoryDateRange] = useState<DateRange | undefined>();
  const [historyAllIntakes, setHistoryAllIntakes] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedDateIntakeGroup, setSelectedDateIntakeGroup] = useState<GroupedIntake | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  const fetchData = React.useCallback(async (silentRefresh = false) => {
    if (!silentRefresh) {
      setIsLoading(true);
    }
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

      const startOfDayISO = rangeStart.toISOString();
      const endOfDayISO = rangeEnd.toISOString();

      console.log("DEBUG: Fetching medication data for:", {
        id,
        selectedDate,
        startOfDayStr,
        rangeStart: startOfDayISO,
        rangeEnd: endOfDayISO,
        browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        browserNow: new Date().toISOString()
      });

      // --- DIAGNOSTIC: Fetch ALL intakes for this resident (no date filter) ---
      const { data: allIntakes } = await supabase
        .from("medication_intakes")
        .select("id, scheduled_time, status, medication_id")
        .eq("resident_id", id)
        .order("scheduled_time", { ascending: false })
        .limit(20);
      console.log("DEBUG: ALL recent intakes (no date filter, last 20):", allIntakes);

      // Fetch intakes for selected date
      const { data: intakes, error: intakesError } = await supabase
        .from("medication_intakes")
        .select(`
          *,
          medication:medication_id (*)
        `)
        .eq("resident_id", id)
        .gte("scheduled_time", startOfDayISO)
        .lte("scheduled_time", endOfDayISO)
        .order("scheduled_time", { ascending: true })
        .order("id", { ascending: true }); // Improved position stability

      if (intakesError) throw intakesError;

      // Fetch medications by group
      const { data: meds } = await supabase
        .from("medications")
        .select("*")
        .eq("resident_id", id);

      console.log("DEBUG: All medications fetched:", meds);

      // --- AUTO-GENERATE TODAY'S INTAKES (per-medication, handles missing & time edits) ---
      // Guard: Only auto-generate if we have a profile (need org_id/care_home_id)
      // and not already in progress
      let didAutoGenerate = false;
      if (meds && meds.length > 0 && profile && !autoGenInProgress.current) {
        autoGenInProgress.current = true;
        try {
          const activeScheduledMeds = meds.filter(m =>
            m.status === 'active' &&
            m.schedule_type !== 'PRN (As Needed)' &&
            m.schedule_type !== 'Topical' &&
            m.times && m.times.length > 0
          );

          // Build a set of existing (medication_id + normalized_scheduled_time) combos
          // Normalize timestamps via new Date().toISOString() to avoid format mismatches
          // (DB may return "+00:00" while JS toISOString() uses ".000Z")
          const existingIntakeKeys = new Set(
            (intakes || []).map((i: any) => `${i.medication_id}_${new Date(i.scheduled_time).toISOString()}`)
          );

          const intakesToInsert: any[] = [];

          for (const med of activeScheduledMeds) {
            const medStartDate = med.start_date?.split('T')[0] || med.start_date;
            const isStarted = !medStartDate || medStartDate <= startOfDayStr;

            if (isStarted) {
              for (const time of med.times) {
                const dateTimeStr = `${startOfDayStr}T${time}:00`;
                const scheduledTimeUTC = fromZonedTime(dateTimeStr, UK_TIMEZONE);
                const normalizedISO = scheduledTimeUTC.toISOString();
                const key = `${med.id}_${normalizedISO}`;

                if (!existingIntakeKeys.has(key)) {
                  intakesToInsert.push({
                    medication_id: med.id,
                    resident_id: id,
                    scheduled_time: normalizedISO,
                    quantity: med.time_quantities?.[time] || 1,
                    status: 'scheduled',
                    organization_id: med.organization_id,
                    // Fallback chain: medication -> resident -> profile
                    care_home_id: med.care_home_id || residentData?.care_home_id || profile?.active_care_home_id
                  });
                  // Add to the set immediately to prevent duplicates within the same loop if any
                  existingIntakeKeys.add(key);
                }
              }
            }
          }

          if (intakesToInsert.length > 0) {
            console.log("DEBUG: Auto-generating intakes:", intakesToInsert);
            const { data: newIntakes, error: genError } = await supabase
              .from("medication_intakes")
              .insert(intakesToInsert)
              .select("*, medication:medication_id (*)");

            if (genError) {
              console.error("DEBUG: Error auto-generating intakes:", genError);
            } else {
              didAutoGenerate = true;
              // Merge new intakes with existing and sort stably
              const allIntakesForDay = [...(intakes || []), ...(newIntakes || [])]
                .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time) || a.id.localeCompare(b.id));
              setSelectedDateIntakes(allIntakesForDay);
            }
          }
        } finally {
          autoGenInProgress.current = false;
        }
      }

      if (!didAutoGenerate && intakes && intakes.length > 0) {
        setSelectedDateIntakes(intakes);
      }

      if (meds) {
        setAllActiveMedications(meds.filter(m => m.status === 'active'));
        setPrnOrTopicalMedications(meds.filter(m =>
          m.status === 'active' && m.schedule_type === 'PRN (As Needed)'
        ).sort((a, b) => (a.is_controlled_drug && !b.is_controlled_drug ? -1 : !a.is_controlled_drug && b.is_controlled_drug ? 1 : 0)));
        setTopicalMedications(meds.filter(m =>
          m.status === 'active' && (m.schedule_type === 'Topical' || m.route === 'Topical')
        ).sort((a, b) => (a.is_controlled_drug && !b.is_controlled_drug ? -1 : !a.is_controlled_drug && b.is_controlled_drug ? 1 : 0)));
        setSupplementMedications(meds.filter(m =>
          m.status === 'active' && m.schedule_type === 'Supplement'
        ));
        setDiscontinuedMedications(meds.filter(m => m.status === 'discontinued'));
        setCompletedCancelledMedications(meds.filter(m => m.status === 'completed' || m.status === 'cancelled'));
      }

      const { data: topicalSheets } = await supabase
        .from("emar_sheets")
        .select("id")
        .eq("resident_id", id)
        .eq("type", "topical");

      const topicalSheetIds = (topicalSheets || []).map((sheet) => sheet.id);
      if (topicalSheetIds.length > 0) {
        const { data: administrations, error: administrationsError } = await supabase
          .from("emar_administrations")
          .select("medication_id, scheduled_time, status, administration_date, administered_at")
          .in("emar_sheet_id", topicalSheetIds)
          .eq("administration_date", startOfDayStr);

        if (administrationsError) throw administrationsError;
        setTopicalAdministrations(administrations || []);
      } else {
        setTopicalAdministrations([]);
      }


      // Fetch all users
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .eq("active_organization_id", profile?.active_organization_id);

      setAllUsers(users || []);

      // Fetch round status
      if (selectedTime) {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
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
    const now = new Date().toISOString();

    // Find the intake to get medication info
    const intake = selectedDateIntakes.find(i => i.id === intakeId);
    if (!intake) return;

    const { error } = await supabase
      .from("medication_intakes")
      .update({ popped_out_at: isPoppedOut ? now : null, popped_out_by_id: profile?.id })
      .eq("id", intakeId);
    if (error) throw error;

    // Update medication total_count if popping out
    if (isPoppedOut && intake.medication?.id && intake.medication?.total_count) {
      const newCount = intake.medication.total_count - (intake.quantity || 1);
      if (newCount >= 0) {
        await supabase
          .from("medications")
          .update({ total_count: newCount })
          .eq("id", intake.medication.id);

        // Update local medication state
        setAllActiveMedications(prev => prev.map(med =>
          med.id === intake.medication.id
            ? { ...med, total_count: newCount }
            : med
        ));
      }
    }

    // Optimistic update - update local state without full refresh
    setSelectedDateIntakes(prev => prev.map(i => {
      if (i.id === intakeId) {
        const updatedIntake = { ...i, popped_out_at: isPoppedOut ? now : null, popped_out_by_id: profile?.id };
        if (isPoppedOut && i.medication) {
          const newCount = (i.medication.total_count || 0) - (i.quantity || 1);
          updatedIntake.medication = {
            ...i.medication,
            total_count: newCount >= 0 ? newCount : 0
          };
        }
        return updatedIntake;
      }
      return i;
    }));
  };

  const setWithnessForMedicationIntake = async (intakeId: string, witnessId: string | null) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("medication_intakes")
      .update({ witness_id: witnessId, witness_at: witnessId ? now : null })
      .eq("id", intakeId);
    if (error) throw error;

    // Optimistic update
    setSelectedDateIntakes(prev => prev.map(intake =>
      intake.id === intakeId
        ? { ...intake, witness_id: witnessId, witness_at: witnessId ? now : null }
        : intake
    ));
  };

  const updateMedicationIntakeStatus = async (
    intakeId: string,
    state: "taken" | "refused" | "hospitalised" | "social_leave" | "refused_destroyed" | "not_required" | "made_available" | "given" | "missed"
  ) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("medication_intakes")
      .update({ status: state, administered_by_id: profile?.id, administered_at: now })
      .eq("id", intakeId);
    if (error) throw error;

    // Optimistic update
    setSelectedDateIntakes(prev => prev.map(intake =>
      intake.id === intakeId
        ? { ...intake, status: state, administered_by_id: profile?.id, administered_at: now }
        : intake
    ));
  };

  const saveMedicationIntakeComment = async (intakeId: string, comment: string) => {
    const { error } = await supabase
      .from("medication_intakes")
      .update({ comment: comment })
      .eq("id", intakeId);
    if (error) throw error;

    // Optimistic update
    setSelectedDateIntakes(prev => prev.map(intake =>
      intake.id === intakeId
        ? { ...intake, comment: comment }
        : intake
    ));
  };

  const handleUpdateMedicationIntakeStatus = async (args: {
    intakeId: string;
    state: any;
  }) => {
    // If it's one of our new statuses, pass it through directly
    const validStatuses = [
      "taken", "refused", "hospitalised", "social_leave", 
      "refused_destroyed", "not_required", "made_available",
      "administered", "dispensed", "given", "missed", "skipped"
    ];

    if (!validStatuses.includes(args.state)) return null;

    let mappedState = args.state;
    // Map legacy/internal states to "taken" or its equivalents if needed
    if (args.state === "administered" || args.state === "dispensed" || args.state === "given") {
      mappedState = "taken";
    }

    return await updateMedicationIntakeStatus(args.intakeId, mappedState);
  };

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
    // First, check the medication schedule type and current stock
    const { data: medication } = await supabase
      .from("medications")
      .select("schedule_type, total_count, dosage_form, name, strength, strength_unit")
      .eq("id", medicationId)
      .single();

    const isTopical = medication?.schedule_type === "Topical" || medication?.dosage_form?.toLowerCase().includes('cream') || medication?.dosage_form?.toLowerCase().includes('ointment');
    const isPRN = medication?.schedule_type === "PRN (As Needed)";
    const currentStock = medication?.total_count ?? 0;
    const newStock = Math.max(0, currentStock - quantity);

    // Update medication stock count
    // Only subtract stock if status is 'taken' or 'given'
    if (status === "taken" || status === "given") {
      const { error: stockError } = await supabase
        .from("medications")
        .update({ total_count: newStock })
        .eq("id", medicationId);

      if (stockError) {
        console.error("Error updating medication stock:", stockError);
      }
    }

    // Construct administration timestamp based on provided time
    const administrationTimestamp = time 
      ? fromZonedTime(`${getUKTodayDate()}T${time}:00`, UK_TIMEZONE).toISOString()
      : new Date().toISOString();

    // Save to medication_intakes table.
    // If an intake already exists for the same medication + scheduled timestamp,
    // update it instead of inserting to avoid unique-constraint collisions.
    const intakePayload = {
      medication_id: medicationId,
      resident_id: residentId,
      scheduled_time: administrationTimestamp,
      status: status,
      quantity: quantity,
      comment: notes,
      administered_by_id: profile?.id,
      administered_at: administrationTimestamp,
      witness_id: witnessId || null,
      witness_at: witnessId ? administrationTimestamp : null,
      organization_id: profile?.active_organization_id,
      care_home_id: profile?.active_care_home_id
    };

    const { data: existingIntake } = await supabase
      .from("medication_intakes")
      .select("id")
      .eq("medication_id", medicationId)
      .eq("scheduled_time", administrationTimestamp)
      .maybeSingle();

    let data: any = null;

    if (existingIntake?.id) {
      const { data: updatedIntake, error: updateError } = await supabase
        .from("medication_intakes")
        .update({
          status: intakePayload.status,
          quantity: intakePayload.quantity,
          comment: intakePayload.comment,
          administered_by_id: intakePayload.administered_by_id,
          administered_at: intakePayload.administered_at,
          witness_id: intakePayload.witness_id,
          witness_at: intakePayload.witness_at
        })
        .eq("id", existingIntake.id)
        .select()
        .single();

      if (updateError) throw updateError;
      data = updatedIntake;
    } else {
      const { data: insertedIntake, error: insertError } = await supabase
        .from("medication_intakes")
        .insert(intakePayload)
        .select()
        .single();
      if (insertError) throw insertError;
      data = insertedIntake;
    }

    // For topical and PRN medications, also save to emar_administrations table
    if (isTopical || isPRN) {
      try {
        const now = new Date();
        const administrationDate = format(now, "yyyy-MM-dd");

        // Get or create the appropriate eMAR sheet
        const sheetType = isTopical ? 'topical' : 'prn';
        const { data: emarSheet, error: sheetError } = await supabase
          .rpc('get_or_create_emar_sheet', {
            p_resident_id: residentId,
            p_type: sheetType,
            p_organization_id: profile?.active_organization_id || "",
            p_care_home_id: profile?.active_care_home_id || "",
          });

        if (sheetError) {
          console.error('Error creating/fetching eMAR sheet:', sheetError);
        } else if (emarSheet) {
          // Save to emar_administrations table
          const { error: emarError } = await supabase
            .from("emar_administrations")
            .insert({
              emar_sheet_id: emarSheet,
              medication_id: medicationId,
              administration_date: administrationDate,
              scheduled_time: time,
              administered_at: administrationTimestamp,
              administered_by: profile?.id,
              status: status,
              quantity: quantity,
              notes: notes,
              prn_reason: prnReason,
              prn_outcome: prnOutcome,
              prn_dose_administered: prnReason ? `${quantity} x ${medication?.strength || ''}${medication?.strength_unit || ''}` : null,
              witness_id: witnessId || null,
              witness_at: witnessId ? administrationTimestamp : null,
              organization_id: profile?.active_organization_id,
              care_home_id: profile?.active_care_home_id,
            });

          if (emarError) {
            console.error('Error saving to eMAR administrations:', emarError);
          }
        }
      } catch (emarIntegrationError) {
        console.error('Error integrating with eMAR:', emarIntegrationError);
      }
    }

    // Optimistic updates for all medication states
    const updateMedState = (prev: any[]) => prev.map(m =>
      m.id === medicationId ? { ...m, total_count: (status === "taken" || status === "given") ? newStock : m.total_count } : m
    );

    setPrnOrTopicalMedications(updateMedState);
    setTopicalMedications(updateMedState);
    setSupplementMedications(updateMedState);
    setAllActiveMedications(updateMedState);

    fetchData();
    return data;
  };

  // ── History helpers ──────────────────────────────────────────────────────────

  const fetchHistory = React.useCallback(async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const { data: intakes } = await supabase
        .from("medication_intakes")
        .select("*, medication:medication_id (*)")
        .eq("resident_id", id);

      if (intakes && intakes.length > 0) {
        const userIds = new Set<string>();
        intakes.forEach((intake: any) => {
          if (intake.administered_by_id) userIds.add(intake.administered_by_id);
          if (intake.witness_id) userIds.add(intake.witness_id);
        });
        if (userIds.size > 0) {
          const { data: users } = await supabase
            .from("users").select("id, name").in("id", Array.from(userIds));
          const userMap = new Map((users || []).map((u: any) => [u.id, u]));
          intakes.forEach((intake: any) => {
            if (intake.administered_by_id && userMap.has(intake.administered_by_id))
              intake.administered_by = userMap.get(intake.administered_by_id);
            if (intake.witness_id && userMap.has(intake.witness_id))
              intake.witness = userMap.get(intake.witness_id);
          });
        }
      }
      setHistoryAllIntakes(intakes || []);
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === "history" && historyAllIntakes.length === 0) {
      fetchHistory();
    }
  }, [activeTab, fetchHistory, historyAllIntakes.length]);

  const historyFilteredData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let filtered = historyAllIntakes.filter((i: any) => new Date(i.scheduled_time) <= today);
    if (historyDateRange?.from) {
      const from = new Date(historyDateRange.from);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter((i: any) => {
        const d = new Date(i.scheduled_time);
        d.setHours(0, 0, 0, 0);
        if (historyDateRange.to) {
          const to = new Date(historyDateRange.to);
          to.setHours(23, 59, 59, 999);
          return d >= from && new Date(i.scheduled_time) <= to;
        }
        return d.getTime() === from.getTime();
      });
    }
    const grouped = filtered.reduce((acc: Record<string, any[]>, i: any) => {
      const date = format(new Date(i.scheduled_time), "yyyy-MM-dd");
      if (!acc[date]) acc[date] = [];
      acc[date].push(i);
      return acc;
    }, {});
      const getStatus = (i: any) => i.status || i.state || "scheduled";
      return Object.entries(grouped).map(([date, intakes]) => {
        const arr = intakes as any[];
        return {
          date,
          dateObj: new Date(date),
          intakes: arr,
          totalCount: arr.length,
          administeredCount: arr.filter((i) => ["administered", "given", "taken", "made_available"].includes(getStatus(i))).length,
          givenCount: arr.filter((i) => ["taken"].includes(getStatus(i))).length,
          missedCount: arr.filter((i) => ["missed", "not_required"].includes(getStatus(i))).length,
          refusedCount: arr.filter((i) => ["refused", "refused_destroyed"].includes(getStatus(i))).length,
          skippedCount: arr.filter((i) => ["skipped", "hospitalised", "social_leave"].includes(getStatus(i))).length,
        } as GroupedIntake;
      }).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [historyAllIntakes, historyDateRange]);

  const getStateBadgeStyle = (status: string) => {
    switch (status) {
      case "taken":
        return "bg-green-100 text-green-800";
      case "missed":
      case "refused_destroyed":
        return "bg-red-100 text-red-800";
      case "refused":
      case "not_required":
        return "bg-orange-100 text-orange-800";
      case "hospitalised":
        return "bg-blue-100 text-blue-800";
      case "social_leave":
        return "bg-amber-100 text-amber-800";
      case "made_available":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const downloadHistoryCSV = () => {
    const all = historyFilteredData.flatMap((r) => r.intakes);
    if (!all.length) return;
    const rows = all.map((i: any) => ({
      Date: format(new Date(i.scheduled_time), "MMM dd, yyyy"),
      Time: format(new Date(i.scheduled_time), "HH:mm"),
      Medication: i.medication?.name || "N/A",
      Strength: i.medication ? `${i.medication.strength} ${i.medication.strength_unit}` : "N/A",
      "Dosage Form": i.medication?.dosage_form || "N/A",
      Route: i.medication?.route || "N/A",
      Quantity: i.quantity || 1,
      Status: i.status || i.state || "scheduled",
      Notes: i.comment || i.notes || "",
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `medication-history-${resident?.first_name}-${resident?.last_name}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const groupedColumns: ColumnDef<GroupedIntake>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const isToday = format(row.original.dateObj, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
        return (
          <div className="flex items-center gap-2">
            <p className="font-medium">{format(row.original.dateObj, "MMM dd, yyyy")}</p>
            {isToday && <Badge variant="secondary" className="text-xs">Today</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: "stats",
      header: "Summary",
      cell: ({ row }) => {
        const { totalCount, administeredCount, missedCount, refusedCount } = row.original;
        return (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Total: {totalCount}</span>
            {administeredCount > 0 && <span className="text-green-600 font-medium">✓ {administeredCount}</span>}
            {missedCount > 0 && <span className="text-red-600 font-medium">✗ {missedCount}</span>}
            {refusedCount > 0 && <span className="text-orange-600 font-medium">⊘ {refusedCount}</span>}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedDateIntakeGroup(row.original); setIsSheetOpen(true); }}>
            <Eye className="h-4 w-4 mr-2" />View
          </Button>
        </div>
      ),
    },
  ];

  const historyTable = useReactTable({
    data: historyFilteredData,
    columns: groupedColumns,
    onSortingChange: setHistorySorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting: historySorting },
    initialState: { pagination: { pageSize: 25 } },
  });

  const handleCompleteMedicationRound = async () => {
    if (!id || !selectedTime || !profile) return;
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
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
      fetchData(true);
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

  // Get a map of administered times for each medication today to disable them in the selection dropdown
  const administeredTimesToday = useMemo(() => {
    const map: Record<string, string[]> = {};
    selectedDateIntakes.forEach(intake => {
      const intakeStatus = intake.status || intake.state;
      const isAdministeredOutcome = intakeStatus && intakeStatus !== 'scheduled' && intakeStatus !== 'pending';
      if (isAdministeredOutcome) {
        const time = normalizeTimeToHHmm(intake.scheduled_time) || formatTimestampToUKTime(intake.scheduled_time);
        if (!map[intake.medication_id]) map[intake.medication_id] = [];
        if (!map[intake.medication_id].includes(time)) {
          map[intake.medication_id].push(time);
        }
      }
    });

    topicalAdministrations.forEach((administration) => {
      const status = administration.status;
      const isAdministeredOutcome = status && status !== "scheduled" && status !== "pending";
      if (!isAdministeredOutcome) return;

      const time = normalizeTimeToHHmm(administration.scheduled_time) || normalizeTimeToHHmm(administration.administered_at);
      if (!time) return;

      if (!map[administration.medication_id]) {
        map[administration.medication_id] = [];
      }
      if (!map[administration.medication_id].includes(time)) {
        map[administration.medication_id].push(time);
      }
    });

    return map;
  }, [selectedDateIntakes, topicalAdministrations]);

  const prnTopicalColumns = useMemo(
    () => createMedicationColumns(
      createAndAdministerMedicationIntake,
      true,
      availableMembers,
      profile ? { name: profile.name || "", userId: profile.id } : undefined,
      true,  // Use simplified dialog for PRN medications in Today's tab
      administeredTimesToday
    ),
    [availableMembers, profile, administeredTimesToday]
  );

  const topicalMedicationColumns = useMemo(
    () => createTopicalMedicationColumns(
      createAndAdministerMedicationIntake,
      true,
      availableMembers,
      profile ? { name: profile.name || "", userId: profile.id } : undefined,
      administeredTimesToday,
      selectedTime
    ),
    [availableMembers, profile, administeredTimesToday, selectedTime]
  );

  const allActiveMedicationColumns = useMemo(
    () => createMedicationColumns(
      createAndAdministerMedicationIntake,
      false,
      availableMembers,
      profile ? { name: profile.name || "", userId: profile.id } : undefined,
      true,  // Default to simplified
      administeredTimesToday
    ),
    [availableMembers, profile, administeredTimesToday]
  );

  const supplementColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Medication",
        cell: ({ row }) => {
          const med = row.original;
          return (
            <div className="flex flex-col">
              <p className="font-medium">{med.name}</p>
              <p className="text-xs text-muted-foreground">
                {med.strength} {med.strength_unit} - {med.dosage_form}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "qty",
        header: "Qty",
        cell: ({ row }) => {
          const med = row.original as { time_quantities?: Record<string, number> | null };

          let defaultQty: number = 1;
          if (med.time_quantities && typeof med.time_quantities === "object") {
            const quantities = Object.values(med.time_quantities as Record<string, number>);
            if (quantities.length > 0) {
              const first = quantities[0];
              if (typeof first === "number" && !Number.isNaN(first)) {
                defaultQty = first;
              }
            }
          }

          return <span>{defaultQty}</span>;
        },
      },
      {
        accessorKey: "popped_out",
        header: "Popped Out",
        cell: ({ row }) => {
          return (
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer"
              disabled
            />
          );
        },
      },
      {
        accessorKey: "total_count",
        header: "Total Count",
        cell: ({ row }) => {
          const med = row.original;
          return <span>{med.total_count || "-"}</span>;
        },
      },
      {
        accessorKey: "dispensed_by",
        header: "Dispensed by",
        cell: () => {
          return <span className="text-muted-foreground">-</span>;
        },
      },
      {
        accessorKey: "witnessed_by",
        header: "Witnessed By",
        cell: () => {
          return <span className="text-muted-foreground">-</span>;
        },
      },
      {
        accessorKey: "state",
        header: "State",
        cell: ({ row }) => {
          const med = row.original;
          return (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {med.status || "active"}
            </Badge>
          );
        },
      },
    ],
    []
  );

  // Topical medications filtered by selected time
  const filteredTopicalMedications = useMemo(() => {
    if (!selectedTime) return [];
    return topicalMedications.filter((med) =>
      med.times && med.times.includes(selectedTime)
    );
  }, [topicalMedications, selectedTime]);

  useEffect(() => {
    if (selectedTime && selectedDateIntakes) {
      const filtered = selectedDateIntakes.filter((intake) => {
        const intakeTime = formatTimestampToUKTime(intake.scheduled_time);
        const match = intakeTime === selectedTime;

        // Exclude topical medications from Today's Medications (they have their own section)
        if (intake.medication?.schedule_type === 'Topical') {
          return false;
        }

        // Issue 7: Show intakes even if parent medication is completed/cancelled IF:
        // 1. The intake itself has been acted upon (not just scheduled/pending)
        // 2. OR the entire medication round for this slot is already completed
        const medStatus = intake.medication?.status;
        const isActedUpon = intake.status !== 'scheduled' && intake.status !== 'pending';
        const isRoundCompleted = medicationRoundStatus?.status === 'completed';

        if ((medStatus === 'completed' || medStatus === 'cancelled' || medStatus === 'discontinued') && !isActedUpon && !isRoundCompleted) {
          return false;
        }

        return match;
      }).sort((a, b) => {
        const aControlled = a.medication?.is_controlled_drug;
        const bControlled = b.medication?.is_controlled_drug;
        if (aControlled && !bControlled) return -1;
        if (!aControlled && bControlled) return 1;
        return 0;
      });
      setFilteredIntakes(filtered);
    } else {
      setFilteredIntakes([]);
    }
  }, [selectedTime, selectedDateIntakes, medicationRoundStatus]);

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
      {/* Header */}
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
            <span className="text-muted-foreground">/ Medication</span>
          </div>
          <p className="text-muted-foreground text-sm">View and manage medication schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/residents/${id}/medication/docs`)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Docs
          </Button>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="today">Today&apos;s Medications</TabsTrigger>
          <TabsTrigger value="active">Active Medications</TabsTrigger>
          <TabsTrigger value="emar">eMAR</TabsTrigger>
          <TabsTrigger value="discontinued" className="relative">
            Discontinued
            {discontinuedMedications.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 text-[10px] font-semibold px-1.5 min-w-[18px] h-[18px]">
                {discontinuedMedications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="kardex">Kardex</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ── Today's Medications ── */}
        <TabsContent value="today" className="flex flex-col gap-6 mt-4">
          <div className="flex items-center justify-between">
            <ShiftTimes selectedTime={selectedTime} setSelectedTime={setSelectedTime} />

            {/* Bulk Action Buttons */}
            <div className="flex items-center gap-2">
              {(() => {
                // Get all scheduled medications (including supplements)
                const allScheduledMeds = filteredIntakes.filter((intake) => intake.status === 'scheduled');

                // Get only regular medications (excluding supplements) for Prepare All
                const regularMeds = filteredIntakes.filter((intake) => {
                  const isSupplement = intake.medication?.schedule_type === 'Supplement' ||
                                      intake.medication?.type === 'Supplement' ||
                                      intake.medication?.category === 'Supplement';
                  return !isSupplement && intake.status === 'scheduled';
                });

                const unpreparedMeds = regularMeds.filter(intake => !intake.popped_out_at);

                if (allScheduledMeds.length === 0) return null;

                return (
                  <>
                    {/* Prepare All Button */}
                    {unpreparedMeds.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const now = new Date().toISOString();
                            const intakeIds = unpreparedMeds.map(intake => intake.id);

                            const { error } = await supabase
                              .from("medication_intakes")
                              .update({
                                popped_out_at: now,
                                popped_out_by_id: profile?.id
                              })
                              .in('id', intakeIds);

                            if (error) throw error;

                            // Optimistic update
                            setSelectedDateIntakes(prev => prev.map(intake => {
                              if (intakeIds.includes(intake.id)) {
                                return {
                                  ...intake,
                                  popped_out_at: now,
                                  popped_out_by_id: profile?.id
                                };
                              }
                              return intake;
                            }));

                            toast.success(`${unpreparedMeds.length} medication(s) prepared`);
                          } catch (error) {
                            console.error("Error preparing all medications:", error);
                            toast.error("Failed to prepare medications");
                          }
                        }}
                        size="sm"
                        className="px-4"
                      >
                        <CheckCircle className="w-3 h-3 mr-1.5" />
                        Prepare All ({unpreparedMeds.length})
                      </Button>
                    )}

                    {/* Mark All as Given Button */}
                    <Button
                      variant="default"
                      size="sm"
                      className="px-4 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                      onClick={async () => {
                        // Check if all regular medications are prepared (supplements don't need to be prepared)
                        const allRegularPrepared = regularMeds.every(intake => intake.popped_out_at);

                        if (!allRegularPrepared) {
                          toast.error("Please prepare all medications before marking as given");
                          return;
                        }

                        // Check if witness is selected for all (including supplements)
                        const allHaveWitness = allScheduledMeds.every(intake => intake.witness_id);

                        if (!allHaveWitness) {
                          toast.error("Please select a witness for all medications and supplements");
                          return;
                        }

                        try {
                          const now = new Date().toISOString();
                          const intakeIds = allScheduledMeds.map(intake => intake.id);

                          const { error } = await supabase
                            .from("medication_intakes")
                            .update({
                              status: 'taken',
                              administered_by_id: profile?.id,
                              administered_at: now
                            })
                            .in('id', intakeIds);

                          if (error) throw error;

                          // Optimistic update
                          setSelectedDateIntakes(prev => prev.map(intake => {
                            if (intakeIds.includes(intake.id)) {
                              return {
                                ...intake,
                                status: 'taken',
                                administered_by_id: profile?.id,
                                administered_at: now
                              };
                            }
                            return intake;
                          }));

                          toast.success(`${allScheduledMeds.length} medication(s) and supplement(s) marked as given`);
                        } catch (error) {
                          console.error("Error marking all as given:", error);
                          toast.error("Failed to mark medications as given");
                        }
                      }}
                    >
                      <CheckCircle className="w-3 h-3 mr-1.5" />
                      Mark All as Given ({allScheduledMeds.length})
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>

          {(() => {
            // Separate regular medications from supplements
            const regularMeds = filteredIntakes.filter((intake) => {
              const isSupplement = intake.medication?.schedule_type === 'Supplement' ||
                                  intake.medication?.type === 'Supplement' ||
                                  intake.medication?.category === 'Supplement';
              return !isSupplement;
            });

            const supplementIntakes = filteredIntakes.filter((intake) => {
              const isSupplement = intake.medication?.schedule_type === 'Supplement' ||
                                  intake.medication?.type === 'Supplement' ||
                                  intake.medication?.category === 'Supplement';
              return isSupplement;
            });

            // Combine with a divider marker
            const combinedData = [
              ...regularMeds,
              ...(supplementIntakes.length > 0 ? [{ isDivider: true, dividerLabel: 'Supplements' }] : []),
              ...supplementIntakes
            ];

            return (
              <DataTable columns={dailyMedicationColumns} data={combinedData} />
            );
          })()}

          {selectedTime && (
            <div className="w-full">
              {medicationRoundStatus?.status === 'completed' ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-semibold text-sm">Medication Round Completed</p>
                      <p className="text-xs text-muted-foreground">Finished on {formatTimestampToUKDateTime(medicationRoundStatus.completed_at)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">Complete Medication Round</p>
                    <p className="text-xs text-muted-foreground">Ensure all medications are administered before completing.</p>
                  </div>
                  <Button onClick={handleCompleteMedicationRound} size="sm" className="px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                    <CheckCircle className="w-3 h-3 mr-1.5" />Complete Round
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-2">
              <p className="font-semibold">Topical Medications</p>
              {selectedTime && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Showing for {selectedTime}
                </span>
              )}
            </div>
            {filteredTopicalMedications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">No topical medications for {selectedTime || 'this time'}</p>
                <p className="text-xs text-muted-foreground">Topical medications scheduled at this time will appear here.</p>
              </div>
            ) : (
              <DataTable columns={topicalMedicationColumns} data={filteredTopicalMedications} />
            )}
          </div>

          <div className="flex flex-col gap-4 mt-4">
            <p className="font-semibold">PRN Medications</p>
            {prnOrTopicalMedications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">No PRN medications</p>
                <p className="text-xs text-muted-foreground">PRN (as needed) medications will appear here.</p>
              </div>
            ) : (
              <DataTable columns={prnTopicalColumns} data={prnOrTopicalMedications} />
            )}
          </div>
        </TabsContent>

        {/* ── Active Medications ── */}
        <TabsContent value="active" className="flex flex-col gap-6 mt-4">
          <ActiveMedicationsTable
            medications={allActiveMedications}
            residentId={id}
            residentName={fullName}
            onRefresh={() => fetchData(true)}
          />
        </TabsContent>

        {/* ── eMAR ── */}
        <TabsContent value="emar" className="flex flex-col gap-6 mt-4">
          <EmarSheet
            residentId={id}
            residentName={fullName}
            organizationId={profile?.active_organization_id || resident.organization_id || ""}
            careHomeId={profile?.active_care_home_id || resident.care_home_id || ""}
          />
        </TabsContent>

        {/* ── Discontinued ── */}
        <TabsContent value="discontinued" className="flex flex-col gap-4 mt-4">
          {discontinuedMedications.length === 0 && completedCancelledMedications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center border border-slate-200 rounded-lg bg-slate-50">
              <p className="text-sm font-medium text-muted-foreground">No discontinued medications</p>
              <p className="text-xs text-muted-foreground">Medications that are discontinued or cancelled will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {discontinuedMedications.length > 0 && (
                <div className="flex flex-col gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="font-semibold text-sm">
                    Discontinued ({discontinuedMedications.length})
                  </p>
                  <DataTable columns={allActiveMedicationColumns} data={discontinuedMedications} />
                </div>
              )}
              {completedCancelledMedications.length > 0 && (
                <div className="flex flex-col gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="font-semibold text-sm">
                    Completed / Cancelled ({completedCancelledMedications.length})
                  </p>
                  <DataTable columns={allActiveMedicationColumns} data={completedCancelledMedications} />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Kardex ── */}
        <TabsContent value="kardex" className="mt-4">
          <KardexModal medications={allActiveMedications} resident={resident} inlineMode />
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="flex flex-col gap-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[260px] justify-start text-left font-normal", !historyDateRange && "text-muted-foreground text-sm")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {historyDateRange?.from
                      ? historyDateRange.to
                        ? `${format(historyDateRange.from, "LLL dd, y")} - ${format(historyDateRange.to, "LLL dd, y")}`
                        : format(historyDateRange.from, "LLL dd, y")
                      : "Filter by date range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="range" selected={historyDateRange} onSelect={setHistoryDateRange} disabled={(d) => d > new Date()} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
              {historyDateRange && <Button variant="ghost" onClick={() => setHistoryDateRange(undefined)}>Clear</Button>}
            </div>
            <Button onClick={downloadHistoryCSV} variant="outline" disabled={historyFilteredData.length === 0}>
              <Download className="mr-2 h-4 w-4" />Download CSV
            </Button>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading history…</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  {historyTable.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {historyTable.getRowModel().rows.length ? (
                    historyTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/30">
                        {row.getVisibleCells().map((c) => <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>)}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={groupedColumns.length} className="h-24 text-center text-muted-foreground">No history found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail sheet for history */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedDateIntakeGroup && format(selectedDateIntakeGroup.dateObj, "EEEE, MMMM dd, yyyy")}</SheetTitle>
            <SheetDescription>Detailed medication list for this date</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {selectedDateIntakeGroup && (() => {
              const intakes = selectedDateIntakeGroup.intakes;
              const scheduled = intakes.filter((i: any) => i.medication?.schedule_type !== "PRN (As Needed)" && i.medication?.route !== "Topical");
              const prn = intakes.filter((i: any) => i.medication?.schedule_type === "PRN (As Needed)");
              const topical = intakes.filter((i: any) => i.medication?.route === "Topical" && i.medication?.schedule_type !== "PRN (As Needed)");

              const renderTable = (rows: any[], title: string) => {
                if (!rows.length) return null;
                return (
                  <div className="space-y-2">
                    <p className="font-semibold text-sm px-3 py-1.5 bg-muted rounded-md w-fit">{title}</p>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Medication</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Administered By</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((intake: any) => (
                            <TableRow key={intake.id}>
                              <TableCell className="font-medium">{format(new Date(intake.scheduled_time), "HH:mm")}</TableCell>
                              <TableCell>
                                <p className="font-medium">{intake.medication?.name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">{intake.medication?.strength || ""} {intake.medication?.strength_unit || ""}</p>
                              </TableCell>
                              <TableCell>{intake.quantity || 1}</TableCell>
                              <TableCell>
                                <Badge className={getStateBadgeStyle(intake.status || intake.state || "scheduled")} variant="outline">
                                  {intake.status || intake.state || "scheduled"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                <div>{intake.administered_by?.name || "-"}</div>
                                {intake.witness?.name && <div className="text-xs text-muted-foreground">Witness: {intake.witness.name}</div>}
                              </TableCell>
                              <TableCell className="text-sm italic">{intake.comment || intake.notes || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {renderTable(scheduled, "Scheduled Medications")}
                  {renderTable(prn, "PRN (As Needed) Medications")}
                  {renderTable(topical, "Topical Medications")}
                  {!scheduled.length && !prn.length && !topical.length && (
                    <p className="text-muted-foreground text-sm text-center py-8">No medications recorded for this date.</p>
                  )}
                </>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}