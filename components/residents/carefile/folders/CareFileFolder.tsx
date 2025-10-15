"use client";

import { FolderProgressIndicator } from "@/components/residents/carefile/FolderCompletionIndicator";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { authClient } from "@/lib/auth-client";
import { CareFileFormKey } from "@/types/care-files";
import { useQuery } from "convex/react";
import { FolderIcon } from "lucide-react";
import { useState } from "react";

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
  residentId: Id<"residents">;
  onFolderClick: () => void;
  isSelected: boolean;
}

export default function CareFileFolder({
  index,
  folderName,
  folderKey,
  carePlan,
  description,
  forms,
  residentId,
  onFolderClick,
  isSelected
}: CareFileFolderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDialogKey, setActiveDialogKey] = useState<string | null>(null);
  const [reviewFormData, setReviewFormData] = useState<{
    formType: string;
    formId: string;
    formDisplayName: string;
  } | null>(null);
  const { activeTeamId } = useActiveTeam();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: currentUser } = authClient.useSession();

  const { getCompletedFormsCount } = useCareFileForms({ residentId });

  const folderFormKeys = (forms || []).map(
    (form) => form.key as CareFileFormKey
  );
  const completedCount = getCompletedFormsCount(folderFormKeys);
  const totalCount = folderFormKeys.length;

  const resident = useQuery(api.residents.getById, {
    residentId: residentId || ("skip" as Id<"residents">)
  });

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

  // Handler to close dialog and reset state
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setReviewFormData(null);
  };

  return (
    <div>
      <div
        onClick={onFolderClick}
        className={`w-full flex flex-row justify-between items-center gap-2 hover:bg-muted/50 hover:text-primary cursor-pointer transition-colors rounded px-1 group ${
          isSelected ? "bg-muted/50" : ""
        }`}
      >
        <div className="flex flex-row items-center gap-2">
          <FolderIcon className="size-4 text-muted-foreground/70 group-hover:text-primary" />

          <p className="text-primary">
            {index + 1}. {folderName}
          </p>
          {forms && forms.length >= 1 && (
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
