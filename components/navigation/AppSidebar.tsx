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
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
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