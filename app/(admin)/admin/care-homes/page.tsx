"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, UsersRound, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StatusFilter = "all" | "active" | "deactivated";

export default function CareHomesPage() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const saasAdminStatus = useQuery(api.saasAdmin.getSaasAdminStatus);
  const organizations = useQuery(api.saasAdmin.getAllOrganizations);
  const careHomes = useQuery(api.saasAdmin.getAllCareHomes);
  const populateCareHomes = useMutation(api.saasAdmin.populateCareHomes);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTab, setActiveTab] = useState<"organizations" | "carehomes">("organizations");
  const [isPopulating, setIsPopulating] = useState(false);

  // Filter organizations by status
  const filteredOrganizations = organizations?.filter((org) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return org.status === "active";
    if (statusFilter === "deactivated") return org.status === "deactivated";
    return true;
  });

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
          <h1 className="text-2xl font-medium">Organizations & Care Homes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage organizations and their care homes
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
          {organizations && organizations.length > 0 && (!careHomes || careHomes.length === 0) && (
            <Button
              onClick={async () => {
                setIsPopulating(true);
                try {
                  const result = await populateCareHomes({});
                  alert(`Created ${result.careHomesCreated} care homes for ${result.organizationsProcessed} organizations`);
                  window.location.reload();
                } catch (err) {
                  alert(`Error: ${err instanceof Error ? err.message : "Failed to populate care homes"}`);
                } finally {
                  setIsPopulating(false);
                }
              }}
              disabled={isPopulating}
            >
              {isPopulating ? "Populating..." : "Populate Care Homes"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for Organizations and Care Homes */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "organizations" | "carehomes")}>
        <TabsList>
          <TabsTrigger value="organizations">
            <Building className="h-4 w-4 mr-2" />
            Organizations ({organizations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="carehomes">
            <Building2 className="h-4 w-4 mr-2" />
            Care Homes ({careHomes?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          {filteredOrganizations && filteredOrganizations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrganizations.map((org) => (
                <Link key={org.id} href={`/admin/care-homes/${org.id}`}>
                  <Card className={`hover:bg-accent transition-colors cursor-pointer ${
                    org.status === "deactivated" ? "opacity-75" : ""
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
        </TabsContent>

        {/* Care Homes Tab */}
        <TabsContent value="carehomes" className="space-y-4">
          {careHomes && careHomes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {careHomes.map((careHome) => (
                <Link key={careHome._id} href={`/admin/care-homes/${careHome.organizationId}`}>
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(careHome.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="mt-2">{careHome.name}</CardTitle>
                      <CardDescription>
                        Care Home in {careHome.organizationName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{careHome.memberCount} members</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UsersRound className="h-4 w-4 text-muted-foreground" />
                          <span>{careHome.teamCount} teams</span>
                        </div>
                      </div>
                      {careHome.residentCount !== undefined && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {careHome.residentCount} residents
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No Care Homes Yet</p>
                <p className="text-muted-foreground text-center mb-4">
                  Care homes are automatically created when organizations are created.
                  {organizations && organizations.length > 0 && (
                    <> If you see organizations but no care homes, click the &quot;Populate Care Homes&quot; button above.</>
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
