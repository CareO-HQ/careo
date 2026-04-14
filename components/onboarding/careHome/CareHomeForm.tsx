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
import { buildStorageObjectUrl } from "@/lib/storage";

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

      let orgId = profile.active_organization_id;

      try {
        // Debug: Log complete user context
        console.log("%c[DEBUG Context] User profile", "background: #222; color: #bada55", profile);
        console.log("%c[DEBUG Context] Auth user", "background: #222; color: #bada55", await supabase.auth.getUser());
        const { data: dbUser } = await supabase.from('users').select('*').eq('id', profile.id).single();
        console.log("%c[DEBUG Context] Database user", "background: #222; color: #bada55", dbUser);
        
        // Create organization if user doesn't have one yet (initial onboarding)
        if (!orgId) {
          console.log("%c[DEBUG Supabase] Creating new organization", "background: #1e3a8a; color: #ffffff");
          const insertData = {
            name: values.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          console.log("%c[DEBUG Supabase] INSERT organizations - Request", "color: #059669", insertData);
          
          const { data: organization, error: orgError } = await supabase
            .from("organizations")
            .insert(insertData)
            .select()
            .single();

          if (orgError) {
            console.error("%c[DEBUG Supabase] INSERT organizations - Error", "color: #dc2626", orgError);
            throw orgError;
          }

          orgId = organization.id;
          console.log("%c[DEBUG Supabase] INSERT organizations - Response", "color: #059669", organization);

          // Update user's active_organization_id
          const updateUserData = {
            active_organization_id: orgId,
            updated_at: new Date().toISOString()
          };
          console.log("%c[DEBUG Supabase] UPDATE users - Request", "color: #059669", updateUserData);
          
          const { error: userUpdateError } = await supabase
            .from("users")
            .update(updateUserData)
            .eq("id", profile.id);

          if (userUpdateError) {
            console.error("%c[DEBUG Supabase] UPDATE users - Error", "color: #dc2626", userUpdateError);
            throw userUpdateError;
          }

          console.log("%c[DEBUG Supabase] UPDATE users - Success", "color: #059669");

          // Sync with auth metadata
          const authUpdateData = { active_organization_id: orgId };
          console.log("%c[DEBUG Supabase] AUTH updateUser - Request", "color: #059669", authUpdateData);
          
          await supabase.auth.updateUser({ data: authUpdateData });
          console.log("%c[DEBUG Supabase] AUTH updateUser - Success", "color: #059669");
        }

        const careHomeData = {
          organization_id: orgId,
          name: values.name,
          created_by: profile.id
        };
        console.log("%c[DEBUG Supabase] Creating care home", "background: #1e3a8a; color: #ffffff");
        console.log("%c[DEBUG Supabase] INSERT care_homes - Request", "color: #059669", careHomeData);
        
        // 1. Create the Care Home
        const { data: careHome, error: careHomeError } = await supabase
          .from("care_homes")
          .insert(careHomeData)
          .select()
          .single();

        if (careHomeError) {
          console.error("%c[DEBUG Supabase] INSERT care_homes - Error", "color: #dc2626", careHomeError);
          console.error("%c[DEBUG Context] Full error details", "color: #dc2626", {
            error: careHomeError,
            user: profile,
            dbUser: await supabase.from('users').select('*').eq('id', profile.id).single(),
            organizationId: orgId
          });
          throw careHomeError;
        }

        console.log("%c[DEBUG Supabase] INSERT care_homes - Response", "color: #059669", careHome);

        // 2. Set this as the active care home in the users table
        const activeHomeData = {
          active_care_home_id: careHome.id,
          updated_at: new Date().toISOString()
        };
        console.log("%c[DEBUG Supabase] UPDATE users (active care home) - Request", "color: #059669", activeHomeData);
        
        const { error: userUpdateError } = await supabase
          .from("users")
          .update(activeHomeData)
          .eq("id", profile.id);

        if (userUpdateError) {
          console.error("%c[DEBUG Supabase] UPDATE users - Error", "color: #dc2626", userUpdateError);
          throw userUpdateError;
        }

        console.log("%c[DEBUG Supabase] UPDATE users - Success", "color: #059669");

        // Sync with auth metadata
        const authCareHomeData = { active_care_home_id: careHome.id };
        console.log("%c[DEBUG Supabase] AUTH updateUser (care home) - Request", "color: #059669", authCareHomeData);
        
        await supabase.auth.updateUser({ data: authCareHomeData });
        console.log("%c[DEBUG Supabase] AUTH updateUser - Success", "color: #059669");

        // 3. Handle Logo Upload if selected
        if (selectedFile) {
          console.log("%c[DEBUG Supabase] Uploading logo", "background: #1e3a8a; color: #ffffff");
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${orgId}-${Math.random()}.${fileExt}`;
          const filePath = `org-logos/${fileName}`;

          console.log("%c[DEBUG Supabase] STORAGE upload - Request", "color: #059669", {
            filePath,
            fileName: selectedFile.name,
            fileSize: selectedFile.size
          });

          const { error: uploadError } = await supabase.storage
            .from('careo-public')
            .upload(filePath, selectedFile);

          if (uploadError) {
            console.error("%c[DEBUG Supabase] STORAGE upload - Error", "color: #dc2626", uploadError);
            throw uploadError;
          }

          const finalLogoUrl = buildStorageObjectUrl("careo-public", filePath);

          console.log("%c[DEBUG Supabase] STORAGE proxy URL", "color: #059669", finalLogoUrl);

          const logoUpdateData = {
            logo_url: finalLogoUrl,
            updated_at: new Date().toISOString()
          };
          console.log("%c[DEBUG Supabase] UPDATE organizations (logo) - Request", "color: #059669", logoUpdateData);
          
          const { error: orgUpdateError } = await supabase
            .from("organizations")
            .update(logoUpdateData)
            .eq("id", orgId);

          if (orgUpdateError) {
            console.error("%c[DEBUG Supabase] UPDATE organizations - Error", "color: #dc2626", orgUpdateError);
            throw orgUpdateError;
          }

          console.log("%c[DEBUG Supabase] UPDATE organizations - Success", "color: #059669");
        }

        await refreshProfile();
        console.log("%c[DEBUG CareHomeForm] Onboarding complete - moving to next step", "background: #059669; color: #ffffff");
        setStep(step + 1);
      } catch (error: any) {
        console.error("%c[DEBUG CareHomeForm] Error creating care home", "color: #dc2626", error);
        console.error("%c[DEBUG Context] Error context", "color: #dc2626", {
          error,
          userProfile: profile,
          formValues: values,
          activeOrganizationId: orgId
        });
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
