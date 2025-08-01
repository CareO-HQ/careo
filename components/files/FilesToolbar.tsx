import { FileUpIcon, FolderPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function FilesToolbar() {
  return (
    <>
      <div className="flex w-full flex-row justify-between items-center">
        <div className="text-sm text-muted-foreground">Breadcrumbs</div>
        <div className="flex flex-row gap-2">
          <Button variant="outline">
            <FileUpIcon />
            Upload file
          </Button>
          <Button variant="outline">
            <FolderPlusIcon />
            Create folder
          </Button>
        </div>
      </div>
      <Separator />
    </>
  );
}
