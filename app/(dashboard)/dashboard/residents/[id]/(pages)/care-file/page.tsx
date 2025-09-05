"use client";

import CareFileFolder from "@/components/residents/carefile/folders/CareFileFolder";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { config } from "@/config";
import { DownloadIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

export default function CareFilePage() {
  const careFiles = config.careFiles;

  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[pathname.length - 2];

  const preAddissionState = useQuery(
    api.careFiles.preadmission.hasPreAdmissionForm,
    {
      residentId: residentId as Id<"residents">
    }
  );

  return (
    <div>
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
      <Tabs defaultValue="all" className="w-fit mt-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="to-do" disabled>
            To Do
          </TabsTrigger>
          <TabsTrigger value="done" disabled>
            Completed
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="flex flex-col gap-1 mt-2 w-md">
          {careFiles.map(
            (file) =>
              file.type === "folder" && (
                <CareFileFolder
                  key={file.key}
                  folderName={file.value}
                  description={file.description}
                  forms={file.forms}
                  preAddissionState={preAddissionState}
                />
              )
          )}
        </TabsContent>
        <TabsContent value="to-do">
          Not done the care files for the resident.
        </TabsContent>
        <TabsContent value="done">
          Done the care files for the resident.
        </TabsContent>
      </Tabs>
    </div>
  );
}
