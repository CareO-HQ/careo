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
import { ArrowLeft, Eye, FileText } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useFolderForms } from "@/hooks/use-folder-forms";
import { useState } from "react";
import RiskAssessmentViewDialog from "@/components/residents/carefile/folders/RiskAssessmentViewDialog";

export default function AllRiskAssessmentsPage() {
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

  // Fetch forms from different folders containing risk assessments
  const { allInfectionPreventionForms } = useFolderForms({
    residentId,
    folderFormKeys: ["infection-prevention"]
  });

  const { allMovingHandlingForms, allLongTermFallsForms } = useFolderForms({
    residentId,
    folderFormKeys: ["moving-handling-form", "long-term-fall-risk-form"],
    organizationId: resident?.organizationId
  });

  const { allBladderBowelForms } = useFolderForms({
    residentId,
    folderFormKeys: ["blader-bowel-form"]
  });

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading risk assessments...</p>
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

  // Collect all risk assessments from different folders
  const riskAssessments = [
    // Pre-admission - Infection Risk Assessment
    ...(allInfectionPreventionForms?.map(form => ({
      _id: form._id,
      key: "infection-prevention",
      name: "Infection Prevention Assessment",
      completedAt: form._creationTime,
      folderName: "Pre-Admission",
      category: "Infection Control"
    })) || []),

    // Mobility/Fall - Moving & Handling Risk Assessment
    ...(allMovingHandlingForms?.map(form => ({
      _id: form._id,
      key: "moving-handling-form",
      name: "Moving & Handling Assessment",
      completedAt: form._creationTime,
      folderName: "Mobility & Fall",
      category: "Moving & Handling"
    })) || []),

    // Mobility/Fall - Fall Risk Assessment
    ...(allLongTermFallsForms ? [{
      _id: allLongTermFallsForms._id,
      key: "long-term-fall-risk-form",
      name: "Long Term Falls Risk Assessment",
      completedAt: allLongTermFallsForms._creationTime,
      folderName: "Mobility & Fall",
      category: "Fall Risk"
    }] : []),

    // Continence - Continence Risk Assessment
    ...(allBladderBowelForms?.map(form => ({
      _id: form._id,
      key: "blader-bowel-form",
      name: "Bladder & Bowel Assessment",
      completedAt: form._creationTime,
      folderName: "Continence",
      category: "Continence"
    })) || [])
  ];

  // Sort by completion date (most recent first)
  const sortedAssessments = riskAssessments.sort((a, b) => {
    const aDate = a.completedAt || 0;
    const bDate = b.completedAt || 0;
    return bDate - aDate;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Infection Control":
        return "bg-blue-50 text-blue-700";
      case "Moving & Handling":
        return "bg-orange-50 text-orange-700";
      case "Fall Risk":
        return "bg-red-50 text-red-700";
      case "Continence":
        return "bg-purple-50 text-purple-700";
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
          <h1 className="text-xl sm:text-2xl font-bold">All Risk Assessments</h1>
          <p className="text-muted-foreground text-sm">
            View all risk assessments for {resident.firstName} {resident.lastName}
          </p>
        </div>
      </div>

      {/* Risk Assessments Table */}
      <div className="rounded-lg border bg-card">
        {sortedAssessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No Risk Assessments Found</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No risk assessments have been completed for this resident yet. Risk assessments will appear here once they are created from the care file folders.
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssessments.map((assessment) => (
                <TableRow key={assessment._id}>
                  <TableCell className="font-medium">
                    {assessment.name}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(assessment.category)}`}>
                      {assessment.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                      {assessment.folderName}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(assessment.completedAt), "dd MMM yyyy, HH:mm")}
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
