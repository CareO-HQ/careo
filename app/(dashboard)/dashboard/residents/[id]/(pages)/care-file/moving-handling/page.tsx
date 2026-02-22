"use client";

import AdmissionAssessmentForm from "@/components/residents/carefile/page-forms/AdmissionAssessmentForm";
import MovingHandlingCarePlanEvaluationForm from "@/components/residents/carefile/page-forms/MovingHandlingCarePlanEvaluationForm";
import MovingHandlingCarePlanForm from "@/components/residents/carefile/page-forms/MovingHandlingCarePlanForm";
import MobilityFallCarePlanForm from "@/components/residents/carefile/page-forms/MobilityFallCarePlanForm";
import PhotographyConsentForm from "@/components/residents/carefile/page-forms/PhotographyConsentForm";
import FormStatusIndicator, { FormStatusBadge } from "@/components/residents/carefile/FormStatusIndicator";
import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { canFillCareFileForms } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { CareFileFormKey } from "@/types/care-files";
import { ArrowLeft, Download, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ResidentData = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone_number?: string;
  room_number?: string;
  nhs_health_number?: string;
  gp_name?: string;
  gp_phone?: string;
  care_manager_name?: string;
  care_manager_phone?: string;
  emergency_contacts?: Array<{
    id: string;
    name: string;
    relationship?: string;
    phone_number?: string;
    is_primary?: boolean;
  }>;
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

const SIDEBAR_SECTIONS: { title: string; forms: { key: CareFileFormKey; label: string }[] }[] = [
  {
    title: "Forms",
    forms: [
      { key: "admission-form", label: "Admission Assessment Form" },
      { key: "photography-consent", label: "Photography Consent Form" },
    ],
  },
  {
    title: "Care Plan",
    forms: [
      { key: "moving-handling-care-plan", label: "Moving and Handling Care Plan" },
      { key: "moving-handling-care-plan-evaluation", label: "Care Plan Evaluation" },
      { key: "care-plan-form", label: "Mobility & Fall Care Plan" },
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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

export default function MovingHandlingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const pathParts = pathname.split("/");
  const residentId = pathParts[pathParts.indexOf("residents") + 1];

  const { profile } = useProfile();
  const { activeTeamId } = useActiveTeam();
  const { getFormState, loading, refreshForms } = useCareFileForms({ residentId });
  const canFillForms = canFillCareFileForms(profile?.role);

  const [resident, setResident] = useState<ResidentData | null>(null);
  const [activeFormKey, setActiveFormKey] = useState<CareFileFormKey | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

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
      .select("*, emergency_contacts(*)")
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
      .eq("folder_name", "moving-handling")
      .order("created_at", { ascending: false });
    if (!error && data) setUploadedFiles(data as UploadedFile[]);
    setFilesLoading(false);
  }, [residentId]);

  useEffect(() => {
    fetchUploadedFiles();
  }, [fetchUploadedFiles]);

  const handleFormClick = (key: CareFileFormKey) => {
    if (!canFillForms) return;
    setActiveFileId(null);
    setActiveFormKey((prev) => (prev === key ? null : key));
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={() => router.push(`/dashboard/residents/${residentId}/care-file` as any)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Care File</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Moving and Handling</span>
          {activeFormKey && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">
                {ALL_SIDEBAR_FORMS.find((f) => f.key === activeFormKey)?.label}
              </span>
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
          ) : activeFormKey === "admission-form" && resident ? (
            <AdmissionAssessmentForm
              residentId={residentId}
              resident={resident}
              teamId={activeTeamId ?? ""}
              organizationId={profile?.active_organization_id ?? ""}
              userId={profile?.id ?? ""}
              userName={profile?.name || profile?.email || ""}
              onSaved={() => { refreshForms(); }}
            />
          ) : activeFormKey === "photography-consent" && resident ? (
            <PhotographyConsentForm
              residentId={residentId}
              resident={resident}
              teamId={activeTeamId ?? ""}
              organizationId={profile?.active_organization_id ?? ""}
              userId={profile?.id ?? ""}
              userName={profile?.name || profile?.email || ""}
              onSaved={() => { refreshForms(); }}
            />
          ) : activeFormKey === "moving-handling-care-plan" && resident ? (
            <MovingHandlingCarePlanForm
              residentId={residentId}
              resident={resident}
              teamId={activeTeamId ?? ""}
              organizationId={profile?.active_organization_id ?? ""}
              userId={profile?.id ?? ""}
              userName={profile?.name || profile?.email || ""}
              onSaved={() => { refreshForms(); }}
            />
          ) : activeFormKey === "moving-handling-care-plan-evaluation" && resident ? (
            <MovingHandlingCarePlanEvaluationForm
              residentId={residentId}
              resident={resident}
              teamId={activeTeamId ?? ""}
              organizationId={profile?.active_organization_id ?? ""}
              userId={profile?.id ?? ""}
              userName={profile?.name || profile?.email || ""}
              onSaved={() => { refreshForms(); }}
            />
          ) : activeFormKey === "care-plan-form" && resident ? (
            <MobilityFallCarePlanForm
              residentId={residentId}
              resident={resident}
              teamId={activeTeamId ?? ""}
              organizationId={profile?.active_organization_id ?? ""}
              userId={profile?.id ?? ""}
              userName={profile?.name || profile?.email || ""}
              onSaved={() => { refreshForms(); }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {activeFormKey
                  ? "This form is not yet available."
                  : "Select a form from the right panel to begin"}
              </p>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="w-[200px] flex-shrink-0 border-l bg-background h-full p-3 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {SIDEBAR_SECTIONS.map(({ title, forms }) => (
              <div key={title}>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-1.5">
                  {title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {forms.map(({ key, label }) => {
                    const formState = loading
                      ? { status: "not-started" as const, hasData: false, isAudited: false }
                      : getFormState(key);
                    const isActive = activeFormKey === key;

                    return (
                      <button
                        key={key}
                        onClick={() => handleFormClick(key)}
                        disabled={!canFillForms}
                        className={`w-full text-left flex items-start gap-2 px-1.5 py-2 rounded-md transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : canFillForms
                            ? "hover:bg-muted/60 text-foreground"
                            : "opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <FormStatusIndicator
                          status={formState.status}
                          className="h-4 w-4 flex-shrink-0 mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-snug">{label}</p>
                          <FormStatusBadge
                            status={formState.status}
                            isAudited={formState.isAudited}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Documents section */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Documents
                </p>
                <UploadFileModal
                  folderName="moving-handling"
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
                        className={`group flex items-start gap-1.5 px-1.5 py-2 rounded-md transition-colors ${
                          isActive
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
    </div>
  );
}
