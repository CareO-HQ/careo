"use client";

import { useActiveTeam } from "@/hooks/use-active-team";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getResidentsColumns } from "./columns";
import { DataTable } from "./data-table";
import { Resident } from "@/types";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { fetchHandoverTransferStates, HandoverTransferState } from "@/lib/handover-hospital-transfer";
import { getCurrentShift } from "@/lib/config/shift-config";

export default function ResidentsPage() {
  const { activeTeamId, activeTeam, activeOrganizationId, activeOrganization, activeCareHomeId } = useActiveTeam();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { supabase, isLoading: isSupabaseLoading } = useSupabase();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [transferStates, setTransferStates] = useState<Record<string, HandoverTransferState>>({});
  const [isLoading, setIsLoading] = useState(true);

  const selectedDate = useMemo(() => new Date(), []);
  const selectedShift = getCurrentShift();

  const contextLoading = isProfileLoading || isSupabaseLoading;

  const fetchTransferStates = useCallback(async (residentList: Resident[]) => {
    if (!supabase || residentList.length === 0) {
      setTransferStates({});
      return;
    }

    const states = await fetchHandoverTransferStates(
      supabase,
      residentList.map((resident) => resident.id),
      selectedDate,
      selectedShift
    );
    setTransferStates(states);
  }, [supabase, selectedDate, selectedShift]);

  const fetchResidents = useCallback(async () => {
    if (contextLoading) return;

    setIsLoading(true);
    try {
      let query = supabase.from("residents").select("*");

      // Multi-tenant filtering hierarchy:
      // 1. If team is selected, filter by team_id (most specific)
      // 2. If care home is selected, filter by care_home_id (care home isolation)
      // 3. Otherwise, filter by organization_id (fallback)
      if (activeTeamId) {
        query = query.eq("team_id", activeTeamId);
      } else if (activeCareHomeId) {
        query = query.eq("care_home_id", activeCareHomeId);
      } else if (activeOrganizationId) {
        query = query.eq("organization_id", activeOrganizationId);
      } else {
        setResidents([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      const nextResidents = (data as Resident[]) || [];
      setResidents(nextResidents);
      await fetchTransferStates(nextResidents);
    } catch (error: any) {
      console.error("Error fetching residents:", error);
      // toast.error("Failed to load residents");
    } finally {
      setIsLoading(false);
    }
  }, [activeTeamId, activeCareHomeId, activeOrganizationId, contextLoading, supabase, fetchTransferStates]);

  const handleTransferChanged = useCallback(async () => {
    await fetchTransferStates(residents);
  }, [fetchTransferStates, residents]);

  const tableColumns = useMemo(
    () =>
      getResidentsColumns({
        transferStates,
        onTransferChanged: handleTransferChanged,
        organizationId: profile?.active_organization_id || undefined,
        currentUserId: profile?.id,
        selectedDate,
        selectedShift,
      }),
    [
      transferStates,
      handleTransferChanged,
      profile?.active_organization_id,
      profile?.id,
      selectedDate,
      selectedShift,
    ]
  );

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  // Set up real-time subscription for residents
  useEffect(() => {
    if (contextLoading || (!activeTeamId && !activeCareHomeId && !activeOrganizationId)) return;

    // Determine filter for real-time subscription (same hierarchy as query)
    let filterValue: string;
    let filterField: string;
    if (activeTeamId) {
      filterField = "team_id";
      filterValue = activeTeamId;
    } else if (activeCareHomeId) {
      filterField = "care_home_id";
      filterValue = activeCareHomeId;
    } else {
      filterField = "organization_id";
      filterValue = activeOrganizationId!;
    }

    const channel = supabase
      .channel("residents-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "residents",
          filter: `${filterField}=eq.${filterValue}`,
        },
        (payload) => {
          // Refetch residents when any change occurs (INSERT, UPDATE, DELETE)
          fetchResidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeamId, activeCareHomeId, activeOrganizationId, contextLoading, supabase, fetchResidents]);

  // Listen for custom 'residents-updated' event (from sidebar creation dialog)
  useEffect(() => {
    const handleUpdate = () => {
      fetchResidents();
    };

    window.addEventListener("residents-updated", handleUpdate);
    return () => {
      window.removeEventListener("residents-updated", handleUpdate);
    };
  }, [fetchResidents]);

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
          columns={tableColumns}
          data={residents || []}
          teamName={displayName}
          activeTeamId={activeTeamId}
        />
      )}
    </div>
  );
}
