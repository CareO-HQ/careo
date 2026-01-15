"use client";

import AuthCard from "@/components/auth/AuthCard";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (session && !isPending) {
      const redirect = searchParams.get("redirect");
      const token = searchParams.get("token");
      const email = searchParams.get("email");

      if (redirect === "accept-invitation" && token) {
        const params = new URLSearchParams();
        params.set("token", token);
        if (email) {
          params.set("email", email);
        }
        router.push(`/accept-invitation?${params.toString()}`);
        return;
      }

      router.push("/onboarding");
    }
  }, [session, isPending, router, searchParams]);

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

  return <AuthCard action="login" google microsoft />;
}

export default function LoginPage() {
  return (
    <div className="flex flex-col justify-center items-center h-dvh w-full">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
