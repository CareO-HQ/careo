"use client";

import { useActiveTeam } from "@/hooks/use-active-team";
import { useRouter } from "next/navigation";
import { Resident } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HandoverSheetView } from "./handover-sheet-view";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { getAge } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, FileText, MessageSquare, Users } from "lucide-react";
import { getCurrentShift } from "@/lib/config/shift-config";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { getUKTodayDate, formatTimestampToUKTime } from "@/lib/date-utils";
import { fromZonedTime } from "date-fns-tz";

export default function HandoverPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { activeTeamId, activeTeam } = useActiveTeam();
  const { profile: currentUser, isLoading: isProfileLoading } = useProfile();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoadingResidents, setIsLoadingResidents] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<"day" | "night">(getCurrentShift());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [commentsSummary, setCommentsSummary] = useState<{ total: number; withComments: number; withoutComments: number } | null>(null);
  const [inCharge, setInCharge] = useState("");
  const [hospital, setHospital] = useState("");
  const [vacant, setVacant] = useState("");

  const fetchResidents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("residents")
        .select("*")
        .eq("team_id", activeTeamId);

      if (error) throw error;
      setResidents((data as Resident[]) || []);
    } catch (error) {
      console.error("Error fetching residents:", error);
      setResidents([]);
    } finally {
      setIsLoadingResidents(false);
    }
  }, [activeTeamId, supabase]);

  useEffect(() => {
    if (!activeTeamId || !supabase) {
      setIsLoadingResidents(false);
      return;
    }

    fetchResidents();
  }, [fetchResidents, activeTeamId, supabase]);

  // Listen for custom 'residents-updated' event
  useEffect(() => {
    const handleUpdate = () => {
      fetchResidents();
    };

    window.addEventListener("residents-updated", handleUpdate);
    return () => {
      window.removeEventListener("residents-updated", handleUpdate);
    };
  }, [fetchResidents]);

  // Load comments summary when dialog opens
  const loadCommentsSummary = async () => {
    if (!activeTeamId || !residents || !supabase) return;

    const dateString = format(selectedDate, 'yyyy-MM-dd');

    try {
      const { data: commentsData, error } = await supabase
        .from("handover_comments")
        .select(`
          *,
          residents!inner(team_id)
        `)
        .eq("residents.team_id", activeTeamId)
        .eq("date", dateString)
        .eq("shift", selectedShift);

      if (error) throw error;

      const withComments = commentsData?.filter(c => c.comment && c.comment.trim().length > 0).length || 0;
      const total = residents.length;

      setCommentsSummary({
        total,
        withComments,
        withoutComments: total - withComments,
      });
    } catch (error) {
      console.error("Failed to load comments summary:", error);
      toast.error("Failed to load comments summary");
    }
  };

  // Load summary when date or shift changes
  useEffect(() => {
    if (isDialogOpen) {
      loadCommentsSummary();
    }
  }, [isDialogOpen, selectedDate, selectedShift, activeTeamId, residents.length]);

  const handleSaveHandover = async () => {
    if (!activeTeamId || !activeTeam || !residents || !currentUser || !supabase) {
      toast.error("Missing required information");
      return;
    }

    setIsSaving(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');

      // Check if handover already exists for this date/shift
      const { data: existingHandover } = await supabase
        .from("handover_reports")
        .select("*")
        .eq("team_id", activeTeamId)
        .eq("date", dateString)
        .eq("shift", selectedShift)
        .maybeSingle();

      if (existingHandover) {
        const confirmed = confirm(
          `A handover report already exists for ${format(selectedDate, "PPP")} - ${selectedShift} shift.\n\nDo you want to overwrite it?`
        );
        if (!confirmed) {
          setIsSaving(false);
          return;
        }
        // Delete existing handover if confirmed
        await supabase
          .from("handover_reports")
          .delete()
          .eq("id", existingHandover.id);
      }

      // Wait for any pending auto-saves to complete (2s debounce + 0.5s buffer)
      toast.info("Finalizing comments...");
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Define shift boundaries in UK time and convert to UTC for Supabase queries
      const getShiftBoundaries = (date: Date, shift: "day" | "night") => {
        const dateStr = format(date, 'yyyy-MM-dd');
        let startHour, endHour;

        if (shift === "day") {
          startHour = 8; // 8 AM
          endHour = 20; // 8 PM
        } else {
          startHour = 20; // 8 PM
          endHour = 8; // 8 AM next day
        }

        const startDateTimeStr = `${dateStr}T${String(startHour).padStart(2, '0')}:00:00`;
        let endDateTimeStr = `${dateStr}T${String(endHour).padStart(2, '0')}:00:00`;

        // If night shift, end date is next day
        if (shift === "night" && endHour < startHour) {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          endDateTimeStr = `${format(nextDay, 'yyyy-MM-dd')}T${String(endHour).padStart(2, '0')}:00:00`;
        }

        // Convert to UTC
        const shiftStartUTC = fromZonedTime(startDateTimeStr, 'Europe/London');
        const shiftEndUTC = fromZonedTime(endDateTimeStr, 'Europe/London');

        return { shiftStartUTC, shiftEndUTC };
      };

      const { shiftStartUTC, shiftEndUTC } = getShiftBoundaries(selectedDate, selectedShift);

      // Fetch handover data for each resident
      const residentHandoversPromises = residents.map(async (resident) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const fluidTypes = ["Water", "Tea", "Coffee", "Juice", "Milk"];

        // Fetch food/fluid logs for selected date
        const { data: logs } = await supabase
          .from("food_fluid_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("timestamp", shiftStartUTC.toISOString())
          .lt("timestamp", shiftEndUTC.toISOString())
          .eq("is_archived", false)
          .order("timestamp", { ascending: false });

        // Separate food and fluid logs
        const foodLogs = (logs || []).filter(log =>
          log.type_of_food_drink &&
          !fluidTypes.includes(log.type_of_food_drink) &&
          !log.fluid_consumed_ml &&
          log.amount_eaten &&
          log.amount_eaten !== "None" &&
          log.amount_eaten.trim() !== ""
        );

        const fluidLogs = (logs || []).filter(log =>
          fluidTypes.includes(log.type_of_food_drink) || (log.fluid_consumed_ml && log.fluid_consumed_ml > 0)
        );

        const totalFluid = fluidLogs.reduce((sum, log) => sum + (log.fluid_consumed_ml || 0), 0);

        // Fetch incidents for selected date
        const { data: incidents } = await supabase
          .from("incidents")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("timestamp", shiftStartUTC.toISOString())
          .lt("timestamp", shiftEndUTC.toISOString())
          .order("timestamp", { ascending: false });

        // Fetch hospital transfers for selected date
        const { data: transfers } = await supabase
          .from("hospital_transfer_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("timestamp", shiftStartUTC.toISOString())
          .lt("timestamp", shiftEndUTC.toISOString());

        // Fetch medication status for the shift
        const { data: medicationIntakes } = await supabase
          .from("medication_intakes")
          .select("status, scheduled_time, medication:medication_id (name)")
          .eq("resident_id", resident.id)
          .gte("scheduled_time", shiftStartUTC.toISOString())
          .lt("scheduled_time", shiftEndUTC.toISOString())
          .order("scheduled_time", { ascending: true });

        let medStatus: "all_administered" | "missed" | "pending" = "all_administered";
        let nextMedName: string | undefined = undefined;
        let nextMedTime: string | undefined = undefined;

        if (medicationIntakes && medicationIntakes.length > 0) {
          const missedIntakes = medicationIntakes.filter(i => i.status === 'missed' || i.status === 'refused');
          const pendingIntakes = medicationIntakes.filter(i => i.status === 'scheduled' || i.status === 'pending');

          if (missedIntakes.length > 0) {
            medStatus = "missed";
            nextMedTime = formatTimestampToUKTime(missedIntakes[0].scheduled_time);
            nextMedName = (missedIntakes[0].medication as any)?.name;
          } else if (pendingIntakes.length > 0) {
            medStatus = "pending";
            nextMedTime = formatTimestampToUKTime(pendingIntakes[0].scheduled_time);
            nextMedName = (pendingIntakes[0].medication as any)?.name;
          }
        }

        // Get comments from database
        const { data: commentData } = await supabase
          .from("handover_comments")
          .select("*")
          .eq("resident_id", resident.id)
          .eq("date", dateStr)
          .eq("shift", selectedShift)
          .maybeSingle();

        const comments = commentData?.comment || "";

        return {
          residentId: resident.id,
          residentName: `${resident.first_name} ${resident.last_name}`,
          roomNumber: resident.room_number,
          age: getAge(resident.date_of_birth),
          foodIntakeCount: foodLogs.length,
          totalFluid: totalFluid,
          incidentCount: incidents?.length || 0,
          hospitalTransferCount: transfers?.length || 0,
          medicationStatus: medStatus,
          nextMedicationName: nextMedName,
          nextMedicationTime: nextMedTime,
          comments: comments,
        };
      });

      const residentHandovers = await Promise.all(residentHandoversPromises);

      // Prepare handover_data JSONB structure
      const handoverData = {
        teamName: activeTeam.name,
        organizationId: currentUser.active_organization_id || "",
        residentHandovers: residentHandovers,
        createdByName: currentUser.name || "Unknown",
        updatedByName: currentUser.name || "Unknown",
        inCharge: inCharge,
        hospital: hospital,
        vacant: vacant,
      };

      // Insert handover report into Supabase
      const { error: insertError } = await supabase
        .from("handover_reports")
        .insert({
          date: dateString,
          shift: selectedShift,
          team_id: activeTeamId,
          organization_id: currentUser.active_organization_id,
          handover_data: handoverData,
          created_by: currentUser.id,
        });

      if (insertError) throw insertError;

      // Cleanup: Delete draft comments after successful archive
      await supabase
        .from("handover_comments")
        .delete()
        .eq("team_id", activeTeamId)
        .eq("date", dateString)
        .eq("shift", selectedShift);

      toast.success("Handover saved successfully!");
      setIsDialogOpen(false);

      // Navigate to documents page
      router.push("/dashboard/handover/documents");
    } catch (error) {
      console.error("Error saving handover:", error);
      toast.error("Failed to save handover. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isProfileLoading) {
    return <div className="flex items-center justify-center h-screen">Loading profile...</div>;
  }

  return (
    <div className="flex flex-col min-h-full w-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 print:hidden">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Handover Sheet</h1>
          <Badge variant="table" className="bg-purple-50 text-purple-700 border-purple-300 rounded-sm">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/handover/documents")}
            className="h-8"
          >
            All Handovers
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            disabled={isLoadingResidents || residents.length === 0}
            className="h-8"
          >
            Save as Archive
          </Button>
        </div>
      </div>

      {/* Handover Sheet View */}
      <div className="flex-1 overflow-auto">
        {isLoadingResidents ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading residents...</p>
            </div>
          </div>
        ) : (
          <HandoverSheetView
            residents={residents || []}
            teamId={activeTeamId ?? ""}
            teamName={activeTeam?.name ?? "CEDAR UNIT"}
            currentUserId={currentUser?.id}
            currentUserName={currentUser?.name || "Unknown"}
            organizationId={currentUser?.active_organization_id || undefined}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedShift={selectedShift}
            setSelectedShift={setSelectedShift}
            inCharge={inCharge}
            setInCharge={setInCharge}
            hospital={hospital}
            setHospital={setHospital}
            vacant={vacant}
            setVacant={setVacant}
          />
        )}
      </div>

      {/* Save Handover Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Handover Report</DialogTitle>
            <DialogDescription>
              Select the shift type for this handover report. This will archive the current handover data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Handover Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(selectedDate, "PPP")}
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
            <div className="space-y-2">
              <Label htmlFor="shift">Shift Type</Label>
              <Select
                value={selectedShift}
                onValueChange={(value: "day" | "night") => setSelectedShift(value)}
              >
                <SelectTrigger id="shift">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Summary */}
            {commentsSummary && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4" />
                  Archive Summary
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-2xl font-bold">{commentsSummary.total}</div>
                      <div className="text-xs text-muted-foreground">Total Residents</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-green-600" />
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-green-600">{commentsSummary.withComments}</div>
                      <div className="text-xs text-muted-foreground">With Comments</div>
                    </div>
                  </div>
                </div>
                {commentsSummary.withoutComments > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                    <span className="font-medium">{commentsSummary.withoutComments}</span>
                    <span>resident(s) without comments</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveHandover}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Handover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
