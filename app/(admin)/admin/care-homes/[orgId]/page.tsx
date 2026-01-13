"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, UsersRound, Trash2, Ban } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
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

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>All users in this care home</CardDescription>
        </CardHeader>
        <CardContent>
          {orgDetails.members.length > 0 ? (
            <div className="space-y-2">
              {orgDetails.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{member.name || member.email}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="outline">{member.role}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No members yet</p>
          )}
        </CardContent>
      </Card>

      {/* Teams List */}
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Team structures in this care home</CardDescription>
        </CardHeader>
        <CardContent>
          {orgDetails.teams.length > 0 ? (
            <div className="space-y-2">
              {orgDetails.teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-muted-foreground">{team.memberCount} members</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No teams yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
