"use client";

import { Button } from "@/components/ui/button";
import { useActiveTeam } from "@/hooks/use-active-team";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login"); // redirect to login page
        }
      }
    });
  };
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { activeTeamId, activeTeam, isLoading } = useActiveTeam();
  console.log("ACTIVE TEAM ID", activeTeamId);
  console.log("ACTIVE TEAM", activeTeam);

  const handleSetActiveOrganization = async (organizationId: string) => {
    await authClient.organization.setActive({
      organizationId: organizationId
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Button onClick={handleLogout}>Log out</Button>
    </div>
  );
}
