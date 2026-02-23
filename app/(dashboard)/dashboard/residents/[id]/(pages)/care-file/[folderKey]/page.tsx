"use client";

import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { useFolderForms } from "@/hooks/use-folder-forms";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { usePdfUrl } from "@/hooks/use-pdf-url";
import { canFillCareFileForms } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { CareFileFormKey } from "@/types/care-files";
import { config } from "@/config";
import { ArrowLeft, Download, FileText, Loader2, Paperclip, Trash2, Plus, X } from "lucide-react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
    Dialog,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import FormStatusIndicator, { FormStatusBadge } from "@/components/residents/carefile/FormStatusIndicator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Resident } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function GenericFolderPage() {
    const router = useRouter();
    const params = useParams();
    const folderKey = params.folderKey as string;
    const residentId = params.id as string;

    const { profile } = useProfile();
    const { activeTeamId } = useActiveTeam();
    const { getFormState, loading: formsLoading, refreshForms } = useCareFileForms({ residentId });
    const canFillForms = canFillCareFileForms(profile?.role);

    const folderConfig = config.careFiles.find((f) => f.key === folderKey);
    const folderForms = folderConfig?.forms ?? [];
    const folderFormKeys = (folderConfig?.forms || []).map(f => f.key as CareFileFormKey);
    const {
        latestCarePlanForm,
        archivedCarePlans,
        getAllPdfFiles,
        isLoading: folderFormsLoading,
        refetch: refetchFolderForms
    } = useFolderForms({
        residentId,
        folderFormKeys,
        organizationId: profile?.active_organization_id ?? undefined,
        folderKey,
        includeCarePlans: folderConfig?.carePlan
    });

    const [resident, setResident] = useState<Resident | null>(null);
    const [activeFormKey, setActiveFormKey] = useState<CareFileFormKey | null>(null);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [formDataForEdit, setFormDataForEdit] = useState<any>(undefined);
    const [isReviewMode, setIsReviewMode] = useState(false);

    // HELPER MAPPING for Deletes/Fetches
    const TABLE_MAP: Record<string, string> = {
        "preAdmission-form": "pre_admission_care_files",
        "infection-prevention": "infection_prevention_assessments",
        "blader-bowel-form": "bladder_bowel_assessments",
        "moving-handling-form": "moving_handling_assessments",
        "bedrail-consent-form": "bedrail_consents",
        "bed-rails-risk-assessment-form": "bedrails_risk_assessments",
        "long-term-fall-risk-form": "long_term_falls_risk_assessments",
        "admission-form": "admission_assessments",
        "photography-consent": "photography_consents",
        "dnacpr": "dnacprs",
        "peep": "peeps",
        "dependency-assessment": "dependency_assessments",
        "timl": "timl_assessments",
        "skin-integrity-form": "skin_integrity_assessments",
        "resident-valuables-form": "resident_valuables_assessments",
        "resident-handling-profile-form": "handling_profiles",
        "pain-assessment-form": "pain_assessments",
        "nutritional-assessment-form": "nutritional_assessments",
        "oral-assessment-form": "oral_assessments",
        "diet-notification-form": "diet_notifications",
        "choking-risk-assessment-form": "choking_risk_assessments",
        "cornell-depression-scale-form": "cornell_depression_scales",
        "best-interest-decision-form": "best_interest_decisions",
        "care-plan-form": "care_plan_assessments"
    };

    const activeFile = uploadedFiles.find((f) => f.id === activeFileId);
    const { pdfUrl, loading: pdfLoading } = usePdfUrl({
        formKey: (activeFormKey as CareFileFormKey) ?? "admission-form",
        formId: activeFileId || "",
        organizationId: profile?.active_organization_id ?? undefined
    });

    // Lock body scroll
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
                if (!error) setResident(data as Resident);
            });
    }, [residentId]);

    const fetchUploadedFiles = useCallback(async () => {
        if (!residentId) return;
        setFilesLoading(true);
        const { data, error } = await supabase
            .from("files")
            .select("id, name, original_name, file_size, storage_path, file_type, created_at")
            .eq("resident_id", residentId)
            .eq("folder_name", folderConfig?.value || folderKey)
            .order("created_at", { ascending: false });
        if (!error && data) setUploadedFiles(data as UploadedFile[]);
        setFilesLoading(false);
    }, [residentId, folderConfig, folderKey]);

    useEffect(() => {
        fetchUploadedFiles();
    }, [fetchUploadedFiles]);

    const handleFormClick = async (key: CareFileFormKey) => {
        if (!canFillForms) return;
        setActiveFileId(null);

        if (activeFormKey === key) {
            setActiveFormKey(null);
            setFormDataForEdit(undefined);
            setIsReviewMode(false);
            return;
        }

        setActiveFormKey(key);

        // Check if there is existing data for this form
        const formState = getFormState(key);
        if (formState.hasData) {
            setIsReviewMode(true);
            setFormDataForEdit(undefined); // Show loading

            const table = TABLE_MAP[key];
            if (table) {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .eq('resident_id', residentId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!error && data) {
                    setFormDataForEdit(data);
                } else {
                    setFormDataForEdit(null);
                }
            }
        } else {
            setIsReviewMode(false);
            setFormDataForEdit(null);
        }
    };

    const handleFileClick = async (fileId: string) => {
        setActiveFormKey(null);
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

    const handleCloseFile = () => {
        setActiveFileId(null);
    };

    const handleCloseForm = () => {
        setActiveFormKey(null);
        setFormDataForEdit(undefined);
        setIsReviewMode(false);
        refreshForms();
        refetchFolderForms();
    };

    const handleDeleteFile = async (file: UploadedFile, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;

        await supabase.storage.from("resident-files").remove([file.storage_path]);
        await supabase.from("files").delete().eq("id", file.id);

        if (activeFileId === file.id) setActiveFileId(null);
        fetchUploadedFiles();
    };

    if (!folderConfig) {
        return (
            <div className="flex items-center justify-center h-screen group">
                <div className="text-center">
                    <p className="text-lg font-semibold">Folder not found</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col -mx-16 -mt-16 -mb-6 h-screen overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center gap-3 px-6 py-3 bg-background border-b flex-shrink-0">
                <button
                    onClick={() => router.push(`/dashboard/residents/${residentId}/care-file` as any)}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Care File</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-medium">{folderConfig.value}</span>
                    {activeFormKey && (
                        <>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-muted-foreground">
                                {folderForms.find((f) => f.key === activeFormKey)?.value || "Form"}
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
                {/* Main content */}
                <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-muted/10">
                    {activeFile ? (
                        <FileViewer file={activeFile} />
                    ) : activeFormKey && resident ? (
                        <div className="flex-1 overflow-auto p-4 sm:p-8 scrollbar-thin flex flex-col items-center">
                            <div className="w-full max-w-4xl bg-background rounded-xl border shadow-sm p-6 sm:p-10 mb-8">
                                <Dialog open={true} modal={false}>
                                    {/* We use the primitive Content here to satisfy the Dialog context requirement for DialogTitle/Description without triggering modal behavior */}
                                    <DialogPrimitive.Content asChild>
                                        <div className="relative">
                                            <CareFileDialogRenderer
                                                formKey={activeFormKey}
                                                residentId={residentId}
                                                teamId={activeTeamId ?? ""}
                                                organizationId={profile?.active_organization_id ?? ""}
                                                userId={profile?.id ?? ""}
                                                userName={profile?.name || profile?.email || "User"}
                                                userRole={profile?.role ?? ""}
                                                resident={resident}
                                                careHomeName={profile?.care_home_name ?? ""}
                                                folderKey={folderKey}
                                                formDataForEdit={formDataForEdit}
                                                isReviewMode={isReviewMode}
                                                onClose={handleCloseForm}
                                            />
                                        </div>
                                    </DialogPrimitive.Content>
                                </Dialog>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8 text-muted-foreground">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
                                <FileText className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground">Select an item</h3>
                            <p className="max-w-xs">
                                Pick a form, care plan or document from the right panel to view its details.
                            </p>
                        </div>
                    )}
                </main>

                {/* Right Sidebar */}
                <aside className="w-[200px] flex-shrink-0 border-l bg-background h-full p-3 overflow-y-auto">
                    <div className="flex flex-col gap-6">
                        {/* Forms section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                    Forms
                                </p>
                            </div>
                            {folderForms.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground px-2 italic">
                                    No forms configured
                                </p>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {folderForms.map((form) => {
                                        const isActive = activeFormKey === form.key;
                                        const formState = formsLoading
                                            ? { status: "not-started" as const, hasData: false, isAudited: false }
                                            : getFormState(form.key as CareFileFormKey);

                                        return (
                                            <button
                                                key={form.key}
                                                onClick={() => handleFormClick(form.key as CareFileFormKey)}
                                                disabled={!canFillForms}
                                                className={`flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${isActive
                                                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                                    : "hover:bg-muted/60 text-foreground"
                                                    }`}
                                            >
                                                <FormStatusIndicator
                                                    status={formState.status}
                                                    className="h-4 w-4 flex-shrink-0 mt-0.5"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold leading-tight mb-0.5">
                                                        {form.value}
                                                    </p>
                                                    <FormStatusBadge
                                                        status={formState.status}
                                                        isAudited={formState.isAudited}
                                                    />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Care Plan section (if applicable) */}
                        {folderConfig.carePlan && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                        Care Plan
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 hover:bg-muted"
                                        onClick={() => handleFormClick("care-plan-form" as CareFileFormKey)}
                                        title="Add Care Plan"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                                {folderFormsLoading ? (
                                    <div className="flex justify-center p-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                                ) : latestCarePlanForm ? (
                                    <button
                                        onClick={() => handleFormClick("care-plan-form" as CareFileFormKey)}
                                        className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${activeFormKey === "care-plan-form"
                                            ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                            : "hover:bg-muted/60 text-foreground"
                                            }`}
                                    >
                                        <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold leading-tight truncate">
                                                {latestCarePlanForm.care_plan_type || "Care Plan"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Last updated: {new Date(latestCarePlanForm._creationTime).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="px-2 py-3 border border-dashed rounded-lg bg-muted/30 text-center">
                                        <p className="text-[10px] text-muted-foreground italic">No care plans yet</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Documents section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                    Documents
                                </p>
                                <UploadFileModal
                                    folderName={folderConfig.value || folderKey}
                                    residentId={residentId}
                                    variant="icon"
                                    onUploaded={fetchUploadedFiles}
                                />
                            </div>

                            {filesLoading ? (
                                <div className="flex items-center justify-center p-3">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                            ) : uploadedFiles.length === 0 ? (
                                <div className="px-2 py-3 border border-dashed rounded-lg bg-muted/30 text-center">
                                    <p className="text-[10px] text-muted-foreground italic">No uploads found</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {uploadedFiles.map((file) => {
                                        const isActive = activeFileId === file.id;
                                        return (
                                            <div
                                                key={file.id}
                                                className={`group flex items-start gap-2.5 px-2 py-2 rounded-lg transition-all ${isActive
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
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {(file.file_size / 1024).toFixed(0)} KB
                                                        </p>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteFile(file, e)}
                                                    className="flex-shrink-0 mt-0.5 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                    title="Delete file"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
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
