"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
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
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { supabase, isLoading: isSupabaseLoading } = useSupabase();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const activeOrganizationId = profile?.active_organization_id;
  const activeCareHomeId = profile?.active_care_home_id;
  const activeTeamId = profile?.active_team_id;

  const fetchDashboardData = useCallback(async () => {
    if (!profile || isSupabaseLoading) return;

    setDataLoading(true);
    try {
      // Build filters for care home isolation
      // If a care home is selected, filter by care_home_id for proper multi-tenant isolation
      // Otherwise, fall back to organization_id

      // Fetch Stats - use care_home_id when available
      let residentsQuery = supabase.from("residents").select("id", { count: "exact", head: true });
      let teamsQuery = supabase.from("teams").select("id", { count: "exact", head: true });
      let staffQuery = supabase.from("users").select("id", { count: "exact", head: true });

      if (activeCareHomeId) {
        residentsQuery = residentsQuery.eq("care_home_id", activeCareHomeId);
        teamsQuery = teamsQuery.eq("care_home_id", activeCareHomeId);
        staffQuery = staffQuery.eq("active_care_home_id", activeCareHomeId);
      } else if (activeOrganizationId) {
        residentsQuery = residentsQuery.eq("organization_id", activeOrganizationId);
        teamsQuery = teamsQuery.eq("organization_id", activeOrganizationId);
        staffQuery = staffQuery.eq("active_organization_id", activeOrganizationId);
      }

      const [residentsRes, staffRes, teamsRes] = await Promise.all([
        residentsQuery,
        staffQuery,
        teamsQuery
      ]);

      // Fetch Latest Incidents - filter by care_home_id via residents
      let incidentsQuery = supabase
        .from("incidents")
        .select(`
          id, incident_types, type_other_details, 
          incident_level, date, time, resident_id,
          resident:residents!inner(first_name, last_name, care_home_id)
        `)
        .order("date", { ascending: false })
        .limit(5);

      if (activeCareHomeId) {
        incidentsQuery = incidentsQuery.eq("resident.care_home_id", activeCareHomeId);
      } else if (activeOrganizationId) {
        incidentsQuery = incidentsQuery.eq("organization_id", activeOrganizationId);
      }

      const { data: incidents } = await incidentsQuery;

      // Fetch Upcoming Appointments - filter by care_home_id via residents
      let appointmentsQuery = supabase
        .from("appointments")
        .select(`
          id, title, start_time, resident_id,
          resident:residents!inner(first_name, last_name, care_home_id)
        `)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5);

      if (activeCareHomeId) {
        appointmentsQuery = appointmentsQuery.eq("resident.care_home_id", activeCareHomeId);
      } else if (activeOrganizationId) {
        appointmentsQuery = appointmentsQuery.eq("organization_id", activeOrganizationId);
      }

      const { data: appointments } = await appointmentsQuery;

      // Fetch Recent Hospital Transfers - filter by care_home_id via residents
      let transfersQuery = supabase
        .from("hospital_transfer_logs")
        .select(`
          id, reason, transfer_date, destination_hospital, resident_id,
          resident:residents!inner(first_name, last_name, care_home_id)
        `)
        .order("transfer_date", { ascending: false })
        .limit(5);

      if (activeCareHomeId) {
        transfersQuery = transfersQuery.eq("resident.care_home_id", activeCareHomeId);
      } else if (activeOrganizationId) {
        transfersQuery = transfersQuery.eq("organization_id", activeOrganizationId);
      }

      const { data: transfers } = await transfersQuery;

      setDashboardData({
        totalResidents: residentsRes.count || 0,
        totalStaff: staffRes.count || 0,
        totalUnits: teamsRes.count || 0,
        latestIncidents: incidents || [],
        upcomingAppointments: appointments || [],
        recentHospitalTransfers: transfers || []
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setDataLoading(false);
    }
  }, [profile, activeOrganizationId, activeCareHomeId, isSupabaseLoading, supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Listen for custom 'residents-updated' event
  useEffect(() => {
    const handleUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener("residents-updated", handleUpdate);
    return () => {
      window.removeEventListener("residents-updated", handleUpdate);
    };
  }, [fetchDashboardData]);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
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

  if (isProfileLoading || isSupabaseLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!profile?.active_organization_id) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Building2 className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground text-center">You need to set up your care home first</p>
        <Button onClick={() => router.push("/onboarding")}>
          Complete Setup
        </Button>
      </div>
    );
  }

  const today = format(new Date(), "EEEE, MMMM dd, yyyy");

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Welcome, {profile?.name || "User"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
        </div>

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
                  {dashboardData.latestIncidents.map((incident: any) => (
                    <TableRow
                      key={incident.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() =>
                        incident.resident_id &&
                        router.push(`/dashboard/residents/${incident.resident_id}/incidents`)
                      }
                    >
                      <TableCell className="font-normal text-sm">
                        {incident.incident_types && incident.incident_types.length > 0
                          ? incident.incident_types[0]
                          : incident.type_other_details || "Unknown"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {incident.resident
                          ? `${incident.resident.first_name} ${incident.resident.last_name}`
                          : "Unknown Resident"}
                      </TableCell>
                      <TableCell>{getSeverityBadge(incident.incident_level || "")}</TableCell>
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

        <TodoList teamId={activeTeamId || undefined} />
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
                  {dashboardData.upcomingAppointments.map((appointment: any) => (
                    <TableRow
                      key={appointment.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() =>
                        router.push(`/dashboard/residents/${appointment.resident_id}/appointments`)
                      }
                    >
                      <TableCell className="font-normal text-sm">
                        {appointment.resident
                          ? `${appointment.resident.first_name} ${appointment.resident.last_name}`
                          : "Unknown"}
                      </TableCell>
                      <TableCell className="text-sm">{appointment.title || "Medical Checkup"}</TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(appointment.start_time), "MMM dd, yyyy")}
                          <div className="text-xs">
                            {format(new Date(appointment.start_time), "h:mm a")}
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
                  {dashboardData.recentHospitalTransfers.map((transfer: any) => (
                    <TableRow
                      key={transfer.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() =>
                        router.push(`/dashboard/residents/${transfer.resident_id}/hospital-transfer`)
                      }
                    >
                      <TableCell className="font-normal text-sm">
                        {transfer.resident
                          ? `${transfer.resident.first_name} ${transfer.resident.last_name}`
                          : "Unknown"}
                        {transfer.resident && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {transfer.destination_hospital || "City General"}
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
