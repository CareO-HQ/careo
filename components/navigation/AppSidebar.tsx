"use client";

import {
  Calendar,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Folder,
  Home,
  MessageCircleQuestion,
  MessageSquare,
  Pill,
  Settings,
  User2,
} from "lucide-react";

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
  SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { TeamSwitcher } from "./TeamSwitcher";
import HelpSupportDialog from "./HelpSupportDialog";
import CreateResidentDialog from "@/components/residents/CreateResidentDialog";
import { useState } from "react";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Residents",
    url: "/dashboard/residents",
    icon: User2,
  },
  {
    title: "Medication",
    url: "/dashboard/medication",
    icon: Pill,
  },
  {
    title: "Files",
    url: "/dashboard/files",
    icon: Folder,
  },
  {
    title: "Audit",
    url: "/dashboard/audit",
    icon: ClipboardCheck,
  },
];

export function AppSidebar() {
  const activeOrg = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const [isResidentDialogOpen, setIsResidentDialogOpen] = useState(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <TeamSwitcher
          orgName={activeOrg.data?.name ?? ""}
          isPending={activeOrg.isPending}
          email={user?.user.email ?? ""}
        />

        <SidebarGroup>
          <SidebarGroupLabel>Healthcare Management</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Residents */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/residents">
                  <User2 />
                  <span>Residents</span>
                </Link>
              </SidebarMenuButton>
              <CreateResidentDialog
                isResidentDialogOpen={isResidentDialogOpen}
                setIsResidentDialogOpen={setIsResidentDialogOpen}
              />
            </SidebarMenuItem>

            {/* Medication */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/medication">
                  <Pill />
                  <span>Medication</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Files */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/files">
                  <Folder />
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
                  <FileText />
                  <span>Audit</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Handover */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/handover">
                  <ClipboardList />
                  <span>Handover</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* General */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/general">
                  <Settings />
                  <span>General</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Rota */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/rota">
                  <Calendar />
                  <span>Rota</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Communication */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/communication">
                  <MessageSquare />
                  <span>Communication</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <HelpSupportDialog>
              <SidebarMenuButton tooltip="Help and Support">
                <MessageCircleQuestion />
                <span>Help and Support</span>
              </SidebarMenuButton>
            </HelpSupportDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}