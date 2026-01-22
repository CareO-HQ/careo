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
import { useTransition, useEffect, useState } from "react";
import { toast } from "sonner";
import { canInviteMembers, getAllowedRolesToInvite, type UserRole } from "@/lib/permissions";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { v4 as uuidv4 } from "uuid";
import { sendInvitationEmail } from "@/app/actions/invitations";

export default function SendInvitationForm() {
  const { profile: userProfile } = useProfile();
  const { supabase } = useSupabase();
  const [isLoading, startTransition] = useTransition();
  const [teams, setTeams] = useState<any[]>([]);

  const activeOrganizationId = userProfile?.active_organization_id;
  const userRole = userProfile?.role as UserRole | undefined;

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

  // Fetch teams (units) from Supabase
  useEffect(() => {
    async function fetchTeams() {
      if (!supabase || !activeOrganizationId) return;

      const { data, error } = await supabase
        .from('units')
        .select('id, name')
        .eq('organization_id', activeOrganizationId);

      if (error) {
        console.error("Error fetching teams:", error);
      } else {
        setTeams(data || []);
      }
    }

    fetchTeams();
  }, [supabase, activeOrganizationId]);

  // Filter teams logic
  const filteredTeams = teams.filter((team) => {
    // If manager is inviting nurse or care_assistant, implementation detail: 
    // we might want to hide teams that match organization name if that convention exists
    // For Supabase, we just show all units for now unless specific logic is needed
    return true;
  });

  const onSubmit = (values: z.infer<typeof inviteMemberSchema>) => {
    if (!supabase || !userProfile) return;

    // Check if user has permission to invite members
    if (!userRole || !canInviteMembers(userRole)) {
      toast.error("You don't have permission to invite members");
      return;
    }

    startTransition(async () => {
      try {
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        // Check for existing invitation
        const { data: existingInvite } = await supabase
          .from('invitations')
          .select('id')
          .eq('email', values.email)
          .eq('organization_id', activeOrganizationId)
          .eq('status', 'pending')
          .single();

        if (existingInvite) {
          toast.error("User is already invited to this organization");
          return;
        }

        // Check if user is already a member
        const { data: existingMember } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', values.email)
          .eq('active_organization_id', activeOrganizationId)
          .single();

        if (existingMember) {
          toast.error("User is already a member of this organization");
          return;
        }

        // 1. Fetch organization name for the email
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', activeOrganizationId)
          .single();

        const organizationName = orgData?.name || "your organization";

        // 2. Create Invitation in Database
        const { error } = await supabase
          .from('invitations')
          .insert({
            organization_id: activeOrganizationId,
            email: values.email,
            role: values.role,
            status: 'pending',
            invited_by: userProfile.id,
            token: token,
            expires_at: expiresAt.toISOString()
          });

        if (error) {
          throw error;
        }

        if (!activeOrganizationId) {
          toast.error("Active organization not found");
          return;
        }

        // 3. Send Invitation Email
        const emailResult = await sendInvitationEmail({
          email: values.email,
          organizationId: activeOrganizationId,
          organizationName: organizationName,
          inviterName: userProfile.name || "A team member",
          token: token,
          role: values.role
        });

        if (!emailResult.success) {
          console.warn("Invitation email failed to send:", emailResult.error);
          toast.warning("Invitation created, but email could not be sent.");
        } else {
          toast.success("Invitation sent successfully");
        }

        form.reset();
        // Trigger a refresh of the members list if possible, or just reload
        window.location.reload();

      } catch (error: any) {
        console.error("Error sending invitation:", error);
        toast.error(error.message || "Failed to send invitation");
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

