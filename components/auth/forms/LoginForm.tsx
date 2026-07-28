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
import { supabase } from "@/lib/supabase";
import { LoginFormSchema } from "@/schemas/auth/LoginFormSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "lucide-react";
import { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import posthog from "posthog-js";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const [redirect] = useQueryState("redirect");
  const [token] = useQueryState("token");
  const [email] = useQueryState("email");
  const router = useRouter();

  const form = useForm<z.infer<typeof LoginFormSchema>>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  function onSubmit(values: z.infer<typeof LoginFormSchema>) {
    startTransition(async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (authError) throw authError;

        const user = authData.user;
        if (!user) throw new Error("No user found after login");

        // Check if the user is an MDT member and has login disabled
        const { data: dbUser } = await supabase
          .from("users")
          .select("role, is_login_allowed")
          .eq("id", user.id)
          .single();

        if (dbUser && (dbUser.role === "mdt" || dbUser.role === "rqia") && dbUser.is_login_allowed === false) {
          await supabase.auth.signOut();
          toast.error("Your account has been deactivated. Please contact your manager.");
          return;
        }

        const appMetadata = user.app_metadata || {};
        const isSaasAdmin = !!appMetadata.is_saas_admin;
        const isOnboardingComplete = !!appMetadata.is_onboarding_complete;
        const activeOrgId = appMetadata.active_organization_id;

        // Agency staff activating for the first time have no active org yet — allow through
        const isAgencyOnboarding = redirect === "onboarding-agency" && !!token;

        // Check for active organization (non-admin, non-agency-onboarding)
        if (!isSaasAdmin && !activeOrgId && !isAgencyOnboarding) {
          toast.error("Your account has no active organizations. Please contact support.");
          return;
        }

        if (isAgencyOnboarding) {
          // Build the redirect URL preserving token and email
          const params = new URLSearchParams();
          params.set("token", token!);
          if (email) params.set("email", email);
          router.push(`/onboarding/agency?${params.toString()}` as Route);
          return;
        }

        if (isOnboardingComplete) {
          if (isSaasAdmin) {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
        } else {
          if (redirect && token) {
            router.push(`/${redirect}?token=${token}` as Route);
          } else {
            router.push("/onboarding");
          }
        }

      } catch (err: any) {
        console.error("Login failed:", err);
        const errorMessage = err.message || "Invalid email or password";
        toast.error(errorMessage);
        posthog.captureException(err, {
          email: values.email,
          custom_message: "Error logging in with Supabase"
        });
      }
    });
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    icon={MailIcon}
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    required
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/reset-password"
                    className="text-xs hover:underline text-muted-foreground hover:text-primary"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <Input
                    icon={LockIcon}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    showPasswordToggle={
                      <Button
                        disabled={isLoading}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-md"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowPassword(!showPassword);
                        }}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </Button>
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            Login
          </Button>
        </form>
      </Form>
    </>
  );
}
