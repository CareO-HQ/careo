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
  MessageCircleQuestionMarkIcon,
  HomeIcon,
  Building2,
  UserCheck,
  BarChart3,
  Shield
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HelpSupportDialog from "./HelpSupportDialog";
import { LogoutButton } from "../auth/LogoutButton";

export function AdminSidebar() {
  const { data: session } = authClient.useSession();
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="flex items-center gap-2 px-4 py-4 border-b">
          <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
          <div>
            <p className="font-semibold">Platform Admin</p>
            <p className="text-xs text-muted-foreground">SaaS Administration</p>
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Dashboard */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild isActive={pathname === "/admin"}>
                <Link href="/admin">
                  <HomeIcon />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Organizations */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton
                asChild
                isActive={pathname?.startsWith("/admin/care-homes")}
              >
                <Link href="/admin/care-homes">
                  <Building2 />
                  <span>Organizations</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Owners */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton
                asChild
                isActive={pathname?.startsWith("/admin/owners")}
              >
                <Link href="/admin/owners">
                  <UserCheck />
                  <span>Owners</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Analytics */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton
                asChild
                isActive={pathname === "/admin/analytics"}
              >
                <Link href="/admin/analytics">
                  <BarChart3 />
                  <span>Analytics</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* SaaS Admins */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton
                asChild
                isActive={pathname === "/admin/admins"}
              >
                <Link href="/admin/admins">
                  <Shield />
                  <span>SaaS Admins</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Info */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenuItem className="list-none">
              <div className="px-2 py-2 text-sm">
                <p className="font-medium">{session?.user?.name || "Admin"}</p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
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
        <SidebarMenuItem className="list-none mt-2">
          <LogoutButton />
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  );
}
