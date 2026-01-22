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
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { CreateTeamSchema } from "@/schemas/CreateTeamSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { supabase } from "@/lib/supabase";

export default function CreateTeamForm({
  onSuccess
}: {
  onSuccess?: () => void;
}) {
  const [isLoading, startTransition] = useTransition();
  const { profile } = useProfile();
  const { user } = useSupabase();

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
        if (!profile?.active_organization_id || !profile?.active_care_home_id || !user?.id) {
          toast.error("Missing organization or care home context. Please ensure you are logged in correctly.");
          return;
        }

        const { data, error } = await supabase
          .from("teams")
          .insert({
            name: values.name,
            organization_id: profile.active_organization_id,
            care_home_id: profile.active_care_home_id,
            created_by: user.id
          })
          .select()
          .single();

        if (data && !error) {
          toast.success("Team created successfully");
          form.reset();
          onSuccess?.();
        } else if (error) {
          toast.error("Error creating team: " + error.message);
        }
      } catch (error) {
        console.error("Error creating team:", error);
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
