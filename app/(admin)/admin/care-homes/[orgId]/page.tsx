"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, UsersRound, Trash2, Ban, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DeleteOrganizationDialog from "@/components/admin/DeleteOrganizationDialog";
import DeactivateOrganizationDialog from "@/components/admin/DeactivateOrganizationDialog";
import { toast } from "sonner";

interface OrgDetails {
  id: string;
  name: string;
  createdAt: string;
  status: "active" | "suspended" | "deactivated";
  memberCount: number;
  teamCount: number;
}

interface CareHome {
  id: string;
  name: string;
  createdAt: string;
}

export default function CareHomeDetailsPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;

  const [orgDetails, setOrgDetails] = useState<OrgDetails | null>(null);
  const [careHomes, setCareHomes] = useState<CareHome[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  // Redirect if not SaaS Admin
  useEffect(() => {
    if (!isProfileLoading && profile && !profile.is_saas_admin) {
      router.push("/dashboard");
    }
  }, [profile, isProfileLoading, router]);

  const fetchDetails = useCallback(async () => {
    if (!profile?.is_saas_admin || !orgId) return;

    try {
      setIsLoading(true);

      // 1. Fetch organization details & status
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select(`
          id, name, created_at,
          organization_status (status),
          members:users (count),
          teams (count)
        `)
        .eq("id", orgId)
        .single();

      if (orgError) throw orgError;

      // 2. Fetch care homes
      const { data: chData, error: chError } = await supabase
        .from("care_homes")
        .select("id, name, created_at")
        .eq("organization_id", orgId);

      if (chError) throw chError;

      setOrgDetails({
        id: orgData.id,
        name: orgData.name,
        createdAt: orgData.created_at,
        status: orgData.organization_status?.[0]?.status || "active",
        memberCount: orgData.members?.[0]?.count || 0,
        teamCount: orgData.teams?.[0]?.count || 0,
      });

      setCareHomes((chData || []).map(ch => ({
        id: ch.id,
        name: ch.name,
        createdAt: ch.created_at
      })));

    } catch (error) {
      console.error("Error fetching org details:", error);
      toast.error("Failed to load organization details");
    } finally {
      setIsLoading(false);
    }
  }, [profile, orgId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const isDeactivated = orgDetails?.status === "deactivated";

  if (isProfileLoading || (isLoading && !orgDetails)) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (!profile?.is_saas_admin) {
    return null;
  }

  if (!orgDetails) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-medium">{orgDetails.name}</h1>
              {orgDetails && (
                <Badge
                  variant={
                    orgDetails.status === "active"
                      ? "default"
                      : orgDetails.status === "deactivated"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {orgDetails.status === "active"
                    ? "Active"
                    : orgDetails.status === "deactivated"
                      ? "Deactivated"
                      : "Suspended"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {new Date(orgDetails.createdAt).toLocaleDateString()}
              {careHomes !== null && (
                <span className="ml-2">
                  • {careHomes.length} {careHomes.length === 1 ? "care home" : "care homes"}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isDeactivated ? "default" : "outline"}
            onClick={() => setDeactivateDialogOpen(true)}
          >
            <Ban className="w-4 h-4 mr-2" />
            {isDeactivated ? "Activate" : "Deactivate"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <DeleteOrganizationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        organizationId={orgId}
        organizationName={orgDetails.name}
      />
      <DeactivateOrganizationDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        organizationId={orgId}
        organizationName={orgDetails.name}
        isDeactivated={isDeactivated}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgDetails.memberCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgDetails.teamCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organization ID</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono text-muted-foreground truncate">{orgDetails.id}</div>
          </CardContent>
        </Card>
      </div>

      {/* Care Homes List */}
      <Card>
        <CardHeader>
          <CardTitle>Care Homes</CardTitle>
          <CardDescription>Care homes in this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {careHomes && careHomes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {careHomes.map((careHome) => (
                <Link key={careHome.id} href={`/admin/care-homes/${orgId}/${careHome.id}`}>
                  <Card className="border hover:bg-accent transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(careHome.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="mt-2 text-base">{careHome.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Care Home ID: {careHome.id}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(careHome.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : careHomes === null ? (
            <p className="text-muted-foreground">Loading care homes...</p>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground text-center">
                No care homes yet. Care homes are created by owners during onboarding or through the dashboard sidebar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
