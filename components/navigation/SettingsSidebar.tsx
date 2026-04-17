"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton
} from "@/components/ui/sidebar";
import {
  ArrowLeftIcon,
  BuildingIcon,
  KeyRoundIcon,
  TagsIcon,
  UserIcon,
  UsersIcon,
  WarehouseIcon
} from "lucide-react";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";

export function SettingsSidebar() {
  const { profile } = useProfile();
  const currentCareHomeName = profile?.care_home_name ?? "No care home selected";

  return (
    <Sidebar>
      <SidebarContent className="p-2">
        <SidebarHeader className="w-full">
          <Link
            href="/dashboard"
            className="flex items-center justify-start flex-row gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="size-3" />
            <span className="text-xs font-medium">Back to app</span>
          </Link>
          <p className="mt-2 text-xs text-muted-foreground truncate">
            Care Home: {currentCareHomeName}
          </p>
        </SidebarHeader>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuButton className="group/profile" asChild>
              <Link href="/settings/profile">
                <UserIcon className="text-muted-foreground group-hover/profile:text-foreground transition-colors" />
                Profile
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton className="group/security" asChild>
              <Link href="/settings/security">
                <KeyRoundIcon className="text-muted-foreground group-hover/security:text-foreground transition-colors" />
                Security
              </Link>
            </SidebarMenuButton>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuButton className="group/care-home" asChild>
              <Link href="/settings/care-home">
                <BuildingIcon className="text-muted-foreground group-hover/care-home:text-foreground transition-colors" />
                Care Home
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton className="group/organization" asChild>
              <Link href="/settings/organization">
                <BuildingIcon className="text-muted-foreground group-hover/organization:text-foreground transition-colors" />
                Organization
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton className="group/organization" asChild>
              <Link href="/settings/teams">
                <WarehouseIcon className="text-muted-foreground group-hover/organization:text-foreground transition-colors" />
                Teams
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton className="group/members" asChild>
              <Link href="/settings/members">
                <UsersIcon className="text-muted-foreground group-hover/members:text-foreground transition-colors" />
                Members
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton className="group/labels" asChild>
              <Link href="/settings/labels">
                <TagsIcon className="text-muted-foreground group-hover/labels:text-foreground transition-colors" />
                Labels
              </Link>
            </SidebarMenuButton>
            {/* <SidebarMenuButton className="group/billing" asChild disabled>
              <Link href="/settings/billing">
                <CreditCardIcon className="text-muted-foreground group-hover/billing:text-foreground transition-colors" />
                Billing
              </Link>
            </SidebarMenuButton> */}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
