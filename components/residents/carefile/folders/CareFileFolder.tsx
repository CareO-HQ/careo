"use client";

import { FolderProgressIndicator } from "@/components/residents/carefile/FolderCompletionIndicator";
import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { CareFileFormKey } from "@/types/care-files";
import { FolderIcon } from "lucide-react";
import { useRouter } from "next/navigation";

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
  residentId: string;
  canFillForms: boolean;
}

/**
 * CareFileFolder Component
 * Renders a folder in the resident care file grid.
 * Redirects to a full-page view for the specific folder.
 */
export default function CareFileFolder({
  index,
  folderName,
  folderKey,
  forms,
  residentId,
}: CareFileFolderProps) {
  const router = useRouter();
  const { getCompletedFormsCount } = useCareFileForms({ residentId });

  const folderFormKeys = (forms || []).map(
    (form) => form.key as CareFileFormKey
  );

  const completedCount = getCompletedFormsCount(folderFormKeys);
  const totalCount = folderFormKeys.length;

  const handleFolderClick = () => {
    router.push(`/dashboard/residents/${residentId}/care-file/${folderKey}` as any);
  };

  return (
    <div
      className="w-full flex flex-row justify-between items-center gap-3 hover:bg-muted/50 hover:text-primary cursor-pointer transition-colors rounded px-2 py-2 group"
      onClick={handleFolderClick}
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
