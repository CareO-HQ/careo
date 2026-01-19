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
import { LogoutButton } from "../auth/LogoutButton";

export function AppSidebar() {
  const [isResidentDialogOpen, setIsResidentDialogOpen] = useState(false);
  const activeOrg = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const { data: activeMember, isPending: isActiveMemberPending } = authClient.useActiveMember();
  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const currentUser = useQuery(api.auth.getCurrentUser);
  // SaaS Admin won't have activeMember, so check isSaasAdmin flag
  const isSaasAdmin = (currentUser as any)?.isSaasAdmin === true;
  // Use role from getCurrentUser as fallback if activeMember is not available (common after onboarding)
  // During loading, currentUser is undefined, so we need to handle that case
  const userRole = currentUser === undefined
    ? undefined // Still loading
    : isSaasAdmin
      ? "saas_admin"
      : (activeMember?.role as string | undefined) || (currentUser as any)?.role || undefined;

  // Debug logging to help diagnose issues
  if (typeof window !== 'undefined') {
    console.log('[AppSidebar] State check:', {
      currentUserLoading: currentUser === undefined,
      isSaasAdmin,
      activeMemberRole: activeMember?.role,
      activeMemberLoading: isActiveMemberPending,
      currentUserRole: currentUser ? (currentUser as any)?.role : 'loading',
      finalUserRole: userRole,
      hasActiveMember: !!activeMember,
      hasCurrentUser: !!currentUser,
      activeOrganizationId,
      activeTeamId,
      activeOrgPending: activeOrg.isPending,
      activeOrgData: activeOrg.data
    });
  }

  // Get active care home
  const currentUserContext = useQuery(api.users.getCurrentUserContext);
  const activeCareHomeId = currentUserContext?.user?.activeCareHomeId;
  // No-op: previously used for debug logging
  const activeCareHome = useQuery(
    api.rbac.careHomes.getActiveCareHome,
    {}
  );
  // No-op: previously used for debug logging

  // Use care home name if available, otherwise fall back to organization name
  const displayName = activeCareHome?.name || activeOrg.data?.name || "";

  // Extract email to a stable variable - always compute this before any conditional logic
  // This ensures React sees consistent hook call patterns across renders
  const userEmail = user?.user?.email || null;

  // If we have a user but no role yet, and we're not still loading, try to show basic items
  // This handles the case where role might be temporarily unavailable but user is authenticated
  const isAuthenticated = !!user;
  const isStillLoading = currentUser === undefined || (isActiveMemberPending && !activeMember);

  // If we have organizationId but no role, assume owner role (common after onboarding)
  // This prevents empty sidebar while role is being resolved
  const effectiveRole = userRole || (activeOrganizationId && !isStillLoading ? "owner" : undefined);

  // For owners and managers, always use organization-based queries; for other roles, use team if available
  // Use effectiveRole to handle cases where role is temporarily unavailable
  const shouldUseOrganization = effectiveRole === "manager" || effectiveRole === "owner";

  // Get unread notification count - dynamic based on selection and role
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    shouldUseOrganization && activeOrganizationId
      ? { teamId: undefined, organizationId: activeOrganizationId }
      : activeTeamId
        ? { teamId: activeTeamId, organizationId: undefined }
        : activeOrganizationId
          ? { teamId: undefined, organizationId: activeOrganizationId }
          : "skip"
  );

  // Get unread appointments count - dynamic based on selection and role
  const unreadAppointmentsCount = useQuery(
    api.appointmentNotifications.getUnreadAppointmentCount,
    shouldUseOrganization && activeOrganizationId
      ? { teamId: undefined, organizationId: activeOrganizationId }
      : activeTeamId
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
          orgName={displayName}
          isPending={activeOrg.isPending}
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
                <CreateResidentDialog
                  isResidentDialogOpen={isResidentDialogOpen}
                  setIsResidentDialogOpen={setIsResidentDialogOpen}
                />
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
            {canViewSidebarIncidents(effectiveRole) && (
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
