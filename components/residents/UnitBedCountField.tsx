"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { canInviteMembers, type UserRole } from "@/lib/permissions";
import { getTeamCapacity } from "@/lib/team-capacity";
import { toast } from "sonner";

interface UnitBedCountFieldProps {
  teamId: string | null;
}

export function UnitBedCountField({ teamId }: UnitBedCountFieldProps) {
  const { supabase } = useSupabase();
  const { profile } = useProfile();
  const [bedCountInput, setBedCountInput] = useState("");
  const [savedBedCount, setSavedBedCount] = useState<number | null>(null);
  const [residentCount, setResidentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();

  const isSaasAdmin = profile?.is_saas_admin === true;
  const userRole = (isSaasAdmin ? "saas_admin" : profile?.role) as UserRole | undefined;
  const canEdit = userRole ? canInviteMembers(userRole) : false;

  const fetchCapacity = useCallback(async () => {
    if (!teamId) return;

    setIsLoading(true);
    try {
      const capacity = await getTeamCapacity(supabase, teamId);
      if (capacity) {
        setSavedBedCount(capacity.bedCount);
        setBedCountInput(capacity.bedCount?.toString() ?? "");
        setResidentCount(capacity.residentCount);
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabase, teamId]);

  useEffect(() => {
    if (!teamId) {
      setSavedBedCount(null);
      setBedCountInput("");
      setResidentCount(0);
      return;
    }

    fetchCapacity();
  }, [teamId, fetchCapacity]);

  useEffect(() => {
    const handleResidentsUpdated = () => {
      fetchCapacity();
    };

    window.addEventListener("residents-updated", handleResidentsUpdated);
    return () => {
      window.removeEventListener("residents-updated", handleResidentsUpdated);
    };
  }, [fetchCapacity]);

  const handleSave = () => {
    if (!teamId || !canEdit) return;

    const trimmed = bedCountInput.trim();
    let bedCount: number | null = null;

    if (trimmed !== "") {
      const parsed = Number.parseInt(trimmed, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        toast.error("Enter a positive whole number for beds, or leave empty to clear.");
        return;
      }
      bedCount = parsed;
    }

    startSaveTransition(async () => {
      const { error } = await supabase
        .from("teams")
        .update({ bed_count: bedCount })
        .eq("id", teamId);

      if (error) {
        toast.error("Failed to save bed count");
        console.error("Error saving bed count:", error);
        return;
      }

      setSavedBedCount(bedCount);
      toast.success("Bed count saved");
    });
  };

  if (!teamId) {
    return null;
  }

  const hasUnsavedChanges =
    bedCountInput.trim() !== (savedBedCount?.toString() ?? "");

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground whitespace-nowrap">Number of beds:</span>
      <Input
        type="number"
        min={1}
        placeholder="—"
        value={bedCountInput}
        onChange={(e) => setBedCountInput(e.target.value)}
        disabled={!canEdit || isLoading || isSaving}
        className="w-20 h-8"
      />
      {canEdit && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isLoading || isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      )}
      {savedBedCount != null && (
        <span className="text-muted-foreground whitespace-nowrap">
          · {residentCount} / {savedBedCount} occupied
        </span>
      )}
    </div>
  );
}
