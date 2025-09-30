"use client";

import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery, useMutation, useConvex } from "convex/react";
import { useRouter } from "next/navigation";
import { Resident } from "@/types";
import { Button } from "@/components/ui/button";
import { columns } from "./columns";
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

export default function HandoverPage() {
  const router = useRouter();
  const convex = useConvex();
  const { activeTeamId, activeTeam } = useActiveTeam();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as Resident[] | undefined;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<"day" | "night">("day");
  const [isSaving, setIsSaving] = useState(false);

  const saveHandoverReport = useMutation(api.handoverReports.saveHandoverReport);
  const currentUser = useQuery(api.auth.getCurrentUser);

  const handleSaveHandover = async () => {
    if (!activeTeamId || !activeTeam || !residents || !currentUser) {
      toast.error("Missing required information");
      return;
    }

    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch handover data for each resident
      const residentHandoversPromises = residents.map(async (resident) => {
        // Fetch the handover report for this resident
        const report = await convex.query(api.handover.getHandoverReport, {
          residentId: resident._id as Id<"residents">
        });

        // Get comments from the textarea (if available from DOM)
        const commentTextarea = document.querySelector(
          `textarea[data-resident-id="${resident._id}"]`
        ) as HTMLTextAreaElement;
        const comments = commentTextarea?.value || "";

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
        date: today,
        shift: selectedShift,
        teamId: activeTeamId,
        teamName: activeTeam.name,
        organizationId: currentUser.organizationId || "",
        residentHandovers,
        createdBy: currentUser.userId,
        createdByName: currentUser.name || "Unknown",
      });

      // Clear localStorage comments after successful save
      residents.forEach((resident) => {
        const storageKey = `handover-comment-${today}-${resident._id}`;
        localStorage.removeItem(storageKey);
      });

      toast.success("Handover saved successfully!");
      setIsDialogOpen(false);

      // Optionally navigate to documents page
      router.push("/dashboard/handover/documents");
    } catch (error) {
      console.error("Error saving handover:", error);
      toast.error("Failed to save handover");
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
        columns={columns}
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
            <div className="text-sm text-muted-foreground">
              <p>This will save handover data for {residents?.length || 0} residents.</p>
              <p className="mt-1">Date: {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}</p>
            </div>
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