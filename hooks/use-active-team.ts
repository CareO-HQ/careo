import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useActiveTeam() {
  const currentUser = useQuery(api.auth.getCurrentUser);

  // Get organizationId from activeOrganizationId OR from activeTeam.organizationId
  const organizationId =
    currentUser?.activeOrganizationId ||
    currentUser?.activeTeam?.organizationId ||
    null;

  return {
    activeTeamId: currentUser?.activeTeamId || null,
    activeTeam: currentUser?.activeTeam || null,
    activeOrganizationId: organizationId,
    activeOrganization: currentUser?.activeOrganization || null,
    isLoading: currentUser === undefined
  };
}
