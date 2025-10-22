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
  BellIcon
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TeamSwitcher } from "./TeamSwitcher";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";

import CreateResidentDialog from "../residents/CreateResidentDialog";
import HelpSupportDialog from "./HelpSupportDialog";

export function AppSidebar() {
  const [isResidentDialogOpen, setIsResidentDialogOpen] = useState(false);
  const activeOrg = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const { activeTeamId, activeOrganizationId } = useActiveTeam();

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
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard">
                  <HomeIcon />
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Residents */}
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

            {/* Staff */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/staff">
                  <UsersIcon />
                  <span>Staff</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operations Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Handover */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/handover">
                  <ClipboardListIcon />
                  <span>Handover</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Appointment */}
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

            {/* Incidents */}
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

            {/* Notification */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/notification">
                  <BellIcon />
                  <span>Notification</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Audit Section */}
        <SidebarGroup className="mt-0">
          <SidebarGroupLabel>Audit</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* CareO Audit */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/careo-audit">
                  <ClipboardListIcon />
                  <span>CareO Audit</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroupContent>
        </SidebarGroup>
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
