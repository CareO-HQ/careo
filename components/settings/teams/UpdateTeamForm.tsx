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
import { authClient } from "@/lib/auth-client";
import { updateTeamSchema } from "@/schemas/settings/teams/updateTeamSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface UpdateTeamFormProps {
  teamId: string;
  teamName: string;
}

export default function UpdateTeamForm({
  teamId,
  teamName
}: UpdateTeamFormProps) {
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
      const { data, error } = await authClient.organization.updateTeam(
        {
          teamId,
          data: {
            name: values.name
          }
        },
        {
          onSuccess: () => {
            toast.success("Team updated successfully");
          },
          onError: () => {
            toast.error("Failed to update team");
          }
        }
      );
    });
  };

  useEffect(() => {
    form.setValue("name", teamName);
  }, [teamName]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        {/* Logo upload */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel isRequired>Name</FormLabel>
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
