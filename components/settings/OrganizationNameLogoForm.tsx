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
import { organizationNameSchema } from "@/schemas/settings/organizationNameSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";

interface OrganizationNameLogoFormProps {
  name: string;
  isPending: boolean;
  onSuccess?: () => void;
}

export default function OrganizationNameLogoForm({
  name,
  isPending,
  onSuccess
}: OrganizationNameLogoFormProps) {
  const { supabase } = useSupabase();
  const { profile } = useProfile();
  const [isLoading, startTransition] = useTransition();

  const form = useForm<z.infer<typeof organizationNameSchema>>({
    resolver: zodResolver(organizationNameSchema),
    defaultValues: {
      name: ""
    }
  });

  // Update form values when the name prop changes
  useEffect(() => {
    if (name) {
      form.reset({
        name: name
      });
    }
  }, [name, form]);

  const onSubmit = (values: z.infer<typeof organizationNameSchema>) => {
    startTransition(async () => {
      if (!supabase || !profile?.active_organization_id) return;

      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: values.name
        })
        .eq('id', profile.active_organization_id);

      if (error) {
        toast.error("Failed to update organization name");
        console.error("Error updating organization:", error);
      } else {
        toast.success("Organization name updated");
        onSuccess?.();
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder={isPending ? "Loading..." : "Palo Alto, CA"}
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading || isPending}>
          Save
        </Button>
      </form>
    </Form>
  );
}
