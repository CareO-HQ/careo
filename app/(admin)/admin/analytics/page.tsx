"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BarChart3, TrendingUp, Users, Building2 } from "lucide-react";

export default function AnalyticsPage() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const saasAdminStatus = useQuery(api.saasAdmin.getSaasAdminStatus);
  const platformStats = useQuery(api.saasAdmin.getPlatformStats);

  // Redirect if not SaaS Admin
  useEffect(() => {
    if (saasAdminStatus && !saasAdminStatus.isSaasAdmin) {
      router.push("/dashboard");
    }
  }, [saasAdminStatus, router]);

  if (!session) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (saasAdminStatus && !saasAdminStatus.isSaasAdmin) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platform-wide statistics and insights
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats?.totalOrganizations ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Care home organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats?.totalUsers ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Platform-wide users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats?.totalResidents ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all care homes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats?.totalTeams ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Team structures
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Organizations</CardTitle>
          <CardDescription>
            Recently created care home organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {platformStats?.recentOrganizations && platformStats.recentOrganizations.length > 0 ? (
            <div className="space-y-2">
              {platformStats.recentOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent organizations</p>
          )}
        </CardContent>
      </Card>

      {/* Placeholder for future analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Growth Trends</CardTitle>
          <CardDescription>
            Platform growth metrics (coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              Advanced analytics and charts will be available here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
