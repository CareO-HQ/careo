"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import { SaveOnboardingOrganizationForm } from "@/schemas/SaveOnboardingOrganizationForm";
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
import LogoSelector from "./LogoSelector";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTransition, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function OrganizationForm({
  step,
  setStep
}: {
  step: number;
  setStep: (step: number) => void;
}) {
  const [isLoading, startTransition] = useTransition();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const getOrganizationLogoQuery = useQuery(
    api.files.image.getOrganizationLogo,
    activeOrganization?.name ? {} : "skip"
  );
  const generateUploadUrlMutation = useMutation(
    api.files.image.generateUploadUrl
  );
  const sendImageMutation = useMutation(api.files.image.sendImage);
  const deleteImageMutation = useMutation(api.files.image.deleteById);
  console.log("activeOrganization", activeOrganization);

  const form = useForm<z.infer<typeof SaveOnboardingOrganizationForm>>({
    resolver: zodResolver(SaveOnboardingOrganizationForm),
    defaultValues: {
      name: "",
      exampleData: false
    }
  });

  useEffect(() => {
    if (activeOrganization?.name) {
      form.setValue("name", activeOrganization.name);
    }
  }, [activeOrganization?.name, form]);

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof SaveOnboardingOrganizationForm>) {
    startTransition(async () => {
      const handleImageUpload = async () => {
        if (selectedFile) {
          if (getOrganizationLogoQuery?.storageId) {
            await deleteImageMutation({
              fileId: getOrganizationLogoQuery.storageId
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
            type: "organization",
          });
          console.log("userLogo", getOrganizationLogoQuery);
        }
      };

      if (activeOrganization?.name) {
        await authClient.organization.update(
          {
            data: {
              name: values.name,
              slug: values.name.toLowerCase().replace(/ /g, "-")
            }
          },
          {
            onError: (ctx) => {
              toast.error("Error updating care home");
            },
            onSuccess: async () => {
              await handleImageUpload();
              setStep(step + 1);
            }
          }
        );
      } else {
        await authClient.organization.create(
          {
            name: values.name,
            slug: values.name.toLowerCase().replace(/ /g, "-")
          },
          {
            onError: (ctx) => {
              if (ctx.error.code === "ORGANIZATION_ALREADY_EXISTS") {
                form.setError("name", {
                  message: "A care home with this name already exists"
                });
                return;
              }
              toast.error("Error creating care home");
            },
            onSuccess: async () => {
              await handleImageUpload();
              setStep(step + 1);
            }
          }
        );
      }
    });

    // Do something with the form values.
    // ✅ This will be type-safe and validated.
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <LogoSelector
          disabled={isLoading}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          currentImageUrl={getOrganizationLogoQuery?.url}
          fileId={getOrganizationLogoQuery?.storageId}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel isRequired>Care home name</FormLabel>
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

        <Button type="submit" className="w-24 mt-4" disabled={isLoading}>
          Continue
        </Button>
      </form>
    </Form>
  );
}
