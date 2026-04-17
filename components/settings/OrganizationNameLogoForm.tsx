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
import { useTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { buildStorageObjectUrl } from "@/lib/storage";
import ImageSelector from "../onboarding/profile/ImageSelector";

interface OrganizationNameLogoFormProps {
  name: string;
  logoUrl: string;
  isPending: boolean;
  canEdit: boolean;
  onSuccess?: () => void;
}

export default function OrganizationNameLogoForm({
  name,
  logoUrl,
  isPending,
  canEdit,
  onSuccess
}: OrganizationNameLogoFormProps) {
  const { supabase } = useSupabase();
  const { profile } = useProfile();
  const [isLoading, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof organizationNameSchema>>({
    resolver: zodResolver(organizationNameSchema),
    defaultValues: {
      name: "",
      logoUrl: ""
    }
  });

  // Update form values when the name or logoUrl prop changes
  useEffect(() => {
    if (name || logoUrl) {
      form.reset({
        name: name,
        logoUrl: logoUrl
      });
    }
  }, [name, logoUrl, form]);

  const onSubmit = (values: z.infer<typeof organizationNameSchema>) => {
    startTransition(async () => {
      if (!supabase || !profile?.active_organization_id) return;

      if (!canEdit) {
        toast.error("You don't have permission to update organization settings");
        return;
      }

      try {
        let finalLogoUrl = values.logoUrl;

        // Handle logo upload if selected
        if (selectedFile) {
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${profile.active_organization_id}-${Math.random()}.${fileExt}`;
          const filePath = `organization-logos/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('careo-public')
            .upload(filePath, selectedFile);

          if (uploadError) throw uploadError;

          finalLogoUrl = buildStorageObjectUrl("careo-public", filePath);
        }

        const { error } = await supabase
          .from('organizations')
          .update({
            name: values.name,
            logo_url: finalLogoUrl
          })
          .eq('id', profile.active_organization_id);

        if (error) throw error;

        toast.success("Organization details updated");
        setSelectedFile(null);
        onSuccess?.();
      } catch (error: any) {
        toast.error("Failed to update organization details");
        console.error("Error updating organization:", error);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <div className={!canEdit ? "pointer-events-none opacity-60" : ""}>
          <ImageSelector
            currentImageUrl={logoUrl}
            fileId={undefined}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            userInitial={name.charAt(0)}
          />
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder={isPending ? "Loading..." : "Organization Name"}
                  disabled={!canEdit || isLoading || isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={!canEdit || isLoading || isPending}>
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  );
}
