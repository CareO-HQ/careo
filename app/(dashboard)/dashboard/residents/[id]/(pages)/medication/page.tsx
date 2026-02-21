"use client";

import { createColumns } from "@/components/medication/daily/columns";
import { createMedicationColumns } from "@/components/medication/daily/medication-columns";
import { DataTable } from "@/components/medication/daily/data-table";
import { MedicationAlertBanner } from "@/components/medication/alerts/MedicationAlertBanner";
import ShiftTimes from "@/components/medication/daily/ShiftTimes";
import CreateResidentMedication from "@/components/medication/forms/CreateResidentMedication";
import KardexModal from "@/components/medication/KardexModal";
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
import { formatTimestampToUKTime, formatTimestampToUKDateTime } from "@/lib/date-utils";
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
  const autoGenInProgress = React.useRef(false);

  const [resident, setResident] = useState<Resident | null>(null);
  const [selectedDateIntakes, setSelectedDateIntakes] = useState<any[]>([]);
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
        ));
        setTopicalMedications(meds.filter(m =>
          m.status === 'active' && m.route === 'Topical'
        ));
        setSupplementMedications(meds.filter(m =>
          m.status === 'active' && (m.type === 'Supplement' || m.category === 'Supplement')
        ));
        setDiscontinuedMedications(meds.filter(m => m.status === 'discontinued'));
        setCompletedCancelledMedications(meds.filter(m => m.status === 'completed' || m.status === 'cancelled'));
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
        administeredCount: arr.filter((i) => ["administered", "given"].includes(getStatus(i))).length,
        givenCount: arr.filter((i) => getStatus(i) === "given").length,
        missedCount: arr.filter((i) => getStatus(i) === "missed").length,
        refusedCount: arr.filter((i) => getStatus(i) === "refused").length,
        skippedCount: arr.filter((i) => getStatus(i) === "skipped").length,
      } as GroupedIntake;
    }).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [historyAllIntakes, historyDateRange]);

  const getStateBadgeStyle = (status: string) => {
    switch (status) {
      case "given": case "administered": return "bg-green-100 text-green-800";
      case "missed": return "bg-red-100 text-red-800";
      case "refused": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
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
    if (selectedTime && selectedDateIntakes) {
      const filtered = selectedDateIntakes.filter((intake) => {
        const intakeTime = formatTimestampToUKTime(intake.scheduled_time);
        const match = intakeTime === selectedTime;

        // Issue 7: Show intakes even if parent medication is completed/cancelled IF:
        // 1. The intake itself has been acted upon (not just scheduled/pending)
        // 2. OR the entire medication round for this slot is already completed
        const medStatus = intake.medication?.status;
        const isActedUpon = intake.status !== 'scheduled' && intake.status !== 'pending';
        const isRoundCompleted = medicationRoundStatus?.status === 'completed';

        if ((medStatus === 'completed' || medStatus === 'cancelled') && !isActedUpon && !isRoundCompleted) {
          return false;
        }

        return match;
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
        <Avatar className="w-10 h-10">
          <AvatarImage src={resident.image_url || ""} alt={fullName} className="border" />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Medication</h1>
          <p className="text-muted-foreground text-sm">View and manage medication schedule for {fullName}.</p>
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
          <TabsTrigger value="medications">All Medications</TabsTrigger>
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
          <div className="flex flex-col items-start">
            <ShiftTimes selectedTime={selectedTime} setSelectedTime={setSelectedTime} />
          </div>

          <DataTable columns={dailyMedicationColumns} data={filteredIntakes} />

          {selectedTime && (
            <div className="w-full">
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

          <div className="flex flex-col gap-4 mt-6">
            <p className="font-semibold">Topical Medications</p>
            {topicalMedications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">No topical medications</p>
                <p className="text-xs text-muted-foreground">Topical medications will appear here.</p>
              </div>
            ) : (
              <DataTable columns={prnTopicalColumns} data={topicalMedications} />
            )}
          </div>

          <div className="flex flex-col gap-4 mt-6">
            <p className="font-semibold">Supplements</p>
            {supplementMedications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">No supplements</p>
                <p className="text-xs text-muted-foreground">Supplements and vitamins will appear here.</p>
              </div>
            ) : (
              <DataTable columns={prnTopicalColumns} data={supplementMedications} />
            )}
          </div>
        </TabsContent>

        {/* ── All Medications ── */}
        <TabsContent value="medications" className="flex flex-col gap-6 mt-4">
          <div className="flex flex-col gap-4">
            <p className="font-semibold">All Active Medications</p>
            <DataTable columns={allActiveMedicationColumns} data={allActiveMedications} />
          </div>
        </TabsContent>

        {/* ── Discontinued ── */}
        <TabsContent value="discontinued" className="flex flex-col gap-4 mt-4">
          {discontinuedMedications.length === 0 && completedCancelledMedications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">No discontinued medications</p>
              <p className="text-xs text-muted-foreground">Medications that are discontinued or cancelled will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {discontinuedMedications.length > 0 && (
                <div className="flex flex-col gap-4 p-6 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-semibold text-red-800">
                    Discontinued ({discontinuedMedications.length})
                  </p>
                  <DataTable columns={allActiveMedicationColumns} data={discontinuedMedications} />
                </div>
              )}
              {completedCancelledMedications.length > 0 && (
                <div className="flex flex-col gap-4 p-6 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="font-semibold text-amber-800">
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