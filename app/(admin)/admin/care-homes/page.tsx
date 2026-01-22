"use client";

import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UsersRound, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFilter = "all" | "active" | "deactivated";

export default function CareHomesPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Redirect if not SaaS Admin
  useEffect(() => {
    if (!isProfileLoading && profile && !profile.is_saas_admin) {
      router.push("/dashboard");
    }
  }, [profile, isProfileLoading, router]);

  useEffect(() => {
    if (!profile?.is_saas_admin) return;

    async function fetchOrganizations() {
      try {
        setIsLoading(true);

        // Fetch organizations with status and counts
        const { data, error } = await supabase
          .from("organizations")
          .select(`
            id,
            name,
            created_at,
            organization_status(status),
            users(count),
            teams(count),
            residents(count)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setOrganizations(data.map(org => ({
          id: org.id,
          name: org.name,
          createdAt: org.created_at,
          status: org.organization_status?.[0]?.status || "active",
          memberCount: (org as any).users?.[0]?.count || 0,
          teamCount: (org as any).teams?.[0]?.count || 0,
          residentCount: (org as any).residents?.[0]?.count || 0,
        })));

      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganizations();
  }, [profile]);

  // Filter organizations by status
  const filteredOrganizations = organizations?.filter((org) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return org.status === "active";
    if (statusFilter === "deactivated") return org.status === "deactivated";
    return true;
  });

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
          <h1 className="text-2xl font-medium">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage organizations. Click on an organization to view its care homes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="deactivated">Deactivated Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Organizations List */}
      <div className="space-y-4">
        {filteredOrganizations && filteredOrganizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrganizations.map((org) => (
              <Link key={org.id} href={`/admin/care-homes/${org.id}`}>
                <Card className={`hover:bg-accent transition-colors cursor-pointer ${org.status === "deactivated" ? "opacity-75" : ""
                  }`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            org.status === "active"
                              ? "default"
                              : org.status === "deactivated"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {org.status === "active"
                            ? "Active"
                            : org.status === "deactivated"
                              ? "Deactivated"
                              : "Suspended"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <CardTitle className="mt-2">{org.name}</CardTitle>
                    <CardDescription>Organization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{org.memberCount} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UsersRound className="h-4 w-4 text-muted-foreground" />
                        <span>{org.teamCount} teams</span>
                      </div>
                    </div>
                    {org.residentCount !== undefined && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {org.residentCount} residents
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : filteredOrganizations && filteredOrganizations.length === 0 && organizations && organizations.length > 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No Organizations Match Filter</p>
              <p className="text-muted-foreground text-center mb-4">
                Try changing the status filter to see more organizations.
              </p>
              <Button variant="outline" onClick={() => setStatusFilter("all")}>
                Show All
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No Organizations Yet</p>
              <p className="text-muted-foreground text-center mb-4">
                Start by creating a care home owner who can set up their organization.
              </p>
              <Link
                href="/admin/owners/create"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Create First Owner
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
