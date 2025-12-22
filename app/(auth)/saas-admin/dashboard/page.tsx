"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { ShieldCheck, Users, Building2, UserCheck, LogOut } from "lucide-react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

export default function SaasAdminDashboardPage() {
  // Call ALL hooks at the top, before any conditional returns
  // This ensures hooks are called in the same order on every render
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [canFetchData, setCanFetchData] = useState(false);
  const [saasAdminConfirmedAt, setSaasAdminConfirmedAt] = useState<number | null>(null);
  
  // This query acts as a "session readiness check" - if it succeeds, session is ready
  const isSaasAdmin = useQuery(
    api.saasAdmin.getCurrentUserSaasAdminStatus,
    session ? {} : "skip"
  );
  
  // Only query data if explicitly allowed - use "skip" instead of undefined
  const stats = useQuery(
    api.saasAdmin.getSaasAdminStats,
    canFetchData ? {} : "skip"
  );
  const organizations = useQuery(
    api.saasAdmin.getAllOrganizations,
    canFetchData ? {} : "skip"
  );
  const allUsers = useQuery(
    api.saasAdmin.getAllUsers,
    canFetchData ? {} : "skip"
  );
  
  // Only enable data fetching after isSaasAdmin query has successfully returned true
  // This ensures the session cookie is working before we make other queries
  useEffect(() => {
    if (session && isSaasAdmin === true) {
      // Track when we first confirmed SaaS admin status
      const now = Date.now();
      if (saasAdminConfirmedAt === null) {
        setSaasAdminConfirmedAt(now);
        return;
      }
      
      // Wait at least 1 second after confirmation before enabling queries
      // This ensures the session cookie is fully propagated
      const timeSinceConfirmation = now - saasAdminConfirmedAt;
      if (timeSinceConfirmation >= 1000) {
        setCanFetchData(true);
      } else {
        const remainingDelay = 1000 - timeSinceConfirmation;
        const timer = setTimeout(() => {
          setCanFetchData(true);
        }, remainingDelay);
        return () => clearTimeout(timer);
      }
    } else {
      setCanFetchData(false);
      if (saasAdminConfirmedAt !== null) {
        setSaasAdminConfirmedAt(null);
      }
    }
  }, [session, isSaasAdmin, saasAdminConfirmedAt]);

  // Handle redirects in useEffect to avoid setState during render
  useEffect(() => {
    if (!session) {
      router.push("/saas-admin/login");
      return;
    }

    if (isSaasAdmin === false) {
      router.push("/dashboard");
      return;
    }
  }, [session, isSaasAdmin, router]);

  // Show loading if no session
  if (!session) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show loading while checking SaaS admin status
  if (isSaasAdmin === undefined) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show loading if not SaaS admin (redirect will happen in useEffect)
  if (isSaasAdmin === false) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show loading until we can fetch data (session propagation delay)
  if (!canFetchData) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/saas-admin/login");
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">SaaS Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Platform administration and monitoring
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <Suspense fallback={<div>Loading stats...</div>}>
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Organizations
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
                  <p className="text-xs text-muted-foreground">
                    Total care homes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Total platform users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    SaaS Admins
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSaasAdmins}</div>
                  <p className="text-xs text-muted-foreground">
                    Administrative users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Residents</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalResidents}</div>
                  <p className="text-xs text-muted-foreground">
                    Total residents
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </Suspense>

        {/* Organizations List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>
                All care homes on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading organizations...</div>}>
                {organizations && organizations.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {organizations.map((org) => (
                      <div
                        key={org.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="font-medium">{org.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {org.memberCount} members • {org.teamCount} teams
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No organizations found
                  </p>
                )}
              </Suspense>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Platform-wide user management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading users...</div>}>
                {allUsers && allUsers.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allUsers.map((user) => (
                      <div
                        key={user._id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {user.name || user.email}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                          {user.isSaasAdmin && (
                            <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                              Admin
                            </span>
                          )}
                        </div>
                        {user.organizationId && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Org: {user.organizationId} • Role: {user.role || "N/A"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No users found
                  </p>
                )}
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

