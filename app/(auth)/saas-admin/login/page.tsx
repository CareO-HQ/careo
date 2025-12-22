"use client";

import SaasAdminLoginForm from "@/components/auth/forms/SaasAdminLoginForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { ShieldCheck } from "lucide-react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function SaasAdminLoginPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  
  // Check if user is SaaS admin if session exists
  const isSaasAdmin = useQuery(
    api.saasAdmin.getCurrentUserSaasAdminStatus,
    session ? {} : undefined
  );

  // Redirect if already logged in as SaaS admin
  useEffect(() => {
    if (session && isSaasAdmin === true) {
      router.push("/saas-admin/dashboard");
    } else if (session && isSaasAdmin === false) {
      // If logged in but not SaaS admin, redirect to regular dashboard
      router.push("/dashboard");
    }
  }, [session, isSaasAdmin, router]);

  // Show loading while checking SaaS admin status
  if (session && isSaasAdmin === undefined) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // If already logged in as SaaS admin, show loading (redirect will happen in useEffect)
  if (session && isSaasAdmin === true) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center h-dvh w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SaaS Admin Portal</h1>
            <p className="text-sm text-muted-foreground">
              Secure administrative access
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle>SaaS Admin Login</CardTitle>
            <CardDescription>
              Enter your SaaS admin credentials to access the administrative
              portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SaasAdminLoginForm />
          </CardContent>
          <CardFooter className="flex-col justify-start gap-2 flex items-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground group transition-all"
            >
              Regular user?{" "}
              <span className="text-primary group-hover:underline">
                Login here
              </span>
            </Link>
          </CardFooter>
        </Card>
      </Suspense>

      <p className="text-xs text-muted-foreground max-w-xs text-center mt-6">
        This is a restricted access area. Only authorized SaaS administrators
        may access this portal.
      </p>
    </div>
  );
}

