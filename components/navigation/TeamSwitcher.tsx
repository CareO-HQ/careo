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
import { useEffect, useState, useTransition } from "react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import CreateTeamModal from "../team/CreateTeamModal";
import CreateCareHomeModal from "../organization/CreateCareHomeModal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import OrganizationItem from "./OrganizationItem";
import { config } from "@/config";

export function TeamSwitcher({
  orgName,
  isPending
}: {
  orgName: string;
  isPending: boolean;
}) {
  const router = useRouter();
  const { profile, isLoading: isProfileLoading, refresh: refreshProfile } = useProfile();
  const { supabase } = useSupabase();
  const [isPendingTransition, startTransition] = useTransition();

  const [careHomes, setCareHomes] = useState<any[]>([]);
  const [orgTeams, setOrgTeams] = useState<any[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const activeOrganizationId = profile?.active_organization_id;
  const activeCareHomeId = profile?.active_care_home_id;
  const activeTeamId = profile?.active_team_id;
  const userRole = profile?.role;
  const isOwner = userRole === "owner";
  const isNurseOrCareAssistant = userRole === "nurse" || userRole === "care_assistant";
  const canViewProfileAndOrg = userRole !== "nurse" && userRole !== "care_assistant";

  // Fetch Care Homes
  useEffect(() => {
    if (!activeOrganizationId) return;

    async function fetchCareHomes() {
      const { data, error } = await supabase
        .from("care_homes")
        .select("id, name")
        .eq("organization_id", activeOrganizationId);

      if (!error && data) {
        setCareHomes(data);
      }
    }

    fetchCareHomes();
  }, [activeOrganizationId, supabase]);

  // Fetch Teams (Units)
  useEffect(() => {
    async function fetchTeams() {
      if (!activeOrganizationId) return;

      let query = supabase.from("teams").select("id, name");

      // Isolation: if nurse/assistant, show only teams in their care home
      if (isNurseOrCareAssistant && activeCareHomeId) {
        query = query.eq("care_home_id", activeCareHomeId);
      } else {
        query = query.eq("organization_id", activeOrganizationId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setOrgTeams(data);
      }
    }

    fetchTeams();
  }, [activeOrganizationId, activeCareHomeId, isNurseOrCareAssistant, supabase]);

  // Fetch Organization Logo
  useEffect(() => {
    if (!activeOrganizationId) return;

    async function fetchLogo() {
      const { data, error } = await supabase
        .from("organizations")
        .select("logo_url")
        .eq("id", activeOrganizationId)
        .single();

      if (!error && data) {
        setLogoUrl(data.logo_url);
      }
    }

    fetchLogo();
  }, [activeOrganizationId, supabase]);

  const handleTeamClick = async (teamId: string) => {
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("users")
          .update({ active_team_id: teamId })
          .eq("id", profile?.id);

        if (error) throw error;

        toast.success("Team switched successfully");
        refreshProfile();
      } catch (error) {
        console.error("Error switching team:", error);
        toast.error("Failed to switch team");
      }
    });
  };

  const handleCareHomeSwitch = async (careHomeId: string) => {
    startTransition(async () => {
      try {
        // When switching care home, we also reset the active unit
        const { error } = await supabase
          .from("users")
          .update({
            active_care_home_id: careHomeId,
            active_team_id: null
          })
          .eq("id", profile?.id);

        if (error) throw error;

        toast.success("Care home switched successfully");
        refreshProfile();
        // Force refresh to ensure all downstream components update
        window.location.reload();
      } catch (error) {
        console.error("Error switching care home:", error);
        toast.error("Failed to switch care home");
      }
    });
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
                      src={logoUrl ?? ""}
                      alt="Organization logo"
                    />
                    <AvatarFallback className="text-xs rounded bg-primary text-secondary">
                      {orgName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    {isPending || isProfileLoading ? (
                      <Skeleton className="w-10 h-[17px] bg-muted-foreground/10 mb-[1px]" />
                    ) : (
                      <span className="truncate font-medium">{orgName}</span>
                    )}
                    {isPending || isProfileLoading ? (
                      <Skeleton className="w-20 h-4 bg-muted-foreground/10" />
                    ) : (
                      profile?.active_team_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {profile.active_team_name}
                        </p>
                      )
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
            {/* Only show "Care homes" section for owners */}
            {isOwner && (
              <>
                <div className="flex flex-row items-center justify-between">
                  <DropdownMenuLabel>Care homes</DropdownMenuLabel>
                  <CreateCareHomeModal>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                      }}
                      disabled={
                        (careHomes?.length ?? 0) >=
                        config.limits.organizations
                      }
                      className="cursor-pointer"
                    >
                      <PlusIcon className="size-3 text-primary" />
                    </DropdownMenuItem>
                  </CreateCareHomeModal>
                </div>
                {careHomes && careHomes.length > 0 ? (
                  careHomes.map((careHome) => (
                    <OrganizationItem
                      key={careHome.id}
                      organization={{
                        id: careHome.id,
                        name: careHome.name
                      }}
                      isActive={activeCareHomeId === careHome.id}
                      onSelect={(id) => handleCareHomeSwitch(id)}
                    />
                  ))
                ) : (
                  <div className="p-2 text-xs text-muted-foreground">
                    No care homes available. Owners can create care homes.
                  </div>
                )}
                <DropdownMenuSeparator />
              </>
            )}
            <div className="flex flex-row items-center justify-between">
              <DropdownMenuLabel>Units/House</DropdownMenuLabel>
              {isNurseOrCareAssistant ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem disabled>
                        <PlusIcon className="size-3 text-muted-foreground" />
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={4}>
                    Only managers and owners can add teams
                  </TooltipContent>
                </Tooltip>
              ) : (
                <CreateTeamModal>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    disabled={(orgTeams?.length ?? 0) >= config.limits.teams}
                  >
                    <PlusIcon className="size-3 text-primary" />
                  </DropdownMenuItem>
                </CreateTeamModal>
              )}
            </div>
            {orgTeams?.length ? (
              orgTeams.map((team: { id: string; name: string }) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => handleTeamClick(team.id)}
                  className={activeTeamId === team.id ? "bg-accent border-l-2 border-sky-400" : ""}
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
                {isNurseOrCareAssistant
                  ? "No units available in your care home yet."
                  : `${orgName} has no teams yet.`}
              </div>
            )}

            {canViewProfileAndOrg && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/settings/organization")}
                >
                  <BuildingIcon className="mr-2 h-4 w-4" />
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
