import { useProfile } from "./use-profile";

export function useActiveTeam() {
  const { profile, isLoading } = useProfile();

  // Get organizationId from active_organization_id
  const organizationId = profile?.active_organization_id || null;

  return {
    activeTeamId: profile?.active_unit_id || null,
    activeTeam: profile?.active_unit_name ? { name: profile.active_unit_name } : null,
    activeOrganizationId: organizationId,
    activeOrganization: profile?.organization_name ? { name: profile.organization_name } : null,
    role: profile?.role || null,
    isLoading
  };
}
