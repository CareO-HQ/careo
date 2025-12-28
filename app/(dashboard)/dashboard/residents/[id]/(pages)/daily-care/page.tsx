"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
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
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // ✅ UK TIMEZONE: Get today's date in UK timezone
  // This ensures correct date cutoff at midnight UK time (handles GMT/BST)
  const today = React.useMemo(() => {
    // Import and use UK timezone function
    const now = new Date();
    const ukDateStr = now.toLocaleString('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
    const [day, month, year] = ukDateStr.split('/');
    return `${year}-${month}-${day}`; // YYYY-MM-DD format
  }, []); // Recalculate only on component mount

  // Query today's data - full 24-hour day (midnight to midnight)
  const todaysCareData = useQuery(api.personalCare.getDailyPersonalCare, {
    residentId: id as Id<"residents">,
    date: today,
  });

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


  const quickCareNotes = useQuery(api.quickCareNotes.getQuickCareNotesByResident, {
    residentId: id as Id<"residents">,
    activeOnly: true,
  });


  // Get all users for staff selection
  const allUsers = useQuery(api.user.getAllUsers);

  // Auth data
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();

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

  // Update staff fields and time when user data loads or when dialog opens
  React.useEffect(() => {
    if (user?.user && isPersonalCareDialogOpen) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('staff', staffName);

      // Set current time
      const currentTime = new Date().toTimeString().slice(0, 5);
      form.setValue('time', currentTime);
    }
  }, [user, form, isPersonalCareDialogOpen]);

  // Mutations
  const createPersonalCareActivities = useMutation(api.personalCare.createPersonalCareActivities);
  const createDailyActivityRecord = useMutation(api.personalCare.createDailyActivityRecord);
  const createQuickCareNote = useMutation(api.quickCareNotes.createQuickCareNote);
  const deleteQuickCareNote = useMutation(api.quickCareNotes.deleteQuickCareNote);

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
    key: u._id, // Use unique user ID as key
    label: u.name,
    email: u.email,
    name: u.name
  })) || [];

  // Current user info for primary staff
  const currentUserName = user?.user?.name || user?.user?.email?.split('@')[0] || "";

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof PersonalCareSchema>) => {
    try {
      await createPersonalCareActivities({
        residentId: id as Id<"residents">,
        date: today,
        activities: data.activities,
        time: data.time,
        staff: data.staff,
        assistedStaff: data.assistedStaff === "none" ? undefined : data.assistedStaff,
        notes: data.notes,
        // No shift field - storing full day activities
      });

      // Reset form with staff name preserved
      form.reset({
        activities: [],
        time: "",
        staff: currentUserName, // Keep the staff name populated
        assistedStaff: "",
        notes: "",
      });
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
        residentId: id as Id<"residents">,
        date: today,
        time: activityRecordTime,
        staff: currentUserName,
        notes: activityRecordNotes || undefined,
      });

      // Clear form and close dialog (keep current user as staff)
      setActivityRecordTime(new Date().toTimeString().slice(0, 5));
      setActivityRecordNotes("");
      setIsActivityRecordDialogOpen(false);
      toast.success("Daily activity record saved successfully");
    } catch (error) {
      console.error("Error saving daily activity record:", error);
      toast.error("Failed to save daily activity record");
    }
  };

  // Handle care notes submission
  const onCareNotesSubmit = async (data: z.infer<typeof CareNotesSchema>) => {
    if (!user || !activeOrganization) {
      toast.error("Authentication required");
      return;
    }

    setCareNotesLoading(true);
    try {
      await createQuickCareNote({
        residentId: id as Id<"residents">,
        category: data.category,
        showerOrBath: data.showerOrBath,
        preferredTime: data.preferredTime,
        toiletType: data.toiletType,
        assistanceLevel: data.assistanceLevel,
        walkingAid: data.walkingAid,
        positioningFrequency: data.positioningFrequency,
        communicationNeeds: data.communicationNeeds,
        safetyAlerts: data.safetyAlerts,
        priority: data.priority,
        organizationId: activeOrganization.id,
        teamId: activeOrganization.id, // Using organization ID as team ID for now
        createdBy: user.user.id,
      });

      toast.success("Care note saved successfully");
      careNotesForm.reset();
      setIsCareNotesDialogOpen(false);
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
      await deleteQuickCareNote({ noteId: noteToDelete as Id<"quickCareNotes"> });
      toast.success("Care note deleted successfully");
      setDeleteConfirmOpen(false);
      setNoteToDelete(null);
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

  if (resident === undefined) {
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

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`;

  // Handle print functionality
  const handlePrint = () => {
    if (!todaysCareData || !resident) return;

    // Get all activity records for today
    const activityRecords = allTasks.filter(task =>
      task.taskType === 'daily_activity_record'
    );

    // Get all personal care tasks for today
    const personalCareTasks = allTasks.filter(task =>
      task.taskType !== 'daily_activity_record'
    );

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Care Report - ${fullName} (${today})</title>
          <style>
            @page { size: A4; margin: 20mm; }
            @media print { body { margin: 0; } }
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.4; 
              color: #000;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 15px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #2563eb;
              font-weight: bold;
            }
            .header h2 {
              margin: 10px 0 0 0;
              font-size: 18px;
              color: #374151;
              font-weight: 600;
            }
            .summary {
              margin-bottom: 30px;
              padding: 15px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
            }
            .summary h3 {
              margin: 0 0 15px 0;
              color: #1f2937;
              font-size: 16px;
              font-weight: 600;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 15px;
            }
            .summary-item {
              font-size: 14px;
            }
            .summary-label {
              font-weight: 600;
              color: #374151;
              margin-bottom: 5px;
            }
            .summary-value {
              color: #6b7280;
            }
            .section {
              margin-bottom: 30px;
            }
            .section-header {
              display: flex;
              align-items: center;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #10b981;
            }
            .section-header.blue {
              border-bottom-color: #3b82f6;
            }
            .section-header h3 {
              margin: 0;
              font-size: 18px;
              font-weight: 600;
              margin-left: 10px;
            }
            .section-header.green h3 {
              color: #047857;
            }
            .section-header.blue h3 {
              color: #1e40af;
            }
            .icon {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 12px;
            }
            .icon.green {
              background: #10b981;
            }
            .icon.blue {
              background: #3b82f6;
            }
            .activity-item {
              margin-bottom: 12px;
              padding: 12px;
              border: 1px solid #bfdbfe;
              border-radius: 8px;
              background: #eff6ff;
            }
            .activity-item.green {
              border-color: #a7f3d0;
              background: #ecfdf5;
            }
            .activity-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }
            .activity-title {
              color: #1e40af;
              font-size: 14px;
              font-weight: 600;
            }
            .activity-title.green {
              color: #047857;
            }
            .activity-status {
              background: #22c55e;
              color: white;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
            }
            .activity-notes {
              margin-bottom: 8px;
              font-style: italic;
              color: #1e40af;
              font-size: 12px;
              padding: 5px 0;
            }
            .activity-notes.green {
              color: #047857;
            }
            .activity-time {
              font-size: 10px;
              color: #6b7280;
            }
            .empty-state {
              text-align: center;
              padding: 20px;
              background: #f0f9ff;
              border: 1px solid #bfdbfe;
              border-radius: 8px;
              color: #1e40af;
            }
            .empty-state.green {
              background: #f0fdf4;
              border-color: #a7f3d0;
              color: #047857;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e5e7eb;
              font-size: 10px;
              color: #9ca3af;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daily Care Report</h1>
            <h2>${fullName}</h2>
          </div>
          
          <div class="summary">
            <h3>Care Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Date & Shift</div>
                <div class="summary-value">${new Date(today).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
                <div class="summary-value">Daily Report (00:00 - 23:59)</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Activity Summary</div>
                <div class="summary-value">Personal Care: ${personalCareTasks.length}</div>
                <div class="summary-value">Activity Records: ${activityRecords.length}</div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <div>Total Activities: ${activityRecords.length + personalCareTasks.length}</div>
              <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-header green">
              <div class="icon green">📋</div>
              <h3>Daily Activity Records</h3>
            </div>
            ${activityRecords.length > 0 ?
              activityRecords
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((activity, index) => {
                  const payload = activity.payload as { time?: string; staff?: string };
                  return `
                    <div class="activity-item green">
                      <div class="activity-header">
                        <div class="activity-title green">${index + 1}. Daily Activity Record</div>
                        <div class="activity-status">${activity.status}</div>
                      </div>
                      ${activity.notes ? `<div class="activity-notes green">${activity.notes}</div>` : ''}
                      <div class="activity-time">
                        Recorded: ${new Date(activity.createdAt).toLocaleString()}
                        ${payload?.staff ? ` • Staff: ${payload.staff}` : ''}
                      </div>
                    </div>
                  `;
                }).join('')
              : `
                <div class="empty-state green">
                  <div style="font-size: 14px; margin-bottom: 5px;">No daily activity records</div>
                  <div style="font-size: 11px;">No daily activity records were logged for this day.</div>
                </div>
              `
            }
          </div>

          <div class="section">
            <div class="section-header blue">
              <div class="icon blue">👤</div>
              <h3>Personal Care Activities</h3>
            </div>
            ${personalCareTasks.length > 0 ?
              personalCareTasks
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((activity, index) => {
                  const payload = activity.payload as { time?: string; primaryStaff?: string; assistedStaff?: string };
                  return `
                    <div class="activity-item">
                      <div class="activity-header">
                        <div class="activity-title">${index + 1}. ${activity.taskType}</div>
                        <div class="activity-status">${activity.status}</div>
                      </div>
                      ${activity.notes ? `<div class="activity-notes">${activity.notes}</div>` : ''}
                      <div class="activity-time">
                        Recorded: ${new Date(activity.createdAt).toLocaleString()}
                        ${payload?.primaryStaff ? ` • Primary Staff: ${payload.primaryStaff}` : ''}
                        ${payload?.assistedStaff ? ` • Assisted by: ${payload.assistedStaff}` : ''}
                      </div>
                    </div>
                  `;
                }).join('')
              : `
                <div class="empty-state">
                  <div style="font-size: 14px; margin-bottom: 5px;">No personal care activities recorded</div>
                  <div style="font-size: 11px;">No personal care activities were logged for this day.</div>
                </div>
              `
            }
          </div>
          
          <div class="footer">
            <div style="font-weight: 600; margin-bottom: 5px;">Generated by Care Management System</div>
            <div>${new Date().toISOString()} • Confidential Care Documentation</div>
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
            View care activities and dependencies for {resident.firstName} {resident.lastName}.
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <Button
            onClick={() => setIsCareNotesDialogOpen(true)}
            className="bg-black text-white hover:bg-gray-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Quick Care Notes
          </Button>
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
                      if (note.showerOrBath) details.push(note.showerOrBath === 'shower' ? 'Shower' : 'Bath');
                      if (note.preferredTime) details.push(note.preferredTime.charAt(0).toUpperCase() + note.preferredTime.slice(1));
                    }

                    if (note.category === 'toileting') {
                      if (note.toiletType) details.push(note.toiletType.charAt(0).toUpperCase() + note.toiletType.slice(1));
                      if (note.assistanceLevel) {
                        const assistanceLabels = {
                          independent: 'Independent',
                          '1_staff': '1 Staff',
                          '2_staff': '2 Staff'
                        };
                        details.push(assistanceLabels[note.assistanceLevel as keyof typeof assistanceLabels]);
                      }
                    }

                    if ((note.category === 'mobility_positioning' || note.category === 'mobility_only') && note.walkingAid) {
                      const aidLabels = {
                        frame: 'Walking Frame',
                        stick: 'Walking Stick',
                        wheelchair: 'Wheelchair',
                        none: 'No Aid'
                      };
                      details.push(aidLabels[note.walkingAid as keyof typeof aidLabels]);
                    }

                    if ((note.category === 'mobility_positioning' || note.category === 'positioning_only') && note.positioningFrequency) {
                      const frequencyLabels = {
                        every_hour: 'Every Hour',
                        every_2_hours: 'Every 2 Hours',
                        every_4_hours: 'Every 4 Hours',
                        every_5_hours: 'Every 5 Hours',
                        every_6_hours: 'Every 6 Hours'
                      };
                      details.push(frequencyLabels[note.positioningFrequency as keyof typeof frequencyLabels]);
                    }

                    if (note.category === 'communication' && note?.communicationNeeds?.length) {
                      const needLabels = {
                        hearing_aid: 'Hearing Aid',
                        glasses: 'Glasses',
                        non_verbal: 'Non-verbal',
                        memory_support: 'Memory Support'
                      };
                      details = note.communicationNeeds?.map((need: string) =>
                        needLabels[need as keyof typeof needLabels] || need
                      );
                    }

                    if (note.category === 'safety_alerts' && note?.safetyAlerts?.length) {
                      const alertLabels = {
                        high_falls_risk: 'Falls Risk',
                        no_unattended_bathroom: 'No Unattended',
                        chair_bed_alarm: 'Alarm'
                      };
                      details = note.safetyAlerts.map((alert: string) =>
                        alertLabels[alert as keyof typeof alertLabels] || alert
                      );
                    }

                    if (details.length > 0) {
                      return `${category}: ${details.join(', ')}`;
                    }

                    return category;
                  };

                  // Create individual badges for multiple items (communication/safety)
                  if (note.category === 'communication' && note.communicationNeeds && note.communicationNeeds.length > 1) {
                    return note.communicationNeeds.map((need: string, index: number) => (
                      <div key={`${note._id}-${index}`} className="group">
                        <Badge className={`${getBadgeStyle(note.category)} pr-8 relative`}>
                          Communication: {need.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          {note.priority === 'high' && ' ⚠️'}
                          <button
                            onClick={() => confirmDelete(note._id)}
                            className="absolute top-1/2 -translate-y-1/2 right-1 w-4 h-4 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      </div>
                    ));
                  }

                  if (note.category === 'safety_alerts' && (note.safetyAlerts?.length ?? 0) > 1) {
                    return (note.safetyAlerts ?? []).map((alert: string, index: number) => (
                      <div key={`${note._id}-${index}`} className="group">
                        <Badge className={`${getBadgeStyle(note.category)} pr-8 relative`}>
                          Safety: {alert.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          {note.priority === 'high' && ' ⚠️'}
                          <button
                            onClick={() => confirmDelete(note._id)}
                            className="absolute top-1/2 -translate-y-1/2 right-1 w-4 h-4 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      </div>
                    ));
                  }

                  return (
                    <div key={note._id} className="group">
                      <Badge className={`${getBadgeStyle(note.category)} pr-8 relative`}>
                        {getDisplayText(note)}
                        {note.priority === 'high' && ' ⚠️'}
                        <button
                          onClick={() => confirmDelete(note._id)}
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
              {new Date().toLocaleDateString()}
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
                  .filter(task => task.taskType !== 'daily_activity_record')
                  .sort((a, b) => b.createdAt - a.createdAt);

                return personalCareTasks.length > 0 ? (
                  <div className="space-y-2">
                    {personalCareTasks.map((task) => {
                      const activity = activityOptions.find(opt => opt.id === task.taskType);
                      const payload = task.payload as { time?: string; primaryStaff?: string; assistedStaff?: string; staff?: string };

                      return (
                        <div key={task._id} className="text-sm border-b pb-2 last:border-b-0">
                          <span className="font-medium">
                            {new Date(task.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {" - "}
                          <span className="text-muted-foreground">{activity?.label || task.taskType}</span>
                          {task.notes && (
                            <span className="text-muted-foreground"> - {task.notes}</span>
                          )}
                          <span className="text-xs text-muted-foreground ml-2 italic">
                            sign by {payload?.primaryStaff || payload?.staff || 'Staff'}
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
                  .filter(task => task.taskType === 'daily_activity_record')
                  .sort((a, b) => b.createdAt - a.createdAt);

                return activityRecords.length > 0 ? (
                  <div className="space-y-2">
                    {activityRecords.map((task) => {
                      const payload = task.payload as { time?: string; primaryStaff?: string; assistedStaff?: string; staff?: string };

                      return (
                        <div key={task._id} className="text-sm border-b pb-2 last:border-b-0">
                          <span className="font-medium">
                            {new Date(task.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {" - "}
                          <span className="text-muted-foreground">Daily Activity Record</span>
                          {task.notes && (
                            <span className="text-muted-foreground"> - {task.notes}</span>
                          )}
                          <span className="text-xs text-muted-foreground ml-2 italic">
                            sign by {payload?.primaryStaff || payload?.staff || 'Staff'}
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
              {new Date().toLocaleDateString()}
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:space-x-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span>Today&apos;s Summary</span>
            <Badge variant="outline" className="ml-auto">
              {new Date().toLocaleDateString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-600">
                {(() => {
                  const dayShiftCount = allTasks.filter(task => {
                    const taskTime = new Date(task.createdAt);
                    const hour = taskTime.getHours();
                    return hour >= 8 && hour < 20;
                  }).length || 0;
                  return dayShiftCount;
                })()}
              </div>
              <p className="text-sm text-amber-700">Day Shift Activities</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-600">
                {(() => {
                  const nightShiftCount = allTasks.filter(task => {
                    const taskTime = new Date(task.createdAt);
                    const hour = taskTime.getHours();
                    return hour >= 20 || hour < 8;
                  }).length || 0;
                  return nightShiftCount;
                })()}
              </div>
              <p className="text-sm text-indigo-700">Night Shift Activities</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">
                {allTasks.length > 0
                  ? new Date(Math.max(...allTasks.map(t => t.createdAt))).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                  : "--"
                }
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
                          <Input
                            type="time"
                            className="h-9"
                            {...field}
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
              <Input
                type="time"
                value={activityRecordTime}
                onChange={(e) => setActivityRecordTime(e.target.value)}
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