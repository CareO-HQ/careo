"use client";

import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Download,
  FileText,
  Folder,
  Loader2,
  Paperclip,
  Trash2,
  Plus,
  Map as MapIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  Edit3,
  X,
  PanelRight,
  PanelRightClose,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InitialWoundAssessmentForm } from "./components/initial-wound-assessment-form";
import { WoundAssessmentForm } from "./components/wound-assessment-form";
import { WoundTreatmentEvaluationForm } from "./components/wound-treatment-evaluation-form";
import { PhotographEvaluationForm } from "./components/photograph-evaluation-form";
import { WoundProgressTracker } from "./components/wound-progress-tracker";
import { WoundStatusForm } from "./components/wound-status-form";
import { InteractiveBodyMap } from "@/components/body-map/InteractiveBodyMap";
import { BodyMapEntryForm } from "@/components/body-map/BodyMapEntryForm";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import { CarePlanEvaluations } from "@/components/residents/carefile/CarePlanEvaluations";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { BodyRegion, BodyMapEntry, BodyMapData, BodyMapSession } from "@/types/body-map";
import { BODY_REGIONS } from "@/lib/config/body-regions";
import { normalizeBodyMapData } from "@/lib/body-map-utils";
import { generateBodyMapPDF } from "@/lib/body-map-pdf-utils";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

// --- Types ---

type ResidentData = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
};

type WoundFolder = {
  id: string;
  resident_id: string;
  organization_id: string;
  name: string;
  wound_type: string;
  body_map_data: BodyMapData | null;
  status?: string;
  next_review_date?: string;
  created_at: string;
  updated_at: string;
};

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

// --- File Viewer ---

function FileViewer({ file }: { file: UploadedFile }) {
  const ext = (file.original_name ?? file.name).split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
  const isPdf = ext === "pdf" || file.file_type === "application/pdf";
  const isOffice = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
  const url = file.signedUrl ?? "";

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading file&hellip;</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Viewer toolbar */}
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

      {/* Viewer body */}
      <div className="flex-1 overflow-auto bg-muted/30">
        {isPdf && (
          <iframe
            src={url}
            className="w-full h-full border-none"
            title={file.name}
          />
        )}
        {isImage && (
          <div className="flex items-center justify-center h-full p-6">
            <img
              src={url}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded shadow-sm"
            />
          </div>
        )}
        {isOffice && (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
            className="w-full h-full border-none"
            title={file.name}
          />
        )}
        {!isPdf && !isImage && !isOffice && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              This file type cannot be previewed inline.
            </p>
            <a
              href={url}
              download={file.original_name ?? file.name}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              Download file
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Page ---

type WoundFolderPageProps = {
  params: Promise<{ id: string; folderId: string }>;
};

export default function WoundFolderPage({ params }: WoundFolderPageProps) {
  const { id: residentId, folderId } = React.use(params);
  const router = useRouter();

  const { activeOrganizationId } = useActiveTeam();
  const { profile } = useProfile();
  const { supabase: supabaseClient } = useSupabase();

  const [resident, setResident] = useState<ResidentData | null>(null);
  const [folder, setFolder] = useState<WoundFolder | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"initial-assessment" | "assessment" | "evaluation" | "photograph" | "body-map" | "care-plans" | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // Track initial wound assessments (usually one per wound)
  const [initialWoundAssessments, setInitialWoundAssessments] = useState<any[]>([]);
  const [isLoadingInitialAssessments, setIsLoadingInitialAssessments] = useState(false);

  // Track wound assessments (multiple allowed)
  const [woundAssessments, setWoundAssessments] = useState<any[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);

  // Track wound treatment evaluations (multiple allowed)
  const [treatmentEvaluations, setTreatmentEvaluations] = useState<any[]>([]);
  const [isLoadingTreatmentEvaluations, setIsLoadingTreatmentEvaluations] = useState(false);

  // Track photograph evaluations (multiple allowed)
  const [photographEvaluations, setPhotographEvaluations] = useState<any[]>([]);
  const [isLoadingPhotographs, setIsLoadingPhotographs] = useState(false);
  const [activeCarePlans, setActiveCarePlans] = useState<any[]>([]);
  const [selectedCarePlan, setSelectedCarePlan] = useState<any>(null);
  const [carePlanCount, setCarePlanCount] = useState(0);
  const [isCarePlanReviewMode, setIsCarePlanReviewMode] = useState(false);
  const [isCarePlanViewOnly, setIsCarePlanViewOnly] = useState(false);
  const [isSavingCarePlan, setIsSavingCarePlan] = useState(false);

  // Body Map states
  const [bodyMapData, setBodyMapData] = useState<BodyMapData>({ sessions: [] });
  const [bmSessionId, setBmSessionId] = useState<string | null>(null);
  const [bmSelectedRegion, setBmSelectedRegion] = useState<BodyRegion | null>(null);
  const [bmEditingEntry, setBmEditingEntry] = useState<BodyMapEntry | null>(null);
  const [bmSaving, setBmSaving] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [showClearBodyMapDialog, setShowClearBodyMapDialog] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | undefined>(undefined);

  const activeFile = uploadedFiles.find((f) => f.id === activeFileId) ?? null;
  const fullName = resident ? `${resident.first_name} ${resident.last_name}` : "";

  // Current body map session
  const bmCurrentSession = bodyMapData.sessions.find((s) => s.id === bmSessionId) ?? null;
  const bodyMapEntryCount = bodyMapData.sessions.reduce(
    (sum, s) => sum + (s.entries?.length || 0),
    0
  );
  const hasBodyMapData = bodyMapData.sessions.length > 0;

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Fetch org logo
  useEffect(() => {
    if (!activeOrganizationId || !supabaseClient) return;
    supabaseClient
      .from("organizations")
      .select("logo_url")
      .eq("id", activeOrganizationId)
      .single()
      .then(({ data }) => {
        if (data?.logo_url) setOrgLogoUrl(data.logo_url);
      });
  }, [activeOrganizationId, supabaseClient]);

  // Sync body map data from folder
  useEffect(() => {
    if (folder?.body_map_data) {
      const normalized = normalizeBodyMapData(folder.body_map_data);
      setBodyMapData(normalized);
      if (normalized.sessions.length > 0 && !bmSessionId) {
        setBmSessionId(normalized.sessions[0].id);
      }
    }
  }, [folder?.body_map_data, bmSessionId]);

  // Save body map data to DB
  const saveBodyMapToDb = async (newData: BodyMapData) => {
    setBmSaving(true);
    try {
      const { error } = await supabase
        .from("wound_folders")
        .update({ body_map_data: newData })
        .eq("id", folderId);
      if (error) throw error;

      setBodyMapData(newData);
      setFolder((prev) => (prev ? { ...prev, body_map_data: newData } : prev));
      setBmSelectedRegion(null);
      setBmEditingEntry(null);
      toast.success("Body map updated");
    } catch (err) {
      console.error("Error saving body map:", err);
      toast.error("Failed to save body map");
    } finally {
      setBmSaving(false);
    }
  };

  // Auto-create a session when body map is first shown
  const handleEnsureSession = async () => {
    if (bodyMapData.sessions.length > 0) return;
    const newSession: BodyMapSession = {
      id: uuidv4(),
      date: new Date().toISOString().split("T")[0],
      label: "Wound Body Map",
      entries: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const newData: BodyMapData = { sessions: [newSession] };
    await saveBodyMapToDb(newData);
    setBmSessionId(newSession.id);
  };

  // When body map tab is activated, ensure a session exists
  useEffect(() => {
    if (activeView === "body-map") {
      handleEnsureSession();
    }
  }, [activeView]);

  const handleBmRegionClick = (region: BodyRegion) => {
    if (!bmCurrentSession) return;
    setBmSelectedRegion(region);
    const existing =
      bmCurrentSession.entries.find((e) => e.region_id === region.region_id && e.status === "active") ||
      bmCurrentSession.entries.find((e) => e.region_id === region.region_id);
    setBmEditingEntry(existing || null);
  };

  const handleBmSubmitEntry = async (formData: any) => {
    if (!bmSelectedRegion || !bmCurrentSession) return;
    const now = new Date().toISOString();
    let newEntries = [...bmCurrentSession.entries];

    if (bmEditingEntry) {
      newEntries = newEntries.map((e) =>
        e.id === bmEditingEntry.id ? { ...e, ...formData } : e
      );
    } else {
      const newEntry: BodyMapEntry = {
        id: uuidv4(),
        region_id: bmSelectedRegion.region_id,
        region_name: bmSelectedRegion.region_name,
        status: "active",
        ...formData,
        date_time: formData.date_time || now,
      };
      newEntries.push(newEntry);
    }

    const newSessions = bodyMapData.sessions.map((s) =>
      s.id === bmSessionId
        ? { ...s, entries: newEntries, updated_at: now }
        : s
    );
    await saveBodyMapToDb({ sessions: newSessions });
  };

  const handleBmDeleteEntry = async () => {
    if (!bmEditingEntry || !bmCurrentSession) return;
    const newEntries = bmCurrentSession.entries.filter((e) => e.id !== bmEditingEntry.id);
    const now = new Date().toISOString();
    const newSessions = bodyMapData.sessions.map((s) =>
      s.id === bmSessionId
        ? { ...s, entries: newEntries, updated_at: now }
        : s
    );
    await saveBodyMapToDb({ sessions: newSessions });
  };

  const handleDownloadBodyMapPDF = async () => {
    if (!bmCurrentSession || bmCurrentSession.entries.length === 0) {
      toast.error("No observations to download");
      return;
    }
    setIsDownloadingPDF(true);
    try {
      await generateBodyMapPDF({
        residentName: fullName,
        incidentDate: folder?.created_at?.split("T")[0],
        incidentType: `Wound Body Map - ${folder?.wound_type}`,
        currentSession: bmCurrentSession,
        orgLogoUrl,
      });
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const confirmClearBodyMap = async () => {
    try {
      const emptyData: BodyMapData = { sessions: [] };
      const { error } = await supabase
        .from("wound_folders")
        .update({ body_map_data: emptyData })
        .eq("id", folderId);
      if (error) throw error;

      setBodyMapData(emptyData);
      setFolder((prev) => (prev ? { ...prev, body_map_data: emptyData } : prev));
      setBmSessionId(null);
      setBmSelectedRegion(null);
      setBmEditingEntry(null);
      setShowClearBodyMapDialog(false);
      toast.success("Body map cleared");
    } catch (error) {
      console.error("Error clearing body map:", error);
      toast.error("Failed to clear body map");
    }
  };

  // Fetch initial wound assessments
  const fetchInitialWoundAssessments = useCallback(async () => {
    if (!folderId) return;
    setIsLoadingInitialAssessments(true);
    try {
      const { data, error } = await supabase
        .from("initial_wound_assessments")
        .select("*")
        .eq("wound_folder_id", folderId)
        .order("assessment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        setInitialWoundAssessments(data);
      }
    } catch (err) {
      console.error("Error fetching initial wound assessments:", err);
    } finally {
      setIsLoadingInitialAssessments(false);
    }
  }, [folderId]);

  // Fetch wound assessments
  const fetchWoundAssessments = useCallback(async () => {
    if (!folderId) return;
    setIsLoadingAssessments(true);
    try {
      const { data, error } = await supabase
        .from("wound_assessments")
        .select(`
          *,
          recorded_by_user:recorded_by (
            id,
            name,
            email
          )
        `)
        .eq("wound_folder_id", folderId)
        .order("assessment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Generate signed URLs for assessments with photos
        const assessmentsWithUrls = await Promise.all(
          data.map(async (assessment) => {
            if (assessment.photograph_storage_path) {
              const { data: signedData } = await supabase.storage
                .from("wound-photos")
                .createSignedUrl(assessment.photograph_storage_path, 3600);
              return { ...assessment, signedUrl: signedData?.signedUrl };
            }
            return assessment;
          })
        );
        setWoundAssessments(assessmentsWithUrls);
      }
    } catch (err) {
      console.error("Error fetching wound assessments:", err);
    } finally {
      setIsLoadingAssessments(false);
    }
  }, [folderId]);

  // Fetch photograph evaluations
  const fetchPhotographEvaluations = useCallback(async () => {
    if (!folderId) return;
    setIsLoadingPhotographs(true);
    try {
      const { data, error } = await supabase
        .from("wound_photograph_evaluations")
        .select(`
          *,
          created_by_user:created_by (
            id,
            name,
            email
          )
        `)
        .eq("wound_folder_id", folderId)
        .order("photograph_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Check if bucket is public or private and handle accordingly
        const evaluationsWithUrls = await Promise.all(
          data.map(async (evaluation) => {
            if (evaluation.photograph_url) {
              const url = evaluation.photograph_url;

              // Try to extract storage path from URL
              let path = "";

              // Handle full Supabase storage URL format
              // Format: https://{project}.supabase.co/storage/v1/object/public/wound-photos/{path}
              if (url.includes("/storage/v1/object/public/wound-photos/")) {
                path = url.split("/storage/v1/object/public/wound-photos/")[1] || "";
              } else if (url.includes("wound-photos/")) {
                // Fallback: split on bucket name
                path = url.split("wound-photos/")[1] || "";
              } else {
                // Assume it's already just the path
                path = url;
              }

              // Try to generate signed URL (for private buckets)
              const { data: signedData, error: signError } = await supabase.storage
                .from("wound-photos")
                .createSignedUrl(path, 3600);

              if (!signError && signedData?.signedUrl) {
                return { ...evaluation, signedUrl: signedData.signedUrl };
              } else {
                // If signed URL fails, bucket might be public, use original URL
                console.log("Using public URL for photograph:", url);
                return { ...evaluation, signedUrl: url };
              }
            }
            return evaluation;
          })
        );
        setPhotographEvaluations(evaluationsWithUrls);
      }
    } catch (err) {
      console.error("Error fetching photograph evaluations:", err);
    } finally {
      setIsLoadingPhotographs(false);
    }
  }, [folderId]);

  // Fetch treatment evaluations
  const fetchTreatmentEvaluations = useCallback(async () => {
    if (!folderId) return;
    setIsLoadingTreatmentEvaluations(true);
    try {
      const { data, error } = await supabase
        .from("wound_treatment_evaluations")
        .select("*")
        .eq("wound_folder_id", folderId)
        .order("evaluation_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTreatmentEvaluations(data);
      }
    } catch (err) {
      console.error("Error fetching treatment evaluations:", err);
    } finally {
      setIsLoadingTreatmentEvaluations(false);
    }
  }, [folderId]);

  // Fetch active care plans for this wound
  const fetchActiveCarePlans = useCallback(async () => {
    if (!folderId) return;
    try {
      const { data, error } = await supabase
        .from("care_plan_assessments")
        .select("*")
        .eq("wound_folder_id", folderId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setActiveCarePlans(data);
        setCarePlanCount(data.length);
      }
    } catch (err) {
      console.error("Error fetching care plans:", err);
    }
  }, [folderId]);

  useEffect(() => {
    if (!residentId) return;
    supabase
      .from("residents")
      .select("*")
      .eq("id", residentId)
      .single()
      .then(({ data, error }) => {
        if (!error) setResident(data as ResidentData);
      });

    // Fetch initial assessments, wound assessments, treatment evaluations, and photograph evaluations
    fetchInitialWoundAssessments();
    fetchWoundAssessments();
    fetchTreatmentEvaluations();
    fetchPhotographEvaluations();
    fetchActiveCarePlans();
  }, [residentId, fetchInitialWoundAssessments, fetchWoundAssessments, fetchTreatmentEvaluations, fetchPhotographEvaluations, fetchActiveCarePlans]);

  const fetchFolder = useCallback(async () => {
    if (!folderId) return;
    const { data, error } = await supabase
      .from("wound_folders")
      .select("*")
      .eq("id", folderId)
      .single();
    if (!error) setFolder(data as WoundFolder);
  }, [folderId]);

  useEffect(() => {
    fetchFolder();
  }, [fetchFolder]);

  const fetchUploadedFiles = useCallback(async () => {
    if (!residentId || !folderId) return;
    setFilesLoading(true);
    const { data, error } = await supabase
      .from("files")
      .select("id, name, original_name, file_size, storage_path, file_type, created_at")
      .eq("resident_id", residentId)
      .eq("folder_name", `wound-${folderId}`)
      .order("created_at", { ascending: false });
    if (!error && data) setUploadedFiles(data as UploadedFile[]);
    setFilesLoading(false);
  }, [residentId, folderId]);

  useEffect(() => {
    fetchUploadedFiles();
  }, [fetchUploadedFiles]);

  const handleDeleteFile = async (file: UploadedFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;

    await supabase.storage.from("resident-files").remove([file.storage_path]);
    await supabase.from("files").delete().eq("id", file.id);

    if (activeFileId === file.id) setActiveFileId(null);
    fetchUploadedFiles();
  };

  const handleFileClick = async (fileId: string) => {
    setActiveView(null);
    if (activeFileId === fileId) {
      setActiveFileId(null);
      return;
    }
    setActiveFileId(fileId);
    const file = uploadedFiles.find((f) => f.id === fileId);
    if (file && !file.signedUrl) {
      const { data } = await supabase.storage
        .from("resident-files")
        .createSignedUrl(file.storage_path, 3600);
      if (data?.signedUrl) {
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, signedUrl: data.signedUrl } : f))
        );
      }
    }
  };

  const handleInitialAssessmentClick = () => {
    setActiveFileId(null);
    setActiveView("initial-assessment");
  };

  const handleAssessmentClick = () => {
    setActiveFileId(null);
    setActiveView("assessment");
  };

  const handleEvaluationClick = () => {
    setActiveFileId(null);
    setActiveView("evaluation");
  };

  const handlePhotographClick = () => {
    setActiveFileId(null);
    setActiveView("photograph");
  };

  const handleBodyMapClick = () => {
    setActiveFileId(null);
    setActiveView("body-map");
  };

  const handleCarePlanClick = (cp?: any) => {
    setActiveFileId(null);
    setActiveView("care-plans");
    if (cp) {
      setSelectedCarePlan(cp);
      setIsCarePlanViewOnly(true);
      setIsCarePlanReviewMode(false);
    } else {
      setSelectedCarePlan(null);
      setIsCarePlanViewOnly(false);
      setIsCarePlanReviewMode(false);
    }
  };

  const handleCarePlanSuccess = (data: any) => {
    setSelectedCarePlan(data);
    setIsCarePlanViewOnly(true);
    setIsCarePlanReviewMode(false);
    setIsSavingCarePlan(false);
    fetchActiveCarePlans();
  };

  const handleCloseCarePlan = () => {
    setActiveView(null);
    setSelectedCarePlan(null);
  };

  const handleExternalCarePlanSubmit = () => {
    const submitBtn = document.getElementById('care-file-submit-btn');
    if (submitBtn) {
      setIsSavingCarePlan(true);
      submitBtn.click();
      setTimeout(() => setIsSavingCarePlan(false), 2000);
    }
  };

  // Calculate progress status
  const progressHasBodyMap = bodyMapEntryCount > 0;
  const progressHasPhotograph = photographEvaluations.length > 0;
  const progressHasInitialAssessment = initialWoundAssessments.length > 0;
  const progressHasCarePlan = carePlanCount > 0;
  const progressHasOngoingAssessment = woundAssessments.length > 0;
  const progressHasEvaluation = folder?.next_review_date ? true : false;
  const progressIsHealed = folder?.status === "healed";

  return (
    <div className="flex flex-col -mx-16 -mt-16 -mb-6 h-screen overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-background border-b flex-shrink-0">
        <button
          onClick={() => router.push(`/dashboard/residents/${residentId}/wounds`)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-1 items-center gap-2 text-sm min-w-0">
          <span className="text-muted-foreground">Wounds</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium flex items-center gap-1.5 truncate">
            <Folder className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{folder?.name || "Loading..."}</span>
          </span>
          {activeFile && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground truncate">{activeFile.name}</span>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all duration-200 flex-shrink-0"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelRight className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Progress Tracker */}
      <WoundProgressTracker
        hasBodyMap={progressHasBodyMap}
        hasPhotograph={progressHasPhotograph}
        hasAssessment={progressHasInitialAssessment}
        hasEvaluation={progressHasEvaluation}
        hasCarePlan={progressHasCarePlan}
      />

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Center content */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {activeFile ? (
            <FileViewer file={activeFile} />
          ) : activeView === "initial-assessment" ? (
            <div className="flex-1 overflow-auto">
              <InitialWoundAssessmentForm
                residentId={residentId}
                woundFolderId={folderId}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
                assessments={initialWoundAssessments}
                isLoadingAssessments={isLoadingInitialAssessments}
                onSaved={() => {
                  fetchInitialWoundAssessments();
                }}
              />
            </div>
          ) : activeView === "assessment" ? (
            <div className="flex-1 overflow-auto">
              <WoundAssessmentForm
                residentId={residentId}
                woundFolderId={folderId}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
                assessments={woundAssessments}
                isLoadingAssessments={isLoadingAssessments}
                onSaved={() => {
                  fetchWoundAssessments();
                }}
              />
            </div>
          ) : activeView === "evaluation" ? (
            <div className="flex-1 overflow-auto">
              <WoundTreatmentEvaluationForm
                residentId={residentId}
                woundFolderId={folderId}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
                evaluations={treatmentEvaluations}
                onSaved={() => {
                  fetchTreatmentEvaluations();
                }}
              />
            </div>
          ) : activeView === "photograph" ? (
            <div className="flex-1 overflow-auto">
              <PhotographEvaluationForm
                residentId={residentId}
                woundFolderId={folderId}
                residentName={fullName}
                evaluations={photographEvaluations}
                isLoadingEvaluations={isLoadingPhotographs}
                onSaved={() => {
                  fetchPhotographEvaluations();
                }}
              />
            </div>
          ) : activeView === "body-map" ? (
            <div className="flex-1 flex flex-row overflow-hidden">
              {/* Left: Interactive Body Map */}
              <div className="flex-[3] px-4 pt-2 pb-3 overflow-auto bg-white border-r flex flex-col">
                <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold">Wound Body Map</span>
                    {hasBodyMapData && (
                      <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                        {bodyMapEntryCount} {bodyMapEntryCount === 1 ? "observation" : "observations"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadBodyMapPDF}
                      disabled={isDownloadingPDF || !hasBodyMapData || bodyMapEntryCount === 0}
                      className="h-7 text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {isDownloadingPDF ? "..." : "PDF"}
                    </Button>
                    {hasBodyMapData && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowClearBodyMapDialog(true)}
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Clear
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  {bmCurrentSession ? (
                    <InteractiveBodyMap
                      entries={bmCurrentSession.entries}
                      onRegionClick={handleBmRegionClick}
                      isLoading={bmSaving}
                      selectedRegionId={bmSelectedRegion?.region_id}
                    />
                  ) : (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Entry Form / Observations list */}
              <div className="flex-[2] overflow-hidden bg-slate-50/50">
                <ScrollArea className="h-full px-4 pt-2 pb-3">
                  {bmSelectedRegion ? (
                    <BodyMapEntryForm
                      regionName={bmSelectedRegion.region_name}
                      initialData={bmEditingEntry || undefined}
                      onSubmit={handleBmSubmitEntry}
                      onCancel={() => {
                        setBmSelectedRegion(null);
                        setBmEditingEntry(null);
                      }}
                      onDelete={bmEditingEntry ? handleBmDeleteEntry : undefined}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold">Recorded Observations</h3>
                        <p className="text-[11px] text-muted-foreground">
                          Click on a body region to add or view details.
                        </p>
                      </div>

                      {(bmCurrentSession?.entries || []).length > 0 ? (
                        <div className="space-y-2">
                          {bmCurrentSession?.entries.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-2.5 border rounded-lg bg-white shadow-sm cursor-pointer hover:border-primary transition-colors"
                              onClick={() => {
                                const region = BODY_REGIONS.find((r) => r.region_id === entry.region_id);
                                if (region) {
                                  setBmSelectedRegion(region);
                                  setBmEditingEntry(entry);
                                }
                              }}
                            >
                              <div className="flex justify-between items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">{entry.region_name}</span>
                                    <span className="text-[10px] text-muted-foreground capitalize border-l pl-2 leading-none">
                                      {entry.condition_type}
                                    </span>
                                  </div>
                                  {entry.measurements && (
                                    <p className="text-[10px] mt-0.5 italic text-slate-500 truncate">
                                      {entry.measurements}
                                    </p>
                                  )}
                                  {entry.assessed_by && (
                                    <p className="text-[10px] mt-0.5 text-slate-500 truncate">
                                      Assessed by: {entry.assessed_by}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const region = BODY_REGIONS.find((r) => r.region_id === entry.region_id);
                                    if (region) {
                                      setBmSelectedRegion(region);
                                      setBmEditingEntry(entry);
                                    }
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-xl">
                          <div className="p-3 bg-slate-100 rounded-full mb-3">
                            <Plus className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">No observations yet</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Click a region on the body map to add one
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          ) : activeView === "care-plans" ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin bg-muted/10">
              <div className="w-full bg-background rounded-xl border shadow-sm mb-8 overflow-visible">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg"><FileText className="w-5 h-5 text-primary" /></div>
                    <div>
                      <h2 className="text-lg font-bold leading-none">{selectedCarePlan?.care_plan_type || "New Wound Care Plan"}</h2>
                      {isCarePlanViewOnly && selectedCarePlan && <p className="text-xs text-muted-foreground mt-1">Updated on {new Date(selectedCarePlan.updated_at || selectedCarePlan.created_at).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCarePlanViewOnly ? (
                      <Button variant="outline" size="sm" onClick={() => { setIsCarePlanViewOnly(false); setIsCarePlanReviewMode(true); }} className="gap-2">
                        <Edit3 className="w-4 h-4" /> Edit
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={handleCloseCarePlan} disabled={isSavingCarePlan}>Cancel</Button>
                        <Button size="sm" onClick={handleExternalCarePlanSubmit} disabled={isSavingCarePlan} className="gap-2">
                          {isSavingCarePlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Submit
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={handleCloseCarePlan}><X className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="p-6 sm:p-10">
                  <div className="relative">
                    <CareFileDialogRenderer
                      formKey="care-plan-form"
                      residentId={residentId}
                      teamId={activeOrganizationId ?? ""}
                      organizationId={activeOrganizationId ?? ""}
                      userId={profile?.id ?? ""}
                      userName={profile?.name || profile?.email || "User"}
                      userRole={profile?.role ?? ""}
                      resident={resident}
                      formDataForEdit={selectedCarePlan}
                      isReviewMode={isCarePlanReviewMode}
                      onClose={handleCloseCarePlan}
                      isInline={true}
                      viewOnly={isCarePlanViewOnly}
                      refreshForms={fetchActiveCarePlans}
                      onSaveSuccess={handleCarePlanSuccess}
                      orgLogoUrl={orgLogoUrl}
                      woundFolderId={folderId}
                    />
                  </div>

                  {selectedCarePlan && (
                    <div className="mt-8 pt-8 border-t">
                      <CarePlanEvaluations
                        carePlanId={selectedCarePlan.id}
                        residentId={residentId}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Select an assessment, photograph, body map, or document from the right panel to view
              </p>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-0 p-0 border-l-0" : "w-[200px] p-3 border-l"} flex-shrink-0 bg-background h-full overflow-y-auto`}>
          <div className={`transition-opacity duration-300 ${isSidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"} flex flex-col gap-6`}>
            {/* Status section - Moved to top for visibility */}
            <div>
              <div className="flex items-center justify-between mb-1 px-1">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
                  Folder Status
                </p>
              </div>
              <div className="px-1">
                <WoundStatusForm
                  folderId={folderId}
                  currentStatus={folder?.status}
                  currentNextReviewDate={folder?.next_review_date}
                  onUpdated={fetchFolder}
                />
              </div>
            </div>

            <Separator className="bg-muted/50" />

            {/* Body Map section */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Body Map
                </p>
              </div>
              <button
                className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all cursor-pointer ${activeView === "body-map"
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-muted/60 text-foreground"
                  }`}
                onClick={handleBodyMapClick}
              >
                {hasBodyMapData && bodyMapEntryCount > 0 ? (
                  <CircleCheckIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <CircleDashedIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight mb-0.5 truncate">
                    Body Map
                  </p>
                  {hasBodyMapData && bodyMapEntryCount > 0 ? (
                    <p className="text-xs px-1 rounded-md text-emerald-500 bg-emerald-50">
                      {bodyMapEntryCount} {bodyMapEntryCount === 1 ? "observation" : "observations"}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Click to start
                    </p>
                  )}
                </div>
              </button>
            </div>

            <Separator className="bg-muted/50" />

            {/* Assessment section */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Assessment
                </p>
              </div>

              {/* Initial Wound Assessment */}
              <button
                className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all cursor-pointer mb-1 ${activeView === "initial-assessment"
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-muted/60 text-foreground"
                  }`}
                onClick={handleInitialAssessmentClick}
              >
                {initialWoundAssessments.length > 0 ? (
                  <CircleCheckIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <CircleDashedIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight mb-0.5 truncate">
                    Initial Assessment
                  </p>
                  {initialWoundAssessments.length > 0 ? (
                    <p className="text-xs px-1 rounded-md text-emerald-500 bg-emerald-50">
                      Completed
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Click to start
                    </p>
                  )}
                </div>
              </button>

              {/* Ongoing Wound Assessment */}
              <button
                className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all cursor-pointer mb-1 ${activeView === "assessment"
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-muted/60 text-foreground"
                  }`}
                onClick={handleAssessmentClick}
              >
                {woundAssessments.length > 0 ? (
                  <CircleCheckIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <CircleDashedIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight mb-0.5 truncate">
                    Ongoing Wound Assessment
                  </p>
                  {woundAssessments.length > 0 ? (
                    <p className="text-xs px-1 rounded-md text-emerald-500 bg-emerald-50">
                      {woundAssessments.length} {woundAssessments.length === 1 ? "assessment" : "assessments"}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Click to start
                    </p>
                  )}
                </div>
              </button>

              {/* Treatment Evaluation */}
              <button
                className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all cursor-pointer mb-1 ${activeView === "evaluation"
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-muted/60 text-foreground"
                  }`}
                onClick={handleEvaluationClick}
              >
                {treatmentEvaluations.length > 0 ? (
                  <CircleCheckIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <CircleDashedIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight mb-0.5 truncate">
                    Treatment Evaluation
                  </p>
                  {treatmentEvaluations.length > 0 ? (
                    <p className="text-xs px-1 rounded-md text-emerald-500 bg-emerald-50">
                      {treatmentEvaluations.length} {treatmentEvaluations.length === 1 ? "evaluation" : "evaluations"}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Click to start
                    </p>
                  )}
                </div>
              </button>

              {/* Photograph Evaluation */}
              <button
                className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all cursor-pointer ${activeView === "photograph"
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-muted/60 text-foreground"
                  }`}
                onClick={handlePhotographClick}
              >
                {photographEvaluations.length > 0 ? (
                  <CircleCheckIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <CircleDashedIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight mb-0.5 truncate">
                    Photograph Evaluation
                  </p>
                  {photographEvaluations.length > 0 ? (
                    <p className="text-xs px-1 rounded-md text-emerald-500 bg-emerald-50">
                      {photographEvaluations.length} {photographEvaluations.length === 1 ? "evaluation" : "evaluations"}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Click to start
                    </p>
                  )}
                </div>
              </button>
            </div>

            {/* Care Plans section */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Planning
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleCarePlanClick()}
                  title="New Care Plan"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-col gap-1">
                {activeCarePlans.length > 0 ? (
                  activeCarePlans.map((cp) => {
                    const isActive = activeView === "care-plans" && selectedCarePlan?.id === cp.id;
                    return (
                      <button
                        key={cp.id}
                        onClick={() => handleCarePlanClick(cp)}
                        className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all cursor-pointer ${isActive
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "hover:bg-muted/60 text-foreground"
                          }`}
                      >
                        <FileText className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isActive ? "text-primary" : "text-muted-foreground/70"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight mb-0.5 truncate">
                            {cp.care_plan_type || "Care Plan"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {new Date(cp.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <button
                    className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all cursor-pointer ${activeView === "care-plans" && !selectedCarePlan
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "hover:bg-muted/60 text-foreground"
                      }`}
                    onClick={() => handleCarePlanClick()}
                  >
                    <Plus className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight mb-0.5 truncate">
                        New Care Plan
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Documents section */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Documents
                </p>
                <UploadFileModal
                  folderName={`wound-${folderId}`}
                  residentId={residentId}
                  variant="icon"
                  onUploaded={fetchUploadedFiles}
                />
              </div>

              {filesLoading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              ) : uploadedFiles.length === 0 ? (
                <p className="text-[11px] text-muted-foreground px-1.5 py-1">
                  No documents uploaded
                </p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {uploadedFiles.map((file) => {
                    const isActive = activeFileId === file.id;
                    return (
                      <div
                        key={file.id}
                        className={`group flex items-start gap-1.5 px-1.5 py-2 rounded-md transition-colors ${isActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/60 text-foreground"
                          }`}
                      >
                        <button
                          onClick={() => handleFileClick(file.id)}
                          className="flex items-start gap-1.5 flex-1 min-w-0 text-left"
                        >
                          <Paperclip className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium leading-snug truncate">{file.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(file.file_size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => handleDeleteFile(file, e)}
                          className="flex-shrink-0 mt-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          title="Delete file"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </aside>
      </div>

      {/* Clear Body Map Confirmation */}
      <AlertDialog open={showClearBodyMapDialog} onOpenChange={setShowClearBodyMapDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Body Map?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all body map sessions and observations for this wound folder. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearBodyMap} className="bg-red-600">
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
