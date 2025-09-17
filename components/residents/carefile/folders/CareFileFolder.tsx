"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { authClient } from "@/lib/auth-client";
import { CareFileFormKey } from "@/types/care-files";
import { useMutation, useQuery } from "convex/react";
import {
  DownloadIcon,
  Edit2,
  FileIcon,
  FolderIcon,
  Trash2
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import BladderBowelDialog from "../dialogs/ContinenceDialog";
import InfectionPreventionDialog from "../dialogs/InfectionPreventionDialog";
import LongTermFallRiskDialog from "../dialogs/LongTermFallRiskDialog";
import MovingHandlingDialog from "../dialogs/MovingHandlingDialog";
import PreAdmissionDialog from "../dialogs/PreAdmissionDialog";
import { FolderProgressIndicator } from "../FolderCompletionIndicator";
import FormStatusIndicator, { FormStatusBadge } from "../FormStatusIndicator";
import UploadFileModal from "./UploadFileModal";

interface CareFileFolderProps {
  folderName: string;
  description: string;
  forms:
    | {
        type: string;
        key: string;
        value: string;
      }[]
    | undefined;
  preAddissionState: boolean | undefined;
  residentId: Id<"residents">;
}

export default function CareFileFolder({
  folderName,
  description,
  forms,
  residentId
}: CareFileFolderProps) {
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

  // Use our new care file forms hook
  const { getFormState, canDownloadPdf, getCompletedFormsCount } =
    useCareFileForms({ residentId });

  // Get form keys for this folder
  const folderFormKeys = (forms || []).map(
    (form) => form.key as CareFileFormKey
  );
  const completedCount = getCompletedFormsCount(folderFormKeys);
  const totalCount = folderFormKeys.length;

  // Get resident data for dialogs
  const resident = useQuery(api.residents.getById, {
    residentId: residentId || ("skip" as Id<"residents">)
  });

  // Get unaudited forms for this folder
  const unauditedForms = useQuery(
    api.managerAudits.getUnauditedForms,
    activeOrg?.id
      ? {
          residentId: residentId,
          organizationId: activeOrg.id,
          formKeys: folderFormKeys
        }
      : "skip"
  );

  // Query custom uploaded PDFs for this folder
  const customPdfs = useQuery(
    api.careFilePdfs.getPdfsByResidentAndFolder,
    residentId ? { residentId, folderName } : "skip"
  );

  // Query all form submissions for forms in this folder to show all PDFs
  const allPreAdmissionForms = useQuery(
    api.careFiles.preadmission.getPreAdmissionFormsByResident,
    folderFormKeys.includes("preAdmission-form") && residentId
      ? { residentId }
      : "skip"
  );

  const allInfectionPreventionForms = useQuery(
    api.careFiles.infectionPrevention
      .getInfectionPreventionAssessmentsByResident,
    folderFormKeys.includes("infection-prevention") && residentId
      ? { residentId }
      : "skip"
  );

  const allBladderBowelForms = useQuery(
    api.careFiles.bladderBowel.getBladderBowelAssessmentsByResident,
    folderFormKeys.includes("blader-bowel-form") && residentId
      ? { residentId }
      : "skip"
  );

  const allMovingHandlingForms = useQuery(
    api.careFiles.movingHandling.getMovingHandlingAssessmentsByResident,
    folderFormKeys.includes("moving-handling-form") && residentId
      ? { residentId }
      : "skip"
  );

  // Helper function to get all PDFs from all form submissions
  const getAllPdfFiles = useMemo(() => {
    const pdfFiles: Array<{
      formKey: string;
      formId: string;
      name: string;
      url?: string;
      completedAt: number;
      isLatest: boolean;
    }> = [];

    // Process Pre-admission forms
    if (allPreAdmissionForms) {
      const sortedForms = [...allPreAdmissionForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "preAdmission-form",
          formId: form._id,
          name: "Pre-Admission Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Infection Prevention forms
    if (allInfectionPreventionForms) {
      const sortedForms = [...allInfectionPreventionForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "infection-prevention",
          formId: form._id,
          name: "Infection Prevention Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Bladder/Bowel forms
    if (allBladderBowelForms) {
      const sortedForms = [...allBladderBowelForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "blader-bowel-form",
          formId: form._id,
          name: "Bladder & Bowel Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Moving & Handling forms
    if (allMovingHandlingForms) {
      const sortedForms = [...allMovingHandlingForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "moving-handling-form",
          formId: form._id,
          name: "Moving & Handling Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Sort all PDFs by completion date (newest first)
    return pdfFiles.sort((a, b) => b.completedAt - a.completedAt);
  }, [
    allPreAdmissionForms,
    allInfectionPreventionForms,
    allBladderBowelForms,
    allMovingHandlingForms
  ]);

  // Component to handle individual PDF file with URL fetching
  const PdfFileItem = ({
    file
  }: {
    file: {
      formKey: string;
      formId: string;
      name: string;
      completedAt: number;
      isLatest: boolean;
    };
  }) => {
    const pdfUrl = useQuery(
      file.formKey === "preAdmission-form"
        ? api.careFiles.preadmission.getPDFUrl
        : file.formKey === "infection-prevention"
          ? api.careFiles.infectionPrevention.getPDFUrl
          : file.formKey === "blader-bowel-form"
            ? api.careFiles.bladderBowel.getPDFUrl
            : file.formKey === "moving-handling-form"
              ? api.careFiles.movingHandling.getPDFUrl
              : ("skip" as any),
      file.formKey === "preAdmission-form"
        ? { formId: file.formId as Id<"preAdmissionCareFiles"> }
        : file.formKey === "infection-prevention"
          ? {
              assessmentId: file.formId as Id<"infectionPreventionAssessments">
            }
          : file.formKey === "blader-bowel-form"
            ? { assessmentId: file.formId as Id<"bladderBowelAssessments"> }
            : file.formKey === "moving-handling-form"
              ? { assessmentId: file.formId as Id<"movingHandlingAssessments"> }
              : "skip"
    );

    if (!pdfUrl) return null;

    return (
      <div className="flex items-center justify-between rounded-md hover:bg-muted/50 transition-colors px-1">
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
    );
  };

  // Mutation to create audit records
  const createAudit = useMutation(api.managerAudits.createAudit);

  // Mutations for PDF management
  const renamePdf = useMutation(api.careFilePdfs.renamePdf);
  const deletePdf = useMutation(api.careFilePdfs.deletePdf);

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
            case "infection-prevention":
              return `infection-prevention-assessment-${baseName}.pdf`;
            case "blader-bowel-form":
              return `bladder-bowel-assessment-${baseName}.pdf`;
            case "moving-handling-form":
              return `moving-handling-assessment-${baseName}.pdf`;
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

  const downloadFromUrl = async (url: string, filename: string) => {
    const response = await fetch(url);
    const blob = await response.blob();

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

  const handleOpenReview = (formType: string, formId: string) => {
    // Store the form info for fetching data
    setReviewFormData({
      formType,
      formId,
      formDisplayName: getFormDisplayName(formType)
    });

    // Map form type to dialog key
    const dialogKeyMap: Record<string, string> = {
      movingHandlingAssessment: "moving-handling-form",
      infectionPreventionAssessment: "infection-prevention",
      bladderBowelAssessment: "blader-bowel-form",
      preAdmissionCareFile: "preAdmission-form",
      carePlanAssessment: "care-plan-form"
    };

    setActiveDialogKey(dialogKeyMap[formType]);
    setIsDialogOpen(true);
  };

  const handleCreateAudit = async (formType: string, formId: string) => {
    if (!activeOrg?.id || !activeTeamId || !currentUser?.user.id) {
      toast.error("Missing required information for audit creation");
      return;
    }

    try {
      await createAudit({
        formType: formType as any,
        formId: formId,
        residentId: residentId,
        auditedBy: currentUser.user.id,
        auditNotes: "Form audited and approved",
        teamId: activeTeamId,
        organizationId: activeOrg.id
      });
      toast.success("Audit record created successfully");
    } catch (error) {
      console.error("Error creating audit:", error);
      toast.error("Failed to create audit record");
    }
  };

  // Map form types to display names
  const getFormDisplayName = (formType: string): string => {
    const mapping: Record<string, string> = {
      preAdmissionCareFile: "Pre-Admission Care File",
      infectionPreventionAssessment: "Infection Prevention Assessment",
      bladderBowelAssessment: "Bladder & Bowel Assessment",
      movingHandlingAssessment: "Moving & Handling Assessment"
    };
    return mapping[formType] || formType;
  };

  const renderDialogContent = () => {
    const isReviewMode = !!reviewFormData;
    const editData = isReviewMode ? formDataForEdit : null;
    console.log("EDIT DATA", editData);

    // If we're in review mode and still loading data, show loading state
    if (isReviewMode && formDataForEdit === undefined) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading form data...</p>
          </div>
        </div>
      );
    }

    switch (activeDialogKey) {
      case "preAdmission-form":
        return (
          <PreAdmissionDialog
            teamId={activeTeamId}
            residentId={residentId}
            organizationId={activeOrg?.id ?? ""}
            careHomeName={activeOrg?.name ?? ""}
            resident={resident}
            initialData={editData}
            isEditMode={isReviewMode}
            onClose={() => {
              setIsDialogOpen(false);
              setReviewFormData(null);
            }}
          />
        );
      case "infection-prevention":
        return (
          <InfectionPreventionDialog
            resident={resident}
            teamId={activeTeamId}
            organizationId={activeOrg?.id ?? ""}
            userName={currentUser?.user.name ?? ""}
            initialData={editData}
            isEditMode={isReviewMode}
            onClose={() => {
              setIsDialogOpen(false);
              setReviewFormData(null);
            }}
          />
        );
      case "blader-bowel-form":
        return (
          <BladderBowelDialog
            resident={resident}
            teamId={activeTeamId}
            organizationId={activeOrg?.id ?? ""}
            residentId={residentId}
            userId={currentUser?.user.id ?? ""}
            userName={currentUser?.user.name ?? ""}
            initialData={editData}
            isEditMode={isReviewMode}
            onClose={() => {
              setIsDialogOpen(false);
              setReviewFormData(null);
            }}
          />
        );
      case "moving-handling-form":
        return (
          <MovingHandlingDialog
            resident={resident}
            teamId={activeTeamId}
            organizationId={activeOrg?.id ?? ""}
            residentId={residentId}
            userId={currentUser?.user.id ?? ""}
            userName={currentUser?.user.name ?? ""}
            initialData={editData}
            isEditMode={isReviewMode}
            onClose={() => {
              setIsDialogOpen(false);
              setReviewFormData(null);
            }}
          />
        );
      case "long-term-fall-risk-form":
        return <LongTermFallRiskDialog />;
      // case 'discharge':
      //   return <DischargeDialog />;
      default:
        return null;
    }
  };

  return (
    <div>
      <Sheet>
        <SheetTrigger asChild>
          <div className="w-full flex flex-row justify-between items-center gap-2 hover:bg-muted/50 hover:text-primary cursor-pointer transition-colors rounded px-1 group">
            <div className="flex flex-row items-center gap-2">
              <FolderIcon className="size-4 text-muted-foreground/70 group-hover:text-primary" />
              <p className="text-primary">{folderName}</p>
              {forms?.length && (
                <p className="text-muted-foreground text-xs">
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
        <SheetContent size="lg">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>{folderName}</SheetTitle>
            </div>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col justify-between h-full">
            <div className="flex flex-col gap-1 px-4">
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
                {/* Generated PDFs from forms */}
                {getAllPdfFiles.length > 0 && (
                  <>
                    {getAllPdfFiles.map((file) => (
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
                {!getAllPdfFiles.length &&
                  (!customPdfs || !customPdfs.length) && (
                    <div className="w-full text-center p-2 py-6 border rounded-md bg-muted/60 text-muted-foreground text-xs">
                      No PDF files available. Complete and submit forms to
                      generate PDFs, or upload custom files.
                    </div>
                  )}
              </div>
              <p className="text-muted-foreground text-sm font-medium mt-10">
                Manager audit
              </p>
              {unauditedForms && unauditedForms.length > 0 ? (
                <div className="space-y-2">
                  {unauditedForms.map((form: any) => (
                    <div
                      key={`${form.formType}-${form.formId}`}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-primary">
                          {getFormDisplayName(form.formType)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Completed:{" "}
                          {new Date(form.lastUpdated).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            }
                          )}
                        </p>
                      </div>
                      <div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleOpenReview(form.formType, form.formId)
                          }
                        >
                          Audit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full text-center p-2 py-6 border rounded-md bg-muted/50 text-muted-foreground text-xs">
                  {unauditedForms === undefined
                    ? "Loading audit status..."
                    : "All forms in this folder have been audited"}
                </div>
              )}
            </div>
            <div className="px-4 py-2 flex flex-row justify-end items-center">
              <Button variant="outline" size="sm" disabled>
                <DownloadIcon />
                Download folder
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="">{renderDialogContent()}</DialogContent>
      </Dialog>
    </div>
  );
}
