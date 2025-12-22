"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { ShieldCheck } from "lucide-react";
import { useConvex } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function SaasAdminTwoFactorPage() {
  const [code, setCode] = useState("");
  const [isLoading, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const convex = useConvex();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Email is required");
      return;
    }

    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    startTransition(async () => {
      try {
        await authClient.twoFactor.verifyOtp(
          {
            code: code
          },
          {
            onSuccess: async () => {
              // Verify SaaS admin status after 2FA
              const userFromDb = await convex.query(api.user.getUserByEmail, {
                email: email
              });

              if (!userFromDb?.isSaasAdmin) {
                toast.error("Access denied. SaaS admin credentials required.");
                await authClient.signOut();
                router.push("/saas-admin/login");
                return;
              }

              // Redirect to SaaS admin dashboard
              router.push("/saas-admin/dashboard");
            },
            onError: (ctx) => {
              toast.error(
                ctx.error.message || "Invalid OTP. Please try again."
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
    <div className="flex flex-col justify-center items-center h-dvh w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
            <p className="text-sm text-muted-foreground">
              SaaS Admin Portal
            </p>
          </div>
        </div>
      </div>

      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <CardTitle>Enter Verification Code</CardTitle>
          <CardDescription>
            Please enter the 6-digit code sent to your email
            {email && ` (${email})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={isLoading}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

