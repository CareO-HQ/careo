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
import { organizationSocialMediaSchema } from "@/schemas/settings/organizationSocialMediaSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";

interface OrganizationSocialMediaFormProps {
  metadata: Record<string, string>;
  isPending: boolean;
  canEdit: boolean;
  onSuccess?: () => void;
}

export default function OrganizationSocialMediaForm({
  metadata,
  isPending,
  canEdit,
  onSuccess
}: OrganizationSocialMediaFormProps) {
  const { supabase } = useSupabase();
  const { profile } = useProfile();
  const [isLoading, startTransition] = useTransition();

  const form = useForm<z.infer<typeof organizationSocialMediaSchema>>({
    resolver: zodResolver(organizationSocialMediaSchema),
    defaultValues: {
      facebook: metadata.facebook ?? "",
      instagram: metadata.instagram ?? "",
      x: metadata.x ?? "",
      linkedin: metadata.linkedin ?? ""
    }
  });

  const onSubmit = (values: z.infer<typeof organizationSocialMediaSchema>) => {
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
            facebook: values.facebook,
            instagram: values.instagram,
            x: values.x,
            linkedin: values.linkedin
          }
        })
        .eq('id', profile.active_organization_id);

      if (error) {
        toast.error("Failed to update organization social media");
        console.error("Error updating organization:", error);
      } else {
        toast.success("Organization social media updated");
        onSuccess?.();
      }
    });
  };

  useEffect(() => {
    form.reset({
      facebook: metadata.facebook ?? "",
      instagram: metadata.instagram ?? "",
      x: metadata.x ?? "",
      linkedin: metadata.linkedin ?? ""
    });
  }, [metadata, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <FormField
          control={form.control}
          name="facebook"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facebook</FormLabel>
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
          name="instagram"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instagram</FormLabel>
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
          name="x"
          render={({ field }) => (
            <FormItem>
              <FormLabel>X (Twitter)</FormLabel>
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
          name="linkedin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn</FormLabel>
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
        <Button type="submit" disabled={!canEdit || isLoading || isPending}>
          Save
        </Button>
      </form>
    </Form>
  );
}
