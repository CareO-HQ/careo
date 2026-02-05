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
      try {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              name: values.name,
              // Note: role and app_metadata should be handled server-side 
              // for security. Standard signUp data goes to user_metadata.
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          toast.success("Account created successfully!");

          if (token) {
            router.push(`/accept-invitation?token=${token}&email=${values.email}`);
          } else {
            // Re-fetch user to ensure metadata from trigger is available
            router.refresh();
            router.push("/onboarding");
          }
        }
      } catch (err: any) {
        console.error("Signup failed:", err);
        toast.error(err.message || "Error trying to signup");
        posthog.captureException(err, {
          name: values.name,
          email: values.email,
          custom_message: "Error signing up with Supabase"
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
