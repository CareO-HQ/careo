"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteMemberSchema } from "@/schemas/settings/inviteMemberSchema";
import z from "zod";
import { Form, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { FormControl, FormMessage } from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import { Button } from "../ui/button";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { canInviteMembers, getAllowedRolesToInvite, type UserRole } from "@/lib/permissions";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SendInvitationForm() {
  const { data: member } = authClient.useActiveMember();
  const { data: activeOrganization, refetch: refetchOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const [isLoading, startTransition] = useTransition();
  const createInvitation = useMutation(api.customInvite.createInvitationForManager);
  const teams = useQuery(api.auth.getTeamsWithMembers, {});
  const activeCareHome = useQuery(api.rbac.careHomes.getActiveCareHome, {});

  // Fallback: Get role from organization members if activeMember is not available
  const orgMemberRole = activeOrganization?.members?.find(
    (m) => m.user?.email === user?.user?.email || m.userId === user?.user?.id
  )?.role;

  // Use activeMember role first, fallback to org member role
  const userRole = (member?.role || orgMemberRole) as UserRole | undefined;
  
  const form = useForm<z.infer<typeof inviteMemberSchema>>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "manager",
      teamId: undefined
    }
  });

  const selectedRole = form.watch("role");
  const showTeamSelector = selectedRole === "nurse" || selectedRole === "care_assistant";

  // Filter teams: Hide teams with organization name when manager invites nurse/care_assistant
  const filteredTeams = teams?.filter((team) => {
    // If manager is inviting nurse or care_assistant, hide teams that match organization name
    if (userRole === "manager" && (selectedRole === "nurse" || selectedRole === "care_assistant")) {
      const orgName = activeOrganization?.name || "";
      // Hide team if its name matches the organization name
      return team.name !== orgName;
    }
    // Otherwise, show all teams
    return true;
  }) || [];

  const onSubmit = (values: z.infer<typeof inviteMemberSchema>) => {
    // Check if user has permission to invite members
    if (!userRole || !canInviteMembers(userRole)) {
      toast.error("You don't have permission to invite members");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createInvitation({
          email: values.email,
          role: values.role as any,
          teamId: values.teamId,
          careHomeId: values.role === "manager" ? activeCareHome?._id : undefined
        });

        if (result.success) {
          toast.success("Invitation sent successfully");
          form.reset();
          // Refetch organization data to update the invitations list
          await refetchOrganization();
        } else {
          // Handle specific error cases
          if (result.error?.includes("already invited")) {
            toast.error("User is already invited to this organization");
          } else if (result.error?.includes("only invite")) {
            toast.error(result.error);
          } else {
            toast.error(result.error || "Failed to send invitation");
          }
        }
      } catch (error) {
        console.error("Error sending invitation:", error);
        toast.error("Failed to send invitation");
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col justify-start items-start gap-4 w-full"
      >
        <div className="flex flex-row justify-start items-center gap-4 w-full">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Email" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {userRole && getAllowedRolesToInvite(userRole).includes("manager") && (
                        <SelectItem value="manager">Manager</SelectItem>
                      )}
                      {userRole && getAllowedRolesToInvite(userRole).includes("nurse") && (
                        <SelectItem value="nurse">Nurse</SelectItem>
                      )}
                      {userRole && getAllowedRolesToInvite(userRole).includes("care_assistant") && (
                        <SelectItem value="care_assistant">Care Assistant</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {showTeamSelector && (
          <FormField
            control={form.control}
            name="teamId"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Team</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTeams && filteredTeams.length > 0 ? (
                        filteredTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No teams available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" disabled={isLoading}>
          Send invitation
        </Button>
      </form>
    </Form>
  );
}

