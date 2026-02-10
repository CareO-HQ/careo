"use client";

import { useActiveTeam } from "@/hooks/use-active-team";
import { useRouter } from "next/navigation";
import { Resident } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getColumns } from "./columns";
import { DataTable } from "./data-table";
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
import { getUKTodayDate } from "@/lib/date-utils";

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

    const dateString = selectedDate.toISOString().split('T')[0];

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
      const dateString = selectedDate.toISOString().split('T')[0];

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

      // Fetch handover data for each resident
      const residentHandoversPromises = residents.map(async (resident) => {
        const today = getUKTodayDate();
        const fluidTypes = ["Water", "Tea", "Coffee", "Juice", "Milk"];

        // Fetch food/fluid logs for today
        const { data: logs } = await supabase
          .from("food_fluid_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .eq("date", today)
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

        // Fetch incidents for today
        const { data: incidents } = await supabase
          .from("incidents")
          .select("*")
          .eq("resident_id", resident.id)
          .eq("date", today)
          .order("time", { ascending: false });

        // Fetch hospital transfers for today
        const { data: transfers } = await supabase
          .from("hospital_transfer_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .eq("date", today);

        // Get comments from database
        const { data: commentData } = await supabase
          .from("handover_comments")
          .select("*")
          .eq("team_id", activeTeamId)
          .eq("resident_id", resident.id)
          .eq("date", dateString)
          .eq("shift", selectedShift)
          .maybeSingle();

        const comments = commentData?.comment || "";

        return {
          residentId: resident.id,
          residentName: `${resident.first_name} ${resident.last_name}`,
          roomNumber: resident.room_number,
          age: getAge(resident.date_of_birth),
          foodIntakeCount: foodLogs.length,
          foodIntakeLogs: foodLogs.map(log => ({
            id: log.id.toString(),
            typeOfFoodDrink: log.type_of_food_drink,
            amountEaten: log.amount_eaten,
            section: log.section,
            timestamp: new Date(log.timestamp).getTime(),
          })),
          totalFluid: totalFluid,
          fluidLogs: fluidLogs.map(log => ({
            id: log.id.toString(),
            typeOfFoodDrink: log.type_of_food_drink,
            fluidConsumedMl: log.fluid_consumed_ml,
            section: log.section,
            timestamp: new Date(log.timestamp).getTime(),
          })),
          incidentCount: incidents?.length || 0,
          incidents: (incidents || []).map(inc => ({
            id: inc.id.toString(),
            type: inc.incident_types || [],
            level: inc.incident_level,
            time: inc.time,
          })),
          hospitalTransferCount: transfers?.length || 0,
          hospitalTransfers: (transfers || []).map(transfer => ({
            id: transfer.id.toString(),
            hospitalName: transfer.hospital_name,
            reason: transfer.reason,
          })),
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
      <div className="flex items-center justify-between border-b px-6 py-4">
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

      {/* Filters - matching careo-audit style */}
      <div className="flex items-center gap-2 border-b px-6 py-3">
        <Badge variant="outline" className="rounded-sm">
          {isLoadingResidents ? "Loading..." : `${residents.length} Residents`}
        </Badge>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoadingResidents ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading residents...</p>
            </div>
          </div>
        ) : (
          <DataTable<Resident, unknown>
            columns={getColumns(
              activeTeamId ?? undefined,
              currentUser?.id,
              currentUser?.name || "Unknown",
              currentUser?.active_organization_id || undefined
            )}
            data={residents || []}
            teamName={activeTeam?.name ?? ""}
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
