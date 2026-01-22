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

  // Fetch all counts
  useEffect(() => {
    if (!profile || !user) return;

    async function fetchCounts() {
      try {
        // 1. Unread Incidents (via notifications table with type incident)
        const { count: incidents } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", activeOrganizationId)
          .eq("type", "incident");
        // Simplified: just getting total for now, real implementation would exclude read status
        setUnreadIncidentCount(incidents || 0);

        // 2. Unread Appointments
        const { count: appointments } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", activeOrganizationId)
          .eq("status", "scheduled")
          .gte("start_time", new Date().toISOString());
        setUnreadAppointmentsCount(appointments || 0);

        // 3. System Notifications
        const { count: notifications } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", activeOrganizationId);
        setUnreadNotificationCount(notifications || 0);

        // 4. Action Plans
        if (user) {
          const { count: actionPlans } = await supabase
            .from("audit_action_plans")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", activeOrganizationId)
            .eq("status", "pending")
            .eq("assigned_to", user.id);
          setTotalNewActionPlansCount(actionPlans || 0);
        }
      } catch (error) {
        console.error("Error fetching sidebar counts:", error);
      }
    }

    fetchCounts();
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
