"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
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
import { sendOwnerInvitationEmail } from "@/app/actions/invitations";

const createOwnerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  organizationName: z.string().min(1, "Organization name is required")
});

type CreateOwnerFormData = z.infer<typeof createOwnerSchema>;

export default function CreateOwnerPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const form = useForm<CreateOwnerFormData>({
    resolver: zodResolver(createOwnerSchema),
    defaultValues: {
      email: "",
      name: "",
      organizationName: ""
    }
  });

  // Redirect if not SaaS Admin
  useEffect(() => {
    if (!isProfileLoading && profile && !profile.is_saas_admin) {
      router.push("/dashboard");
    }
  }, [profile, isProfileLoading, router]);

  const onSubmit = (values: CreateOwnerFormData) => {
    startTransition(async () => {
      try {
        // 1. Create Organization
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: values.organizationName,
            slug: values.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // 2. Create Organization Status
        const { error: statusError } = await supabase
          .from("organization_status")
          .insert({
            organization_id: org.id,
            status: "active"
          });

        if (statusError) throw statusError;

        // 3. Create Invitation for Owner
        const { data: invite, error: inviteError } = await supabase
          .from("invitations")
          .insert({
            email: values.email,
            organization_id: org.id,
            role: "owner",
            token: crypto.randomUUID(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            invited_by: profile?.id
          })
          .select()
          .single();

        if (inviteError) throw inviteError;

        // 4. Send Invitation Email
        const emailResult = await sendOwnerInvitationEmail({
          email: values.email,
          careHomeName: values.organizationName,
          inviterName: profile?.name || "Platform Administrator",
          token: invite.token
        });

        if (!emailResult.success) {
          console.warn("Invitation email failed to send:", emailResult.error);
          toast.warning(
            `Organization created, but the invitation email to ${values.email} could not be sent. You can try resending it later.`
          );
        } else {
          toast.success(
            `Organization "${values.organizationName}" created successfully. An invitation email has been sent to ${values.email}.`
          );
        }

        router.push("/admin/owners");
      } catch (error: any) {
        console.error("Error creating owner:", error);
        toast.error(error.message || "An error occurred while creating the owner");
      }
    });
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!profile?.is_saas_admin) {
    return null;
  }

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
