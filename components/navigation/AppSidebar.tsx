"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarMenuItem
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
  ListTodo
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  canViewSidebarHome,
  getAuditLabel,
  canCreateResident
} from "@/lib/permissions";

import CreateResidentDialog from "../residents/CreateResidentDialog";
import HelpSupportDialog from "./HelpSupportDialog";
import { LogoutButton } from "../auth/LogoutButton";

export function AppSidebar() {
  const [isResidentDialogOpen, setIsResidentDialogOpen] = useState(false);
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { supabase, user } = useSupabase();

  const [unreadIncidentCount, setUnreadIncidentCount] = useState(0);
  const [unreadAppointmentsCount, setUnreadAppointmentsCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [totalNewActionPlansCount, setTotalNewActionPlansCount] = useState(0);

  // Map Supabase profile to variables used in the component
  const activeOrganizationId = profile?.active_organization_id || null;
  const activeTeamId = profile?.active_team_id || null;
  const userRole = profile?.role;
  const effectiveRole = userRole;

  // Fetch all counts and set up real-time subscription
  useEffect(() => {
    if (!profile || !user) return;

    async function fetchCounts() {
      if (!user) return;
      try {
        // Fetch dismissals first
        const { data: dismissals } = await supabase
          .from("notification_dismissals")
          .select("notification_id")
          .eq("user_id", user.id);

        const dismissedIds = new Set((dismissals || []).map(d => d.notification_id));

        // 1. Unread Incidents (via notifications table with type incident)
        // Check read status for incidents
        const { data: allIncidentNotifs } = await supabase
          .from("notifications")
          .select("id")
          .eq("organization_id", activeOrganizationId)
          .eq("type", "incident")
          .or(`user_id.eq.${user.id},user_id.is.null`);

        const { data: incidentReadStatuses } = await supabase
          .from("notification_read_status")
          .select("notification_id")
          .eq("user_id", user.id);

        const incidentReadIds = new Set((incidentReadStatuses || []).map(r => r.notification_id));

        // Filter out read AND dismissed
        const unreadIncidentList = (allIncidentNotifs || []).filter(n =>
          !incidentReadIds.has(n.id) && !dismissedIds.has(n.id)
        );
        setUnreadIncidentCount(unreadIncidentList.length);

        // 2. Unread Appointments (via notifications table)
        const { data: allAppointmentNotifs } = await supabase
          .from("notifications")
          .select("id")
          .eq("organization_id", activeOrganizationId)
          .like("type", "appointment_%")
          .or(`user_id.eq.${user.id},user_id.is.null`);

        const unreadAppointmentList = (allAppointmentNotifs || []).filter(n =>
          !incidentReadIds.has(n.id) && !dismissedIds.has(n.id)
        );
        setUnreadAppointmentsCount(unreadAppointmentList.length);

        // 3. System Notifications
        const { data: allNotifs } = await supabase
          .from("notifications")
          .select("id")
          .eq("organization_id", activeOrganizationId)
          .or(`user_id.eq.${user.id},user_id.is.null`);

        const unreadNotifs = (allNotifs || []).filter(n =>
          !incidentReadIds.has(n.id) && !dismissedIds.has(n.id)
        );
        setUnreadNotificationCount(unreadNotifs.length);

        // 4. Action Plans (via notifications table)
        // We now track "unread" updates instead of "total pending tasks" for the badge
        const { data: allActionPlanNotifs } = await supabase
          .from("notifications")
          .select("id")
          .eq("organization_id", activeOrganizationId)
          .in("type", ["action_plan", "action_plan_status"])
          .or(`user_id.eq.${user.id},user_id.is.null`);

        const unreadActionPlanList = (allActionPlanNotifs || []).filter(n =>
          !incidentReadIds.has(n.id) && !dismissedIds.has(n.id)
        );
        setTotalNewActionPlansCount(unreadActionPlanList.length);
      } catch (error) {
        console.error("Error fetching sidebar counts:", error);
      }
    }

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
          // Only filter by org if we have one, otherwise listen to all (RLS will still protect)
          ...(activeOrganizationId ? { filter: `organization_id=eq.${activeOrganizationId}` } : {}),
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
      'audit_environment_action_plans'
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
  }, [profile, user, activeOrganizationId, supabase]);

  const displayName = profile?.care_home_name || profile?.organization_name || "";
  const isStillLoading = isProfileLoading;

  return (
    <Sidebar>
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
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operations Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
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

        {/* Audit Section */}
        {canViewSidebarAudit(effectiveRole) && (
          <SidebarGroup className="mt-0">
            <SidebarGroupLabel>Audit</SidebarGroupLabel>
            <SidebarGroupContent>
              {/* Audit / CareO Audit */}
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/careo-audit">
                    <ClipboardListIcon />
                    <span>{getAuditLabel(effectiveRole) ?? "Audit"}</span>
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
        <HelpSupportDialog>
          <SidebarMenuButton>
            <MessageCircleQuestionMarkIcon />
            <span>Help and Support</span>
          </SidebarMenuButton>
        </HelpSupportDialog>
        <SidebarMenuItem className="list-none mt-2">
          <LogoutButton />
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  );
}
