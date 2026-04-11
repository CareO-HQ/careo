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
import { CalendarIcon, FileText, MessageSquare, Users, Download } from "lucide-react";
import { getCurrentShift, getShiftTimeRange } from "@/lib/config/shift-config";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { getUKTodayDate } from "@/lib/date-utils";
import { fromZonedTime } from "date-fns-tz";
import { generateHandoverPDF } from "@/lib/handover-pdf-utils";
import { Card, CardContent } from "@/components/ui/card";

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

  // Set in-charge name to current user when loaded
  useEffect(() => {
    if (currentUser?.name && !inCharge) {
      setInCharge(currentUser.name);
    }
  }, [currentUser, inCharge]);

  const fetchResidents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("residents")
        .select("*")
        .eq("team_id", activeTeamId);

      if (error) throw error;
      
      const sortedResidents = (data as Resident[] || []).sort((a, b) => {
        if (!a.room_number) return 1;
        if (!b.room_number) return -1;
        return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
      });
      
      setResidents(sortedResidents);
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

  const handleDownloadPDF = async () => {
    console.log("[Handover] Starting PDF download...");
    if (!activeTeamId || !activeTeam || !residents || !currentUser || !supabase) {
      console.error("[Handover] Missing required information:", {
        activeTeamId,
        activeTeam: !!activeTeam,
        residents: residents?.length,
        currentUser: !!currentUser,
        supabase: !!supabase,
      });
      toast.error("Missing required information");
      return;
    }

    toast.info("Generating PDF...");
    try {
      console.log("[Handover] Formatting date...");
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const UK_TIMEZONE = "Europe/London";
      console.log("[Handover] Date string:", dateString);

      // Define shift boundaries
      const getShiftBoundaries = (date: Date, shift: "day" | "night") => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = format(nextDay, 'yyyy-MM-dd');

        let shiftStartUTC, shiftEndUTC;
        if (shift === "day") {
          shiftStartUTC = fromZonedTime(`${dateStr}T08:00:00`, UK_TIMEZONE);
          shiftEndUTC = fromZonedTime(`${dateStr}T20:00:00`, UK_TIMEZONE);
        } else {
          shiftStartUTC = fromZonedTime(`${dateStr}T20:00:00`, UK_TIMEZONE);
          shiftEndUTC = fromZonedTime(`${nextDayStr}T08:00:00`, UK_TIMEZONE);
        }
        return { shiftStartUTC, shiftEndUTC };
      };

      const { shiftStartUTC, shiftEndUTC } = getShiftBoundaries(selectedDate, selectedShift);

      const getFullDayBoundaries = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return {
          startOfDayUTC: fromZonedTime(`${dateStr}T00:00:00`, UK_TIMEZONE),
          endOfDayUTC: fromZonedTime(`${dateStr}T23:59:59`, UK_TIMEZONE)
        };
      };
      const { startOfDayUTC, endOfDayUTC } = getFullDayBoundaries(selectedDate);

      // Get shift times
      const shiftTimes = getShiftTimeRange(selectedShift);

      // Fetch handover data for each resident
      console.log("[Handover] Fetching handover data for", residents.length, "residents...");
      const handoverDataMap: Record<string, any> = {};

      for (let i = 0; i < residents.length; i++) {
        const resident = residents[i];
        console.log(`[Handover] Processing resident ${i + 1}/${residents.length}:`, resident.first_name, resident.last_name);
        const fluidTypes = ["Water", "Tea", "Coffee", "Juice", "Milk"];

        // Fetch food/fluid logs
        const { data: logs } = await supabase
          .from("food_fluid_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("timestamp", startOfDayUTC.toISOString())
          .lte("timestamp", endOfDayUTC.toISOString())
          .eq("is_archived", false)
          .order("timestamp", { ascending: false });

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

        // Calculate food intake percentage (assuming 3 meals per day)
        const foodIntakePercentage = Math.min(Math.round((foodLogs.length / 3) * 100), 100);

        // Fetch diet info
        const { data: dietData } = await supabase
          .from("diet_menus")
          .select("*")
          .eq("resident_id", resident.id)
          .maybeSingle();

        const dietInfo = dietData ? {
          textureGrade: dietData.texture_grade,
          fluidConsistency: dietData.fluid_consistency,
          diabeticStatus: dietData.diabetic_status,
        } : undefined;

        // Fetch incidents
        const { data: incidents } = await supabase
          .from("incidents")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("created_at", shiftStartUTC.toISOString())
          .lt("created_at", shiftEndUTC.toISOString());

        const { data: folders } = await supabase
          .from("incident_folders")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("created_at", shiftStartUTC.toISOString())
          .lt("created_at", shiftEndUTC.toISOString());

        // Fetch hospital transfers
        const { data: transfers } = await supabase
          .from("hospital_transfer_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("created_at", shiftStartUTC.toISOString())
          .lt("created_at", shiftEndUTC.toISOString());

        // Fetch active wounds
        const { data: wounds } = await supabase
          .from("wounds")
          .select("*")
          .eq("resident_id", resident.id)
          .neq("status", "healed");

        // Fetch appointments
        const { data: appointments } = await supabase
          .from("appointments")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("start_time", startOfDayUTC.toISOString())
          .lte("start_time", endOfDayUTC.toISOString());

        // Calculate counts
        const fallsFromFolders = (folders || []).filter(f => f.folder_type === 'fall').length;
        const incidentsFromFolders = (folders || []).filter(f => f.folder_type === 'incident').length;
        const fallsFromIncidents = (incidents || []).filter(inc => {
          if (inc.folder_id) return false;
          const types = inc.incident_types || [];
          return types.some((t: string) => t.toLowerCase() === 'fall' || t.toLowerCase() === 'falls');
        }).length;
        const nonFallIncidentsFromIncidents = (incidents || []).filter(inc => {
          if (inc.folder_id) return false;
          const types = inc.incident_types || [];
          return !types.some((t: string) => t.toLowerCase() === 'fall' || t.toLowerCase() === 'falls');
        }).length;

        // Get handover comment
        const { data: commentData } = await supabase
          .from("handover_comments")
          .select("*")
          .eq("resident_id", resident.id)
          .eq("date", dateString)
          .eq("shift", selectedShift)
          .maybeSingle();

        handoverDataMap[resident.id] = {
          residentId: resident.id,
          foodIntakeCount: foodLogs.length,
          foodIntakePercentage,
          totalFluid,
          incidentCount: incidentsFromFolders + nonFallIncidentsFromIncidents,
          fallCount: fallsFromFolders + fallsFromIncidents,
          woundCount: wounds?.length || 0,
          hospitalTransferCount: transfers?.length || 0,
          appointmentCount: appointments?.length || 0,
          appointments: appointments || [],
          dietInfo,
          handoverComment: commentData?.comment || "",
        };
        console.log(`[Handover] Completed resident ${i + 1}/${residents.length}`);
      }

      console.log("[Handover] All resident data collected. Total residents:", Object.keys(handoverDataMap).length);

      // Generate PDF
      console.log("[Handover] Calling generateHandoverPDF with:", {
        teamName: activeTeam.name,
        residents: residents.length,
        handoverDataKeys: Object.keys(handoverDataMap).length,
        shift: selectedShift,
        shiftTimes,
      });

      await generateHandoverPDF({
        teamName: activeTeam.name,
        date: selectedDate,
        shift: selectedShift,
        shiftTimes,
        inCharge,
        hospital,
        vacant,
        residents,
        handoverData: handoverDataMap,
        orgLogoUrl: currentUser?.organization_logo_url,
        careHomeName: activeTeam.name,
      });

      console.log("[Handover] PDF generation completed successfully!");
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("[Handover] Error generating PDF:", error);
      if (error instanceof Error) {
        console.error("[Handover] Error message:", error.message);
        console.error("[Handover] Error stack:", error.stack);
      }
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

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

      const UK_TIMEZONE = "Europe/London";

      // Define shift boundaries exactly as in HandoverSheetView
      const getShiftBoundaries = (date: Date, shift: "day" | "night") => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = format(nextDay, 'yyyy-MM-dd');
        
        let shiftStartUTC, shiftEndUTC;
        if (shift === "day") {
          shiftStartUTC = fromZonedTime(`${dateStr}T08:00:00`, UK_TIMEZONE);
          shiftEndUTC = fromZonedTime(`${dateStr}T20:00:00`, UK_TIMEZONE);
        } else {
          shiftStartUTC = fromZonedTime(`${dateStr}T20:00:00`, UK_TIMEZONE);
          shiftEndUTC = fromZonedTime(`${nextDayStr}T08:00:00`, UK_TIMEZONE);
        }
        return { shiftStartUTC, shiftEndUTC };
      };

      const { shiftStartUTC, shiftEndUTC } = getShiftBoundaries(selectedDate, selectedShift);
      
      const getFullDayBoundaries = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return { 
          startOfDayUTC: fromZonedTime(`${dateStr}T00:00:00`, UK_TIMEZONE),
          endOfDayUTC: fromZonedTime(`${dateStr}T23:59:59`, UK_TIMEZONE)
        };
      };
      const { startOfDayUTC, endOfDayUTC } = getFullDayBoundaries(selectedDate);

      // Fetch handover data for each resident
      const residentHandoversPromises = residents.map(async (resident) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const fluidTypes = ["Water", "Tea", "Coffee", "Juice", "Milk"];

        // Fetch food/fluid logs for selected date (Full 24-hr day)
        const { data: logs } = await supabase
          .from("food_fluid_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("timestamp", startOfDayUTC.toISOString())
          .lte("timestamp", endOfDayUTC.toISOString())
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
        const { data: incidents, error: incidentsError } = await supabase
          .from("incidents")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("created_at", shiftStartUTC.toISOString())
          .lt("created_at", shiftEndUTC.toISOString());
          
        if (incidentsError) console.error(`Error fetching incidents for ${resident.id}:`, incidentsError);

        // Fetch incident folders for selected date
        const { data: folders, error: foldersError } = await supabase
          .from("incident_folders")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("created_at", shiftStartUTC.toISOString())
          .lt("created_at", shiftEndUTC.toISOString());

        if (foldersError) console.error(`Error fetching folders for ${resident.id}:`, foldersError);

        // Fetch hospital transfers for selected date
        const { data: transfers, error: transfersError } = await supabase
          .from("hospital_transfer_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("created_at", shiftStartUTC.toISOString())
          .lt("created_at", shiftEndUTC.toISOString());

        if (transfersError) console.error(`Error fetching transfers for ${resident.id}:`, transfersError);

        // Fetch active wounds
        const { data: wounds } = await supabase
          .from("wounds")
          .select("*")
          .eq("resident_id", resident.id)
          .neq("status", "healed");

        // Fetch appointments for the selected date
        const { data: appointments } = await supabase
          .from("appointments")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("start_time", startOfDayUTC.toISOString())
          .lte("start_time", endOfDayUTC.toISOString());

        // Calculate counts from folders and loose incidents
        const fallsFromFolders = (folders || []).filter(f => f.folder_type === 'fall').length;
        const incidentsFromFolders = (folders || []).filter(f => f.folder_type === 'incident').length;

        // Differentiate Incidents vs Falls from the incidents table
        const fallsFromIncidents = (incidents || []).filter(inc => {
          if (inc.folder_id) return false;
          const types = inc.incident_types || [];
          return types.some((t: string) => t.toLowerCase() === 'fall' || t.toLowerCase() === 'falls');
        }).length;
        const nonFallIncidentsFromIncidents = (incidents || []).filter(inc => {
          if (inc.folder_id) return false;
          const types = inc.incident_types || [];
          return !types.some((t: string) => t.toLowerCase() === 'fall' || t.toLowerCase() === 'falls');
        }).length;

        const incidentCount = incidentsFromFolders + nonFallIncidentsFromIncidents;
        const fallCount = fallsFromFolders + fallsFromIncidents;
        const hospitalTransferCount = transfers?.length || 0;

        if (incidentCount > 0 || fallCount > 0 || hospitalTransferCount > 0) {
          console.log(`[Handover Archive] Resident ${resident.id} (${resident.first_name}): Incidents=${incidentCount}, Falls=${fallCount}, Hospital=${hospitalTransferCount}`);
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
          incidentCount,
          fallCount,
          woundCount: wounds?.length || 0,
          hospitalTransferCount,
          appointmentCount: appointments?.length || 0,
          appointments: appointments || [],
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
      // We delete by resident_ids because the handover_comments table doesn't have team_id
      const residentIds = residents.map(r => r.id);
      await supabase
        .from("handover_comments")
        .delete()
        .in("resident_id", residentIds)
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
    <div className="flex flex-col min-h-full w-full bg-muted/10">
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Header Card */}
          <Card className="bg-background rounded-xl shadow-sm print:hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-semibold">Handover Sheet</h1>
                  <Badge variant="table" className="bg-purple-50 text-purple-700 border-purple-200 rounded-md">
                    {format(new Date(), "EEEE, d MMMM yyyy")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard/handover/documents")}
                    className="h-9 rounded-lg"
                  >
                    All Handovers
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    disabled={isLoadingResidents || residents.length === 0}
                    className="h-9 rounded-lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsDialogOpen(true)}
                    disabled={isLoadingResidents || residents.length === 0}
                    className="h-9 rounded-lg"
                  >
                    Save as Archive
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Handover Sheet View Card */}
          <Card className="bg-background rounded-xl shadow-sm">
            <CardContent className="p-0">
              {isLoadingResidents ? (
                <div className="flex items-center justify-center py-24">
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
                  onPrint={handleDownloadPDF}
                />
              )}
            </CardContent>
          </Card>
        </div>
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
