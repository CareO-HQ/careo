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
import { authClient } from "@/lib/auth-client";
import { SignupFormSchema } from "@/schemas/auth/SignupFormSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import posthog from "posthog-js";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const [token] = useQueryState("token");
  const [invitationEmail] = useQueryState("email");

  const router = useRouter();

  const form = useForm<z.infer<typeof SignupFormSchema>>({
    resolver: zodResolver(SignupFormSchema),
    defaultValues: {
      name: "",
      email: invitationEmail ?? "",
      password: ""
    }
  });

  function onSubmit(values: z.infer<typeof SignupFormSchema>) {
    startTransition(async () => {
      await authClient.signUp.email(
        {
          name: values.name,
          email: values.email,
          password: values.password
        },
        {
          onError: (ctx) => {
            toast.error("Error trying to signup");
            posthog.captureException(ctx.error, {
              name: values.name,
              email: values.email,
              custom_message: "Error signing up"
            });
          },
          onSuccess: () => {
            console.log("REDIRECTING WITH TOKEN", token);
            if (token) {
              router.push(`/accept-invitation?token=${token}`);
            } else {
              router.push("/onboarding");
            }
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    icon={UserIcon}
                    id="name"
                    type="text"
                    placeholder="John Doe"
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
                    disabled={isLoading || !!invitationEmail}
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
                <FormLabel>Password</FormLabel>
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
            Create account
          </Button>
        </form>
      </Form>
    </>
  );
}
