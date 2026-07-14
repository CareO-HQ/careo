"use client";

import { Resident } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { format, addDays, isToday, isYesterday } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useHandoverComment } from "@/hooks/use-handover-comment";
import { cn } from "@/lib/utils";
import {
  fetchAllResidentsHandoverData,
  ResidentHandoverData,
} from "@/lib/handover-data";
import {
  computeMetaFromCapacityAndHandoverData,
  formatMetaStatValue,
} from "@/lib/handover-meta";
import { getTeamCapacity, TeamCapacity } from "@/lib/team-capacity";
import { HandoverEventsCell } from "@/components/handover/HandoverEventsCell";

interface HandoverSheetViewProps {
  residents: Resident[];
  teamId: string;
  teamName: string;
  currentUserId?: string;
  currentUserName?: string;
  organizationId?: string;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  selectedShift: "day" | "night";
  setSelectedShift: (s: "day" | "night") => void;
  inCharge: string;
  setInCharge: (val: string) => void;
  onPrint?: () => void;
  renderTopBarActions?: React.ReactNode;
}

function HandoverNotesCell({
  residentId,
  teamId,
  date,
  shift,
  currentUserId,
  currentUserName,
  organizationId,
}: {
  residentId: string;
  teamId: string;
  date: string;
  shift: "day" | "night";
  currentUserId?: string;
  currentUserName?: string;
  organizationId?: string;
}) {
  const { comment, setComment, isSaving, lastSavedText } = useHandoverComment({
    teamId,
    residentId,
    date,
    shift,
    currentUserId: currentUserId || "",
    currentUserName: currentUserName || "",
    organizationId: organizationId || "",
  });

  return (
    <div className="relative min-h-[120px]">
      <textarea
        placeholder="Shift notes…"
        className="w-full min-h-[120px] text-sm border-0 resize-none focus:outline-none focus:ring-0 bg-transparent leading-relaxed"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {(isSaving || lastSavedText) && (
        <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground italic">
          {isSaving ? "Saving…" : lastSavedText}
        </div>
      )}
    </div>
  );
}

function MobileResidentRow({
  resident,
  handoverData,
  teamId,
  currentUserId,
  currentUserName,
  organizationId,
  shift,
  date,
}: {
  resident: Resident;
  handoverData?: ResidentHandoverData;
  teamId: string;
  currentUserId?: string;
  currentUserName?: string;
  organizationId?: string;
  shift: "day" | "night";
  date: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-border bg-background">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div className="font-semibold text-sm">
            {resident.first_name} {resident.last_name}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Room {resident.room_number || "—"}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/60">
          <HandoverEventsCell data={handoverData} compact />
          <HandoverNotesCell
            residentId={resident.id}
            teamId={teamId}
            date={date}
            shift={shift}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            organizationId={organizationId}
          />
        </div>
      )}
    </div>
  );
}

export function HandoverSheetView({
  residents,
  teamId,
  teamName,
  currentUserId,
  currentUserName,
  organizationId,
  selectedDate,
  setSelectedDate,
  selectedShift,
  setSelectedShift,
  inCharge,
  setInCharge,
  renderTopBarActions,
}: HandoverSheetViewProps) {
  const { supabase } = useSupabase();
  const [handoverData, setHandoverData] = useState<Record<string, ResidentHandoverData>>({});
  const [teamCapacity, setTeamCapacity] = useState<TeamCapacity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fetchHandoverData = useCallback(async () => {
    if (!residents.length || !supabase) return;

    setIsLoading(true);
    try {
      const dataMap = await fetchAllResidentsHandoverData(
        supabase,
        residents,
        selectedDate,
        selectedShift
      );
      setHandoverData(dataMap);
    } catch (error) {
      console.error("Error fetching handover data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [residents, supabase, selectedDate, selectedShift]);

  useEffect(() => {
    fetchHandoverData();
  }, [fetchHandoverData]);

  useEffect(() => {
    if (!teamId || !supabase) {
      setTeamCapacity(null);
      return;
    }

    let cancelled = false;

    const loadTeamCapacity = async () => {
      const capacity = await getTeamCapacity(supabase, teamId);
      if (!cancelled) {
        setTeamCapacity(capacity);
      }
    };

    void loadTeamCapacity();

    return () => {
      cancelled = true;
    };
  }, [teamId, supabase]);

  const metaStats = computeMetaFromCapacityAndHandoverData(
    teamCapacity?.bedCount ?? null,
    teamCapacity?.residentCount ?? residents.length,
    handoverData
  );

  const dateString = format(selectedDate, "yyyy-MM-dd");
  const isFutureDisabled = isToday(selectedDate);

  const dateLabel = isToday(selectedDate)
    ? "Today"
    : isYesterday(selectedDate)
      ? "Yesterday"
      : format(selectedDate, "d MMM yyyy");

  const changeDate = (delta: number) => {
    const next = addDays(selectedDate, delta);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (next > today) return;
    setSelectedDate(next);
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Top bar */}
      <div className="border-b px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[15px] font-extrabold text-foreground">Handover</span>
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setSelectedShift("day")}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-xs font-medium transition-all",
                selectedShift === "day"
                  ? "bg-background text-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Day Shift
            </button>
            <button
              type="button"
              onClick={() => setSelectedShift("night")}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-xs font-medium transition-all",
                selectedShift === "night"
                  ? "bg-indigo-950 text-white font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Night Shift
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => changeDate(-1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-muted text-muted-foreground"
            >
              ‹
            </button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="px-3.5 text-xs font-semibold border-x min-w-[120px] text-center py-2 hover:bg-muted transition-colors"
                >
                  {dateLabel}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (!date) return;
                    const normalized = new Date(date);
                    normalized.setHours(0, 0, 0, 0);
                    setSelectedDate(normalized);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => date > new Date()}
                  captionLayout="dropdown"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => changeDate(1)}
              disabled={isFutureDisabled}
              className="w-8 h-8 flex items-center justify-center hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
          {renderTopBarActions}
        </div>
      </div>

      {/* Banner */}
      <div className="border-b bg-muted/30 px-4 sm:px-5 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {selectedShift === "day" ? "Day Shift" : "Night Shift"}
          </span>
          {" handover — "}
          <b className="text-foreground font-semibold">
            {format(selectedDate, "EEEE, d MMMM yyyy")}
          </b>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {teamName} · {residents.length} Residents
        </div>
      </div>

      {/* Meta row: In charge / Total beds / Hospital admissions / Vacant beds */}
      <div className="border-b px-4 sm:px-5 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs shrink-0 print:hidden">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0 min-w-[72px]">In charge</span>
          <input
            value={inCharge}
            onChange={(e) => setInCharge(e.target.value)}
            placeholder="Name"
            className="flex-1 border-b border-dotted border-border bg-transparent py-0.5 focus:outline-none focus:border-primary"
          />
        </label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0 min-w-[72px]">Total beds</span>
          <span className="flex-1 py-0.5 font-medium tabular-nums">
            {formatMetaStatValue(metaStats.totalBeds)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0 min-w-[140px]">
            Any hospital admissions
          </span>
          <span className="flex-1 py-0.5 font-medium tabular-nums">
            {metaStats.hospitalAdmissions}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0 min-w-[72px]">Vacant beds</span>
          <span className="flex-1 py-0.5 font-medium tabular-nums">
            {formatMetaStatValue(metaStats.vacantBeds)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm">
                <th className="sticky left-0 z-30 bg-muted/95 border-b-2 border-r-2 border-border px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground min-w-[160px] max-w-[220px] shadow-[3px_0_6px_rgba(0,0,0,0.05)] border-t-[3px] border-t-indigo-400">
                  Resident
                  <span className="block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                    Name & room
                  </span>
                </th>
                <th className="border-b-2 border-r border-border px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground min-w-[220px] border-t-[3px] border-t-emerald-400">
                  Events
                  <span className="block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                    Shift activity
                  </span>
                </th>
                <th className="border-b-2 border-border px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground min-w-[240px] border-t-[3px] border-t-amber-400">
                  Handover Notes
                  <span className="block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                    General shift summary
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-muted-foreground text-sm">
                    Loading resident data…
                  </td>
                </tr>
              ) : residents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-muted-foreground text-sm">
                    No residents found
                  </td>
                </tr>
              ) : (
                residents.map((resident, index) => (
                  <tr
                    key={resident.id}
                    className={cn(
                      "group print:break-inside-avoid",
                      index % 2 === 1 && "bg-muted/20"
                    )}
                  >
                    <td
                      className={cn(
                        "sticky left-0 z-10 border-b border-r-2 border-border px-3 py-2 align-top shadow-[3px_0_6px_rgba(0,0,0,0.04)]",
                        index % 2 === 1 ? "bg-muted/30" : "bg-background",
                        "group-hover:bg-indigo-50/50"
                      )}
                    >
                      <div className="font-semibold text-sm text-foreground">
                        {resident.first_name} {resident.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Room {resident.room_number || "—"}
                      </div>
                    </td>
                    <td className="border-b border-r border-border px-3 py-1 align-top">
                      <HandoverEventsCell data={handoverData[resident.id]} />
                    </td>
                    <td className="border-b border-border px-3 py-2 align-top">
                      <HandoverNotesCell
                        residentId={resident.id}
                        teamId={teamId}
                        date={dateString}
                        shift={selectedShift}
                        currentUserId={currentUserId}
                        currentUserName={currentUserName}
                        organizationId={organizationId}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Loading resident data…
            </div>
          ) : residents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No residents found
            </div>
          ) : (
            residents.map((resident) => (
              <MobileResidentRow
                key={resident.id}
                resident={resident}
                handoverData={handoverData[resident.id]}
                teamId={teamId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                organizationId={organizationId}
                shift={selectedShift}
                date={dateString}
              />
            ))
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          textarea {
            border: none !important;
            background: transparent !important;
            resize: none !important;
          }
        }
      `}</style>
    </div>
  );
}
