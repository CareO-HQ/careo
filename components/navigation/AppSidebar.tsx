"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircleQuestionMarkIcon,
  User2Icon,
  FileTextIcon,
  ClipboardListIcon,
  SettingsIcon,
  MessageSquareIcon,
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  Shield,
  BellIcon,
  ListTodo,
  Heart,
  Pill,
  Zap,
  ChevronDown,
  Scale,
  Droplet,
  Droplets,
  Briefcase,
  Utensils
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { TeamSwitcher } from "./TeamSwitcher";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  canViewSidebarActionPlans,
  canViewSidebarAppointment,
  canViewSidebarAudit,
  canViewSidebarHandover,
  canViewSidebarIncidents,
  canViewSidebarNotification,
  canViewSidebarResidents,
  canViewSidebarStaff,
  canViewSidebarAgency,
  canViewSidebarHome,
  canCreateResident,
  canViewClinical,
  canViewMedication,
  canViewSidebarRota
} from "@/lib/permissions";

import CreateResidentDialog from "../residents/CreateResidentDialog";

import { LogoutButton } from "../auth/LogoutButton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export function AppSidebar() {
  const [isResidentDialogOpen, setIsResidentDialogOpen] = useState(false);
  const [isQwikInfoOpen, setIsQwikInfoOpen] = useState(false);
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { supabase, user } = useSupabase();

  const [unreadIncidentCount, setUnreadIncidentCount] = useState(0);
  const [unreadAppointmentsCount, setUnreadAppointmentsCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [totalNewActionPlansCount, setTotalNewActionPlansCount] = useState(0);
  const [unreadWoundsCount, setUnreadWoundsCount] = useState(0);

  // Map Supabase profile to variables used in the component
  const activeOrganizationId = profile?.active_organization_id || null;
  const activeCareHomeId = profile?.active_care_home_id || null;
  const activeTeamId = profile?.active_team_id || null;
  const userRole = profile?.role;
  const effectiveRole = userRole;

  const pathname = usePathname();

  // Helper to read cookies in client components
  const [mdtSession, setMdtSession] = useState<any>(null);
  const [rqiaSession, setRqiaSession] = useState<any>(null);

  useEffect(() => {
    const getCookie = (name: string): string | null => {
      if (typeof document === "undefined") return null;
      const nameEQ = name + "=";
      const ca = document.cookie.split(";");
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    };

    if (userRole === "mdt") {
      const sessionCookie = getCookie("mdt_session_data");
      if (sessionCookie) {
        try {
          setMdtSession(JSON.parse(decodeURIComponent(sessionCookie)));
        } catch (e) {
          console.error("Error parsing MDT session", e);
          setMdtSession(null);
        }
      } else {
        setMdtSession(null);
      }
    } else {
      setMdtSession(null);
    }

    if (userRole === "rqia") {
      const sessionCookie = getCookie("rqia_session_data");
      if (sessionCookie) {
        try {
          setRqiaSession(JSON.parse(decodeURIComponent(sessionCookie)));
        } catch (e) {
          console.error("Error parsing RQIA session", e);
          setRqiaSession(null);
        }
      } else {
        setRqiaSession(null);
      }
    } else {
      setRqiaSession(null);
    }
  }, [userRole, pathname]);

  // Fetch all sidebar counts
  const fetchCounts = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch dismissals first
      const { data: dismissals } = await supabase
        .from("notification_dismissals")
        .select("notification_id")
        .eq("user_id", user.id);

      const dismissedIds = new Set((dismissals || []).map(d => d.notification_id));

      // 1. Unread Incidents (via notifications table with type incident)
      const isPowerUser = userRole === "manager" || userRole === "owner" || userRole === "saas_admin";

      let incidentQuery = supabase
        .from("notifications")
        .select("id")
        .eq("organization_id", activeOrganizationId)
        .eq("type", "incident")
        .eq("care_home_id", activeCareHomeId);

      if (!isPowerUser && activeTeamId) {
        incidentQuery = incidentQuery.eq("team_id", activeTeamId);
      }

      const { data: allIncidentNotifs } = await incidentQuery
        .or(`user_id.eq.${user.id},user_id.is.null`);

      const { data: incidentReadStatuses } = await supabase
        .from("notification_read_status")
        .select("notification_id")
        .eq("user_id", user.id);

      const readIds = new Set((incidentReadStatuses || []).map(r => r.notification_id));

      const unreadIncidentList = (allIncidentNotifs || []).filter(n =>
        !readIds.has(n.id) && !dismissedIds.has(n.id)
      );
      setUnreadIncidentCount(unreadIncidentList.length);

      // 2. Unread Appointments (via notifications table)
      const { data: allAppointmentNotifs } = await supabase
        .from("notifications")
        .select("id")
        .eq("organization_id", activeOrganizationId)
        .eq("care_home_id", activeCareHomeId)
        .like("type", "appointment_%")
        .or(`user_id.eq.${user.id},user_id.is.null`);

      const unreadAppointmentList = (allAppointmentNotifs || []).filter(n =>
        !readIds.has(n.id) && !dismissedIds.has(n.id)
      );
      setUnreadAppointmentsCount(unreadAppointmentList.length);

      // 3. System Notifications (exclude types that have their own sidebar badges)
      const { data: allNotifs } = await supabase
        .from("notifications")
        .select("id, type, user_id, team_id")
        .eq("organization_id", activeOrganizationId)
        .eq("care_home_id", activeCareHomeId)
        .lte("created_at", new Date().toISOString())
        .or(`user_id.eq.${user.id},user_id.is.null`);

      const systemBroadcastVisible = (n: { user_id: string | null; team_id: string | null }) => {
        if (n.user_id === user.id) return true;
        if (n.user_id === null) {
          if (isPowerUser || !activeTeamId) return true;
          return n.team_id === null || n.team_id === activeTeamId;
        }
        return false;
      };

      const unreadNotifs = (allNotifs || []).filter(n =>
        systemBroadcastVisible(n) &&
        !readIds.has(n.id) &&
        !dismissedIds.has(n.id) &&
        n.type !== "incident" &&
        !(n.type || "").startsWith("appointment_") &&
        !(n.type || "").startsWith("action_plan")
      );
      setUnreadNotificationCount(unreadNotifs.length);

      // 4. Action Plans (via notifications table)
      let actionPlanQuery = supabase
        .from("notifications")
        .select("id, metadata")
        .eq("organization_id", activeOrganizationId)
        .eq("care_home_id", activeCareHomeId)
        .in("type", ["action_plan", "action_plan_status"]);

      if (isPowerUser) {
        actionPlanQuery = actionPlanQuery.or(`user_id.eq.${user.id},user_id.is.null`);
      } else {
        actionPlanQuery = actionPlanQuery.eq("user_id", user.id);
      }

      const { data: allActionPlanNotifs } = await actionPlanQuery;

      const unreadActionPlanRows = (allActionPlanNotifs || []).filter(
        (n) => !readIds.has(n.id) && !dismissedIds.has(n.id)
      );

      const seenActionPlanKeys = new Set<string>();
      for (const n of unreadActionPlanRows) {
        const meta = n.metadata as { actionPlanId?: string } | undefined;
        const planKey = meta?.actionPlanId
          ? `plan:${meta.actionPlanId}`
          : `notif:${n.id}`;
        seenActionPlanKeys.add(planKey);
      }
      setTotalNewActionPlansCount(seenActionPlanKeys.size);

      // 5. Unread wounds (per-user via wound_alert_reads)
      let woundsQuery = supabase
        .from("wounds")
        .select("id")
        .neq("status", "healed");

      if (isPowerUser) {
        woundsQuery = woundsQuery.eq("organization_id", activeOrganizationId);
        if (activeCareHomeId) {
          woundsQuery = woundsQuery.eq("care_home_id", activeCareHomeId);
        }
      } else if (activeTeamId) {
        woundsQuery = woundsQuery.eq("team_id", activeTeamId);
      }

      const { data: visibleWounds, error: visibleWoundsError } = await woundsQuery.limit(200);
      if (visibleWoundsError) {
        console.error("Error fetching visible wounds for sidebar:", visibleWoundsError);
        setUnreadWoundsCount(0);
      } else {
        const woundIds = (visibleWounds || []).map((w) => w.id);
        if (woundIds.length === 0) {
          setUnreadWoundsCount(0);
        } else {
          const { data: readWounds, error: readWoundsError } = await supabase
            .from("wound_alert_reads")
            .select("wound_id")
            .eq("user_id", user.id)
            .in("wound_id", woundIds);

          if (readWoundsError) {
            // Fallback when read table is unavailable/missing migration.
            setUnreadWoundsCount(woundIds.length);
          } else {
            const readSet = new Set((readWounds || []).map((row) => row.wound_id));
            const unreadCount = woundIds.filter((woundId) => !readSet.has(woundId)).length;
            setUnreadWoundsCount(unreadCount);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching sidebar counts:", error);
    }
  }, [user, activeOrganizationId, activeCareHomeId, activeTeamId, userRole, supabase]);

  // Initial fetch + real-time subscriptions
  useEffect(() => {
    if (!profile || !user) return;

    fetchCounts();

    // Subscribe to real-time changes
    const channelName = `sidebar-notifs-${user.id}-${activeOrganizationId || 'no-org'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          ...(activeCareHomeId
            ? { filter: `care_home_id=eq.${activeCareHomeId}` }
            : activeOrganizationId
              ? { filter: `organization_id=eq.${activeOrganizationId}` }
              : {}),
        },
        () => {
          fetchCounts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_read_status",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wounds",
          ...(activeCareHomeId
            ? { filter: `care_home_id=eq.${activeCareHomeId}` }
            : activeOrganizationId
              ? { filter: `organization_id=eq.${activeOrganizationId}` }
              : {}),
        },
        () => {
          fetchCounts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wound_alert_reads",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[AppSidebar] Subscribed to real-time changes for user ${user.id}`);
        }
      });

    // Subscribe to all action plan tables
    const apTables = [
      'audit_resident_action_plans',
      'audit_care_file_action_plans',
      'audit_governance_action_plans',
      'audit_clinical_action_plans',
      'audit_environment_action_plans',
      'audit_manager_action_plans',
      'care_home_common_action_plans',
    ];

    const apChannels = apTables.map(tableName =>
      supabase
        .channel(`${tableName}-sidebar-changes`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: tableName,
            ...(activeOrganizationId ? { filter: `organization_id=eq.${activeOrganizationId}` } : {}),
          },
          () => {
            fetchCounts();
          }
        )
        .subscribe()
    );

    return () => {
      supabase.removeChannel(channel);
      apChannels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [profile, user, activeOrganizationId, activeCareHomeId, supabase, fetchCounts]);

  // Listen for manual sidebar refresh events from other pages
  useEffect(() => {
    const handleRefresh = () => {
      fetchCounts();
    };
    window.addEventListener("sidebar-counts-refresh", handleRefresh);
    return () => window.removeEventListener("sidebar-counts-refresh", handleRefresh);
  }, [fetchCounts]);

  const displayName = profile?.care_home_name || profile?.organization_name || "";
  const isStillLoading = isProfileLoading;

  if (userRole === "kitchen_staff") {
    return (
      <Sidebar collapsible="offcanvas" className="border-r border-gray-100">
        <SidebarContent className="bg-white">
          <TeamSwitcher
            orgName={displayName}
            isPending={isStillLoading}
          />

          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Kitchen Staff Portal</SidebarGroupLabel>
            <SidebarGroupContent className="px-4 py-2 space-y-2">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Active Unit</p>
                <p className="text-sm font-semibold text-amber-950">{profile?.active_team_name || "All Units"}</p>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild className="hover:bg-amber-50">
                  <Link href={"/dashboard/kitchen-portal" as any}>
                    <Utensils className="text-amber-600 h-4 w-4" />
                    <span className="font-semibold text-amber-950">Diet Information</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="bg-white border-t border-gray-100 p-4 space-y-2">
          <SidebarMenuItem className="list-none">
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarFooter>
      </Sidebar>
    );
  }

  if (userRole === "rqia") {
    return (
      <Sidebar collapsible="offcanvas" className="border-r border-gray-100">
        <SidebarContent className="bg-white">
          <TeamSwitcher
            orgName={displayName}
            isPending={isStillLoading}
          />

          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Active Inspector</SidebarGroupLabel>
            <SidebarGroupContent className="px-4 py-2 space-y-2">
              {rqiaSession ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Inspector Name</p>
                  <p className="text-sm font-semibold text-blue-950">{rqiaSession.fullName}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No session active</p>
              )}
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild className="hover:bg-blue-50">
                  <Link href={"/dashboard/rqia-portal" as any}>
                    <UsersIcon className="text-blue-600 h-4 w-4" />
                    <span className="font-semibold text-blue-950">Residents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="bg-white border-t border-gray-100 p-4 space-y-2">
          <SidebarMenuItem className="list-none">
            <SidebarMenuButton asChild className="hover:bg-gray-50">
              <Link href={"/dashboard/rqia-session" as any}>
                <SettingsIcon className="text-gray-500 h-4 w-4" />
                <span className="text-gray-700 font-medium">Update Inspector Name</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="list-none">
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarFooter>
      </Sidebar>
    );
  }

  if (userRole === "mdt") {
    return (
      <Sidebar collapsible="offcanvas" className="border-r border-gray-100">
        <SidebarContent className="bg-white">
          <SidebarMenu className="p-2 border-b border-gray-100 bg-white">
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton className="w-full px-1.5 py-2 h-auto cursor-default hover:bg-transparent">
                <div className="flex flex-row items-center gap-2.5 w-full">
                  <Avatar className="rounded-md h-9 w-9">
                    <AvatarImage
                      src={profile?.organization_logo_url || ""}
                      alt="Organization logo"
                    />
                    <AvatarFallback className="text-sm rounded-md bg-zinc-900 text-white font-semibold flex items-center justify-center h-9 w-9">
                      {(profile?.care_home_name || "C").charAt(0).toLowerCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 text-left">
                    <span className="truncate font-semibold text-gray-900 text-sm block leading-tight">
                      {profile?.care_home_name || "Care Home"}
                    </span>
                    <p className="text-xs text-muted-foreground truncate leading-normal mt-0.5">
                      {mdtSession?.unitName || profile?.active_team_name || "Team Name"}
                    </p>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Active Session</SidebarGroupLabel>
            <SidebarGroupContent className="px-4 py-2 space-y-4">
              {mdtSession ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Professional</p>
                    <p className="text-sm font-semibold text-gray-800">{mdtSession.fullName}</p>
                    <p className="text-xs text-gray-500 font-medium">{mdtSession.profession}</p>
                  </div>
                  <div className="space-y-1 pt-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Active Resident</p>
                    <p className="text-sm font-semibold text-gray-855 text-indigo-900">{mdtSession.residentName}</p>
                    <p className="text-xs text-gray-500 font-medium">Unit: {mdtSession.unitName}</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">No active visit session</p>
              )}
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              {mdtSession && (
                <SidebarMenuItem className="list-none">
                  <SidebarMenuButton asChild className="hover:bg-indigo-50/50">
                    <Link href={`/dashboard/residents/${mdtSession.residentId}/multidisciplinary-note`}>
                      <FileTextIcon className="text-indigo-600" />
                      <span className="font-semibold text-indigo-900">MDT Visit Note</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="bg-white border-t border-gray-100 p-4 space-y-2">
          <SidebarMenuItem className="list-none">
            <SidebarMenuButton asChild className="hover:bg-gray-50">
              <Link href="/dashboard/mdt-session">
                <SettingsIcon className="text-gray-500" />
                <span className="text-gray-700 font-medium">Change Resident</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="list-none">
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <TeamSwitcher
          orgName={displayName}
          isPending={isStillLoading}
        />

        {/* Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Home */}
            {canViewSidebarHome(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <HomeIcon className="text-blue-500" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Residents */}
            {canViewSidebarResidents(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/residents">
                    <User2Icon className="text-violet-500" />
                    <span>Residents</span>
                  </Link>
                </SidebarMenuButton>
                {canCreateResident(effectiveRole) && (
                  <CreateResidentDialog
                    isResidentDialogOpen={isResidentDialogOpen}
                    setIsResidentDialogOpen={setIsResidentDialogOpen}
                  />
                )}
              </SidebarMenuItem>
            )}

            {/* Staff */}
            {canViewSidebarStaff(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/staff">
                    <UsersIcon className="text-emerald-500" />
                    <span>Staff</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Agency */}
            {canViewSidebarAgency(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href={"/dashboard/agency" as any}>
                    <Briefcase className="text-orange-500" />
                    <span>Agency</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operations Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Rota */}
            {canViewSidebarRota(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href={"/dashboard/rota" as any}>
                    <CalendarIcon className="text-violet-500" />
                    <span>Staff Rota</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Handover */}
            {canViewSidebarHandover(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/handover">
                    <ClipboardListIcon className="text-amber-500" />
                    <span>Handover</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Appointment */}
            {canViewSidebarAppointment(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/appointment" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-cyan-500" />
                      <span>Appointment</span>
                    </div>
                    {unreadAppointmentsCount > 0 && (
                      <Badge className="bg-red-500 text-white ml-auto h-5 w-5 text-xs flex items-center justify-center rounded-md">
                        {unreadAppointmentsCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Incidents */}
            {canViewSidebarIncidents(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/incidents" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-500" />
                      <span>Incidents</span>
                    </div>
                    {unreadIncidentCount > 0 && (
                      <Badge className="bg-red-500 text-white ml-auto h-5 w-5 text-xs flex items-center justify-center rounded-md">
                        {unreadIncidentCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Action Plans */}
            {canViewSidebarActionPlans(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/action-plans" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-green-500" />
                      <span>Action Plans</span>
                    </div>
                    {totalNewActionPlansCount > 0 && (
                      <Badge className="bg-red-500 text-white ml-auto h-5 w-5 text-xs flex items-center justify-center rounded-md">
                        {totalNewActionPlansCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Notification */}
            {canViewSidebarNotification(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/notification" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <BellIcon className="w-4 h-4 text-pink-500" />
                      <span>Notification</span>
                    </div>
                    {unreadNotificationCount > 0 && (
                      <Badge className="bg-red-500 text-white ml-auto h-5 w-5 text-xs flex items-center justify-center rounded-md">
                        {unreadNotificationCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Clinical Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Clinical</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Wounds */}
            {canViewClinical(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/wounds" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span>Wounds</span>
                    </div>
                    {unreadWoundsCount > 0 && (
                      <Badge className="bg-red-500 text-white ml-auto h-5 min-w-5 px-1 text-xs flex items-center justify-center rounded-md">
                        {unreadWoundsCount > 99 ? "99+" : unreadWoundsCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {/* Medications */}
            {canViewMedication(effectiveRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/medications">
                    <Pill className="text-blue-500" />
                    <span>Medications</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}


            {/* QwikInfo Collapsible */}
            <Collapsible
              open={isQwikInfoOpen}
              onOpenChange={setIsQwikInfoOpen}
              className="group/collapsible"
            >
              <SidebarMenuItem className="list-none">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="w-full">
                    <Zap className="text-amber-500" />
                    <span>Quick Info</span>
                    <ChevronDown className={`ml-auto transition-transform duration-200 ${isQwikInfoOpen ? 'rotate-180' : ''}`} />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-6 mt-1 space-y-1">
                    <SidebarMenuItem className="list-none">
                      <SidebarMenuButton asChild>
                        <Link href="/dashboard/qwik-info/weight-check" className="text-sm">
                          <Scale className="w-4 h-4" />
                          <span>Weight Check</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem className="list-none">
                      <SidebarMenuButton asChild>
                        <Link href="/dashboard/qwik-info/bowel-check" className="text-sm">
                          <Droplet className="w-4 h-4" />
                          <span>Bowel Monitor</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem className="list-none">
                      <SidebarMenuButton asChild>
                        <Link href="/dashboard/qwik-info/fluid-check" className="text-sm">
                          <Droplets className="w-4 h-4" />
                          <span>Fluid Monitor</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </div>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Audit Section */}
        {canViewSidebarAudit(effectiveRole) && (
          <SidebarGroup className="mt-0">
            <SidebarGroupLabel>Audit</SidebarGroupLabel>
            <SidebarGroupContent>
              {/* Care File Audit */}
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/manager-audit/0">
                    <FileTextIcon />
                    <span>Care File Audit</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>


              {/* Manager Audit */}
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/manager-audit">
                    <FileTextIcon />
                    <span>Manager Audit</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        {/* Show Admin link for SaaS Admin */}
        {userRole === "saas_admin" && (
          <SidebarMenuItem className="list-none mb-2">
            <SidebarMenuButton asChild>
              <Link href="/admin">
                <SettingsIcon />
                <span>Platform Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        <SidebarMenuItem className="list-none">
          <SidebarMenuButton asChild>
            <Link href="/dashboard/help">
              <MessageCircleQuestionMarkIcon />
              <span>Help and Support</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="list-none mt-2">
          <LogoutButton />
        </SidebarMenuItem>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
