"use client";

import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SaasAdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const isSaasAdmin = useQuery(api.saasAdmin.getCurrentUserSaasAdminStatus);
  const [mounted, setMounted] = useState(false);

  // Ensure we only run checks after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect if user is logged in but NOT a SaaS admin
    // Don't redirect if they're on the login page (let them see the login form)
    if (mounted && session && isSaasAdmin === false) {
      const currentPath = window.location.pathname;
      // Only redirect if they're trying to access protected SaaS admin routes (not login pages)
      if (
        currentPath.startsWith("/saas-admin/dashboard") ||
        currentPath.startsWith("/saas-admin/")
      ) {
        // Don't redirect if on login or two-factor pages
        if (
          !currentPath.includes("/login") &&
          !currentPath.includes("/two-factor")
        ) {
          router.push("/dashboard");
        }
      }
    }
  }, [mounted, session, isSaasAdmin, router]);

  // During SSR and initial hydration, just render children
  // This ensures server and client render the same initially
  if (!mounted) {
    return <>{children}</>;
  }

  // Show loading state while checking SaaS admin status (client-side only)
  if (session && isSaasAdmin === undefined) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

