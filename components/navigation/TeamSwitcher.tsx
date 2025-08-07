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
import CreateTeamModal from "../team/CreateTeamModal";
import { useEffect, useState, useTransition, useCallback } from "react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { toast } from "sonner";
import CreateOrgModal from "../organization/CreateOrgModal";
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
  const [, startTransition] = useTransition();
  const [orgTeams, setOrgTeams] = useState([]);
  const router = useRouter();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: organizations } = authClient.useListOrganizations();

  // Debug: Log the structure of activeOrganization
  console.log("Active Organization:", activeOrganization);
  const { activeTeamId, activeTeam } = useActiveTeam();
  const updateActiveTeam = useMutation(api.auth.updateActiveTeam);
  const setActiveOrganization = useMutation(api.auth.setActiveOrganization);

  const getActiveOrgLogoQuery = useQuery(
    api.files.image.getOrganizationLogo,
    {}
  );

  const getTeams = useCallback(() => {
    startTransition(async () => {
      await authClient.organization.listTeams(
        {},
        {
          onSuccess: ({ data }) => {
            console.log("data", data);
            // Filter out teams that have the same name as the organization (default teams)
            const filteredTeams = data.filter(
              (team: { id: string; name: string }) =>
                team.name !== activeOrganization?.name
            );
            setOrgTeams(filteredTeams);
          }
        }
      );
    });
  }, [startTransition, activeOrganization?.name]);

  const handleTeamClick = async (teamId: string) => {
    try {
      await updateActiveTeam({ teamId });
      toast.success("Team switched successfully");
    } catch (error) {
      console.error("Error switching team:", error);
      toast.error("Failed to switch team");
    }
  };

  const handleOrganizationSwitch = async (organizationId: string) => {
    try {
      // Use our custom mutation that clears team and sets organization
      await setActiveOrganization({ organizationId });

      // Refresh teams for the new organization
      getTeams();

      toast.success("Care home switched successfully");
    } catch (error) {
      console.error("Error switching organization:", error);
      toast.error("Failed to switch organization");
    }
  };

  useEffect(() => {
    getTeams();
  }, [getTeams]);

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
              <CreateOrgModal>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  disabled={
                    (organizations?.length ?? 0) >= config.limits.organizations
                  }
                >
                  <PlusIcon className="size-3 text-primary" />
                </DropdownMenuItem>
              </CreateOrgModal>
            </div>
            {organizations?.map((organization) => (
              <OrganizationItem
                key={organization.id}
                organization={organization}
                isActive={activeOrganization?.id === organization.id}
                onSelect={handleOrganizationSwitch}
              />
            ))}
            <DropdownMenuSeparator />
            <div className="flex flex-row items-center justify-between">
              <DropdownMenuLabel>Teams</DropdownMenuLabel>
              <CreateTeamModal onTeamCreated={getTeams}>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  disabled={(orgTeams.length ?? 0) >= config.limits.teams}
                >
                  <PlusIcon className="size-3 text-primary" />
                </DropdownMenuItem>
              </CreateTeamModal>
            </div>
            {orgTeams.length ? (
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
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
