"use client";

import { useActiveTeam } from "@/hooks/use-active-team";
import { useEffect, useState } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { Resident } from "@/types";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

export default function ResidentsPage() {
  const { activeTeamId, activeTeam, activeOrganizationId, activeOrganization } = useActiveTeam();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { supabase, isLoading: isSupabaseLoading } = useSupabase();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const contextLoading = isProfileLoading || isSupabaseLoading;

  useEffect(() => {
    if (contextLoading) return;

    async function fetchResidents() {
      setIsLoading(true);
      try {
        let query = supabase.from("residents").select("*");

        if (activeTeamId) {
          query = query.eq("team_id", activeTeamId);
        } else if (activeOrganizationId) {
          query = query.eq("organization_id", activeOrganizationId);
        } else {
          setResidents([]);
          setIsLoading(false);
          return;
        }

        const { data, error } = await query;
        if (error) throw error;
        setResidents(data as Resident[]);
      } catch (error: any) {
        console.error("Error fetching residents:", error);
        // toast.error("Failed to load residents");
      } finally {
        setIsLoading(false);
      }
    }

    fetchResidents();
  }, [activeTeamId, activeOrganizationId, contextLoading, supabase]);

  // Determine display name for header
  const displayName = activeTeamId
    ? activeTeam?.name || 'selected unit'
    : activeOrganizationId
      ? `All units in ${activeOrganization?.name || 'care home'}`
      : '';

  return (
    <div className="container mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Residents</h1>
      </div>
      {isLoading || contextLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading residents...</span>
        </div>
      ) : (
        <DataTable<Resident, unknown>
          columns={columns}
          data={residents || []}
          teamName={displayName}
        />
      )}
    </div>
  );
}
