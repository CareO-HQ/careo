"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";

/**
 * Higher-order component to protect routes based on user role
 * 
 * @param Component - The component to protect
 * @param allowedRoles - Array of roles that can access this route
 * @param redirectTo - Route to redirect to if access is denied (default: "/dashboard")
 * @returns Protected component
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: string[],
  redirectTo: string = "/dashboard"
) {
  return function GuardedComponent(props: P) {
    const router = useRouter();
    const { profile, isLoading: isProfileLoading } = useProfile();
    const { isLoading: isSupabaseLoading } = useSupabase();

    // Check SaaS Admin status
    const isSaasAdmin = profile?.is_saas_admin === true;

    // Determine effective role
    const effectiveRole = isSaasAdmin ? "saas_admin" : profile?.role;
    const isPending = isProfileLoading || isSupabaseLoading;

    useEffect(() => {
      if (!isPending && effectiveRole) {
        if (!allowedRoles.includes(effectiveRole)) {
          router.push(redirectTo as Route);
          toast.error("You don't have permission to access this page");
        }
      } else if (!isPending && !profile) {
        // If no profile and not loading, redirect to login?
        // The middleware usually handles this, but good to have a backup.
        router.push("/login" as Route);
      }
    }, [effectiveRole, isPending, router, redirectTo, profile]);

    // Show loading state while checking permissions
    if (isPending) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      );
    }

    // If role is not allowed, return null (redirect will happen)
    if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
      return null;
    }

    return <Component {...props} />;
  };
}
