"use client";

import CareFileIndicator from "@/components/residents/carefile/CareFileIndicator";
import PreAdmissionDialog from "@/components/residents/carefile/dialogs/PreAdmissionDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { config } from "@/config";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function CareFilePage() {
  const careFiles = config.careFiles;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDialogKey, setActiveDialogKey] = useState<string | null>(null);
  const { activeTeamId, activeTeam } = useActiveTeam();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: currentUser } = authClient.useSession();

  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[pathname.length - 2];

  const { data: resident } = useQuery(api.residents.getById, {
    residentId: residentId
      ? (residentId as Id<"residents">)
      : ("skip" as Id<"residents">)
  });

  console.log("RESIDENT in care file page", resident);

  const handleCareFileClick = (key: string) => {
    setActiveDialogKey(key);
    setIsDialogOpen(true);
  };

  // Function to render the appropriate dialog content based on the active key
  const renderDialogContent = () => {
    switch (activeDialogKey) {
      case "preAdmission":
        return (
          <PreAdmissionDialog
            teamId={activeTeamId}
            residentId={residentId}
            organizationId={activeOrg?.id ?? ""}
            careHomeName={activeOrg?.name ?? ""}
            userName={currentUser?.user.name ?? ""}
            resident={resident}
          />
        );
      // case 'admission':
      //   return <AdmissionDialog />;
      // case 'discharge':
      //   return <DischargeDialog />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-col">
          <p className="font-semibold text-xl">Care File</p>
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
            <CareFileIndicator
              key={file.key}
              value={file.value}
              onClick={() => handleCareFileClick(file.key)}
            />
          ))}
        </TabsContent>
        <TabsContent value="to-do">
          Not done the care files for the resident.
        </TabsContent>
        <TabsContent value="done">
          Done the care files for the resident.
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="">{renderDialogContent()}</DialogContent>
      </Dialog>
    </div>
  );
}
