"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
import { canViewStaffList, UserRole, canToggleApprovedNurseRole, canManageContractedHours } from "@/lib/permissions";
import { withRoleGuard } from "@/lib/route-guards";
import { updateStaffWorkforceAction } from "@/app/actions/rota";
import { Switch } from "@/components/ui/switch";
import { ExternalAccessReminderModal } from "@/components/staff/ExternalAccessReminderModal";
import { RqiaLoginHistoryModal } from "@/components/staff/RqiaLoginHistoryModal";
import { MdtLoginHistoryModal } from "@/components/staff/MdtLoginHistoryModal";
import { insertExternalAccessReminderNotification } from "@/lib/notifications";

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image_url: string | null;
  role: string | null;
  active_team_id: string | null;
  team_name?: string; // For display
}

function StaffPage() {
  // State for filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null); // Initialized to null for organization-wide view
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[] | undefined>(undefined);
  const [selectedStaffForReminder, setSelectedStaffForReminder] = useState<StaffMember | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedRqiaStaff, setSelectedRqiaStaff] = useState<{ id: string; name: string } | null>(null);
  const [isRqiaHistoryModalOpen, setIsRqiaHistoryModalOpen] = useState(false);
  const [selectedMdtStaff, setSelectedMdtStaff] = useState<{ id: string; name: string } | null>(null);
  const [isMdtHistoryModalOpen, setIsMdtHistoryModalOpen] = useState(false);
  const router = useRouter();
  const { profile } = useProfile();
  const { supabase } = useSupabase();

  const handleConfirmReminder = async (durationMinutes: number) => {
    if (!profile || !profile.active_organization_id || !selectedStaffForReminder || !supabase) return;

    try {
      await insertExternalAccessReminderNotification(supabase, {
        organizationId: profile.active_organization_id,
        careHomeId: profile.active_care_home_id,
        teamId: profile.active_team_id,
        userId: profile.id,
        staffId: selectedStaffForReminder.id,
        staffName: selectedStaffForReminder.name || selectedStaffForReminder.email,
        durationMinutes,
        senderId: profile.id,
        senderName: profile.name || "System",
      });

      const durationLabel = durationMinutes >= 60
        ? `${Math.round(durationMinutes / 60)} hour(s)`
        : `${durationMinutes} minute(s)`;

      toast.success(`Reminder set! You will be notified in ${durationLabel} to turn off access.`);

      // Set client side timer to refresh notification sidebar badge when time elapses
      const delayMs = durationMinutes * 60 * 1000;
      if (delayMs <= 86400000) {
        setTimeout(() => {
          window.dispatchEvent(new Event("sidebar-counts-refresh"));
        }, delayMs);
      }
    } catch (err: any) {
      console.error("Failed to set external access reminder:", err);
      toast.error("Failed to set reminder");
    }
  };

  // Handle team change
  const handleTeamChange = (value: string) => {
    setActiveTeamId(value === "all" ? null : value);
  };
  const activeOrganizationId = profile?.active_organization_id;
  const activeCareHomeId = profile?.active_care_home_id;

  const fetchStaff = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;

    try {
      setIsLoading(true);
      // Base query - get all users that RLS allows
      let query = supabase
        .from("users")
        .select(`
          *,
          team_staff:team_staff!team_staff_user_id_fkey (
            team_id,
            teams (
              id,
              name
            )
          )
        `);

      // Filter by care home for multi-tenant isolation
      // If a care home is selected, only show staff in that care home
      if (activeCareHomeId) {
        query = query.eq("active_care_home_id", activeCareHomeId);
      } else if (activeOrganizationId) {
        query = query.eq("active_organization_id", activeOrganizationId);
      }

      // Filter by team assignment if explicitly provided
      // If activeTeamId is set, we only want staff assigned to that unit
      if (activeTeamId) {
        // Using filter on the relationship. 
        // Note: This requires the user to have at least one assignment matching this team.
        query = query.filter("team_staff.team_id", "eq", activeTeamId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching staff:", error);
        setStaff([]);
        return;
      }

      // Map data to preserve existing expected format for table columns
      const mappedStaff = (data || []).map((p: any) => {
        // Get primary unit assignment for display
        const primaryTeam = p.team_staff?.[0]?.teams;
        return {
          ...p,
          team_name: primaryTeam?.name || null
        };
      }).filter(p => {
        // If filtering by team but the join didn't filter strictly (Supabase JS can sometimes be tricky with nested filters)
        // Ensure the staff member has the target team in their assignments
        if (activeTeamId) {
          return p.team_staff?.some((ts: any) => ts.team_id === activeTeamId);
        }
        return true;
      });

      console.log(`[Staff Page] Found ${mappedStaff.length} staff members for ${activeCareHomeId ? 'care home ' + activeCareHomeId : 'organization ' + activeOrganizationId}${activeTeamId ? ` (filtered by team ${activeTeamId})` : ''}`);
      setStaff(mappedStaff);
    } catch (err) {
      console.error("Unexpected error fetching staff:", err);
      toast.error("Failed to load staff members");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, activeOrganizationId, activeCareHomeId, activeTeamId]);

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

  const permanentStaff = filteredStaff.filter(member => member.role !== 'mdt' && member.role !== 'rqia');
  const externalStaff = filteredStaff.filter(member => member.role === 'mdt' || member.role === 'rqia');

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

        <div className="space-y-8">
          {/* Permanent Staff Section */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-900">Permanent Staff</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Team</TableHead>
                    {canManageContractedHours(profile.role) && <TableHead>Contracted Hours</TableHead>}
                    {canToggleApprovedNurseRole(profile.role) && <TableHead>Elevated Access</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!staff ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <p className="text-muted-foreground">Loading staff members...</p>
                      </TableCell>
                    </TableRow>
                  ) : permanentStaff.length ? (
                    permanentStaff.map((member) => {
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
                          {canManageContractedHours(profile.role) && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {role === "nurse" || role === "care_assistant" ? (
                                <div className="flex items-center space-x-1 max-w-[100px]">
                                  <Input
                                    type="number"
                                    defaultValue={(member as any).contracted_weekly_hours || 0}
                                    className="h-8 text-center"
                                    onBlur={async (e) => {
                                      const hours = Number(e.target.value);
                                      if (hours === (member as any).contracted_weekly_hours) return;
                                      try {
                                        await updateStaffWorkforceAction(profile.id, memberId, { contracted_weekly_hours: hours });
                                        toast.success(`Updated contracted hours to ${hours}`);
                                        fetchStaff();
                                      } catch (err: any) {
                                        toast.error(err?.message || "Failed to update hours");
                                      }
                                    }}
                                  />
                                  <span className="text-xs text-muted-foreground">hrs</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                          {canToggleApprovedNurseRole(profile.role) && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {role === "nurse" ? (
                                <div className="flex items-center space-x-2 justify-center">
                                  <Switch
                                    checked={(member as any).is_manager_approved_nurse || false}
                                    onCheckedChange={async (checked) => {
                                      try {
                                        await updateStaffWorkforceAction(profile.id, memberId, { is_manager_approved_nurse: checked });
                                        toast.success(checked ? "Approved Nurse" : "Revoked approval");
                                        fetchStaff();
                                      } catch (err: any) {
                                        toast.error(err?.message || "Failed to toggle status");
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
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

          {/* External Staff Section */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-900">External Access</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center w-[150px]">Login Allowed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!staff ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <p className="text-muted-foreground">Loading staff members...</p>
                      </TableCell>
                    </TableRow>
                  ) : externalStaff.length ? (
                    externalStaff.map((member) => {
                      const name = member.name;
                      const email = member.email;
                      const phone = member.phone;
                      const imageUrl = member.image_url;
                      const role = member.role;
                      const memberId = member.id;

                      // Get initials from name or email
                      const nameParts = name?.split(' ') || [];
                      const initials = nameParts.length >= 2
                        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
                        : name?.[0]?.toUpperCase() || email[0].toUpperCase();

                      return (
                        <TableRow
                          key={memberId}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            if (role === 'rqia') {
                              setSelectedRqiaStaff({ id: memberId, name: name || email });
                              setIsRqiaHistoryModalOpen(true);
                            } else if (role === 'mdt') {
                              setSelectedMdtStaff({ id: memberId, name: name || email });
                              setIsMdtHistoryModalOpen(true);
                            } else {
                              router.push(`/dashboard/staff/${memberId}`);
                            }
                          }}
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
                            <Badge variant="secondary">
                              {role === 'mdt' ? 'MDT' : role === 'rqia' ? 'RQIA Inspector' : formatRoleName(role || '')}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <Switch
                                checked={(member as any).is_login_allowed !== false}
                                onCheckedChange={async (checked) => {
                                  try {
                                    await updateStaffWorkforceAction(profile.id, memberId, { is_login_allowed: checked });
                                    toast.success(checked ? "Login allowed for staff" : "Login blocked for staff");
                                    fetchStaff();
                                    if (checked) {
                                      setSelectedStaffForReminder(member);
                                      setIsReminderModalOpen(true);
                                    }
                                  } catch (err: any) {
                                    toast.error(err?.message || "Failed to update login permission");
                                  }
                                }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <p className="text-muted-foreground">No external staff found.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Modal for External Staff Access */}
      <ExternalAccessReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        staffName={selectedStaffForReminder?.name || selectedStaffForReminder?.email || "MDT Staff"}
        onConfirmReminder={handleConfirmReminder}
      />

      {/* Inspection Session History Modal for RQIA Inspectors */}
      <RqiaLoginHistoryModal
        isOpen={isRqiaHistoryModalOpen}
        onClose={() => setIsRqiaHistoryModalOpen(false)}
        staffUserId={selectedRqiaStaff?.id || ""}
        staffName={selectedRqiaStaff?.name || "RQIA Inspector"}
      />

      {/* Visit Session History Modal for MDT Professionals */}
      <MdtLoginHistoryModal
        isOpen={isMdtHistoryModalOpen}
        onClose={() => setIsMdtHistoryModalOpen(false)}
        staffUserId={selectedMdtStaff?.id || ""}
        staffName={selectedMdtStaff?.name || "MDT Professional"}
      />
    </div>
  );
}

// Protect route - only Owners, Managers, and SaaS Admins can access
export default withRoleGuard(StaffPage, ["owner", "manager", "saas_admin"]);
