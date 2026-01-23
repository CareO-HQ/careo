"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UsersRound, ArrowLeft, Building2, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

interface Squad {
  id: string;
  name: string;
  staffCount: number;
}

interface StaffMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  teamNames: string[];
}

interface CareHomeDetails {
  id: string;
  name: string;
  createdAt: string;
  staffCount: number;
  teamsCount: number;
  teams: Squad[];
  staff: StaffMember[];
}

export default function CareHomeDetailsPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const careHomeId = params.careHomeId as string;

  const [careHomeDetails, setCareHomeDetails] = useState<CareHomeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not SaaS Admin
  useEffect(() => {
    if (!isProfileLoading && profile && !profile.is_saas_admin) {
      router.push("/dashboard");
    }
  }, [profile, isProfileLoading, router]);

  const fetchDetails = useCallback(async () => {
    if (!profile?.is_saas_admin || !careHomeId) return;

    try {
      setIsLoading(true);

      // 1. Fetch care home basic details
      const { data: chData, error: chError } = await supabase
        .from("care_homes")
        .select("id, name, created_at")
        .eq("id", careHomeId)
        .single();

      if (chError) throw chError;

      // 2. Fetch teams in this care home
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select(`
          id, name,
          team_staff (count)
        `)
        .eq("care_home_id", careHomeId);

      if (teamsError) throw teamsError;

      // 3. Fetch staff members in this care home
      const { data: staffData, error: staffError } = await supabase
        .from("users")
        .select(`
          id, email, name, role,
          teams:teams!active_team_id (name)
        `)
        .eq("active_care_home_id", careHomeId);

      if (staffError) throw staffError;

      setCareHomeDetails({
        id: chData.id,
        name: chData.name,
        createdAt: chData.created_at,
        staffCount: staffData?.length || 0,
        teamsCount: teamsData?.length || 0,
        teams: (teamsData || []).map(team => ({
          id: team.id,
          name: team.name,
          staffCount: (team as any).team_staff?.[0]?.count || 0
        })),
        staff: (staffData || []).map(staff => ({
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          teamNames: (staff.teams as any || []).map((u: any) => u.name)
        }))
      });

    } catch (error) {
      console.error("Error fetching care home details:", error);
      toast.error("Failed to load care home details");
    } finally {
      setIsLoading(false);
    }
  }, [profile, careHomeId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (isProfileLoading || (isLoading && !careHomeDetails)) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (!profile?.is_saas_admin) {
    return null;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{careHomeDetails.staffCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Members in this care home
            </p>
          </CardContent>
        </Card>

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
            <CardTitle className="text-sm font-medium">Care Home ID</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono text-muted-foreground truncate">
              {careHomeDetails.id}
            </div>
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
            <div className="space-y-4">
              {careHomeDetails.teams.map((team) => (
                <div
                  key={team.id}
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
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {careHomeDetails.staffCount === 0
              ? "No members yet"
              : `${careHomeDetails.staffCount} member${careHomeDetails.staffCount === 1 ? "" : "s"} in this care home`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {careHomeDetails.staff.length > 0 ? (
            <div className="space-y-4">
              {careHomeDetails.staff.map((staffMember) => (
                <div
                  key={staffMember.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{staffMember.name || staffMember.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {staffMember.email}
                    </p>
                    {staffMember.teamNames.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Teams: {staffMember.teamNames.join(", ")}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{staffMember.role}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground text-center">
                No members yet. Members are added via invitations and teams.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
