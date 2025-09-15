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
  X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { CreateAppointmentForm } from "./form/create-appointment-form";

type DailyCarePageProps = {
  params: Promise<{ id: string }>;
};
// put this at the very top (after imports)



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
  const [appointmentNotesLoading, setAppointmentNotesLoading] = React.useState(false);
  
  // Create Appointment Dialog state
  const [isCreateAppointmentDialogOpen, setIsCreateAppointmentDialogOpen] = React.useState(false);
  
  // Edit Appointment Dialog state
  const [isEditAppointmentDialogOpen, setIsEditAppointmentDialogOpen] = React.useState(false);
  const [editAppointmentLoading, setEditAppointmentLoading] = React.useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = React.useState<any>(null);
  
  // Delete Appointment Dialog state
  const [isDeleteAppointmentDialogOpen, setIsDeleteAppointmentDialogOpen] = React.useState(false);
  const [deleteAppointmentLoading, setDeleteAppointmentLoading] = React.useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = React.useState<any>(null);
  
  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  

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
    endTime: z
      .string()
      .min(1, "End time is required"),
    location: z
      .string()
      .min(1, "Location is required")
      .max(200, "Location must be under 200 characters"),
    staffId: z
      .string()
      .optional(),
  }).refine((data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
  }, {
    message: "End time must be after start time",
    path: ["endTime"],
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
      endTime: "",
      location: "",
      staffId: "none",
    },
  });

  // Get appointment notes for the resident
  const appointmentNotes = useQuery(api.appointmentNotes.getAppointmentNotesByResident, {
    residentId: id as Id<"residents">,
    activeOnly: true,
  });

  // Get appointments for the resident
  const appointments = useQuery(api.appointments.getAppointmentsByResident, {
    residentId: id as Id<"residents">,
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

  // Update staff fields when user data loads
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('staff', staffName);
    }
  }, [user, form]);

  // Mutations
  const createPersonalCareActivities = useMutation(api.personalCare.createPersonalCareActivities);
  const createDailyActivityRecord = useMutation(api.personalCare.createDailyActivityRecord);
  const createAppointmentNote = useMutation(api.appointmentNotes.createAppointmentNote);
  const deleteAppointmentNote = useMutation(api.appointmentNotes.deleteAppointmentNote);
  const updateAppointment = useMutation(api.appointments.updateAppointment);
  const deleteAppointment = useMutation(api.appointments.deleteAppointment);

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

  // Handle appointment notes submission
  const onAppointmentNotesSubmit = async (data: z.infer<typeof AppointmentNotesSchema>) => {
    if (!user || !activeOrganization) {
      toast.error("Authentication required");
      return;
    }

    setAppointmentNotesLoading(true);
    try {
      await createAppointmentNote({
        residentId: id as Id<"residents">,
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
        createdBy: user.user.id,
      });

      toast.success("Appointment note saved successfully");
      appointmentNotesForm.reset();
      setIsAppointmentNotesDialogOpen(false);
    } catch (error) {
      console.error("Error saving appointment note:", error);
      toast.error("Failed to save appointment note");
    } finally {
      setAppointmentNotesLoading(false);
    }
  };

  // Handle delete appointment note
  const handleDeleteAppointmentNote = async () => {
    if (!noteToDelete) return;
    
    setDeleteLoading(true);
    try {
      await deleteAppointmentNote({ noteId: noteToDelete as Id<"appointmentNotes"> });
      toast.success("Appointment note deleted successfully");
      setDeleteConfirmOpen(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error("Error deleting appointment note:", error);
      toast.error("Failed to delete appointment note");
    } finally {
      setDeleteLoading(false);
    }
  };


  // Handle edit appointment
  const handleEditAppointment = (appointment: any) => {
    setAppointmentToEdit(appointment);
    editAppointmentForm.setValue("title", appointment.title || "");
    editAppointmentForm.setValue("description", appointment.description || "");
    editAppointmentForm.setValue("startTime", appointment.startTime || "");
    editAppointmentForm.setValue("endTime", appointment.endTime || "");
    editAppointmentForm.setValue("location", appointment.location || "");
    editAppointmentForm.setValue("staffId", appointment.staffId || "none");
    setIsEditAppointmentDialogOpen(true);
  };

  // Handle edit appointment submission
  const onEditAppointmentSubmit = async (data: z.infer<typeof EditAppointmentSchema>) => {
    if (!user || !appointmentToEdit) {
      toast.error("Authentication required");
      return;
    }

    setEditAppointmentLoading(true);
    try {
      await updateAppointment({
        appointmentId: appointmentToEdit._id,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        staffId: data.staffId === "none" ? undefined : data.staffId,
        updatedBy: user.user.id,
      });

      toast.success("Appointment updated successfully");
      editAppointmentForm.reset();
      setIsEditAppointmentDialogOpen(false);
      setAppointmentToEdit(null);
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Failed to update appointment");
    } finally {
      setEditAppointmentLoading(false);
    }
  };

  // Handle delete appointment
  const handleDeleteAppointment = (appointment: any) => {
    setAppointmentToDelete(appointment);
    setIsDeleteAppointmentDialogOpen(true);
  };

  // Confirm delete appointment
  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;

    setDeleteAppointmentLoading(true);
    try {
      await deleteAppointment({
        appointmentId: appointmentToDelete._id,
      });

      toast.success("Appointment deleted successfully");
      setIsDeleteAppointmentDialogOpen(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast.error("Failed to delete appointment");
    } finally {
      setDeleteAppointmentLoading(false);
    }
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
  const getNoteDisplayText = (note: any) => {
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
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
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
        <span className="text-foreground">Appointments</span>
      </div>



      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
          <ClipboardCheck className="w-6 h-6 text-blue-600" />
      
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Appointments</h1>
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
                onClick={() => setIsAppointmentNotesDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Appointment Note
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/appointments/documents`)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Appointment History
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
                onClick={() => setIsAppointmentNotesDialogOpen(true)}
                className="bg-green-600 text-white hover:bg-green-700 hover:text-white "
              >
                <Plus className="w-4 h-4" />
                <span>Add Appointment Note</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/appointments/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                Appointment History
              </Button>



            </div>
          </div>

          {/* Appointment Notes Section - Badges with close buttons */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2 mb-3">
              <StickyNote className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Appointment Notes</span>
            </div>
            
            {/* Display appointment notes */}
            <div className="flex flex-wrap gap-2">
              {appointmentNotes && appointmentNotes.length > 0 ? (
                appointmentNotes.map((note) => (
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
                ))
              ) : (
                <span className="text-xs text-gray-500 italic">
                  No appointment notes yet. Add one using the button above.
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Appointment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Appointments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setIsCreateAppointmentDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Appointment
          </Button>
        </CardContent>
      </Card>



         {/* Appointment List Card */}
         <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Scheduled Appointments</span>
            </div>
            <Badge variant="outline" className="self-start">
              {appointments?.length || 0} appointments
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Scheduled Appointments</span>
            <Badge variant="outline" className="ml-auto">
              {appointments?.length || 0} appointments
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments && appointments.length > 0 ? (
              appointments.slice(0, 5).map((appointment) => (
                <div key={appointment._id} className="flex items-start space-x-4 p-4 border rounded-lg bg-gray-50">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{appointment.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getAppointmentStatusColor(appointment.status)}`}
                        >
                          {appointment.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAppointment(appointment)}
                          className="h-6 px-2 text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAppointment(appointment)}
                          className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          Delete
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
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No appointments scheduled</p>
                <p className="text-xs text-gray-400 mt-1">Create your first appointment using the button above</p>
              </div>
            )}
            
            {appointments && appointments.length > 5 && (
              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  Showing 5 of {appointments.length} appointments
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Add Appointment Notes Dialog */}
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
                    form.reset();
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editAppointmentForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editAppointmentForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

      {/* Create Appointment Form */}
      <CreateAppointmentForm
        residentId={id}
        residentName={fullName}
        isOpen={isCreateAppointmentDialogOpen}
        onClose={() => setIsCreateAppointmentDialogOpen(false)}
      />


    </div >
  );
}