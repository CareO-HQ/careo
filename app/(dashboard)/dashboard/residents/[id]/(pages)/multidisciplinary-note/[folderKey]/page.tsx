"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getUKTodayDate, getUKNow } from "@/lib/date-utils";
import { TimePicker } from "@/components/ui/date-time-picker";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Plus,
  Printer,
  Calendar as CalendarIcon,
  Clock,
  User,
  UserCheck,
  Users,
  PanelRight,
  PanelRightClose,
  Edit3,
  Check,
  X,
  Upload,
  FileIcon,
  Eye,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { residentService, Resident } from "@/lib/resident-service";
import { multidisciplinaryService, MultidisciplinaryCareTeamMember, MultidisciplinaryNote } from "@/lib/multidisciplinary-service";
import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import { buildStorageObjectUrl } from "@/lib/storage";

// Types
type UploadedFile = {
  id: string;
  name: string;
  original_name: string;
  file_size: number;
  storage_path: string;
  file_type: string;
  created_at: string;
  signedUrl?: string;
};

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
  title: z.string().optional(),
});

type MultidisciplinaryNoteFormData = z.infer<typeof MultidisciplinaryNoteSchema>;

// File Viewer Component
function FileViewer({ file }: { file: UploadedFile }) {
  const ext = (file.original_name ?? file.name).split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
  const isPdf = ext === "pdf" || file.file_type === "application/pdf";
  const url = file.signedUrl ?? "";

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading file…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{file.name}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {(file.file_size / 1024).toFixed(0)} KB
          </span>
        </div>
        <a
          href={url}
          download={file.original_name ?? file.name}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border hover:bg-muted transition-colors flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
      </div>
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {isPdf && <iframe src={url} className="w-full h-full border-none" title={file.name} />}
        {isImage && (
          <div className="flex items-center justify-center h-full p-6">
            <img src={url} alt={file.name} className="max-w-full max-h-full object-contain rounded shadow-sm" />
          </div>
        )}
        {!isPdf && !isImage && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{file.name}</p>
            <a href={url} download={file.original_name ?? file.name} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors">
              <Download className="w-4 h-4" /> Download file
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MultidisciplinaryNoteFolderPage() {
  const params = useParams();
  const residentId = params.id as string;
  const folderKey = params.folderKey as string;
  const router = useRouter();
  const { profile } = useProfile();
  const { supabase } = useSupabase();

  // State values
  const [resident, setResident] = useState<Resident | null>(null);
  const [careTeamMembers, setCareTeamMembers] = useState<MultidisciplinaryCareTeamMember[]>([]);
  const [notes, setNotes] = useState<MultidisciplinaryNote[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [mdtSession, setMdtSession] = useState<any>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Active items in main area
  const [activeFormKey, setActiveFormKey] = useState<"add-note" | null>("add-note");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Note Title renaming state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleVal, setEditingTitleVal] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Current multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const folder = MDT_FOLDERS.find(f => f.key === folderKey);

  // Form setups
  const today = getUKTodayDate();
  const currentTime = format(getUKNow(), "HH:mm");

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
      title: "",
    },
  });

  // Cookies helper
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

  // Fetch uploaded files
  const fetchUploadedFiles = useCallback(async () => {
    if (!supabase || !folder) return;
    setFilesLoading(true);
    try {
      const { data, error } = await supabase
        .from("files")
        .select("id, name, original_name, file_size, storage_path, file_type, created_at")
        .eq("resident_id", residentId)
        .eq("folder_name", folder.key)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFiles(data as UploadedFile[] || []);
    } catch (e) {
      console.error("Error fetching uploaded files", e);
    } finally {
      setFilesLoading(false);
    }
  }, [residentId, supabase, folder]);

  // Fetch all folder data
  const fetchData = useCallback(async () => {
    if (!supabase || !folder) return;
    setIsLoading(true);
    try {
      // 1. MDT session access control checks
      let sessionData: any = null;
      if (profile?.role === "mdt") {
        const sessionCookie = getCookie("mdt_session_data");
        if (sessionCookie) {
          try {
            sessionData = JSON.parse(decodeURIComponent(sessionCookie));
            setMdtSession(sessionData);

            // Resident Isolation
            if (sessionData.residentId !== residentId) {
              toast.error("Access Denied: You can only access your registered resident's notes.");
              router.push(`/dashboard/residents/${sessionData.residentId}/multidisciplinary-note`);
              return;
            }

            // Folder Key Isolation
            let myFolderKey = `mdt-${sessionData.profession.toLowerCase().replace(/\s+/g, "-")}`;
            if (myFolderKey === 'mdt-speech-&-language-therapist-(slt)') {
              myFolderKey = 'mdt-slt';
            }
            if (myFolderKey !== folderKey) {
              toast.error("Access Denied: You do not have permission to access this folder.");
              router.push(`/dashboard/residents/${residentId}/multidisciplinary-note`);
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

      // 2. Fetch resident, care team and notes
      const [resData, teamData, notesData] = await Promise.all([
        residentService.getResidentById(residentId),
        multidisciplinaryService.getCareTeamByResidentId(residentId),
        multidisciplinaryService.getNotesByResidentId(residentId)
      ]);

      setResident(resData);
      setCareTeamMembers(teamData);

      // Filter notes for this folder/profession
      const filteredNotes = notesData.filter(note => {
        const prof = note.profession || "Other";
        let noteFolderKey = `mdt-${prof.toLowerCase().replace(/\s+/g, "-")}`;
        if (noteFolderKey === 'mdt-speech-&-language-therapist-(slt)') {
          noteFolderKey = 'mdt-slt';
        }
        if (noteFolderKey === 'mdt-general' || !MDT_FOLDERS.some(f => f.key === noteFolderKey)) {
          noteFolderKey = 'mdt-other';
        }
        return noteFolderKey === folderKey;
      });
      setNotes(filteredNotes);

      // If there are existing notes, we default to the tabular list view.
      if (filteredNotes.length > 0) {
        setActiveNoteId(null);
        setActiveFormKey(null);
        setActiveFileId(null);
      } else {
        setActiveFormKey("add-note");
        setActiveNoteId(null);
        setActiveFileId(null);
      }
    } catch (error) {
      console.error("Error fetching folder data:", error);
      toast.error("Failed to load folder data");
    } finally {
      setIsLoading(false);
    }
  }, [residentId, folderKey, profile, router, supabase, folder]);

  useEffect(() => {
    if (profile && folder) {
      fetchData();
      fetchUploadedFiles();
      setCurrentPage(1);
    }
  }, [profile, folder, fetchData, fetchUploadedFiles]);

  // Set default signature when user data loads
  useEffect(() => {
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

  const [activeNoteSignedUrl, setActiveNoteSignedUrl] = useState<string>("");

  const standaloneFiles = useMemo(() => {
    const noteFileIds = notes.map(n => n.fileId).filter(Boolean);
    return files.filter(f => !noteFileIds.includes(f.id));
  }, [files, notes]);

  const activeNote = notes.find(n => n.id === activeNoteId);

  // Pagination computations
  const totalPages = Math.ceil(notes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, notes.length);

  const paginatedNotes = useMemo(() => {
    return notes.slice(startIndex, endIndex);
  }, [notes, startIndex, endIndex]);

  // Sidebar Notes (Today's notes only)
  const todayNotes = useMemo(() => {
    return notes.filter(note => note.noteDate === today);
  }, [notes, today]);
  const activeFile = files.find(f => f.id === activeFileId);

  useEffect(() => {
    const getSignedUrl = async () => {
      if (activeNote?.file && supabase) {
        try {
          const { data } = await supabase.storage
            .from("resident-files")
            .createSignedUrl(activeNote.file.storage_path, 3600);
          if (data?.signedUrl) {
            setActiveNoteSignedUrl(data.signedUrl);
          } else {
            setActiveNoteSignedUrl(activeNote.file.public_url || "");
          }
        } catch (err) {
          console.error("Error creating signed URL for note attachment", err);
          setActiveNoteSignedUrl(activeNote.file.public_url || "");
        }
      } else {
        setActiveNoteSignedUrl("");
      }
    };
    void getSignedUrl();
  }, [activeNote, supabase]);

  // Click Handlers
  const handleNoteClick = (noteId: string) => {
    setActiveFormKey(null);
    setActiveFileId(null);
    setActiveNoteId(noteId);
  };

  const handleAddNoteClick = () => {
    setActiveNoteId(null);
    setActiveFileId(null);
    setActiveFormKey("add-note");
    setCurrentStep(1);
    form.reset({
      noteDate: today,
      noteTime: currentTime,
      teamMemberId: profile?.role === "mdt" ? "mdt" : "",
      reasonForVisit: "",
      outcome: "",
      relativeInformed: "no",
      relativeInformedDetails: "",
      signature: profile?.role === "mdt" ? (mdtSession?.fullName || "") : (profile?.name || profile?.email?.split('@')[0] || ""),
      title: "",
    });
  };

  const handleFileClick = async (fileId: string) => {
    setActiveFormKey(null);
    setActiveNoteId(null);
    setActiveFileId(fileId);

    const fileItem = files.find(f => f.id === fileId);
    if (fileItem && !fileItem.signedUrl && supabase) {
      const { data } = await supabase.storage.from("resident-files").createSignedUrl(fileItem.storage_path, 3600);
      if (data?.signedUrl) {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, signedUrl: data.signedUrl } : f));
      }
    }
  };

  const handleDeleteFile = async (file: UploadedFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase) return;
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;

    try {
      await supabase.storage.from("resident-files").remove([file.storage_path]);
      await supabase.from("files").delete().eq("id", file.id);
      if (activeFileId === file.id) {
        if (notes.length > 0) {
          setActiveNoteId(notes[0].id);
          setActiveFileId(null);
        } else {
          setActiveFormKey("add-note");
          setActiveFileId(null);
        }
      }
      fetchUploadedFiles();
      toast.success("Document deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete document");
    }
  };

  // Step Navigation for Form
  const nextStep = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const step1Fields = ['noteDate', 'noteTime', 'teamMemberId', 'reasonForVisit', 'outcome'] as const;
    const step1Valid = await form.trigger(step1Fields);
    if (step1Valid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit new note
  const handleSubmitNote = async (data: MultidisciplinaryNoteFormData) => {
    if (!resident || !profile || !supabase || !folder) {
      toast.error("Missing required information");
      return;
    }

    setIsSaving(true);
    try {
      let teamMemberName = "";
      let teamMemberId = data.teamMemberId;

      if (profile?.role === "mdt" && mdtSession) {
        teamMemberName = mdtSession.fullName;
        teamMemberId = profile.id;
      } else if (data.teamMemberId.startsWith('gp-')) {
        teamMemberName = resident.gpName || "";
        teamMemberId = `gp-${resident.gpName}`;
      } else if (data.teamMemberId.startsWith('care-manager-')) {
        teamMemberName = resident.careManagerName || "";
        teamMemberId = `care-manager-${resident.careManagerName}`;
      } else {
        const selectedTeamMember = careTeamMembers.find(member => member.id === data.teamMemberId);
        if (!selectedTeamMember) {
          toast.error("Selected team member not found");
          setIsSaving(false);
          return;
        }
        teamMemberName = selectedTeamMember.name;
      }

      const profession = profile?.role === "mdt" ? mdtSession.profession : (
        data.teamMemberId.startsWith('gp-') ? 'GP' :
        data.teamMemberId.startsWith('care-manager-') ? 'Social Worker' : (
          careTeamMembers.find(member => member.id === data.teamMemberId)?.designation || 'Other'
        )
      );

      let uploadedFileId: string | undefined = undefined;

      // 1. Upload pdf attachment if selected first
      if (selectedPdf) {
        const sanitizedFileName = selectedPdf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const timestamp = Date.now();
        const storagePath = `${residentId}/${folder.key}/${timestamp}_${sanitizedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("resident-files")
          .upload(storagePath, selectedPdf, {
            contentType: "application/pdf",
            upsert: false
          });

        if (uploadError) throw uploadError;

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
              resident_id: residentId,
              organization_id: resident.organizationId || profile.active_organization_id,
              folder_name: folder.key,
              team_id: profile.active_team_id || mdtSession?.unitId,
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

      // 2. Create Multidisciplinary Note in DB with fileId relation
      await multidisciplinaryService.createNote({
        residentId: residentId,
        teamMemberId: teamMemberId.startsWith('gp-') || teamMemberId.startsWith('care-manager-') || profile?.role === "mdt"
          ? undefined
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
        organizationId: resident.organizationId || profile.active_organization_id,
        createdBy: profile.id,
        title: data.title || undefined,
        fileId: uploadedFileId,
      });

      toast.success("Multidisciplinary note and attachment saved successfully");
      form.reset();
      setSelectedPdf(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setCurrentStep(1);

      // Refresh data
      await fetchData();
      await fetchUploadedFiles();
      setCurrentPage(1);

    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to create multidisciplinary note: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // PDF Print/Download for Single Note
  const handlePrintSingleNote = async (noteItem: MultidisciplinaryNote) => {
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
            date: noteItem.noteDate,
            notes: [{
              team_member_name: noteItem.teamMemberName,
              profession: noteItem.profession,
              note_time: noteItem.noteTime,
              reason_for_visit: noteItem.reasonForVisit,
              outcome: noteItem.outcome,
              relative_informed: noteItem.relativeInformed,
              relative_informed_details: noteItem.relativeInformedDetails,
              signature: noteItem.signature
            }]
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
      a.download = `mdt-report-${resident.firstName}-${resident.lastName}-${noteItem.noteDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("MDT note downloaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download MDT note");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!folder) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> Go Back</Button>
      </div>
    );
  }

  if (isLoading || resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading folder details...</p>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;

  return (
    <div className="flex flex-col gap-6 w-full relative h-[calc(100vh-theme(spacing.24))]">
      {/* Top Breadcrumbs Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-background border-b flex-shrink-0">
        <button
          onClick={() => router.push(`/dashboard/residents/${residentId}/multidisciplinary-note`)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
          <span className="font-bold text-black">{fullName}</span>
          <span>/</span>
          <span>MDT Notes</span>
          <span>/</span>
          <span
            className={cn(
              "font-medium cursor-pointer hover:text-indigo-600 transition-colors",
              (activeNote || activeFile || activeFormKey) ? "text-muted-foreground" : "text-foreground font-semibold"
            )}
            onClick={() => {
              setActiveNoteId(null);
              setActiveFormKey(null);
              setActiveFileId(null);
              setCurrentPage(1);
            }}
          >
            {folder.name}
          </span>
          {activeFormKey && (
            <>
              <span>/</span>
              <span className="text-foreground">Add Note</span>
            </>
          )}
          {activeNote && (
            <>
              <span>/</span>
              <span className="text-foreground">{activeNote.title || `Note on ${format(new Date(activeNote.noteDate), "dd/MM/yyyy")}`}</span>
            </>
          )}
          {activeFile && (
            <>
              <span>/</span>
              <span className="text-foreground">{activeFile.name}</span>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all duration-200"
          title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelRight className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-muted/10">
          {activeFile ? (
            <FileViewer file={activeFile} />
          ) : activeFormKey === "add-note" ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
              <div className="w-full bg-background rounded-xl border shadow-sm mb-8 overflow-visible max-w-2xl mx-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold leading-none">Add {folder.name} Note</h2>
                      <p className="text-xs text-muted-foreground mt-1">Step {currentStep} of {totalSteps}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmitNote)} className="space-y-6">
                      
                      {/* Step 1: Visit Details */}
                      {currentStep === 1 && (
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Note Title (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Initial Assessment, Weekly Review..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
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
                                          <CalendarIcon className="mr-2 h-4 w-4" />
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
                                          const todayLimit = new Date();
                                          todayLimit.setHours(23, 59, 59, 999);
                                          return date > todayLimit;
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
                                      {resident.gpName && (
                                        <SelectItem value={`gp-${resident.gpName.replace(/\s+/g, '-').toLowerCase()}`}>
                                          {resident.gpName} - General Practitioner
                                        </SelectItem>
                                      )}
                                      {resident.careManagerName && (
                                        <SelectItem value={`care-manager-${resident.careManagerName.replace(/\s+/g, '-').toLowerCase()}`}>
                                          {resident.careManagerName} - Care Manager
                                        </SelectItem>
                                      )}
                                      {careTeamMembers.map((member) => (
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

                      {/* Step 2: Relative info, signature & files */}
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
                                    placeholder="Who was informed and how..."
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

                          <div className="space-y-3 pt-2">
                            <Label className="text-sm font-semibold text-gray-700">Attach Supporting PDF (Optional)</Label>
                            <div className="flex items-center gap-2">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={(e) => {
                                  const fileItem = e.target.files?.[0];
                                  if (fileItem) {
                                    if (fileItem.type !== "application/pdf" && !fileItem.name.endsWith('.pdf')) {
                                      toast.error("Only PDF files are allowed");
                                      e.target.value = "";
                                      return;
                                    }
                                    if (fileItem.size > 10 * 1024 * 1024) {
                                      toast.error("File size must be less than 10MB");
                                      e.target.value = "";
                                      return;
                                    }
                                    setSelectedPdf(fileItem);
                                  } else {
                                    setSelectedPdf(null);
                                  }
                                }}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                Choose PDF File
                              </Button>
                            </div>

                            {/* Selected File Preview */}
                            {selectedPdf && (
                              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md w-full overflow-hidden border border-gray-150 animate-in fade-in zoom-in-95 duration-150">
                                <div className="bg-red-50 p-1.5 rounded-lg shrink-0">
                                  <FileIcon className="w-4 h-4 text-red-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800 truncate" title={selectedPdf.name}>
                                    {selectedPdf.name}
                                  </p>
                                  <p className="text-[10px] text-gray-500">
                                    {(selectedPdf.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-gray-400 hover:text-red-500 shrink-0"
                                  onClick={() => {
                                    setSelectedPdf(null);
                                    if (fileInputRef.current) {
                                      fileInputRef.current.value = "";
                                    }
                                  }}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Navigation buttons */}
                      <div className="flex justify-between pt-4 border-t">
                        <div className="flex space-x-2">
                          {notes.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleNoteClick(notes[0].id)}
                            >
                              Cancel
                            </Button>
                          )}
                          {currentStep > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={prevStep}
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
                            >
                              Next Step
                            </Button>
                          ) : (
                            <Button
                              type="submit"
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving..." : "Create Note"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </div>
          ) : activeNote ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
              <div className="w-full bg-background rounded-xl border shadow-sm mb-8 overflow-visible max-w-2xl mx-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingTitleVal}
                            onChange={(e) => setEditingTitleVal(e.target.value)}
                            placeholder="Enter note name..."
                            className="h-8 py-1 px-2 text-sm font-bold w-48"
                            disabled={isSavingTitle}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={async () => {
                              if (!editingTitleVal.trim()) {
                                toast.error("Note name cannot be empty");
                                return;
                              }
                              setIsSavingTitle(true);
                              try {
                                await multidisciplinaryService.updateNoteTitle(activeNote.id, editingTitleVal.trim());
                                activeNote.title = editingTitleVal.trim();
                                setIsEditingTitle(false);
                                toast.success("Note name updated successfully");
                                await fetchData();
                              } catch (err) {
                                console.error(err);
                                toast.error("Failed to rename note");
                              } finally {
                                setIsSavingTitle(false);
                              }
                            }}
                            disabled={isSavingTitle}
                          >
                            {isSavingTitle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                            onClick={() => setIsEditingTitle(false)}
                            disabled={isSavingTitle}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/title">
                          <h2 className="text-lg font-bold leading-none">
                            {activeNote.title || `${activeNote.teamMemberName} Note`}
                          </h2>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover/title:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditingTitleVal(activeNote.title || activeNote.teamMemberName || "");
                              setIsEditingTitle(true);
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Recorded on {format(new Date(activeNote.noteDate), "dd/MM/yyyy")} at {activeNote.noteTime || "--:--"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintSingleNote(activeNote)}
                      disabled={isDownloading}
                      className="gap-2"
                    >
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                      Print / PDF
                    </Button>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  {/* Overview Block */}
                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">MDT Role</p>
                      <Badge className="bg-indigo-100 text-indigo-800 border-0">{activeNote.profession || "Other"}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Relative Informed</p>
                      <Badge className={cn("border-0", activeNote.relativeInformed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800")}>
                        {activeNote.relativeInformed ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Team Member</p>
                      <p className="font-medium text-gray-900">{activeNote.teamMemberName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Signed By</p>
                      <p className="font-medium text-gray-900">{activeNote.signature}</p>
                    </div>
                  </div>

                  {/* Visit details text */}
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-indigo-600" />
                        Reason for Visit
                      </h3>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{activeNote.reasonForVisit}</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <UserCheck className="w-4 h-4 mr-2 text-indigo-600" />
                        Outcome & Recommendations
                      </h3>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{activeNote.outcome}</p>
                    </div>

                    {activeNote.relativeInformedDetails && (
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <Users className="w-4 h-4 mr-2 text-indigo-600" />
                          Relative Informed Details
                        </h3>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{activeNote.relativeInformedDetails}</p>
                      </div>
                    )}
                  </div>

                  {/* Attached Document Section */}
                  {(() => {
                    const attachedFile = activeNote?.file;
                    if (!attachedFile) return null;
                    return (
                      <div className="space-y-3 pt-6 border-t mt-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-indigo-600" />
                          Attached Document
                        </h3>
                        <div className="border rounded-xl bg-white overflow-hidden shadow-sm flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-xs font-semibold text-gray-800 truncate" title={attachedFile.name}>
                              {attachedFile.name}
                            </span>
                            <span className="text-[10px] text-gray-500 shrink-0">
                              {(attachedFile.file_size / 1024).toFixed(0)} KB
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-[10px] gap-1 bg-white hover:bg-muted"
                              onClick={() => {
                                if (activeNoteSignedUrl) {
                                  window.open(activeNoteSignedUrl, "_blank");
                                } else {
                                  window.open(attachedFile.public_url, "_blank");
                                }
                              }}
                            >
                              <Download className="w-3 h-3" />
                              Open / Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>{folder.name} Notes List</span>
                  </CardTitle>
                  <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">
                    {notes.length} {notes.length === 1 ? "note" : "notes"}
                  </Badge>
                </CardHeader>
                <CardContent className="px-0">
                  {notes.length === 0 ? (
                    <div className="text-center py-12 bg-background rounded-xl border border-gray-150 shadow-sm">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No notes recorded in this folder</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Click the Add Note button to record the first note
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-xl border border-gray-150 shadow-sm bg-white">
                        <Table>
                          <TableHeader className="bg-gray-50/75">
                            <TableRow>
                              <TableHead className="w-[90px] text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</TableHead>
                              <TableHead className="w-[110px] text-xs font-bold text-gray-500 uppercase tracking-wider">Team Member</TableHead>
                              <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reason for Visit</TableHead>
                              <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Outcome</TableHead>
                              <TableHead className="w-[100px] text-xs font-bold text-gray-500 uppercase tracking-wider">Relative</TableHead>
                              <TableHead className="w-[90px] text-xs font-bold text-gray-500 uppercase tracking-wider">Signature</TableHead>
                              <TableHead className="w-[75px] text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedNotes.map((note) => {
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
                                  <TableCell className="align-top py-3.5 max-w-[180px]">
                                    <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap leading-relaxed" title={note.reasonForVisit}>
                                      {note.reasonForVisit}
                                    </p>
                                  </TableCell>
                                  <TableCell className="align-top py-3.5 max-w-[180px]">
                                    <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap leading-relaxed" title={note.outcome}>
                                      {note.outcome}
                                    </p>
                                  </TableCell>
                                  <TableCell className="align-top py-3.5">
                                    <div className="flex flex-col gap-1.5">
                                      <Badge variant="outline" className={`w-fit text-[10px] py-0 px-1.5 h-4 ${note.relativeInformed ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                        {note.relativeInformed ? "Informed" : "Not Informed"}
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
                                        onClick={() => handleNoteClick(note.id)}
                                        className="h-7 w-7 p-0 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                                        title="View Detail"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePrintSingleNote(note)}
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

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 px-2">
                          <p className="text-sm text-muted-foreground">
                            Showing {startIndex + 1} to {endIndex} of {notes.length} notes
                          </p>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="gap-1"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {currentPage} of {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="gap-1"
                            >
                              Next
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className={cn(
          "flex-shrink-0 border-l bg-background h-full transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-6",
          isSidebarCollapsed ? "w-0 opacity-0 invisible" : "w-[200px] opacity-100"
        )}>
          {/* Notes Section */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Visit Notes</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] font-bold hover:bg-muted text-primary"
                onClick={() => {
                  setActiveFormKey(null);
                  setActiveNoteId(null);
                  setActiveFileId(null);
                  setCurrentPage(1);
                }}
              >
                View All
              </Button>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={handleAddNoteClick}
                className={cn(
                  "group flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all text-xs font-semibold w-full",
                  activeFormKey === "add-note" ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground"
                )}
              >
                <Plus className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                <span>Add Note</span>
              </button>
              {todayNotes.map((note) => {
                const isActive = activeNoteId === note.id;
                return (
                  <button
                    key={note.id}
                    onClick={() => handleNoteClick(note.id)}
                    className={cn(
                      "group flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all w-full",
                      isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground"
                    )}
                  >
                    <FileText className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight truncate">{note.title || note.teamMemberName}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(note.noteDate), "dd/MM/yyyy")}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Documents Section */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Documents</p>
              <UploadFileModal
                folderName={folder.key}
                residentId={residentId}
                variant="icon"
                onUploaded={fetchUploadedFiles}
              />
            </div>
            {filesLoading ? (
              <div className="flex items-center justify-center p-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : standaloneFiles.length === 0 ? (
              <div className="px-2 py-3 border border-dashed rounded-lg text-center"><p className="text-[10px] text-muted-foreground italic">No uploads found</p></div>
            ) : (
              <div className="flex flex-col gap-1">
                {standaloneFiles.map((fileItem) => {
                  const isActive = activeFileId === fileItem.id;
                  return (
                    <div key={fileItem.id} className={cn("group flex items-start gap-2.5 px-2 py-2 rounded-lg transition-all", isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground")}>
                      <button onClick={() => handleFileClick(fileItem.id)} className="flex items-start gap-2 flex-1 min-w-0 text-left">
                        <Paperclip className={cn("w-3.5 h-3.5 flex-shrink-0 mt-0.5", isActive ? "text-primary" : "text-muted-foreground")} />
                        <div className="min-w-0"><p className="text-xs font-semibold leading-tight truncate">{fileItem.name}</p></div>
                      </button>
                      <button onClick={(e) => handleDeleteFile(fileItem, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
