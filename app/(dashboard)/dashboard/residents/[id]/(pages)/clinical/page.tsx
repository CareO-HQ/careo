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
  Heart,
  AlertTriangle,
  Activity,
  FileText,
  Calendar,
  User,
  Plus,
  Search,
  Eye,
  Stethoscope
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

type ClinicalPageProps = {
  params: Promise<{ id: string }>;
};

export default function ClinicalPage({ params }: ClinicalPageProps) {
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

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'high':
        return { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' };
      case 'medium':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'low':
        return { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
    }
  };

  // Mock clinical data - in a real app, this would come from the API
  const mockVitalSigns = [
    { date: "2024-03-01", type: "Blood Pressure", value: "140/90 mmHg", status: "high" },
    { date: "2024-03-01", type: "Heart Rate", value: "78 bpm", status: "normal" },
    { date: "2024-03-01", type: "Temperature", value: "36.8°C", status: "normal" },
    { date: "2024-03-01", type: "Blood Sugar", value: "8.2 mmol/L", status: "high" }
  ];

  const mockAllergies = [
    { allergen: "Penicillin", reaction: "Skin rash", severity: "Moderate" },
    { allergen: "Shellfish", reaction: "Anaphylaxis", severity: "Severe" }
  ];

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
        <span className="text-foreground">Clinical</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Heart className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Clinical</h1>
            <p className="text-muted-foreground text-sm">Health conditions & medical information</p>
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
                  <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 text-xs">
                    <Heart className="w-3 h-3 mr-1" />
                    {Array.isArray(resident.healthConditions) ? resident.healthConditions.length : 0} Conditions
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Clinical Record
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/clinical/documents`)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Records
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
                  <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 text-xs">
                    <Heart className="w-3 h-3 mr-1" />
                    Clinical Information
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-red-600 text-white hover:bg-red-700 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Add Record</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/clinical/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Records
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Conditions */}
      {resident.healthConditions && resident.healthConditions.length > 0 && (
        <Card>
          <CardHeader>
            {/* Mobile Layout */}
            <CardTitle className="block sm:hidden">
              <div className="flex items-center space-x-2 mb-2">
                <Heart className="w-5 h-5 text-red-600" />
                <span>Health Conditions</span>
              </div>
              <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                {Array.isArray(resident.healthConditions) ? resident.healthConditions.length : 0} conditions
              </Badge>
            </CardTitle>
            {/* Desktop Layout */}
            <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-red-600" />
                <span>Health Conditions</span>
              </div>
              <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                {Array.isArray(resident.healthConditions) ? resident.healthConditions.length : 0} conditions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.isArray(resident.healthConditions) &&
              typeof resident.healthConditions[0] === "string"
                ? (resident.healthConditions as string[]).map((condition, index) => (
                    <Card key={index} className="border border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <Heart className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-red-800">{condition}</h3>
                            <p className="text-sm text-red-600">Chronic condition</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                : (resident.healthConditions as { condition: string }[]).map((item, index) => (
                    <Card key={index} className="border border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <Heart className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-red-800">{item.condition}</h3>
                            <p className="text-sm text-red-600">Chronic condition</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {resident.risks && resident.risks.length > 0 && (
        <Card>
          <CardHeader>
            {/* Mobile Layout */}
            <CardTitle className="block sm:hidden">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Risk Factors</span>
              </div>
              <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                {Array.isArray(resident.risks) ? resident.risks.length : 0} risks
              </Badge>
            </CardTitle>
            {/* Desktop Layout */}
            <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Risk Factors</span>
              </div>
              <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                {Array.isArray(resident.risks) ? resident.risks.length : 0} risks
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.isArray(resident.risks) &&
              typeof resident.risks[0] === "string"
                ? (resident.risks as string[]).map((risk, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200"
                    >
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <span className="font-medium text-amber-800">{risk}</span>
                      </div>
                    </div>
                  ))
                : (resident.risks as { risk: string; level?: string }[]).map((item, index) => {
                    const colors = getRiskLevelColor(item.level);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200"
                      >
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <span className="font-medium text-amber-800">{item.risk}</span>
                        </div>
                        {item.level && (
                          <Badge 
                            variant="outline"
                            className={`${colors.bg} ${colors.border} ${colors.text}`}
                          >
                            {item.level} risk
                          </Badge>
                        )}
                      </div>
                    );
                  })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Vital Signs */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>Recent Vital Signs</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {mockVitalSigns.length} recent readings
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>Recent Vital Signs</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {mockVitalSigns.length} recent readings
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockVitalSigns.map((vital, index) => (
              <Card key={index} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{vital.type}</h3>
                    <Badge 
                      variant={vital.status === 'normal' ? 'secondary' : 'destructive'}
                      className={vital.status === 'normal' 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : 'bg-red-100 text-red-700 border-red-200'
                      }
                    >
                      {vital.status}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{vital.value}</p>
                  <p className="text-sm text-gray-500 flex items-center mt-2">
                    <Calendar className="w-3 h-3 mr-1" />
                    {vital.date}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Allergies & Reactions</span>
            </div>
            <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
              {mockAllergies.length} allergies
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Allergies & Adverse Reactions</span>
            </div>
            <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
              {mockAllergies.length} allergies
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockAllergies.map((allergy, index) => (
              <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-red-800">{allergy.allergen}</h3>
                  <Badge 
                    variant="destructive"
                    className={allergy.severity === 'Severe' 
                      ? 'bg-red-200 text-red-800' 
                      : 'bg-orange-200 text-orange-800'
                    }
                  >
                    {allergy.severity}
                  </Badge>
                </div>
                <p className="text-sm text-red-600">
                  <span className="font-medium">Reaction:</span> {allergy.reaction}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clinical Notes */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span>Clinical Notes</span>
            </div>
            <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700">
              2 recent notes
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span>Clinical Notes</span>
            </div>
            <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700">
              2 recent notes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Dr. Sarah Johnson</span>
                </div>
                <span className="text-sm text-gray-500">2024-03-01</span>
              </div>
              <p className="text-sm text-gray-700">
                Patient showing good progress with mobility. Blood pressure remains elevated - 
                continue monitoring. Consider medication review with GP.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Nurse Mary Wilson</span>
                </div>
                <span className="text-sm text-gray-500">2024-02-28</span>
              </div>
              <p className="text-sm text-gray-700">
                Regular wound care completed. Healing progressing well. 
                No signs of infection observed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-600" />
            <span>Clinical Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {Array.isArray(resident.healthConditions) ? resident.healthConditions.length : 0}
              </div>
              <p className="text-sm text-red-700">Health Conditions</p>
            </div>
            
            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-600">
                {Array.isArray(resident.risks) ? resident.risks.length : 0}
              </div>
              <p className="text-sm text-amber-700">Risk Factors</p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {mockVitalSigns.length}
              </div>
              <p className="text-sm text-blue-700">Recent Vitals</p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {mockAllergies.length}
              </div>
              <p className="text-sm text-purple-700">Allergies</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Clinical Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-600" />
            <span>Clinical Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-6 h-6 mr-3" />
              Add Clinical Record
            </Button>
            <Button
             className="h-16 text-lg bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push(`/dashboard/residents/${id}/clinical/documents`)}
            >
              <Eye className="w-6 h-6 mr-3" />
              View All Records
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Development Notice */}
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Heart className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Enhanced Features Coming Soon</h3>
          <p className="text-red-600 text-sm">
            Advanced clinical assessments, medical history tracking, care plan integration, and comprehensive health analytics are in development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}