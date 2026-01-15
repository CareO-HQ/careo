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
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  const createCareHome = useMutation(api.rbac.careHomes.createCareHome);
  const createInvitationForManager = useMutation(api.customInvite.createInvitationForManager);
  const generateUploadUrlMutation = useMutation(api.files.image.generateUploadUrl);
  const sendImageMutation = useMutation(api.files.image.sendImage);

  const form = useForm<z.infer<typeof CreateCareHomeSchema>>({
    resolver: zodResolver(CreateCareHomeSchema),
    defaultValues: {
      name: "",
      managerEmail: ""
    }
  });

  // 2. Define a submit handler.
  // IMPORTANT: This form creates a CARE HOME in the Convex careHomes table,
  // NOT a Better Auth organization. Organizations are created separately.
  function onSubmit(values: z.infer<typeof CreateCareHomeSchema>) {
    startTransition(async () => {
      try {
        // Create care home in Convex careHomes table (NOT a Better Auth organization)
        const result = await createCareHome({
          name: values.name
        });
        
        if (result.success) {
          // Upload care home icon if provided
          if (selectedFile) {
            const uploadUrl = await generateUploadUrlMutation();
            const uploadResult = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": selectedFile.type },
              body: selectedFile
            });
            const { storageId } = await uploadResult.json();
            await sendImageMutation({
              storageId,
              type: "organization",
              organizationId: result.careHomeId
            });
          }

          // Optionally invite a manager for this care home
          if (values.managerEmail) {
            const inviteResult = await createInvitationForManager({
              email: values.managerEmail,
              role: "manager",
              careHomeId: result.careHomeId
            });
            if (!inviteResult.success) {
              toast.error(inviteResult.error || "Failed to invite manager");
            }
          }

          toast.success("Care home created successfully");
          // Reset form
          form.reset();
          setSelectedFile(null);
          // Close modal and refresh
          onSuccess();
          // Force a small delay to ensure Convex query updates
          setTimeout(() => {
            // Query will automatically refresh due to Convex reactivity
          }, 100);
        } else {
          toast.error("Error creating Care home");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error creating Care home";
        if (errorMessage.includes("already exists") || errorMessage.includes("already assigned")) {
          form.setError("name", {
            message: "A Care home with this name already exists"
          });
        } else {
          toast.error(errorMessage);
        }
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
