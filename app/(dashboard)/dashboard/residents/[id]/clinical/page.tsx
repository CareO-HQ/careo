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
  Search
} from "lucide-react";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Clinical</h1>
              <p className="text-muted-foreground">Health information for {fullName}</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Health Conditions */}
      {resident.healthConditions && resident.healthConditions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-red-600" />
                <span>Health Conditions</span>
              </div>
              <Badge variant="secondary">
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Risk Factors</span>
              </div>
              <Badge variant="secondary">
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
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span>Recent Vital Signs</span>
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Allergies & Adverse Reactions</span>
            </div>
            <Badge variant="secondary">{mockAllergies.length} allergies</Badge>
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
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <span>Clinical Notes</span>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {Array.isArray(resident.healthConditions) ? resident.healthConditions.length : 0}
            </div>
            <p className="text-sm text-muted-foreground">Health Conditions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {Array.isArray(resident.risks) ? resident.risks.length : 0}
            </div>
            <p className="text-sm text-muted-foreground">Risk Factors</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {mockVitalSigns.length}
            </div>
            <p className="text-sm text-muted-foreground">Recent Vitals</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {mockAllergies.length}
            </div>
            <p className="text-sm text-muted-foreground">Allergies</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}