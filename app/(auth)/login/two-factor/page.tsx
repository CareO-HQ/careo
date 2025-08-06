"use client";

import TwoFactorForm from "@/components/auth/forms/TwoFactorForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function TwoFactorPage() {
  const { data: session } = authClient.useSession();
  if (session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col justify-center items-center h-dvh px-4 w-full">
      <div className="flex items-center gap-2 mb-6">
        <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
        <p className="font-semibold">Acme Inc.</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="w-full">
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code we have sent to your email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <TwoFactorForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
