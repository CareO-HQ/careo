import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useActiveTeam() {
  const currentUser = useQuery(api.auth.getCurrentUser);

  return {
    activeTeamId: currentUser?.activeTeamId || null,
    activeTeam: currentUser?.activeTeam || null,
    isLoading: currentUser === undefined
  };
}
