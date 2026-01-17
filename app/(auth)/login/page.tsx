"use client";

import LoginForm from "@/components/auth/forms/LoginForm";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

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
      <div className="flex flex-col justify-center items-center min-h-screen w-full">
        <div>Loading...</div>
      </div>
    );
  }

  // If already logged in, show loading while redirecting
  if (session) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen w-full">
        <div>Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 min-h-screen w-full">
      {/* Left Panel - White Background with Image and Testimonial (Desktop Only) */}
      <div className="hidden lg:flex flex-col justify-center bg-white p-12 relative">
        {/* Center Image */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-md aspect-square">
            <Image
              src="/cade.png"
              alt="Healthcare Management"
              fill
              className="object-contain rounded-lg"
              priority
            />
          </div>
        </div>

        {/* Testimonial at bottom */}
        <div className="space-y-4 mt-8">
          <blockquote className="text-lg leading-relaxed text-zinc-900">
            &quot;Care simplified, an empathy driven tool for care teams, freedom a few clicks away&quot;
          </blockquote>
          <p className="text-sm text-zinc-600">
            - Team CareO
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-col justify-center items-center p-4 sm:p-8 bg-white min-h-screen">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Mobile Logo and Image */}
          <div className="lg:hidden space-y-6">
            {/* Logo */}
            <div className="flex items-center justify-center">
              <Image
                src="/Logo_CareO.png"
                alt="CareO Logo"
                width={140}
                height={47}
                className="object-contain"
              />
            </div>

            {/* Mobile Image */}
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <Image
                  src="/cade.png"
                  alt="Healthcare Management"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Mobile Testimonial */}
            <div className="space-y-2 text-center px-4">
              <p className="text-sm leading-relaxed text-zinc-700">
                &quot;Care simplified, an empathy driven tool for care teams, freedom a few clicks away&quot;
              </p>
              <p className="text-xs text-zinc-500">
                - Team CareO
              </p>
            </div>
          </div>

          {/* Desktop Logo */}
          <div className="hidden lg:flex items-center justify-center">
            <Image
              src="/Logo_CareO.png"
              alt="CareO Logo"
              width={150}
              height={50}
              className="object-contain"
            />
          </div>

          {/* Header */}
          <div className="space-y-2 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials below to access your account
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <LoginForm />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  New to CareO?
                </span>
              </div>
            </div>

            {/* Sign up link */}
            <div className="text-center">
              <Link
                href="/signup"
                className="text-sm font-medium text-primary hover:underline"
              >
                Create an account
              </Link>
            </div>
          </div>

          {/* Footer Links */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-muted-foreground pt-4 sm:pt-8">
            <Link href="/terms" className="hover:text-primary hover:underline">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-primary hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center min-h-screen w-full">
        <div>Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
