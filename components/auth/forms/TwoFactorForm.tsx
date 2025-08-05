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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from "@/components/ui/input-otp";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  TwoFactorFormData,
  TwoFactorSchema
} from "@/schemas/auth/TwoFactorSchema";
import { useConvex } from "convex/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function TwoFactorForm() {
  const [isLoading, startTransition] = useTransition();
  const [email] = useQueryState("email");
  const convex = useConvex();
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
        const { data, error } = await authClient.twoFactor.verifyOtp(
          {
            code: values.code
          },
          {
            onSuccess: async (ctx) => {
              toast.success("Two-factor authentication successful!");
              const userFromDb = await convex.query(api.user.getUserByEmail, {
                email: email as string
              });
              if (userFromDb?.isOnboardingComplete) {
                router.push("/dashboard");
              } else {
                router.push("/onboarding");
              }
            },
            onError: (ctx) => {
              toast.error(
                ctx.error.message || "Something went wrong. Please try again."
              );
            }
          }
        );
      } catch (error) {
        console.error("Two-factor verification error:", error);
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <ShieldCheckIcon className="mx-auto h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
        <p className="text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-center block">
                  Verification Code
                </FormLabel>
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

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Did you not receive a code?{" "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              // TODO: Implement resend functionality
              toast.info("Resend functionality not yet implemented");
            }}
          >
            Resend
          </button>
        </p>

        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
