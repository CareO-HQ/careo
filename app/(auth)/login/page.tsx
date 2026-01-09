"use client";

import AuthCard from "@/components/auth/AuthCard";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (session && !isPending) {
      router.push("/onboarding");
    }
  }, [session, isPending, router]);

  // Show loading while checking session or redirecting
  if (isPending) {
    return (
      <div className="flex flex-col justify-center items-center h-dvh w-full">
        <div>Loading...</div>
      </div>
    );
  }

  // If already logged in, show loading while redirecting
  if (session) {
    return (
      <div className="flex flex-col justify-center items-center h-dvh w-full">
        <div>Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center h-dvh w-full">
      <Suspense fallback={<div>Loading...</div>}>
        <AuthCard action="login" google microsoft />
      </Suspense>
    </div>
  );
}
