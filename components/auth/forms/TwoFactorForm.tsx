"use client";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from "@/components/ui/input-otp";
import { supabase } from "@/lib/supabase";
import {
  TwoFactorFormData,
  TwoFactorSchema
} from "@/schemas/auth/TwoFactorSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function TwoFactorForm() {
  const [isLoading, startTransition] = useTransition();
  const [email] = useQueryState("email");
  const router = useRouter();
  const form = useForm<TwoFactorFormData>({
    resolver: zodResolver(TwoFactorSchema),
    defaultValues: {
      code: ""
    }
  });

  function onSubmit(values: TwoFactorFormData) {
    startTransition(async () => {
      try {
        console.log("Two-factor code:", values.code);

        const { data, error } = await supabase.auth.verifyOtp({
          email: email as string,
          token: values.code,
          type: 'email',
        });

        if (error) {
          toast.error(error.message || "Invalid code. Please try again.");
          return;
        }

        if (data.session) {
          // Fetch user data from public.users
          const { data: userFromDb, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", data.session.user.id)
            .single();

          if (userError) {
            console.error("Error fetching user data:", userError);
            // Even if fetching user data fails, we might still want to redirect, 
            // but lacking roles might be an issue. 
            // For now, assume basic user and redirect to dashboard.
          }

          // #region agent log
          console.log("[DEBUG TwoFactorForm] User data after 2FA", {
            email: email,
            isOnboardingComplete: userFromDb?.is_onboarding_complete,
            isSaasAdmin: userFromDb?.is_saas_admin,
            hypothesisId: "D"
          });
          // #endregion

          // Check active organizations for non-SaaS Admin
          if (!userFromDb?.is_saas_admin) {
            // Check if user has active organizations
            // We can check memberships or just if active_organization_id is set?
            // Convex code checked if activeOrgs.length === 0.
            // We can check organisation_members table.
            const { count } = await supabase
              .from("organization_members")
              .select("id", { count: 'exact', head: true })
              .eq("user_id", data.session.user.id);

            if (count === 0) {
              toast.error("Your account has no active organizations. Please contact support.");
              return;
            }
          }

          if (userFromDb?.is_onboarding_complete) {
            if (userFromDb.is_saas_admin) {
              router.push("/admin");
            } else {
              router.push("/dashboard");
            }
          } else {
            router.push("/onboarding");
          }
        }
      } catch (error) {
        console.error("Two-factor verification error:", error);
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormControl>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || form.watch("code").length !== 6}
          >
            {isLoading ? "Verifying..." : "Verify Code"}
          </Button>
        </form>
      </Form>

      <CardFooter className="flex flex-row justify-center w-full mt-4">
        <Link
          href="/login"
          className="text-sm text-center text-primary hover:underline"
        >
          Back to login
        </Link>
      </CardFooter>
    </>
  );
}
