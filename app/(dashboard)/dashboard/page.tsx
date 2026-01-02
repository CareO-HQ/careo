"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Users,
  Building2,
  Shield,
  Calendar,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TodoList } from "@/components/dashboard/TodoList";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const {
    activeTeam,
    activeTeamId,
    activeOrganization,
    activeOrganizationId,
    isLoading: isTeamLoading,
  } = useActiveTeam();

  // Fetch dashboard data based on team or organization
  const dashboardData = useQuery(
    activeTeamId
      ? api.dashboard.getDashboardStatsByTeam
      : activeOrganizationId
      ? api.dashboard.getDashboardStatsByOrganization
      : "skip",
    activeTeamId
      ? { teamId: activeTeamId }
      : activeOrganizationId
      ? { organizationId: activeOrganizationId }
      : "skip"
  );

  const isLoading = isTeamLoading || dashboardData === undefined;

  // Get user's first name
  const userName = session?.user?.name?.split(" ")[0] || "User";

  // Format today's date
  const today = format(new Date(), "EEEE, MMMM dd, yyyy");

  // Handle sign out
  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  // Helper function to get severity badge color
  const getSeverityBadge = (level: string) => {
    const levelLower = level?.toLowerCase() || "";
    if (levelLower.includes("death") || levelLower.includes("permanent")) {
      return <Badge variant="destructive">Critical</Badge>;
    } else if (levelLower.includes("minor") || levelLower.includes("injury")) {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Moderate</Badge>;
    } else if (levelLower.includes("no_harm") || levelLower.includes("near")) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Minor</Badge>;
    }
    return <Badge variant="secondary">Low</Badge>;
  };

  // Helper function to get status badge for hospital transfers
  const getTransferStatusBadge = (outcome?: string) => {
    if (!outcome) return <Badge variant="secondary">In Hospital</Badge>;

    const outcomeLower = outcome.toLowerCase();
    if (outcomeLower.includes("return") || outcomeLower.includes("discharge")) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Returned</Badge>;
    }
    return <Badge variant="secondary">In Hospital</Badge>;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  // No active team or organization
  if (!activeTeamId && !activeOrganizationId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Please select a care home to view the dashboard</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Welcome, {userName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
        </div>
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="border-red-500 bg-red-50 text-black hover:text-black hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50"
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Residents */}
        <Card className="p-2 border-green-500 shadow-none bg-white dark:bg-background rounded-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Total Residents</p>
              <h2 className="text-xl font-semibold">{dashboardData?.totalResidents || 0}</h2>
            </div>
            <div className="h-7 w-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Users className="h-3 w-3 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Total Staff */}
        <Card className="p-2 border-green-500 shadow-none bg-white dark:bg-background rounded-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Total Staff</p>
              <h2 className="text-xl font-semibold">{dashboardData?.totalStaff || 0}</h2>
            </div>
            <div className="h-7 w-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Users className="h-3 w-3 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Total Units */}
        <Card className="p-2 border-green-500 shadow-none bg-white dark:bg-background rounded-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Total Units</p>
              <h2 className="text-xl font-semibold">{dashboardData?.totalUnits || 0}</h2>
            </div>
            <div className="h-7 w-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Building2 className="h-3 w-3 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Date and Time */}
        <Card className="p-2 border-green-500 shadow-none bg-white dark:bg-background rounded-sm">
          <div className="flex flex-col justify-center items-center h-full text-center">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Today</p>
            <h2 className="text-xl font-semibold">{format(new Date(), "MMM dd")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(), "h:mm a")}</p>
          </div>
        </Card>
      </div>

      {/* Latest Incidents and Todo List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 border shadow-none rounded-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-base font-medium">Latest Incidents</h2>
          </div>

          {dashboardData?.latestIncidents && dashboardData.latestIncidents.length > 0 ? (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-medium">Type</TableHead>
                    <TableHead className="text-xs font-medium">Resident</TableHead>
                    <TableHead className="text-xs font-medium">Severity</TableHead>
                    <TableHead className="text-xs font-medium">Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.latestIncidents.map((incident) => (
                    <TableRow
                      key={incident._id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() =>
                        incident.residentId &&
                        router.push(`/dashboard/residents/${incident.residentId}/incidents`)
                      }
                    >
                      <TableCell className="font-normal text-sm">
                        {incident.incidentTypes && incident.incidentTypes.length > 0
                          ? incident.incidentTypes[0]
                          : incident.type || "Unknown"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {incident.resident
                          ? `${incident.resident.firstName} ${incident.resident.lastName}`
                          : "Unknown Resident"}
                      </TableCell>
                      <TableCell>{getSeverityBadge(incident.incidentLevel || "")}</TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {incident.date && format(new Date(incident.date), "MMM dd, yyyy")}
                          <div className="text-xs">
                            {incident.time || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent incidents</p>
            </div>
          )}
        </Card>

        <TodoList teamId={activeTeamId} />
      </div>

      {/* Bottom Row - Appointments and Hospital Transfers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card className="p-5 border shadow-none rounded-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-base font-medium">Upcoming Appointments</h2>
          </div>

          {dashboardData?.upcomingAppointments && dashboardData.upcomingAppointments.length > 0 ? (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-medium">Resident</TableHead>
                    <TableHead className="text-xs font-medium">Type</TableHead>
                    <TableHead className="text-xs font-medium">Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.upcomingAppointments.map((appointment) => (
                    <TableRow
                      key={appointment._id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() =>
                        router.push(`/dashboard/residents/${appointment.residentId}/appointments`)
                      }
                    >
                      <TableCell className="font-normal text-sm">
                        {appointment.resident
                          ? `${appointment.resident.firstName} ${appointment.resident.lastName}`
                          : "Unknown"}
                      </TableCell>
                      <TableCell className="text-sm">{appointment.title || "Medical Checkup"}</TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(appointment.startTime), "MMM dd, yyyy")}
                          <div className="text-xs">
                            {format(new Date(appointment.startTime), "h:mm a")}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming appointments</p>
            </div>
          )}
        </Card>

        {/* Recent Hospital Transfers */}
        <Card className="p-5 border shadow-none rounded-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-base font-medium">Recent Hospital Transfers</h2>
          </div>

          {dashboardData?.recentHospitalTransfers &&
          dashboardData.recentHospitalTransfers.length > 0 ? (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-medium">Resident</TableHead>
                    <TableHead className="text-xs font-medium">Reason</TableHead>
                    <TableHead className="text-xs font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentHospitalTransfers.map((transfer) => (
                    <TableRow
                      key={transfer._id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() =>
                        router.push(`/dashboard/residents/${transfer.residentId}/hospital-transfer`)
                      }
                    >
                      <TableCell className="font-normal text-sm">
                        {transfer.resident
                          ? `${transfer.resident.firstName} ${transfer.resident.lastName}`
                          : "Unknown"}
                        {transfer.resident && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {transfer.hospitalName || "City General"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{transfer.reason || "Emergency"}</TableCell>
                      <TableCell>{getTransferStatusBadge(transfer.outcome)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent hospital transfers</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
