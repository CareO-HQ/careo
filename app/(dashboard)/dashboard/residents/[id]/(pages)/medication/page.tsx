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
  Search,
  Eye,
  User
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
        <span className="text-foreground">Medication</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Pill className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Medication</h1>
            <p className="text-muted-foreground text-sm">Prescriptions & medication schedules</p>
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
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Pill className="w-3 h-3 mr-1" />
                    {mockMedications.length} Active
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Medication
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/medication/documents`)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Medication History
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
                    <Pill className="w-3 h-3 mr-1" />
                    {mockMedications.length} Active Meds
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-green-600 text-white hover:bg-green-700 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/medication/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                Medication History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Medication Schedule */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Today&apos;s Schedule</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {new Date().toLocaleDateString()}
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Today&apos;s Schedule</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {new Date().toLocaleDateString()}
            </Badge>
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
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Pill className="w-5 h-5 text-green-600" />
              <span>Active Medications</span>
            </div>
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
              {mockMedications.length} active prescriptions
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Pill className="w-5 h-5 text-green-600" />
              <span>Active Medications</span>
            </div>
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
              {mockMedications.length} active prescriptions
            </Badge>
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

      {/* Medication Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <span>Medication Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {mockMedications.length}
              </div>
              <p className="text-sm text-green-700">Active Medications</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {todaySchedule.filter(s => s.status === "completed").length}
              </div>
              <p className="text-sm text-blue-700">Completed Today</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {todaySchedule.filter(s => s.status === "pending").length}
              </div>
              <p className="text-sm text-orange-700">Pending Doses</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <p className="text-sm text-purple-700">Missed Doses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medication Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Pill className="w-5 h-5 text-green-600" />
            <span>Medication Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-6 h-6 mr-3" />
              Add New Medication
            </Button>
            <Button
             className="h-16 text-lg bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push(`/dashboard/residents/${id}/medication/documents`)}
            >
              <Eye className="w-6 h-6 mr-3" />
              View Medication History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Development Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Pill className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Enhanced Features Coming Soon</h3>
          <p className="text-blue-600 text-sm">
            Advanced medication tracking, administration records, and prescription management features are in development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}