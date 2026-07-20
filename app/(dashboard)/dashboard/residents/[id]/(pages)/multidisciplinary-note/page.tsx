"use client";

import React from "react";
import { residentService, Resident } from "@/lib/resident-service";
import { multidisciplinaryService, MultidisciplinaryCareTeamMember, MultidisciplinaryNote } from "@/lib/multidisciplinary-service";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import { buildStorageObjectUrl } from "@/lib/storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { getUKTodayDate, getUKNow } from "@/lib/date-utils";
import { TimePicker } from "@/components/ui/date-time-picker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
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
  ClipboardList,
  User,
  Calendar,
  Clock,
  Plus,
  Eye,
  UserCheck,
  FileText,
  Users,
  Download,
  Folder,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type MultidisciplinaryNotePageProps = {
  params: Promise<{ id: string }>;
};

// Multidisciplinary Note Schema
const MultidisciplinaryNoteSchema = z.object({
  noteDate: z.string().min(1, "Note date is required"),
  noteTime: z.string().min(1, "Note time is required"),
  teamMemberId: z.string().min(1, "Team member is required"),
  reasonForVisit: z.string().min(1, "Reason for visit is required"),
  outcome: z.string().min(1, "Outcome is required"),
  relativeInformed: z.enum(["yes", "no"]),
  relativeInformedDetails: z.string().optional(),
  signature: z.string().min(1, "Signature is required"),
});

type MultidisciplinaryNoteFormData = z.infer<typeof MultidisciplinaryNoteSchema>;

// Team Member Schema
const TeamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  designation: z.string().min(1, "Designation is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  specialty: z.string().min(1, "Specialty/Department is required"),
  organisation: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
});

type TeamMemberFormData = z.infer<typeof TeamMemberSchema>;

const MDT_FOLDERS = [
  { name: "GP", key: "mdt-gp" },
  { name: "District Nurse", key: "mdt-district-nurse" },
  { name: "Physiotherapist", key: "mdt-physiotherapist" },
  { name: "Occupational Therapist", key: "mdt-occupational-therapist" },
  { name: "Dietitian", key: "mdt-dietitian" },
  { name: "SLT", key: "mdt-slt" },
  { name: "Pharmacist", key: "mdt-pharmacist" },
  { name: "Mental Health Professional", key: "mdt-mental-health-professional" },
  { name: "Social Worker", key: "mdt-social-worker" },
  { name: "Other", key: "mdt-other" }
];

export default function MultidisciplinaryNotePage({ params }: MultidisciplinaryNotePageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  const [resident, setResident] = React.useState<Resident | null | undefined>(undefined);
  const [careTeamMembers, setCareTeamMembers] = React.useState<MultidisciplinaryCareTeamMember[]>([]);
  const [multidisciplinaryNotes, setMultidisciplinaryNotes] = React.useState<MultidisciplinaryNote[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Auth data
  const { profile } = useProfile();
  const { supabase } = useSupabase();

  // MDT Visitor Session States
  const [mdtSession, setMdtSession] = React.useState<any>(null);
  const [files, setFiles] = React.useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = React.useState(true);
  const [selectedFolder, setSelectedFolder] = React.useState<any | null>(null);
  const [isFolderOpen, setIsFolderOpen] = React.useState(false);
  const [selectedPdf, setSelectedPdf] = React.useState<File | null>(null);

  // Helper to read cookie in client components
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  const fetchUploadedFiles = React.useCallback(async () => {
    if (!supabase) return;
    setIsLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("resident_id", id)
        .like("folder_name", "mdt-%")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFiles(data || []);
    } catch (e) {
      console.error("Error fetching uploaded files", e);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [id, supabase]);

  // Group files by MDT folder
  const filesByFolder = React.useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    MDT_FOLDERS.forEach(f => {
      grouped[f.key] = [];
    });
    
    files.forEach(file => {
      let folderKey = file.folder_name;
      // Normalise SLT
      if (folderKey === 'mdt-speech-&-language-therapist-(slt)') {
        folderKey = 'mdt-slt';
      }
      // Normalise other / general
      if (folderKey === 'mdt-general' || !grouped[folderKey]) {
        folderKey = 'mdt-other';
      }
      if (grouped[folderKey]) {
        grouped[folderKey].push(file);
      } else {
        grouped['mdt-other'].push(file);
      }
    });
    return grouped;
  }, [files]);

  // Group notes by MDT folder
  const notesByFolder = React.useMemo(() => {
    const grouped: { [key: string]: MultidisciplinaryNote[] } = {};
    MDT_FOLDERS.forEach(f => {
      grouped[f.key] = [];
    });
    
    (multidisciplinaryNotes || []).forEach(note => {
      const prof = note.profession || "Other";
      let folderKey = `mdt-${prof.toLowerCase().replace(/\s+/g, "-")}`;
      if (folderKey === 'mdt-speech-&-language-therapist-(slt)') {
        folderKey = 'mdt-slt';
      }
      if (folderKey === 'mdt-general' || !grouped[folderKey]) {
        folderKey = 'mdt-other';
      }
      if (grouped[folderKey]) {
        grouped[folderKey].push(note);
      } else {
        grouped['mdt-other'].push(note);
      }
    });
    return grouped;
  }, [multidisciplinaryNotes]);

  const noteFileIds = React.useMemo(() => {
    return (multidisciplinaryNotes || []).map(n => n.fileId).filter(Boolean);
  }, [multidisciplinaryNotes]);

  const visibleFolders = React.useMemo(() => {
    if (profile?.role !== "mdt") return MDT_FOLDERS;
    if (!mdtSession?.profession) return [];
    
    let myFolderKey = `mdt-${mdtSession.profession.toLowerCase().replace(/\s+/g, "-")}`;
    if (myFolderKey === 'mdt-speech-&-language-therapist-(slt)') {
      myFolderKey = 'mdt-slt';
    }
    
    return MDT_FOLDERS.filter(f => f.key === myFolderKey);
  }, [profile, mdtSession]);

  const handleDeleteFile = async (fileId: string, storagePath: string) => {
    if (!supabase) return;
    try {
      const { error: dbError } = await supabase.from("files").delete().eq("id", fileId);
      if (dbError) throw dbError;
      
      // Also remove from storage
      await supabase.storage.from("resident-files").remove([storagePath]);
      
      toast.success("File deleted successfully");
      fetchUploadedFiles();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete file");
    }
  };

  const canModifyFolder = (folderKey: string) => {
    if (profile?.role !== "mdt") return true; // Managers/Nurses can modify any folder
    
    // MDT can only modify their own folder
    if (!mdtSession?.profession) return false;
    let myFolderKey = `mdt-${mdtSession.profession.toLowerCase().replace(/\s+/g, "-")}`;
    if (myFolderKey === 'mdt-speech-&-language-therapist-(slt)') {
      myFolderKey = 'mdt-slt';
    }
    return myFolderKey === folderKey;
  };

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      // Fetch session if MDT
      let sessionData: any = null;
      if (profile?.role === "mdt") {
        const sessionCookie = getCookie("mdt_session_data");
        if (sessionCookie) {
          try {
            sessionData = JSON.parse(decodeURIComponent(sessionCookie));
            setMdtSession(sessionData);

            // Enforce resident isolation
            if (sessionData.residentId !== id) {
              toast.error("Access Denied: You can only access your registered resident's notes.");
              router.push(`/dashboard/residents/${sessionData.residentId}/multidisciplinary-note`);
              return;
            }

            // Redirect directly to their specific role folder to avoid showing the folder grid at all
            if (sessionData.profession) {
              let myFolderKey = `mdt-${sessionData.profession.toLowerCase().replace(/\s+/g, "-")}`;
              if (myFolderKey === 'mdt-speech-&-language-therapist-(slt)') {
                myFolderKey = 'mdt-slt';
              }
              router.replace(`/dashboard/residents/${id}/multidisciplinary-note/${myFolderKey}`);
              return;
            }
          } catch (e) {
            console.error("Failed to parse MDT session cookie", e);
            router.push("/dashboard/mdt-session");
            return;
          }
        } else {
          router.push("/dashboard/mdt-session");
          return;
        }
      }

      const [resData, teamData, notesData] = await Promise.all([
        residentService.getResidentById(id),
        multidisciplinaryService.getCareTeamByResidentId(id),
        multidisciplinaryService.getNotesByResidentId(id)
      ]);
      setResident(resData);
      setCareTeamMembers(teamData);

      // Filter notes if MDT
      if (profile?.role === "mdt" && sessionData?.profession) {
        setMultidisciplinaryNotes(notesData.filter(n => n.profession === sessionData.profession));
      } else {
        setMultidisciplinaryNotes(notesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [id, profile, router]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (profile) {
      fetchUploadedFiles();
    }
  }, [profile, fetchUploadedFiles]);

  // Get today's date in UK time
  const today = getUKTodayDate();
  const currentTime = format(getUKNow(), "HH:mm");

  // Form setup
  const form = useForm<MultidisciplinaryNoteFormData>({
    resolver: zodResolver(MultidisciplinaryNoteSchema),
    defaultValues: {
      noteDate: today,
      noteTime: currentTime,
      teamMemberId: "",
      reasonForVisit: "",
      outcome: "",
      relativeInformed: "no",
      relativeInformedDetails: "",
      signature: "",
    },
  });

  // Team member form setup
  const teamMemberForm = useForm<TeamMemberFormData>({
    resolver: zodResolver(TeamMemberSchema),
    defaultValues: {
      name: "",
      designation: "",
      phone: "",
      address: "",
      specialty: "",
      organisation: "",
      email: "",
    },
  });

  // Dialog states
  const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false);
  const [isTeamMemberDialogOpen, setIsTeamMemberDialogOpen] = React.useState(false);
  const [selectedNote, setSelectedNote] = React.useState<MultidisciplinaryNote | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false);

  // New states for daily grouping and PDF
  const [selectedDayNotes, setSelectedDayNotes] = React.useState<MultidisciplinaryNote[]>([]);
  const [isDailyViewDialogOpen, setIsDailyViewDialogOpen] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<string>("");
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Multi-step form state
  const [currentStep, setCurrentStep] = React.useState(1);
  const totalSteps = 2;

  // Set default signature when user data loads
  React.useEffect(() => {
    if (profile?.role === "mdt") {
      form.setValue('teamMemberId', 'mdt');
      if (mdtSession?.fullName) {
        form.setValue('signature', mdtSession.fullName);
      }
    } else if (profile) {
      const staffName = profile.name || profile.email?.split('@')[0] || "";
      form.setValue('signature', staffName);
    }
  }, [profile, mdtSession, form]);

  const handleSubmit = async (data: MultidisciplinaryNoteFormData) => {
    try {
      if (!resident || !profile) {
        toast.error("Missing required information");
        return;
      }

      // Handle GP and Care Manager selections
      let teamMemberName = "";
      let teamMemberId = data.teamMemberId;

      if (profile?.role === "mdt" && mdtSession) {
        teamMemberName = mdtSession.fullName;
        teamMemberId = profile.id;
      } else if (data.teamMemberId.startsWith('gp-')) {
        teamMemberName = resident.gpName || "";
        // For GP, we'll use a special ID format that doesn't conflict with database IDs
        teamMemberId = `gp-${resident.gpName}`;
      } else if (data.teamMemberId.startsWith('care-manager-')) {
        teamMemberName = resident.careManagerName || "";
        // For Care Manager, we'll use a special ID format
        teamMemberId = `care-manager-${resident.careManagerName}`;
      } else {
        // Regular database team member
        const selectedTeamMember = careTeamMembers?.find(member => member.id === data.teamMemberId);
        if (!selectedTeamMember) {
          toast.error("Selected team member not found");
          return;
        }
        teamMemberName = selectedTeamMember.name;
      }

      const profession = profile?.role === "mdt" ? mdtSession.profession : (
        data.teamMemberId.startsWith('gp-') ? 'GP' :
        data.teamMemberId.startsWith('care-manager-') ? 'Social Worker' : (
          careTeamMembers?.find(member => member.id === data.teamMemberId)?.designation || 'Other'
        )
      );

      let uploadedFileId: string | undefined = undefined;

      // 1. If PDF is attached, upload it first to get file ID
      if (selectedPdf) {
        const folderName = `mdt-${profession.toLowerCase().replace(/\s+/g, "-")}`;
        const sanitizedFileName = selectedPdf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const timestamp = Date.now();
        const storagePath = `${id}/${folderName}/${timestamp}_${sanitizedFileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("resident-files")
          .upload(storagePath, selectedPdf, {
            contentType: "application/pdf",
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Insert metadata in files table
        const { data: fileData, error: dbError } = await supabase
          .from("files")
          .insert([
            {
              name: selectedPdf.name.replace(/\.pdf$/i, ""),
              original_name: selectedPdf.name,
              file_type: selectedPdf.type || "application/pdf",
              file_size: selectedPdf.size,
              storage_path: storagePath,
              public_url: buildStorageObjectUrl("resident-files", storagePath),
              resident_id: id,
              organization_id: resident.organizationId || profile.active_organization_id,
              folder_name: folderName,
              team_id: profile.active_team_id,
              created_by: profile.id,
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (dbError) throw dbError;
        if (fileData) {
          uploadedFileId = fileData.id;
        }
      }

      // 2. Create Multidisciplinary Note with fileId relation
      await multidisciplinaryService.createNote({
        residentId: id,
        teamMemberId: teamMemberId.startsWith('gp-') || teamMemberId.startsWith('care-manager-') || profile?.role === "mdt"
          ? undefined // Don't store GP/Care Manager/MDT as CareTeamMember UUID
          : data.teamMemberId,
        teamMemberName: teamMemberName,
        profession: profession,
        reasonForVisit: data.reasonForVisit,
        outcome: data.outcome,
        relativeInformed: data.relativeInformed === "yes",
        relativeInformedDetails: data.relativeInformedDetails || undefined,
        signature: data.signature,
        noteDate: data.noteDate,
        noteTime: data.noteTime,
        organizationId: resident.organizationId,
        createdBy: profile.id,
        fileId: uploadedFileId,
      });

      toast.success("Multidisciplinary note and attachment saved successfully");
      form.reset();
      setSelectedPdf(null);
      setCurrentStep(1);
      setIsNoteDialogOpen(false);
      fetchData(); // Refresh notes list
      fetchUploadedFiles(); // Refresh files list
    } catch (error: any) {
      console.error("Error creating note/attachment:", error);
      toast.error(`Failed to create multidisciplinary note: ${error.message || error}`);
    }
  };

  const handleTeamMemberSubmit = async (data: TeamMemberFormData) => {
    try {
      if (!resident || !profile) {
        toast.error("Missing required information");
        return;
      }

      await multidisciplinaryService.createCareTeamMember({
        residentId: id,
        name: data.name,
        designation: data.designation,
        phone: data.phone || undefined,
        address: data.address || undefined,
        specialty: data.specialty,
        organisation: data.organisation || undefined,
        email: data.email || undefined,
        organizationId: resident.organizationId,
        createdBy: profile.id,
      });

      toast.success("Team member added successfully");
      teamMemberForm.reset();
      setIsTeamMemberDialogOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member");
    }
  };

  // Step navigation functions
  const nextStep = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 1: // Basic Visit Information (Date, time, team member, reason, outcome)
        const step1Fields = ['noteDate', 'noteTime', 'teamMemberId', 'reasonForVisit', 'outcome'] as const;
        const step1Valid = await form.trigger(step1Fields);
        return step1Valid;
      case 2: // Relative Information & Signature (relativeInformed, signature)
        const step2Fields = ['relativeInformed', 'signature'] as const;
        const step2Valid = await form.trigger(step2Fields);
        return step2Valid;
      default:
        return true;
    }
  };

  const handleViewNote = (note: MultidisciplinaryNote) => {
    setSelectedNote(note);
    setIsViewDialogOpen(true);
  };

  const handleViewDay = (day: string, notes: MultidisciplinaryNote[]) => {
    setSelectedDay(day);
    setSelectedDayNotes(notes);
    setIsDailyViewDialogOpen(true);
  };

  const handleDownloadDailyPDF = async (day: string, notes: MultidisciplinaryNote[]) => {
    if (!resident) return;
    setIsDownloading(true);
    try {
      const response = await fetch('/api/pdf/multidisciplinary-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resident: {
            first_name: resident.firstName,
            last_name: resident.lastName,
            dob: resident.dateOfBirth,
            room: resident.roomNumber,
            nhs: resident.nhsHealthNumber,
          },
          dayData: {
            date: day,
            notes: notes.map(n => ({
              team_member_name: n.teamMemberName,
              profession: n.profession,
              note_time: n.noteTime,
              reason_for_visit: n.reasonForVisit,
              outcome: n.outcome,
              relative_informed: n.relativeInformed,
              relative_informed_details: n.relativeInformedDetails,
              signature: n.signature
            }))
          },
          orgLogoUrl: profile?.organization_logo_url,
          careHomeName: profile?.care_home_name || profile?.organization_name,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mdt-report-${resident.firstName}-${resident.lastName}-${day}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("MDT report downloaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download MDT report");
    } finally {
      setIsDownloading(false);
    }
  };


  const resetForm = () => {
    form.reset();
    setCurrentStep(1);
    setIsNoteDialogOpen(false);
  };


  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  // Group notes by date
  const groupedNotes = React.useMemo(() => {
    const groups: { [key: string]: MultidisciplinaryNote[] } = {};
    (multidisciplinaryNotes || []).forEach(note => {
      if (!groups[note.noteDate]) {
        groups[note.noteDate] = [];
      }
      groups[note.noteDate].push(note);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [multidisciplinaryNotes]);

  // Sort notes chronologically (newest first)
  const sortedNotes = React.useMemo(() => {
    return [...(multidisciplinaryNotes || [])].sort((a, b) => {
      const dateTimeA = new Date(`${a.noteDate}T${a.noteTime || "00:00"}`).getTime();
      const dateTimeB = new Date(`${b.noteDate}T${b.noteTime || "00:00"}`).getTime();
      return dateTimeB - dateTimeA;
    });
  }, [multidisciplinaryNotes]);

  // Build disciplinary team from resident data and database team members
  const buildDisciplinaryTeam = () => {
    const team: Array<{
      id?: any;
      name: any;
      role: string;
      department: string;
      contact: string | undefined;
      address: any;
      email?: string;
      organisation?: string;
      lastNote: string;
      isFromResidentData?: boolean;
      isFromDatabase?: boolean;
    }> = [];

    // Add GP if available
    if (resident?.gpName) {
      team.push({
        name: resident.gpName,
        role: "General Practitioner",
        department: "Medical",
        contact: resident.gpPhone ? `${resident.gpPhone}` : undefined,
        address: resident.gpAddress,
        lastNote: "Available on request",
        isFromResidentData: true
      });
    }

    // Add Care Manager if available
    if (resident?.careManagerName) {
      team.push({
        name: resident.careManagerName,
        role: "Care Manager",
        department: "Social Services",
        contact: resident.careManagerPhone ? `${resident.careManagerPhone}` : undefined,
        address: resident.careManagerAddress,
        lastNote: "Available on request",
        isFromResidentData: true
      });
    }

    // Add team members from database
    if (careTeamMembers) {
      careTeamMembers.forEach((member) => {
        team.push({
          id: member.id,
          name: member.name,
          role: member.designation,
          department: member.specialty || "General",
          contact: member.phone,
          address: member.address,
          email: member.email,
          organisation: member.organisation,
          lastNote: "Database record",
          isFromDatabase: true
        });
      });
    }

    return team;
  };

  const disciplinaryTeam = buildDisciplinaryTeam();


  if (profile?.role === "mdt") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Redirecting to your folder...</p>
        </div>
      </div>
    );
  }

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
            className="mt-4 bg-gray-50 hover:bg-gray-100"
            onClick={() => profile?.role === "mdt" ? router.push("/dashboard/mdt-session") : router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 mb-6">
          {profile?.role !== "mdt" && (
            <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Avatar className="w-16 h-16">
            <AvatarImage src={resident.imageUrl} alt={fullName} className="border" />
            <AvatarFallback className="text-base bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-black text-xl">{fullName}</span>
              <span className="text-muted-foreground">/ Multidisciplinary Note</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Team collaboration and care coordination
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <Button
              onClick={() => setIsNoteDialogOpen(true)}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Note
            </Button>
            {profile?.role !== "mdt" && (
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/multidisciplinary-note/documents`)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View All Notes
              </Button>
            )}
          </div>
        </div>

        {/* Uploaded Documents Card */}
        <Card className="border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Supporting Documents ({profile?.role === "mdt" ? mdtSession?.profession : "All MDT Folders"})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingFiles ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {visibleFolders.map((folder, index) => {
                  const folderFiles = filesByFolder[folder.key] || [];
                  const folderNotes = notesByFolder[folder.key] || [];
                  const folderStandaloneFiles = folderFiles.filter(f => !noteFileIds.includes(f.id));
                  const totalItems = folderNotes.length + folderStandaloneFiles.length;

                  return (
                    <div
                      key={folder.key}
                      onClick={() => {
                        router.push(`/dashboard/residents/${id}/multidisciplinary-note/${folder.key}`);
                      }}
                      className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border border-gray-150 bg-white hover:bg-indigo-50/20 cursor-pointer transition-all shadow-sm hover:shadow-md group relative"
                    >
                      <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                        <Folder className="w-8 h-8 text-indigo-600 group-hover:text-indigo-700" />
                      </div>
                      <div className="text-center w-full">
                        <p className="font-semibold text-xs text-gray-800 line-clamp-1">
                          {folder.name}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {totalItems} {totalItems === 1 ? 'file' : 'files'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Multidisciplinary Notes */}
        {profile?.role !== "mdt" && (
          <Card className="border-0">
            <CardHeader>
              {/* Mobile Layout */}
              <CardTitle className="block sm:hidden">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Recent Notes</span>
                </div>
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">
                  {(multidisciplinaryNotes || []).length} recent notes
                </Badge>
              </CardTitle>
              {/* Desktop Layout */}
              <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Recent Multidisciplinary Notes</span>
                </div>
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">
                  {(multidisciplinaryNotes || []).length} recent notes
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {!multidisciplinaryNotes || multidisciplinaryNotes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No multidisciplinary notes recorded</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Click the Create Note button to add the first note
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-150 shadow-sm bg-white">
                  <Table>
                    <TableHeader className="bg-gray-50/75">
                      <TableRow>
                        <TableHead className="w-[120px] text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</TableHead>
                        <TableHead className="w-[180px] text-xs font-bold text-gray-500 uppercase tracking-wider">Team Member</TableHead>
                        <TableHead className="min-w-[200px] text-xs font-bold text-gray-500 uppercase tracking-wider">Reason for Visit</TableHead>
                        <TableHead className="min-w-[200px] text-xs font-bold text-gray-500 uppercase tracking-wider">Outcome & Recommendations</TableHead>
                        <TableHead className="w-[140px] text-xs font-bold text-gray-500 uppercase tracking-wider">Relative Informed</TableHead>
                        <TableHead className="w-[120px] text-xs font-bold text-gray-500 uppercase tracking-wider">Signature</TableHead>
                        <TableHead className="w-[100px] text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedNotes.map((note) => {
                        const noteProfession = note.profession || "Other";
                        return (
                          <TableRow key={note.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="align-top py-3.5">
                              <div className="font-semibold text-gray-900 text-xs">
                                {format(new Date(note.noteDate), "dd/MM/yyyy")}
                              </div>
                              <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-gray-400" />
                                {note.noteTime || "--:--"}
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-3.5">
                              <div className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-400" />
                                {note.teamMemberName}
                              </div>
                              {noteProfession && (
                                <Badge className="text-[9px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-0 h-4 mt-1 px-1.5 py-0">
                                  {noteProfession}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="align-top py-3.5 max-w-[250px]">
                              <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap leading-relaxed" title={note.reasonForVisit}>
                                {note.reasonForVisit}
                              </p>
                            </TableCell>
                            <TableCell className="align-top py-3.5 max-w-[250px]">
                              <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap leading-relaxed" title={note.outcome}>
                                {note.outcome}
                              </p>
                            </TableCell>
                            <TableCell className="align-top py-3.5">
                              <div className="flex flex-col gap-1.5">
                                <Badge variant="outline" className={`w-fit text-[10px] py-0 px-1.5 h-4 ${note.relativeInformed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                  {note.relativeInformed ? 'Informed' : 'Not Informed'}
                                </Badge>
                                {note.relativeInformedDetails && (
                                  <span className="text-[10px] text-gray-400 line-clamp-1 max-w-[120px]" title={note.relativeInformedDetails}>
                                    {note.relativeInformedDetails}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-3.5">
                              <div className="text-xs text-gray-600 font-medium italic flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-gray-400" />
                                {note.signature}
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewNote(note)}
                                  className="h-7 w-7 p-0 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                                  title="View Detail"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadDailyPDF(note.noteDate, [note])}
                                  disabled={isDownloading}
                                  className="h-7 w-7 p-0 border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* View Folder Dialog */}
        <Dialog open={isFolderOpen} onOpenChange={setIsFolderOpen}>
          <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-600" />
                {selectedFolder?.name} Folder
              </DialogTitle>
              <DialogDescription>
                Visit logs and supporting documents for {fullName}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {/* Section 1: Notes/Visits */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 border-b pb-1">
                  <ClipboardList className="w-4 h-4 text-indigo-600" />
                  Visit Notes ({(notesByFolder[selectedFolder?.key] || []).length})
                </h4>
                {selectedFolder && (notesByFolder[selectedFolder.key] || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic pl-1">No notes recorded in this folder.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedFolder && (notesByFolder[selectedFolder.key] || []).map((note) => (
                      <div key={note.id} className="p-3 border rounded-lg bg-gray-50/50">
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                          <span className="font-semibold text-indigo-900">{note.teamMemberName}</span>
                          <span>{format(new Date(note.noteDate), "dd/MM/yyyy")} at {note.noteTime || "--:--"}</span>
                        </div>
                        <p className="text-xs text-gray-700 line-clamp-2"><span className="font-semibold">Reason:</span> {note.reasonForVisit}</p>
                        <p className="text-xs text-gray-700 line-clamp-2 mt-1"><span className="font-semibold">Outcome:</span> {note.outcome}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: PDF Supporting Documents */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 border-b pb-1">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Attached PDF Documents ({(filesByFolder[selectedFolder?.key] || []).length})
                </h4>
                {selectedFolder && (filesByFolder[selectedFolder.key] || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic pl-1">No attached PDF documents in this folder.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedFolder && (filesByFolder[selectedFolder.key] || []).map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-1.5 bg-red-50 rounded-lg shrink-0">
                            <FileText className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[9px] text-gray-500">
                              {(file.file_size / 1024 / 1024).toFixed(2)} MB • {format(new Date(file.created_at), "dd/MM/yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <Button variant="ghost" size="sm" asChild className="h-7 px-2.5 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                            <a href={file.public_url} target="_blank" rel="noreferrer">
                              View
                            </a>
                          </Button>
                          {selectedFolder && canModifyFolder(selectedFolder.key) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-500"
                              onClick={() => handleDeleteFile(file.id, file.storage_path)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end border-t pt-4">
              <Button variant="outline" onClick={() => setIsFolderOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Create Multidisciplinary Note Dialog */}
        < Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen} >
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Multidisciplinary Note for {fullName}</DialogTitle>
              <DialogDescription>
                Document comprehensive care observations and interdisciplinary collaboration.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">


                {/* Step 1: Basic Visit Information */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {/* Date and Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="noteDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Note Date *</FormLabel>
                            <Popover modal>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    type="button"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {field.value ? (
                                      format(new Date(field.value), "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      field.onChange(format(date, "yyyy-MM-dd"));
                                    }
                                  }}
                                  disabled={(date) => {
                                    const today = new Date();
                                    today.setHours(23, 59, 59, 999);
                                    return date > today;
                                  }}
                                  captionLayout="dropdown"
                                  defaultMonth={field.value ? new Date(field.value) : new Date()}
                                  startMonth={new Date(new Date().getFullYear() - 1, 0)}
                                  endMonth={new Date()}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="noteTime"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Note Time *</FormLabel>
                            <FormControl>
                              <TimePicker
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Team Member Selection */}
                    {profile?.role === "mdt" ? (
                      <div className="space-y-1.5 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                        <Label className="text-xs font-semibold text-indigo-700">Writing Note as:</Label>
                        <p className="text-sm font-semibold text-gray-800">{mdtSession?.fullName}</p>
                        <p className="text-xs text-gray-500 font-medium">{mdtSession?.profession}</p>
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="teamMemberId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team Member *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team member..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {/* GP from resident data */}
                                {resident?.gpName && (
                                  <SelectItem value={`gp-${resident.gpName.replace(/\s+/g, '-').toLowerCase()}`}>
                                    {resident.gpName} - General Practitioner
                                  </SelectItem>
                                  )}

                                  {/* Care Manager from resident data */}
                                  {resident?.careManagerName && (
                                    <SelectItem value={`care-manager-${resident.careManagerName.replace(/\s+/g, '-').toLowerCase()}`}>
                                      {resident.careManagerName} - Care Manager
                                    </SelectItem>
                                  )}

                                  {/* Database team members */}
                                  {careTeamMembers?.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      {member.name} - {member.designation}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="reasonForVisit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for Visit *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the reason for this visit..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="outcome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Outcome *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the outcome of the visit..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Relative Information & Signature */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="relativeInformed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relative Informed *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Was a relative informed?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="relativeInformedDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Details (if relative was informed)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Who was informed and how (phone, in person, etc.)..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="signature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Signature *</FormLabel>
                          <FormControl>
                            <Input placeholder="Digital signature or full name..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Supporting PDF Upload */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-sm font-semibold text-gray-700">Attach Supporting PDF (Optional)</Label>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.type !== "application/pdf") {
                              toast.error("Only PDF files are allowed");
                              e.target.value = "";
                              return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error("File size must be less than 10MB");
                              e.target.value = "";
                              return;
                            }
                            setSelectedPdf(file);
                          } else {
                            setSelectedPdf(null);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      className="bg-gray-50 hover:bg-gray-100"
                    >
                      Cancel
                    </Button>
                    {currentStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="bg-gray-50 hover:bg-gray-100"
                      >
                        Previous
                      </Button>
                    )}
                  </div>

                  <div>
                    {currentStep < totalSteps ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-700"
                      >
                        Next Step
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="bg-gray-50 hover:bg-gray-100 text-gray-700"
                      >
                        Create Note
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog >

        {/* Add Team Member Dialog */}
        < Dialog open={isTeamMemberDialogOpen} onOpenChange={setIsTeamMemberDialogOpen} >
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Team Member for {fullName}</DialogTitle>
              <DialogDescription>
                Add a new multidisciplinary care team member for this resident.
              </DialogDescription>
            </DialogHeader>

            <Form {...teamMemberForm}>
              <form onSubmit={teamMemberForm.handleSubmit(handleTeamMemberSubmit)} className="space-y-6">

                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-blue-900">Basic Information</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={teamMemberForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={teamMemberForm.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title/Role *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Registered Nurse, Physiotherapist..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={teamMemberForm.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Speciality/Department *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Nursing, Medical, Physiotherapy..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-green-900">Contact Information</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={teamMemberForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone number..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={teamMemberForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={teamMemberForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Full address..."
                            className="min-h-[60px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Organization Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-purple-900">Organization</h4>

                  <FormField
                    control={teamMemberForm.control}
                    name="organisation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organisation/Trust</FormLabel>
                        <FormControl>
                          <Input placeholder="NHS Trust, Private Practice, etc..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsTeamMemberDialogOpen(false);
                      teamMemberForm.reset();
                    }}
                    className="bg-gray-50 hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gray-50 hover:bg-gray-100 text-gray-700">
                    Add Team Member
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog >

        {/* View Note Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Multidisciplinary Note Details</DialogTitle>
              <DialogDescription>
                Complete multidisciplinary note details for {fullName}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              {selectedNote && (
                <div className="space-y-6">
                  {/* Note Overview */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Visit Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium">{format(new Date(selectedNote.noteDate), "PPP")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-medium">{selectedNote.noteTime}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Team Member</p>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <p className="font-medium">{selectedNote.teamMemberName}</p>
                        </div>
                      </div>
                      {selectedNote.profession && (
                        <div>
                          <p className="text-sm text-gray-500">MDT Profession</p>
                          <Badge className="bg-indigo-100 text-indigo-800 border-0">{selectedNote.profession}</Badge>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Relative Informed</p>
                        <Badge className={`${selectedNote.relativeInformed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          } border-0`}>
                          {selectedNote.relativeInformed ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Visit Details */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Visit Details</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Reason for Visit</p>
                        <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {selectedNote.reasonForVisit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Outcome</p>
                        <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {selectedNote.outcome}
                        </p>
                      </div>
                      {selectedNote.relativeInformedDetails && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Relative Contact Details</p>
                          <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                            {selectedNote.relativeInformedDetails}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Record Information */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Record Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Signed By</p>
                        <div className="flex items-center space-x-2">
                          <UserCheck className="w-4 h-4 text-gray-400" />
                          <p className="font-medium">{selectedNote.signature}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date Created</p>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <p className="font-medium">{format(new Date(selectedNote.createdAt || selectedNote.noteDate), "PPP")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsViewDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Daily View Dialog */}
        <Dialog open={isDailyViewDialogOpen} onOpenChange={setIsDailyViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>MDT Visits - {selectedDay ? format(new Date(selectedDay), "EEEE, MMMM d, yyyy") : ''}</DialogTitle>
              <DialogDescription>
                Summary of all multidisciplinary team visits for this day.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[70vh] pr-4">
              <div className="space-y-4 py-4">
                {selectedDayNotes.map((note, index) => (
                  <Card key={note.id} className="border shadow-sm overflow-hidden">
                    <div className="bg-indigo-50/50 px-4 py-2 border-b flex justify-between items-center">
                      <div className="flex items-center space-x-2 text-indigo-700 font-semibold">
                        <Users className="w-4 h-4" />
                        <span>Visit {index + 1}: {note.teamMemberName}</span>
                        {note.profession && (
                          <Badge className="bg-indigo-100 text-indigo-800 border-0 text-[10px] ml-2">
                            {note.profession}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{note.noteTime}</span>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-gray-700">Reason for Visit</h4>
                          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 whitespace-pre-wrap min-h-[60px]">
                            {note.reasonForVisit}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-gray-700">Outcome & Recommendations</h4>
                          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 whitespace-pre-wrap min-h-[60px]">
                            {note.outcome}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Signed: {note.signature}</span>
                          </span>
                        </div>
                        < Badge variant="outline" className={`${note.relativeInformed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          Relative {note.relativeInformed ? 'Informed' : 'Not Informed'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => handleDownloadDailyPDF(selectedDay, selectedDayNotes)}
                disabled={isDownloading}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => setIsDailyViewDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div >
    </div >
  );
}