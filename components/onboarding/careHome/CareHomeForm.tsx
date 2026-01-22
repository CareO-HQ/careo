"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import { SaveOnboardingCareHomeForm } from "@/schemas/SaveOnboardingCareHomeForm";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import LogoSelector from "../organization/LogoSelector";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTransition, useEffect, useState } from "react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";

export default function CareHomeForm({
  step,
  setStep
}: {
  step: number;
  setStep: (step: number) => void;
}) {
  const [isLoading, startTransition] = useTransition();
  const { profile, refresh: refreshProfile } = useProfile();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof SaveOnboardingCareHomeForm>>({
    resolver: zodResolver(SaveOnboardingCareHomeForm),
    defaultValues: {
      name: "",
      exampleData: false
    }
  });

  useEffect(() => {
    if (profile?.organization_name) {
      form.setValue("name", profile.organization_name);
    }
  }, [profile?.organization_name, form]);

  function onSubmit(values: z.infer<typeof SaveOnboardingCareHomeForm>) {
    startTransition(async () => {
      if (!profile) {
        toast.error("Profile not found");
        return;
      }

      const orgId = profile.active_organization_id;

      if (!orgId) {
        toast.error("Organization not found. Please contact your administrator.");
        return;
      }

      console.log("[DEBUG CareHomeForm] Creating care home with:", {
        orgId,
        name: values.name,
        createdBy: profile.id
      });
      
      try {
        // 1. Create the Care Home
        const { data: careHome, error: careHomeError } = await supabase
          .from("care_homes")
          .insert({
            organization_id: orgId,
            name: values.name,
            created_by: profile.id
          })
          .select()
          .single();

        if (careHomeError) throw careHomeError;

        // 2. Set this as the active care home in the users table
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({
            active_care_home_id: careHome.id,
            updated_at: new Date().toISOString()
          })
          .eq("id", profile.id);

        if (userUpdateError) throw userUpdateError;

        // Sync with auth metadata
        await supabase.auth.updateUser({
          data: { active_care_home_id: careHome.id }
        });

        // 3. Handle Logo Upload if selected
        if (selectedFile) {
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${orgId}-${Math.random()}.${fileExt}`;
          const filePath = `org-logos/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('careo-public')
            .upload(filePath, selectedFile);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('careo-public')
            .getPublicUrl(filePath);

          const { error: orgUpdateError } = await supabase
            .from("organizations")
            .update({
              logo_url: publicUrlData.publicUrl,
              updated_at: new Date().toISOString()
            })
            .eq("id", orgId);

          if (orgUpdateError) throw orgUpdateError;
        }

        await refreshProfile();
        setStep(step + 1);
      } catch (error: any) {
        console.error("Error creating care home:", error);
        toast.error(error.message || "Failed to create care home");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <LogoSelector
          disabled={isLoading}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          currentImageUrl={undefined}
          fileId={undefined}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Care home name</FormLabel>
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
        <FormField
          control={form.control}
          name="exampleData"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="space-y-0.5 mt-4">
                <FormLabel>Example data</FormLabel>
                <FormDescription>
                  Recommended to test the platform.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  disabled={isLoading}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-24 mt-4"
          disabled={isLoading}
        >
          Continue
        </Button>
      </form>
    </Form>
  );
}
