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
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, startTransition] = useTransition();

  const getUserLogoQuery = useQuery(
    api.files.image.getUserLogo,
    email ? {} : "skip"
  );

  const updateUser = useMutation(api.user.updateUserOnboarding);
  const generateUploadUrlMutation = useMutation(
    api.files.image.generateUploadUrl
  );
  const sendImageMutation = useMutation(api.files.image.sendImage);
  const deleteImageMutation = useMutation(api.files.image.deleteById);

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
      if (!email) {
        toast.error("User not found");
        return;
      }
      try {
        await updateUser({
          name: values.name,
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
          toast.success("User updated successfully");
        }
      } catch (error) {
        console.error("Error updating user:", error);
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
          currentImageUrl={getUserLogoQuery?.url}
          fileId={getUserLogoQuery?.storageId}
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
                  disabled={isPending}
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
        <Button type="submit" disabled={isLoading}>
          Save
        </Button>
      </form>
    </Form>
  );
}
