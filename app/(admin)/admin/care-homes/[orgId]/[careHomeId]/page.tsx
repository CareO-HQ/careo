"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UsersRound, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

export default function CareHomeDetailsPage() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const careHomeId = params.careHomeId as string;
  const saasAdminStatus = useQuery(api.saasAdmin.getSaasAdminStatus);
  const careHomeDetails = useQuery(
    api.rbac.careHomes.getCareHomeDetails,
    careHomeId ? { careHomeId: careHomeId as Id<"careHomes"> } : "skip"
  );

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

  if (careHomeDetails === undefined) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-muted-foreground">Loading care home details...</p>
      </div>
    );
  }

  if (!careHomeDetails) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-lg font-semibold mb-2">Care Home Not Found</p>
        <p className="text-muted-foreground mb-4">The care home you&apos;re looking for doesn&apos;t exist.</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
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
              <h1 className="text-2xl font-medium">{careHomeDetails.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {new Date(careHomeDetails.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/care-homes/${orgId}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Organization
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{careHomeDetails.teamsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Units/Houses in this care home
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{careHomeDetails.staffCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Staff members assigned to units
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Teams List */}
      <Card>
        <CardHeader>
          <CardTitle>Teams (Units/Houses)</CardTitle>
          <CardDescription>
            {careHomeDetails.teamsCount === 0
              ? "No teams yet in this care home"
              : `${careHomeDetails.teamsCount} team${careHomeDetails.teamsCount === 1 ? "" : "s"} in this care home`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {careHomeDetails.teams.length > 0 ? (
            <div className="space-y-2">
              {careHomeDetails.teams.map((team) => (
                <div
                  key={team._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {team.staffCount} {team.staffCount === 1 ? "staff member" : "staff members"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <UsersRound className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground text-center">
                No teams yet. Teams are created by managers.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
          <CardDescription>
            {careHomeDetails.staffCount === 0
              ? "No staff assigned yet"
              : `${careHomeDetails.staffCount} staff member${careHomeDetails.staffCount === 1 ? "" : "s"} assigned to units in this care home`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {careHomeDetails.staff.length > 0 ? (
            <div className="space-y-2">
              {careHomeDetails.staff.map((staffMember, index) => (
                <div
                  key={`${staffMember.userId}-${staffMember.unitId}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{staffMember.name || staffMember.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {staffMember.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unit: {staffMember.unitName}
                    </p>
                  </div>
                  <Badge variant="outline">{staffMember.role}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground text-center">
                No staff assigned yet. Staff are assigned to units by managers.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
