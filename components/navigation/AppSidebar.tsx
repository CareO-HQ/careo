"use client";

import {
  Calendar,
  ClipboardCheck,
  Folder,
  Home,
  Pill,
  User2,
  MessageCircleQuestion,
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
import {
  FolderIcon,
  MessageCircleQuestionMarkIcon,
  PillIcon,
  User2Icon
} from "lucide-react";
import Link from "next/link";
import { TeamSwitcher } from "./TeamSwitcher";
import { authClient } from "@/lib/auth-client";
import HelpSupportDialog from "./HelpSupportDialog";

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
                  <User2Icon />
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