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
import {
  CircleCheckIcon,
  CircleDashedIcon,
  DownloadIcon,
  FolderIcon
} from "lucide-react";
import { useState } from "react";
import PreAdmissionDialog from "../dialogs/PreAdmissionDialog";
import { authClient } from "@/lib/auth-client";
import { useActiveTeam } from "@/hooks/use-active-team";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

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
}

export default function CareFileFolder({
  folderName,
  description,
  forms,
  preAddissionState
}: CareFileFolderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDialogKey, setActiveDialogKey] = useState<string | null>(null);
  const { activeTeamId } = useActiveTeam();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: currentUser } = authClient.useSession();

  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[pathname.length - 2];
  const resident = useQuery(api.residents.getById, {
    residentId: residentId
      ? (residentId as Id<"residents">)
      : ("skip" as Id<"residents">)
  });

  const handleCareFileClick = (key: string) => {
    console.log("key", key);
    setActiveDialogKey(key);
    setIsDialogOpen(true);
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
        <SheetContent size="lg">
          <SheetHeader>
            <SheetTitle>{folderName}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col justify-between h-full">
            <div className="flex flex-col gap-1 px-4">
              <p className="text-muted-foreground text-sm font-medium">Forms</p>
              {forms?.map((form) => (
                <div
                  key={form.key}
                  className="text-sm font-medium flex flex-row justify-between items-center gap-2 px-0.5 py-0.5 cursor-pointer hover:bg-muted/50 hover:text-primary rounded-md group"
                  onClick={() => handleCareFileClick(form.key)}
                >
                  <div className="flex flex-row items-center gap-2">
                    {preAddissionState && form.key === "preAdmission-form" ? (
                      <CircleCheckIcon className="h-4 max-w-4 text-emerald-500" />
                    ) : (
                      <CircleDashedIcon className="h-4 max-w-4 text-muted-foreground/70 group-hover:text-primary" />
                    )}
                    <p className="overflow-ellipsis overflow-hidden whitespace-nowrap max-w-full">
                      {form.value}
                    </p>
                    {preAddissionState && form.key === "preAdmission-form" && (
                      <p className="text-xs text-emerald-500 bg-emerald-50 px-1 rounded-md">
                        Completed
                      </p>
                    )}
                  </div>
                  {preAddissionState && form.key === "preAdmission-form" && (
                    <DownloadIcon className="h-4 w-4 text-muted-foreground/70 hover:text-primary" />
                  )}
                </div>
              ))}
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
