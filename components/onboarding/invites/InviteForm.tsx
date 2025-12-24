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

export default function InviteForm() {
  const [isLoading, startTransition] = useTransition();
  const { data: session } = authClient.useSession();
  console.log("SESSION", session);
  const router = useRouter();
  const setIsOnboardingCompleted = useMutation(
    api.user.setIsOnboardingCompleted
  );

  const form = useForm<z.infer<typeof InviteUsersOnboardingForm>>({
    resolver: zodResolver(InviteUsersOnboardingForm),
    defaultValues: {
      users: [
        {
          email: "",
          role: "care_assistant"
        },
        {
          email: "",
          role: "care_assistant"
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

      for (const user of finalData.users) {
        if (!user?.email) continue;
        const { data, error } = await authClient.organization.inviteMember({
          email: user.email,
          role: user.role
        });
        console.log("Invitation sent:", data);
        if (error) {
          console.error("Error sending invitation:", error);
        }
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
        { email: "", role: "care_assistant" as const }
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
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Care Assistant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="nurse">Nurse</SelectItem>
                            <SelectItem value="care_assistant">Care Assistant</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
