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
import { useMutation, useQuery } from "convex/react";
import React, { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import ImageSelector from "./ImageSelector";
import { toast } from "sonner";

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
  const user: User = useQuery(api.auth.getCurrentUser);

  const updateUser = useMutation(api.user.updateUserOnboarding);

  const generateUploadUrlMutation = useMutation(
    api.files.image.generateUploadUrl
  );
  const sendImageMutation = useMutation(api.files.image.sendImage);

  const getUserLogoQuery = useQuery(
    api.files.image.getUserLogo,
    user ? {} : "skip"
  );
  const deleteImageMutation = useMutation(api.files.image.deleteById);

  const form = useForm<z.infer<typeof OnboardingProfileFormSchema>>({
    resolver: zodResolver(OnboardingProfileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      imageUrl: user?.image || ""
    }
  });

  // Reset form when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        imageUrl: user.image || ""
      });
    }
  }, [user, form]);

  // Log getUserLogoQuery as soon as it's available
  useEffect(() => {
    if (getUserLogoQuery) {
      console.log("getUserLogoQuery:", getUserLogoQuery);
    }
  }, [getUserLogoQuery]);

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof OnboardingProfileFormSchema>) {
    startTransition(async () => {
      if (!user) {
        toast.error("User not found");
        return;
      }
      try {
        await updateUser({
          name: values.name,
          phone: values.phone,
          imageUrl: values.imageUrl
        });
        if (selectedFile) {
          // Delete the old image
          if (getUserLogoQuery?.storageId) {
            await deleteImageMutation({
              fileId: getUserLogoQuery.storageId
            });
          }
          const uploadUrl = await generateUploadUrlMutation();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": selectedFile!.type },
            body: selectedFile
          });
          const { storageId } = await result.json();
          await sendImageMutation({
            storageId,
            type: "profile"
          });
          console.log("userLogo", getUserLogoQuery);
        }
        setStep(step + 1);
      } catch (error) {
        console.error("Error updating user:", error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <ImageSelector
          currentImageUrl={getUserLogoQuery?.url}
          fileId={getUserLogoQuery?.storageId}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          userInitial={user?.name?.charAt(0) || ""}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel isRequired>Name</FormLabel>
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
              <FormLabel isRequired>Email</FormLabel>
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
