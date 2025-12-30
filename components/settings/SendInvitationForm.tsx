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
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

export default function SendInvitationForm() {
  const { data: member } = authClient.useActiveMember();
  const [isLoading, startTransition] = useTransition();
  const createInvitation = useMutation(api.customInvite.createInvitationForManager);
  const router = useRouter();
  
  const form = useForm<z.infer<typeof inviteMemberSchema>>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "manager"
    }
  });

  const onSubmit = (values: z.infer<typeof inviteMemberSchema>) => {
    // Check if user has permission to invite members
    if (!member?.role || !canInviteMembers(member.role as UserRole)) {
      toast.error("You don't have permission to invite members");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createInvitation({
          email: values.email,
          role: values.role as any
        });

        if (result.success) {
          toast.success("Invitation sent successfully");
          form.reset();
          router.refresh();
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
                      {getAllowedRolesToInvite(member?.role as UserRole || "care_assistant").includes("manager") && (
                        <SelectItem value="manager">Manager</SelectItem>
                      )}
                      {getAllowedRolesToInvite(member?.role as UserRole || "care_assistant").includes("nurse") && (
                        <SelectItem value="nurse">Nurse</SelectItem>
                      )}
                      {getAllowedRolesToInvite(member?.role as UserRole || "care_assistant").includes("care_assistant") && (
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
        <Button type="submit" disabled={isLoading}>
          Send invitation
        </Button>
      </form>
    </Form>
  );
}

