"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type CareHomeDetails = {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string | null;
};

export default function CareHomePage() {
  const { profile, isLoading: isProfileLoading, refresh: refreshProfile } = useProfile();
  const { supabase } = useSupabase();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [careHome, setCareHome] = useState<CareHomeDetails | null>(null);
  const [name, setName] = useState("");
  const [membersCount, setMembersCount] = useState(0);
  const [teamsCount, setTeamsCount] = useState(0);
  const [residentsCount, setResidentsCount] = useState(0);

  const activeCareHomeId = profile?.active_care_home_id;
  const isOwner = profile?.role === "owner";

  useEffect(() => {
    async function fetchCareHomeDetails() {
      if (!activeCareHomeId) {
        setCareHome(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data: careHomeData, error: careHomeError } = await supabase
          .from("care_homes")
          .select("id, name, organization_id, created_at")
          .eq("id", activeCareHomeId)
          .single();

        if (careHomeError) {
          throw careHomeError;
        }

        const details: CareHomeDetails = {
          id: careHomeData.id,
          name: careHomeData.name,
          organizationId: careHomeData.organization_id,
          createdAt: careHomeData.created_at ?? null
        };

        setCareHome(details);
        setName(details.name);

        const [{ count: members }, { count: teams }, { count: residents }] = await Promise.all([
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("active_care_home_id", activeCareHomeId),
          supabase
            .from("teams")
            .select("id", { count: "exact", head: true })
            .eq("care_home_id", activeCareHomeId),
          supabase
            .from("residents")
            .select("id", { count: "exact", head: true })
            .eq("care_home_id", activeCareHomeId)
        ]);

        setMembersCount(members ?? 0);
        setTeamsCount(teams ?? 0);
        setResidentsCount(residents ?? 0);
      } catch (error) {
        console.error("Failed to fetch care home details:", error);
        toast.error("Failed to load care home details");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCareHomeDetails();
  }, [activeCareHomeId, supabase]);

  const handleSave = async () => {
    if (!isOwner || !careHome) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Care home name is required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("care_homes")
        .update({ name: trimmedName })
        .eq("id", careHome.id);

      if (error) {
        throw error;
      }

      setCareHome((prev) => (prev ? { ...prev, name: trimmedName } : prev));
      await refreshProfile();
      toast.success("Care home updated successfully");
    } catch (error) {
      console.error("Failed to update care home:", error);
      toast.error("Failed to update care home");
    } finally {
      setIsSaving(false);
    }
  };

  if (isProfileLoading || isLoading) {
    return <div className="text-sm text-muted-foreground">Loading care home details...</div>;
  }

  if (!activeCareHomeId || !careHome) {
    return (
      <div className="flex flex-col justify-start items-start gap-3">
        <h1 className="font-semibold text-xl">Care Home</h1>
        <p className="text-sm text-muted-foreground">No active care home selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-xl">Care Home</h1>
        <p className="text-sm text-muted-foreground">
          View and manage details for your active care home.
        </p>
        {!isOwner && (
          <p className="text-sm text-muted-foreground">
            Only owners can edit care home details.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="care-home-name">
              Care home name
            </label>
            <Input
              id="care-home-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!isOwner || isSaving}
              placeholder="Enter care home name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Care home ID</p>
              <p className="font-mono break-all">{careHome.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p>{careHome.createdAt ? new Date(careHome.createdAt).toLocaleDateString() : "Unknown"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Members</p>
              <p>{membersCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Teams</p>
              <p>{teamsCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Residents</p>
              <p>{residentsCount}</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={!isOwner || isSaving || name.trim().length === 0}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
