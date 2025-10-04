"use client";

import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery, useMutation, useConvex } from "convex/react";
import { useRouter } from "next/navigation";
import { Resident } from "@/types";
import { Button } from "@/components/ui/button";
import { getColumns } from "./columns";
import { DataTable } from "./data-table";
import { toast } from "sonner";
import { useState } from "react";
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
import { Id } from "@/convex/_generated/dataModel";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, FileText, MessageSquare, Users } from "lucide-react";
import { useEffect } from "react";

export default function HandoverPage() {
  const router = useRouter();
  const convex = useConvex();
  const { activeTeamId, activeTeam } = useActiveTeam();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as Resident[] | undefined;

  // Auto-detect current shift based on time (7 AM - 7 PM = day, else night)
  const getCurrentShift = (): "day" | "night" => {
    const currentHour = new Date().getHours();
    return currentHour >= 7 && currentHour < 19 ? "day" : "night";
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<"day" | "night">(getCurrentShift());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [commentsSummary, setCommentsSummary] = useState<{ total: number; withComments: number; withoutComments: number } | null>(null);

  const saveHandoverReport = useMutation(api.handoverReports.saveHandoverReport);
  const currentUser = useQuery(api.auth.getCurrentUser);

  // Load comments summary when dialog opens
  const loadCommentsSummary = async () => {
    if (!activeTeamId || !residents) return;

    const dateString = selectedDate.toISOString().split('T')[0];

    try {
      const commentsData = await convex.query(api.handoverComments.getCommentsByTeamDateShift, {
        teamId: activeTeamId,
        date: dateString,
        shift: selectedShift,
      });

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
  }, [isDialogOpen, selectedDate, selectedShift]);

  const handleSaveHandover = async () => {
    if (!activeTeamId || !activeTeam || !residents || !currentUser) {
      toast.error("Missing required information");
      return;
    }

    setIsSaving(true);
    try {
      const dateString = selectedDate.toISOString().split('T')[0];

      // Check if handover already exists for this date/shift
      const existingHandover = await convex.query(api.handoverReports.getHandoverReport, {
        teamId: activeTeamId,
        date: dateString,
        shift: selectedShift,
      });

      if (existingHandover) {
        const confirmed = confirm(
          `A handover report already exists for ${format(selectedDate, "PPP")} - ${selectedShift} shift.\n\nDo you want to overwrite it?`
        );
        if (!confirmed) {
          setIsSaving(false);
          return;
        }
      }

      // Wait for any pending auto-saves to complete (2s debounce + 0.5s buffer)
      toast.info("Finalizing comments...");
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Fetch handover data for each resident
      const residentHandoversPromises = residents.map(async (resident) => {
        // Fetch the handover report for this resident
        const report = await convex.query(api.handover.getHandoverReport, {
          residentId: resident._id as Id<"residents">
        });

        // Get comments from database instead of DOM
        const commentData = await convex.query(api.handoverComments.getComment, {
          teamId: activeTeamId,
          residentId: resident._id as Id<"residents">,
          date: dateString,
          shift: selectedShift,
        });
        const comments = commentData?.comment || "";

        return {
          residentId: resident._id,
          residentName: `${resident.firstName} ${resident.lastName}`,
          roomNumber: resident.roomNumber,
          age: getAge(resident.dateOfBirth),
          foodIntakeCount: report?.foodIntakeCount || 0,
          totalFluid: report?.totalFluid || 0,
          incidentCount: report?.incidentCount || 0,
          hospitalTransferCount: report?.hospitalTransferCount || 0,
          comments: comments,
        };
      });

      const residentHandovers = await Promise.all(residentHandoversPromises);

      await saveHandoverReport({
        date: dateString,
        shift: selectedShift,
        teamId: activeTeamId,
        teamName: activeTeam.name,
        organizationId: currentUser.organizationId || "",
        residentHandovers,
        createdBy: currentUser.userId,
        createdByName: currentUser.name || "Unknown",
        updatedBy: currentUser.userId,
        updatedByName: currentUser.name || "Unknown",
      });

      // Cleanup: Delete draft comments after successful archive
      await convex.mutation(api.handoverComments.deleteCommentsAfterArchive, {
        teamId: activeTeamId,
        date: dateString,
        shift: selectedShift,
      });

      toast.success("Handover saved successfully!");
      setIsDialogOpen(false);

      // Optionally navigate to documents page
      router.push("/dashboard/handover/documents");
    } catch (error) {
      console.error("Error saving handover:", error);

      // Provide specific error message based on error type
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          toast.error("Network error: Please check your connection and try again.");
        } else if (error.message.includes("permission") || error.message.includes("auth")) {
          toast.error("Permission denied: You may not have access to save handovers.");
        } else {
          toast.error(`Failed to save handover: ${error.message}`);
        }
      } else {
        toast.error("Failed to save handover. Please try again or contact support.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Handover Sheet</h1>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/handover/documents")}
        >
          All Handovers
        </Button>
      </div>
      <DataTable<Resident, unknown>
        columns={getColumns(
          activeTeamId ?? undefined,
          currentUser?.userId,
          currentUser?.name || "Unknown"
        )}
        data={residents || []}
        teamName={activeTeam?.name ?? ""}
      />
      <div className="flex justify-end pb-6">
        <Button
          variant="default"
          size="lg"
          onClick={() => setIsDialogOpen(true)}
          disabled={!residents || residents.length === 0}
        >
          Save as Archive
        </Button>
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