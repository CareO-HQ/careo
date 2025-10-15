"use client";

import CarePlanEvaluationDialog from "@/components/residents/carefile/CarePlanEvaluationDialog";
import CarePlanDialog from "@/components/residents/carefile/dialogs/CarePlanDialog";
import EmailPDF from "@/components/residents/carefile/EmailPDF";
import FormStatusIndicator, {
  FormStatusBadge
} from "@/components/residents/carefile/FormStatusIndicator";
import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { useFolderForms } from "@/hooks/use-folder-forms";
import { usePdfUrl } from "@/hooks/use-pdf-url";
import { authClient } from "@/lib/auth-client";
import { CareFileFormKey } from "@/types/care-files";
import { useAction, useMutation, useQuery } from "convex/react";
import JSZip from "jszip";
import {
  DownloadIcon,
  Edit2,
  FileIcon,
  Trash2,
  X
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import EmailPDFWithStorageId from "../EmailPDFWithStorageId";

interface CareFileSidebarProps {
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
  residentId: Id<"residents">;
  onClose: () => void;
  onCarePlanClick: (carePlan: { name: string; date: number }) => void;
}

export default function CareFileSidebar({
  index,
  folderName,
  folderKey,
  carePlan,
  description,
  forms,
  residentId,
  onClose,
  onCarePlanClick
}: CareFileSidebarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDialogKey, setActiveDialogKey] = useState<string | null>(null);
  const [reviewFormData, setReviewFormData] = useState<{
    formType: string;
    formId: string;
    formDisplayName: string;
  } | null>(null);
  const [editingPdfId, setEditingPdfId] = useState<string | null>(null);
  const [editingPdfName, setEditingPdfName] = useState("");
  const { activeTeamId } = useActiveTeam();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: currentUser } = authClient.useSession();

  const { getFormState, canDownloadPdf } = useCareFileForms({ residentId });

  const folderFormKeys = (forms || []).map(
    (form) => form.key as CareFileFormKey
  );

  const resident = useQuery(api.residents.getById, {
    residentId: residentId || ("skip" as Id<"residents">)
  });

  const customPdfs = useQuery(
    api.careFilePdfs.getPdfsByResidentAndFolder,
    residentId ? { residentId, folderName } : "skip"
  );

  // Use the folder forms hook to fetch all forms for this folder
  const {
    allPreAdmissionForms,
    allInfectionPreventionForms,
    allBladderBowelForms,
    allMovingHandlingForms,
    allLongTermFallsForms,
    allAdmissionForms,
    allPhotographyConsentForms,
    allDnacprForms,
    allPeepForms,
    allDependencyAssessmentForms,
    allTimlAssessmentForms,
    allSkinIntegrityForms,
    allResidentValuablesForms,
    allCarePlanForms,
    getAllPdfFiles: folderPdfFiles
  } = useFolderForms({
    residentId,
    folderFormKeys,
    organizationId: activeOrg?.id,
    folderKey,
    includeCarePlans: carePlan
  });

  // Component to handle individual PDF file with URL fetching
  const PdfFileItem = ({
    isCarePlan,
    file
  }: {
    isCarePlan?: boolean;
    file: {
      formKey: string;
      formId: string;
      name: string;
      completedAt: number;
      isLatest: boolean;
    };
  }) => {
    const pdfUrl = usePdfUrl({
      formKey: file.formKey as CareFileFormKey,
      formId: file.formId,
      organizationId: activeOrg?.id
    });

    if (!pdfUrl) return null;

    return (
      <div className="flex items-center justify-between rounded-md hover:bg-muted/50 transition-colors px-2 py-2 border">
        <div className="flex-1 flex items-center gap-2">
          <div className="bg-red-50 rounded-md">
            <FileIcon className="w-4 h-4 text-red-500 m-1.5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-primary">
                {file.name}.pdf
              </p>
            </div>
            <div className="flex flex-row items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Created:{" "}
                {new Date(file.completedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
              {file.isLatest && (
                <span className="text-xs px-1 bg-blue-50 text-blue-700 rounded-full">
                  Latest
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCarePlan && <CarePlanEvaluationDialog />}
          <EmailPDFWithStorageId
            formKey={file.formKey}
            formId={file.formId}
            filename={`${file.name}.pdf`}
            residentName={resident?.fullName}
          />
          <DownloadIcon
            className="h-4 w-4 text-muted-foreground/70 hover:text-primary cursor-pointer"
            onClick={async () => {
              try {
                await downloadFromUrl(pdfUrl, `${file.name}.pdf`);
                toast.success("PDF downloaded successfully");
              } catch (error) {
                console.error("Error downloading PDF:", error);
                toast.error("Failed to download PDF");
              }
            }}
          />
        </div>
      </div>
    );
  };

  // Mutations for PDF management
  const renamePdf = useMutation(api.careFilePdfs.renamePdf);
  const deletePdf = useMutation(api.careFilePdfs.deletePdf);
  const getAllFilesForDownload = useAction(
    api.careFilePdfs.getAllFilesForFolderDownload
  );

  // Handler for renaming PDFs
  const handleRenamePdf = async (pdfId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error("Please enter a valid name");
      return;
    }

    try {
      await renamePdf({ pdfId: pdfId as any, newName: newName.trim() });
      toast.success("PDF renamed successfully");
      setEditingPdfId(null);
      setEditingPdfName("");
    } catch (error) {
      console.error("Error renaming PDF:", error);
      toast.error("Failed to rename PDF");
    }
  };

  // Handler for deleting PDFs
  const handleDeletePdf = async (pdfId: string) => {
    if (!confirm("Are you sure you want to delete this PDF?")) {
      return;
    }

    try {
      await deletePdf({ pdfId: pdfId as any });
      toast.success("PDF deleted successfully");
    } catch (error) {
      console.error("Error deleting PDF:", error);
      toast.error("Failed to delete PDF");
    }
  };

  // Component for custom uploaded PDFs
  const CustomPdfItem = ({ pdf }: { pdf: any }) => {
    const pdfUrl = useQuery(api.careFilePdfs.getPdfUrl, { pdfId: pdf._id });

    const isEditing = editingPdfId === pdf._id;

    if (!pdfUrl) return null;

    return (
      <div className="flex items-center justify-between rounded-md hover:bg-muted/50 transition-colors px-1">
        <div className="flex-1 flex items-center gap-2">
          <div className="bg-red-50 rounded-md">
            <FileIcon className="w-4 h-4 text-red-500 m-1.5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editingPdfName}
                  onChange={(e) => setEditingPdfName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRenamePdf(pdf._id, editingPdfName);
                    } else if (e.key === "Escape") {
                      setEditingPdfId(null);
                      setEditingPdfName("");
                    }
                  }}
                  onBlur={() => {
                    setEditingPdfId(null);
                    setEditingPdfName("");
                  }}
                  className="text-sm font-medium text-primary bg-transparent border-b border-primary focus:outline-none"
                  autoFocus
                />
              ) : (
                <p className="text-sm font-medium text-primary">
                  {pdf.name}.pdf
                </p>
              )}
            </div>
            <div className="flex flex-row items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Uploaded:{" "}
                {new Date(pdf.uploadedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
              {pdf.size && (
                <p className="text-xs text-muted-foreground">
                  {(pdf.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <EmailPDF
            pdfStorageId={pdf.fileId}
            filename={`${pdf.name}.pdf`}
            residentName={resident?.fullName}
          />
          <Edit2
            className="h-4 w-4 text-muted-foreground/70 hover:text-primary cursor-pointer"
            onClick={() => {
              setEditingPdfId(pdf._id);
              setEditingPdfName(pdf.name);
            }}
          />
          <Trash2
            className="h-4 w-4 text-muted-foreground/70 hover:text-red-500 cursor-pointer"
            onClick={() => handleDeletePdf(pdf._id)}
          />
          <DownloadIcon
            className="h-4 w-4 text-muted-foreground/70 hover:text-primary cursor-pointer"
            onClick={async () => {
              try {
                await downloadFromUrl(pdfUrl, `${pdf.name}.pdf`);
                toast.success("PDF downloaded successfully");
              } catch (error) {
                console.error("Error downloading PDF:", error);
                toast.error("Failed to download PDF");
              }
            }}
          />
        </div>
      </div>
    );
  };

  // Query to get form data for editing
  const formDataForEdit = useQuery(
    api.managerAudits.getFormDataForReview,
    reviewFormData
      ? {
          formType: reviewFormData.formType as any,
          formId: reviewFormData.formId
        }
      : "skip"
  );

  const handleCareFileClick = (key: string) => {
    setActiveDialogKey(key);
    setIsDialogOpen(true);
  };

  const handleDownloadPDF = async (formKey: CareFileFormKey) => {
    try {
      const formState = getFormState(formKey);

      if (!formState.hasData) {
        toast.error("No form data found");
        return;
      }

      if (!canDownloadPdf(formKey)) {
        toast.error(
          "PDF is still being generated. Please wait a moment and try again."
        );
        return;
      }

      if (formState.pdfUrl) {
        // Generate appropriate filename based on form type
        const getFileName = (key: CareFileFormKey): string => {
          const baseName = resident
            ? `${resident.firstName}-${resident.lastName}`
            : "form";
          switch (key) {
            case "preAdmission-form":
              return `pre-admission-form-${baseName}.pdf`;
            case "admission-form":
              return `admission-form-${baseName}.pdf`;
            case "infection-prevention":
              return `infection-prevention-assessment-${baseName}.pdf`;
            case "blader-bowel-form":
              return `bladder-bowel-assessment-${baseName}.pdf`;
            case "moving-handling-form":
              return `moving-handling-assessment-${baseName}.pdf`;
            case "long-term-fall-risk-form":
              return `long-term-falls-assessment-${baseName}.pdf`;
            case "care-plan-form":
              return `care-plan-assessment-${baseName}.pdf`;
            case "admission-form":
              return `admission-assessment-${baseName}.pdf`;
            case "photography-consent":
              return `photography-consent-${baseName}.pdf`;
            case "dnacpr":
              return `dnacpr-${baseName}.pdf`;
            case "peep":
              return `peep-${baseName}.pdf`;
            case "dependency-assessment":
              return `dependency-assessment-${baseName}.pdf`;
            case "timl":
              return `timl-assessment-${baseName}.pdf`;
            case "skin-integrity-form":
              return `skin-integrity-assessment-${baseName}.pdf`;
            case "resident-valuables-form":
              return `resident-valuables-assessment-${baseName}.pdf`;
            default:
              return `${key}-${baseName}.pdf`;
          }
        };

        await downloadFromUrl(formState.pdfUrl, getFileName(formKey));
        toast.success("PDF downloaded successfully");
      } else {
        toast.error(
          "PDF file exists but URL is temporarily unavailable. Please refresh the page and try again."
        );
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const downloadFromUrl = async (url: string, fallbackFilename: string) => {
    const response = await fetch(url);
    const blob = await response.blob();

    // Try to extract filename from Content-Disposition header
    let filename = fallbackFilename;
    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(
        /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
      );
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "");
      }
    }

    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  };

  // Download all files in folder as ZIP
  const handleDownloadFolder = async () => {
    if (!forms || !residentId) {
      toast.error("No files available to download");
      return;
    }

    try {
      toast.info("Preparing files for download...");

      // Get all file URLs from the server
      const files = await getAllFilesForDownload({
        residentId,
        folderName,
        forms: forms || [],
        includeCareplanFiles: carePlan
      });

      if (files.length === 0) {
        toast.error("No files found to download");
        return;
      }

      // Create a new JSZip instance
      const zip = new JSZip();

      // Download all files and add to ZIP
      const downloadPromises = files.map(async (file) => {
        try {
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error(`Failed to download ${file.filename}`);
          }
          const blob = await response.blob();

          // Organize files into folders within the ZIP
          const folderPath =
            file.type === "custom_pdf"
              ? "Uploaded Files/"
              : file.type === "care_plan"
                ? "Care Plans/"
                : "Generated Forms/";

          zip.file(folderPath + file.filename, blob);
        } catch (error) {
          console.error(`Error downloading ${file.filename}:`, error);
          toast.error(`Failed to download ${file.filename}`);
        }
      });

      await Promise.all(downloadPromises);

      // Generate ZIP file
      toast.info("Creating ZIP archive...");
      const content = await zip.generateAsync({ type: "blob" });

      // Create download
      const residentName = resident
        ? `${resident.firstName}-${resident.lastName}`
        : "resident";
      const zipFilename = `${folderName}-${residentName}-files.zip`;

      const downloadUrl = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = zipFilename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast.success(`Downloaded ${files.length} files successfully`);
    } catch (error) {
      console.error("Error creating folder download:", error);
      toast.error("Failed to download folder");
    }
  };

  // Handler to close dialog and reset state
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setReviewFormData(null);
  };

  return (
    <div className="w-[500px] border-l bg-background flex flex-col overflow-hidden fixed right-0 top-0 bottom-0 z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">{folderName}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm font-medium">Forms</p>
          {forms?.map((form) => {
            const formKey = form.key as CareFileFormKey;
            const formState = getFormState(formKey);
            const showDownload = canDownloadPdf(formKey);

            return (
              <div
                key={form.key}
                className="text-sm font-medium flex flex-row justify-between items-center gap-2 px-0.5 py-0.5 cursor-pointer hover:bg-muted/50 hover:text-primary rounded-md group"
                onClick={() => handleCareFileClick(form.key)}
              >
                <div className="flex flex-row items-center gap-2">
                  <FormStatusIndicator
                    status={formState.status}
                    className="h-4 max-w-4"
                  />
                  <p className="overflow-ellipsis overflow-hidden whitespace-nowrap max-w-full">
                    {form.value}
                  </p>
                  <FormStatusBadge
                    status={formState.status}
                    isAudited={formState.isAudited}
                  />
                </div>
                {showDownload && (
                  <DownloadIcon
                    className="h-4 w-4 text-muted-foreground/70 hover:text-primary cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPDF(formKey);
                    }}
                  />
                )}
              </div>
            );
          })}
          {carePlan && (
            <>
              <div className="flex flex-row justify-between items-center gap-2 mt-10">
                <p className="text-muted-foreground text-sm font-medium">
                  Care plans
                </p>
                <CarePlanDialog
                  teamId={activeTeamId}
                  organizationId={activeOrg?.id ?? ""}
                  residentId={residentId}
                  userId={currentUser?.user.id ?? ""}
                  userName={currentUser?.user.name ?? ""}
                  resident={resident}
                  folderKey={folderKey}
                />
              </div>
              {/* LIST OF CARE PLANS */}
              <div className="space-y-2">
                {allCarePlanForms && allCarePlanForms.length > 0 ? (
                  allCarePlanForms
                    .sort((a, b) => b._creationTime - a._creationTime)
                    .map((form, index) => (
                      <PdfFileItem
                        key={form._id}
                        isCarePlan
                        file={{
                          formKey: "care-plan-form",
                          formId: form._id,
                          name:
                            form.nameOfCarePlan || "Care Plan Assessment",
                          completedAt: form._creationTime,
                          isLatest: index === 0
                        }}
                      />
                    ))
                ) : (
                  /* Dummy Care Plans */
                  [
                    {
                      name: "Mobility and Falls Prevention",
                      date: Date.now() - 7 * 24 * 60 * 60 * 1000
                    },
                    {
                      name: "Nutrition and Hydration",
                      date: Date.now() - 14 * 24 * 60 * 60 * 1000
                    },
                    {
                      name: "Personal Care and Dignity",
                      date: Date.now() - 21 * 24 * 60 * 60 * 1000
                    },
                    {
                      name: "Medication Management",
                      date: Date.now() - 28 * 24 * 60 * 60 * 1000
                    },
                    {
                      name: "Social and Emotional Wellbeing",
                      date: Date.now() - 35 * 24 * 60 * 60 * 1000
                    }
                  ].map((dummyPlan, index) => (
                    <div
                      key={`dummy-${index}`}
                      className="flex items-center justify-between rounded-md hover:bg-muted/50 transition-colors px-2 py-2 border cursor-pointer"
                      onClick={() => onCarePlanClick(dummyPlan)}
                    >
                      <div className="flex-1 flex items-center gap-2">
                        <div className="bg-red-50 rounded-md">
                          <FileIcon className="w-4 h-4 text-red-500 m-1.5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-primary">
                              {dummyPlan.name}.pdf
                            </p>
                          </div>
                          <div className="flex flex-row items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              Created:{" "}
                              {new Date(dummyPlan.date).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                }
                              )}
                            </p>
                            {index === 0 && (
                              <span className="text-xs px-1 bg-blue-50 text-blue-700 rounded-full">
                                Latest
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <CarePlanEvaluationDialog />
                        <DownloadIcon className="h-4 w-4 text-muted-foreground/70 hover:text-primary cursor-pointer opacity-50" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          <div className="flex flex-row justify-between items-center gap-2 mt-10">
            <p className="text-muted-foreground text-sm font-medium">
              Files
            </p>
            <UploadFileModal
              folderName={folderName}
              residentId={residentId}
            />
          </div>
          <div className="space-y-2">
            {(() => {
              // Check if any form queries are still loading
              const formLoadingStates = [
                { key: "preAdmission-form", data: allPreAdmissionForms },
                {
                  key: "infection-prevention",
                  data: allInfectionPreventionForms
                },
                { key: "blader-bowel-form", data: allBladderBowelForms },
                {
                  key: "moving-handling-form",
                  data: allMovingHandlingForms
                },
                {
                  key: "long-term-fall-risk-form",
                  data: allLongTermFallsForms
                },
                { key: "admission-form", data: allAdmissionForms },
                {
                  key: "photography-consent",
                  data: allPhotographyConsentForms
                },
                { key: "dnacpr", data: allDnacprForms },
                { key: "peep", data: allPeepForms },
                {
                  key: "dependency-assessment",
                  data: allDependencyAssessmentForms
                },
                { key: "timl", data: allTimlAssessmentForms },
                { key: "skin-integrity-form", data: allSkinIntegrityForms },
                {
                  key: "resident-valuables-form",
                  data: allResidentValuablesForms
                }
              ];

              const isLoadingAnyForms = formLoadingStates.some(
                ({ key, data }) =>
                  folderFormKeys.includes(key as any) && data === undefined
              );

              if (isLoadingAnyForms) {
                return (
                  <div className="w-full text-center p-2 py-6 border rounded-md bg-muted/60 text-muted-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
                      Loading form data...
                    </div>
                  </div>
                );
              }

              return (
                <>
                  {/* Generated PDFs from forms */}
                  {folderPdfFiles.length > 0 && (
                    <>
                      {folderPdfFiles.map((file) => (
                        <PdfFileItem
                          key={`${file.formKey}-${file.formId}`}
                          file={file}
                        />
                      ))}
                    </>
                  )}

                  {/* Custom uploaded PDFs */}
                  {customPdfs && customPdfs.length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground font-medium">
                        Custom uploaded files:
                      </p>
                      {customPdfs.map((pdf) => (
                        <CustomPdfItem key={pdf._id} pdf={pdf} />
                      ))}
                    </>
                  )}

                  {/* Show message if no files at all */}
                  {!folderPdfFiles.length &&
                    (!customPdfs || !customPdfs.length) && (
                      <div className="w-full text-center p-2 py-6 border rounded-md bg-muted/60 text-muted-foreground text-xs">
                        No PDF files available. Complete and submit forms to
                        generate PDFs, or upload custom files.
                      </div>
                    )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <CareFileDialogRenderer
            formKey={activeDialogKey as CareFileFormKey}
            residentId={residentId}
            teamId={activeTeamId}
            organizationId={activeOrg?.id ?? ""}
            userId={currentUser?.user.id ?? ""}
            userName={currentUser?.user.name}
            resident={resident}
            careHomeName={activeOrg?.name}
            folderKey={folderKey}
            formDataForEdit={formDataForEdit}
            isReviewMode={!!reviewFormData}
            onClose={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
