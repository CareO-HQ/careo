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
import { personalDetailsSchema } from "@/schemas/settings/personalDetailsSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ImageSelector from "../onboarding/profile/ImageSelector";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { buildStorageObjectUrl } from "@/lib/storage";

interface PersonalDetailsFormProps {
  name: string;
  email: string;
  imageUrl: string;
  isPending: boolean;
}

export default function PersonalDetailsForm({
  name,
  email,
  imageUrl,
  isPending
}: PersonalDetailsFormProps) {
  const { supabase } = useSupabase();
  const { profile, refresh: refreshProfile } = useProfile();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, startTransition] = useTransition();

  const form = useForm<z.infer<typeof personalDetailsSchema>>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      name: name ?? "",
      email: email ?? "",
      imageUrl: imageUrl ?? ""
    }
  });

  const onSubmit = (values: z.infer<typeof personalDetailsSchema>) => {
    startTransition(async () => {
      if (!profile?.id) {
        toast.error("User profile not found");
        return;
      }

      try {
        let finalImageUrl = values.imageUrl;

        // 1. Handle image upload if selected
        if (selectedFile) {
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
          const filePath = `profile-images/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('careo-public')
            .upload(filePath, selectedFile);

          if (uploadError) throw uploadError;

          finalImageUrl = buildStorageObjectUrl("careo-public", filePath);
        }

        // 2. Update user in public.users table
        const { error: updateError } = await supabase
          .from("users")
          .update({
            name: values.name,
            image_url: finalImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq("id", profile.id);

        if (updateError) throw updateError;

        // 3. Update auth metadata (optional, but good for consistency)
        await supabase.auth.updateUser({
          data: {
            full_name: values.name,
            avatar_url: finalImageUrl
          }
        });

        await refreshProfile();
        toast.success("User updated successfully");
        setSelectedFile(null);
      } catch (error: any) {
        console.error("Error updating user:", error);
        toast.error(error.message || "Failed to update user");
      }
    });
  };

  useEffect(() => {
    form.setValue("name", name);
    form.setValue("email", email);
    form.setValue("imageUrl", imageUrl);
  }, [name, email, imageUrl, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <ImageSelector
          currentImageUrl={imageUrl}
          fileId={undefined} // StorageId not used in the same way with Supabase here
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          userInitial={name.charAt(0)}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder={isPending ? "Loading..." : "John Doe"}
                  disabled={isPending || isLoading}
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
              <FormLabel required>Email</FormLabel>
              <FormControl>
                <Input value={field.value} disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending || isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  );
}
