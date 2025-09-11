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
      let organizationId: string | undefined;
      let organizationCreated = false;

      if (activeOrganization?.name) {
        // Updating existing organization
        await authClient.organization.update(
          {
            data: {
              name: values.name,
              slug: values.name.toLowerCase().replace(/ /g, "-")
            }
          },
          {
            onError: () => {
              toast.error("Error updating organization");
            },
            onSuccess: () => {
              // For existing organizations, we already have the ID
              organizationId = activeOrganization.id;
            }
          }
        );
      } else {
        // Creating new organization
        await authClient.organization.create(
          {
            name: values.name,
            slug: values.name.toLowerCase().replace(/ /g, "-")
          },
          {
            onError: (ctx) => {
              if (ctx.error.code === "ORGANIZATION_ALREADY_EXISTS") {
                form.setError("name", {
                  message: "A Care home with this name already exists"
                });
                return;
              }
              toast.error("Error creating Care home");
            },
            onSuccess: () => {
              organizationCreated = true;
            }
          }
        );

        // If organization was created successfully, wait a moment for the session to update
        if (organizationCreated) {
          // Small delay to allow Better Auth session to update with the new active organization
          await new Promise((resolve) => setTimeout(resolve, 1000));
          organizationId = "session-based"; // Use a placeholder to indicate we should rely on session
        }
      }

      // Only upload image after organization is created/updated and we have the ID
      if (selectedFile && organizationId) {
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
          organizationId:
            organizationId !== "session-based" ? organizationId : undefined // Pass the organization ID explicitly, or rely on session for new orgs
        });
        console.log("userLogo", getOrganizationLogoQuery);
      }

      // Move to next step only after everything is complete
      setStep(step + 1);
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

        <Button type="submit" className="w-24 mt-4" disabled={isLoading}>
          Continue
        </Button>
      </form>
    </Form>
  );
}
