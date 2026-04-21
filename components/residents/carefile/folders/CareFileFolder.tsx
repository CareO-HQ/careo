"use client";

import { FolderProgressIndicator } from "@/components/residents/carefile/FolderCompletionIndicator";
import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { CareFileFormKey } from "@/types/care-files";
import { FolderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  basePath?: string;
  version?: 'v1' | 'v2';
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
  basePath,
  version = 'v1',
}: CareFileFolderProps) {
  const router = useRouter();
  const { getCompletedFormsCount } = useCareFileForms({ residentId });

  const folderFormKeys = (forms || []).map(
    (form) => form.key as CareFileFormKey
  );

  const completedCount = getCompletedFormsCount(folderFormKeys);
  const totalCount = folderFormKeys.length;

  const handleFolderClick = () => {
    const base = basePath || `/dashboard/residents/${residentId}/care-file`;
    router.push(`${base}/${folderKey}` as any);
  };

  if (version === 'v2') {
    // Color palette from the provided image
    const colors = [
      { bg: "bg-[#FFF9F2]", border: "border-[#FFE9D1]", text: "text-[#D97706]", num: "text-black" }, // Orange/Peach
      { bg: "bg-[#FFF4F9]", border: "border-[#FFE4F1]", text: "text-[#B91C1C]", num: "text-black" }, // Red/Pink
      { bg: "bg-[#F5F8FF]", border: "border-[#E0E7FF]", text: "text-[#1E40AF]", num: "text-black" }, // Blue
      { bg: "bg-[#F2FDF5]", border: "border-[#DCFCE7]", text: "text-[#15803D]", num: "text-black" }, // Green
      { bg: "bg-[#FCF5FF]", border: "border-[#F3E8FF]", text: "text-[#7E22CE]", num: "text-black" }, // Purple
      { bg: "bg-[#FDF2F2]", border: "border-[#FEE2E2]", text: "text-[#991B1B]", num: "text-black" }, // Dark Red
    ];

    const theme = colors[index % colors.length];

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`relative w-full aspect-[5/2] flex flex-col items-center justify-center gap-1 p-3 cursor-pointer transition-all duration-200 hover:shadow-md rounded-2xl ${theme.bg} group`}
              onClick={handleFolderClick}
            >
              <span className={`absolute top-3 left-3 text-sm font-semibold ${theme.num}`}>
                {index + 1}
              </span>

              <p className={`text-center text-base font-bold leading-tight px-1 ${theme.text}`}>
                {folderName}
              </p>

              {totalCount > 0 && (
                <div className="flex flex-col items-center">
                  <FolderProgressIndicator
                    completedCount={completedCount}
                    totalCount={totalCount}
                    className="scale-75"
                  />
                </div>
              )}
            </div>
          </TooltipTrigger>
          {forms && forms.length > 0 && (
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold text-sm mb-2">Forms in this folder:</p>
                <ul className="space-y-1">
                  {forms.map((form, idx) => (
                    <li key={form.key} className="text-xs flex items-start gap-2">
                      <span className="text-muted-foreground">{idx + 1}.</span>
                      <span>{form.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default V1 Layout (Row-based)
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
