"use client";

import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { authClient } from "@/lib/auth-client";
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
import { useEffect } from "react";

interface TeamStaffMember {
  _id: string;
  userId: string;
  _creationTime: number;
  email: string;
  name?: string;
  phone?: string;
  imageUrl?: string | null;
  role?: string;
  teamId?: string;
  teamName?: string; // Team/Unit name for display
  organizationId?: string;
}

interface OrgStaffMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  phone?: string;
  address?: string;
  dateOfJoin?: string;
  rightToWorkStatus?: string;
  teamName?: string; // Team/Unit name for display
  activeTeamId?: string; // Active team ID for reference
}

export default function StaffPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { activeTeamId, activeTeam, activeOrganizationId, activeOrganization } = useActiveTeam();
  const { data: activeMember, isPending: isActiveMemberLoading } = authClient.useActiveMember();

  useEffect(() => {
    if (!isActiveMemberLoading && activeMember) {
      if (!canViewStaffList(activeMember.role as UserRole)) {
        router.push("/dashboard");
      }
    }
  }, [activeMember, isActiveMemberLoading, router]);

  // Fetch staff by team if team is selected
  const teamStaff = useQuery(
    activeTeamId ? api.users.getByTeamId : "skip",
    activeTeamId ? { teamId: activeTeamId } : "skip"
  ) as TeamStaffMember[] | undefined;

  // Fetch enriched organization members with phone numbers
  const enrichedOrgStaff = useQuery(
    !activeTeamId && activeOrganizationId ? api.users.getEnrichedOrgMembers : "skip",
    !activeTeamId && activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  ) as OrgStaffMember[] | undefined;

  // Use organization members if only org is selected, otherwise use team members
  const staff = activeTeamId ? teamStaff : enrichedOrgStaff;

  // Filter staff based on search term
  const filteredStaff = (staff || []).filter((member) => {
    if (activeTeamId) {
      // Team member structure
      const teamMember = member as TeamStaffMember;
      const name = teamMember.name || '';
      const email = teamMember.email || '';
      const role = teamMember.role || '';
      const searchLower = searchTerm.toLowerCase();

      return (
        name.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower) ||
        role.toLowerCase().includes(searchLower)
      );
    } else {
      // Organization member structure
      const orgMember = member as OrgStaffMember;
      const name = orgMember.user.name || '';
      const email = orgMember.user.email || '';
      const role = orgMember.role || '';
      const searchLower = searchTerm.toLowerCase();

      return (
        name.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower) ||
        role.toLowerCase().includes(searchLower)
      );
    }
  });

  // Determine display name for header
  const displayName = activeTeamId
    ? activeTeam?.name || 'selected unit'
    : activeOrganizationId
      ? `All units in ${activeOrganization?.name || 'care home'}`
      : '';

  // Debugging: Track team switching and staff list changes
  useEffect(() => {
    console.log("[STAFF-PAGE] Team context changed:", {
      activeTeamId,
      activeTeamName: activeTeam?.name,
      activeOrganizationId,
      activeOrganizationName: activeOrganization?.name,
      viewingMode: activeTeamId ? "team" : "organization"
    });
  }, [activeTeamId, activeTeam, activeOrganizationId, activeOrganization]);

  // Debugging: Log staff list details
  useEffect(() => {
    if (staff) {
      const totalCount = staff.length;
      
      // Breakdown by role
      const roleBreakdown: Record<string, number> = {};
      staff.forEach((member) => {
        const role = activeTeamId 
          ? (member as TeamStaffMember).role || "unknown"
          : (member as OrgStaffMember).role || "unknown";
        roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      });

      console.log("[STAFF-PAGE] Staff list loaded:", {
        totalCount,
        roleBreakdown,
        activeTeamId,
        activeTeamName: activeTeam?.name,
        source: activeTeamId ? "teamStaff" : "enrichedOrgStaff"
      });

      // Log individual staff members for debugging (first 5)
      const sampleStaff = staff.slice(0, 5).map((member) => {
        const isTeamMember = activeTeamId;
        const teamMember = member as TeamStaffMember;
        const orgMember = member as OrgStaffMember;
        return {
          email: isTeamMember ? teamMember.email : orgMember.user.email,
          role: isTeamMember ? teamMember.role : orgMember.role,
          name: isTeamMember ? teamMember.name : orgMember.user.name
        };
      });
      console.log("[STAFF-PAGE] Sample staff members (first 5):", sampleStaff);
    } else {
      console.log("[STAFF-PAGE] Staff list is loading...");
    }
  }, [staff, activeTeamId, activeTeam]);

  // Debugging: Log when search filter is applied
  useEffect(() => {
    if (staff && searchTerm) {
      console.log("[STAFF-PAGE] Search filter applied:", {
        searchTerm,
        totalStaff: staff.length,
        filteredCount: filteredStaff.length
      });
    }
  }, [searchTerm, staff, filteredStaff.length]);

  // Conditional returns after all hooks
  if (isActiveMemberLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Checking permissions...</p>
      </div>
    );
  }

  if (activeMember && !canViewStaffList(activeMember.role as UserRole)) {
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
              {filteredStaff.length} of {staff?.length || 0} staff member(s)
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
                <TableHead>Team/Unit</TableHead>
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
                  // Handle different member structures
                  const isTeamMember = activeTeamId;
                  const teamMember = member as TeamStaffMember;
                  const orgMember = member as OrgStaffMember;

                  const name = isTeamMember ? teamMember.name : orgMember.user.name;
                  const email = isTeamMember ? teamMember.email : orgMember.user.email;
                  const phone = isTeamMember ? teamMember.phone : orgMember.phone;
                  const imageUrl = isTeamMember ? teamMember.imageUrl : orgMember.user.image;
                  const role = isTeamMember ? teamMember.role : orgMember.role;
                  const memberId = isTeamMember ? teamMember.userId : (orgMember.userId || orgMember.id);
                  const teamName = isTeamMember ? teamMember.teamName : orgMember.teamName; // Team name for both views

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
                            {activeTeamId ? 'N/A' : 'All units'}
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
                      {staff.length === 0
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
