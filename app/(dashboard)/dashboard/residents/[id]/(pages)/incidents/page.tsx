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
  Shield
} from "lucide-react";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Incidents & Falls</h1>
              <p className="text-muted-foreground">Safety records for {fullName}</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Report Incident
          </Button>
        </div>
      </div>

      {/* Falls Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
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
              {mockFallsRiskAssessment.riskLevel} Risk
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span>Recent Incidents</span>
            </div>
            <Badge variant="secondary">{mockIncidents.length} incidents</Badge>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{mockIncidents.length}</div>
            <p className="text-sm text-muted-foreground">Total Incidents</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {mockIncidents.filter(i => i.type === 'Fall').length}
            </div>
            <p className="text-sm text-muted-foreground">Falls</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {mockFallsRiskAssessment.score}
            </div>
            <p className="text-sm text-muted-foreground">Risk Score</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">15</div>
            <p className="text-sm text-muted-foreground">Days Since Last Incident</p>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-6 text-center">
          <FileText className="w-12 h-12 text-orange-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Advanced Incident Tracking Coming Soon</h3>
          <p className="text-orange-600">
            Comprehensive incident reporting, analytics, and automated risk assessments are in development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}