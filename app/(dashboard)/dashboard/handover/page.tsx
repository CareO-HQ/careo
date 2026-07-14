"use client";

import { useActiveTeam } from "@/hooks/use-active-team";
import { useRouter } from "next/navigation";
import { Resident } from "@/types";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { CalendarIcon, FileText, MessageSquare, Users, Download } from "lucide-react";
import { getCurrentShift, getShiftTimeRange } from "@/lib/config/shift-config";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { generateHandoverPDF } from "@/lib/handover-pdf-utils";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAllResidentsHandoverData } from "@/lib/handover-data";
import { fetchHandoverMetaStats } from "@/lib/handover-meta";

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
  const [commentsSummary, setCommentsSummary] = useState<{
    total: number;
    withComments: number;
    withoutComments: number;
  } | null>(null);
  const [inCharge, setInCharge] = useState("");

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

      const sortedResidents = ((data as Resident[]) || []).sort((a, b) => {
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

  useEffect(() => {
    const handleUpdate = () => fetchResidents();
    window.addEventListener("residents-updated", handleUpdate);
    return () => window.removeEventListener("residents-updated", handleUpdate);
  }, [fetchResidents]);

  const loadCommentsSummary = async () => {
    if (!activeTeamId || !residents || !supabase) return;

    const dateString = format(selectedDate, "yyyy-MM-dd");

    try {
      const { data: commentsData, error } = await supabase
        .from("handover_comments")
        .select(`*, residents!inner(team_id)`)
        .eq("residents.team_id", activeTeamId)
        .eq("date", dateString)
        .eq("shift", selectedShift);

      if (error) throw error;

      const withComments =
        commentsData?.filter((c) => c.comment && c.comment.trim().length > 0).length || 0;
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

  useEffect(() => {
    if (isDialogOpen) {
      loadCommentsSummary();
    }
  }, [isDialogOpen, selectedDate, selectedShift, activeTeamId, residents.length]);

  const handleDownloadPDF = async () => {
    if (!activeTeamId || !activeTeam || !residents.length || !currentUser || !supabase) {
      toast.error("Missing required information");
      return;
    }

    toast.info("Generating PDF…");
    try {
      const dateString = format(selectedDate, "yyyy-MM-dd");
      const shiftTimes = getShiftTimeRange(selectedShift);

      const handoverDataMap = await fetchAllResidentsHandoverData(
        supabase,
        residents,
        selectedDate,
        selectedShift
      );

      const metaStats = await fetchHandoverMetaStats(
        supabase,
        activeTeamId,
        residents,
        selectedDate,
        selectedShift,
        handoverDataMap
      );

      const commentResults = await Promise.all(
        residents.map(async (resident) => {
          const { data } = await supabase
            .from("handover_comments")
            .select("comment")
            .eq("resident_id", resident.id)
            .eq("date", dateString)
            .eq("shift", selectedShift)
            .maybeSingle();
          return { residentId: resident.id, comment: data?.comment || "" };
        })
      );

      const pdfHandoverData = Object.fromEntries(
        Object.entries(handoverDataMap).map(([id, data]) => [
          id,
          {
            ...data,
            handoverComment:
              commentResults.find((c) => c.residentId === id)?.comment || "",
          },
        ])
      );

      await generateHandoverPDF({
        teamName: activeTeam.name,
        date: selectedDate,
        shift: selectedShift,
        shiftTimes,
        inCharge,
        totalBeds: metaStats.totalBeds,
        vacantBeds: metaStats.vacantBeds,
        hospitalAdmissions: metaStats.hospitalAdmissions,
        residents,
        handoverData: pdfHandoverData,
        orgLogoUrl: currentUser?.organization_logo_url || undefined,
        careHomeName: activeTeam.name,
      });

      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("[Handover] Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handleSaveHandover = async () => {
    if (!activeTeamId || !activeTeam || !residents.length || !currentUser || !supabase) {
      toast.error("Missing required information");
      return;
    }

    setIsSaving(true);
    try {
      const dateString = format(selectedDate, "yyyy-MM-dd");

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
        await supabase.from("handover_reports").delete().eq("id", existingHandover.id);
      }

      toast.info("Finalizing comments…");
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const handoverDataMap = await fetchAllResidentsHandoverData(
        supabase,
        residents,
        selectedDate,
        selectedShift
      );

      const metaStats = await fetchHandoverMetaStats(
        supabase,
        activeTeamId,
        residents,
        selectedDate,
        selectedShift,
        handoverDataMap
      );

      const residentHandovers = await Promise.all(
        residents.map(async (resident) => {
          const data = handoverDataMap[resident.id];
          const { data: commentData } = await supabase
            .from("handover_comments")
            .select("comment")
            .eq("resident_id", resident.id)
            .eq("date", dateString)
            .eq("shift", selectedShift)
            .maybeSingle();

          return {
            residentId: resident.id,
            residentName: `${resident.first_name} ${resident.last_name}`,
            roomNumber: resident.room_number,
            age: getAge(resident.date_of_birth),
            foodIntakeCount: data?.foodIntakeCount ?? 0,
            foodIntakePercentage: data?.foodIntakePercentage ?? 0,
            totalFluid: data?.totalFluid ?? 0,
            continenceCount: data?.continenceCount ?? 0,
            medicationPercentage: data?.medicationPercentage ?? 0,
            medicationTotal: data?.medicationTotal ?? 0,
            medicationTaken: data?.medicationTaken ?? 0,
            incidentCount: data?.incidentCount ?? 0,
            fallCount: data?.fallCount ?? 0,
            woundCount: data?.woundCount ?? 0,
            hospitalTransferCount: data?.hospitalTransferCount ?? 0,
            appointmentCount: data?.appointmentCount ?? 0,
            appointments: data?.appointments ?? [],
            comments: commentData?.comment || "",
          };
        })
      );

      const handoverData = {
        teamName: activeTeam.name,
        organizationId: currentUser.active_organization_id || "",
        residentHandovers,
        createdByName: currentUser.name || "Unknown",
        updatedByName: currentUser.name || "Unknown",
        inCharge,
        totalBeds: metaStats.totalBeds,
        vacantBeds: metaStats.vacantBeds,
        hospitalAdmissions: metaStats.hospitalAdmissions,
      };

      const { error: insertError } = await supabase.from("handover_reports").insert({
        date: dateString,
        shift: selectedShift,
        team_id: activeTeamId,
        organization_id: currentUser.active_organization_id,
        handover_data: handoverData,
        created_by: currentUser.id,
      });

      if (insertError) throw insertError;

      const residentIds = residents.map((r) => r.id);
      await supabase
        .from("handover_comments")
        .delete()
        .in("resident_id", residentIds)
        .eq("date", dateString)
        .eq("shift", selectedShift);

      toast.success("Handover saved successfully!");
      setIsDialogOpen(false);
      router.push("/dashboard/handover/documents");
    } catch (error) {
      console.error("Error saving handover:", error);
      toast.error("Failed to save handover. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-screen">Loading profile…</div>
    );
  }

  const topBarActions = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/dashboard/handover/documents")}
        className="h-8 rounded-md text-xs"
      >
        All Handovers
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadPDF}
        disabled={isLoadingResidents || residents.length === 0}
        className="h-8 rounded-md text-xs gap-1.5"
      >
        <Download className="w-3.5 h-3.5" />
        PDF
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        disabled={isLoadingResidents || residents.length === 0}
        className="h-8 rounded-md text-xs bg-green-600 hover:bg-green-700"
      >
        Save Handover
      </Button>
    </>
  );

  return (
    <div className="flex flex-col min-h-full w-full bg-muted/10">
      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-6rem)]">
          <Card className="bg-background rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              {isLoadingResidents ? (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="mt-2 text-muted-foreground">Loading residents…</p>
                  </div>
                </div>
              ) : (
                <HandoverSheetView
                  residents={residents}
                  teamId={activeTeamId ?? ""}
                  teamName={activeTeam?.name ?? "Unit"}
                  currentUserId={currentUser?.id}
                  currentUserName={currentUser?.name || "Unknown"}
                  organizationId={currentUser?.active_organization_id || undefined}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  selectedShift={selectedShift}
                  setSelectedShift={setSelectedShift}
                  inCharge={inCharge}
                  setInCharge={setInCharge}
                  onPrint={handleDownloadPDF}
                  renderTopBarActions={topBarActions}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Handover Report</DialogTitle>
            <DialogDescription>
              This will archive the current handover data for the selected shift.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Handover Date</Label>
              <div className="flex items-center gap-2 h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm shadow-sm cursor-not-allowed">
                <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="font-medium">{format(selectedDate, "PPP")}</span>
              </div>
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
                      <div className="text-2xl font-bold text-green-600">
                        {commentsSummary.withComments}
                      </div>
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveHandover} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Handover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
