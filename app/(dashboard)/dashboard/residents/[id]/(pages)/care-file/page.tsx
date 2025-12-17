"use client";

import CareFileFolder from "@/components/residents/carefile/folders/CareFileFolder";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { config } from "@/config";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft, FolderIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { usePathname, useRouter } from "next/navigation";

export default function CareFilePage() {
  const careFiles = config.careFiles;
  const router = useRouter();

  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[pathname.length - 2] as Id<"residents">;

  const resident = useQuery(api.residents.getById, {
    residentId: residentId as Id<"residents">
  });

  const preAddissionState = useQuery(
    api.careFiles.preadmission.hasPreAdmissionForm,
    {
      residentId: residentId as Id<"residents">
    }
  );

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const age = calculateAge(resident.dateOfBirth);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${residentId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={resident.imageUrl} alt={fullName} className="border" />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Care File</h1>
          <p className="text-muted-foreground text-sm">
            View and manage care files for {resident.firstName} {resident.lastName}.
          </p>
        </div>
      </div>

      {/* Care Files Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Additional Folders Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* All Care Plans */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/dashboard/residents/${residentId}/care-file/all-care-plans`)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FolderIcon className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-medium">All Care Plans</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Risk Assessments */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/dashboard/residents/${residentId}/care-file/all-risk-assessments`)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FolderIcon className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="text-sm font-medium">All Risk Assessments</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archived Care Plans */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/dashboard/residents/${residentId}/care-file/archived-care-plans`)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FolderIcon className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="text-sm font-medium">Archived Care Plans</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
