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
  Scale,
  X,
  Droplet,
  Bandage,
  Hand
} from "lucide-react";
import { canViewResidentSection, canViewHealthSafetyTitle } from "@/lib/permissions";
import { Route } from "next";
import { FEATURES } from "@/lib/config/features";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import { formatTimestampToUKDateTime } from "@/lib/date-utils";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { Resident } from "@/types";

type ResidentPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function ResidentPage({ params }: ResidentPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  const [resident, setResident] = useState<Resident | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { profile, isLoading: isProfileLoading } = useProfile();
  const userRole = profile?.role;

  const fetchResidentData = React.useCallback(async () => {
    // Wait until profile has finished loading before fetching
    if (isProfileLoading) return;
    setIsLoading(true);
    const { data: residentData, error: residentError } = await supabase
      .from("residents")
      .select("*")
      .eq("id", id)
      .single();

    if (residentError) {
      console.error("Error fetching resident:", residentError);
      setResident(null);
    } else {
      setResident(residentData as Resident);
    }

    if (userRole && profile?.id) {
      // Fetch active alerts for the resident
      const { data: alertsData, error: alertsError } = await supabase
        .from("alerts")
        .select("*")
        .eq("resident_id", id)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });

      if (alertsError) {
        setAlerts([]);
        return;
      }

      // Fetch dismissals for current user
      const { data: dismissalsData } = await supabase
        .from("alert_dismissals")
        .select("alert_id")
        .eq("user_id", profile.id);

      // Create a set of dismissed alert IDs for quick lookup
      const dismissedAlertIds = new Set(
        (dismissalsData || []).map((d: any) => d.alert_id)
      );

      // Filter out alerts dismissed by current user
      const filteredAlerts = (alertsData || []).filter(
        (alert: any) => !dismissedAlertIds.has(alert.id)
      );

      setAlerts(filteredAlerts);
    }
    setIsLoading(false);
  }, [id, userRole, profile?.id, isProfileLoading]);

  useEffect(() => {
    fetchResidentData();
  }, [fetchResidentData]);

  // Derive alert count from filtered alerts
  const alertCount = useMemo(() => {
    if (!alerts) return { total: 0, critical: 0, warning: 0, info: 0 };
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === "critical").length,
      warning: alerts.filter(a => a.severity === "warning").length,
      info: alerts.filter(a => a.severity === "info").length,
    };
  }, [alerts]);

  const handleDismissAlert = async (alertId: string) => {
    if (!profile?.id) return;

    try {
      // Insert into alert_dismissals table for per-user dismissal tracking
      const { error } = await supabase
        .from("alert_dismissals")
        .insert({
          alert_id: alertId,
          user_id: profile.id
        });

      if (error) throw error;
      toast.success("Alert dismissed");
      fetchResidentData();
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
      toast.error("Failed to dismiss alert");
    }
  };

  console.log("RESIDENT", resident);

  if (isLoading) {
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

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials =
    `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();
  const lastUpdatedOn = resident.updated_at
    ? formatTimestampToUKDateTime(resident.updated_at, "dd/MM/yyyy")
    : null;

  const handleCardClick = (cardType: string) => {
    router.push(`/dashboard/residents/${id}/${cardType}` as Route);
  };

  const getHealthConditionsCount = () => {
    if (!resident.health_conditions) return 0;
    return Array.isArray(resident.health_conditions)
      ? resident.health_conditions.length
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
              src={resident.image_url}
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
              Room {resident.room_number} • NHS: {resident.nhs_health_number}
            </p>
            {resident.image_url && lastUpdatedOn && (
              <p className="text-muted-foreground text-xs mt-1">
                Last update on: {lastUpdatedOn}
              </p>
            )}
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
          {FEATURES.SHOW_CARE_FILE_V1 && canViewResidentSection("care-file", userRole) && (
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
          {/* Care File Card */}
          {FEATURES.SHOW_CARE_FILE_V2 && canViewResidentSection("care-file", userRole) && (
            <Card
              className="cursor-pointer shadow-none"
              onClick={() => handleCardClick("care-file-v2")}
            >
              <CardContent className="p-2">
                <div className="flex items-center justify-between p-3">
                  <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <FileText className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Care File</h3>
                      <p className="text-sm text-muted-foreground">
                        Enhanced care records
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
          {/* Weight Monitoring Card (CA ONLY) */}
          {userRole === "care_assistant" && (
            <Card
              className="cursor-pointer shadow-none"
              onClick={() => handleCardClick("weight-monitoring")}
            >
              <CardContent className="p-2">
                <div className="flex items-center justify-between p-3">
                  <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Scale className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Weight monitoring</h3>
                      <p className="text-sm text-muted-foreground">
                        Record weight & track trends
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </CardContent>
            </Card>
          )}
          {/* Topical Medication Card (CA ONLY) */}
          {userRole === "care_assistant" && (
            <Card
              className="cursor-pointer shadow-none"
              onClick={() => handleCardClick("topical-medication")}
            >
              <CardContent className="p-2">
                <div className="flex items-center justify-between p-3">
                  <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Hand className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Topical Medication</h3>
                      <p className="text-sm text-muted-foreground">
                        Apply creams and ointments
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
          {/* Continence Card */}
          {canViewResidentSection("continence", userRole) && (
            <Card
              className="cursor-pointer shadow-none"
              onClick={() => handleCardClick("continence")}
            >
              <CardContent className="p-2">
                <div className="flex items-center justify-between p-3">
                  <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <Droplet className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Continence</h3>
                      <p className="text-sm text-muted-foreground">
                        Bowel & bladder care
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
          {/* Checks Card */}
          {canViewResidentSection("checks", userRole) && (
            <Card
              className="cursor-pointer shadow-none"
              onClick={() => handleCardClick("checks")}
            >
              <CardContent className="p-2">
                <div className="flex items-center justify-between p-3">
                  <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Moon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Checks</h3>
                      <p className="text-sm text-muted-foreground">
                        Monitoring checks
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
        {canViewHealthSafetyTitle(userRole) && (
          <p className="font-medium text-lg mb-2">Health & Safety</p>
        )}
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

          {/* Wounds Card */}
          {canViewResidentSection("wounds", userRole) && (
            <Card
              className="cursor-pointer shadow-none"
              onClick={() => handleCardClick("wounds")}
            >
              <CardContent className="p-2">
                <div className="flex items-center justify-between p-3">
                  <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                    <div className="p-2 bg-rose-50 rounded-lg">
                      <Bandage className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Wounds</h3>
                      <p className="text-sm text-muted-foreground">
                        Wound tracking and management
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
            <DialogTitle>Alerts for {resident.first_name} {resident.last_name}</DialogTitle>
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
                  key={alert.id}
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
                          {formatTimestampToUKDateTime(alert.created_at, 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismissAlert(alert.id)}
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
