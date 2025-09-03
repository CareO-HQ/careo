"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  Activity,
  Ambulance,
  ArrowLeft,
  Calendar,
  ChevronRight,
  ClipboardList,
  FileText,
  Folder,
  Heart,
  Moon,
  Pill,
  Stethoscope,
  TrendingDown,
  User,
  Users,
  Utensils
} from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

type ResidentPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function ResidentPage({ params }: ResidentPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  console.log("RESIDENT", resident);

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

  const handleCardClick = (cardType: string) => {
    router.push(`/dashboard/residents/${id}/${cardType}`);
  };

  const getHealthConditionsCount = () => {
    if (!resident.healthConditions) return 0;
    return Array.isArray(resident.healthConditions)
      ? resident.healthConditions.length
      : 0;
  };

  const getRisksCount = () => {
    if (!resident.risks) return 0;
    return Array.isArray(resident.risks) ? resident.risks.length : 0;
  };

  const getDependenciesCount = () => {
    if (!resident.dependencies || Array.isArray(resident.dependencies))
      return 0;
    return Object.keys(resident.dependencies).length;
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={resident.imageUrl} alt={fullName} />
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{fullName}</h1>
            <p className="text-muted-foreground">
              Room {resident.roomNumber || "N/A"} • NHS:{" "}
              {resident.nhsHealthNumber || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Overview Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("overview")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Overview</h3>
                  <p className="text-sm text-muted-foreground">
                    Basic information
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>
        {/* Daily Care Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("daily-care")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Daily Care</h3>
                  <p className="text-sm text-muted-foreground">
                    {getDependenciesCount() > 0
                      ? `${getDependenciesCount()} dependencies`
                      : "Care activities"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>
        {/* Medication Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("medication")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Pill className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Medication</h3>
                  <p className="text-sm text-muted-foreground">
                    Prescriptions & schedules
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>
        {/* Clinical Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("clinical")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Clinical</h3>
                  <p className="text-sm text-muted-foreground">
                    {getHealthConditionsCount() > 0 || getRisksCount() > 0
                      ? `${getHealthConditionsCount()} conditions, ${getRisksCount()} risks`
                      : "Health information"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>
        {/* Incidents & Falls Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("incidents")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Incidents & Falls</h3>
                  <p className="text-sm text-muted-foreground">
                    Safety records
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>
        {/* Additional Info Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("additional")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ClipboardList className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Additional Info</h3>
                  <p className="text-sm text-muted-foreground">
                    Notes & documents
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>
        {/* Appointments Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("appointments")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Appointments</h3>
                  <p className="text-sm text-muted-foreground">
                    Medical appointments
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>
        {/* Care File Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("care-file")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <FileText className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Care File</h3>
                  <p className="text-sm text-muted-foreground">
                    Care plan & records
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>
        {/* Documents Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("documents")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Folder className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Documents</h3>
                  <p className="text-sm text-muted-foreground">
                    Files & attachments
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>

        {/* Food & Fluid Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("food-fluid")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Utensils className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Food & Fluid</h3>
                  <p className="text-sm text-muted-foreground">
                    Nutrition & hydration
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>

        {/* Night Check Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("night-check")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Moon className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Night Check</h3>
                  <p className="text-sm text-muted-foreground">
                    Night monitoring
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>

        {/* Health & Monitoring Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("health-monitoring")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Stethoscope className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Health & Monitoring</h3>
                  <p className="text-sm text-muted-foreground">
                    Vital signs & health tracking
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>

        {/* Lifestyle & Social Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("lifestyle-social")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Users className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Lifestyle & Social</h3>
                  <p className="text-sm text-muted-foreground">
                    Activities & relationships
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>

        {/* Hospital Transfer Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
          onClick={() => handleCardClick("hospital-transfer")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Ambulance className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Hospital Transfer</h3>
                  <p className="text-sm text-muted-foreground">
                    Emergency & transfers
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
