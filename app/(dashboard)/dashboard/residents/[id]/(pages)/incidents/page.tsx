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
  Filter,
  Shield,
  Eye
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

type IncidentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function IncidentsPage({ params }: IncidentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
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

  // Mock incident data - in a real app, this would come from the API
  const mockIncidents = [
    {
      id: 1,
      date: "2024-02-28",
      time: "14:30",
      type: "Fall",
      severity: "Minor",
      location: "Bedroom",
      description: "Resident slipped getting out of bed. No injuries sustained.",
      reportedBy: "Sarah Mitchell",
      actionTaken: "Assisted resident back to bed, vital signs checked, no medical attention required.",
      followUp: "Increased supervision during transfers"
    },
    {
      id: 2,
      date: "2024-02-15",
      time: "09:15",
      type: "Medication Error",
      severity: "Low",
      location: "Dining Room",
      description: "Wrong medication administered at breakfast.",
      reportedBy: "John Davies",
      actionTaken: "Doctor notified immediately, resident monitored for adverse reactions.",
      followUp: "Additional staff training on medication administration"
    }
  ];

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
      case 'medication error':
        return { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700' };
      case 'injury':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      default:
        return { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' };
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
              >
                <Plus className="w-4 h-4 mr-2" />
                Report Incident
              </Button>
              <Button
                onClick={() => router.push(`/dashboard/residents/${id}/incidents/documents`)}
                className="bg-black hover:bg-gray-800 text-white w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                View History
              </Button>
              <Button
                className="bg-black hover:bg-gray-800 text-white w-10 p-0"
              >
                <FileText className="w-4 h-4" />
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
              >
                <Plus className="w-4 h-4 mr-2" />
                Report Incident
              </Button>
              <Button
                onClick={() => router.push(`/dashboard/residents/${id}/incidents/documents`)}
                className="bg-black hover:bg-gray-800 text-white flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                View History
              </Button>
              <Button
                className="bg-black hover:bg-gray-800 text-white w-10 p-0"
              >
                <FileText className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Falls Risk Assessment */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>Falls Risk Assessment</span>
            </div>
            <Badge 
              variant="outline"
              className={getSeverityColor(mockFallsRiskAssessment.riskLevel).bg + ' ' + 
                         getSeverityColor(mockFallsRiskAssessment.riskLevel).border + ' ' +
                         getSeverityColor(mockFallsRiskAssessment.riskLevel).text}
            >
              {mockFallsRiskAssessment.riskLevel} Risk - {mockFallsRiskAssessment.score}/10
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>Falls Risk Assessment</span>
            </div>
            <Badge 
              variant="outline"
              className={getSeverityColor(mockFallsRiskAssessment.riskLevel).bg + ' ' + 
                         getSeverityColor(mockFallsRiskAssessment.riskLevel).border + ' ' +
                         getSeverityColor(mockFallsRiskAssessment.riskLevel).text}
            >
              {mockFallsRiskAssessment.riskLevel} Risk - {mockFallsRiskAssessment.score}/10
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Risk Score</span>
                <span className="text-lg font-bold">
                  {mockFallsRiskAssessment.score}/{mockFallsRiskAssessment.maxScore}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-orange-500 h-3 rounded-full" 
                  style={{ width: `${(mockFallsRiskAssessment.score / mockFallsRiskAssessment.maxScore) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Last assessed: {mockFallsRiskAssessment.lastAssessment}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Risk Factors</h4>
              <div className="space-y-2">
                {mockFallsRiskAssessment.factors.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className={factor.present ? "text-gray-900" : "text-gray-400"}>
                      {factor.factor}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {factor.points} pts
                      </span>
                      <Badge 
                        variant={factor.present ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {factor.present ? "Present" : "Not Present"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span>Recent Incidents</span>
            </div>
            <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
              {mockIncidents.length} total incidents
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span>Recent Incidents</span>
            </div>
            <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
              {mockIncidents.length} total incidents
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mockIncidents.length > 0 ? (
            <div className="space-y-4">
              {mockIncidents.map((incident) => (
                <Card key={incident.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <TrendingDown className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge 
                              variant="outline"
                              className={getTypeColor(incident.type).bg + ' ' + 
                                       getTypeColor(incident.type).border + ' ' +
                                       getTypeColor(incident.type).text}
                            >
                              {incident.type}
                            </Badge>
                            <Badge 
                              variant="outline"
                              className={getSeverityColor(incident.severity).bg + ' ' + 
                                       getSeverityColor(incident.severity).border + ' ' +
                                       getSeverityColor(incident.severity).text}
                            >
                              {incident.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{incident.date}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{incident.time}</span>
                            </div>
                            <span>Location: {incident.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Description:</span>
                        <p className="text-gray-700 mt-1">{incident.description}</p>
                      </div>
                      
                      <div>
                        <span className="font-medium">Action Taken:</span>
                        <p className="text-gray-700 mt-1">{incident.actionTaken}</p>
                      </div>
                      
                      <div>
                        <span className="font-medium">Follow-up:</span>
                        <p className="text-gray-700 mt-1">{incident.followUp}</p>
                      </div>
                      
                      <div className="flex items-center space-x-1 text-gray-500 pt-2 border-t">
                        <User className="w-3 h-3" />
                        <span>Reported by: {incident.reportedBy}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No incidents recorded</p>
              <p className="text-sm text-gray-400 mt-1">This is great news for resident safety</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safety Measures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-green-600" />
            <span>Current Safety Measures</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Fall Prevention</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Non-slip mats in bathroom</li>
                <li>• Bed rails installed</li>
                <li>• Call bell within reach</li>
                <li>• Regular mobility assessments</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Monitoring</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 15-minute safety checks</li>
                <li>• Motion sensor alerts</li>
                <li>• Staff handover reports</li>
                <li>• Family contact protocol</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incident Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <span>Incident Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {mockIncidents.length}
              </div>
              <p className="text-sm text-orange-700">Total Incidents</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {mockIncidents.filter(i => i.type === 'Fall').length}
              </div>
              <p className="text-sm text-red-700">Falls Recorded</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {mockFallsRiskAssessment.score}/10
              </div>
              <p className="text-sm text-blue-700">Risk Score</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">15</div>
              <p className="text-sm text-green-700">Days Incident-Free</p>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Development Notice */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Enhanced Features Coming Soon</h3>
          <p className="text-orange-600 text-sm">
            Advanced incident reporting, analytics, automated risk assessments, and comprehensive safety tracking features are in development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}