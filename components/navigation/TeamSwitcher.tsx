"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BuildingIcon,
  ChevronDown,
  PlusIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Id } from "@/convex/_generated/dataModel";
import CreateTeamModal from "../team/CreateTeamModal";
import { useTransition } from "react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { toast } from "sonner";
import CreateOrgModal from "../organization/CreateOrgModal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import OrganizationItem from "./OrganizationItem";
import { config } from "@/config";

export function TeamSwitcher({
  orgName,
  isPending,
  email
}: {
  orgName: string;
  isPending: boolean;
  email: string;
}) {
  const router = useRouter();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: activeMember } = authClient.useActiveMember();
  const isOwner = activeMember?.role === "owner";
  const userRole = activeMember?.role as string | undefined;
  
  // Get care homes from careHomes table instead of organizations
  const careHomes = useQuery(
    api.rbac.careHomes.getCareHomes,
    activeOrganization?.id ? { organizationId: activeOrganization.id } : "skip"
  );
  
  // Get current user to check active care home
  const currentUser = useQuery(api.users.getCurrentUserContext);
  const activeCareHomeId = currentUser?.user?.activeCareHomeId;

  const canViewProfileAndOrg = userRole !== "nurse" && userRole !== "care_assistant";
  const { activeTeamId, activeTeam } = useActiveTeam();
  const updateActiveTeam = useMutation(api.auth.updateActiveTeam);
  const switchActiveCareHome = useMutation(api.rbac.careHomes.switchActiveCareHome);

  const getActiveOrgLogoQuery = useQuery(
    api.files.image.getOrganizationLogo,
    {}
  );

  // Use the query hook to get teams for current user (all teams for all roles)
  const teamsForUser = useQuery(api.auth.getTeamsForCurrentUser, {});
  
  // Filter out teams that have the same name as the organization (default teams)
  const orgTeams = teamsForUser?.filter(
    (team: { id: string; name: string }) =>
      team.name !== activeOrganization?.name
  ) || [];

  const handleTeamClick = async (teamId: string) => {
    try {
      await updateActiveTeam({ teamId });
      toast.success("Team switched successfully");
    } catch (error) {
      console.error("Error switching team:", error);
      toast.error("Failed to switch team");
    }
  };

  const handleCareHomeSwitch = async (careHomeId: string) => {
    try {
      // Convert string ID to Convex ID
      await switchActiveCareHome({ careHomeId: careHomeId as Id<"careHomes"> });
      toast.success("Care home switched successfully");
      // Refresh the page to update the UI
      window.location.reload();
    } catch (error) {
      console.error("Error switching care home:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to switch care home";
      toast.error(errorMessage);
    }
  };

  return (
    <SidebarMenu className="p-2">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-full px-1.5 py-0.5 h-fit">
              <div className="flex flex-row justify-between items-center w-full">
                <div className="flex flex-row items-center gap-2">
                  <Avatar className="rounded-md">
                    <AvatarImage
                      src={getActiveOrgLogoQuery?.url ?? ""}
                      alt="Organization logo"
                    />
                    <AvatarFallback className="text-xs rounded bg-primary text-secondary">
                      {orgName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    {isPending ? (
                      <Skeleton className="w-10 h-[17px] bg-muted-foreground/10 mb-[1px]" />
                    ) : (
                   
                      <span className="truncate font-medium">{orgName}</span>
                    )}
                    {isPending ? (
                      <Skeleton className="w-20 h-4 bg-muted-foreground/10" />
                    ) : (
                      <p className="text-xs text-muted-foreground truncate">
                        {/* Organization 1 - Team 1 */}
                        {activeTeam ? activeTeam.name : email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <div className="flex flex-row items-center justify-between">
              <DropdownMenuLabel>Care homes</DropdownMenuLabel>
              {isOwner ? (
                <CreateOrgModal>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    disabled={
                      (careHomes?.length ?? 0) >=
                      config.limits.organizations
                    }
                  >
                    <PlusIcon className="size-3 text-primary" />
                  </DropdownMenuItem>
                </CreateOrgModal>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem disabled>
                        <PlusIcon className="size-3 text-muted-foreground" />
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={4}>
                    Only owners can add care homes
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {careHomes && careHomes.length > 0 ? (
              careHomes.map((careHome) => (
                <OrganizationItem
                  key={careHome._id}
                  organization={{
                    id: String(careHome._id),
                    name: careHome.name
                  }}
                  isActive={activeCareHomeId === careHome._id}
                  onSelect={(id) => handleCareHomeSwitch(id)}
                />
              ))
            ) : (
              <div className="p-2 text-xs text-muted-foreground">
                No care homes available. Owners can create care homes.
              </div>
            )}
            <DropdownMenuSeparator />
            <div className="flex flex-row items-center justify-between">
              <DropdownMenuLabel>Units/House</DropdownMenuLabel>
              <CreateTeamModal>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  disabled={(orgTeams?.length ?? 0) >= config.limits.teams}
                >
                  <PlusIcon className="size-3 text-primary" />
                </DropdownMenuItem>
              </CreateTeamModal>
            </div>
            {orgTeams?.length ? (
              orgTeams.map((team: { id: string; name: string }) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => handleTeamClick(team.id)}
                  className={activeTeamId === team.id ? "bg-accent" : ""}
                >
                  <div className="flex items-center justify-start gap-2 w-full">
                    <Avatar className="size-6 rounded">
                      <AvatarImage src={""} alt="Team logo" />
                      <AvatarFallback className="text-xs rounded bg-primary text-secondary">
                        {team.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{team.name}</span>
                    {activeTeamId === team.id && (
                      <div className="flex items-center justify-end ml-auto">
                        <span className="text-xs text-muted-foreground">
                          Active
                        </span>
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-2 bg-zinc-50 rounded text-xs text-pretty text-muted-foreground">
                {orgName} has no teams yet.
              </div>
            )}

            {canViewProfileAndOrg && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                  <UserIcon />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/settings/organization")}
                >
                  <BuildingIcon />
                  Manage organization
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
