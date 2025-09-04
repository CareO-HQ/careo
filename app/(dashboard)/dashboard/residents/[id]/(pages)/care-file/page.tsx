"use client";

import CareFileIndicator from "@/components/residents/carefile/CareFileIndicator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { config } from "@/config";
import { DownloadIcon } from "lucide-react";
import { useParams } from "next/navigation";

export default function CareFilePage() {
  const careFiles = config.careFiles;
  const { id } = useParams();
  return (
    <div>
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-col">
          <p className="font-semibold text-xl">Care File </p>
          <p className="text-sm text-muted-foreground">
            Create and manage the care files for the resident.
          </p>
        </div>
        <Button variant="ghost">
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
        <TabsContent value="all" className="flex flex-col gap-1 mt-2">
          {careFiles.map((file) => (
            <CareFileIndicator key={file.key} value={file.value} />
          ))}
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
