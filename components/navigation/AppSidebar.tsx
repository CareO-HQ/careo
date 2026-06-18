"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  Briefcase
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import Link from "next/link";
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
                    <HomeIcon />
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
                    <User2Icon />
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
                    <UsersIcon />
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
                    <Briefcase className="w-4 h-4 text-black" />
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
                    <CalendarIcon />
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
                    <ClipboardListIcon />
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
                      <CalendarIcon className="w-4 h-4" />
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
                      <Shield className="w-4 h-4" />
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
                      <ListTodo className="w-4 h-4" />
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
                      <BellIcon className="w-4 h-4" />
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
                      <Heart className="w-4 h-4" />
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
                    <Pill />
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
                    <Zap />
                    <span>QwikInfo</span>
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
