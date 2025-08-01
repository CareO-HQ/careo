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
import { CreateNewOrgSchema } from "@/schemas/CreateNewOrgSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export default function CreateOrgForm({
  onSuccess
}: {
  onSuccess: () => void;
}) {
  const [isLoading, startTransition] = useTransition();

  const form = useForm<z.infer<typeof CreateNewOrgSchema>>({
    resolver: zodResolver(CreateNewOrgSchema),
    defaultValues: {
      name: ""
    }
  });

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof CreateNewOrgSchema>) {
    startTransition(async () => {
      await authClient.organization.create(
        {
          name: values.name,
          slug: values.name.toLowerCase().replace(/ /g, "-")
        },
        {
          onError: (ctx) => {
            if (ctx.error.code === "ORGANIZATION_ALREADY_EXISTS") {
              form.setError("name", {
                message: "An organization with this name already exists"
              });
              return;
            }
            toast.error("Error creating organization");
          },
          onSuccess: () => {
            toast.success("Organization created successfully");
            onSuccess();
          }
        }
      );
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
              <FormLabel isRequired>Organization name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Inc."
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
