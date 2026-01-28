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
import { ArrowLeft, Eye, FileText } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useFolderForms } from "@/hooks/use-folder-forms";
import { useState, useEffect } from "react";
import RiskAssessmentViewDialog from "@/components/residents/carefile/folders/RiskAssessmentViewDialog";
import { supabase } from "@/lib/supabase";

export default function AllRiskAssessmentsPage() {
  const router = useRouter();
  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[3];

  const [viewingAssessment, setViewingAssessment] = useState<{
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    category: string;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [resident, setResident] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!residentId) return;

      try {
        const { data: residentData } = await supabase
          .from('residents')
          .select('*')
          .eq('id', residentId)
          .single();
        setResident(residentData);
      } catch (error) {
        console.error("Error fetching resident:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [residentId]);

  // Fetch all assessment forms (excluding risk assessments and care plans)
  const {
    allPreAdmissionForms,
    allAdmissionForms,
    allPhotographyConsentForms,
    allDnacprForms,
    allPeepForms,
    allDependencyAssessmentForms,
    allTimlAssessmentForms,
    allSkinIntegrityForms,
    allResidentValuablesForms,
    allHandlingProfileForms
  } = useFolderForms({
    residentId,
    folderFormKeys: [
      "preAdmission-form",
      "admission-form",
      "photography-consent",
      "dnacpr",
      "peep",
      "dependency-assessment",
      "timl",
      "skin-integrity-form",
      "resident-valuables-form",
      "resident-handling-profile-form"
    ],
    organizationId: resident?.active_organization_id
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading assessments...</p>
        </div>
      </div>
    );
  }

  if (!resident) {
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

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();

  // Helper function to get only the latest form from an array
  const getLatestForm = (forms: any[] | undefined | null) => {
    if (!forms || forms.length === 0) return null;
    // Forms are already sorted by creation time (newest first) from the hook
    return forms[0];
  };

  // Collect all assessments (excluding risk assessments and care plans)
  const assessments = [
    // Pre-Admission Form
    ...(allPreAdmissionForms && allPreAdmissionForms.length > 0 ? [{
      _id: getLatestForm(allPreAdmissionForms)?._id,
      key: "preAdmission-form",
      name: "Pre-Admission Assessment",
      completedAt: getLatestForm(allPreAdmissionForms)?._creationTime,
      folderName: "Pre-Admission",
      category: "Pre-Admission"
    }] : []),

    // Admission Form
    ...(allAdmissionForms && allAdmissionForms.length > 0 ? [{
      _id: getLatestForm(allAdmissionForms)?._id,
      key: "admission-form",
      name: "Admission Assessment",
      completedAt: getLatestForm(allAdmissionForms)?._creationTime,
      folderName: "Admission",
      category: "Admission"
    }] : []),

    // Photography Consent
    ...(allPhotographyConsentForms && allPhotographyConsentForms.length > 0 ? [{
      _id: getLatestForm(allPhotographyConsentForms)?._id,
      key: "photography-consent",
      name: "Photography Consent",
      completedAt: getLatestForm(allPhotographyConsentForms)?._creationTime,
      folderName: "Admission",
      category: "Consent"
    }] : []),

    // DNACPR
    ...(allDnacprForms && allDnacprForms.length > 0 ? [{
      _id: getLatestForm(allDnacprForms)?._id,
      key: "dnacpr",
      name: "DNACPR",
      completedAt: getLatestForm(allDnacprForms)?._creationTime,
      folderName: "DNACPR",
      category: "Medical"
    }] : []),

    // PEEP
    ...(allPeepForms && allPeepForms.length > 0 ? [{
      _id: getLatestForm(allPeepForms)?._id,
      key: "peep",
      name: "PEEP Assessment",
      completedAt: getLatestForm(allPeepForms)?._creationTime,
      folderName: "PEEP",
      category: "Emergency"
    }] : []),

    // Dependency Assessment
    ...(allDependencyAssessmentForms && allDependencyAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allDependencyAssessmentForms)?._id,
      key: "dependency-assessment",
      name: "Dependency Assessment",
      completedAt: getLatestForm(allDependencyAssessmentForms)?._creationTime,
      folderName: "Dependency",
      category: "Care Assessment"
    }] : []),

    // This Is My Life
    ...(allTimlAssessmentForms && allTimlAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allTimlAssessmentForms)?._id,
      key: "timl",
      name: "This Is My Life",
      completedAt: getLatestForm(allTimlAssessmentForms)?._creationTime,
      folderName: "My Life",
      category: "Personal"
    }] : []),

    // Skin Integrity
    ...(allSkinIntegrityForms && allSkinIntegrityForms.length > 0 ? [{
      _id: getLatestForm(allSkinIntegrityForms)?._id,
      key: "skin-integrity-form",
      name: "Skin Integrity Assessment",
      completedAt: getLatestForm(allSkinIntegrityForms)?._creationTime,
      folderName: "Skin Integrity",
      category: "Clinical"
    }] : []),

    // Resident Valuables
    ...(allResidentValuablesForms && allResidentValuablesForms.length > 0 ? [{
      _id: getLatestForm(allResidentValuablesForms)?._id,
      key: "resident-valuables-form",
      name: "Resident Valuables",
      completedAt: getLatestForm(allResidentValuablesForms)?._creationTime,
      folderName: "Resident Valuables",
      category: "Property"
    }] : []),

    // Resident Handling Profile
    ...(allHandlingProfileForms && allHandlingProfileForms.length > 0 ? [{
      _id: getLatestForm(allHandlingProfileForms)?._id,
      key: "resident-handling-profile-form",
      name: "Resident Handling Profile",
      completedAt: getLatestForm(allHandlingProfileForms)?._creationTime,
      folderName: "Mobility & Fall",
      category: "Handling"
    }] : [])
  ].filter(assessment => assessment._id); // Remove any null entries

  // Sort by completion date (most recent first)
  const sortedAssessments = assessments.sort((a, b) => {
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
          <h1 className="text-xl sm:text-2xl font-bold">All Assessments</h1>
          <p className="text-muted-foreground text-sm">
            View all assessments for {resident.firstName} {resident.lastName}
          </p>
        </div>
      </div>

      {/* Assessments Table */}
      <div className="rounded-lg border bg-card">
        {sortedAssessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No Assessments Found</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No assessments have been completed for this resident yet. Assessments will appear here once they are created from the care file folders.
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
