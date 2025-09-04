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
import { authClient } from "@/lib/auth-client";
import { LoginFormSchema } from "@/schemas/auth/LoginFormSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvex } from "convex/react";
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
  const convex = useConvex();
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
      await authClient.signIn.email(
        {
          email: values.email,
          password: values.password
        },
        {
          async onSuccess(ctx) {
            if (ctx.data.twoFactorRedirect) {
              const { data, error } = await authClient.twoFactor.sendOtp({
                query: {
                  trustDevice: true
                }
              });
              if (error) {
                toast.error("Error sending OTP");
                return;
              }
              router.push(`/login/two-factor?email=${values.email}`);
              return;
            }
            const userFromDb = await convex.query(api.user.getUserByEmail, {
              email: values.email
            });
            if (userFromDb?.isOnboardingComplete) {
              router.push("/dashboard");
              return;
            } else {
              if (redirect && token) {
                router.push(`/${redirect}?token=${token}` as Route);
                return;
              } else {
                router.push("/onboarding");
                return;
              }
            }
          },
          onError: (ctx) => {
            if (ctx.error.code === "INVALID_EMAIL_OR_PASSWORD") {
              toast.error("Invalid email or password");
              return;
            }
            toast.error("Error trying to login");
            posthog.captureException(ctx.error, {
              email: values.email,
              custom_message: "Error login in"
            });
          }
        }
      );
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
