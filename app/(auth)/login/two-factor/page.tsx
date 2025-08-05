"use client";

import TwoFactorForm from "@/components/auth/forms/TwoFactorForm";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function TwoFactorPage() {
  const { data: session } = authClient.useSession();
  if (session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col justify-center items-center h-dvh px-4">
      <div className="flex items-center gap-2 mb-6">
        <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
        <p className="font-semibold">Acme Inc.</p>
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <Suspense fallback={<div>Loading...</div>}>
            <TwoFactorForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
