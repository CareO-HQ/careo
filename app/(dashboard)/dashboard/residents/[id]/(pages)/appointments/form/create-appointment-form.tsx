"use client";

import React, { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useProfile } from "@/hooks/use-profile";
import { createAppointment } from "@/lib/appointments";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDateTimePicker } from "@/components/ui/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Create Appointment Schema
const CreateAppointmentSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters long")
    .max(100, "Title must be under 100 characters"),
  description: z
    .string()
    .max(500, "Description can be up to 500 characters")
    .optional(),
  startTime: z
    .string()
    .min(1, "Start time is required"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(200, "Location must be under 200 characters"),
  staffId: z
    .string()
    .optional(),
});

interface CreateAppointmentFormProps {
  residentId: string;
  residentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAppointmentForm({
  residentId,
  residentName,
  isOpen,
  onClose
}: CreateAppointmentFormProps) {
  const [createAppointmentLoading, setCreateAppointmentLoading] = React.useState(false);

  // Auth data
  const { activeOrganizationId, activeTeamId } = useActiveTeam();
  const { profile } = useProfile();
  const { supabase } = useSupabase();

  // Get all users for staff selection from Supabase
  // Standardized to match AppointmentsPage data structure: { id, name, email, role, activeTeamId, teamIds }
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string; role?: string; activeTeamId?: string; teamIds?: string[] }>>([]);

  useEffect(() => {
    async function fetchUsers() {
      if (!activeOrganizationId || !supabase) {
        console.log("[AppointmentForm] Missing activeOrganizationId or supabase");
        setAllUsers([]);
        return;
      }
      
      try {
        console.log("[AppointmentForm] Fetching users for organization:", activeOrganizationId);
        
        // Step 1: Get all teams in this organization
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id")
          .eq("organization_id", activeOrganizationId);
        
        const teamIds = (teamsData || []).map(t => t.id);
        console.log("[AppointmentForm] Teams in org:", teamIds.length);
        
        // Step 2: Get all care homes in this organization
        const { data: careHomes, error: careHomesError } = await supabase
          .from("care_homes")
          .select("id")
          .eq("organization_id", activeOrganizationId);
        
        const careHomeIds = (careHomes || []).map(ch => ch.id);
        console.log("[AppointmentForm] Care homes in org:", careHomeIds.length);
        
        // Step 3: Collect user IDs from multiple sources
        const allUserIdsSet = new Set<string>();
        
        // 3a: Users with active_organization_id set
        const { data: directOrgUsers, error: directOrgError } = await supabase
          .from("users")
          .select("id")
          .eq("active_organization_id", activeOrganizationId);
        
        if (!directOrgError && directOrgUsers) {
          directOrgUsers.forEach(u => allUserIdsSet.add(u.id));
          console.log("[AppointmentForm] Users with active_organization_id:", directOrgUsers.length);
        }
        
        // 3b: Users from team_staff (nurses/care assistants assigned to teams)
        if (teamIds.length > 0) {
          const { data: teamStaffData, error: teamStaffError } = await supabase
            .from("team_staff")
            .select("user_id")
            .in("team_id", teamIds);
          
          if (!teamStaffError && teamStaffData) {
            teamStaffData.forEach((ts: any) => allUserIdsSet.add(ts.user_id));
            console.log("[AppointmentForm] Users from team_staff:", teamStaffData.length);
          }
        }
        
        // 3c: Managers from care_home_managers
        if (careHomeIds.length > 0) {
          const { data: managersData, error: managersError } = await supabase
            .from("care_home_managers")
            .select("user_id")
            .in("care_home_id", careHomeIds);
          
          if (!managersError && managersData) {
            managersData.forEach((m: any) => allUserIdsSet.add(m.user_id));
            console.log("[AppointmentForm] Users from care_home_managers:", managersData.length);
          }
        }
        
        const allUserIds = Array.from(allUserIdsSet);
        console.log("[AppointmentForm] Total unique user IDs to fetch:", allUserIds.length);
        
        if (allUserIds.length === 0) {
          console.warn("[AppointmentForm] No users found in organization through any method");
          setAllUsers([]);
          return;
        }
        
        // Step 4: Fetch user details for all collected user IDs
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, email, role, active_team_id, is_saas_admin")
          .in("id", allUserIds);
        
        if (usersError) {
          console.error("[AppointmentForm] Error fetching user details:", usersError);
          setAllUsers([]);
          return;
        }

        console.log("[AppointmentForm] Fetched user details:", usersData?.length || 0);
        if (usersData && usersData.length > 0) {
          console.log("[AppointmentForm] All user roles:", usersData.map(u => ({ email: u.email, role: u.role, name: u.name })));
        }

        if (!usersData || usersData.length === 0) {
          console.warn("[AppointmentForm] No users found after fetching details");
          setAllUsers([]);
          return;
        }
        
        // Step 5: Filter to nurses and managers, and exclude SaaS admins
        const usersDataFiltered = usersData.filter((u: any) => {
          const role = u.role?.toLowerCase()?.trim();
          const isNurseOrManager = role === "nurse" || role === "manager";
          const isNotSaasAdmin = u.is_saas_admin !== true;
          
          if (!isNurseOrManager) {
            console.log(`[AppointmentForm] Excluding user ${u.email} - role: ${role} (not nurse/manager)`);
          }
          if (!isNotSaasAdmin) {
            console.log(`[AppointmentForm] Excluding user ${u.email} - is SaaS admin`);
          }
          
          return isNurseOrManager && isNotSaasAdmin;
        });

        console.log("[AppointmentForm] Filtered nurses/managers (excluding SaaS admins):", usersDataFiltered.length);

        if (usersDataFiltered.length === 0) {
          console.warn("[AppointmentForm] No nurses or managers found after filtering");
          setAllUsers([]);
          return;
        }

        // Supplementary: Get team assignments for sorting
        const userIds = usersDataFiltered.map(u => u.id);
        const { data: teamStaffData, error: teamStaffError } = await supabase
          .from("team_staff")
          .select("user_id, team_id")
          .in("user_id", userIds);

        if (teamStaffError) {
          console.error("[AppointmentForm] Error fetching team_staff for sorting:", teamStaffError);
        } else {
          console.log("[AppointmentForm] Team staff assignments for sorting:", teamStaffData?.length || 0);
        }

        // Create a map of user_id -> team_ids
        const userTeamMap = new Map<string, string[]>();
        (teamStaffData || []).forEach((ts: any) => {
          if (!userTeamMap.has(ts.user_id)) {
            userTeamMap.set(ts.user_id, []);
          }
          userTeamMap.get(ts.user_id)!.push(ts.team_id);
        });

        // Transform to match expected format and add team information (standardized structure)
        const transformedUsers = usersDataFiltered.map((u: any) => ({
          id: u.id,
          name: u.name || u.email?.split("@")[0] || "",
          email: u.email || "",
          role: u.role?.toLowerCase()?.trim() || u.role,
          activeTeamId: u.active_team_id,
          teamIds: userTeamMap.get(u.id) || [],
        }));

        // Sort: current team members first, then alphabetically
        const sortedUsers = transformedUsers.sort((a, b) => {
          const aInCurrentTeam = activeTeamId && (
            a.activeTeamId === activeTeamId || 
            (a.teamIds && a.teamIds.includes(activeTeamId))
          );
          const bInCurrentTeam = activeTeamId && (
            b.activeTeamId === activeTeamId || 
            (b.teamIds && b.teamIds.includes(activeTeamId))
          );

          // Current team members first
          if (aInCurrentTeam && !bInCurrentTeam) return -1;
          if (!aInCurrentTeam && bInCurrentTeam) return 1;

          // Then alphabetically by name
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          return aName.localeCompare(bName);
        });

        console.log("[AppointmentForm] Final sorted users:", sortedUsers.length);
        setAllUsers(sortedUsers);
      } catch (error) {
        console.error("[AppointmentForm] Error fetching users:", error);
        setAllUsers([]);
      }
    }
    
    fetchUsers();
  }, [activeOrganizationId, activeTeamId, supabase]);

  // Helper to format role name
  const formatRole = (role?: string) => {
    if (!role) return "";
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Create Appointment Form setup
  const createAppointmentForm = useForm<z.infer<typeof CreateAppointmentSchema>>({
    resolver: zodResolver(CreateAppointmentSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      location: "",
      staffId: "none",
    },
  });

  // Get other staff (excluding current user) for assisted staff dropdown
  const otherStaffOptions = React.useMemo(() => {
    if (!allUsers || allUsers.length === 0) {
      console.log("[AppointmentForm] No users in allUsers array");
      return [];
    }
    
    console.log("[AppointmentForm] allUsers count:", allUsers.length);
    console.log("[AppointmentForm] Current profile email:", profile?.email);
    console.log("[AppointmentForm] Current profile id:", profile?.id);
    
    const filtered = allUsers.filter((u: any) => {
      // Normalize emails for comparison (lowercase and trim)
      const userEmail = (u.email || "").toLowerCase().trim();
      const profileEmail = (profile?.email || "").toLowerCase().trim();
      
      // Check both email and id for more reliable comparison
      const isNotCurrentUser = userEmail !== profileEmail && u.id !== profile?.id;
      
      console.log(`[AppointmentForm] User ${u.email} (id: ${u.id}) vs profile ${profile?.email} (id: ${profile?.id}): ${isNotCurrentUser}`);
      return isNotCurrentUser;
    });
    
    console.log("[AppointmentForm] Filtered staff (excluding current user):", filtered.length);
    
    const options = filtered.map((u: any) => {
      const roleText = formatRole(u.role);
      const userName = u.name || "";
      const label = roleText ? `${userName} (${roleText})` : userName;
      return {
        key: u.id,
        label,
        email: u.email,
        id: u.id,
      };
    });
    
    console.log("[AppointmentForm] Final otherStaffOptions:", options.length, options);
    return options;
  }, [allUsers, profile?.email, profile?.id]);

  // Handle create appointment submission
  const onCreateAppointmentSubmit = async (data: z.infer<typeof CreateAppointmentSchema>) => {
    if (!profile || !activeOrganizationId) {
      toast.error("Authentication required");
      return;
    }

    setCreateAppointmentLoading(true);
    try {
      await createAppointment({
        residentId: residentId,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        location: data.location,
        staffId: data.staffId === "none" ? undefined : data.staffId,
        organizationId: activeOrganizationId,
        teamId: activeOrganizationId, // Using organization ID as team ID for now
      });

      toast.success("Appointment created successfully");
      createAppointmentForm.reset();
      onClose();
    } catch (error) {
      console.error("Error creating appointment:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create appointment";
      toast.error(errorMessage);
    } finally {
      setCreateAppointmentLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Appointment for {residentName}</DialogTitle>
          <DialogDescription>
            Schedule a new appointment for this resident.
          </DialogDescription>
        </DialogHeader>

        <Form {...createAppointmentForm}>
          <form onSubmit={createAppointmentForm.handleSubmit(onCreateAppointmentSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={createAppointmentForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Appointment Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Doctor Visit, Physical Therapy"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={createAppointmentForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Additional details about the appointment"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <FormField
              control={createAppointmentForm.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Date & Time</FormLabel>
                  <FormControl>
                    <FormDateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      dateLabel="Date"
                      timeLabel="Time"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={createAppointmentForm.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., General Hospital, Room 205"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Staff Assignment */}
            <FormField
              control={createAppointmentForm.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Staff</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No staff assigned</SelectItem>
                      {otherStaffOptions.length > 0 ? (
                        otherStaffOptions.map((staff) => (
                          <SelectItem key={staff.key} value={staff.email}>
                            {staff.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_staff" disabled>
                          {allUsers.length > 0 
                            ? `No other staff available (${allUsers.length} total users)` 
                            : "No staff available"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  createAppointmentForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAppointmentLoading}>
                {createAppointmentLoading ? "Creating..." : "Create Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}