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
import { organizationDetailsSchema } from "@/schemas/settings/organizationDetailsSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";

interface OrganizationDetailsFormProps {
  metadata: Record<string, string>;
  isPending: boolean;
  canEdit: boolean;
  onSuccess?: () => void;
}

export default function OrganizationDetailsForm({
  metadata,
  isPending,
  canEdit,
  onSuccess
}: OrganizationDetailsFormProps) {
  const { supabase } = useSupabase();
  const { profile } = useProfile();
  const [isLoading, startTransition] = useTransition();

  const form = useForm<z.infer<typeof organizationDetailsSchema>>({
    resolver: zodResolver(organizationDetailsSchema),
    defaultValues: {
      address: metadata.address ?? "",
      phone: metadata.phone ?? "",
      email: metadata.email ?? undefined,
      website: metadata.website ?? undefined
    }
  });

  const onSubmit = (values: z.infer<typeof organizationDetailsSchema>) => {
    startTransition(async () => {
      if (!supabase || !profile?.active_organization_id) return;
      if (!canEdit) {
        toast.error("Only owners can update organization details");
        return;
      }

      const { data, error } = await supabase
        .from('organizations')
        .update({
          metadata: {
            ...metadata,
            address: values.address,
            phone: values.phone,
            email: values.email,
            website: values.website
          }
        })
        .eq('id', profile.active_organization_id);

      if (error) {
        toast.error("Failed to update organization details");
        console.error("Error updating organization:", error);
      } else {
        toast.success("Organization details updated");
        onSuccess?.();
      }
    });
  };

  useEffect(() => {
    form.reset({
      address: metadata.address ?? "",
      phone: metadata.phone ?? "",
      email: metadata.email ?? undefined,
      website: metadata.website ?? undefined
    });
  }, [metadata, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input
                  disabled={!canEdit || isLoading}
                  placeholder={isPending ? "Loading..." : undefined}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input
                  disabled={!canEdit || isLoading}
                  placeholder={isPending ? "Loading..." : undefined}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  disabled={!canEdit || isLoading}
                  placeholder={isPending ? "Loading..." : undefined}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input
                  disabled={!canEdit || isLoading}
                  placeholder={isPending ? "Loading..." : "https://example.com"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={!canEdit || isLoading || isPending}>
          Save
        </Button>
      </form>
    </Form>
  );
}
