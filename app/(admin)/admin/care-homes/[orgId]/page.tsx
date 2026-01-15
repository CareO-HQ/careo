"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, UsersRound, Trash2, Ban } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DeleteOrganizationDialog from "@/components/admin/DeleteOrganizationDialog";
import DeactivateOrganizationDialog from "@/components/admin/DeactivateOrganizationDialog";

export default function CareHomeDetailsPage() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const saasAdminStatus = useQuery(api.saasAdmin.getSaasAdminStatus);
  const orgDetails = useQuery(api.saasAdmin.getOrganizationDetails, { organizationId: orgId });
  const organizations = useQuery(api.saasAdmin.getAllOrganizations);
  const careHomes = useQuery(api.rbac.careHomes.getCareHomes, { organizationId: orgId });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  // Get organization status
  const orgStatus = organizations?.find((org) => org.id === orgId);
  const isDeactivated = orgStatus?.status === "deactivated";

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

  if (!orgDetails) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-muted-foreground">Loading care home details...</p>
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
              {orgStatus && (
                <Badge
                  variant={
                    orgStatus.status === "active"
                      ? "default"
                      : orgStatus.status === "deactivated"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {orgStatus.status === "active"
                    ? "Active"
                    : orgStatus.status === "deactivated"
                    ? "Deactivated"
                    : "Suspended"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {new Date(orgDetails.createdAt).toLocaleDateString()}
              {careHomes !== undefined && (
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
            <div className="text-2xl font-bold">{orgDetails.members.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgDetails.teams.length}</div>
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
                <Link key={careHome._id} href={`/admin/care-homes/${orgId}/${careHome._id}`}>
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
                        Care Home ID: {careHome._id}
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
          ) : careHomes === undefined ? (
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
