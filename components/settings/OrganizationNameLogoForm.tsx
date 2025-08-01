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
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
      await authClient.organization.update(
        {
          data: {
            name: values.name
          }
        },
        {
          onSuccess: () => {
            toast.success("Organization name updated");
            onSuccess?.();
          }
        }
      );
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
