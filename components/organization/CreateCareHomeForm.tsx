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
import { CreateNewOrgSchema } from "@/schemas/CreateNewOrgSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import LogoSelector from "../onboarding/organization/LogoSelector";

const CreateCareHomeSchema = CreateNewOrgSchema.extend({
  managerEmail: z
    .string()
    .email("Enter a valid manager email")
    .optional()
    .or(z.literal(""))
});

export default function CreateCareHomeForm({
  onSuccess
}: {
  onSuccess: () => void;
}) {
  const [isLoading, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { profile, refresh: refreshProfile } = useProfile();
  const { supabase } = useSupabase();

  const form = useForm<z.infer<typeof CreateCareHomeSchema>>({
    resolver: zodResolver(CreateCareHomeSchema),
    defaultValues: {
      name: "",
      managerEmail: ""
    }
  });

  // Submit handler - creates a CARE HOME in the Supabase care_homes table
  function onSubmit(values: z.infer<typeof CreateCareHomeSchema>) {
    startTransition(async () => {
      try {
        if (!profile) {
          toast.error("Profile not found");
          return;
        }

        const organizationId = profile.active_organization_id;
        if (!organizationId) {
          toast.error("No organization found. Please complete onboarding first.");
          return;
        }

        // Create care home in Supabase care_homes table
        const { data: careHome, error: careHomeError } = await supabase
          .from("care_homes")
          .insert({
            organization_id: organizationId,
            name: values.name,
            created_by: profile.id
          })
          .select()
          .single();

        if (careHomeError) {
          console.error("Error creating care home:", careHomeError);
          if (careHomeError.message?.includes("duplicate") || careHomeError.code === "23505") {
            form.setError("name", {
              message: "A Care home with this name already exists"
            });
          } else {
            toast.error(careHomeError.message || "Error creating Care home");
          }
          return;
        }

        // Upload care home logo if provided
        if (selectedFile && careHome) {
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${careHome.id}-${Math.random()}.${fileExt}`;
          const filePath = `care-home-logos/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('careo-public')
            .upload(filePath, selectedFile);

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('careo-public')
              .getPublicUrl(filePath);

            // Update care home with logo URL (if care_homes table has logo_url column)
            // For now, we can store it in a separate files table or skip
            console.log("Logo uploaded:", publicUrlData.publicUrl);
          } else {
            console.error("Logo upload error:", uploadError);
          }
        }

        // Optionally invite a manager for this care home
        if (values.managerEmail && careHome) {
          const { error: inviteError } = await supabase
            .from("invitations")
            .insert({
              email: values.managerEmail,
              role: "manager",
              organization_id: organizationId,
              care_home_id: careHome.id,
              status: "pending",
              token: crypto.randomUUID(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
              created_by: profile.id
            });

          if (inviteError) {
            console.error("Error inviting manager:", inviteError);
            toast.error("Care home created, but failed to invite manager");
          }
        }

        toast.success("Care home created successfully");
        // Reset form
        form.reset();
        setSelectedFile(null);
        // Refresh profile to pick up any changes
        await refreshProfile();
        // Close modal and refresh
        onSuccess();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error creating Care home";
        console.error("Error creating care home:", error);
        toast.error(errorMessage);
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
          name="managerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Manager email (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="manager@carehome.com"
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
