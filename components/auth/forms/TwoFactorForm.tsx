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
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  TwoFactorFormData,
  TwoFactorSchema
} from "@/schemas/auth/TwoFactorSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvex } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
        await authClient.twoFactor.verifyOtp(
          {
            code: values.code
          },
          {
            onSuccess: async () => {
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
