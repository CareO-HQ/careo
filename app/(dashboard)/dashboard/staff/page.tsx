"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Mail, Phone, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatRoleName } from "@/lib/utils";
import { canViewStaffList, UserRole } from "@/lib/permissions";
import { withRoleGuard } from "@/lib/route-guards";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image_url: string | null;
  role: string | null;
  active_team_id: string | null;
  team_name?: string; // For display
}

function StaffPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [staff, setStaff] = useState<StaffMember[] | undefined>(undefined);
  const router = useRouter();
  const { profile } = useProfile();
  const { supabase } = useSupabase();

  const activeTeamId = profile?.active_team_id;
  const activeOrganizationId = profile?.active_organization_id;

  const fetchStaff = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;

    try {
      // Base query - get all users in organization
      let query = supabase
        .from("users")
        .select(`
          *,
          teams:active_team_id (
            id,
            name
          )
        `)
        .eq("active_organization_id", activeOrganizationId);

      // Only filter by team if explicitly provided
      if (activeTeamId) {
        query = query.eq("active_team_id", activeTeamId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching staff:", error);
        // Log RLS policy errors specifically
        if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
          console.error("RLS policy violation - check user permissions and JWT metadata");
          console.error("Current user organization ID:", activeOrganizationId);
          console.error("Error details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
        }
        setStaff([]);
        return;
      }

      console.log(`[Staff Page] Found ${data?.length || 0} staff members for organization ${activeOrganizationId}${activeTeamId ? ` (filtered by team ${activeTeamId})` : ''}`);

      const mappedStaff = (data || []).map((p: any) => ({
        ...p,
        team_name: p.teams?.name || null
      }));

      setStaff(mappedStaff);
    } catch (err) {
      console.error("Unexpected error fetching staff:", err);
      setStaff([]);
    }
  }, [supabase, activeOrganizationId, activeTeamId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const currentUserId = profile?.id;
  const currentUserEmail = profile?.email;

  const staffWithoutCurrentUser = (staff || []).filter((member) => {
    if (!currentUserId && !currentUserEmail) return true;
    return member.id !== currentUserId && member.email !== currentUserEmail;
  });

  // Filter staff based on search term
  const filteredStaff = staffWithoutCurrentUser.filter((member) => {
    const name = member.name || '';
    const email = member.email || '';
    const role = member.role || '';
    const searchLower = searchTerm.toLowerCase();

    return (
      name.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      role.toLowerCase().includes(searchLower)
    );
  });

  // Determine display name for header
  const displayName = activeTeamId
    ? "Selected team"
    : activeOrganizationId
      ? "All teams"
      : "";

  // Conditional returns after all hooks
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (profile && !canViewStaffList(profile.role as UserRole)) {
    return null;
  }

  return (
    <div className="container mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff</h1>
        {displayName && (
          <p className="text-sm text-muted-foreground">
            {displayName}
          </p>
        )}
      </div>

      <div className="w-full">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            {/* Search by name */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 max-w-sm"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {filteredStaff.length} of {staffWithoutCurrentUser.length} staff member(s)
            </div>
            <Button variant="outline" disabled>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!staff ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <p className="text-muted-foreground">Loading staff members...</p>
                  </TableCell>
                </TableRow>
              ) : filteredStaff.length ? (
                filteredStaff.map((member) => {
                  const name = member.name;
                  const email = member.email;
                  const phone = member.phone;
                  const imageUrl = member.image_url;
                  const role = member.role;
                  const memberId = member.id;
                  const teamName = member.team_name;

                  // Get initials from name or email
                  const nameParts = name?.split(' ') || [];
                  const initials = nameParts.length >= 2
                    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
                    : name?.[0]?.toUpperCase() || email[0].toUpperCase();

                  return (
                    <TableRow
                      key={memberId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/staff/${memberId}`)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={imageUrl || ""} alt={name || email} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{name || 'No name set'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {phone ? (
                          <div className="flex items-center space-x-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{phone}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No phone</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {role ? (
                          <Badge variant="secondary">
                            {formatRoleName(role)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">No role</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {teamName ? (
                          <Badge variant="outline" className="text-xs">
                            {teamName}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {activeTeamId ? 'N/A' : 'All teams'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <p className="text-muted-foreground">
                      {staffWithoutCurrentUser.length === 0
                        ? 'No staff members found in this organization/team.'
                        : 'No staff members found matching your search.'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// Protect route - only Owners, Managers, and SaaS Admins can access
export default withRoleGuard(StaffPage, ["owner", "manager", "saas_admin"]);
