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
  residentTeamId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAppointmentForm({
  residentId,
  residentName,
  residentTeamId,
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
      if (!activeOrganizationId || !supabase) return;

      try {
        // With our new RLS policies, a simple query to 'users' table 
        // will automatically return only the users the current role is allowed to see 
        // within their active care home.
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, email, role, active_team_id, is_saas_admin")
          .eq("active_organization_id", activeOrganizationId);

        if (usersError) throw usersError;

        // Filter to relevant roles for appointments (Nurses, Managers, Care Assistants)
        // and exclude SaaS admins
        const filteredUsers = (usersData || []).filter((u: any) => {
          const role = u.role?.toLowerCase()?.trim();
          const isAllowedRole = role === "nurse" || role === "manager" || role === "care_assistant";
          const isNotSaasAdmin = u.is_saas_admin !== true;
          return isAllowedRole && isNotSaasAdmin;
        });

        // Supplementary: Get team assignments for sorting/grouping if needed
        const userIds = filteredUsers.map(u => u.id);
        const { data: teamStaffData } = await supabase
          .from("team_staff")
          .select("user_id, team_id")
          .in("user_id", userIds);

        const userTeamMap = new Map<string, string[]>();
        (teamStaffData || []).forEach((ts: any) => {
          if (!userTeamMap.has(ts.user_id)) {
            userTeamMap.set(ts.user_id, []);
          }
          userTeamMap.get(ts.user_id)!.push(ts.team_id);
        });

        // Transform and sort
        const transformedUsers = filteredUsers.map((u: any) => ({
          id: u.id,
          name: u.name || u.email?.split("@")[0] || "",
          email: u.email || "",
          role: u.role?.toLowerCase()?.trim() || u.role,
          activeTeamId: u.active_team_id,
          teamIds: userTeamMap.get(u.id) || [],
        }));

        const sortedUsers = transformedUsers.sort((a, b) => {
          // Priority 1: Staff from the same team as the resident
          const aInResidentTeam = residentTeamId && a.teamIds.includes(residentTeamId);
          const bInResidentTeam = residentTeamId && b.teamIds.includes(residentTeamId);

          if (aInResidentTeam && !bInResidentTeam) return -1;
          if (!aInResidentTeam && bInResidentTeam) return 1;

          // Priority 2: Current active team (if different from resident team)
          const aInActiveTeam = activeTeamId && a.teamIds.includes(activeTeamId);
          const bInActiveTeam = activeTeamId && b.teamIds.includes(activeTeamId);

          if (aInActiveTeam && !bInActiveTeam) return -1;
          if (!aInActiveTeam && bInActiveTeam) return 1;

          // Priority 3: Alphabetical order
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

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
        teamId: residentTeamId || activeOrganizationId, // Use resident's team ID if available, otherwise fallback
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