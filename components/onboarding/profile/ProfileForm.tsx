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
import { api } from "@/convex/_generated/api";
import { OnboardingProfileFormSchema } from "@/schemas/SaveOnboardingProfileForm";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import React, { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import ImageSelector from "./ImageSelector";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Type for user data returned from getCurrentUser query
type User = {
  _id: string;
  name?: string;
  email: string;
  image?: string;
  phone?: string;
  // Add other user properties as needed
} | null;

export default function ProfileForm({
  step,
  setStep
}: {
  step: number;
  setStep: (step: number) => void;
}) {
  const [isLoading, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { profile, refresh: refreshProfile } = useProfile();

  const form = useForm<z.infer<typeof OnboardingProfileFormSchema>>({
    resolver: zodResolver(OnboardingProfileFormSchema),
    defaultValues: {
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      imageUrl: profile?.image_url || ""
    }
  });

  // Reset form when profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        imageUrl: profile.image_url || ""
      });
    }
  }, [profile, form]);


  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof OnboardingProfileFormSchema>) {
    startTransition(async () => {
      if (!profile) {
        toast.error("Profile not found");
        return;
      }
      try {
        let finalImageUrl = values.imageUrl;

        if (selectedFile) {
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
          const filePath = `avatars/${fileName}`;

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('careo-public')
            .upload(filePath, selectedFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('careo-public')
            .getPublicUrl(filePath);

          finalImageUrl = publicUrl;
        }

        const { error: updateError } = await supabase
          .from("users")
          .update({
            name: values.name,
            phone: values.phone,
            image_url: finalImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq("id", profile.id);

        if (updateError) throw updateError;

        // Sync with auth metadata
        await supabase.auth.updateUser({
          data: {
            name: values.name,
            phone: values.phone,
            avatar_url: finalImageUrl
          }
        });

        await refreshProfile();
        setStep(step + 1);
      } catch (error: any) {
        console.error("Error updating profile:", error);
        toast.error(error.message || "Failed to update profile");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <ImageSelector
          currentImageUrl={profile?.image_url || undefined}
          fileId={undefined}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          userInitial={profile?.name?.charAt(0) || ""}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
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
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input
                  placeholder=""
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Email</FormLabel>
              <FormControl>
                {/* TODO: This email cant be modified since is the one that the user logged in with */}
                <Input placeholder="" disabled className="w-full" {...field} />
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
