"use client";

import CareFileFolder from "@/components/residents/carefile/folders/CareFileFolder";
import { Button } from "@/components/ui/button";
import { config } from "@/config";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { DownloadIcon } from "lucide-react";
import { usePathname } from "next/navigation";

export default function CareFilePage() {
  const careFiles = config.careFiles;

  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[pathname.length - 2] as Id<"residents">;

  const preAddissionState = useQuery(
    api.careFiles.preadmission.hasPreAdmissionForm,
    {
      residentId: residentId as Id<"residents">
    }
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-col">
          <p className="font-semibold text-xl">Care File</p>
          <p className="text-sm text-muted-foreground">
            Create and manage the care files for the resident.
          </p>
        </div>
        <Button variant="ghost" disabled>
          <DownloadIcon />
          Download all files
        </Button>
      </div>
      <div className="flex flex-col max-w-md">
        {careFiles.map(
          (file, index) =>
            file.type === "folder" && (
              <CareFileFolder
                index={index}
                key={file.key}
                folderName={file.value}
                folderKey={file.key}
                carePlan={file.carePlan}
                description={file.description}
                forms={file.forms}
                preAddissionState={preAddissionState}
                residentId={residentId}
              />
            )
        )}
      </div>
    </div>
  );
}
