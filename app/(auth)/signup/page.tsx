"use client";

import AuthCard from "@/components/auth/AuthCard";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function SignupPage() {
  const { data: session } = authClient.useSession();
  if (session) {
    redirect("/dashboard");
  }
  return (
    <div className="flex flex-col justify-center items-center h-dvh w-full">
      <Suspense fallback={<div>Loading...</div>}>
        <AuthCard action="signup" google microsoft />
      </Suspense>
    </div>
  );
}
