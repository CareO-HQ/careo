"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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
    const { data: activeMember, isPending: isMemberPending } = authClient.useActiveMember();
    const currentUser = useQuery(api.users.getCurrentUserContext);
    
    // Check SaaS Admin status
    const isSaasAdmin = (currentUser?.user as any)?.isSaasAdmin === true;
    
    // Determine effective role
    const userRole = activeMember?.role as string | undefined;
    const effectiveRole = isSaasAdmin ? "saas_admin" : userRole;
    const isPending = isMemberPending || currentUser === undefined;

    useEffect(() => {
      if (!isPending && effectiveRole) {
        if (!allowedRoles.includes(effectiveRole)) {
          router.push(redirectTo as Route);
          toast.error("You don't have permission to access this page");
        }
      }
    }, [effectiveRole, isPending, router, redirectTo]);

    // Show loading state while checking permissions
    if (isPending || !effectiveRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      );
    }

    // If role is not allowed, return null (redirect will happen)
    if (!allowedRoles.includes(effectiveRole)) {
      return null;
    }

    return <Component {...props} />;
  };
}
