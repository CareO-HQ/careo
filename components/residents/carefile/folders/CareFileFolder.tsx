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
import { useQuery } from "convex/react";
import { DownloadIcon, FolderIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import BladderBowelDialog from "../dialogs/ContinenceDialog";
import InfectionPreventionDialog from "../dialogs/InfectionPreventionDialog";
import PreAdmissionDialog from "../dialogs/PreAdmissionDialog";
import { FolderProgressIndicator } from "../FolderCompletionIndicator";
import FormStatusIndicator, { FormStatusBadge } from "../FormStatusIndicator";

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
  preAddissionState,
  residentId
}: CareFileFolderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDialogKey, setActiveDialogKey] = useState<string | null>(null);
  const { activeTeamId } = useActiveTeam();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: currentUser } = authClient.useSession();

  // Use our new care file forms hook
  const {
    getFormState,
    canDownloadPdf,
    areAllFormsCompleted,
    getCompletedFormsCount
  } = useCareFileForms({ residentId });

  // Get form keys for this folder
  const folderFormKeys = (forms || []).map(
    (form) => form.key as CareFileFormKey
  );
  const allFormsCompleted = areAllFormsCompleted(folderFormKeys);
  const completedCount = getCompletedFormsCount(folderFormKeys);
  const totalCount = folderFormKeys.length;

  // Get resident data for dialogs
  const resident = useQuery(api.residents.getById, {
    residentId: residentId || ("skip" as Id<"residents">)
  });

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

  const renderDialogContent = () => {
    switch (activeDialogKey) {
      case "preAdmission-form":
        return (
          <PreAdmissionDialog
            teamId={activeTeamId}
            residentId={residentId}
            organizationId={activeOrg?.id ?? ""}
            careHomeName={activeOrg?.name ?? ""}
            resident={resident}
          />
        );
      case "infection-prevention":
        return (
          <InfectionPreventionDialog
            resident={resident}
            teamId={activeTeamId}
            organizationId={activeOrg?.id ?? ""}
            userName={currentUser?.user.name ?? ""}
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
            onClose={() => setIsDialogOpen(false)}
          />
        );
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
                      <FormStatusBadge status={formState.status} />
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
              <p className="text-muted-foreground text-sm font-medium mt-10">
                Files
              </p>
              <div className="w-full text-center p-2 py-6 border rounded-md bg-muted/60 text-muted-foreground text-xs">
                Shortly you will be able to upload files here.
              </div>
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
