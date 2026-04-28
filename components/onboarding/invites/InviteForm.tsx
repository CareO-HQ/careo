"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { InviteUsersOnboardingForm } from "@/schemas/InviteUsersOnboardingForm";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { getAllowedRolesToInvite, UserRole } from "@/lib/permissions";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { nanoid } from "nanoid";
import { sendInvitationEmail } from "@/app/actions/invitations";

export default function InviteForm() {
  const [isLoading, startTransition] = useTransition();
  const { profile, refresh: refreshProfile } = useProfile();
  const router = useRouter();

  // Get the first allowed role as default
  const inviterRole = (profile?.role as UserRole) || "owner";
  const allowedRoles = getAllowedRolesToInvite(inviterRole);
  const defaultRole = allowedRoles[0] || "manager";

  const form = useForm<z.infer<typeof InviteUsersOnboardingForm>>({
    resolver: zodResolver(InviteUsersOnboardingForm),
    defaultValues: {
      users: [
        {
          email: "",
          role: defaultRole as "manager" | "nurse" | "care_assistant"
        },
        {
          email: "",
          role: defaultRole as "manager" | "nurse" | "care_assistant"
        }
      ]
    }
  });

  function onSubmit(values: z.infer<typeof InviteUsersOnboardingForm>) {
    startTransition(async () => {
      if (!profile || !profile.active_organization_id) {
        toast.error("Missing organization context");
        return;
      }

      const usersWithEmails = values.users.filter(
        (user) => user?.email && user.email.trim() !== ""
      );

      let successCount = 0;
      let errorCount = 0;

      // 1. Fetch name for the email (Care Home name if available, else Organization name)
      let emailOrganizationName = "your organization";

      if (profile.active_care_home_id) {
        const { data: careHomeData } = await supabase
          .from('care_homes')
          .select('name')
          .eq('id', profile.active_care_home_id)
          .single();
        if (careHomeData?.name) {
          emailOrganizationName = careHomeData.name;
        }
      } else if (profile.active_organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.active_organization_id)
          .single();
        if (orgData?.name) {
          emailOrganizationName = orgData.name;
        }
      }

      for (const user of usersWithEmails) {
        if (!user?.email) continue;
        const email = user.email;
        try {
          const token = nanoid(32);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

          const { error } = await supabase
            .from("invitations")
            .insert({
              organization_id: profile.active_organization_id,
              care_home_id: profile.active_care_home_id,
              email,
              role: user.role,
              invited_by: profile.id,
              token: token,
              expires_at: expiresAt.toISOString(),
              status: "pending"
            });

          if (!error) {
            successCount++;

            // 2. Send Invitation Email
            await sendInvitationEmail({
              email,
              organizationId: profile.active_organization_id,
              careHomeName: emailOrganizationName,
              inviterName: profile.name || "A team member",
              token: token,
              role: user.role
            });
          } else {
            console.error("Error sending invitation:", error);
            errorCount++;
            toast.error(`Failed to invite ${user.email}: ${error.message}`);
          }
        } catch (error) {
          console.error("Error sending invitation:", error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} invitation(s)`);
      }

      // Mark onboarding as complete
      try {
        const { error: completionError } = await supabase
          .from("users")
          .update({
            is_onboarding_complete: true,
            updated_at: new Date().toISOString()
          })
          .eq("id", profile.id);

        if (completionError) throw completionError;

        await refreshProfile();
        toast.success("Onboarding complete!");
        router.push("/dashboard");
      } catch (error: any) {
        console.error("Error marking onboarding as complete:", error);
        toast.error("Failed to complete onboarding. Please try again.");
      }
    });
  }

  const MAX_INVITATIONS = 5;

  const addInvitation = () => {
    const currentUsers = form.getValues("users");
    if (currentUsers.length < MAX_INVITATIONS) {
      form.setValue("users", [
        ...currentUsers,
        { email: "", role: defaultRole as "manager" | "nurse" | "care_assistant" }
      ]);
    }
  };

  const users = form.watch("users");

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 w-full"
        >
          <FormField
            control={form.control}
            name="users"
            render={() => (
              <FormItem>
                <div className="flex flex-row justify-between items-center">
                  <h3 className="font-medium">Email addresses</h3>
                  {users.length < MAX_INVITATIONS && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addInvitation}
                      disabled={isLoading}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add invitation
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            {users.map((_, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <FormField
                    control={form.control}
                    name={`users.${index}.email`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="user@email.com"
                            type="email"
                            {...field}
                            value={field.value || ""}
                            disabled={isLoading}
                          />
                        </FormControl>
                        {field.value && field.value.trim() !== "" && (
                          <FormMessage />
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`users.${index}.role`}
                  render={({ field }) => {
                    const inviterRole = (profile?.role as UserRole) || "owner";
                    const allowedRoles = getAllowedRolesToInvite(inviterRole);

                    return (
                      <FormItem>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedRoles.includes("manager") && (
                                <SelectItem value="manager">Manager</SelectItem>
                              )}
                              {allowedRoles.includes("nurse") && (
                                <SelectItem value="nurse">Nurse</SelectItem>
                              )}
                              {allowedRoles.includes("care_assistant") && (
                                <SelectItem value="care_assistant">Care Assistant</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-start pt-4">
            <Button type="submit" className="px-8" disabled={isLoading}>
              Finish
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
