"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingDown,
  AlertTriangle,
  FileText,
  Calendar,
  Clock,
  User,
  Plus,
  Download,
  Eye,
  FileDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { ComprehensiveIncidentForm } from "./components/comprehensive-incident-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type IncidentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function IncidentsPage({ params }: IncidentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [showReportForm, setShowReportForm] = React.useState(false);
  const [selectedIncident, setSelectedIncident] = React.useState<any>(null);
  const [showViewDialog, setShowViewDialog] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  const incidents = useQuery(api.incidents.getByResident, {
    residentId: id as Id<"residents">
  });

  const incidentStats = useQuery(api.incidents.getIncidentStats, {
    residentId: id as Id<"residents">
  });

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

  const handleViewIncident = (incidentId: string) => {
    const incident = incidents?.find(i => i._id === incidentId);
    if (incident) {
      setSelectedIncident(incident);
      setShowViewDialog(true);
    }
  };

  const handleDownloadIncident = async (incidentId: string) => {
    try {
      const incident = incidents?.find(i => i._id === incidentId);
      if (!incident) {
        toast.error("Incident not found");
        return;
      }

      // Generate PDF content
      const pdfContent = generateIncidentPDF(incident);

      // Create a blob and download
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-report-${incident.date}-${incidentId.slice(-6)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Incident report downloaded successfully");
    } catch (error) {
      console.error("Error downloading incident:", error);
      toast.error("Failed to download incident report");
    }
  };

  const generateIncidentPDF = (incident: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Incident Report - ${incident.date}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 20px; }
            .section { margin-bottom: 20px; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .header { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Incident Report</h1>
            <div class="field">
              <span class="label">Resident:</span>
              <span class="value">${fullName}</span>
            </div>
            <div class="field">
              <span class="label">Report Date:</span>
              <span class="value">${incident.date} ${incident.time}</span>
            </div>
          </div>
          
          <div class="section">
            <h2>Incident Details</h2>
            <div class="field">
              <span class="label">Type:</span>
              <span class="value">${incident.incidentTypes?.join(", ") || "N/A"}</span>
            </div>
            <div class="field">
              <span class="label">Level:</span>
              <span class="value">${incident.incidentLevel?.replace("_", " ").toUpperCase() || "N/A"}</span>
            </div>
            <div class="field">
              <span class="label">Location:</span>
              <span class="value">${incident.homeName} - ${incident.unit}</span>
            </div>
          </div>

          <div class="section">
            <h2>Description</h2>
            <p>${incident.detailedDescription || "No description provided"}</p>
          </div>

          <div class="section">
            <h2>Injured Person</h2>
            <div class="field">
              <span class="label">Name:</span>
              <span class="value">${incident.injuredPersonFirstName} ${incident.injuredPersonSurname}</span>
            </div>
            <div class="field">
              <span class="label">DOB:</span>
              <span class="value">${incident.injuredPersonDOB}</span>
            </div>
            <div class="field">
              <span class="label">Status:</span>
              <span class="value">${incident.injuredPersonStatus?.join(", ") || "N/A"}</span>
            </div>
          </div>

          ${incident.treatmentTypes && incident.treatmentTypes.length > 0 ? `
          <div class="section">
            <h2>Treatment</h2>
            <div class="field">
              <span class="label">Types:</span>
              <span class="value">${incident.treatmentTypes.join(", ")}</span>
            </div>
            ${incident.treatmentDetails ? `
            <div class="field">
              <span class="label">Details:</span>
              <span class="value">${incident.treatmentDetails}</span>
            </div>
            ` : ''}
          </div>
          ` : ''}

          <div class="section">
            <h2>Report Completion</h2>
            <div class="field">
              <span class="label">Completed By:</span>
              <span class="value">${incident.completedByFullName}</span>
            </div>
            <div class="field">
              <span class="label">Job Title:</span>
              <span class="value">${incident.completedByJobTitle}</span>
            </div>
            <div class="field">
              <span class="label">Date Completed:</span>
              <span class="value">${incident.dateCompleted}</span>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Pagination logic
  const totalIncidents = incidents?.length || 0;
  const totalPages = Math.ceil(totalIncidents / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIncidents = incidents?.slice(startIndex, endIndex) || [];
  const showPagination = totalIncidents > itemsPerPage;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Format incident data for display
  const formattedIncidents = incidents?.map(incident => ({
    id: incident._id,
    date: incident.date,
    time: incident.time,
    type: incident.type,
    severity: incident.severity,
    location: incident.location,
    description: incident.description,
    reportedBy: incident.reportedBy,
    actionTaken: incident.immediateAction,
    followUp: incident.followUpRequired || "No follow-up required"
  })) || [];

  const mockFallsRiskAssessment = {
    lastAssessment: "2024-02-01",
    riskLevel: "Medium",
    score: 6,
    maxScore: 10,
    factors: [
      { factor: "Previous falls", present: true, points: 2 },
      { factor: "Mobility impairment", present: true, points: 2 },
      { factor: "Medication effects", present: true, points: 1 },
      { factor: "Cognitive impairment", present: false, points: 0 },
      { factor: "Environmental hazards", present: true, points: 1 }
    ]
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
      case 'severe':
        return { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' };
      case 'medium':
      case 'moderate':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'low':
      case 'minor':
        return { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fall':
        return { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' };
      case 'medication_error':
        return { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700' };
      case 'injury':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'behavioral':
        return { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' };
      case 'skin_integrity':
        return { bg: 'bg-pink-100', border: 'border-pink-200', text: 'text-pink-700' };
      default:
        return { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' };
    }
  };

  const formatTypeLabel = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatSeverityLabel = (severity: string) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl">
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
        <span className="text-foreground">Incidents & Falls</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <TrendingDown className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Incidents & Falls</h1>
            <p className="text-muted-foreground text-sm">Safety records & incident reporting</p>
          </div>
        </div>
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
                  <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {mockFallsRiskAssessment.riskLevel} Risk
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                className="bg-black hover:bg-gray-800 text-white"
                onClick={() => setShowReportForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Report Incident
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
                  <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {mockFallsRiskAssessment.riskLevel} Risk
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="bg-black hover:bg-gray-800 text-white"
                onClick={() => setShowReportForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Report Incident
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Recent Incidents */}
      <Card className="border-0">
        <CardHeader className="">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">Recent Incidents</span>
            </CardTitle>
            <Badge variant="secondary">{incidents?.length || 0} Total</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!incidents || incidents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No incidents recorded</p>
              <p className="text-gray-400 text-sm mt-1">
                Click the Report New Incident button to add the first incident
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedIncidents.map((incident) => (
                <div
                  key={incident._id}
                  className="flex items-center justify-between p-4 rounded-lg"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {incident.incidentTypes?.join(", ") || "Incident"}
                        </h4>
                        <Badge
                          variant={
                            incident.incidentLevel === "death" ? "destructive" :
                              incident.incidentLevel === "permanent_harm" ? "destructive" :
                                incident.incidentLevel === "minor_injury" ? "secondary" :
                                  incident.incidentLevel === "no_harm" ? "outline" :
                                    "default"
                          }
                          className="text-xs"
                        >
                          {incident.incidentLevel
                            ?.replace("_", " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (c) => c.toUpperCase())}

                        </Badge>
                      </div>
                    
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(incident.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{incident.time}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{incident.completedByFullName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleViewIncident(incident._id)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDownloadIncident(incident._id)}
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Pagination Controls */}
              {showPagination && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalIncidents)} of {totalIncidents} incidents
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Incident Summary */}
      <Card className="border-0">
        <CardHeader className="">
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-gray-900">Incident Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-4 border border-orange-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {incidentStats?.totalIncidents || 0}
                </div>
                <p className="text-sm font-medium text-orange-700">Total Incidents</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <AlertTriangle className="w-16 h-16 text-orange-600" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-red-100 p-4 border border-red-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {incidentStats?.fallsCount || 0}
                </div>
                <p className="text-sm font-medium text-red-700">Falls Recorded</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <TrendingDown className="w-16 h-16 text-red-600" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {mockFallsRiskAssessment.score}/10
                </div>
                <p className="text-sm font-medium text-blue-700">Risk Score</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 border border-green-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {incidentStats?.daysSinceLastIncident || 0}
                </div>
                <p className="text-sm font-medium text-green-700">Days Incident-Free</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Incident Form */}
      {resident && (
        <ComprehensiveIncidentForm
          residentId={id}
          residentName={`${resident.firstName} ${resident.lastName}`}
          isOpen={showReportForm}
          onClose={() => setShowReportForm(false)}
          onSuccess={() => {
            // Refresh incidents data when a new report is submitted
            setShowReportForm(false);
          }}
        />
      )}

      {/* View Incident Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Incident Report Details</DialogTitle>
            <DialogDescription>
              Complete incident report for {fullName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedIncident && (
              <div className="space-y-6">
                {/* Incident Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Incident Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">{selectedIncident.date} at {selectedIncident.time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Incident Level</p>
                      <Badge
                        variant={
                          selectedIncident.incidentLevel === "death" ? "destructive" :
                            selectedIncident.incidentLevel === "permanent_harm" ? "destructive" :
                              selectedIncident.incidentLevel === "minor_injury" ? "secondary" :
                                "outline"
                        }
                      >
                        {selectedIncident.incidentLevel?.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{selectedIncident.homeName} - {selectedIncident.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Incident Types</p>
                      <p className="font-medium">{selectedIncident.incidentTypes?.join(", ") || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Detailed Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedIncident.detailedDescription}</p>
                </div>

                {/* Injured Person Details */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Injured Person Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{selectedIncident.injuredPersonFirstName} {selectedIncident.injuredPersonSurname}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">{selectedIncident.injuredPersonDOB}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium">{selectedIncident.injuredPersonStatus?.join(", ") || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Health Care Number</p>
                      <p className="font-medium">{selectedIncident.healthCareNumber || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Injury Details */}
                {(selectedIncident.injuryDescription || selectedIncident.bodyPartInjured) && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Injury Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedIncident.injuryDescription && (
                        <div>
                          <p className="text-sm text-gray-500">Injury Description</p>
                          <p className="font-medium">{selectedIncident.injuryDescription}</p>
                        </div>
                      )}
                      {selectedIncident.bodyPartInjured && (
                        <div>
                          <p className="text-sm text-gray-500">Body Part Injured</p>
                          <p className="font-medium">{selectedIncident.bodyPartInjured}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Treatment */}
                {(selectedIncident.treatmentTypes?.length > 0 || selectedIncident.treatmentDetails) && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Treatment</h3>
                    <div className="space-y-3">
                      {selectedIncident.treatmentTypes?.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500">Treatment Types</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedIncident.treatmentTypes.map((type: string, index: number) => (
                              <Badge key={index} variant="secondary">{type}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedIncident.treatmentDetails && (
                        <div>
                          <p className="text-sm text-gray-500">Treatment Details</p>
                          <p className="font-medium">{selectedIncident.treatmentDetails}</p>
                        </div>
                      )}
                      {selectedIncident.vitalSigns && (
                        <div>
                          <p className="text-sm text-gray-500">Vital Signs</p>
                          <p className="font-medium">{selectedIncident.vitalSigns}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Witnesses */}
                {(selectedIncident.witness1Name || selectedIncident.witness2Name) && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Witnesses</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedIncident.witness1Name && (
                        <div>
                          <p className="text-sm text-gray-500">Witness 1</p>
                          <p className="font-medium">{selectedIncident.witness1Name}</p>
                          {selectedIncident.witness1Contact && (
                            <p className="text-sm text-gray-600">{selectedIncident.witness1Contact}</p>
                          )}
                        </div>
                      )}
                      {selectedIncident.witness2Name && (
                        <div>
                          <p className="text-sm text-gray-500">Witness 2</p>
                          <p className="font-medium">{selectedIncident.witness2Name}</p>
                          {selectedIncident.witness2Contact && (
                            <p className="text-sm text-gray-600">{selectedIncident.witness2Contact}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions Taken */}
                {selectedIncident.nurseActions?.length > 0 && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Nurse Actions Taken</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedIncident.nurseActions.map((action: string, index: number) => (
                        <Badge key={index} variant="outline">{action}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Report Completion */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Report Completion</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Completed By</p>
                      <p className="font-medium">{selectedIncident.completedByFullName}</p>
                      <p className="text-sm text-gray-600">{selectedIncident.completedByJobTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date Completed</p>
                      <p className="font-medium">{selectedIncident.dateCompleted}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowViewDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => handleDownloadIncident(selectedIncident._id)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}