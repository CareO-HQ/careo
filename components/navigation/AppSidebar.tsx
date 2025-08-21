"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { FolderIcon, PillIcon, PlusIcon, User2Icon } from "lucide-react";
import { TeamSwitcher } from "./TeamSwitcher";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CreateResidentForm } from "@/components/residents/forms/CreateResidentForm";

export function AppSidebar() {
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

        {/* Team Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Residents */}
            <SidebarMenuItem className="list-none">
              <SidebarMenuButton asChild>
                <Link href="/dashboard/residents">
                  <User2Icon />
                  <span>Residents</span>
                </Link>
              </SidebarMenuButton>

              {/* Dialog for Add Resident */}
              <Dialog>
                <DialogTrigger asChild>
                  <SidebarMenuAction>
                    <PlusIcon />
                    <span className="sr-only">Add Resident</span>
                  </SidebarMenuAction>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Resident</DialogTitle>
                    <DialogDescription>
                      Fill in the details below to add a new resident.
                    </DialogDescription>
                  </DialogHeader>
                  <CreateResidentForm />
                </DialogContent>
              </Dialog>
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
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
