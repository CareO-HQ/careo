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
import { authClient } from "@/lib/auth-client";
import {
  FolderIcon,
  MessageCircleQuestionMarkIcon,
  PillIcon,
  User2Icon,
  FileTextIcon,
  ClipboardListIcon,
  SettingsIcon,
  CalendarIcon,
  MessageSquareIcon,
  HomeIcon,
  UsersIcon
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
            {/* Audit */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/audit">
                  <FileTextIcon />
                  <span>Audit</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Handover */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/handover">
                  <ClipboardListIcon />
                  <span>Handover</span>
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

            {/* Rota */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/rota">
                  <CalendarIcon />
                  <span>Rota</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Communication */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/communication">
                  <MessageSquareIcon />
                  <span>Communication</span>
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
