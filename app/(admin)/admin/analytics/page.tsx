"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { BarChart3, TrendingUp, Users, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  totalResidents: number;
  totalTeams: number;
  recentOrganizations: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
}

export default function AnalyticsPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const router = useRouter();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not SaaS Admin
  useEffect(() => {
    if (!isProfileLoading && profile && !profile.is_saas_admin) {
      router.push("/dashboard");
    }
  }, [profile, isProfileLoading, router]);

  const fetchStats = useCallback(async () => {
    if (!profile?.is_saas_admin) return;

    try {
      setIsLoading(true);

      const [
        { count: orgCount },
        { count: userCount },
        { count: resCount },
        { count: teamCount },
        { data: recentOrgs }
      ] = await Promise.all([
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("residents").select("*", { count: "exact", head: true }),
        supabase.from("teams").select("*", { count: "exact", head: true }),
        supabase.from("organizations").select("id, name, created_at").order("created_at", { ascending: false }).limit(5)
      ]);

      setPlatformStats({
        totalOrganizations: orgCount || 0,
        totalUsers: userCount || 0,
        totalResidents: resCount || 0,
        totalTeams: teamCount || 0,
        recentOrganizations: (recentOrgs || []).map(org => ({
          id: org.id,
          name: org.name,
          createdAt: org.created_at
        }))
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isProfileLoading || (isLoading && !platformStats)) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (!profile?.is_saas_admin) {
    return null;
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
