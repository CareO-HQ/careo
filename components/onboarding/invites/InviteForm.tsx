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
import { api, components } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { InviteUsersOnboardingForm } from "@/schemas/InviteUsersOnboardingForm";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { getAllowedRolesToInvite, UserRole } from "@/lib/permissions";
import { toast } from "sonner";

export default function InviteForm() {
  const [isLoading, startTransition] = useTransition();
  const { data: session } = authClient.useSession();
  const { data: member } = authClient.useActiveMember();
  console.log("SESSION", session);
  const router = useRouter();
  const setIsOnboardingCompleted = useMutation(
    api.user.setIsOnboardingCompleted
  );
  const createInvitation = useMutation(api.customInvite.createInvitationForManager);

  // Get the first allowed role as default
  const inviterRole = (member?.role as UserRole) || "owner";
  const allowedRoles = getAllowedRolesToInvite(inviterRole);
  const defaultRole = allowedRoles[0] || "manager";

  const form = useForm<z.infer<typeof InviteUsersOnboardingForm>>({
    resolver: zodResolver(InviteUsersOnboardingForm),
    defaultValues: {
      users: [
        {
          email: "",
          role: defaultRole
        },
        {
          email: "",
          role: defaultRole
        }
      ]
    }
  });

  function onSubmit(values: z.infer<typeof InviteUsersOnboardingForm>) {
    startTransition(async () => {
      // Filter out users with empty emails
      const usersWithEmails = values.users.filter(
        (user) => user?.email && user.email.trim() !== ""
      );

      const finalData = {
        ...values,
        users: usersWithEmails
      };

      let successCount = 0;
      let errorCount = 0;

      for (const user of finalData.users) {
        if (!user?.email) continue;

        try {
          const result = await createInvitation({
            email: user.email,
            role: user.role as any
          });
          
          if (result.success) {
            console.log("Invitation sent:", result.invitationId);
            successCount++;
          } else {
            console.error("Error sending invitation:", result.error);
            errorCount++;
            if (result.error && !result.error.includes("already invited")) {
              toast.error(`Failed to invite ${user.email}: ${result.error}`);
            }
          }
        } catch (error) {
          console.error("Error sending invitation:", error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} invitation(s)`);
      }
      if (errorCount > 0 && successCount === 0) {
        toast.error(`Failed to send ${errorCount} invitation(s)`);
      }

      router.push("/dashboard");
      await setIsOnboardingCompleted();
    });
  }

  const MAX_INVITATIONS = 5;

  const addInvitation = () => {
    const currentUsers = form.getValues("users");
    if (currentUsers.length < MAX_INVITATIONS) {
      form.setValue("users", [
        ...currentUsers,
        { email: "", role: defaultRole as const }
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
                    const inviterRole = (member?.role as UserRole) || "owner";
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
