"use client";

import React from "react";
import { canCreateQuickCareNotes, canLogDailyCare } from "@/lib/permissions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Activity,
  User,
  Printer,
  Calendar,
  StickyNote,
  Plus,
  Eye,
  X,
  Clock
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { getUKTodayDate, formatTimestampToUKTime, formatTimestampToUKDate, formatTimestampToUKDateTime, formatDateForDisplay } from "@/lib/date-utils";
import { TimePicker } from "@/components/ui/date-time-picker";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";

type DailyCarePageProps = {
  params: Promise<{ id: string }>;
};
// put this at the very top (after imports)

// Communication Needs Enum + Type
const CommunicationNeedEnum = z.enum(["hearing_aid", "glasses", "non_verbal", "memory_support"]);
type CommunicationNeed = z.infer<typeof CommunicationNeedEnum>;

// Safety Alerts Enum + Type
const SafetyAlertEnum = z.enum(["high_falls_risk", "no_unattended_bathroom", "chair_bed_alarm"]);
type SafetyAlert = z.infer<typeof SafetyAlertEnum>;

export default function DailyCarePage({ params }: DailyCarePageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const userRole = profile?.role;
  const canCreateNotes = canCreateQuickCareNotes(userRole);
  const canLogCareEntries = canLogDailyCare(userRole);

  const [resident, setResident] = React.useState<any>(undefined);
  const [todaysCareData, setTodaysCareData] = React.useState<any>(null);
  const [quickCareNotes, setQuickCareNotes] = React.useState<any[]>([]);
  const [allUsers, setAllUsers] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // ✅ UK TIMEZONE: Get today's date in UK timezone
  // This ensures correct date cutoff at midnight UK time (handles GMT/BST)
  const today = React.useMemo(() => {
    return getUKTodayDate(); // YYYY-MM-DD format (UK timezone)
  }, []); // Recalculate only on component mount

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Resident
        const { data: resData } = await supabase
          .from("residents")
          .select("*")
          .eq("id", id)
          .single();
        setResident(resData);

        // Fetch Today's Care Data
        const { data: careData } = await supabase
          .from("personal_care_daily")
          .select(`
            *,
            tasks:personal_care_task_events (*)
          `)
          .eq("resident_id", id)
          .eq("date", today)
          .single();
        setTodaysCareData(careData);

        // Fetch Quick Care Notes
        const { data: notesData } = await supabase
          .from("quick_care_notes")
          .select("*")
          .eq("resident_id", id)
          .eq("is_active", true);
        setQuickCareNotes(notesData || []);

        // Fetch All Users (for staff selection)
        const { data: usersData } = await supabase
          .from("users")
          .select("*")
          .eq("active_organization_id", profile?.active_organization_id);
        setAllUsers(usersData || []);

      } catch (error) {
        console.error("Error fetching daily care data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id && profile?.active_organization_id) {
      fetchData();
    }
  }, [id, today, profile?.active_organization_id]);

  // Get all tasks for today
  const allTasks = React.useMemo(() =>
    todaysCareData?.tasks || []
    , [todaysCareData?.tasks]);

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
  type CommunicationNeed = "hearing_aid" | "glasses" | "non_verbal" | "memory_support";
  type SafetyAlert = "high_falls_risk" | "no_unattended_bathroom" | "chair_bed_alarm";

  const communicationOptions: { id: CommunicationNeed; label: string }[] = [
    { id: "hearing_aid", label: "Hearing Aid" },
    { id: "glasses", label: "Glasses" },
    { id: "non_verbal", label: "Non-verbal" },
    { id: "memory_support", label: "Memory Support" },
  ];

  const safetyOptions: { id: SafetyAlert; label: string }[] = [
    { id: "high_falls_risk", label: "High Falls Risk" },
    { id: "no_unattended_bathroom", label: "Do Not Leave Unattended in Bathroom" },
    { id: "chair_bed_alarm", label: "Chair/Bed Alarm" },
  ];

  // Care Notes Dialog state
  const [isCareNotesDialogOpen, setIsCareNotesDialogOpen] = React.useState(false);
  const [careNotesLoading, setCareNotesLoading] = React.useState(false);

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Care Notes Form Schema
  // Enums


  const CareNotesSchema = z.object({
    category: z.enum(["shower_bath", "toileting", "mobility_only", "positioning_only", "communication", "safety_alerts"]),

    showerOrBath: z.enum(["shower", "bath"]).optional(),
    preferredTime: z.enum(["morning", "afternoon", "evening"]).optional(),
    toiletType: z.enum(["toilet", "commode", "pad"]).optional(),
    assistanceLevel: z.enum(["independent", "1_staff", "2_staff"]).optional(),
    walkingAid: z.enum(["frame", "stick", "wheelchair", "none"]).optional(),
    positioningFrequency: z.enum(["every_hour", "every_2_hours", "every_4_hours", "every_5_hours", "every_6_hours"]).optional(),

    // ✅ strongly typed
    communicationNeeds: z.array(CommunicationNeedEnum).optional(),
    safetyAlerts: z.array(SafetyAlertEnum).optional(),

    priority: z.enum(["low", "medium", "high"]).optional(),
  });


  // Care Notes Form setup
  const careNotesForm = useForm<z.infer<typeof CareNotesSchema>>({
    resolver: zodResolver(CareNotesSchema),
    defaultValues: {
      category: "shower_bath",
      showerOrBath: undefined,
      preferredTime: undefined,
      toiletType: undefined,
      assistanceLevel: undefined,
      walkingAid: undefined,
      communicationNeeds: [],
      safetyAlerts: [],
      priority: "medium",
    },
  });


  // auth data
  const { data: activeOrganization } = { data: { id: profile?.active_organization_id, name: "" } }; // Placeholder if needed, or better use profile
  const user = { user: { id: profile?.id, name: profile?.name, email: profile?.email } };

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
  const [activityRecordTime, setActivityRecordTime] = React.useState(() => {
    // Get current time in HH:MM format
    return new Date().toTimeString().slice(0, 5);
  });
  const [activityRecordNotes, setActivityRecordNotes] = React.useState("");

  // Dialog state management
  const [isPersonalCareDialogOpen, setIsPersonalCareDialogOpen] = React.useState(false);
  const [isActivityRecordDialogOpen, setIsActivityRecordDialogOpen] = React.useState(false);
  const [activeLogTab, setActiveLogTab] = React.useState<string>("personal_care");

  // Update activity record time to current time when dialog opens
  React.useEffect(() => {
    if (isActivityRecordDialogOpen) {
      setActivityRecordTime(new Date().toTimeString().slice(0, 5));
    }
  }, [isActivityRecordDialogOpen]);

  // Update staff fields when user data loads or when dialog opens
  React.useEffect(() => {
    if (user?.user && isPersonalCareDialogOpen) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('staff', staffName);

      // Only set time if it's not already set (don't override user's selection)
      if (!form.getValues('time')) {
        const currentTime = new Date().toTimeString().slice(0, 5);
        form.setValue('time', currentTime);
      }
    }
  }, [user, form, isPersonalCareDialogOpen]);

  // Mutations
  // These will be replaced by direct Supabase calls in handlers

  // Personal Care Activities
  const activityOptions = [
    { id: "bed_bath", label: "Bed Bath", category: "Personal Care" },
    { id: "shampoo_in_bed", label: "Shampoo In Bed", category: "Personal Care" },
    { id: "shower_shampoo", label: "Shower + shampoo", category: "Personal Care" },
    { id: "wash_upper_body", label: "Wash Upper body", category: "Personal Care" },
    { id: "wash_lower_body", label: "Wash Lower Body", category: "Personal Care" },
    { id: "creams_applied", label: "Creams Applied", category: "Personal Care" },
    { id: "shaved", label: "Shaved", category: "Personal Care" },
    { id: "oral_care", label: "Oral Care", category: "Personal Care" },
    { id: "fingernails_trimmed", label: "Fingernails Trimmed", category: "Personal Care" },
    { id: "fingernails_cleaned", label: "Fingernails Cleaned", category: "Personal Care" },
    { id: "hair_brushed", label: "Hair Brushed", category: "Personal Care" },
    { id: "hair_washed_hairdresser", label: "Hair washed/set by hairdresser", category: "Personal Care" },
    { id: "clothing_changed", label: "Clothing Changed", category: "Personal Care" },
    { id: "bed_linens_changed", label: "Bed Linens Changed", category: "Personal Care" },
    { id: "bed_made", label: "Bed Made", category: "Personal Care" },
    { id: "eyeglasses_care", label: "Eyeglasses Care", category: "Personal Care" },
    { id: "footwear_care", label: "Foot Wear Care", category: "Personal Care" }
  ] as const;


  // Get other staff (excluding current user) for assisted staff dropdown
  const otherStaffOptions = allUsers?.filter(u => u.email !== user?.user?.email).map(u => ({
    key: u.id, // Use unique user ID as key
    label: u.name,
    email: u.email,
    name: u.name
  })) || [];

  // Current user info for primary staff
  const currentUserName = user?.user?.name || user?.user?.email?.split('@')[0] || "";

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof PersonalCareSchema>) => {
    try {
      // 1. Ensure daily record exists
      let careDailyId = todaysCareData?.id;
      if (!careDailyId) {
        const { data: newDaily, error: dailyError } = await supabase
          .from("personal_care_daily")
          .insert({
            resident_id: id,
            organization_id: profile?.active_organization_id,
            date: today,
            created_by: profile?.id,
          })
          .select()
          .single();

        if (dailyError) throw dailyError;
        careDailyId = newDaily.id;
      }

      // 2. Insert task events (one per activity)
      const taskEventPromises = data.activities.map((activity) =>
        supabase.from("personal_care_task_events").insert({
          daily_id: careDailyId,
          resident_id: id,
          organization_id: profile?.active_organization_id,
          task_type: activity,
          status: "completed",
          performed_by: profile?.id,
          notes: data.notes,
          payload: {
            time: data.time,
            primaryStaff: data.staff,
            assistedStaff: data.assistedStaff === "none" ? undefined : data.assistedStaff,
          },
        })
      );

      const taskResults = await Promise.all(taskEventPromises);
      const taskErrors = taskResults.filter((result) => result.error);
      if (taskErrors.length > 0) {
        throw taskErrors[0].error;
      }

      // Reset form with staff name preserved
      form.reset({
        activities: [],
        time: "",
        staff: currentUserName, // Keep the staff name populated
        assistedStaff: "",
        notes: "",
      });
      setIsPersonalCareDialogOpen(false);

      // Refresh data
      // (In a real app, we'd use a more efficient way to update local state or revalidate)
      window.location.reload(); // Simple refresh for now to ensure data consistency

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
      // 1. Ensure daily record exists
      let careDailyId = todaysCareData?.id;
      if (!careDailyId) {
        const { data: newDaily, error: dailyError } = await supabase
          .from("personal_care_daily")
          .insert({
            resident_id: id,
            organization_id: profile?.active_organization_id,
            date: today,
            created_by: profile?.id,
          })
          .select()
          .single();

        if (dailyError) throw dailyError;
        careDailyId = newDaily.id;
      }

      // 2. Insert task event
      const { error: taskError } = await supabase
        .from("personal_care_task_events")
        .insert({
          daily_id: careDailyId,
          resident_id: id,
          organization_id: profile?.active_organization_id,
          task_type: "daily_activity_record",
          status: "completed",
          performed_by: profile?.id,
          notes: activityRecordNotes || undefined,
          payload: {
            time: activityRecordTime,
            staff: currentUserName,
          },
        });

      if (taskError) throw taskError;

      // Clear form and close dialog (keep current user as staff)
      setActivityRecordTime(new Date().toTimeString().slice(0, 5));
      setActivityRecordNotes("");
      setIsActivityRecordDialogOpen(false);

      // Refresh data
      window.location.reload();

      toast.success("Daily activity record saved successfully");
    } catch (error) {
      console.error("Error saving daily activity record:", error);
      toast.error("Failed to save daily activity record");
    }
  };

  // Handle care notes submission
  const onCareNotesSubmit = async (data: z.infer<typeof CareNotesSchema>) => {
    if (!user || !profile?.active_organization_id) {
      toast.error("Authentication required");
      return;
    }

    setCareNotesLoading(true);
    try {
      const { error } = await supabase
        .from("quick_care_notes")
        .insert({
          resident_id: id,
          category: data.category,
          shower_or_bath: data.showerOrBath,
          preferred_time: data.preferredTime,
          toilet_type: data.toiletType,
          assistance_level: data.assistanceLevel,
          walking_aid: data.walkingAid,
          positioning_frequency: data.positioningFrequency,
          communication_needs: data.communicationNeeds,
          safety_alerts: data.safetyAlerts,
          priority: data.priority,
          organization_id: profile.active_organization_id,
          team_id: profile.active_team_id,
          created_by: user.user.id,
        });

      if (error) throw error;

      toast.success("Care note saved successfully");
      careNotesForm.reset();
      setIsCareNotesDialogOpen(false);

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error("Error saving care note:", error);
      toast.error("Failed to save care note");
    } finally {
      setCareNotesLoading(false);
    }
  };

  // Handle delete care note
  const handleDeleteCareNote = async () => {
    if (!noteToDelete) return;

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from("quick_care_notes")
        .update({ is_active: false })
        .eq("id", noteToDelete);

      if (error) throw error;

      toast.success("Care note deleted successfully");
      setDeleteConfirmOpen(false);
      setNoteToDelete(null);

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error("Error deleting care note:", error);
      toast.error("Failed to delete care note");
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteConfirmOpen(true);
  };

  if (resident === undefined || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`;

  // Handle print functionality
  const handlePrint = () => {
    if (!todaysCareData || !resident) return;

    // Get all activity records for today
    const activityRecords = allTasks.filter(task =>
      task.task_type === 'daily_activity_record'
    );

    // Get all personal care tasks for today
    const personalCareTasks = allTasks.filter(task =>
      task.task_type !== 'daily_activity_record'
    );

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Care Report - ${fullName} (${today})</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 15mm; }
            @media print { 
              body { margin: 0; } 
              .activity-item { page-break-inside: avoid; }
            }
            body { 
              font-family: 'Inter', -apple-system, sans-serif; 
              line-height: 1.5; 
              color: #1f2937;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            .brand-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px;
              background: #f9fafb;
              border-bottom: 2px solid #2563eb;
            }
            .brand-logo {
              font-size: 24px;
              font-weight: 800;
              color: #2563eb;
              letter-spacing: -0.025em;
            }
            .report-type {
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #6b7280;
            }
            .resident-info {
              padding: 20px;
              background: #ffffff;
              border-bottom: 1px solid #e5e7eb;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .info-block {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 14px;
              font-weight: 500;
              color: #111827;
            }
            .content {
              padding: 20px;
            }
            .daily-summary-bar {
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 8px;
              padding: 12px 20px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .summary-text {
              font-size: 14px;
              color: #1e40af;
              font-weight: 600;
            }
            .section-title {
              font-size: 16px;
              font-weight: 700;
              color: #111827;
              margin: 24px 0 12px 0;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .section-title::before {
              content: '';
              display: inline-block;
              width: 4px;
              height: 16px;
              background: #2563eb;
              border-radius: 2px;
            }
            .activity-item {
              margin-bottom: 16px;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 16px;
              background: #fff;
            }
            .activity-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 8px;
            }
            .activity-name {
              font-size: 14px;
              font-weight: 600;
              color: #111827;
            }
            .activity-time {
              font-size: 12px;
              color: #6b7280;
              font-weight: 500;
            }
            .activity-notes {
              font-size: 13px;
              color: #4b5563;
              font-style: italic;
              margin-top: 8px;
              padding-left: 12px;
              border-left: 2px solid #e5e7eb;
            }
            .staff-meta {
              margin-top: 12px;
              font-size: 11px;
              color: #9ca3af;
              display: flex;
              gap: 12px;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 10px;
              font-weight: 600;
              background: #dbeafe;
              color: #1e40af;
            }
            .footer {
              margin-top: 40px;
              padding: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 11px;
              color: #9ca3af;
              text-align: center;
            }
            .empty-state {
              padding: 24px;
              text-align: center;
              background: #f9fafb;
              border: 1px dashed #e5e7eb;
              border-radius: 10px;
              color: #6b7280;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="brand-header">
            <div class="brand-logo">CareO</div>
            <div class="report-type">Daily Care Report</div>
          </div>

          <div class="resident-info">
            <div class="info-block">
              <span class="info-label">Resident Name</span>
              <span class="info-value">${fullName}</span>
            </div>
            <div class="info-block">
              <span class="info-label">Date of Birth</span>
              <span class="info-value">${resident.date_of_birth ? formatTimestampToUKDate(resident.date_of_birth) : '--'}</span>
            </div>
          </div>
          
          <div class="content">
            <div class="daily-summary-bar">
              <span class="summary-text">${formatDateForDisplay(today)}</span>
              <span class="badge">Day Period: 08:00 - 08:00</span>
            </div>

            <div class="section">
              <h3 class="section-title">Daily Activity Records</h3>
              ${activityRecords.length > 0 ?
        activityRecords
          .filter(a => a.created_at)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((activity) => {
            const payload = activity.payload as { time?: string; staff?: string } | null;
            const displayTime = payload?.time || (activity.created_at ? formatTimestampToUKDateTime(activity.created_at, 'dd/MM/yyyy HH:mm') : '--');
            return `
                      <div class="activity-item">
                        <div class="activity-header">
                          <div class="activity-name">Daily Activity Record</div>
                          <div class="activity-time">${displayTime}</div>
                        </div>
                        ${activity.notes ? `<div class="activity-notes">${activity.notes}</div>` : ''}
                        <div class="staff-meta">
                          <span>Staff: ${payload?.staff || 'Staff'}</span>
                          <span>•</span>
                          <span>Recorded: ${formatTimestampToUKDateTime(activity.created_at, 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                      </div>
                    `;
          }).join('')
        : `<div class="empty-state">No daily activity records logged for this day.</div>`
      }
            </div>

            <div class="section">
              <h3 class="section-title">Personal Care Activities</h3>
              ${personalCareTasks.length > 0 ?
        personalCareTasks
          .filter(a => a.created_at)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((activity) => {
            const payload = activity.payload as { time?: string; primaryStaff?: string; assistedStaff?: string } | null;
            const displayTime = payload?.time || (activity.created_at ? formatTimestampToUKDateTime(activity.created_at, 'dd/MM/yyyy HH:mm') : '--');
            return `
                      <div class="activity-item">
                        <div class="activity-header">
                          <div class="activity-name">${activity.task_type}</div>
                          <div class="activity-time">${displayTime}</div>
                        </div>
                        ${activity.notes ? `<div class="activity-notes">${activity.notes}</div>` : ''}
                        <div class="staff-meta">
                          <span>Staff: ${payload?.primaryStaff || 'Staff'} ${payload?.assistedStaff ? `(Assisted by: ${payload.assistedStaff})` : ''}</span>
                          <span>•</span>
                          <span>Recorded: ${formatTimestampToUKDateTime(activity.created_at, 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                      </div>
                    `;
          }).join('')
        : `<div class="empty-state">No personal care activities logged for this day.</div>`
      }
            </div>
          </div>
          
          <div class="footer">
            <div style="font-weight: 600; margin-bottom: 4px;">CareO Management System</div>
            <div>Generated: ${formatTimestampToUKDateTime(Date.now(), 'dd/MM/yyyy HH:mm')} UK Time</div>
            <div style="margin-top: 8px;">Confidential • For professional use only</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
            <h1 className="text-xl sm:text-2xl font-bold">Daily Care</h1>
            <p className="text-muted-foreground text-sm">
              View care activities and dependencies for {resident.first_name} {resident.last_name}.
            </p>
          </div>
          <div className="flex flex-row gap-2">
            {canCreateNotes && (
              <Button
                onClick={() => setIsCareNotesDialogOpen(true)}
                className="bg-black text-white hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Quick Care Notes
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/residents/${id}/daily-care/documents`)}
            >
              <Eye className="w-4 h-4 mr-2" />
              See All Records
            </Button>
          </div>
        </div>

        {/* Care Notes Section */}
        {quickCareNotes && quickCareNotes.length > 0 && (
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <StickyNote className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Care Notes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickCareNotes.length > 0 ? (
                  quickCareNotes.map((note) => {
                    // Get badge style based on category
                    const getBadgeStyle = (category: string) => {
                      switch (category) {
                        case 'shower_bath':
                          return 'bg-blue-50 text-blue-700 border-blue-200';
                        case 'toileting':
                          return 'bg-green-50 text-green-700 border-green-200';
                        case 'mobility_positioning':
                          return 'bg-purple-50 text-purple-700 border-purple-200';
                        case 'mobility_only':
                          return 'bg-purple-50 text-purple-700 border-purple-200';
                        case 'positioning_only':
                          return 'bg-indigo-50 text-indigo-700 border-indigo-200';
                        case 'communication':
                          return 'bg-orange-50 text-orange-700 border-orange-200';
                        case 'safety_alerts':
                          return 'bg-red-50 text-red-700 border-red-200';
                        default:
                          return 'bg-gray-50 text-gray-700 border-gray-200';
                      }
                    };

                    // Get display text based on category and structured data
                    const getDisplayText = (note: typeof quickCareNotes[0]) => {
                      const categoryLabels = {
                        shower_bath: 'Shower/Bath',
                        toileting: 'Toileting',
                        mobility_positioning: 'Mobility & Positioning',
                        mobility_only: 'Mobility',
                        positioning_only: 'Positioning',
                        communication: 'Communication',
                        safety_alerts: 'Safety'
                      };

                      const category = categoryLabels[note.category as keyof typeof categoryLabels] || note.category;

                      let details: string[] = [];

                      if (note.category === 'shower_bath') {
                        if (note.shower_or_bath) details.push(note.shower_or_bath === 'shower' ? 'Shower' : 'Bath');
                        if (note.preferred_time) details.push(note.preferred_time.charAt(0).toUpperCase() + note.preferred_time.slice(1));
                      }

                      if (note.category === 'toileting') {
                        if (note.toilet_type) details.push(note.toilet_type.charAt(0).toUpperCase() + note.toilet_type.slice(1));
                        if (note.assistance_level) {
                          const assistanceLabels = {
                            independent: 'Independent',
                            '1_staff': '1 Staff',
                            '2_staff': '2 Staff'
                          };
                          details.push(assistanceLabels[note.assistance_level as keyof typeof assistanceLabels]);
                        }
                      }

                      if ((note.category === 'mobility_positioning' || note.category === 'mobility_only') && note.walking_aid) {
                        const aidLabels = {
                          frame: 'Walking Frame',
                          stick: 'Walking Stick',
                          wheelchair: 'Wheelchair',
                          none: 'No Aid'
                        };
                        details.push(aidLabels[note.walking_aid as keyof typeof aidLabels]);
                      }

                      if ((note.category === 'mobility_positioning' || note.category === 'positioning_only') && note.positioning_frequency) {
                        const frequencyLabels = {
                          every_hour: 'Every Hour',
                          every_2_hours: 'Every 2 Hours',
                          every_4_hours: 'Every 4 Hours',
                          every_5_hours: 'Every 5 Hours',
                          every_6_hours: 'Every 6 Hours'
                        };
                        details.push(frequencyLabels[note.positioning_frequency as keyof typeof frequencyLabels]);
                      }

                      if (note.category === 'communication' && note?.communication_needs?.length) {
                        const needLabels = {
                          hearing_aid: 'Hearing Aid',
                          glasses: 'Glasses',
                          non_verbal: 'Non-verbal',
                          memory_support: 'Memory Support'
                        };
                        details = note.communication_needs?.map((need: string) =>
                          needLabels[need as keyof typeof needLabels] || need
                        );
                      }

                      if (note.category === 'safety_alerts' && note?.safety_alerts?.length) {
                        const alertLabels = {
                          high_falls_risk: 'Falls Risk',
                          no_unattended_bathroom: 'No Unattended',
                          chair_bed_alarm: 'Alarm'
                        };
                        details = note.safety_alerts.map((alert: string) =>
                          alertLabels[alert as keyof typeof alertLabels] || alert
                        );
                      }

                      if (details.length > 0) {
                        return `${category}: ${details.join(', ')}`;
                      }

                      return category;
                    };

                    // Create individual badges for multiple items (communication/safety)
                    if (note.category === 'communication' && note.communication_needs && note.communication_needs.length > 1) {
                      return note.communication_needs.map((need: string, index: number) => (
                        <div key={`${note.id}-${index}`} className="group">
                          <Badge className={`${getBadgeStyle(note.category)} pr-8 relative`}>
                            Communication: {need.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            {note.priority === 'high' && ' ⚠️'}
                            <button
                              onClick={() => confirmDelete(note.id)}
                              className="absolute top-1/2 -translate-y-1/2 right-1 w-4 h-4 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        </div>
                      ));
                    }

                    if (note.category === 'safety_alerts' && (note.safety_alerts?.length ?? 0) > 1) {
                      return (note.safety_alerts ?? []).map((alert: string, index: number) => (
                        <div key={`${note.id}-${index}`} className="group">
                          <Badge className={`${getBadgeStyle(note.category)} pr-8 relative`}>
                            Safety: {alert.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            {note.priority === 'high' && ' ⚠️'}
                            <button
                              onClick={() => confirmDelete(note.id)}
                              className="absolute top-1/2 -translate-y-1/2 right-1 w-4 h-4 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        </div>
                      ));
                    }

                    return (
                      <div key={note.id} className="group">
                        <Badge className={`${getBadgeStyle(note.category)} pr-8 relative`}>
                          {getDisplayText(note)}
                          {note.priority === 'high' && ' ⚠️'}
                          <button
                            onClick={() => confirmDelete(note.id)}
                            className="absolute top-0 right-1 w-4 h-4 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      </div>
                    );
                  }).flat() // Flatten in case of multiple badges per note
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Care Entry Buttons */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Personal Care & Daily Activities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {canLogCareEntries && (
                <>
                  <Button
                    variant="outline"
                    className="h-16 text-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 hover:border-orange-300"
                    onClick={() => setIsPersonalCareDialogOpen(true)}
                  >
                    <User className="w-6 h-6 mr-3" />
                    Log Personal Care
                  </Button>
                  <Button
                    variant="outline"
                    className="h-16 text-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300"
                    onClick={() => setIsActivityRecordDialogOpen(true)}
                  >
                    <Activity className="w-6 h-6 mr-3" />
                    Log Daily Activity
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>


        {/* Today's Log History */}
        <Card className="border-0">
          <CardHeader>
            {/* Mobile Layout */}
            <CardTitle className="block sm:hidden">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-5 h-5 text-gray-600" />
                <span>Today&apos;s Log History</span>
              </div>
              <div className="flex flex-col space-y-2">
                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 self-start">
                  {new Date().toLocaleDateString()}
                </Badge>
              </div>
            </CardTitle>

            {/* Desktop Layout */}
            <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <span>Today&apos;s Log History</span>
              </div>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                {formatTimestampToUKDate(Date.now())}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLogTab} onValueChange={setActiveLogTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal_care" className="text-sm">Personal Care</TabsTrigger>
                <TabsTrigger value="activity_records" className="text-sm">Activity Records</TabsTrigger>
              </TabsList>

              {/* Personal Care Tab */}
              <TabsContent value="personal_care" className="mt-4">
                {(() => {
                  const personalCareTasks = allTasks
                    .filter(task => task.task_type !== 'daily_activity_record' && task.created_at)
                    .sort((a, b) => {
                      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                      return bTime - aTime;
                    });

                  return personalCareTasks.length > 0 ? (
                    <div className="space-y-2">
                      {personalCareTasks.map((task) => {
                        const activity = activityOptions.find(opt => opt.id === task.task_type);
                        const payload = task.payload as { time?: string; primaryStaff?: string; assistedStaff?: string } | null;
                        const staffName = payload?.primaryStaff || 'Staff';
                        const displayTime = payload?.time || (task.created_at ? formatTimestampToUKTime(task.created_at) : '--');

                        return (
                          <div key={task.id} className="text-sm border-b pb-2 last:border-b-0">
                            <span className="font-medium">
                              {displayTime}
                            </span>
                            {" - "}
                            <span className="text-muted-foreground">{activity?.label || task.task_type}</span>
                            {task.notes && (
                              <span className="text-muted-foreground"> - {task.notes}</span>
                            )}
                            <span className="text-xs text-muted-foreground ml-2 italic">
                              sign by {staffName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <User className="w-8 h-8 text-blue-400" />
                        </div>
                      </div>
                      <p className="text-gray-600 font-medium mb-2">No personal care activities</p>
                      <p className="text-sm text-gray-500">
                        No personal care activities logged today
                      </p>
                    </div>
                  );
                })()}
              </TabsContent>

              {/* Activity Records Tab */}
              <TabsContent value="activity_records" className="mt-4">
                {(() => {
                  const activityRecords = allTasks
                    .filter(task => task.task_type === 'daily_activity_record' && task.created_at)
                    .sort((a, b) => {
                      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                      return bTime - aTime;
                    });

                  return activityRecords.length > 0 ? (
                    <div className="space-y-2">
                      {activityRecords.map((task) => {
                        const payload = task.payload as { time?: string; staff?: string } | null;
                        const staffName = payload?.staff || 'Staff';
                        const displayTime = payload?.time || (task.created_at ? formatTimestampToUKTime(task.created_at) : '--');

                        return (
                          <div key={task.id} className="text-sm border-b pb-2 last:border-b-0">
                            <span className="font-medium">
                              {displayTime}
                            </span>
                            {" - "}
                            <span className="text-muted-foreground">Daily Activity Record</span>
                            {task.notes && (
                              <span className="text-muted-foreground"> - {task.notes}</span>
                            )}
                            <span className="text-xs text-muted-foreground ml-2 italic">
                              sign by {staffName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-green-100 rounded-full">
                          <Activity className="w-8 h-8 text-green-400" />
                        </div>
                      </div>
                      <p className="text-gray-600 font-medium mb-2">No daily activity records</p>
                      <p className="text-sm text-gray-500">
                        No daily activity records logged today
                      </p>
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>


        {/* Today's Summary Card */}
        <Card className="border-0">
          <CardHeader>
            {/* Mobile Layout */}
            <CardTitle className="block sm:hidden">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <span>Today&apos;s Summary</span>
              </div>
              <Badge variant="outline" className="self-start">
                {formatTimestampToUKDate(Date.now())}
              </Badge>
            </CardTitle>
            {/* Desktop Layout */}
            <CardTitle className="hidden sm:flex sm:items-center sm:space-x-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span>Today&apos;s Summary</span>
              <Badge variant="outline" className="ml-auto">
                {formatTimestampToUKDate(Date.now())}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-2xl font-bold text-amber-600">
                  {(() => {
                    const personalCareCount = allTasks.filter(task => task.task_type !== 'daily_activity_record').length || 0;
                    return personalCareCount;
                  })()}
                </div>
                <p className="text-sm text-amber-700">Personal Care</p>
                {(() => {
                  const personalCareTasks = allTasks.filter(task => task.task_type !== 'daily_activity_record' && task.created_at);
                  if (personalCareTasks.length > 0) {
                    const lastTask = personalCareTasks.reduce((latest, task) => {
                      const taskTime = task.created_at ? new Date(task.created_at).getTime() : 0;
                      const latestTime = latest.created_at ? new Date(latest.created_at).getTime() : 0;
                      return taskTime > latestTime ? task : latest;
                    });
                    const payload = lastTask.payload as { time?: string } | null;
                    const displayTime = payload?.time || (lastTask.created_at ? formatTimestampToUKTime(lastTask.created_at) : '--');
                    return (
                      <p className="text-xs text-amber-600 mt-1">
                        Last: {displayTime}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="text-2xl font-bold text-indigo-600">
                  {(() => {
                    const dailyActivityCount = allTasks.filter(task => task.task_type === 'daily_activity_record').length || 0;
                    return dailyActivityCount;
                  })()}
                </div>
                <p className="text-sm text-indigo-700">Daily Activity</p>
                {(() => {
                  const activityRecords = allTasks.filter(task => task.task_type === 'daily_activity_record' && task.created_at);
                  if (activityRecords.length > 0) {
                    const lastActivity = activityRecords.reduce((latest, task) => {
                      const taskTime = task.created_at ? new Date(task.created_at).getTime() : 0;
                      const latestTime = latest.created_at ? new Date(latest.created_at).getTime() : 0;
                      return taskTime > latestTime ? task : latest;
                    });
                    const payload = lastActivity.payload as { time?: string } | null;
                    const displayTime = payload?.time || (lastActivity.created_at ? formatTimestampToUKTime(lastActivity.created_at) : '--');
                    return (
                      <p className="text-xs text-indigo-600 mt-1">
                        Last: {displayTime}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-600">
                  {(() => {
                    const validTasks = allTasks.filter(t => t.created_at);
                    if (validTasks.length > 0) {
                      // Find the most recent task by created_at
                      const latestTask = validTasks.reduce((latest, task) => {
                        const taskTime = task.created_at ? new Date(task.created_at).getTime() : 0;
                        const latestTime = latest.created_at ? new Date(latest.created_at).getTime() : 0;
                        return taskTime > latestTime ? task : latest;
                      });
                      // Use payload time if available, otherwise fall back to created_at
                      const payload = latestTask.payload as { time?: string } | null;
                      return payload?.time || (latestTask.created_at ? formatTimestampToUKTime(latestTask.created_at) : "--");
                    }
                    return "--";
                  })()}
                </div>
                <p className="text-sm text-gray-700">Last recorded</p>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Add Care Notes Dialog */}
        <Dialog open={isCareNotesDialogOpen} onOpenChange={setIsCareNotesDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Care Note for {fullName}</DialogTitle>
              <DialogDescription>
                Add a quick care note to help other staff understand the resident&apos;s needs.
              </DialogDescription>
            </DialogHeader>

            <Form {...careNotesForm}>
              <form onSubmit={careNotesForm.handleSubmit(onCareNotesSubmit)} className="space-y-6">
                {/* Category Selection */}
                <FormField
                  control={careNotesForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Care Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select care category..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="shower_bath">Shower/Bath Preference</SelectItem>
                          <SelectItem value="toileting">Toileting Needs</SelectItem>
                          <SelectItem value="mobility_only">Mobility</SelectItem>
                          <SelectItem value="positioning_only">Positioning</SelectItem>
                          <SelectItem value="communication">Communication Needs</SelectItem>
                          <SelectItem value="safety_alerts">Safety Alerts</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Shower/Bath Preference Fields */}
                {careNotesForm.watch('category') === 'shower_bath' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium text-blue-900">Shower/Bath Preferences</h4>

                    <FormField
                      control={careNotesForm.control}
                      name="showerOrBath"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shower or Bath</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select preference..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="shower">Shower</SelectItem>
                              <SelectItem value="bath">Bath</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={careNotesForm.control}
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
                  </div>
                )}

                {/* Toileting Needs Fields */}
                {careNotesForm.watch('category') === 'toileting' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                    <h4 className="font-medium text-green-900">Toileting Needs</h4>

                    <FormField
                      control={careNotesForm.control}
                      name="toiletType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Toilet Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select toilet type..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="toilet">Toilet</SelectItem>
                              <SelectItem value="commode">Commode</SelectItem>
                              <SelectItem value="pad">Pad</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={careNotesForm.control}
                      name="assistanceLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assistance Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select assistance level..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="independent">Independent</SelectItem>
                              <SelectItem value="1_staff">1 Staff</SelectItem>
                              <SelectItem value="2_staff">2 Staff</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Mobility & Positioning Fields */}
                {/* This section is no longer needed as mobility_positioning was split */}
                {false && (
                  <div className="space-y-4 p-4 border rounded-lg bg-purple-50">
                    <h4 className="font-medium text-purple-900">Mobility & Positioning</h4>

                    <FormField
                      control={careNotesForm.control}
                      name="walkingAid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Walking Aid</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select walking aid..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="frame">Walking Frame</SelectItem>
                              <SelectItem value="stick">Walking Stick</SelectItem>
                              <SelectItem value="wheelchair">Wheelchair</SelectItem>
                              <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={careNotesForm.control}
                      name="positioningFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Positioning Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select positioning frequency..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="every_hour">Every Hour</SelectItem>
                              <SelectItem value="every_2_hours">Every 2 Hours</SelectItem>
                              <SelectItem value="every_4_hours">Every 4 Hours</SelectItem>
                              <SelectItem value="every_5_hours">Every 5 Hours</SelectItem>
                              <SelectItem value="every_6_hours">Every 6 Hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Mobility Only Fields */}
                {careNotesForm.watch('category') === 'mobility_only' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium text-blue-900">Mobility</h4>

                    <FormField
                      control={careNotesForm.control}
                      name="walkingAid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Walking Aid</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select walking aid..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="frame">Walking Frame</SelectItem>
                              <SelectItem value="stick">Walking Stick</SelectItem>
                              <SelectItem value="wheelchair">Wheelchair</SelectItem>
                              <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Positioning Only Fields */}
                {careNotesForm.watch('category') === 'positioning_only' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                    <h4 className="font-medium text-green-900">Positioning</h4>

                    <FormField
                      control={careNotesForm.control}
                      name="positioningFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Positioning Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select positioning frequency..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="every_hour">Every Hour</SelectItem>
                              <SelectItem value="every_2_hours">Every 2 Hours</SelectItem>
                              <SelectItem value="every_4_hours">Every 4 Hours</SelectItem>
                              <SelectItem value="every_5_hours">Every 5 Hours</SelectItem>
                              <SelectItem value="every_6_hours">Every 6 Hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Communication Needs Fields */}
                {careNotesForm.watch('category') === 'communication' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-orange-50">
                    <h4 className="font-medium text-orange-900">Communication Needs</h4>
                    <p className="text-sm text-orange-700">Select all that apply:</p>

                    <FormField
                      control={careNotesForm.control}
                      name="communicationNeeds"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'hearing_aid' as const, label: 'Hearing Aid' },
                              { id: 'glasses' as const, label: 'Glasses' },
                              { id: 'non_verbal' as const, label: 'Non-verbal' },
                              { id: 'memory_support' as const, label: 'Memory Support' }
                            ].map((item) => (
                              <FormField
                                key={item.id}
                                control={careNotesForm.control}
                                name="communicationNeeds"
                                render={({ field }) => {
                                  return (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item?.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), item.id])
                                              : field.onChange(field.value?.filter((value) => value !== item.id));
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

                {/* Safety Alerts Fields */}
                {careNotesForm.watch('category') === 'safety_alerts' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-red-50">
                    <h4 className="font-medium text-red-900">Safety Alerts</h4>
                    <p className="text-sm text-red-700">Select all that apply:</p>

                    <FormField
                      control={careNotesForm.control}
                      name="safetyAlerts"
                      render={() => (
                        <FormItem>
                          <div className="space-y-2">
                            {[
                              { id: 'high_falls_risk' as const, label: 'High Falls Risk' },
                              { id: 'no_unattended_bathroom' as const, label: 'Do Not Leave Unattended in Bathroom' },
                              { id: 'chair_bed_alarm' as const, label: 'Chair/Bed Alarm' }
                            ].map((item) => (
                              <FormField
                                key={item.id}
                                control={careNotesForm.control}
                                name="safetyAlerts"
                                render={({ field }) => {
                                  return (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), item.id])
                                              : field.onChange(field.value?.filter((value) => value !== item.id));
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
                  control={careNotesForm.control}
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
                      setIsCareNotesDialogOpen(false);
                      careNotesForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={careNotesLoading}>
                    {careNotesLoading ? "Saving..." : "Save Care Note"}
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
              <DialogTitle>Delete Care Note</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this care note? This action cannot be undone.
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
                onClick={handleDeleteCareNote}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Personal Care Dialog */}
        <Dialog open={isPersonalCareDialogOpen} onOpenChange={setIsPersonalCareDialogOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Personal Care Activities for {fullName}</DialogTitle>
              <DialogDescription>
                Record personal care activities performed for this resident.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Activities Section */}
                <FormField
                  control={form.control}
                  name="activities"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Activities</FormLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-3 border rounded-md">
                        {activityOptions.map((activity) => (
                          <FormField
                            key={activity.id}
                            control={form.control}
                            name="activities"
                            render={({ field }) => {
                              return (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(activity.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, activity.id])
                                          : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== activity.id
                                            )
                                          )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-xs font-normal cursor-pointer">
                                    {activity.label}
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

                {/* Form Controls */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Time</FormLabel>
                          <FormControl>
                            <TimePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select time"
                              className="h-9"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="staff"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Primary Staff</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={currentUserName}
                              disabled
                              className="h-9 bg-gray-50 text-gray-600"
                              placeholder="Current user"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assistedStaff"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Assisted By (optional)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select assisting staff..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {otherStaffOptions.length > 0 ? (
                                otherStaffOptions.map((staff) => (
                                  <SelectItem key={staff.key} value={staff.name}>
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
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Notes (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter notes..."
                            className="h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsPersonalCareDialogOpen(false);
                      form.reset({
                        activities: [],
                        time: "",
                        staff: currentUserName, // Keep the staff name populated
                        assistedStaff: "",
                        notes: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save Personal Care Activities
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Daily Activity Record Dialog */}
        <Dialog open={isActivityRecordDialogOpen} onOpenChange={setIsActivityRecordDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Daily Activity Record for {fullName}</DialogTitle>
              <DialogDescription>
                Record daily activity notes for this resident.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Activity Notes</Label>
                <Input
                  placeholder="Enter activity details..."
                  value={activityRecordNotes}
                  onChange={(e) => setActivityRecordNotes(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Time</Label>
                <TimePicker
                  value={activityRecordTime}
                  onChange={setActivityRecordTime}
                  placeholder="Select time"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Primary Staff</Label>
                <Input
                  value={currentUserName}
                  disabled
                  className="h-9 bg-gray-50 text-gray-600"
                  placeholder="Current user"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsActivityRecordDialogOpen(false);
                    setActivityRecordTime(new Date().toTimeString().slice(0, 5));
                    setActivityRecordNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleActivityRecordSubmit}
                  disabled={!currentUserName || !activityRecordTime}
                >
                  Save Daily Activity Record
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div >
  );
}