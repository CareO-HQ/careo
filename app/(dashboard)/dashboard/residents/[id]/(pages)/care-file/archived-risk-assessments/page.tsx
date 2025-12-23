"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft, Eye, Archive } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useState } from "react";
import RiskAssessmentViewDialog from "@/components/residents/carefile/folders/RiskAssessmentViewDialog";

export default function ArchivedRiskAssessmentsPage() {
  const router = useRouter();
  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[3] as Id<"residents">;

  const [viewingAssessment, setViewingAssessment] = useState<{
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    category: string;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const resident = useQuery(api.residents.getById, {
    residentId: residentId as Id<"residents">
  });

  // Fetch archived assessments for this resident from all 10 assessment types
  const archivedPreAdmission = useQuery(
    api.careFiles.preadmission.getArchivedForResident,
    { residentId: residentId as Id<"residents"> }
  );

  const archivedAdmission = useQuery(
    api.careFiles.admission.getArchivedForResident,
    { residentId: residentId as Id<"residents"> }
  );

  const archivedPhotographyConsent = useQuery(
    api.careFiles.photographyConsent.getArchivedForResident,
    { residentId: residentId as Id<"residents"> }
  );

  const archivedDnacpr = useQuery(
    api.careFiles.dnacpr.getArchivedForResident,
    { residentId: residentId as Id<"residents"> }
  );

  const archivedPeep = useQuery(
    api.careFiles.peep.getArchivedForResident,
    { residentId: residentId as Id<"residents"> }
  );

  const archivedDependency = useQuery(
    api.careFiles.dependency.getArchivedForResident,
    { residentId: residentId as Id<"residents"> }
  );

  const archivedTiml = useQuery(
    api.careFiles.timl.getArchivedForResident,
    { residentId: residentId as Id<"residents"> }
  );

  const archivedSkinIntegrity = useQuery(
    api.careFiles.skinIntegrity.getArchivedForResident,
    { residentId: residentId as Id<"residents"> }
  );

  const archivedResidentValuables = useQuery(
    api.careFiles.residentValuables.getArchivedForResident,
    { residentId: residentId as Id<"residents"> }
  );

  const archivedHandlingProfile = useQuery(
    api.careFiles.handlingProfile.getArchivedForResident,
    { residentId: residentId as Id<"residents"> }
  );

  if (
    resident === undefined ||
    archivedPreAdmission === undefined ||
    archivedAdmission === undefined ||
    archivedPhotographyConsent === undefined ||
    archivedDnacpr === undefined ||
    archivedPeep === undefined ||
    archivedDependency === undefined ||
    archivedTiml === undefined ||
    archivedSkinIntegrity === undefined ||
    archivedResidentValuables === undefined ||
    archivedHandlingProfile === undefined
  ) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading archived assessments...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
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

  // Collect all archived assessments from all 10 assessment types
  const archivedAssessments = [
    ...(archivedPreAdmission?.map(form => ({
      _id: form._id,
      key: "preAdmission-form",
      name: "Pre-Admission Assessment",
      completedAt: form._creationTime,
      folderName: "Pre-Admission",
      category: "Pre-Admission"
    })) || []),
    ...(archivedAdmission?.map(form => ({
      _id: form._id,
      key: "admission-form",
      name: "Admission Assessment",
      completedAt: form._creationTime,
      folderName: "Admission",
      category: "Admission"
    })) || []),
    ...(archivedPhotographyConsent?.map(form => ({
      _id: form._id,
      key: "photography-consent",
      name: "Photography Consent",
      completedAt: form._creationTime,
      folderName: "Admission",
      category: "Consent"
    })) || []),
    ...(archivedDnacpr?.map(form => ({
      _id: form._id,
      key: "dnacpr",
      name: "DNACPR",
      completedAt: form._creationTime,
      folderName: "DNACPR",
      category: "Medical"
    })) || []),
    ...(archivedPeep?.map(form => ({
      _id: form._id,
      key: "peep",
      name: "PEEP Assessment",
      completedAt: form._creationTime,
      folderName: "PEEP",
      category: "Emergency"
    })) || []),
    ...(archivedDependency?.map(form => ({
      _id: form._id,
      key: "dependency-assessment",
      name: "Dependency Assessment",
      completedAt: form._creationTime,
      folderName: "Dependency",
      category: "Care Assessment"
    })) || []),
    ...(archivedTiml?.map(form => ({
      _id: form._id,
      key: "timl",
      name: "This Is My Life",
      completedAt: form._creationTime,
      folderName: "My Life",
      category: "Personal"
    })) || []),
    ...(archivedSkinIntegrity?.map(form => ({
      _id: form._id,
      key: "skin-integrity-form",
      name: "Skin Integrity Assessment",
      completedAt: form._creationTime,
      folderName: "Skin Integrity",
      category: "Clinical"
    })) || []),
    ...(archivedResidentValuables?.map(form => ({
      _id: form._id,
      key: "resident-valuables-form",
      name: "Resident Valuables",
      completedAt: form._creationTime,
      folderName: "Resident Valuables",
      category: "Property"
    })) || []),
    ...(archivedHandlingProfile?.map(form => ({
      _id: form._id,
      key: "resident-handling-profile-form",
      name: "Resident Handling Profile",
      completedAt: form._creationTime,
      folderName: "Mobility & Fall",
      category: "Handling"
    })) || [])
  ];

  // Sort by completion date (most recent first)
  const sortedAssessments = archivedAssessments.sort((a, b) => {
    const aDate = a.completedAt || 0;
    const bDate = b.completedAt || 0;
    return bDate - aDate;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Pre-Admission":
        return "bg-blue-50 text-blue-700";
      case "Admission":
        return "bg-green-50 text-green-700";
      case "Consent":
        return "bg-purple-50 text-purple-700";
      case "Medical":
        return "bg-red-50 text-red-700";
      case "Emergency":
        return "bg-orange-50 text-orange-700";
      case "Care Assessment":
        return "bg-cyan-50 text-cyan-700";
      case "Personal":
        return "bg-pink-50 text-pink-700";
      case "Clinical":
        return "bg-indigo-50 text-indigo-700";
      case "Property":
        return "bg-amber-50 text-amber-700";
      case "Handling":
        return "bg-teal-50 text-teal-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const handleViewAssessment = (assessment: typeof sortedAssessments[0]) => {
    setViewingAssessment({
      formKey: assessment.key,
      formId: assessment._id,
      name: assessment.name,
      completedAt: assessment.completedAt,
      category: assessment.category
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${residentId}/care-file`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={resident.imageUrl} alt={fullName} className="border" />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-red-600" />
            <h1 className="text-xl sm:text-2xl font-bold">Archived Assessments</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            View previous versions of assessments for {resident.firstName} {resident.lastName}
          </p>
        </div>
      </div>

      {/* Archived Assessments Table */}
      <div className="rounded-lg border bg-card">
        {sortedAssessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Archive className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No Archived Assessments</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No archived assessments found. When an assessment is updated, the previous version will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Folder</TableHead>
                <TableHead>Completed At</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssessments.map((assessment) => (
                <TableRow key={assessment._id} className="bg-muted/20">
                  <TableCell className="font-medium">
                    {assessment.name}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(assessment.category)}`}>
                      {assessment.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                      {assessment.folderName}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(assessment.completedAt), "dd MMM yyyy, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                      Archived
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewAssessment(assessment)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Risk Assessment View Dialog */}
      {viewingAssessment && (
        <RiskAssessmentViewDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          assessment={viewingAssessment}
        />
      )}
    </div>
  );
}
