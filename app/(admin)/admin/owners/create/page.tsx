"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { toast } from "sonner";
import { useQuery } from "convex/react";

const createOwnerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  organizationName: z.string().min(1, "Organization name is required")
});

type CreateOwnerFormData = z.infer<typeof createOwnerSchema>;

export default function CreateOwnerPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const saasAdminStatus = useQuery(api.saasAdmin.getSaasAdminStatus);
  const createOwner = useMutation(api.saasAdmin.createCareHomeOwner);

  const form = useForm<CreateOwnerFormData>({
    resolver: zodResolver(createOwnerSchema),
    defaultValues: {
      email: "",
      name: "",
      organizationName: ""
    }
  });

  // Redirect if not SaaS Admin
  if (saasAdminStatus && !saasAdminStatus.isSaasAdmin) {
    router.push("/dashboard");
    return null;
  }

  const onSubmit = (values: CreateOwnerFormData) => {
    startTransition(async () => {
      try {
        const result = await createOwner({
          email: values.email,
          name: values.name,
          organizationName: values.organizationName
        });

        if (result.success) {
          toast.success(
            `Organization "${values.organizationName}" created successfully. An invitation email has been sent to ${values.email}. The owner will create care homes during onboarding or through the dashboard.`
          );
          if (result.organizationId) {
            router.push(`/admin/care-homes/${result.organizationId}`);
          } else {
            router.push("/admin/owners");
          }
        } else {
          toast.error(result.error || "Failed to create owner");
        }
      } catch (error) {
        console.error("Error creating owner:", error);
        toast.error("An error occurred while creating the owner");
      }
    });
  };

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Create Owner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a new owner and their organization
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Owner Information</CardTitle>
          <CardDescription>
            Enter the details for the new owner. They will receive an invitation email to join the organization. The owner can then create care homes within their organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Owner Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} disabled={isPending} />
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
                    <FormLabel required>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="owner@example.com"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      The owner will receive an invitation email at this address
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Organization Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Sunset Organization"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      The name of the organization. The owner will create care homes within this organization during onboarding or through the dashboard sidebar after accepting the invitation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <div className="flex gap-4">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Owner"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
