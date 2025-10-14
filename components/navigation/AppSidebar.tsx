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
  FolderIcon,
  MessageCircleQuestionMarkIcon,
  PillIcon,
  User2Icon,
  FileTextIcon,
  ClipboardListIcon,
  SettingsIcon,
  MessageSquareIcon,
  HomeIcon,
  UsersIcon,
  CalendarIcon
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TeamSwitcher } from "./TeamSwitcher";

import CreateResidentDialog from "../residents/CreateResidentDialog";
import HelpSupportDialog from "./HelpSupportDialog";

export function AppSidebar() {
  const [isResidentDialogOpen, setIsResidentDialogOpen] = useState(false);
  const activeOrg = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();

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

            {/* Medication */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/medication">
                  <PillIcon />
                  <span>Medication</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Files */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/files">
                  <FolderIcon />
                  <span>Files</span>
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
                <Link href="/dashboard/appointment">
                  <CalendarIcon />
                  <span>Appointment</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* General */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/general">
                  <SettingsIcon />
                  <span>General</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Notification */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/notification" className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <MessageSquareIcon className="w-4 h-4" />
                    <span>Notification</span>
                  </div>
                  <Badge className="bg-red-500 text-white ml-auto h-5 px-1.5 text-xs">3</Badge>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Audit Section */}
        <SidebarGroup className="mt-0">
          <SidebarGroupLabel>Audit</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Manager Audit */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/managers-audit">
                  <FileTextIcon />
                  <span>Manager Audit</span>
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
