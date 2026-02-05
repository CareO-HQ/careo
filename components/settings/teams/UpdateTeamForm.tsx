"use client";

import ImageSelector from "@/components/onboarding/profile/ImageSelector";
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
import { updateTeamSchema } from "@/schemas/settings/teams/updateTeamSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";

interface UpdateTeamFormProps {
  teamId: string;
  teamName: string;
}

export default function UpdateTeamForm({
  teamId,
  teamName
}: UpdateTeamFormProps) {
  const { supabase } = useSupabase();
  const [isLoading, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof updateTeamSchema>>({
    resolver: zodResolver(updateTeamSchema),
    defaultValues: {
      name: teamName ?? ""
    }
  });

  const onSubmit = (values: z.infer<typeof updateTeamSchema>) => {
    startTransition(async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('teams')
        .update({ name: values.name })
        .eq('id', teamId);

      if (error) {
        toast.error("Failed to update team");
        console.error("Error updating team:", error);
      } else {
        toast.success("Team updated successfully");
      }
    });
  };

  useEffect(() => {
    form.setValue("name", teamName);
  }, [teamName, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        {/* Logo upload */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Team name"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          Save
        </Button>
      </form>
    </Form>
  );
}
