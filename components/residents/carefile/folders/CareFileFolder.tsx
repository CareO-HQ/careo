import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { CircleDashedIcon, FolderIcon } from "lucide-react";

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
}

export default function CareFileFolder({
  folderName,
  description,
  forms
}: CareFileFolderProps) {
  return (
    <div>
      <Sheet>
        <SheetTrigger asChild>
          <div className="w-full flex flex-row justify-start items-center gap-2 hover:bg-muted/50 hover:text-primary cursor-pointer transition-colors rounded px-1 group">
            <FolderIcon className="size-4 text-muted-foreground/70 group-hover:text-primary" />
            <p className="text-primary">{folderName}</p>
            {forms?.length && (
              <p className="text-muted-foreground text-xs">
                {forms?.length} forms
              </p>
            )}
          </div>
        </SheetTrigger>
        <SheetContent className="sm:w-[840px] w-full">
          <SheetHeader>
            <SheetTitle>{folderName}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4">
            <p className="text-muted-foreground text-xs">Forms</p>
            {forms?.map((form) => (
              <div
                key={form.key}
                className="text-sm font-medium flex flex-row items-center gap-2"
              >
                <CircleDashedIcon className="h-4 max-w-4 text-muted-foreground/70" />
                <p className="overflow-ellipsis overflow-hidden whitespace-nowrap max-w-full">
                  {form.value}
                </p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
