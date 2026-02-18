"use client";

import CarePlanEvaluationDialog from "@/components/residents/carefile/CarePlanEvaluationDialog";
import CarePlanDialog from "@/components/residents/carefile/dialogs/CarePlanDialog";
import EmailPDF from "@/components/residents/carefile/EmailPDF";
import { FolderProgressIndicator } from "@/components/residents/carefile/FolderCompletionIndicator";
import FormStatusIndicator, {
  FormStatusBadge
} from "@/components/residents/carefile/FormStatusIndicator";
import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { useFolderForms } from "@/hooks/use-folder-forms";
import { usePdfUrl } from "@/hooks/use-pdf-url";
import { useProfile } from "@/hooks/use-profile";
import { CareFileFormKey } from "@/types/care-files";
import JSZip from "jszip";
import {
  Archive,
  DownloadIcon,
  Edit2,
  Eye,
  FileIcon,
  FolderIcon,
  Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import EmailPDFWithStorageId from "../EmailPDFWithStorageId";
import CarePlanViewDialog from "./CarePlanViewDialog";
import RiskAssessmentViewDialog from "./RiskAssessmentViewDialog";
import { supabase } from "@/lib/supabase";

interface CareFileFolderProps {
  index: number;
  folderName: string;
  folderKey: string;
  carePlan: boolean;
  description: string;
  forms:
  | {
    type: string;
    key: string;
    value: string;
  }[]
  | undefined;
  preAddissionState: boolean | undefined;
  residentId: string; // Changed to string
  canFillForms: boolean;
}

// Folders migrated to full-page layout — clicking navigates instead of opening Sheet
const MIGRATED_FOLDER_ROUTES: Record<string, string> = {
  preAdmission: "pre-admission",
  "moving-handling": "moving-handling",
};

export default function CareFileFolder({
  index,
  folderName,
  folderKey,
  carePlan,
  description,
  forms,
  residentId,
  canFillForms
}: CareFileFolderProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDialogKey, setActiveDialogKey] = useState<string | null>(null);
  const [reviewFormData, setReviewFormData] = useState<{
    formType: string;
    formId: string;
    formDisplayName: string;
  } | null>(null);
  const [editingPdfId, setEditingPdfId] = useState<string | null>(null);
  const [editingPdfName, setEditingPdfName] = useState("");
  const [carePlanDialogOpen, setCarePlanDialogOpen] = useState(false);
  const [selectedCarePlan, setSelectedCarePlan] = useState<{
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    isLatest: boolean;
  } | null>(null);
  const [deleteCarePlanDialog, setDeleteCarePlanDialog] = useState<{
    open: boolean;
    carePlanId: string;
    carePlanName: string;
  }>({
    open: false,
    carePlanId: "",
    carePlanName: ""
  });
  const [deleteFormDialog, setDeleteFormDialog] = useState<{
    open: boolean;
    formId: string;
    formKey: string;
    formName: string;
    isLatest: boolean;
    hasArchivedVersions: boolean;
  }>({
    open: false,
    formId: "",
    formKey: "",
    formName: "",
    isLatest: false,
    hasArchivedVersions: false
  });
  const [isDeletingForm, setIsDeletingForm] = useState(false);
  const [riskAssessmentDialogOpen, setRiskAssessmentDialogOpen] =
    useState(false);
  const [selectedRiskAssessment, setSelectedRiskAssessment] = useState<{
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    category: string;
  } | null>(null);
  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewDialogFile, setViewDialogFile] = useState<{
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    isLatest?: boolean;
    isCarePlan?: boolean;
  } | null>(null);
  const { activeTeamId } = useActiveTeam();
  const { profile } = useProfile();

  // Cleanup effect to prevent state leaks
  useEffect(() => {
    return () => {
      setDeleteFormDialog({ open: false, formId: "", formKey: "", formName: "", isLatest: false, hasArchivedVersions: false });
      setDeleteCarePlanDialog({ open: false, carePlanId: "", carePlanName: "" });
      setIsDeletingForm(false);
      setIsDeleting(false);
    };
  }, []);

  useEffect(() => {
    if (!deleteFormDialog.open) {
      setIsDeletingForm(false);
      setIsDeleting(false);
    }
  }, [deleteFormDialog.open]);

  const { getFormState, canDownloadPdf, getCompletedFormsCount, loading: loadingForms } =
    useCareFileForms({ residentId });

  const folderFormKeys = (forms || []).map(
    (form) => form.key as CareFileFormKey
  );
  const completedCount = getCompletedFormsCount(folderFormKeys);
  const totalCount = folderFormKeys.length;

  // Fetch resident data for display purposes
  const [resident, setResident] = useState<any>(null);
  const [residentLoading, setResidentLoading] = useState(true);
  const [residentError, setResidentError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResident = async () => {
      try {
        setResidentLoading(true);
        setResidentError(null);
        const { data, error } = await supabase
          .from('residents')
          .select('*, emergency_contacts(*)')
          .eq('id', residentId)
          .single();

        if (error) {
          console.error("Error fetching resident:", error);
          setResidentError("Failed to load resident data");
          return;
        }

        setResident(data);
      } catch (err) {
        console.error("Unexpected error fetching resident:", err);
        setResidentError("Unexpected error loading resident data");
      } finally {
        setResidentLoading(false);
      }
    };

    if (residentId) {
      fetchResident();
    }
  }, [residentId]);

  // Custom PDFs - Placeholder or fetch from a future table
  const customPdfs: any[] = [];

  // Use the folder forms hook to fetch all forms for this folder
  const {
    getAllPdfFiles: folderPdfFiles,
    refetch: refetchForms,
    latestCarePlanForm
  } = useFolderForms({
    residentId,
    folderFormKeys,
    organizationId: profile?.active_organization_id ?? undefined,
    folderKey,
    includeCarePlans: carePlan
  });

  // Add error boundary for form data
  const [formDataError, setFormDataError] = useState<string | null>(null);

  // HELPER MAPPING for Deletes
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

  const handleCreateCarePlan = () => {
    setCarePlanDialogOpen(true);
    setSelectedCarePlan(null);
  };

  const handleDeleteCarePlan = async () => {
    if (!deleteCarePlanDialog.carePlanId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('care_plan_assessments')
        .delete()
        .eq('id', deleteCarePlanDialog.carePlanId);

      if (error) throw error;

      toast.success("Care plan deleted successfully");
      refetchForms();
      setDeleteCarePlanDialog({ open: false, carePlanId: "", carePlanName: "" });
    } catch (error) {
      console.error("Error deleting care plan:", error);
      toast.error("Failed to delete care plan. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteForm = async () => {
    const { formId, formKey } = deleteFormDialog;
    if (!formId || !formKey) return;

    setIsDeleting(true);
    setIsDeletingForm(true);

    try {
      const table = TABLE_MAP[formKey];
      if (!table) {
        toast.error("Delete not supported for this form type");
        return;
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', formId);

      if (error) throw error;

      toast.success("Form deleted successfully");
      refetchForms(); // Refresh list

      setTimeout(() => {
        setDeleteFormDialog({ open: false, formId: "", formKey: "", formName: "", isLatest: false, hasArchivedVersions: false });
      }, 100);
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form");
      setTimeout(() => {
        setDeleteFormDialog({ open: false, formId: "", formKey: "", formName: "", isLatest: false, hasArchivedVersions: false });
      }, 100);
    } finally {
      setTimeout(() => {
        setIsDeletingForm(false);
        setIsDeleting(false);
      }, 200);
    }
  };

  // Handler for deleting PDFs (Custom)
  const handleDeletePdf = async (pdfId: string) => {
    if (!confirm("Are you sure you want to delete this PDF?")) {
      return;
    }
    // TODO: Implement custom PDF deletion
    toast.info("Delete feature for custom PDFs coming soon");
  };

  // Component for custom uploaded PDFs (Reduced for now)
  const CustomPdfItem = ({ pdf }: { pdf: any }) => {
    return null; // Placeholder
  };

  // Data for editing (Review)
  // This needs to fetch the specific form data by ID.
  // We can do this in the Dialog itself or here.
  // CareFileDialogRenderer calls specific dialogs which typically accept 'initialData'.
  // If we don't pass 'initialData', the dialog might try to fetch it or be empty.
  // We should fetch it here if we want to support 'Edit'.
  // Supabase fetch:
  const [formDataForEdit, setFormDataForEdit] = useState<any>(undefined);

  useEffect(() => {
    async function fetchEditData() {
      try {
        setFormDataError(null);
        if (!reviewFormData) {
          setFormDataForEdit(undefined);
          return;
        }
        const table = TABLE_MAP[reviewFormData.formType] || TABLE_MAP[activeDialogKey || ''];
        if (table) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', reviewFormData.formId)
            .single();

          if (error) {
            console.error("Error fetching form data:", error);
            setFormDataError("Failed to load form data");
            return;
          }

          setFormDataForEdit(data);
        }
      } catch (err) {
        console.error("Unexpected error fetching form data:", err);
        setFormDataError("Unexpected error loading form data");
      }
    }
    fetchEditData();
  }, [reviewFormData, activeDialogKey]);


  const handleCareFileClick = (key: string) => {
    if (!canFillForms) {
      return;
    }
    setActiveDialogKey(key);
    setIsDialogOpen(true);
  };

  const handleDownloadPDF = async (formKey: CareFileFormKey, fileData?: any) => {
    if (!fileData) {
      toast.error("File data is missing.");
      return;
    }

    const routeMap: Record<string, string> = {
      "admission-form": "admission",
      "blader-bowel-form": "bladder-bowel",
      "moving-handling-form": "moving-handling",
      "long-term-fall-risk-form": "long-term-falls",
      "preAdmission-form": "pre-admission",
      "infection-prevention": "infection-prevention",
      "peep": "peep",
      "photography-consent": "photography-consent",
      "dnacpr": "dnacpr",
      "dependency-assessment": "dependency",
      "timl": "timl",
      "skin-integrity-form": "skin-integrity",
      "care-plan-form": "care-plan",
      "oral-assessment-form": "oral-assessment",
      "nutritional-assessment-form": "nutritional-assessment",
      "pain-assessment-form": "pain-assessment",
      "diet-notification-form": "diet-notification",
      "choking-risk-assessment-form": "choking-risk",
      "cornell-depression-scale-form": "cornell-depression",
      "best-interest-decision-form": "best-interest-decision",
      "resident-valuables-form": "resident-valuables",
      "resident-handling-profile-form": "resident-handling-profile",
      "bedrail-consent-form": "bedrail-consent",
      "bed-rails-risk-assessment-form": "bed-rails-risk-assessment",
    };

    const route = routeMap[formKey];
    if (!route) {
      toast.info(`PDF download for this form type is not yet fully implemented.`);
      return;
    }

    const loadingToast = toast.loading(`Generating PDF for ${fileData.residentName || "the record"}...`);

    try {
      const response = await fetch(`/api/pdf/${route}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Note: In local/dev we might skip the token if the API allows it, 
          // or we can pass a token if it's available in the client (usually it's not for safety).
          // Our API routes current check for process.env.PDF_API_TOKEN.
        },
        body: JSON.stringify({
          ...fileData,
          residentName: resident ? `${resident.first_name} ${resident.last_name}` : undefined,
          dob: resident?.date_of_birth,
          bedroomNumber: resident?.room_number,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${route}-${fileData.residentName?.replace(/\s+/g, "-") || "record"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF downloaded successfully", { id: loadingToast });
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to download PDF.", { id: loadingToast });
    }
  };

  const downloadFromUrl = async (url: string, fallbackFilename: string) => {
    // Placeholder
  };

  const handleDownloadFolder = async () => {
    toast.info("Bulk download unavailable during migration.");
  };

  const handleCloseDialog = (assessmentId?: string) => {
    setIsDialogOpen(false);
    setReviewFormData(null);
    refetchForms(); // Refresh data after dialog closes (potentially saved)

    // Helper to open view
    if (assessmentId && activeDialogKey) {
      // ... existing logic to open view ...
      // For now, simplify and just close.
    }
  };

  // If this folder has been migrated to the full-page layout, navigate instead of opening Sheet
  const migratedRoute = MIGRATED_FOLDER_ROUTES[folderKey];
  if (migratedRoute) {
    return (
      <div
        className="w-full flex flex-row justify-between items-center gap-3 hover:bg-muted/50 hover:text-primary cursor-pointer transition-colors rounded px-2 py-2 group"
        onClick={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          () => router.push(`/dashboard/residents/${residentId}/care-file/${migratedRoute}` as any)
        }
      >
        <div className="flex flex-row items-center gap-3">
          <FolderIcon className="size-6 text-muted-foreground/70 group-hover:text-primary" />
          <p className="text-primary text-base font-medium">
            {index + 1}. {folderName}
          </p>
          {forms && forms.length >= 1 && (
            <p className="text-muted-foreground text-sm">
              {forms?.length} {forms?.length === 1 ? "form" : "forms"}
            </p>
          )}
        </div>
        {totalCount > 0 && (
          <FolderProgressIndicator
            completedCount={completedCount}
            totalCount={totalCount}
            className="flex-shrink-0"
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <Sheet open={isSheetOpen} onOpenChange={(open) => {
        if (!open && (isDeleting || isDeletingForm || deleteFormDialog.open || deleteCarePlanDialog.open)) {
          return;
        }
        setIsSheetOpen(open);
      }}>
        <SheetTrigger asChild>
          <div className="w-full flex flex-row justify-between items-center gap-3 hover:bg-muted/50 hover:text-primary cursor-pointer transition-colors rounded px-2 py-2 group">
            <div className="flex flex-row items-center gap-3">
              <FolderIcon className="size-6 text-muted-foreground/70 group-hover:text-primary" />

              <p className="text-primary text-base font-medium">
                {index + 1}. {folderName}
              </p>
              {forms && forms.length >= 1 && (
                <p className="text-muted-foreground text-sm">
                  {forms?.length} {forms?.length === 1 ? "form" : "forms"}
                </p>
              )}
            </div>
            {totalCount > 0 && (
              <FolderProgressIndicator
                completedCount={completedCount}
                totalCount={totalCount}
                className="flex-shrink-0"
              />
            )}
          </div>
        </SheetTrigger>
        <SheetContent size="lg" className="flex flex-col">
          {/* Dialogs moved outside Sheet to appear as overlays */}
          <SheetHeader className="flex-shrink-0">
            <div className="flex items-center justify-between pr-10">
              <SheetTitle>{folderName}</SheetTitle>
              {folderKey !== "preAdmission" && (
                <UploadFileModal
                  folderName={folderName}
                  residentId={residentId}
                  variant="button"
                />
              )}
            </div>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col justify-between flex-1 overflow-hidden">
            <div className="flex flex-col gap-1 px-4 overflow-y-auto flex-1 pb-10">
              <div className="flex flex-row justify-between items-center gap-2 mt-4">
                <p className="text-muted-foreground text-sm font-medium">
                  Forms
                </p>
              </div>
              <div className="flex flex-col gap-1 mb-6">
                {forms?.map((form) => {
                  if (form.type === "link") {
                    return (
                      <a
                        key={form.key}
                        href={(form as any).url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium flex flex-row justify-between items-center gap-2 px-0.5 py-0.5 rounded-md group cursor-pointer hover:bg-muted/50 hover:text-primary"
                      >
                        <div className="flex flex-row items-center gap-2">
                          <FileIcon className="size-4 text-muted-foreground" />
                          <p>{form.value}</p>
                        </div>
                      </a>
                    );
                  }

                  const formKey = form.key as CareFileFormKey;
                  const formState = getFormState(formKey);
                  const isFormDisabled = !canFillForms;

                  return (
                    <div
                      key={form.key}
                      className={`text-sm font-medium flex flex-row justify-between items-center gap-2 px-0.5 py-0.5 rounded-md group ${isFormDisabled
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-muted/50 hover:text-primary"
                        }`}
                      onClick={() => {
                        if (!isFormDisabled) {
                          handleCareFileClick(form.key);
                        }
                      }}
                    >
                      <div className="flex flex-row items-center gap-2">
                        <FormStatusIndicator
                          status={formState.status}
                          className="h-4 max-w-4"
                        />
                        <p>{form.value}</p>
                        <FormStatusBadge
                          status={formState.status}
                          isAudited={formState.isAudited}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {carePlan && (
                <>
                  <div className="flex flex-row justify-between items-center gap-2 mt-4">
                    <p className="text-muted-foreground text-sm font-medium">
                      Plans
                    </p>
                    <Button variant="outline" size="sm" onClick={handleCreateCarePlan}>+ Create</Button>
                  </div>
                  <div className="space-y-2 mb-6">
                    {latestCarePlanForm ? (
                      <PdfFileItem
                        key={latestCarePlanForm._id}
                        isCarePlan
                        file={{
                          formKey: "care-plan-form",
                          formId: latestCarePlanForm._id,
                          name: latestCarePlanForm.care_plan_type || latestCarePlanForm.nameOfCarePlan || "Care Plan",
                          completedAt: latestCarePlanForm._creationTime,
                          isLatest: true,
                          data: latestCarePlanForm
                        }}
                      />
                    ) : (
                      <div className="w-full text-center p-2 py-6 border rounded-md bg-muted/60 text-muted-foreground text-xs">
                        No care plans generated yet. Complete and submit care plan.
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex flex-row justify-between items-center gap-2 mt-6">
                <p className="text-muted-foreground text-sm font-medium">
                  Files
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleDownloadFolder}>
                    <DownloadIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {(() => {
                  const latestFiles = folderPdfFiles.filter(f => f.isLatest && f.formKey !== "care-plan-form");
                  return latestFiles.length > 0 ? (
                    latestFiles.map((file) => (
                      <PdfFileItem
                        key={`${file.formKey}-${file.formId}`}
                        file={file}
                      />
                    ))
                  ) : (
                    <div className="w-full text-center p-2 py-6 border rounded-md bg-muted/60 text-muted-foreground text-xs">
                      No generated files available.
                    </div>
                  );
                })()}
              </div>

              {/* Archived Files Section (Version just before) */}
              <div className="flex flex-row justify-between items-center gap-2 mt-6">
                <p className="text-muted-foreground text-sm font-medium">
                  Archived Files
                </p>
              </div>
              <div className="space-y-2 mb-6">
                {(() => {
                  // Group by formKey to find the 2nd latest (index 1)
                  const groupedByForm = folderPdfFiles.reduce((acc, file) => {
                    if (!acc[file.formKey]) acc[file.formKey] = [];
                    acc[file.formKey].push(file);
                    return acc;
                  }, {} as Record<string, any[]>);

                  const archivedFiles: any[] = [];
                  Object.values(groupedByForm).forEach(versions => {
                    if (versions.length > 1) {
                      archivedFiles.push(versions[1]);
                    }
                  });

                  // Sort by date
                  const sortedArchived = archivedFiles.sort((a, b) => b.completedAt - a.completedAt);

                  return sortedArchived.length > 0 ? (
                    sortedArchived.map((file) => (
                      <PdfFileItem
                        key={`${file.formKey}-${file.formId}`}
                        file={file}
                      />
                    ))
                  ) : (
                    <div className="w-full text-center p-2 py-4 border rounded-md bg-muted/60 text-muted-foreground text-xs">
                      No archived files.
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
          <div className="p-4 border-t">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setIsSheetOpen(false)}
            >
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Form Dialog */}
      <AlertDialog open={deleteFormDialog.open} onOpenChange={(open) => {
        if (!open && isDeleting) return;
        setDeleteFormDialog(prev => ({ ...prev, open }));
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteFormDialog.formName}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteForm();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Care Plan Dialog */}
      <AlertDialog open={deleteCarePlanDialog.open} onOpenChange={(open) => {
        if (!open && isDeleting) return;
        setDeleteCarePlanDialog(prev => ({ ...prev, open }));
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Care Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteCarePlanDialog.carePlanName}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCarePlan();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Dialog Renderer - Rendered outside Sheet to appear as overlay */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {isDialogOpen && (
            <CareFileDialogRenderer
              formKey={activeDialogKey as CareFileFormKey}
              residentId={residentId as any} // Cast if needed
              teamId={activeTeamId ?? undefined}
              organizationId={profile?.active_organization_id ?? ""}
              userId={profile?.id ?? ""}
              userName={profile?.name || profile?.email || "User"}
              userRole={profile?.role ?? ""}
              resident={resident}
              careHomeName={profile?.care_home_name ?? ""}
              folderKey={folderKey}
              formDataForEdit={formDataForEdit}
              isReviewMode={!!reviewFormData} // Only true when editing existing form
              onClose={() => handleCloseDialog()}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Care Plan Dialog (Create) - Rendered outside Sheet to appear as overlay */}
      {
        carePlanDialogOpen && profile && (
          <CarePlanDialog
            teamId={activeTeamId ?? ""}
            organizationId={profile?.active_organization_id ?? ""}
            residentId={residentId as any}
            userId={profile?.id ?? ""}
            userName={profile?.name || profile?.email || "Unknown"}
            resident={resident}
            folderKey={folderKey}
            initialData={selectedCarePlan ? selectedCarePlan : undefined}
            open={carePlanDialogOpen}
            onOpenChange={setCarePlanDialogOpen}
            onClose={() => {
              setCarePlanDialogOpen(false);
              refetchForms();
            }}
          />
        )
      }

      {/* View Dialog for Care Plans */}
      {viewDialogOpen && viewDialogFile?.isCarePlan && (
        <CarePlanViewDialog
          open={viewDialogOpen}
          onOpenChange={(open) => {
            setViewDialogOpen(open);
            if (!open) setViewDialogFile(null);
          }}
          carePlan={{
            formKey: viewDialogFile.formKey,
            formId: viewDialogFile.formId,
            name: viewDialogFile.name,
            completedAt: viewDialogFile.completedAt,
            isLatest: viewDialogFile.isLatest ?? true,
          }}
        />
      )}

      {/* View Dialog for Risk Assessments / Other Forms */}
      {viewDialogOpen && viewDialogFile && !viewDialogFile.isCarePlan && (
        <RiskAssessmentViewDialog
          open={viewDialogOpen}
          onOpenChange={(open) => {
            setViewDialogOpen(open);
            if (!open) setViewDialogFile(null);
          }}
          assessment={{
            formKey: viewDialogFile.formKey,
            formId: viewDialogFile.formId,
            name: viewDialogFile.name,
            completedAt: viewDialogFile.completedAt,
            category: folderName,
          }}
        />
      )}

    </div >
  );

  function PdfFileItem({ isCarePlan, file }: { isCarePlan?: boolean; file: any }) {
    // Simplified Item
    return (
      <div className="flex items-center justify-between rounded-md hover:bg-muted/50 transition-colors px-1 p-2">
        <div className="flex-1 flex items-center gap-2">
          <FileIcon className="w-4 h-4 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(file.completedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isCarePlan && (
            <CarePlanEvaluationDialog carePlan={file} />
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" title="View" onClick={(e) => {
            e.stopPropagation();
            setViewDialogFile({
              formKey: file.formKey,
              formId: file.formId,
              name: file.name,
              completedAt: file.completedAt,
              isLatest: file.isLatest,
              isCarePlan: !!isCarePlan,
            });
            setViewDialogOpen(true);
          }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPDF(file.formKey as CareFileFormKey, file.data)}>
            <DownloadIcon className="h-4 w-4" />
          </Button>
          {/* Actions */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            // Determine form type and open for edit/view
            const formTypeMap: Record<string, string> = {
              "care-plan-form": "carePlanAssessments",
              ...TABLE_MAP // Use table map keys basically
            };
            // Set review data to open dialog
            // We need to map key -> type expected by dialog renderer if strict
            setActiveDialogKey(file.formKey);
            setReviewFormData({
              formType: file.formKey,
              formId: file.formId,
              formDisplayName: file.name
            });
            setIsDialogOpen(true);
          }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
            setDeleteFormDialog({
              open: true,
              formId: file.formId,
              formKey: file.formKey,
              formName: file.name,
              isLatest: false,
              hasArchivedVersions: false
            });
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
}
