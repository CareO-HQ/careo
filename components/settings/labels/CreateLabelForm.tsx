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
import { createLabelSchema } from "@/schemas/settings/labels/createLabelSchame";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { authClient } from "@/lib/auth-client";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";

export default function CreateLabelForm({
  onSuccess
}: {
  onSuccess: () => void;
}) {
  const [isLoading, startTransition] = useTransition();
  const { supabase } = useSupabase();
  const { data: member } = authClient.useActiveMember();

  const form = useForm<z.infer<typeof createLabelSchema>>({
    resolver: zodResolver(createLabelSchema),
    defaultValues: {
      name: "",
      color: ""
    }
  });

  function onSubmit(values: z.infer<typeof createLabelSchema>) {
    if (!member?.organizationId || !supabase) {
      toast.error("Missing organization information");
      return;
    }

    startTransition(async () => {
      try {
        const { data, error } = await supabase
          .from("labels")
          .insert({
            name: values.name,
            color: values.color,
            organization_id: member.organizationId
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            // Unique constraint violation
            toast.error(`Label with name "${values.name}" already exists`);
          } else {
            toast.error("Failed to create label");
          }
          return;
        }

        if (data) {
          toast.success("Label created successfully");
          form.reset();
          onSuccess();
        }
      } catch (error) {
        console.error("Error creating label:", error);
        toast.error("Failed to create label");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input disabled={isLoading} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem className="">
              <FormLabel>Color</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-row gap-1"
                >
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem
                        value="violet"
                        className="!bg-violet-500 !border-violet-500 size-6"
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem
                        value="blue"
                        className="!bg-blue-500 !border-blue-500 size-6"
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem
                        value="pink"
                        className="!bg-pink-500 !border-pink-500 size-6"
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem
                        value="red"
                        className="!bg-red-500 !border-red-500 size-6"
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem
                        value="orange"
                        className="!bg-orange-500 !border-orange-500 size-6"
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem
                        value="yellow"
                        className="!bg-yellow-500 !border-yellow-500 size-6"
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroupItem
                        value="emerald"
                        className="!bg-emerald-500 !border-emerald-500 size-6"
                      />
                    </FormControl>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          Create label
        </Button>
      </form>
    </Form>
  );
}
