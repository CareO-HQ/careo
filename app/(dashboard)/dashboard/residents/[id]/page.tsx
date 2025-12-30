"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { cn } from "@/lib/utils";
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
  PuzzleIcon,
  Stethoscope,
  TrendingDown,
  User,
  Users,
  Utensils,
  NotebookPen,
  X
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { canViewAlert, canViewResidentSection } from "@/lib/permissions";
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
  const [showAlertsDialog, setShowAlertsDialog] = React.useState(false);

  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  const { data: member, isPending: isMemberPending } = authClient.useActiveMember();
  const userRole = member?.role;

  // Get all alerts for this resident
  const allAlerts = useQuery(
    api.alerts.getResidentAlerts,
    resident ? { residentId: id as Id<"residents"> } : "skip"
  );

  // Filter alerts based on role requirements
  const alerts = React.useMemo(() => {
    if (!allAlerts) return [];
    return allAlerts.filter(alert => canViewAlert(alert.alertType, userRole));
  }, [allAlerts, userRole]);

  // Derive alert count from filtered alerts
  const alertCount = React.useMemo(() => {
    if (!alerts) return { total: 0, critical: 0, warning: 0, info: 0 };
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === "critical").length,
      warning: alerts.filter(a => a.severity === "warning").length,
      info: alerts.filter(a => a.severity === "info").length,
    };
  }, [alerts]);

  const resolveAlert = useMutation(api.alerts.resolveAlert);

  const handleDismissAlert = async (alertId: Id<"alerts">) => {
    try {
      await resolveAlert({
        alertId,
        resolutionNote: "Dismissed by staff"
      });
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
    }
  };

  console.log("RESIDENT", resident);

  if (resident === undefined || isMemberPending) {
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
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/residents")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
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
        <Button
          variant="outline"
          size="icon"
          className="relative bg-gray-50 hover:bg-gray-100"
          onClick={() => setShowAlertsDialog(true)}
        >
          <Bell className="h-5 w-5" />
          {alertCount && alertCount.total > 0 && (
            <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-xs flex items-center justify-center font-semibold shadow-md ${alertCount.critical > 0 ? 'bg-red-600' : 'bg-orange-500'
              }`}>
              {alertCount.total}
            </span>
          )}
        </Button>
      </div>

      {/* ESSENTIAL CARE */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Essential Care</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {canViewResidentSection("overview", userRole) && (
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
                        Basic information
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </CardContent>
            </Card>
          )}
          {/* Care File Card */}
          {canViewResidentSection("care-file", userRole) && (
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
          )}
          {/* Medication Card */}
          {canViewResidentSection("medication", userRole) && (
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
          )}
        </div>
      </div>
      {/* HEALTH MONITORING */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Daily Monitoring</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* food fluid  */}
          {canViewResidentSection("food-fluid", userRole) && (
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
          )}
          {/* Daily Care Card */}
          {canViewResidentSection("daily-care", userRole) && (
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
          )}
          {/* Progress Notes Card */}
          {canViewResidentSection("progress-notes", userRole) && (
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
          )}
        </div>
      </div>
      {/* DOCUMENTATION */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Documentation</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">


          {/* Documents Card */}
          {canViewResidentSection("documents", userRole) && (
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
          )}
          {/* Night Check Card */}
          {canViewResidentSection("night-check", userRole) && (
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
          )}
          {canViewResidentSection("appointments", userRole) && (
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
          )}

        </div>
      </div>
      {/* HEALTH & SAFETY */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Health & Safety</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Incidents & Falls Card */}
          {canViewResidentSection("incidents", userRole) && (
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
          )}

          {/* Health & Monitoring Card */}
          {canViewResidentSection("health-monitoring", userRole) && (
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
          )}

          {/* Clinical Card */}
          {canViewResidentSection("clinical", userRole) && (
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
          )}
        </div>
      </div>

      {/* SOCIAL CARE AND EMERGENCY */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Social Care & Emergency</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Lifestyle & Social Card */}
          {canViewResidentSection("lifestyle-social", userRole) && (
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
          )}
          {/* Hospital Transfer Card */}
          {canViewResidentSection("hospital-transfer", userRole) && (
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
          )}
          {/* Hospital Transfer Card */}
          {canViewResidentSection("multidisciplinary-note", userRole) && (
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
          )}
        </div>
      </div>

      {/* ALERTS DIALOG */}
      <Dialog open={showAlertsDialog} onOpenChange={setShowAlertsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alerts for {resident.firstName} {resident.lastName}</DialogTitle>
            <DialogDescription>
              {alerts && alerts.length > 0
                ? `${alerts.length} active alert${alerts.length !== 1 ? 's' : ''} requiring attention`
                : "No active alerts"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert._id}
                  className={cn(
                    "p-4 rounded-lg border-2",
                    alert.severity === "critical"
                      ? "border-red-300 bg-red-50"
                      : alert.severity === "warning"
                        ? "border-orange-300 bg-orange-50"
                        : "border-blue-300 bg-blue-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="table"
                          className={cn(
                            alert.severity === "critical"
                              ? "bg-red-100 text-red-800 border-red-400"
                              : alert.severity === "warning"
                                ? "bg-orange-100 text-orange-800 border-orange-400"
                                : "bg-blue-100 text-blue-800 border-blue-400"
                          )}
                        >
                          {alert.severity === "critical"
                            ? "Critical"
                            : alert.severity === "warning"
                              ? "Warning"
                              : "Info"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismissAlert(alert._id)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active alerts</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
