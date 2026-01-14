"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OwnersPage() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const saasAdminStatus = useQuery(api.saasAdmin.getSaasAdminStatus);
  const organizations = useQuery(api.saasAdmin.getAllOrganizations);

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
          <h1 className="text-2xl font-medium">Owners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage owners and their organizations
          </p>
        </div>
        <Link href="/admin/owners/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Owner
          </Button>
        </Link>
      </div>

      {/* Owners List */}
      {organizations && organizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <Link key={org.id} href={`/admin/care-homes/${org.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </span>
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
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No Owners Yet</p>
            <p className="text-muted-foreground text-center mb-4">
              Create the first owner to get started.
            </p>
            <Link href="/admin/owners/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Owner
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
