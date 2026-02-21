"use client";

import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Download, FileText, Folder, Loader2, Paperclip, Trash2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { SimpleIncidentForm } from "./components/simple-incident-form";

// ─── Types ────────────────────────────────────────────────────────────────────

type ResidentData = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone_number?: string;
  room_number?: string;
};

type IncidentFolder = {
  id: string;
  resident_id: string;
  name: string;
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


type IncidentFormType =
  | "incident-report"
  | "body-map"
  | "restrictive-practice"
  | "app1"
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
    key: "body-map",
    label: "Body Map",
    description: "Visual body injury mapping",
  },
  {
    key: "restrictive-practice",
    label: "Restrictive Practice",
    description: "Restrictive practice documentation",
  },
  {
    key: "app1",
    label: "APP1",
    description: "Application form 1",
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

type IncidentFolderPageProps = {
  params: Promise<{ id: string; folderId: string }>;
};

export default function IncidentFolderPage({ params }: IncidentFolderPageProps) {
  const { id: residentId, folderId } = React.use(params);
  const router = useRouter();

  const { profile } = useProfile();

  const [resident, setResident] = useState<ResidentData | null>(null);
  const [folder, setFolder] = useState<IncidentFolder | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFormKey, setActiveFormKey] = useState<IncidentFormType | null>(null);
  const [addedForms, setAddedForms] = useState<IncidentFormType[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [isFormSelectionOpen, setIsFormSelectionOpen] = useState(false);

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
      .select("*")
      .eq("id", residentId)
      .single()
      .then(({ data, error }) => {
        if (!error) setResident(data as ResidentData);
      });
  }, [residentId]);

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
  }, [folderId]);

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
              <SimpleIncidentForm
                residentId={residentId}
                folderId={folderId}
                residentName={resident ? `${resident.first_name} ${resident.last_name}` : ""}
                onSaved={() => {
                  // Optional: refresh or show success
                }}
              />
            </div>
          ) : activeFormKey ? (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    <strong>Form Type:</strong> {FORM_OPTIONS.find((f) => f.key === activeFormKey)?.label}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {FORM_OPTIONS.find((f) => f.key === activeFormKey)?.description}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Form integration coming soon. Selected: {activeFormKey}
                </p>
              </div>
            </div>
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
                    return (
                      <div
                        key={formKey}
                        className={`group flex items-start gap-1.5 px-1.5 py-2 rounded-md transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/60 text-foreground"
                        }`}
                      >
                        <button
                          onClick={() => handleFormClick(formKey)}
                          className="flex items-start gap-1.5 flex-1 min-w-0 text-left"
                        >
                          <FileText className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium leading-snug truncate">
                              {formOption?.label}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => handleRemoveForm(formKey, e)}
                          className="flex-shrink-0 mt-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          title="Remove form"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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
            {FORM_OPTIONS.map((option, index) => {
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
    </div>
  );
}
