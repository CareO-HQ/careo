"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { CreateTeamSchema } from "@/schemas/CreateTeamSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export default function CreateTeamForm({
  onSuccess
}: {
  onSuccess?: () => void;
}) {
  const [isLoading, startTransition] = useTransition();
  const organization = authClient.useActiveOrganization();

  const form = useForm<z.infer<typeof CreateTeamSchema>>({
    resolver: zodResolver(CreateTeamSchema),
    defaultValues: {
      name: ""
    }
  });

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof CreateTeamSchema>) {
    startTransition(async () => {
      try {
        const { data, error } = await authClient.organization.createTeam({
          name: values.name,
          organizationId: organization?.data?.id
        });
        console.log("data", data);
        console.log("error", error);

        if (data && !error) {
          toast.success("Team created successfully");
          form.reset();
          onSuccess?.();
        } else if (error) {
          toast.error("Error creating team");
        }
      } catch (error) {
        console.error("Error updating user:", error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="My Team"
                  className="w-full"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-24 mt-4" disabled={isLoading}>
          Continue
        </Button>
      </form>
    </Form>
  );
}
