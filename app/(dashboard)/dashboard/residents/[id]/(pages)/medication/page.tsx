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
  Pill,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  Plus,
  Search
} from "lucide-react";
import { useRouter } from "next/navigation";

type MedicationPageProps = {
  params: Promise<{ id: string }>;
};

export default function MedicationPage({ params }: MedicationPageProps) {
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

  // Mock medication data - in a real app, this would come from the API
  const mockMedications = [
    {
      id: 1,
      name: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      timeSlots: ["08:00", "20:00"],
      status: "active",
      prescribedBy: "Dr. Smith",
      startDate: "2024-01-15",
      instructions: "Take with food"
    },
    {
      id: 2,
      name: "Amlodipine",
      dosage: "5mg",
      frequency: "Once daily",
      timeSlots: ["08:00"],
      status: "active",
      prescribedBy: "Dr. Johnson",
      startDate: "2024-02-01",
      instructions: "Take in the morning"
    }
  ];

  const todaySchedule = [
    { time: "08:00", medications: ["Metformin 500mg", "Amlodipine 5mg"], status: "completed" },
    { time: "12:00", medications: ["Vitamin D 1000IU"], status: "pending" },
    { time: "20:00", medications: ["Metformin 500mg"], status: "pending" }
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
            <div className="p-2 bg-green-100 rounded-lg">
              <Pill className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Medication</h1>
              <p className="text-muted-foreground">Prescriptions & schedules for {fullName}</p>
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
            Add Medication
          </Button>
        </div>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Today&apos;s Schedule</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todaySchedule.map((schedule, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="text-lg font-mono font-bold text-gray-600 min-w-[60px]">
                  {schedule.time}
                </div>
                <div className="flex-1">
                  <div className="space-y-1">
                    {schedule.medications.map((med, medIndex) => (
                      <p key={medIndex} className="text-sm">{med}</p>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {schedule.status === "completed" ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Pill className="w-5 h-5 text-green-600" />
              <span>Active Medications</span>
            </div>
            <Badge variant="secondary">{mockMedications.length} active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockMedications.map((medication) => (
              <Card key={medication.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{medication.name}</h3>
                      <p className="text-sm text-gray-600">{medication.dosage} - {medication.frequency}</p>
                    </div>
                    <Badge 
                      variant={medication.status === "active" ? "default" : "secondary"}
                      className="bg-green-100 text-green-700 border-green-200"
                    >
                      {medication.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>Times: {medication.timeSlots.join(", ")}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Started: {medication.startDate}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      <span>{medication.instructions}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500">
                      Prescribed by: {medication.prescribedBy}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{mockMedications.length}</div>
            <p className="text-sm text-muted-foreground">Active Medications</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {todaySchedule.filter(s => s.status === "completed").length}
            </div>
            <p className="text-sm text-muted-foreground">Doses Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {todaySchedule.filter(s => s.status === "pending").length}
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <p className="text-sm text-muted-foreground">Missed Doses</p>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <Pill className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Medication Management Coming Soon</h3>
          <p className="text-blue-600">
            Full medication tracking, administration records, and prescription management features are in development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}