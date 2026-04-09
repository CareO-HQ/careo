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
import { ArrowLeft, Download, FileText, Loader2, Paperclip, Trash2, Plus, X, ExternalLink, PanelRight, PanelRightClose } from "lucide-react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import FormStatusIndicator, { FormStatusBadge } from "@/components/residents/carefile/FormStatusIndicator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Resident } from "@/types";
import { RiskAssessmentViewer } from "@/components/residents/carefile/folders/RiskAssessmentViewDialog";
import { CarePlanEvaluations } from "@/components/residents/carefile/CarePlanEvaluations";
import { CarePlanViewer } from "@/components/residents/carefile/folders/CarePlanViewer";
import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";
import { Printer, Edit3, CheckCircle2 } from "lucide-react";

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
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
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

    console.log("Folder Page Debug - folderKey:", folderKey);
    console.log("Available keys:", config.careFiles.map(f => f.key));

    const folderConfig = config.careFiles.find((f) => {
        const target = f.key.toLowerCase().trim().replace(/ /g, "-");
        const current = folderKey.toLowerCase().trim().replace(/ /g, "-").replace(/%20/g, "-");
        return target === current || f.key === folderKey;
    });
    const folderForms = folderConfig?.forms ?? [];
    const folderFormKeys = (folderConfig?.forms || []).map(f => f.key as CareFileFormKey);
    const {
        activeCarePlanForms = [],
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
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCarePlanSelectionOpen, setIsCarePlanSelectionOpen] = useState(false);
    const [addedCarePlans, setAddedCarePlans] = useState<CareFileFormKey[]>([]);
    const [activeOrganization, setActiveOrganization] = useState<any>(null);
    const [selectedCarePlanName, setSelectedCarePlanName] = useState<string | undefined>(undefined);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadDefaultFileName, setUploadDefaultFileName] = useState("");
    // useSidebar state used to coordinate with SidebarTrigger if needed, but SidebarTrigger handles itself.
    const { toggleSidebar, state: leftSidebarState } = useSidebar();

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

        if (profile?.active_organization_id) {
            supabase
                .from("organizations")
                .select("*")
                .eq("id", profile.active_organization_id)
                .single()
                .then(({ data, error }) => {
                    if (!error) setActiveOrganization(data);
                });
        }
    }, [residentId, profile?.active_organization_id]);

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

        // Special handling for external links
        const formConfig = folderForms.find(f => f.key === key);
        if (formConfig?.type === "link" && formConfig.url) {
            window.open(formConfig.url, "_blank");
            return;
        }

        setActiveFileId(null);

        if (activeFormKey === key) {
            setActiveFormKey(null);
            setFormDataForEdit(undefined);
            setIsReviewMode(false);
            setIsViewOnly(false);
            return;
        }

        setActiveFormKey(key);

        // Check if there is existing data for this form
        if (key === "care-plan-form") {
            if (activeCarePlanForms.length > 0) {
                setIsViewOnly(true);
                setIsReviewMode(false);
                setFormDataForEdit(activeCarePlanForms[0]);
            } else {
                setIsViewOnly(false);
                setIsReviewMode(false);
                setFormDataForEdit(null);
            }
            return;
        }

        const formState = getFormState(key);
        if (key === "dependency-assessment" || key === "fall-risk-assessment" || key === "choking-risk-assessment-form") {
            setIsViewOnly(false);
            setIsReviewMode(false);
            setFormDataForEdit(null);
        } else if (formState.hasData) {
            setIsViewOnly(true); // Default to view-only for filled forms
            setIsReviewMode(false);
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
            setIsViewOnly(false);
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
        setIsViewOnly(false);
        setSelectedCarePlanName(undefined);
        refreshForms();
        refetchFolderForms();
    };

    const handleCarePlanSelect = (name: string) => {
        setActiveFileId(null);
        setFormDataForEdit(null);
        setSelectedCarePlanName(name);
        setIsReviewMode(false); // Ensure we are in create mode
        setIsViewOnly(false);
        setActiveFormKey("care-plan-form" as CareFileFormKey);
        setIsCarePlanSelectionOpen(false);
    };

    const handlePrint = async () => {
        if (!activeFormKey || !resident) return;

        const allowsHistoryOnlyPrint =
            activeFormKey === "dependency-assessment" ||
            activeFormKey === "fall-risk-assessment" ||
            activeFormKey === "choking-risk-assessment-form" ||
            activeFormKey === "v2-abbey-pain";

        if (!allowsHistoryOnlyPrint && !formDataForEdit) {
            toast.error("No form data available to print. Please save or open a completed record first.");
            return;
        }

        const formName = activeFormKey === "care-plan-form"
            ? (formDataForEdit.care_plan_type || "Care Plan")
            : (folderForms.find(f => f.key === activeFormKey)?.value || "Form");

        toast.info(`Generating PDF for ${formName}...`);

        const dataToPrint: any = { ...formDataForEdit };

        // If it's a care plan, fetch the 5 most recent evaluations
        if (activeFormKey === "care-plan-form") {
            const { data: evaluations, error } = await supabase
                .from('care_plan_evaluations')
                .select('*')
                .eq('care_plan_id', formDataForEdit.id || formDataForEdit._id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!error && evaluations) {
                dataToPrint.evaluations = evaluations.map(e => ({
                    evaluation_date: e.evaluation_date || e.created_at,
                    progress_notes: e.progress_notes || e.comments,
                    outcome: e.outcome,
                    position: e.position,
                    staff_name: e.reviewed_by_name,
                    next_review_date: e.new_review_date
                }));
            }
        }

        // If it's a dependency assessment, fetch all past assessments
        if (activeFormKey === "dependency-assessment") {
            const { data: history, error } = await supabase
                .from('dependency_assessments')
                .select('*')
                .eq('resident_id', residentId)
                .order('assessment_date', { ascending: false });

            if (!error && history) {
                dataToPrint.history = history;
            }
        }

        // If it's a fall risk assessment, fetch all past assessments
        if (activeFormKey === "fall-risk-assessment") {
            const { data: history, error } = await supabase
                .from('fall_risk_assessments')
                .select('*')
                .eq('resident_id', residentId)
                .order('assessment_date', { ascending: false });

            if (!error && history) {
                dataToPrint.history = history;
            }
        }

        // If it's a choking risk assessment, fetch all past assessments
        if (activeFormKey === "choking-risk-assessment-form") {
            const { data: history, error } = await supabase
                .from('choking_risk_assessments')
                .select('*')
                .eq('resident_id', residentId)
                .order('assessment_date', { ascending: false });

            if (!error && history) {
                dataToPrint.history = history;
            }
        }

        // If it's Abbey Pain Tool, fetch all past assessments
        if (activeFormKey === "v2-abbey-pain") {
            const { data: history, error } = await supabase
                .from('abbey_pain_assessments')
                .select('*')
                .eq('resident_id', residentId)
                .eq('status', 'completed')
                .order('assessment_date', { ascending: false });

            if (!error && history) {
                dataToPrint.history = history;
            }
        }

        await generateCareFilePDF({
            formName,
            data: dataToPrint,
            resident,
            orgLogoUrl: activeOrganization?.logo_url,
            careHomeName: activeOrganization?.name || profile?.care_home_name
        });

        toast.success("PDF generated successfully");
    };

    const handleExternalSubmit = () => {
        // Trigger a click on the hidden submit button in the form
        const submitBtn = document.getElementById('care-file-submit-btn');
        if (submitBtn) {
            submitBtn.click();
        } else {
            toast.error("Form submission button not found");
        }
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
        <div className="flex flex-col gap-6 w-full relative h-[calc(100vh-theme(spacing.24))]">
            {/* Top Bar */}
            <div className="flex items-center gap-2 px-4 py-2 bg-background border-b flex-shrink-0">
                <button
                    onClick={() => router.push(`/dashboard/residents/${residentId}/care-file` as any)}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
                    <span
                        className="cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => {
                            setActiveFormKey(null);
                            setActiveFileId(null);
                            setFormDataForEdit(undefined);
                            setIsViewOnly(false);
                            router.push(`/dashboard/residents/${residentId}/care-file` as any);
                        }}
                    >
                        Care File
                    </span>
                    <span>/</span>
                    <span className="font-medium text-foreground">{folderConfig.value || folderKey}</span>
                    {activeFormKey && (
                        <>
                            <span>/</span>
                            <span className="text-foreground">
                                {activeFormKey === "care-plan-form"
                                    ? (formDataForEdit?.care_plan_type || "Care Plan")
                                    : (folderForms.find(f => (f.key as string) === activeFormKey)?.value || "Form")
                                }
                            </span>
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

            {/* Body */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Main content */}
                <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-muted/10">
                    {activeFile ? (
                        <FileViewer file={activeFile} />
                    ) : activeFormKey && resident ? (
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
                            <div className="w-full bg-background rounded-xl border shadow-sm mb-8 overflow-visible">
                                {/* Form Header with Edit/Print */}
                                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5">
                                    <div className="flex items-center gap-3">
                                        {isViewOnly && activeFormKey === "care-plan-form" ? null : (
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <FileText className="w-5 h-5 text-primary" />
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="text-lg font-bold leading-none">
                                                {activeFormKey === "care-plan-form"
                                                    ? (formDataForEdit?.care_plan_type || "Care Plan")
                                                    : (folderForms.find(f => (f.key as string) === activeFormKey)?.value || "Form")
                                                }
                                            </h2>
                                            {isViewOnly && formDataForEdit && (
                                                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                                    {activeFormKey === "care-plan-form" && (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                    )}
                                                    <span>
                                                        Completed - {new Date(formDataForEdit.created_at || formDataForEdit._creationTime).toLocaleDateString('en-GB', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isViewOnly ? (
                                            <>
                                                {activeFormKey !== "dependency-assessment" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => { setIsViewOnly(false); setIsReviewMode(true); }}
                                                        className="gap-2"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                        Edit
                                                    </Button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleCloseForm}
                                                    disabled={isSaving}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleExternalSubmit}
                                                    disabled={isSaving}
                                                    className="gap-2"
                                                >
                                                    {isSaving ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <FileText className="w-4 h-4" />
                                                    )}
                                                    Submit
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePrint}
                                            disabled={activeFormKey !== "dependency-assessment" && activeFormKey !== "fall-risk-assessment" && activeFormKey !== "choking-risk-assessment-form" && activeFormKey !== "v2-abbey-pain" && !formDataForEdit}
                                            className="gap-2"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Print
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={handleCloseForm}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-6 sm:p-10">
                                    {isViewOnly ? (
                                        activeFormKey === "care-plan-form" ? (
                                            <CarePlanViewer
                                                data={formDataForEdit}
                                                onAddEvaluation={() => {
                                                    const evalSection = document.getElementById('care-plan-evaluations-section');
                                                    if (evalSection) {
                                                        evalSection.scrollIntoView({ behavior: 'smooth' });
                                                        const newEvalBtn = document.getElementById('new-evaluation-btn');
                                                        if (newEvalBtn) {
                                                            newEvalBtn.click();
                                                        }
                                                    }
                                                }}
                                            />
                                        ) : (
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
                                                isReviewMode={false}
                                                viewOnly={true}
                                                onClose={handleCloseForm}
                                                isInline={true}
                                            />
                                        )
                                    ) : (
                                        <Dialog open={true} modal={false}>
                                            <DialogPrimitive.Title className="sr-only">
                                                {activeFormKey === "care-plan-form"
                                                    ? (formDataForEdit?.care_plan_type || "Care Plan")
                                                    : (folderForms.find(f => (f.key as string) === activeFormKey)?.value || "Form")
                                                }
                                            </DialogPrimitive.Title>
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
                                                        isInline={true}
                                                        newCarePlanName={selectedCarePlanName}
                                                    />
                                                </div>
                                            </DialogPrimitive.Content>
                                        </Dialog>
                                    )}

                                    {activeFormKey === "care-plan-form" && (formDataForEdit?.id || formDataForEdit?._id) && (
                                        <div id="care-plan-evaluations-section" className="mt-8 pt-8 border-t">
                                            <CarePlanEvaluations
                                                carePlanId={formDataForEdit.id || formDataForEdit._id}
                                                residentId={residentId}
                                            />
                                        </div>
                                    )}
                                </div>
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
                <aside className={`flex-shrink-0 border-l bg-background h-full transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-0 opacity-0 invisible" : "w-[200px] opacity-100"
                    } overflow-y-auto overflow-x-hidden p-3`}>
                    <div className="flex flex-col gap-6">
                        {/* Forms section */}
                        {folderForms.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                        Forms
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    {folderForms.map((form) => {
                                        const isActive = activeFormKey === form.key;
                                        const formState = formsLoading
                                            ? { status: "not-started" as const, hasData: false, isAudited: false }
                                            : getFormState(form.key as CareFileFormKey);

                                        const isLink = form.type === "link";

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
                                                {!isLink && (
                                                    <FormStatusIndicator
                                                        status={formState.status}
                                                        className="h-4 w-4 flex-shrink-0 mt-0.5"
                                                    />
                                                )}
                                                {isLink && (
                                                    <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold leading-tight mb-0.5">
                                                        {form.value}
                                                    </p>
                                                    {!isLink && (
                                                        <FormStatusBadge
                                                            status={formState.status}
                                                            isAudited={formState.isAudited}
                                                        />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Care Plan section (if applicable) */}
                        {folderConfig.carePlan && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                        Care Plans
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 hover:bg-muted"
                                        onClick={() => setIsCarePlanSelectionOpen(true)}
                                        title="Add Care Plan"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                                {folderFormsLoading ? (
                                    <div className="flex justify-center p-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                                ) : activeCarePlanForms.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                        {activeCarePlanForms.map((cp) => (
                                            <button
                                                key={cp._id || cp.id}
                                                onClick={() => {
                                                    setActiveFileId(null);
                                                    setActiveFormKey("care-plan-form" as CareFileFormKey);
                                                    setFormDataForEdit(cp);
                                                    setSelectedCarePlanName(undefined);
                                                    setIsViewOnly(true);
                                                    setIsReviewMode(false);
                                                }}
                                                className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${activeFormKey === "care-plan-form" && (formDataForEdit?._id === cp._id || formDataForEdit?.id === cp.id)
                                                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                                    : "hover:bg-muted/60 text-foreground"
                                                    }`}
                                            >
                                                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold leading-tight truncate">
                                                        {cp.care_plan_type || "Care Plan"}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Last updated: {new Date(cp._creationTime || cp.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
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
                                {folderKey === "v2-mobility" ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 hover:bg-muted"
                                                title="Upload PDF"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("Physiotherapy");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                Physiotherapy
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("OT");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                OT
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("Falls Team");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                Falls Team
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : folderKey === "v2-nutrition-hydration" ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 hover:bg-muted"
                                                title="Upload PDF"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("GP input");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                GP input
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("SALT");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                SALT
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("Dietitian");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                Dietitian
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <UploadFileModal
                                        folderName={folderConfig.value || folderKey}
                                        residentId={residentId}
                                        variant="icon"
                                        onUploaded={fetchUploadedFiles}
                                    />
                                )}
                            </div>

                            <UploadFileModal
                                folderName={folderConfig.value || folderKey}
                                residentId={residentId}
                                variant="none"
                                open={isUploadModalOpen}
                                onOpenChange={setIsUploadModalOpen}
                                defaultFileName={uploadDefaultFileName}
                                onUploaded={fetchUploadedFiles}
                            />

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
            </div >

            {/* Care Plan Selection Dialog */}
            < Dialog open={isCarePlanSelectionOpen} onOpenChange={setIsCarePlanSelectionOpen} >
                <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden">
                    <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                        <DialogPrimitive.Title className="text-sm font-semibold">Select Care Plan Type</DialogPrimitive.Title>
                        <DialogPrimitive.Description className="text-[10px]">
                            Choose a care plan to add
                        </DialogPrimitive.Description>
                    </div>
                    <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 gap-1.5">
                            <Card
                                className="cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors border bg-white"
                                onClick={() => handleCarePlanSelect("General Care Plan")}
                            >
                                <CardContent className="p-2.5">
                                    <div className="flex items-start gap-2">
                                        <div className="p-1.5 rounded-md bg-blue-100 text-blue-600">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-xs">General Care Plan</h3>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                                Generic care plan documentation
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            {/* Folder Specific Care Plan */}
                            {folderConfig.value !== "General" && (
                                <Card
                                    className="cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors border bg-white"
                                    onClick={() => handleCarePlanSelect(`${folderConfig.value} Care Plan`)}
                                >
                                    <CardContent className="p-2.5">
                                        <div className="flex items-start gap-2">
                                            <div className="p-1.5 rounded-md bg-green-100 text-green-600">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-xs">{folderConfig.value} Plan</h3>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                                    Specific plan for {folderConfig.value}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            {folderKey === "v2-mobility" && (
                                <Card
                                    className="cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors border bg-white"
                                    onClick={() => handleCarePlanSelect("Assistance care plan")}
                                >
                                    <CardContent className="p-2.5">
                                        <div className="flex items-start gap-2">
                                            <div className="p-1.5 rounded-md bg-orange-100 text-orange-600">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-xs">Assistance Plan</h3>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                                    Care plan for assistance
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            {folderKey === "v2-nutrition-hydration" && (
                                <>
                                    {[
                                        { title: "Risk of Malnutrition", desc: "Care plan for malnutrition risk" },
                                        { title: "Supplements", desc: "Care plan for nutritional supplements" },
                                        { title: "Thickener", desc: "Care plan for fluid thickeners" },
                                        { title: "Risk of Choking", desc: "Care plan for choking risk" },
                                        { title: "Weight Loss", desc: "Care plan for weight loss management" },
                                        { title: "Diabetic Diet", desc: "Care plan for diabetic management" },
                                        { title: "Fluid Restriction", desc: "Care plan for fluid restriction" }
                                    ].map((plan) => (
                                        <Card
                                            key={plan.title}
                                            className="cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors border bg-white"
                                            onClick={() => handleCarePlanSelect(`Care Plan: ${plan.title}`)}
                                        >
                                            <CardContent className="p-2.5">
                                                <div className="flex items-start gap-2">
                                                    <div className="p-1.5 rounded-md bg-green-100 text-green-600">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-xs">{plan.title}</h3>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                                            {plan.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </Dialog >
        </div >
    );
}
