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
import { useTransition, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export default function SendInvitationForm() {
  const { data: member } = authClient.useActiveMember();
  const [isLoading, startTransition] = useTransition();
  const form = useForm<z.infer<typeof inviteMemberSchema>>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "care_assistant"
    }
  });

  const onSubmit = (values: z.infer<typeof inviteMemberSchema>) => {
    // Check if user has permission to invite members
    if (member?.role !== "owner" && member?.role !== "manager") {
      toast.error("You don't have permission to invite members");
      return;
    }

    startTransition(async () => {
      const { data, error } = await authClient.organization.inviteMember(
        {
          email: values.email,
          role: values.role
        },
        {
          onSuccess: () => {
            toast.success("Invitation sent successfully");
            form.reset();
          },
          onError: (error) => {
            console.log(error);
            if (
              error.error.code ===
              "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION"
            ) {
              toast.error("User is already invited to this organization");
              return;
            }
            toast.error("Failed to send invitation");
          }
        }
      );
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
        <Button type="submit" disabled={isLoading}>
          Send invitation
        </Button>
      </form>
    </Form>
  );
}
