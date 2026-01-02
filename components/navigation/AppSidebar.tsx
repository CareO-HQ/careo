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
import { authClient } from "@/lib/auth-client";
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
import { useState } from "react";
import { TeamSwitcher } from "./TeamSwitcher";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
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
  getAuditLabel
} from "@/lib/permissions";

import CreateResidentDialog from "../residents/CreateResidentDialog";
import HelpSupportDialog from "./HelpSupportDialog";

export function AppSidebar() {
  const [isResidentDialogOpen, setIsResidentDialogOpen] = useState(false);
  const activeOrg = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const { data: activeMember } = authClient.useActiveMember();
  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const userRole = (activeMember?.role ?? user?.user?.role) as string | undefined;

  // Extract email to a stable variable - always compute this before any conditional logic
  // This ensures React sees consistent hook call patterns across renders
  const userEmail = user?.user?.email || null;

  // Get unread notification count - dynamic based on selection
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    activeTeamId
      ? { teamId: activeTeamId, organizationId: undefined }
      : activeOrganizationId
        ? { teamId: undefined, organizationId: activeOrganizationId }
        : "skip"
  );

  // Get unread appointments count - dynamic based on selection
  const unreadAppointmentsCount = useQuery(
    api.appointmentNotifications.getUnreadAppointmentCount,
    activeTeamId
      ? { teamId: activeTeamId, organizationId: undefined }
      : activeOrganizationId
        ? { teamId: undefined, organizationId: activeOrganizationId }
        : "skip"
  );

  // Get unread notification count for current user
  const unreadNotificationCount = useQuery(
    api.notifications.getNotificationCount,
    userEmail ? { userId: userEmail } : "skip"
  );

  // Get new action plans count for current user (Resident Audits)
  const newResidentActionPlansCount = useQuery(
    api.auditActionPlans.getNewActionPlansCount,
    userEmail ? { assignedTo: userEmail } : "skip"
  );

  // Get new action plans count for current user (Care File Audits)
  const newCareFileActionPlansCount = useQuery(
    api.careFileAuditActionPlans.getNewActionPlansCount,
    userEmail ? { assignedTo: userEmail } : "skip"
  );

  // Get new action plans count for current user (Governance Audits)
  const newGovernanceActionPlansCount = useQuery(
    api.governanceAuditActionPlans.getNewActionPlansCount,
    userEmail ? { assignedTo: userEmail } : "skip"
  );

  // Get new action plans count for current user (Clinical Audits)
  const newClinicalActionPlansCount = useQuery(
    api.clinicalAuditActionPlans.getNewActionPlansCount,
    userEmail ? { assignedTo: userEmail } : "skip"
  );

  // Get new action plans count for current user (Environment Audits)
  const newEnvironmentActionPlansCount = useQuery(
    api.environmentAuditActionPlans.getNewActionPlansCount,
    userEmail ? { assignedTo: userEmail } : "skip"
  );

  // Combine all action plan counts
  const totalNewActionPlansCount =
    (newResidentActionPlansCount || 0) +
    (newCareFileActionPlansCount || 0) +
    (newGovernanceActionPlansCount || 0) +
    (newClinicalActionPlansCount || 0) +
    (newEnvironmentActionPlansCount || 0);

  return (
    <Sidebar>
      <SidebarContent>
        <TeamSwitcher
          orgName={activeOrg.data?.name ?? ""}
          isPending={activeOrg.isPending}
          email={user?.user.email ?? ""}
        />

        {/* Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Home */}
            {canViewSidebarHome(userRole) && (
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
            {canViewSidebarResidents(userRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/residents">
                    <User2Icon />
                    <span>Residents</span>
                  </Link>
                </SidebarMenuButton>
                <CreateResidentDialog
                  isResidentDialogOpen={isResidentDialogOpen}
                  setIsResidentDialogOpen={setIsResidentDialogOpen}
                />
              </SidebarMenuItem>
            )}

            {/* Staff */}
            {canViewSidebarStaff(userRole) && (
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
            {canViewSidebarHandover(userRole) && (
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
            {canViewSidebarAppointment(userRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/appointment" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Appointment</span>
                    </div>
                    {unreadAppointmentsCount !== undefined && unreadAppointmentsCount > 0 && (
                      <Badge className="bg-red-500 text-white ml-auto h-5 w-5 text-xs flex items-center justify-center rounded-md">
                        {unreadAppointmentsCount}
                      </Badge>
                    )}
                  </Link>
              </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Incidents */}
            {canViewSidebarIncidents(userRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/incidents" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Incidents</span>
                    </div>
                    {unreadCount !== undefined && unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white ml-auto h-5 w-5 text-xs flex items-center justify-center rounded-md">
                        {unreadCount}
                      </Badge>
                    )}
                  </Link>
              </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Action Plans */}
            {canViewSidebarActionPlans(userRole) && (
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
            {canViewSidebarNotification(userRole) && (
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/notification" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <BellIcon className="w-4 h-4" />
                      <span>Notification</span>
                    </div>
                    {unreadNotificationCount !== undefined && unreadNotificationCount > 0 && (
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
        {canViewSidebarAudit(userRole) && (
          <SidebarGroup className="mt-0">
            <SidebarGroupLabel>Audit</SidebarGroupLabel>
            <SidebarGroupContent>
              {/* Audit / CareO Audit */}
              <SidebarMenuItem className="list-none">
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/careo-audit">
                    <ClipboardListIcon />
                    <span>{getAuditLabel(userRole) ?? "Audit"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <HelpSupportDialog>
          <SidebarMenuButton>
            <MessageCircleQuestionMarkIcon />
            <span>Help and Support</span>
          </SidebarMenuButton>
        </HelpSupportDialog>
      </SidebarFooter>
    </Sidebar>
  );
}
