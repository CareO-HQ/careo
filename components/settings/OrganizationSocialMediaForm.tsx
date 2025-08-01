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
import { organizationSocialMediaSchema } from "@/schemas/settings/organizationSocialMediaSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface OrganizationSocialMediaFormProps {
  metadata: Record<string, string>;
  isPending: boolean;
  onSuccess?: () => void;
}

export default function OrganizationSocialMediaForm({
  metadata,
  isPending,
  onSuccess
}: OrganizationSocialMediaFormProps) {
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
      await authClient.organization.update(
        {
          data: {
            metadata: {
              ...metadata,
              facebook: values.facebook,
              instagram: values.instagram,
              x: values.x,
              linkedin: values.linkedin
            }
          }
        },
        {
          onSuccess: () => {
            toast.success("Organization social media updated");
            onSuccess?.();
          }
        }
      );
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                  placeholder={isPending ? "Loading..." : undefined}
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
