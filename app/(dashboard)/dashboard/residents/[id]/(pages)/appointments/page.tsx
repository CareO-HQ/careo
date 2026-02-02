"use client";

import React, { useMemo, useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { getUpcomingAppointments, updateAppointment as updateAppointmentAPI, deleteAppointment as deleteAppointmentAPI } from "@/lib/appointments";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  Calendar,
  StickyNote,
  Plus,
  Eye,
  Clock,
  X,
  Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { CreateAppointmentForm } from "./form/create-appointment-form";
import { FormDateTimePicker } from "@/components/ui/date-time-picker";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorState } from "@/components/ErrorState";
import { useActiveTeam } from "@/hooks/use-active-team";

type DailyCarePageProps = {
  params: Promise<{ id: string }>;
};

// Type aliases for better type safety
type Appointment = {
  id: string;
  resident_id: string;
  organization_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location: string;
  staff_id?: string;
  team_id?: string;
  status: "scheduled" | "completed" | "cancelled";
  created_by: string;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
  // For compatibility with existing code that uses _id
  _id?: string;
  startTime?: string;
  endTime?: string;
  staffId?: string;
};
type AppointmentNote = {
  _id: string;
  residentId: string;
  category: string;
  preparationTime?: string;
  preparationNotes?: string;
  preferredTime?: string;
  transportPreference?: string;
  instructions?: string;
  transportationNeeds?: string[];
  medicalNeeds?: string[];
  priority?: string;
  isActive?: boolean;
  createdAt: number;
};

type Resident = {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  [key: string]: any;
};

function DailyCarePage({ params }: DailyCarePageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { supabase } = useSupabase();
  const [resident, setResident] = useState<Resident | null>(null);
  const [residentLoading, setResidentLoading] = useState(true);

  // Fetch resident from Supabase
  useEffect(() => {
    async function fetchResident() {
      try {
        const { data, error } = await supabase
          .from("residents")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching resident:", error);
          setResident(null);
        } else {
          // Transform Supabase data to match expected format
          setResident({
            id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            imageUrl: data.image_url,
            ...data,
          });
        }
      } catch (error) {
        console.error("Error fetching resident:", error);
        setResident(null);
      } finally {
        setResidentLoading(false);
      }
    }

    if (id) {
      fetchResident();
    }
  }, [id, supabase]);

  // Get today's date and shift information
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const currentTime = new Date();
  const currentHour = currentTime.getHours();

  // Determine current shift: Day (8 AM - 8 PM) or Night (8 PM - 8 AM)
  const currentShift = (currentHour >= 8 && currentHour < 20) ? "Day" : "Night";

  // Form schema
  const PersonalCareSchema = z.object({
    activities: z.array(z.string()).refine((value) => value.some((item) => item), {
      message: "You have to select at least one activity.",
    }),
    time: z.string().min(1, "Time is required"),
    staff: z.string().min(1, "Staff is required"),
    assistedStaff: z.string().optional(),
    notes: z.string().optional(),
  });

  // Appointment Notes Dialog state
  const [isAppointmentNotesDialogOpen, setIsAppointmentNotesDialogOpen] = React.useState(false);
  const [appointmentNotesLoading, setAppointmentNotesLoading] = React.useState(true);
  const [appointmentNotes, setAppointmentNotes] = useState<AppointmentNote[]>([]);

  // Create Appointment Dialog state
  const [isCreateAppointmentDialogOpen, setIsCreateAppointmentDialogOpen] = React.useState(false);

  // Edit Appointment Dialog state
  const [isEditAppointmentDialogOpen, setIsEditAppointmentDialogOpen] = React.useState(false);
  const [editAppointmentLoading, setEditAppointmentLoading] = React.useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = React.useState<Appointment | null>(null);

  // Delete Appointment Dialog state
  const [isDeleteAppointmentDialogOpen, setIsDeleteAppointmentDialogOpen] = React.useState(false);
  const [deleteAppointmentLoading, setDeleteAppointmentLoading] = React.useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = React.useState<Appointment | null>(null);

  // Loading state for individual appointment operations
  const [loadingAppointmentId, setLoadingAppointmentId] = React.useState<string | null>(null);

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Pagination state for appointments
  const [currentPage, setCurrentPage] = React.useState(1);
  const appointmentsPerPage = 5;

  // Appointment Notes Form Schema
  // Enums for appointment-specific needs
  const TransportationNeedEnum = z.enum(["wheelchair_accessible", "oxygen_support", "medical_equipment", "assistance_required"]);
  const MedicalNeedEnum = z.enum(["fasting_required", "medication_adjustment", "blood_work", "vitals_check"]);

  const AppointmentNotesSchema = z.object({
    category: z.enum(["preparation", "preferences", "special_instructions", "transportation", "medical_requirements"]),

    preparationTime: z.enum(["30_minutes", "1_hour", "2_hours"]).optional(),
    preparationNotes: z.string().optional(),
    preferredTime: z.enum(["morning", "afternoon", "evening"]).optional(),
    transportPreference: z.enum(["wheelchair", "walking_aid", "independent", "stretcher"]).optional(),
    instructions: z.string().optional(),

    // ✅ strongly typed
    transportationNeeds: z.array(TransportationNeedEnum).optional(),
    medicalNeeds: z.array(MedicalNeedEnum).optional(),

    priority: z.enum(["low", "medium", "high"]).optional(),
  });

  // Edit Appointment Schema (for editing existing appointments)
  const EditAppointmentSchema = z.object({
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

  // Appointment Notes Form setup
  const appointmentNotesForm = useForm<z.infer<typeof AppointmentNotesSchema>>({
    resolver: zodResolver(AppointmentNotesSchema),
    defaultValues: {
      category: "preparation",
      preparationTime: undefined,
      preparationNotes: "",
      preferredTime: undefined,
      transportPreference: undefined,
      instructions: "",
      transportationNeeds: [],
      medicalNeeds: [],
      priority: "medium",
    },
  });

  // Edit Appointment Form setup
  const editAppointmentForm = useForm<z.infer<typeof EditAppointmentSchema>>({
    resolver: zodResolver(EditAppointmentSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      location: "",
      staffId: "none",
    },
  });

  // Fetch appointment notes from Supabase
  useEffect(() => {
    async function fetchAppointmentNotes() {
      try {
        setAppointmentNotesLoading(true);
        const { data, error } = await supabase
          .from("appointment_notes")
          .select("*")
          .eq("resident_id", id)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching appointment notes:", error);
          setAppointmentNotes([]);
        } else {
          // Transform Supabase data to match AppointmentNote type
          const transformedNotes: AppointmentNote[] = (data || []).map((note: any) => ({
            _id: note.id,
            residentId: note.resident_id,
            category: note.category,
            preparationTime: note.preparation_time,
            preparationNotes: note.preparation_notes,
            preferredTime: note.preferred_time,
            transportPreference: note.transport_preference,
            instructions: note.instructions,
            transportationNeeds: note.transportation_needs || [],
            medicalNeeds: note.medical_needs || [],
            priority: note.priority,
            isActive: note.is_active,
            createdAt: new Date(note.created_at).getTime(),
          }));
          setAppointmentNotes(transformedNotes);
        }
      } catch (error) {
        console.error("Error fetching appointment notes:", error);
        setAppointmentNotes([]);
      } finally {
        setAppointmentNotesLoading(false);
      }
    }

    if (id) {
      fetchAppointmentNotes();
    }
  }, [id, supabase]);

  // Get upcoming appointments for the resident (server-side filtered)
  const [appointments, setAppointments] = useState<Appointment[] | undefined>(undefined);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        setAppointmentsLoading(true);
        const result = await getUpcomingAppointments({
          residentId: id,
          limit: 50,
        });
        // Transform appointments to include _id for compatibility
        const transformedAppointments = result.appointments?.map((apt: any) => ({
          ...apt,
          _id: apt.id,
          startTime: apt.start_time,
          endTime: apt.end_time,
          staffId: apt.staff_id,
        })) || [];
        setAppointments(transformedAppointments);
      } catch (error) {
        console.error("Error fetching appointments:", error);
        setAppointments([]);
      } finally {
        setAppointmentsLoading(false);
      }
    }
    fetchAppointments();
  }, [id]);

  // Auth data
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const { activeTeamId } = useActiveTeam();

  // Get all users for staff selection from Supabase
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string; role?: string; activeTeamId?: string; teamIds?: string[] }>>([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        if (!activeOrganization?.id) {
          setAllUsers([]);
          return;
        }

        console.log("[AppointmentsPage] Fetching users for organization:", activeOrganization.id);
        
        // Step 1: Get all teams in this organization
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id")
          .eq("organization_id", activeOrganization.id);
        
        const teamIds = (teamsData || []).map(t => t.id);
        console.log("[AppointmentsPage] Teams in org:", teamIds.length);
        
        // Step 2: Get all care homes in this organization
        const { data: careHomes, error: careHomesError } = await supabase
          .from("care_homes")
          .select("id")
          .eq("organization_id", activeOrganization.id);
        
        const careHomeIds = (careHomes || []).map(ch => ch.id);
        console.log("[AppointmentsPage] Care homes in org:", careHomeIds.length);
        
        // Step 3: Collect user IDs from multiple sources
        const allUserIdsSet = new Set<string>();
        
        // 3a: Users with active_organization_id set
        const { data: directOrgUsers, error: directOrgError } = await supabase
          .from("users")
          .select("id")
          .eq("active_organization_id", activeOrganization.id);
        
        if (!directOrgError && directOrgUsers) {
          directOrgUsers.forEach(u => allUserIdsSet.add(u.id));
          console.log("[AppointmentsPage] Users with active_organization_id:", directOrgUsers.length);
        }
        
        // 3b: Users from team_staff (nurses/care assistants assigned to teams)
        if (teamIds.length > 0) {
          const { data: teamStaffData, error: teamStaffError } = await supabase
            .from("team_staff")
            .select("user_id")
            .in("team_id", teamIds);
          
          if (!teamStaffError && teamStaffData) {
            teamStaffData.forEach((ts: any) => allUserIdsSet.add(ts.user_id));
            console.log("[AppointmentsPage] Users from team_staff:", teamStaffData.length);
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
            console.log("[AppointmentsPage] Users from care_home_managers:", managersData.length);
          }
        }
        
        const allUserIds = Array.from(allUserIdsSet);
        console.log("[AppointmentsPage] Total unique user IDs to fetch:", allUserIds.length);
        
        if (allUserIds.length === 0) {
          console.warn("[AppointmentsPage] No users found in organization through any method");
          setAllUsers([]);
          return;
        }
        
        // Step 4: Fetch user details for all collected user IDs
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, email, role, active_team_id, is_saas_admin")
          .in("id", allUserIds);

        if (usersError) {
          console.error("[AppointmentsPage] Error fetching user details:", usersError);
          setAllUsers([]);
          return;
        }

        console.log("[AppointmentsPage] Fetched user details:", usersData?.length || 0);
        if (usersData && usersData.length > 0) {
          console.log("[AppointmentsPage] All user roles:", usersData.map(u => ({ email: u.email, role: u.role, name: u.name })));
        }

        if (!usersData || usersData.length === 0) {
          console.warn("[AppointmentsPage] No users found after fetching details");
          setAllUsers([]);
          return;
        }

        // Step 5: Filter to nurses and managers, and exclude SaaS admins
        const usersDataFiltered = usersData.filter((u: any) => {
          const role = u.role?.toLowerCase()?.trim();
          const isNurseOrManager = role === "nurse" || role === "manager";
          const isNotSaasAdmin = u.is_saas_admin !== true;
          
          if (!isNurseOrManager) {
            console.log(`[AppointmentsPage] Excluding user ${u.email} - role: ${role} (not nurse/manager)`);
          }
          if (!isNotSaasAdmin) {
            console.log(`[AppointmentsPage] Excluding user ${u.email} - is SaaS admin`);
          }
          
          return isNurseOrManager && isNotSaasAdmin;
        });

        console.log("[AppointmentsPage] Filtered nurses/managers (excluding SaaS admins):", usersDataFiltered.length);

        if (usersDataFiltered.length === 0) {
          console.warn("[AppointmentsPage] No nurses or managers found after filtering");
          setAllUsers([]);
          return;
        }

        // Supplementary: Get team assignments for role enrichment and sorting
        const userIds = usersDataFiltered.map(u => u.id);
        const { data: teamStaffData, error: teamStaffError } = await supabase
          .from("team_staff")
          .select("user_id, team_id, role")
          .in("user_id", userIds);

        if (teamStaffError) {
          console.error("[AppointmentsPage] Error fetching team_staff:", teamStaffError);
        }

        // Create a map of user_id -> team_ids for sorting
        const userTeamMap = new Map<string, string[]>();
        (teamStaffData || []).forEach((ts: any) => {
          if (!userTeamMap.has(ts.user_id)) {
            userTeamMap.set(ts.user_id, []);
          }
          userTeamMap.get(ts.user_id)!.push(ts.team_id);
        });

        // Transform to match expected format and add team information
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

        setAllUsers(sortedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        setAllUsers([]);
      }
    }

    if (activeOrganization?.id) {
      fetchUsers();
    }
  }, [supabase, activeOrganization?.id, activeTeamId]);

  // Form setup - after user data is available
  const form = useForm<z.infer<typeof PersonalCareSchema>>({
    resolver: zodResolver(PersonalCareSchema),
    defaultValues: {
      activities: [],
      time: "",
      staff: "",
      assistedStaff: "",
      notes: "",
    },
  });

  // Daily Activity Record state variables
  const [activityRecordTime, setActivityRecordTime] = React.useState("");
  const [activityRecordNotes, setActivityRecordNotes] = React.useState("");

  // Dialog state management
  const [isPersonalCareDialogOpen, setIsPersonalCareDialogOpen] = React.useState(false);
  const [isActivityRecordDialogOpen, setIsActivityRecordDialogOpen] = React.useState(false);

  // Update staff fields when user data loads
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('staff', staffName);
    }
  }, [user, form]);

  // Note: Personal care activities and daily activity records mutations are not yet migrated to Supabase
  // These will need API routes or direct Supabase operations
  const createPersonalCareActivities = async (data: any) => {
    // TODO: Implement with Supabase API route or direct Supabase call
    console.warn("createPersonalCareActivities not yet implemented with Supabase");
    throw new Error("Personal care activities not yet implemented with Supabase");
  };

  const createDailyActivityRecord = async (data: any) => {
    // TODO: Implement with Supabase API route or direct Supabase call
    console.warn("createDailyActivityRecord not yet implemented with Supabase");
    throw new Error("Daily activity records not yet implemented with Supabase");
  };

  const createAppointmentNote = async (data: any) => {
    const response = await fetch("/api/appointment-notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create appointment note");
    }

    return await response.json();
  };

  const deleteAppointmentNote = async (data: { noteId: string }) => {
    const response = await fetch(`/api/appointment-notes/${data.noteId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete appointment note");
    }

    return await response.json();
  };

  // Define activity options
  const activityOptions = [
    { id: "bath", label: "Bath" },
    { id: "shower", label: "Shower" },
    { id: "dressed", label: "Dressed" },
    { id: "changed", label: "Changed Clothes" },
    { id: "brushed", label: "Teeth Brushed/Dentures Cleaned" },
    { id: "hair_care", label: "Hair Combed" },
    { id: "hair_dried", label: "Hair Dried" },
    { id: "shaved", label: "Shaved" },
    { id: "nails_care", label: "Nail Care" },
    { id: "mouth_care", label: "Oral Care" },
    { id: "toileting", label: "Toileting" },
    { id: "continence", label: "Continence Support (Pad Change)" },
    { id: "skin_care", label: "Skin Care" },
    { id: "cream_applied", label: "Creams Applied" },
    { id: "position_change", label: "Position Change" },
    { id: "Bed_changed", label: "Bed Cover Changed" }
  ] as const;

  // Helper to format role name
  const formatRole = (role?: string) => {
    if (!role) return "";
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Get other staff (excluding current user) for assisted staff dropdown
  const otherStaffOptions = allUsers?.filter(u => u.email !== user?.user?.email).map(u => {
    const roleText = formatRole(u.role);
    const label = roleText ? `${u.name} (${roleText})` : u.name;
    return {
      key: u.id,
      label,
      email: u.email
    };
  }) || [];

  // Current user info for primary staff
  const currentUserName = user?.user?.name || user?.user?.email?.split('@')[0] || "";

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof PersonalCareSchema>) => {
    try {
      await createPersonalCareActivities({
        residentId: id,
        date: today,
        activities: data.activities,
        time: data.time,
        staff: data.staff,
        assistedStaff: data.assistedStaff === "none" ? undefined : data.assistedStaff,
        notes: data.notes,
        shift: currentShift,
      });

      // Clear form and close dialog
      form.reset();
      setIsPersonalCareDialogOpen(false);
      toast.success("Personal care activities saved successfully");
    } catch (error) {
      console.error("Error saving personal care activities:", error);
      toast.error("Failed to save personal care activities");
    }
  };

  // Handle daily activity record submission
  const handleActivityRecordSubmit = async () => {
    if (!currentUserName || !activityRecordTime) return;

    try {
      await createDailyActivityRecord({
        residentId: id,
        date: today,
        time: activityRecordTime,
        staff: currentUserName,
        notes: activityRecordNotes || undefined,
      });

      // Clear form and close dialog (keep current user as staff)
      setActivityRecordTime("");
      setActivityRecordNotes("");
      setIsActivityRecordDialogOpen(false);
      toast.success("Daily activity record saved successfully");
    } catch (error) {
      console.error("Error saving daily activity record:", error);
      toast.error("Failed to save daily activity record");
    }
  };

  // Handle appointment notes submission
  const onAppointmentNotesSubmit = async (data: z.infer<typeof AppointmentNotesSchema>) => {
    if (!user || !activeOrganization) {
      toast.error("Authentication required");
      return;
    }

    setAppointmentNotesLoading(true);
    try {
      await createAppointmentNote({
        residentId: id,
        category: data.category,
        preparationTime: data.preparationTime,
        preparationNotes: data.preparationNotes,
        preferredTime: data.preferredTime,
        transportPreference: data.transportPreference,
        instructions: data.instructions,
        transportationNeeds: data.transportationNeeds,
        medicalNeeds: data.medicalNeeds,
        priority: data.priority,
        organizationId: activeOrganization.id,
        teamId: activeOrganization.id, // Using organization ID as team ID for now
      });

      toast.success("Appointment note saved successfully");
      appointmentNotesForm.reset();
      setIsAppointmentNotesDialogOpen(false);
      
      // Refresh appointment notes list
      const { data: notesData, error: fetchError } = await supabase
        .from("appointment_notes")
        .select("*")
        .eq("resident_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!fetchError && notesData) {
        const transformedNotes: AppointmentNote[] = notesData.map((note: any) => ({
          _id: note.id,
          residentId: note.resident_id,
          category: note.category,
          preparationTime: note.preparation_time,
          preparationNotes: note.preparation_notes,
          preferredTime: note.preferred_time,
          transportPreference: note.transport_preference,
          instructions: note.instructions,
          transportationNeeds: note.transportation_needs || [],
          medicalNeeds: note.medical_needs || [],
          priority: note.priority,
          isActive: note.is_active,
          createdAt: new Date(note.created_at).getTime(),
        }));
        setAppointmentNotes(transformedNotes);
      }
    } catch (error: any) {
      console.error("Error saving appointment note:", error);
      toast.error(error.message || "Failed to save appointment note");
    } finally {
      setAppointmentNotesLoading(false);
    }
  };

  // Handle delete appointment note
  const handleDeleteAppointmentNote = async () => {
    if (!noteToDelete) return;

    setDeleteLoading(true);
    try {
      await deleteAppointmentNote({ noteId: noteToDelete });
      toast.success("Appointment note deleted successfully");
      setDeleteConfirmOpen(false);
      setNoteToDelete(null);
      
      // Refresh appointment notes list
      const { data: notesData, error: fetchError } = await supabase
        .from("appointment_notes")
        .select("*")
        .eq("resident_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!fetchError && notesData) {
        const transformedNotes: AppointmentNote[] = notesData.map((note: any) => ({
          _id: note.id,
          residentId: note.resident_id,
          category: note.category,
          preparationTime: note.preparation_time,
          preparationNotes: note.preparation_notes,
          preferredTime: note.preferred_time,
          transportPreference: note.transport_preference,
          instructions: note.instructions,
          transportationNeeds: note.transportation_needs || [],
          medicalNeeds: note.medical_needs || [],
          priority: note.priority,
          isActive: note.is_active,
          createdAt: new Date(note.created_at).getTime(),
        }));
        setAppointmentNotes(transformedNotes);
      }
    } catch (error: any) {
      console.error("Error deleting appointment note:", error);
      toast.error(error.message || "Failed to delete appointment note");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle edit appointment
  const handleEditAppointment = (appointment: Appointment) => {
    setLoadingAppointmentId(appointment._id);
    setAppointmentToEdit(appointment);
    editAppointmentForm.setValue("title", appointment.title || "");
    editAppointmentForm.setValue("description", appointment.description || "");
    editAppointmentForm.setValue("startTime", appointment.startTime || "");
    editAppointmentForm.setValue("location", appointment.location || "");
    editAppointmentForm.setValue("staffId", appointment.staffId || "none");
    setIsEditAppointmentDialogOpen(true);
    // Clear loading state when dialog opens
    setLoadingAppointmentId(null);
  };

  // Handle edit appointment submission
  const onEditAppointmentSubmit = async (data: z.infer<typeof EditAppointmentSchema>) => {
    if (!user || !appointmentToEdit) {
      toast.error("Authentication required");
      return;
    }

    setEditAppointmentLoading(true);
    try {
      const appointmentId = appointmentToEdit._id || appointmentToEdit.id;
      await updateAppointmentAPI(appointmentId, {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        location: data.location,
        staffId: data.staffId === "none" ? undefined : data.staffId,
        updatedBy: user.user.id,
      });

      // Refresh appointments list
      const result = await getUpcomingAppointments({
        residentId: id,
        limit: 50,
      });
      const transformedAppointments = result.appointments?.map((apt: any) => ({
        ...apt,
        _id: apt.id,
        startTime: apt.start_time,
        endTime: apt.end_time,
        staffId: apt.staff_id,
      })) || [];
      setAppointments(transformedAppointments);

      toast.success("Appointment updated successfully");
      editAppointmentForm.reset();
      setIsEditAppointmentDialogOpen(false);
      setAppointmentToEdit(null);
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Failed to update appointment. Please try again.", {
        duration: 5000,
        action: {
          label: "Retry",
          onClick: () => onEditAppointmentSubmit(data),
        },
      });
    } finally {
      setEditAppointmentLoading(false);
    }
  };

  // Handle delete appointment
  const handleDeleteAppointment = (appointment: Appointment) => {
    setLoadingAppointmentId(appointment._id);
    setAppointmentToDelete(appointment);
    setIsDeleteAppointmentDialogOpen(true);
    // Clear loading state when dialog opens
    setLoadingAppointmentId(null);
  };

  // Confirm delete appointment
  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;

    setDeleteAppointmentLoading(true);
    try {
      const appointmentId = appointmentToDelete._id || appointmentToDelete.id;
      await deleteAppointmentAPI(appointmentId);

      // Refresh appointments list
      const result = await getUpcomingAppointments({
        residentId: id,
        limit: 50,
      });
      const transformedAppointments = result.appointments?.map((apt: any) => ({
        ...apt,
        _id: apt.id,
        startTime: apt.start_time,
        endTime: apt.end_time,
        staffId: apt.staff_id,
      })) || [];
      setAppointments(transformedAppointments);

      toast.success("Appointment deleted successfully");
      setIsDeleteAppointmentDialogOpen(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast.error("Failed to delete appointment. Please try again.", {
        duration: 5000,
        action: {
          label: "Retry",
          onClick: () => confirmDeleteAppointment(),
        },
      });
    } finally {
      setDeleteAppointmentLoading(false);
    }
  };

  // Appointments are already filtered and sorted by the backend query
  // No need for client-side filtering - this improves performance significantly
  const upcomingAppointments = useMemo(() => {
    if (!appointments) return [];
    // Data is already filtered for upcoming appointments and sorted by startTime (soonest first)
    return Array.isArray(appointments) ? appointments : [];
  }, [appointments]);

  // Pagination logic
  const totalPages = upcomingAppointments.length > 0 ? Math.ceil(upcomingAppointments.length / appointmentsPerPage) : 0;
  const startIndex = (currentPage - 1) * appointmentsPerPage;
  const endIndex = startIndex + appointmentsPerPage;
  const currentAppointments = upcomingAppointments.slice(startIndex, endIndex);

  // Handle page navigation
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Loading state - queries are still fetching
  if (residentLoading || resident === null || appointmentsLoading || appointmentNotesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  // Error state - resident not found (already handled in loading check)
  if (!residentLoading && resident === null) {
    return (
      <ErrorState
        message="Resident not found"
        description="The resident you're looking for doesn't exist or may have been removed."
        onRetry={() => router.refresh()}
        showBackButton={true}
      />
    );
  }

  // Error state - failed to load appointments
  if (appointments === undefined) {
    return (
      <ErrorState
        message="Failed to load appointments"
        description="We couldn't load the appointments for this resident. Please check your connection and try again."
        onRetry={() => window.location.reload()}
        showBackButton={true}
      />
    );
  }

  const fullName = resident ? `${resident.firstName} ${resident.lastName}` : "";
  const initials = resident ? `${resident.firstName[0]}${resident.lastName[0]}` : "";

  // Helper function to get readable category names
  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case "preparation":
        return "Preparation";
      case "preferences":
        return "Preferences";
      case "special_instructions":
        return "Special Instructions";
      case "transportation":
        return "Transportation";
      case "medical_requirements":
        return "Medical Requirements";
      default:
        return category;
    }
  };

  // Helper function to get display text for notes
  const getNoteDisplayText = (note: AppointmentNote): string => {
    switch (note.category) {
      case "special_instructions":
        return note.instructions || "Special Instructions";
      case "preparation":
        if (note.preparationNotes) {
          return note.preparationNotes;
        } else if (note.preparationTime) {
          const timeMap: { [key: string]: string } = {
            "30_minutes": "30 min prep",
            "1_hour": "1 hour prep",
            "2_hours": "2 hours prep"
          };
          return timeMap[note.preparationTime] || "Preparation";
        }
        return "Preparation";
      case "preferences":
        const prefs: string[] = [];
        if (note.preferredTime) {
          prefs.push(note.preferredTime);
        }
        if (note.transportPreference) {
          prefs.push(note.transportPreference);
        }
        return prefs.length > 0 ? prefs.join(", ") : "Preferences";
      case "transportation":
        if (note.transportationNeeds && note.transportationNeeds.length > 0) {
          return note.transportationNeeds.join(", ").replace(/_/g, " ");
        }
        return "Transportation";
      case "medical_requirements":
        if (note.medicalNeeds && note.medicalNeeds.length > 0) {
          return note.medicalNeeds.join(", ").replace(/_/g, " ");
        }
        return "Medical Requirements";
      default:
        return getCategoryDisplayName(note.category);
    }
  };

  // Helper function to get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "preparation":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "preferences":
        return "bg-green-100 text-green-800 border-green-200";
      case "special_instructions":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "transportation":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medical_requirements":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Helper function to get appointment status color
  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Helper function to format appointment date/time
  const formatAppointmentDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={resident.imageUrl} alt={fullName} className="border" />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground text-sm">
            View and manage appointments for {resident.firstName} {resident.lastName}.
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <Button
            onClick={() => setIsCreateAppointmentDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Appointment
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/residents/${id}/appointments/documents`)}
          >
            <Eye className="w-4 h-4 mr-2" />
            History
          </Button>
        </div>
      </div>

      {/* Appointment Notes Section */}
      {appointmentNotes && appointmentNotes.length > 0 && (
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <StickyNote className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Appointment Notes</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAppointmentNotesDialogOpen(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Note
              </Button>
            </div>

            {/* Display appointment notes */}
            <div className="flex flex-wrap gap-2">
              {appointmentNotes.map((note) => (
                <div
                  key={note._id}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs border ${getCategoryColor(note.category)}`}
                >
                  <span className="font-medium mr-1">
                    {getNoteDisplayText(note)}
                  </span>
                  {note.priority && note.priority !== 'medium' && (
                    <span className="text-xs opacity-75 mr-2">
                      ({note.priority})
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setNoteToDelete(note._id);
                      setDeleteConfirmOpen(true);
                    }}
                    className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
                    aria-label="Delete note"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointment List Card */}
      <Card className="border-0">
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Upcoming Appointments</span>
            </div>
            <Badge variant="outline" className="self-start">
              {upcomingAppointments.length} upcoming
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Upcoming Appointments</span>
            <Badge variant="outline" className="ml-auto">
              {upcomingAppointments.length} upcoming
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="border-0" >
          {upcomingAppointments.length > 0 ? (
            <>
              <div className="space-y-4">
                {currentAppointments.map((appointment) => (
                  <div key={appointment._id} className="flex items-start space-x-4 p-4 border rounded-sm">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">
                          {appointment.title
                            .split(" ")
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ")}
                        </h4>
                        <div className="flex items-center space-x-2">

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditAppointment(appointment)}
                            disabled={loadingAppointmentId === appointment._id}
                            className="h-6 px-2 text-xs "
                          >
                            {loadingAppointmentId === appointment._id ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              "Edit"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteAppointment(appointment)}
                            disabled={loadingAppointmentId === appointment._id}
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            {loadingAppointmentId === appointment._id ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete"
                            )}
                          </Button>
                        </div>
                      </div>

                      {appointment.description && (
                        <p className="text-xs text-gray-600">{appointment.description}</p>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatAppointmentDateTime(appointment.startTime)}</span>
                        </div>
                        {appointment.location && (
                          <div className="flex items-center space-x-1">
                            <span>📍</span>
                            <span>{appointment.location}</span>
                          </div>
                        )}
                      </div>

                      {appointment.staffId && (
                        <div className="text-xs text-blue-600">
                          Assigned to: {appointment.staffId}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {/* Mobile Layout */}
                  <div className="sm:hidden">
                    <div className="text-center text-xs text-gray-500 mb-3">
                      {startIndex + 1}-{Math.min(endIndex, upcomingAppointments.length)} of {upcomingAppointments.length} upcoming
                    </div>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="h-8 px-2 text-xs flex-1 max-w-[80px]"
                      >
                        Prev
                      </Button>
                      <span className="text-xs text-gray-600 mx-3 flex-shrink-0">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="h-8 px-2 text-xs flex-1 max-w-[80px]"
                      >
                        Next
                      </Button>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden sm:flex sm:items-center sm:justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1}-{Math.min(endIndex, upcomingAppointments.length)} of {upcomingAppointments.length} upcoming appointments
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="h-8 px-3 text-xs"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="h-8 px-3 text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No upcoming appointments</p>
              <p className="text-xs text-gray-400 mt-1">Create a new appointment using the button above</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Appointment Form */}
      <CreateAppointmentForm
        residentId={id}
        residentName={fullName}
        isOpen={isCreateAppointmentDialogOpen}
        onClose={async () => {
          setIsCreateAppointmentDialogOpen(false);
          // Refresh appointments after creation
          try {
            const result = await getUpcomingAppointments({ residentId: id, limit: 50 });
            const transformedAppointments = result.appointments?.map((apt: any) => ({
              ...apt,
              _id: apt.id,
              startTime: apt.start_time,
              endTime: apt.end_time,
              staffId: apt.staff_id,
            })) || [];
            setAppointments(transformedAppointments);
          } catch (error) {
            console.error("Error refreshing appointments:", error);
          }
        }}
      />

      {/* Add Appointment Notes Dialog - keeping the existing dialog code here for now */}
      <Dialog open={isAppointmentNotesDialogOpen} onOpenChange={setIsAppointmentNotesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Appointment Note for {fullName}</DialogTitle>
            <DialogDescription>
              Add a quick note about appointment preferences or preparations for this resident.
            </DialogDescription>
          </DialogHeader>

          <Form {...appointmentNotesForm}>
            <form onSubmit={appointmentNotesForm.handleSubmit(onAppointmentNotesSubmit)} className="space-y-6">
              {/* Category Selection */}
              <FormField
                control={appointmentNotesForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select appointment category..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="preparation">Preparation Requirements</SelectItem>
                        <SelectItem value="preferences">Preferences</SelectItem>
                        <SelectItem value="special_instructions">Special Instructions</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="medical_requirements">Medical Requirements</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preparation Requirements Fields */}
              {appointmentNotesForm.watch('category') === 'preparation' && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-medium text-blue-900">Preparation Requirements</h4>

                  <FormField
                    control={appointmentNotesForm.control}
                    name="preparationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preparation Time Needed</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select preparation time..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30_minutes">30 minutes</SelectItem>
                            <SelectItem value="1_hour">1 hour</SelectItem>
                            <SelectItem value="2_hours">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={appointmentNotesForm.control}
                    name="preparationNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preparation Notes</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter preparation details..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Preferences Fields */}
              {appointmentNotesForm.watch('category') === 'preferences' && (
                <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                  <h4 className="font-medium text-green-900">Appointment Preferences</h4>

                  <FormField
                    control={appointmentNotesForm.control}
                    name="preferredTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Time</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select preferred time..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="morning">Morning</SelectItem>
                            <SelectItem value="afternoon">Afternoon</SelectItem>
                            <SelectItem value="evening">Evening</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={appointmentNotesForm.control}
                    name="transportPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport Preference</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transport preference..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="wheelchair">Wheelchair</SelectItem>
                            <SelectItem value="walking_aid">Walking Aid</SelectItem>
                            <SelectItem value="independent">Independent</SelectItem>
                            <SelectItem value="stretcher">Stretcher</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Special Instructions Fields */}
              {appointmentNotesForm.watch('category') === 'special_instructions' && (
                <div className="space-y-4 p-4 border rounded-lg bg-purple-50">
                  <h4 className="font-medium text-purple-900">Special Instructions</h4>

                  <FormField
                    control={appointmentNotesForm.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructions</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter special instructions..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Transportation Fields */}
              {appointmentNotesForm.watch('category') === 'transportation' && (
                <div className="space-y-4 p-4 border rounded-lg bg-orange-50">
                  <h4 className="font-medium text-orange-900">Transportation Requirements</h4>
                  <p className="text-sm text-orange-700">Select all that apply:</p>

                  <FormField
                    control={appointmentNotesForm.control}
                    name="transportationNeeds"
                    render={() => (
                      <FormItem>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'wheelchair_accessible' as const, label: 'Wheelchair Accessible' },
                            { id: 'oxygen_support' as const, label: 'Oxygen Support' },
                            { id: 'medical_equipment' as const, label: 'Medical Equipment' },
                            { id: 'assistance_required' as const, label: 'Assistance Required' }
                          ].map((item) => (
                            <FormField
                              key={item.id}
                              control={appointmentNotesForm.control}
                              name="transportationNeeds"
                              render={({ field }) => {
                                return (
                                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item?.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), item.id])
                                            : field.onChange(field.value?.filter((value: any) => value !== item.id));
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Medical Requirements Fields */}
              {appointmentNotesForm.watch('category') === 'medical_requirements' && (
                <div className="space-y-4 p-4 border rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-900">Medical Requirements</h4>
                  <p className="text-sm text-red-700">Select all that apply:</p>

                  <FormField
                    control={appointmentNotesForm.control}
                    name="medicalNeeds"
                    render={() => (
                      <FormItem>
                        <div className="space-y-2">
                          {[
                            { id: 'fasting_required' as const, label: 'Fasting Required' },
                            { id: 'medication_adjustment' as const, label: 'Medication Adjustment' },
                            { id: 'blood_work' as const, label: 'Blood Work' },
                            { id: 'vitals_check' as const, label: 'Vitals Check' }
                          ].map((item) => (
                            <FormField
                              key={item.id}
                              control={appointmentNotesForm.control}
                              name="medicalNeeds"
                              render={({ field }) => {
                                return (
                                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), item.id])
                                            : field.onChange(field.value?.filter((value: any) => value !== item.id));
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Priority */}
              <FormField
                control={appointmentNotesForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="low" id="low" />
                          <label htmlFor="low" className="text-sm font-medium cursor-pointer">Low</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="medium" />
                          <label htmlFor="medium" className="text-sm font-medium cursor-pointer">Medium</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="high" id="high" />
                          <label htmlFor="high" className="text-sm font-medium cursor-pointer">High</label>
                        </div>
                      </RadioGroup>
                    </FormControl>
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
                    setIsAppointmentNotesDialogOpen(false);
                    appointmentNotesForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={appointmentNotesLoading}>
                  {appointmentNotesLoading ? "Saving..." : "Save Appointment Note"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Appointment Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this appointment note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setNoteToDelete(null);
              }}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAppointmentNote}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditAppointmentDialogOpen} onOpenChange={setIsEditAppointmentDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Appointment for {fullName}</DialogTitle>
            <DialogDescription>
              Update the appointment details for this resident.
            </DialogDescription>
          </DialogHeader>

          <Form {...editAppointmentForm}>
            <form onSubmit={editAppointmentForm.handleSubmit(onEditAppointmentSubmit)} className="space-y-6">
              {/* Title */}
              <FormField
                control={editAppointmentForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Title *</FormLabel>
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
                control={editAppointmentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
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
                control={editAppointmentForm.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time *</FormLabel>
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
                control={editAppointmentForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
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
                control={editAppointmentForm.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Staff (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                            No other staff available
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
                    setIsEditAppointmentDialogOpen(false);
                    editAppointmentForm.reset();
                    setAppointmentToEdit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editAppointmentLoading}>
                  {editAppointmentLoading ? "Updating..." : "Update Appointment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Appointment Confirmation Dialog */}
      <Dialog open={isDeleteAppointmentDialogOpen} onOpenChange={setIsDeleteAppointmentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the appointment &quot;{appointmentToDelete?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteAppointmentDialogOpen(false);
                setAppointmentToDelete(null);
              }}
              disabled={deleteAppointmentLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAppointment}
              disabled={deleteAppointmentLoading}
            >
              {deleteAppointmentLoading ? "Deleting..." : "Delete Appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// Wrap component with ErrorBoundary for production-ready error handling
export default function AppointmentsPageWithErrorBoundary(props: DailyCarePageProps) {
  return (
    <ErrorBoundary>
      <DailyCarePage {...props} />
    </ErrorBoundary>
  );
}