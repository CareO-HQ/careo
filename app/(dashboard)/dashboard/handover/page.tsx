"use client";

import { useActiveTeam } from "@/hooks/use-active-team";
import { useRouter } from "next/navigation";
import { Resident } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getColumns } from "./columns";
import { DataTable } from "./data-table";
import { toast } from "sonner";
import { useState, useEffect } from "react";
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
import { residentService } from "@/lib/resident-service";
import { handoverService } from "@/lib/handover-service";
import { useProfile } from "@/hooks/use-profile";

export default function HandoverPage() {
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [isResidentsLoading, setIsResidentsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<"day" | "night">(getCurrentShift());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [commentsSummary, setCommentsSummary] = useState<{ total: number; withComments: number; withoutComments: number } | null>(null);

  const activeTeamId = profile?.active_team_id;
  const activeTeamName = profile?.active_team_name;
  const organizationId = profile?.active_organization_id;

  // Fetch residents
  useEffect(() => {
    async function fetchResidents() {
      if (!activeTeamId) return;
      setIsResidentsLoading(true);
      try {
        const data = await residentService.getResidentsByTeamId(activeTeamId);
        setResidents(data as any);
      } catch (error) {
        console.error("Failed to fetch residents:", error);
        toast.error("Failed to fetch residents");
      } finally {
        setIsResidentsLoading(false);
      }
    }
    fetchResidents();
  }, [activeTeamId]);

  // Load comments summary when dialog opens
  const loadCommentsSummary = async () => {
    if (!activeTeamId || residents.length === 0) return;

    const dateString = selectedDate.toISOString().split('T')[0];

    try {
      const commentsData = await handoverService.getCommentsByTeamDateShift(
        activeTeamId,
        dateString,
        selectedShift
      );

      const withComments = commentsData?.filter(c => c.comment.trim().length > 0).length || 0;
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
    if (!activeTeamId || !organizationId || residents.length === 0 || !profile) {
      toast.error("Missing required information");
      return;
    }

    setIsSaving(true);
    try {
      const dateString = selectedDate.toISOString().split('T')[0];

      // Wait for any pending auto-saves to complete (2s debounce + 0.5s buffer)
      toast.info("Finalizing comments...");
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Fetch handover data for each resident
      const residentHandoversPromises = residents.map(async (resident) => {
        // Fetch the handover report stats for this resident
        const stats = await handoverService.getHandoverStats(resident.id);

        // Get comments from database
        const commentData = await handoverService.getComment(resident.id, dateString, selectedShift);
        const comments = commentData?.comment || "";

        return {
          residentId: resident.id,
          residentName: `${resident.firstName} ${resident.lastName}`,
          roomNumber: resident.roomNumber,
          age: getAge(resident.dateOfBirth || resident.date_of_birth),
          foodIntakeCount: stats.foodIntakeCount,
          foodIntakeLogs: stats.foodIntakeLogs,
          totalFluid: stats.totalFluid,
          fluidLogs: stats.fluidLogs,
          incidentCount: stats.incidentCount,
          incidents: stats.incidents,
          hospitalTransferCount: stats.hospitalTransferCount,
          hospitalTransfers: stats.hospitalTransfers,
          comments: comments,
        };
      });

      const residentHandovers = await Promise.all(residentHandoversPromises);

      await handoverService.saveHandoverReport({
        date: dateString,
        shift: selectedShift,
        teamId: activeTeamId,
        teamName: activeTeamName || "Unknown Team",
        organizationId: organizationId,
        residentHandovers: residentHandovers,
        createdBy: profile.id,
        createdByName: profile.name || "Unknown",
        updatedBy: profile.id,
        updatedByName: profile.name || "Unknown",
      });

      // Cleanup: Delete draft comments after successful archive
      await handoverService.deleteCommentsAfterArchive(activeTeamId, dateString, selectedShift);

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
            disabled={isResidentsLoading || residents.length === 0}
            className="h-8"
          >
            Save as Archive
          </Button>
        </div>
      </div>

      {/* Filters - matching careo-audit style */}
      <div className="flex items-center gap-2 border-b px-6 py-3">
        <Badge variant="outline" className="rounded-sm">
          {isResidentsLoading ? "Loading..." : `${residents.length} Residents`}
        </Badge>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <DataTable<Resident, unknown>
          columns={getColumns(
            activeTeamId ?? undefined,
            profile?.id,
            profile?.name || "Unknown",
            profile?.active_organization_id ?? undefined
          )}
          data={residents || []}
          teamName={activeTeamName ?? ""}
        />
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
