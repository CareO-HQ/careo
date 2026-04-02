
"use client";
import PRNProtocolForm from "@/components/medication/forms/PRNProtocolForm";
import BloodMonitoringChartForm from "@/components/medication/forms/BloodMonitoringChartForm";
import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, Loader2, Paperclip, Trash2, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type MedicationFormKey = "prn-protocol" | "bm-chart";

type ResidentData = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone_number?: string;
  room_number?: string;
  care_homes?: { name: string };
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

const SIDEBAR_SECTIONS: { title: string; forms: { key: MedicationFormKey; label: string }[] }[] = [
  {
    title: "Forms",
    forms: [
      { key: "bm-chart", label: "Blood Monitoring Chart (BM)" },
    ],
  },
];

// Flat list for breadcrumb lookup
const ALL_SIDEBAR_FORMS = SIDEBAR_SECTIONS.flatMap((s) => s.forms);

// ─── File Viewer ──────────────────────────────────────────────────────────────

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
        <p className="text-sm text-muted-foreground">Loading file…</p>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

type MedicationDocsPageProps = {
  params: Promise<{ id: string }>;
};

export default function MedicationDocsPage({ params }: MedicationDocsPageProps) {
  const { id: residentId } = React.use(params);
  const router = useRouter();
  const pathname = usePathname();

  const { profile } = useProfile();
  const { activeTeamId } = useActiveTeam();

  const [resident, setResident] = useState<ResidentData | null>(null);
  const [activeFormKey, setActiveFormKey] = useState<MedicationFormKey | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [prnProtocols, setPrnProtocols] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [protocolsLoading, setProtocolsLoading] = useState(false);

  const activeFile = uploadedFiles.find((f) => f.id === activeFileId) ?? null;

  // Lock body scroll — this page manages its own full-viewport layout
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!residentId) return;
    supabase
      .from("residents")
      .select("*, care_homes(name)")
      .eq("id", residentId)
      .single()
      .then(({ data, error }) => {
        if (!error) setResident(data as ResidentData);
      });
  }, [residentId]);

  const fetchUploadedFiles = useCallback(async () => {
    if (!residentId) return;
    setFilesLoading(true);
    const { data, error } = await supabase
      .from("files")
      .select("id, name, original_name, file_size, storage_path, file_type, created_at")
      .eq("resident_id", residentId)
      .eq("folder_name", "medication-docs")
      .order("created_at", { ascending: false });
    if (!error && data) setUploadedFiles(data as UploadedFile[]);
    setFilesLoading(false);
  }, [residentId]);

  const fetchPrnProtocols = useCallback(async () => {
    if (!residentId) return;
    setProtocolsLoading(true);
    const { data, error } = await supabase
      .from("prn_protocols")
      .select("*")
      .eq("resident_id", residentId)
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    if (!error && data) setPrnProtocols(data);
    setProtocolsLoading(false);
  }, [residentId]);

  useEffect(() => {
    fetchUploadedFiles();
    fetchPrnProtocols();
  }, [fetchUploadedFiles, fetchPrnProtocols]);

  const handleFormClick = (key: MedicationFormKey) => {
    setActiveFileId(null);
    setActiveFormKey((prev) => (prev === key ? null : key));
  };

  const handleProtocolClick = (id: string) => {
    setActiveFileId(null);
    setActiveFormKey(null);
    setActiveFormKey(id as any); // Use a synthetic key or just handle activeProtocolId
    // Better: 
    // setActiveFormKey(null);
    // setActiveFileId(null);
    // But then I need a way to track which protocol is active.
    // I'll repurpose activeFileId or just use activeFormKey as "prn-protocol-[id]"
  };

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
    setActiveFormKey(null);
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

  return (
    <div className="flex flex-col -mx-16 -mt-16 -mb-6 h-screen overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-background border-b flex-shrink-0">
        <button
          onClick={() => router.push(`/dashboard/residents/${residentId}/medication` as any)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Medication</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Documents</span>
          {activeFormKey && !activeFormKey.startsWith("prn-protocol") && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">
                {ALL_SIDEBAR_FORMS.find((f) => f.key === activeFormKey)?.label || activeFormKey}
              </span>
            </>
          )}
          {activeFormKey?.startsWith("prn-protocol-") && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">PRN Protocol</span>
            </>
          )}
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
          ) : activeFormKey === "prn-protocol" && resident ? (
            <PRNProtocolForm
              residentId={residentId}
              resident={resident}
              teamId={activeTeamId ?? ""}
              organizationId={profile?.active_organization_id ?? ""}
              userId={profile?.id ?? ""}
              userName={profile?.name || profile?.email || ""}
              isAddingNew={true}
              onSaved={() => {
                fetchPrnProtocols();
              }}
            />
          ) : activeFormKey?.startsWith("prn-protocol-") && resident ? (
             <PRNProtocolForm
              residentId={residentId}
              resident={resident}
              teamId={activeTeamId ?? ""}
              organizationId={profile?.active_organization_id ?? ""}
              userId={profile?.id ?? ""}
              userName={profile?.name || profile?.email || ""}
              selectedId={activeFormKey.replace("prn-protocol-", "")}
              onSaved={() => {
                fetchPrnProtocols();
              }}
            />
          ) : activeFormKey === "bm-chart" && resident ? (
            <BloodMonitoringChartForm
              residentId={residentId}
              resident={resident}
              teamId={activeTeamId ?? ""}
              organizationId={profile?.active_organization_id ?? ""}
              userId={profile?.id ?? ""}
              userName={profile?.name || profile?.email || ""}
            />
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
        <aside className="w-[220px] flex-shrink-0 border-l bg-background h-full p-3 overflow-y-auto">
          <div className="flex flex-col gap-5">
            
            {/* PRN Protocols Section */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1.5">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  PRN Protocols
                </p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5"
                  onClick={() => {
                    setActiveFileId(null);
                    setActiveFormKey("prn-protocol");
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {protocolsLoading ? (
                 <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              ) : prnProtocols.length === 0 ? (
                <div className="mx-1 px-3 py-6 border border-dashed rounded-lg flex flex-col items-center justify-center text-center bg-muted/5">
                  <p className="text-[10px] text-muted-foreground italic">No prn protocols yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                   {prnProtocols.map((protocol) => {
                    const protocolId = protocol.id;
                    const isActive = activeFormKey === `prn-protocol-${protocolId}`;
                    const data = protocol.assessment_data || {};
                    
                    return (
                      <button
                        key={protocolId}
                        onClick={() => {
                          setActiveFileId(null);
                          setActiveFormKey(`prn-protocol-${protocolId}` as any);
                        }}
                        className={`w-full text-left flex items-start gap-2.5 px-2 py-2 rounded-lg transition-all ${isActive
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "hover:bg-muted/60 text-foreground"
                        }`}
                      >
                        <FileText className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isActive ? "text-primary" : "text-blue-500"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight truncate">
                            {data.protocolLabel || data.nameOfMedication || "PRN Protocol"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {protocol.assessment_date ? format(new Date(protocol.assessment_date), "dd/MM/yyyy") : "No date"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Forms sections */}
            {SIDEBAR_SECTIONS.map(({ title, forms }) => (
              <div key={title}>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1.5">
                  {title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {forms.map(({ key, label }) => {
                    const isActive = activeFormKey === key;

                    return (
                      <button
                        key={key}
                        onClick={() => handleFormClick(key)}
                        className={`w-full text-left flex items-start gap-2.5 px-2 py-2 rounded-lg transition-all ${isActive
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "hover:bg-muted/60 text-foreground"
                        }`}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0 mt-0.5 text-orange-500" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight">{label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Documents section */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1.5">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Documents
                </p>
                <UploadFileModal
                  folderName="medication-docs"
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
                <div className="mx-1 px-3 py-6 border border-dashed rounded-lg flex flex-col items-center justify-center text-center bg-muted/5">
                  <p className="text-[10px] text-muted-foreground italic">No uploads found</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {uploadedFiles.map((file) => {
                    const isActive = activeFileId === file.id;
                    return (
                      <div
                        key={file.id}
                        className={`group flex items-start gap-1.5 px-1.5 py-1.5 rounded-lg transition-all ${isActive
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "hover:bg-muted/60 text-foreground"
                          }`}
                      >
                        <button
                          onClick={() => handleFileClick(file.id)}
                          className="flex items-start gap-2 flex-1 min-w-0 text-left"
                        >
                          <Paperclip className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-tight truncate">{file.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
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
    </div>
  );
}