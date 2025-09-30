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

  // Get today's date and shift information
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const currentTime = new Date();
  const currentHour = currentTime.getHours();

  // Determine current shift: Day (8 AM - 8 PM) or Night (8 PM - 8 AM)
  const currentShift = (currentHour >= 8 && currentHour < 20) ? "Day" : "Night";
  const isCurrentlyDayShift = currentHour >= 8 && currentHour < 20;

  // Queries - Get all data and let frontend handle shift filtering
  const todaysCareData = useQuery(api.personalCare.getDailyPersonalCare, {
    residentId: id as Id<"residents">,
    date: today,
  });

  // For night shift, we also need yesterday's data (for 8pm+ activities)
  // Always get yesterday's data - we'll filter it in the UI logic
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];
  
  const yesterdaysCareData = useQuery(api.personalCare.getDailyPersonalCare, {
    residentId: id as Id<"residents">,
    date: yesterdayString,
  });

  // Debug: Log query results
  React.useEffect(() => {
    if (!isCurrentlyDayShift) {
      console.log('Night shift queries:', {
        isCurrentlyDayShift,
        currentHour,
        todayData: todaysCareData,
        yesterdayData: yesterdaysCareData,
        todayDate: today,
        yesterdayDate: yesterdayString
      });
    }
  }, [todaysCareData, yesterdaysCareData, isCurrentlyDayShift, currentHour, today, yesterdayString]);

  // Combine today's and yesterday's data for complete shift coverage
  const allTasks = React.useMemo(() => [
    ...(todaysCareData?.tasks || []),
    ...(yesterdaysCareData?.tasks || [])
  ], [todaysCareData?.tasks, yesterdaysCareData?.tasks]);

  // Debug: Log all tasks during night shift
  React.useEffect(() => {
    if (!isCurrentlyDayShift && allTasks.length > 0) {
      console.log('All tasks for night shift:', allTasks.map(task => ({
        id: task._id,
        type: task.taskType,
        createdAt: new Date(task.createdAt).toLocaleString(),
        hour: new Date(task.createdAt).getHours()
      })));
    }
  }, [allTasks, isCurrentlyDayShift]);

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
  const [activityRecordTime, setActivityRecordTime] = React.useState("");
  const [activityRecordNotes, setActivityRecordNotes] = React.useState("");

  // Dialog state management
  const [isPersonalCareDialogOpen, setIsPersonalCareDialogOpen] = React.useState(false);
  const [isActivityRecordDialogOpen, setIsActivityRecordDialogOpen] = React.useState(false);

  // Update staff fields when user data loads or when dialog opens
  React.useEffect(() => {
    if (user?.user && isPersonalCareDialogOpen) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('staff', staffName);
    }
  }, [user, form, isPersonalCareDialogOpen]);

  // Mutations
  const createPersonalCareActivities = useMutation(api.personalCare.createPersonalCareActivities);
  const createDailyActivityRecord = useMutation(api.personalCare.createDailyActivityRecord);
  const createQuickCareNote = useMutation(api.quickCareNotes.createQuickCareNote);
  const deleteQuickCareNote = useMutation(api.quickCareNotes.deleteQuickCareNote);

  // Define activity options
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


  // Get other staff (excluding current user) for assisted staff dropdown
  const otherStaffOptions = allUsers?.filter(u => u.email !== user?.user?.email).map(u => ({
    key: u.name,
    label: u.name,
    email: u.email
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
        shift: currentShift,
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
      setActivityRecordTime("");
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
    
    // Use already defined shift variables
    const currentShiftName = isCurrentlyDayShift ? 'Day' : 'Night';
    const currentShiftTime = isCurrentlyDayShift ? '8 AM - 8 PM' : '8 PM - 8 AM';
    
    // Filter tasks by current shift using allTasks
    const currentShiftActivityRecords = allTasks.filter(task => {
      if (task.taskType !== 'daily_activity_record') return false;
      const taskTime = new Date(task.createdAt);
      const hour = taskTime.getHours();
      return isCurrentlyDayShift ? (hour >= 8 && hour < 20) : (hour >= 20 || hour < 8);
    });
    
    const currentShiftPersonalCare = allTasks.filter(task => {
      if (task.taskType === 'daily_activity_record') return false;
      const taskTime = new Date(task.createdAt);
      const hour = taskTime.getHours();
      return isCurrentlyDayShift ? (hour >= 8 && hour < 20) : (hour >= 20 || hour < 8);
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${currentShiftName} Shift Report - ${fullName} (${today})</title>
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
                <div class="summary-value">${currentShiftName} Shift (${currentShiftTime})</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Activity Summary</div>
                <div class="summary-value">Personal Care: ${currentShiftPersonalCare.length}</div>
                <div class="summary-value">Activity Records: ${currentShiftActivityRecords.length}</div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <div>Total Activities: ${currentShiftActivityRecords.length + currentShiftPersonalCare.length}</div>
              <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-header green">
              <div class="icon green">📋</div>
              <h3>Daily Activity Records</h3>
            </div>
            ${currentShiftActivityRecords.length > 0 ? 
              currentShiftActivityRecords
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
                  <div style="font-size: 11px;">No daily activity records were logged for this ${currentShiftName.toLowerCase()} shift.</div>
                </div>
              `
            }
          </div>

          <div class="section">
            <div class="section-header blue">
              <div class="icon blue">👤</div>
              <h3>Personal Care Activities</h3>
            </div>
            ${currentShiftPersonalCare.length > 0 ? 
              currentShiftPersonalCare
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
                  <div style="font-size: 11px;">No personal care activities were logged for this ${currentShiftName.toLowerCase()} shift.</div>
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
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          {fullName}
        </Button>
        <span>/</span>
        <span className="text-foreground">Daily Care</span>
      </div>



      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Daily Care</h1>
            <p className="text-muted-foreground text-sm">Care activities & dependencies</p>
          </div>
        </div>
      </div>

      {/* Resident Info Card - Matching food-fluid pattern */}
      <Card className="border-0">
        <CardContent className="p-4">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-4 sm:hidden">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{fullName}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date().toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                onClick={() => setIsCareNotesDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Quick Care Notes
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/daily-care/documents`)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                See All Records
              </Button>

            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-15 h-15">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{fullName}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date().toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCareNotesDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span>Quick Care Notes</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/daily-care/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                See All Records
              </Button>



            </div>
          </div>

          {/* Care Notes Section - Badges with close buttons */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2 mb-3">
              <StickyNote className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Care Notes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickCareNotes && quickCareNotes.length > 0 ? (
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
              ) : (
                <p className="text-sm text-muted-foreground">No care notes added yet. Click &ldquo;Add Care Notes&rdquo; to add important care information for this resident.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Care Entry Buttons */}
      <Card>
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
              {isCurrentlyDayShift ? "Log Daily Activity" : "Log Night Activities"}
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Today's Log History */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-5 h-5 text-gray-600" />
              <span>{isCurrentlyDayShift ? "Today's Log History" : "Tonight's Log History"}</span>
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
              <span>{isCurrentlyDayShift ? "Today's Log History" : "Tonight's Log History"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                {new Date().toLocaleDateString()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            
            return allTasks.length > 0 ? (
              <div id="daily-report-content" className="space-y-6">
                {/* Daily Activity Records Section - TOP */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-900">Personal Care Activities</h3>
                  </div>
                  {(() => {
                    // Filter current shift personal care tasks
                    const currentShiftPersonalCare = (allTasks.filter(task => {
                      if (task.taskType === 'daily_activity_record') return false;
                      
                      const taskTime = new Date(task.createdAt);
                      const hour = taskTime.getHours();
                      
                      // Simplified filtering: show tasks based on current shift
                      if (isCurrentlyDayShift) {
                        // Day shift: show tasks from 8am-8pm (any date)
                        return hour >= 8 && hour < 20;
                      } else {
                        // Night shift: show tasks from 8pm-8am (any date)
                        return hour >= 20 || hour < 8;
                      }
                    }) || []);

                    // Debug info (remove after testing)
                    if (!isCurrentlyDayShift) {
                      console.log('Night shift debug:', {
                        allTasksCount: allTasks.length,
                        personalCareCount: currentShiftPersonalCare.length,
                        todayTasks: todaysCareData?.tasks?.length || 0,
                        yesterdayTasks: yesterdaysCareData?.tasks?.length || 0,
                        currentHour: new Date().getHours()
                      });
                    }
                    
                    return currentShiftPersonalCare.length > 0 ? (
                      <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-4">
                        <div className="space-y-3">
                          {currentShiftPersonalCare
                            .sort((a, b) => b.createdAt - a.createdAt)
                            .map((task, index) => {
                              const activity = activityOptions.find(opt => opt.id === task.taskType);
                              const payload = task.payload as { time?: string; primaryStaff?: string; assistedStaff?: string; staff?: string };
                              
                              return (
                                <div key={task._id} className={`flex items-center justify-between py-3 ${index !== currentShiftPersonalCare.length - 1 ? 'border-b border-blue-200' : ''}`}>
                                  <div className="flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-1">
                                      <div className="flex items-center space-x-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium text-blue-900">
                                          {activity?.label || task.taskType}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="text-xs bg-white">
                                          {payload?.time && `${payload.time}`}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="text-xs bg-green-100 text-green-800 border-green-300"
                                        >
                                          {task.status === 'completed' ? 'Completed' : task.status}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                      <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                                        {task.notes && (
                                          <p className="mb-1 md:mb-0">{task.notes}</p>
                                        )}
                                        <p className="text-xs text-gray-600">
                                          {new Date(task.createdAt).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })} • Logged by {payload?.primaryStaff || payload?.staff || 'Staff'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-blue-50/30 rounded-lg border border-blue-100">
                        <div className="flex justify-center mb-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <User className="w-6 h-6 text-blue-400" />
                          </div>
                        </div>
                        <p className="text-gray-600 font-medium mb-1 text-sm">No personal care activities</p>
                        <p className="text-xs text-gray-500">
                          No personal care activities logged {isCurrentlyDayShift ? "today" : "tonight"}
                        </p>
                      </div>
                    )
                  })()}
                </div>

                {/* Personal Care Activities Section - BOTTOM */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Activity className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-900">{isCurrentlyDayShift ? "Daily Activity Records" : "Night Activities"}</h3>
                  </div>
                  {(() => {
                    // Filter current shift activity records
                    const currentShiftActivityRecords = (allTasks.filter(task => {
                      if (task.taskType !== 'daily_activity_record') return false;
                      
                      const taskTime = new Date(task.createdAt);
                      const hour = taskTime.getHours();
                      
                      // Simplified filtering: show tasks based on current shift
                      if (isCurrentlyDayShift) {
                        // Day shift: show tasks from 8am-8pm (any date)
                        return hour >= 8 && hour < 20;
                      } else {
                        // Night shift: show tasks from 8pm-8am (any date)
                        return hour >= 20 || hour < 8;
                      }
                    }) || []);

                    // Debug info (remove after testing)
                    if (!isCurrentlyDayShift) {
                      console.log('Night activities debug:', {
                        activityRecordsCount: currentShiftActivityRecords.length,
                        allActivityRecords: allTasks.filter(task => task.taskType === 'daily_activity_record').length
                      });
                    }
                    
                    return currentShiftActivityRecords.length > 0 ? (
                      <div className="border border-green-200 bg-green-50/30 rounded-lg p-4">
                        <div className="space-y-3">
                          {currentShiftActivityRecords
                            .sort((a, b) => b.createdAt - a.createdAt)
                            .map((task, index) => {
                              const payload = task.payload as { time?: string; primaryStaff?: string; assistedStaff?: string; staff?: string };
                              
                              return (
                                <div key={task._id} className={`flex items-center justify-between py-3 ${index !== currentShiftActivityRecords.length - 1 ? 'border-b border-green-200' : ''}`}>
                                  <div className="flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-1">
                                      <div className="flex items-center space-x-2">
                                        <Activity className="w-4 h-4 text-green-600" />
                                        <span className="font-medium text-green-900">
                                          Daily Activity Record
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="text-xs bg-white">
                                          {payload?.time && `${payload.time}`}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="text-xs bg-green-100 text-green-800 border-green-300"
                                        >
                                          {task.status === 'completed' ? 'Completed' : task.status}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                      <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                                        {task.notes && (
                                          <p className="mb-1 md:mb-0">{task.notes}</p>
                                        )}
                                        <p className="text-xs text-gray-600">
                                          {new Date(task.createdAt).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })} • Logged by {payload?.primaryStaff || payload?.staff || 'Staff'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-green-50/30 rounded-lg border border-green-100">
                        <div className="flex justify-center mb-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <Activity className="w-6 h-6 text-green-400" />
                          </div>
                        </div>
                        <p className="text-gray-600 font-medium mb-1 text-sm">{isCurrentlyDayShift ? "No daily activity records" : "No night activities"}</p>
                        <p className="text-xs text-gray-500">
                          {isCurrentlyDayShift ? "No daily activity records logged today" : "No night activities logged tonight"}
                        </p>
                      </div>
                    )
                  })()}
                </div>

               
              </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <p className="text-gray-600 font-medium mb-2">{isCurrentlyDayShift ? "No entries logged today" : "No entries logged tonight"}</p>
              <p className="text-sm text-gray-500">
                Start tracking {fullName}&apos;s personal care activities using the buttons above
              </p>
            </div>
          )
          })()}
        </CardContent>
      </Card>

         {/* Today's Summary Card */}
         <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span>{isCurrentlyDayShift ? "Today's Summary" : "Tonight's Summary"}</span>
            </div>
            <Badge variant="outline" className="self-start">
              {new Date().toLocaleDateString()}
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:space-x-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span>{isCurrentlyDayShift ? "Today's Summary" : "Tonight's Summary"}</span>
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
                                <SelectItem key={staff.key} value={staff.key}>
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
              <Label className="text-sm font-medium">Primary Staff</Label>
              <Input
                value={currentUserName}
                disabled
                className="h-9 bg-gray-50 text-gray-600"
                placeholder="Current user"
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsActivityRecordDialogOpen(false);
                  setActivityRecordTime("");
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

    </div >
  );
}