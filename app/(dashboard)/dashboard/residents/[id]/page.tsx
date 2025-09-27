"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import {
  Activity,
  Ambulance,
  ArrowLeft,
  Bell,
  Calendar,
  ChevronRight,
  FileText,
  Folder,
  Heart,
  Moon,
  Pill,
  Puzzle,
  PuzzleIcon,
  Stethoscope,
  TrendingDown,
  User,
  Users,
  Utensils,
  NotebookPen
} from "lucide-react";
import { Route } from "next";
import { useRouter } from "next/navigation";
import React from "react";

type ResidentPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function ResidentPage({ params }: ResidentPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [showNotifications, setShowNotifications] = React.useState(false);

  // Query for all section issues (CareO Slips) for this resident
  const sectionIssues = useQuery(api.sectionIssues.getIssuesByResident, {
    residentId: id as Id<"residents">
  });

  // Transform section issues into notifications
  const notifications = React.useMemo(() => {
    if (!sectionIssues) return [];

    return sectionIssues.map((issue: any) => ({
      id: issue._id,
      message: issue.title,
      type: issue.priority === "high" ? "urgent" : issue.priority === "medium" ? "warning" : "info",
      date: new Date(issue.createdAt).toISOString().split('T')[0],
      category: `CareO Audit - ${issue.section}`,
      status: issue.status,
      section: issue.section
    }));
  }, [sectionIssues]);

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
  const initials =
    `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  const handleCardClick = (cardType: string) => {
    router.push(`/dashboard/residents/${id}/${cardType}` as Route);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="w-20 h-20">
            <AvatarImage
              src={resident.imageUrl}
              alt={fullName}
              className="border"
            />
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <p className="text-muted-foreground text-sm">
              Room {resident.roomNumber} • NHS: {resident.nhsHealthNumber}
            </p>
          </div>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="relative p-2"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {notifications.length}
              </span>
            )}
          </Button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <p className="text-xs text-gray-500">{notifications.length} pending items</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-3 border-b border-gray-50 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        notification.type === 'urgent' ? 'bg-red-500' :
                        notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {notification.category}
                          </span>
                          {notification.status && (
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              notification.status === 'open' ? 'bg-red-100 text-red-700' :
                              notification.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                              notification.status === 'resolved' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {notification.status === 'in-progress' ? 'In Progress' :
                               notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{notification.date}</span>
                        </div>
                        <p className="text-sm text-gray-900 leading-relaxed">{notification.message}</p>
                        {notification.section && (
                          <p className="text-xs text-gray-500 mt-1">CareO Audit - Section {notification.section}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setShowNotifications(false)}
                >
                  View All Notifications
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ESSENTIAL CARE */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-4">Essential Care</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("overview")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Overview</h3>
                    <p className="text-sm text-muted-foreground">
                      Basic information & summary
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
          {/* Care File Card */}
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("care-file")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-600" />
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
          {/* Medication Card */}
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("medication")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-green-50 rounded-lg">
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
        </div>
      </div>
      {/* HEALTH MONITORING */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Daily Monitoring</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* food fluid  */}
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("food-fluid")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Utensils className="w-6 h-6 text-green-600" />
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
          {/* Daily Care Card */}
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("daily-care")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Activity className="w-6 h-6 text-red-600" />
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
             {/* Progress Notes Card */}
             <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("progress-notes")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <NotebookPen className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Progress Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      Daily nursing notes
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* DOCUMENTATION */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Documentation</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
       

          {/* Documents Card */}
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("documents")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Folder className="w-6 h-6 text-indigo-600" />
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
               {/* Night Check Card */}
               <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("night-check")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Moon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Night Docs</h3>
                    <p className="text-sm text-muted-foreground">
                      Night monitoring
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("appointments")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-cyan-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-cyan-600" />
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
  
        </div>
      </div>
      {/* HEALTH & SAFETY */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Health & Safety</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Incidents & Falls Card */}
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("incidents")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <TrendingDown className="w-6 h-6 text-yellow-600" />
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

          {/* Health & Monitoring Card */}
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("health-monitoring")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Stethoscope className="w-6 h-6 text-green-600" />
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

          {/* Clinical Card */}
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("clinical")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <Heart className="w-6 h-6 text-rose-600" />
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
        </div>
      </div>

      {/* SOCIAL CARE AND EMERGENCY */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Social Care & Emergency</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Lifestyle & Social Card */}
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("lifestyle-social")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
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
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("hospital-transfer")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Ambulance className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Hospital Passport</h3>
                    <p className="text-sm text-muted-foreground">
                      Emergency & transfers
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
          {/* Hospital Transfer Card */}
          <Card
            className="cursor-pointer shadow-none"
            onClick={() => handleCardClick("multidisciplinary-note")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-violet-50 rounded-lg">
                    <PuzzleIcon className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Multi Disciplinary Note</h3>
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
    </div>
  );
}
