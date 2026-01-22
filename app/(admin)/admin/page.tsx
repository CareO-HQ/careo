"use client";

import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, UserCheck, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const router = useRouter();
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [recentOrgs, setRecentOrgs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not SaaS Admin
  useEffect(() => {
    if (!isProfileLoading && profile && !profile.is_saas_admin) {
      router.push("/dashboard");
    }
  }, [profile, isProfileLoading, router]);

  useEffect(() => {
    if (!profile?.is_saas_admin) return;

    async function fetchAdminData() {
      try {
        setIsLoading(true);

        // Fetch platform stats
        const [orgsCount, usersCount, residentsCount, teamsCount] = await Promise.all([
          supabase.from("organizations").select("*", { count: "exact", head: true }),
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("residents").select("*", { count: "exact", head: true }),
          supabase.from("teams").select("*", { count: "exact", head: true }),
        ]);

        setPlatformStats({
          totalOrganizations: orgsCount.count || 0,
          totalUsers: usersCount.count || 0,
          totalResidents: residentsCount.count || 0,
          totalTeams: teamsCount.count || 0,
        });

        // Fetch recent organizations with counts
        const { data: orgs, error: orgsError } = await supabase
          .from("organizations")
          .select(`
            id,
            name,
            created_at,
            users(count),
            teams(count)
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (orgsError) throw orgsError;

        setRecentOrgs(orgs.map(org => ({
          id: org.id,
          name: org.name,
          createdAt: org.created_at,
          memberCount: (org as any).users?.[0]?.count || 0,
          teamCount: (org as any).teams?.[0]?.count || 0,
        })));

      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAdminData();
  }, [profile]);

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!profile || !profile.is_saas_admin) {
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
          <h1 className="text-2xl font-medium">Platform Administration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage all care homes and platform settings
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Care Homes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats?.totalOrganizations ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active organizations
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
              Platform users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
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
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
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

      {/* Recent Care Homes */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Care Homes</CardTitle>
          <CardDescription>
            Recently created care home organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrgs && recentOrgs.length > 0 ? (
            <div className="space-y-2">
              {recentOrgs.slice(0, 5).map((org) => (
                <Link
                  key={org.id}
                  href={`/admin/care-homes/${org.id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {org.memberCount} members • {org.teamCount} teams
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No care homes yet</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Link
              href="/admin/care-homes"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              View All Care Homes
            </Link>
            <Link
              href="/admin/owners/create"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Create New Owner
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
