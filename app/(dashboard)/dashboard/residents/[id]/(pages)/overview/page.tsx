"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { Id, Doc } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateResidentDialog from "@/components/residents/CreateResidentDialog";
import { CareoAuditTable } from "@/app/(dashboard)/dashboard/audit/careo-audit-table";
import { AUDIT_QUESTIONS, getAllSections } from "@/app/(dashboard)/dashboard/audit/questions";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Calendar,
  MapPin,
  Clock,
  User,
  Mail,
  FileText,
  Users,
  Edit3,
  PhoneCall,
  ClipboardList
} from "lucide-react";
import { useRouter } from "next/navigation";

type OverviewPageProps = {
  params: Promise<{ id: string }>;
};

export default function OverviewPage({ params }: OverviewPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isAuditSheetOpen, setIsAuditSheetOpen] = React.useState(false);
  const [selectedSection, setSelectedSection] = React.useState("Section A");

  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Audit queries and mutations
  const auditResponses = useQuery(api.auditResponses.getResponsesByResident, {
    residentId: id as Id<"residents">
  });

  const sectionIssue = useQuery(api.sectionIssues.getSectionIssue, {
    residentId: id as Id<"residents">,
    section: selectedSection
  });

  // Get all section issues for this resident to show red indicators
  const allSectionIssues = useQuery(api.sectionIssues.getIssuesByResident, {
    residentId: id as Id<"residents">
  });

  const updateResponse = useMutation(api.auditResponses.updateResponse);
  const createOrUpdateSectionIssue = useMutation(api.sectionIssues.createOrUpdateSectionIssue);
  const deleteSectionIssue = useMutation(api.sectionIssues.deleteSectionIssue);

  // Get available sections
  const availableSections = getAllSections();

  // Helper function to check if a section has an active slip
  const sectionHasSlip = (section: string) => {
    return allSectionIssues?.some(issue => issue.section === section) || false;
  };

  // Get template questions for selected section
  const getSectionQuestions = (section: string) => {
    return AUDIT_QUESTIONS.filter(q => q.section === section);
  };

  // Combine template questions with resident responses
  const getAuditData = () => {
    if (!auditResponses) return {};

    const sectionQuestions = getSectionQuestions(selectedSection);
    const auditData: Record<string, any> = {};

    // Convert auditResponses array to map if needed
    const responsesMap = Array.isArray(auditResponses)
      ? auditResponses.reduce((acc, response) => {
          acc[response.questionId] = response;
          return acc;
        }, {} as Record<string, any>)
      : auditResponses;

    sectionQuestions.forEach((question: any) => {
      const response = responsesMap[question.questionId];
      auditData[question.questionId] = {
        questionId: question.questionId,
        question: question.question,
        section: selectedSection,
        status: response?.status,
        comments: response?.comments
      };
    });

    return auditData;
  };

  // Handler functions
  const handleStatusChange = async (questionId: string, status: "compliant" | "non-compliant" | "n/a") => {
    if (!resident) return;

    try {
      await updateResponse({
        residentId: id as Id<"residents">,
        questionId,
        status,
        organizationId: resident.organizationId,
        teamId: resident.teamId
      });
      toast.success("Status updated successfully");
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleCommentChange = async (questionId: string, comment: string) => {
    if (!resident) return;

    try {
      await updateResponse({
        residentId: id as Id<"residents">,
        questionId,
        comments: comment,
        organizationId: resident.organizationId,
        teamId: resident.teamId
      });
      toast.success("Comment updated successfully");
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleCreateIssue = async (issueData: {
    title: string;
    assignee?: Id<"users">;
    dueDate?: string;
    priority?: "low" | "medium" | "high";
    description?: string;
  }) => {
    if (!resident) return;

    try {
      await createOrUpdateSectionIssue({
        residentId: id as Id<"residents">,
        section: selectedSection,
        title: issueData.title,
        assigneeId: issueData.assignee,
        dueDate: issueData.dueDate ? new Date(issueData.dueDate).getTime() : undefined,
        priority: issueData.priority,
        description: issueData.description,
        organizationId: resident.organizationId,
        teamId: resident.teamId
      });
      toast.success("Issue created/updated successfully");
    } catch (error) {
      console.error("Failed to create/update issue:", error);
      toast.error("Failed to create/update issue");
    }
  };

  const handleDeleteIssue = async (issueId: Id<"sectionIssues">) => {
    try {
      await deleteSectionIssue({ issueId });
      toast.success("CareO Slip cleared successfully");
    } catch (error) {
      console.error("Failed to clear slip:", error);
      toast.error("Failed to clear CareO Slip");
    }
  };

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
  const initials =
    `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

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

  const calculateLengthOfStay = (admissionDate: string) => {
    const today = new Date();
    const admission = new Date(admissionDate);
    const diffTime = Math.abs(today.getTime() - admission.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''} ${remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          {fullName}
        </Button>
        <span>/</span>
        <span className="text-foreground">Overview</span>
      </div>

      {/* Header with Back Button and CareO Audit */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Overview</h1>
              <p className="text-muted-foreground text-sm">Basic information & summary</p>
            </div>
          </div>
        </div>

        {/* CareO Audit Button */}
        <Sheet open={isAuditSheetOpen} onOpenChange={setIsAuditSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              CareO Audit
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[50vw] sm:max-w-none max-w-none h-screen p-0 flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <SheetHeader>
                <SheetTitle>CareO Audit - {fullName}</SheetTitle>
                <SheetDescription>
                  Audit questions and compliance status for {fullName}
                </SheetDescription>
              </SheetHeader>

              {/* Section selector and actions */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Select
                    value={selectedSection}
                    onValueChange={setSelectedSection}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select section..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((section) => (
                        <SelectItem
                          key={section}
                          value={section}
                          className={sectionHasSlip(section) ? "text-red-600 font-medium" : ""}
                        >
                          <div className="flex items-center gap-2">
                            {sectionHasSlip(section) && (
                              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                            {section}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {Object.keys(getAuditData()).length > 0 && (
                    <div className="text-sm text-gray-600">
                      {Object.keys(getAuditData()).length} items in {selectedSection}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Audit table - takes remaining space */}
            <div className="flex-1 min-h-0 px-6">
              <CareoAuditTable
                residentId={id as Id<"residents">}
                auditData={getAuditData()}
                onStatusChange={handleStatusChange}
                onCommentChange={handleCommentChange}
                onCreateIssue={handleCreateIssue}
                onDeleteIssue={handleDeleteIssue}
                sectionIssue={sectionIssue}
                currentSection={selectedSection}
                isLoading={auditResponses === undefined}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Resident Info Card - Matching daily-care pattern */}
      <Card className="border-0">
        <CardContent className="p-4">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-4 sm:hidden">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{fullName}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {calculateAge(resident.dateOfBirth)} years old
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="h-8 w-8 p-0"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-15 h-15">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{fullName}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {calculateAge(resident.dateOfBirth)} years old
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {calculateLengthOfStay(resident.admissionDate)} stay
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="h-8 w-8 p-0"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Quick Overview</span>
            </div>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Quick Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {calculateAge(resident.dateOfBirth)}
              </div>
              <p className="text-sm text-blue-700">Years Old</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {calculateLengthOfStay(resident.admissionDate).split(' ')[0]}
              </div>
              <p className="text-sm text-green-700">
                {calculateLengthOfStay(resident.admissionDate).includes('day') ? 'Days' : 
                 calculateLengthOfStay(resident.admissionDate).includes('month') ? 'Months' : 'Years'} Here
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {resident.emergencyContacts?.length || 0}
              </div>
              <p className="text-sm text-purple-700">Emergency Contacts</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {resident.roomNumber ? 1 : 0}
              </div>
              <p className="text-sm text-orange-700">Room Assigned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Personal Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Full Name</p>
                <p className="font-medium text-sm">{fullName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Date of Birth</p>
                <p className="font-medium text-sm">{resident.dateOfBirth}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Room Number</p>
                <p className="font-medium text-sm">{resident.roomNumber || "Not assigned"}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Clock className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Admission Date</p>
                <p className="font-medium text-sm">{resident.admissionDate}</p>
              </div>
            </div>

            {resident.phoneNumber && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Phone Number</p>
                  <p className="font-medium text-sm">{resident.phoneNumber}</p>
                </div>
              </div>
            )}

            {resident.nhsHealthNumber && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">NHS Health Number</p>
                  <p className="font-medium font-mono text-sm">{resident.nhsHealthNumber}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5 text-blue-600" />
              <span>Key Contacts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Next of Kin / Emergency Contacts */}
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center">
                  <Users className="w-4 h-4 text-red-600 mr-2" />
                  Next of Kin 
                </h4>
                {resident.emergencyContacts && resident.emergencyContacts.length > 0 ? (
                  <div className="space-y-3">
                    {resident.emergencyContacts.map((contact: Doc<"emergencyContacts">, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-sm text-gray-900">{contact.name}</h5>
                          {contact.isPrimary && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Relationship:</span> {contact.relationship}
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Phone:</span> {contact.phoneNumber}
                          </p>
                          {contact.address && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Address:</span> {contact.address}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <Users className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No emergency contacts on file</p>
                  </div>
                )}
              </div>

              {/* GP Details */}
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center">
                  <FileText className="w-4 h-4 text-blue-600 mr-2" />
                  GP Details
                </h4>
                {resident.gpName || resident.gpPhone || resident.gpAddress ? (
                  <div className="p-3 border rounded-lg">
                    <div className="mb-2">
                      <h5 className="font-semibold text-sm text-gray-900">
                        {resident.gpName || "General Practitioner"}
                      </h5>
                    </div>
                    <div className="space-y-1">
                      {resident.gpPhone && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Phone:</span> {resident.gpPhone}
                        </p>
                      )}
                      {resident.gpAddress && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Address:</span> {resident.gpAddress}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <FileText className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No GP details on file</p>
                  </div>
                )}
              </div>

              {/* Care Manager Details */}
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center">
                  <User className="w-4 h-4 text-green-600 mr-2" />
                  Care Manager
                </h4>
                {resident.careManagerName || resident.careManagerPhone || resident.careManagerAddress ? (
                  <div className="p-3 border rounded-lg">
                    <div className="mb-2">
                      <h5 className="font-semibold text-sm text-gray-900">
                        {resident.careManagerName || "Care Manager"}
                      </h5>
                    </div>
                    <div className="space-y-1">
                      {resident.careManagerPhone && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Phone:</span> {resident.careManagerPhone}
                        </p>
                      )}
                      {resident.careManagerAddress && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Address:</span> {resident.careManagerAddress}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <User className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No care manager details on file</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Resident Dialog */}
      <CreateResidentDialog
        isResidentDialogOpen={isEditDialogOpen}
        setIsResidentDialogOpen={setIsEditDialogOpen}
        editMode={true}
        residentData={resident}
      />
    </div>
  );
}