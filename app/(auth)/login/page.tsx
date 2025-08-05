"use client";

import AuthCard from "@/components/auth/AuthCard";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function LoginPage() {
  const { data: session } = authClient.useSession();
  if (session) {
    redirect("/onboarding");
  }
  return (
    <div className="flex flex-col justify-center items-center h-dvh">
      <Suspense fallback={<div>Loading...</div>}>
        <AuthCard action="login" google microsoft />
      </Suspense>
    </div>
  );
}
