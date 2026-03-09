"use client";

import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Download, FileText, Folder, Loader2, Paperclip, Trash2, Plus, X, Map as MapIcon, Edit, CircleCheckIcon, CircleDashedIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimpleIncidentForm } from "./components/simple-incident-form";
import { IncidentReportViewer } from "./components/incident-report-viewer";
import { BHSCTReportForm } from "./components/bhsct-report-form";
import { SEHSCTReportForm } from "./components/sehsct-report-form";
import { NHSReportForm } from "./components/nhs-report-form";
import { TrustReportForm } from "./components/trust-report-form";
import { RestrictivePracticeForm } from "./components/restrictive-practice-form";
import { TrustReportViewer } from "./components/trust-report-viewer";
import { InteractiveBodyMap } from "@/components/body-map/InteractiveBodyMap";
import { BodyMapEntryForm } from "@/components/body-map/BodyMapEntryForm";
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
  phone_number?: string;
  room_number?: string;
  nhs_health_number?: string;
  care_manager_name?: string;
  care_manager_address?: string;
  care_manager_phone?: string;
  gender?: string;
  gp_name?: string;
  gp_address?: string;
  gp_phone?: string;
};

type IncidentFolder = {
  id: string;
  resident_id: string;
  name: string;
  body_map_data: BodyMapData | null;
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


type SavedReport = {
  id: string;
  trust_name: string;
  report_type: string;
  report_data: Record<string, unknown>;
  created_at: string;
};

type IncidentFormType =
  | "incident-report"
  | "body-map"
  | "restrictive-practice"
  | "bhsct"
  | "sehsct"
  | "nhs"
  | "whsct"
  | "shsct"
  | "nhsct";

type FormOption = {
  key: IncidentFormType;
  label: string;
  description: string;
};

const FORM_OPTIONS: FormOption[] = [
  {
    key: "incident-report",
    label: "Incident Report",
    description: "General incident report form",
  },
  {
    key: "restrictive-practice",
    label: "Restrictive Practice",
    description: "Restrictive practice documentation",
  },
  {
    key: "bhsct",
    label: "BHSCT",
    description: "Belfast Health and Social Care Trust",
  },
  {
    key: "sehsct",
    label: "SEHSCT",
    description: "South Eastern Health and Social Care Trust",
  },
  {
    key: "nhs",
    label: "NHS",
    description: "Generic NHS Trust Report",
  },
  {
    key: "whsct",
    label: "WHSCT",
    description: "Western Health and Social Care Trust",
  },
  {
    key: "shsct",
    label: "SHSCT",
    description: "Southern Health and Social Care Trust",
  },
  {
    key: "nhsct",
    label: "NHSCT",
    description: "Northern Health and Social Care Trust",
  },
];

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

type IncidentFolderPageProps = {
  params: Promise<{ id: string; folderId: string }>;
};

export default function IncidentFolderPage({ params }: IncidentFolderPageProps) {
  const { id: residentId, folderId } = React.use(params);
  const router = useRouter();

  const { profile } = useProfile();
  const { activeOrganizationId } = useActiveTeam();
  const { supabase: supabaseClient } = useSupabase();

  const [resident, setResident] = useState<ResidentData | null>(null);
  const [folder, setFolder] = useState<IncidentFolder | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFormKey, setActiveFormKey] = useState<IncidentFormType | null>(null);
  const [addedForms, setAddedForms] = useState<IncidentFormType[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [isFormSelectionOpen, setIsFormSelectionOpen] = useState(false);

  // Track whether incident report has been saved for this folder
  const [hasIncidentReport, setHasIncidentReport] = useState(false);

  // Track saved trust/form reports from DB
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Body Map states — inline, single body map per folder
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

  // Helper: get saved report for a given form type
  const getSavedReport = (formKey: IncidentFormType): SavedReport | undefined =>
    savedReports.find((r) => r.report_type === formKey);
  const isFormCompleted = (formKey: IncidentFormType): boolean =>
    formKey === "incident-report" ? hasIncidentReport : !!getSavedReport(formKey);

  // Current body map session
  const bmCurrentSession = bodyMapData.sessions.find((s) => s.id === bmSessionId) ?? null;
  const bodyMapEntryCount = bodyMapData.sessions.reduce(
    (sum, s) => sum + (s.entries?.length || 0),
    0
  );
  const hasBodyMapData = bodyMapData.sessions.length > 0;

  // Auto-show incident-report in sidebar when one already exists for this folder
  useEffect(() => {
    if (hasIncidentReport && !addedForms.includes("incident-report")) {
      setAddedForms((prev) =>
        prev.includes("incident-report") ? prev : ["incident-report", ...prev]
      );
    }
  }, [hasIncidentReport, addedForms]);

  // Lock body scroll — this page manages its own full-viewport layout
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
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
      // Auto-select first session
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
        .from("incident_folders")
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
      label: "Body Map",
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
    if (activeFormKey === "body-map") {
      handleEnsureSession();
    }
  }, [activeFormKey, handleEnsureSession]);

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
        incidentType: "Incident Body Map Documentation",
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
        .from("incident_folders")
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
  }, [residentId]);

  // Fetch saved trust reports from DB for this folder
  const fetchSavedReports = useCallback(async () => {
    if (!folderId) return;
    const { data, error } = await supabase
      .from("trust_incident_reports")
      .select("id, trust_name, report_type, report_data, created_at")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setSavedReports(data as SavedReport[]);
      // Auto-add completed form types to the sidebar
      const reportTypes = data.map((r: SavedReport) => r.report_type as IncidentFormType);
      setAddedForms((prev) => {
        const merged = [...prev];
        for (const rt of reportTypes) {
          if (!merged.includes(rt)) merged.push(rt);
        }
        return merged;
      });
    }
  }, [folderId]);

  useEffect(() => {
    if (!folderId) return;
    supabase
      .from("incident_folders")
      .select("*")
      .eq("id", folderId)
      .single()
      .then(({ data, error }) => {
        if (!error) setFolder(data as IncidentFolder);
      });

    // Check if an incident report already exists for this folder
    supabase
      .from("incidents")
      .select("id")
      .eq("folder_id", folderId)
      .maybeSingle()
      .then(({ data }) => {
        setHasIncidentReport(!!data);
      });

    // Fetch saved trust reports
    fetchSavedReports();
  }, [folderId, fetchSavedReports]);

  const fetchUploadedFiles = useCallback(async () => {
    if (!residentId || !folderId) return;
    setFilesLoading(true);
    const { data, error } = await supabase
      .from("files")
      .select("id, name, original_name, file_size, storage_path, file_type, created_at")
      .eq("resident_id", residentId)
      .eq("folder_name", `incident-${folderId}`)
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

    // Remove from storage
    await supabase.storage.from("resident-files").remove([file.storage_path]);

    // Remove from DB
    await supabase.from("files").delete().eq("id", file.id);

    // Clear viewer if this file was active
    if (activeFileId === file.id) setActiveFileId(null);

    // Refresh list
    fetchUploadedFiles();
  };

  const handleFileClick = async (fileId: string) => {
    setActiveFormKey(null); // Clear any active form
    if (activeFileId === fileId) {
      setActiveFileId(null);
      return;
    }
    setActiveFileId(fileId);
    // Generate a signed URL (1 hour) for the private bucket
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

  const handleFormSelect = (formKey: IncidentFormType) => {
    // Add to list if not already added
    if (!addedForms.includes(formKey)) {
      setAddedForms([...addedForms, formKey]);
    }
    // Set as active form
    setActiveFileId(null); // Clear any active file
    setActiveFormKey(formKey);
    setIsFormSelectionOpen(false);
  };

  const handleFormClick = (formKey: IncidentFormType) => {
    setActiveFileId(null); // Clear any active file
    setActiveFormKey(formKey);
  };

  const handleRemoveForm = (formKey: IncidentFormType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remove this form? Any unsaved data will be lost.")) return;

    // Remove from added forms list
    setAddedForms(addedForms.filter((f) => f !== formKey));

    // If this was the active form, clear it
    if (activeFormKey === formKey) {
      setActiveFormKey(null);
    }
  };

  return (
    <div className="flex flex-col -mx-16 -mt-16 -mb-6 h-screen overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-background border-b flex-shrink-0">
        <button
          onClick={() => router.push(`/dashboard/residents/${residentId}/incidents`)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Incidents</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium flex items-center gap-1.5">
            <Folder className="w-4 h-4" />
            {folder?.name || "Loading..."}
          </span>
          {activeFile && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{activeFile.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Center content */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {activeFile ? (
            <FileViewer file={activeFile} />
          ) : activeFormKey === "incident-report" ? (
            <div className="flex-1 overflow-auto">
              {hasIncidentReport ? (
                <IncidentReportViewer folderId={folderId} orgLogoUrl={orgLogoUrl} />
              ) : (
                <SimpleIncidentForm
                  residentId={residentId}
                  folderId={folderId}
                  residentName={resident ? `${resident.first_name} ${resident.last_name}` : ""}
                  onSaved={() => {
                    setHasIncidentReport(true);
                  }}
                />
              )}
            </div>
          ) : activeFormKey === "body-map" ? (
            <div className="flex-1 flex flex-row overflow-hidden">
              {/* Left: Interactive Body Map */}
              <div className="flex-[3] px-4 pt-2 pb-3 overflow-auto bg-white border-r flex flex-col">
                {/* Toolbar — compact, near top */}
                <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold">Body Map</span>
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

                {/* Body Map */}
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
          ) : activeFormKey === "bhsct" ? (
            getSavedReport("bhsct") ? (
              <BHSCTReportForm
                folderId={folderId}
                residentId={residentId}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
                residentGender={resident?.gender}
                careManagerName={resident?.care_manager_name}
                providerName={profile?.care_home_name || profile?.organization_name || ""}
                reporterName={profile?.name || ""}
                reporterRole={profile?.role || ""}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                savedReport={{ ...getSavedReport("bhsct")!.report_data, id: getSavedReport("bhsct")!.id }}
                onSaved={() => { fetchSavedReports(); }}
              />
            ) : (
              <BHSCTReportForm
                folderId={folderId}
                residentId={residentId}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
                residentGender={resident?.gender}
                careManagerName={resident?.care_manager_name}
                providerName={profile?.care_home_name || profile?.organization_name || ""}
                reporterName={profile?.name || ""}
                reporterRole={profile?.role || ""}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                onSaved={() => { fetchSavedReports(); }}
              />
            )
          ) : activeFormKey === "sehsct" ? (
            getSavedReport("sehsct") ? (
              <TrustReportViewer
                report={getSavedReport("sehsct")!}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
              />
            ) : (
              <SEHSCTReportForm
                folderId={folderId}
                residentId={residentId}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
                residentGender={resident?.gender}
                nhsNumber={resident?.nhs_health_number}
                careManagerName={resident?.care_manager_name}
                providerName={profile?.care_home_name || profile?.organization_name || ""}
                reporterName={profile?.name || ""}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                onSaved={() => { fetchSavedReports(); }}
              />
            )
          ) : activeFormKey === "nhs" ? (
            getSavedReport("nhs") ? (
              <TrustReportViewer
                report={getSavedReport("nhs")!}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
              />
            ) : (
              <NHSReportForm
                folderId={folderId}
                residentId={residentId}
                residentName={fullName}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                onSaved={() => { fetchSavedReports(); }}
              />
            )
          ) : activeFormKey === "whsct" ? (
            getSavedReport("whsct") ? (
              <TrustReportViewer
                report={getSavedReport("whsct")!}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
              />
            ) : (
              <TrustReportForm
                folderId={folderId}
                residentId={residentId}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
                residentGender={resident?.gender}
                careManagerName={resident?.care_manager_name}
                providerName={profile?.care_home_name || profile?.organization_name || ""}
                reporterName={profile?.name || ""}
                reporterRole={profile?.role || ""}
                trustName="WHSCT"
                trustCode="whsct"
                trustDescription="Western Health and Social Care Trust"
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                onSaved={() => { fetchSavedReports(); }}
              />
            )
          ) : activeFormKey === "shsct" ? (
            getSavedReport("shsct") ? (
              <TrustReportViewer
                report={getSavedReport("shsct")!}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
              />
            ) : (
              <TrustReportForm
                folderId={folderId}
                residentId={residentId}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
                residentGender={resident?.gender}
                careManagerName={resident?.care_manager_name}
                providerName={profile?.care_home_name || profile?.organization_name || ""}
                reporterName={profile?.name || ""}
                reporterRole={profile?.role || ""}
                trustName="SHSCT"
                trustCode="shsct"
                trustDescription="Southern Health and Social Care Trust"
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                onSaved={() => { fetchSavedReports(); }}
              />
            )
          ) : activeFormKey === "nhsct" ? (
            getSavedReport("nhsct") ? (
              <TrustReportViewer
                report={getSavedReport("nhsct")!}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
              />
            ) : (
              <TrustReportForm
                folderId={folderId}
                residentId={residentId}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
                residentGender={resident?.gender}
                careManagerName={resident?.care_manager_name}
                providerName={profile?.care_home_name || profile?.organization_name || ""}
                reporterName={profile?.name || ""}
                reporterRole={profile?.role || ""}
                trustName="NHSCT"
                trustCode="nhsct"
                trustDescription="Northern Health and Social Care Trust"
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                onSaved={() => { fetchSavedReports(); }}
              />
            )
          ) : activeFormKey === "restrictive-practice" ? (
            getSavedReport("restrictive-practice") ? (
              <TrustReportViewer
                report={getSavedReport("restrictive-practice")!}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
              />
            ) : (
              <RestrictivePracticeForm
                folderId={folderId}
                residentId={residentId}
                residentName={fullName}
                residentDOB={resident?.date_of_birth}
                careManagerName={resident?.care_manager_name}
                completedByName={profile?.name || ""}
                completedByRole={profile?.role || ""}
                orgLogoUrl={orgLogoUrl}
                careHomeName={profile?.care_home_name || profile?.organization_name || ""}
                onSaved={() => { fetchSavedReports(); }}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Select a form or document from the right panel to view
              </p>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="w-[200px] flex-shrink-0 border-l bg-background h-full p-3 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {/* Forms section */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Forms
                </p>
                <button
                  onClick={() => setIsFormSelectionOpen(true)}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  title="Add form"
                >
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              {addedForms.length === 0 ? (
                <p className="text-[11px] text-muted-foreground px-1.5 py-1">
                  No forms added
                </p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {addedForms.map((formKey) => {
                    const isActive = activeFormKey === formKey;
                    const formOption = FORM_OPTIONS.find((f) => f.key === formKey);
                    const completed = isFormCompleted(formKey);
                    return (
                      <div
                        key={formKey}
                        className={`group flex items-start gap-2.5 px-2 py-2 rounded-lg transition-all ${isActive
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "hover:bg-muted/60 text-foreground"
                          }`}
                      >
                        <button
                          onClick={() => handleFormClick(formKey)}
                          className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
                        >
                          {completed ? (
                            <CircleCheckIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                          ) : (
                            <CircleDashedIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-tight mb-0.5 truncate">
                              {formOption?.label}
                            </p>
                            {completed && (
                              <p className="text-xs px-1 rounded-md text-emerald-500 bg-emerald-50">
                                Completed
                              </p>
                            )}
                          </div>
                        </button>
                        {/* Don't allow removing a completed form */}
                        {!completed && (
                          <button
                            onClick={(e) => handleRemoveForm(formKey, e)}
                            className="flex-shrink-0 mt-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            title="Remove form"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Body Map section */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Body Map
                </p>
              </div>
              <button
                className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all cursor-pointer ${activeFormKey === "body-map"
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-muted/60 text-foreground"
                  }`}
                onClick={() => {
                  setActiveFileId(null);
                  setActiveFormKey("body-map");
                }}
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

            {/* Documents section */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Documents
                </p>
                <UploadFileModal
                  folderName={`incident-${folderId}`}
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

      {/* Form Selection Dialog */}
      <Dialog open={isFormSelectionOpen} onOpenChange={setIsFormSelectionOpen}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Select Form Type</DialogTitle>
            <DialogDescription className="text-[10px]">
              Choose incident report type
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-1.5 max-h-[45vh] overflow-y-auto pr-1">
            {FORM_OPTIONS.filter(
              // Don't show forms that are already completed
              (option) => !isFormCompleted(option.key)
            ).map((option, index) => {
              const colors = [
                "bg-blue-100 text-blue-600",
                "bg-green-100 text-green-600",
                "bg-gray-100 text-gray-600",
                "bg-purple-100 text-purple-600",
                "bg-orange-100 text-orange-600",
                "bg-blue-100 text-blue-600",
                "bg-green-100 text-green-600",
                "bg-purple-100 text-purple-600",
                "bg-orange-100 text-orange-600",
                "bg-gray-100 text-gray-600",
              ];
              return (
                <Card
                  key={option.key}
                  className="cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors border bg-white"
                  onClick={() => handleFormSelect(option.key)}
                >
                  <CardContent className="p-2.5">
                    <div className="flex items-start gap-2">
                      <div className={`p-1.5 rounded-md ${colors[index]}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs">{option.label}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Body Map Confirmation */}
      <AlertDialog open={showClearBodyMapDialog} onOpenChange={setShowClearBodyMapDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Body Map?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all body map sessions and observations for this incident folder. This action cannot be undone.
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
