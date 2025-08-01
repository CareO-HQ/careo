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
import { FolderIcon, PillIcon } from "lucide-react";
import { TeamSwitcher } from "./TeamSwitcher";

export function AppSidebar() {
  const activeOrg = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();

  return (
    <Sidebar>
      <SidebarContent className="">
        <TeamSwitcher
          orgName={activeOrg.data?.name ?? ""}
          isPending={activeOrg.isPending}
          email={user?.user.email ?? ""}
        />
        {/* Team Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <a href="#">
                  <PillIcon />
                  <span>Medication</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <a href="#">
                  <FolderIcon />
                  <span>Files</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
