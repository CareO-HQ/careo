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
  Plus
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { ComprehensiveIncidentForm } from "./components/comprehensive-incident-form";

type IncidentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function IncidentsPage({ params }: IncidentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [showReportForm, setShowReportForm] = React.useState(false);
  
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
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-gray-900">Recent Incidents</span>
            </div>
            <Badge variant="outline" className="bg-white border-orange-200 text-orange-700 font-medium">
              {formattedIncidents.length} total {formattedIncidents.length === 1 ? 'incident' : 'incidents'}
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-gray-900">Recent Incidents</span>
            </div>
            <Badge variant="outline" className="bg-white border-orange-200 text-orange-700 font-medium">
              {formattedIncidents.length} total {formattedIncidents.length === 1 ? 'incident' : 'incidents'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {formattedIncidents.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {formattedIncidents.map((incident) => {
                const typeIcon = incident.type === 'fall' ? 
                  <TrendingDown className="w-5 h-5 text-white" /> : 
                  incident.type === 'medication_error' ? 
                  <AlertTriangle className="w-5 h-5 text-white" /> :
                  <FileText className="w-5 h-5 text-white" />;
                
                const iconBg = incident.type === 'fall' ? 'bg-red-500' :
                  incident.type === 'medication_error' ? 'bg-purple-500' :
                  incident.type === 'injury' ? 'bg-orange-500' :
                  'bg-blue-500';

                return (
                  <Card key={incident.id} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                    <CardContent className="p-0">
                      {/* Header Section */}
                      <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          {/* Icon - hidden on very small screens, shown on larger */}
                          <div className={`p-2 rounded-lg ${iconBg} shadow-sm flex-shrink-0 self-start hidden sm:block`}>
                            {typeIcon}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Type and Severity */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {/* Mobile icon - only shown on small screens */}
                                <div className={`p-1.5 rounded-lg ${iconBg} shadow-sm flex-shrink-0 sm:hidden`}>
                                  {React.cloneElement(typeIcon, { className: "w-4 h-4 text-white" })}
                                </div>
                                <span className="font-semibold text-gray-900 text-sm sm:text-base">
                                  {formatTypeLabel(incident.type || "")}
                                </span>
                              </div>
                              <Badge 
                                variant="outline"
                                className={`${getSeverityColor(incident.severity || "").bg} ${getSeverityColor(incident.severity || "").border} ${getSeverityColor(incident.severity || "").text} font-medium text-xs self-start sm:self-center`}
                              >
                                {formatSeverityLabel(incident.severity || "")}
                              </Badge>
                            </div>
                            
                            {/* Date, Time, Location */}
                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{new Date(incident.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                                <span>{incident.time}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="font-medium truncate">{incident.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Body Section */}
                      <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
                        {/* Description */}
                        <div className="overflow-hidden">
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Description</h4>
                          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed break-words">
                            {incident.description}
                          </p>
                        </div>

                        {/* Actions Taken */}
                        <div className="overflow-hidden">
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Immediate Action Taken</h4>
                          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed break-words">
                            {incident.actionTaken}
                          </p>
                        </div>

                        {/* Follow-up */}
                        {incident.followUp && incident.followUp !== "No follow-up required" && (
                          <div className="overflow-hidden">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Follow-up Required</h4>
                            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed break-words">
                              {incident.followUp}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="bg-gray-50 px-4 sm:px-6 py-2 sm:py-3 border-t">
                        <div className="flex items-center text-xs text-gray-600">
                          <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0 mr-1" />
                          <span className="truncate">Reported by <span className="font-medium text-gray-700">{incident.reportedBy}</span></span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">No incidents recorded</p>
              <p className="text-sm text-gray-500">This is excellent news for resident safety and care quality</p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Incident Summary */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
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
    </div>
  );
}