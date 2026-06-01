"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Building2, 
  Users, 
  UserCheck, 
  Activity, 
  RefreshCw, 
  Award, 
  CalendarDays,
  Phone,
  Mail,
  ChevronLeft,
  Briefcase,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AgencyDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function AgencyDetailsPage({ params }: AgencyDetailsPageProps) {
  const { id } = React.use(params);
  const { profile, isLoading: isProfileLoading } = useProfile();
  const router = useRouter();

  // Data states
  const [supervisor, setSupervisor] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalStaff: 0,
    activeShifts: 0,
    availablePool: 0
  });

  // Redirect if not SaaS Admin
  useEffect(() => {
    if (!isProfileLoading && profile && !profile.is_saas_admin) {
      router.push("/dashboard");
    }
  }, [profile, isProfileLoading, router]);

  // Fetch Agency-Specific Data
  const fetchAgencyData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Fetch Supervisor Profile
      const { data: supervisorData, error: supervisorError } = await supabase
        .from("agency_staff")
        .select("*")
        .eq("id", id)
        .eq("role", "supervisor")
        .maybeSingle();

      if (supervisorError) throw supervisorError;
      if (!supervisorData) {
        toast.error("Staffing agency not found.");
        router.push("/admin/agencies");
        return;
      }

      setSupervisor(supervisorData);

      // 2. Fetch associated Staff & Requests
      const [staffRes, requestsRes, careHomesRes, teamsRes] = await Promise.all([
        supabase.from("agency_staff").select("*").eq("supervisor_id", id).order("created_at", { ascending: false }),
        supabase.from("agency_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("care_homes").select("id, name, agency_link_code"),
        supabase.from("teams").select("id, name, care_home_id"),
      ]);

      if (staffRes.error) throw staffRes.error;
      if (requestsRes.error) throw requestsRes.error;
      if (careHomesRes.error) throw careHomesRes.error;
      if (teamsRes.error) throw teamsRes.error;

      const allAgencyStaff = staffRes.data || [];
      const allRequests = requestsRes.data || [];
      const allCareHomes = careHomesRes.data || [];
      const allTeams = teamsRes.data || [];

      // Map active assignments to show caretakers on shift
      const activeRequests = allRequests.filter(r => r.status === "active");
      const mappedAssignments = activeRequests.map(req => {
        const staff = allAgencyStaff.find(s => s.id === req.agency_staff_id);
        const careHome = allCareHomes.find(h => h.id === req.care_home_id);
        const team = allTeams.find(t => t.id === req.team_id);

        return {
          id: req.id,
          staffName: staff ? staff.name : "Unknown Staff",
          staffEmail: staff ? staff.email : "",
          role: staff ? staff.role : "Staff",
          careHomeName: careHome ? careHome.name : "Unknown Care Home",
          teamName: team ? team.name : "Whole Care Home",
          activatedAt: req.activated_at || req.updated_at || req.created_at,
          notes: req.notes || ""
        };
      }).filter(a => a.staffEmail !== ""); // filter to active requests of only this agency's staff

      setStaffList(allAgencyStaff);
      setAssignmentsList(mappedAssignments);

      // Calculate operational stats for this agency
      setStats({
        totalStaff: allAgencyStaff.length,
        activeShifts: mappedAssignments.length,
        availablePool: allAgencyStaff.filter(s => s.status === "available").length
      });

    } catch (error: any) {
      console.error("Error loading agency details:", error);
      toast.error("Failed to load staffing agency details.");
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!profile?.is_saas_admin) return;
    fetchAgencyData();
  }, [profile, fetchAgencyData]);

  // Formatting Date helper
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-3">
        <RefreshCw className="animate-spin h-8 w-8 text-teal-600" />
        <p className="text-sm text-muted-foreground font-medium">Loading agency details...</p>
      </div>
    );
  }

  if (!profile || !profile.is_saas_admin || !supervisor) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Back button and page header */}
      <div className="flex flex-col gap-4 border-b pb-5 border-slate-100">
        <div>
          <Button 
            onClick={() => router.push("/admin/agencies")}
            variant="ghost" 
            size="sm" 
            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-xs pl-0 mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Agencies
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg shrink-0">
              {supervisor.agency_name ? supervisor.agency_name.charAt(0).toUpperCase() : supervisor.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                {supervisor.agency_name || `${supervisor.name} Staffing`}
              </h1>
              <div className="flex flex-wrap gap-4 items-center text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Supervisor Email: <strong className="text-slate-700 font-medium">{supervisor.email}</strong>
                </span>
                {supervisor.phone && (
                  <span className="flex items-center gap-1 border-l border-slate-200 pl-3">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Phone: <strong className="text-slate-700 font-medium">{supervisor.phone}</strong>
                  </span>
                )}
                <span className="border-l border-slate-200 pl-3">
                  Status: 
                  <Badge variant="outline" className="capitalize bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-semibold ml-1.5 py-0.5">
                    {supervisor.status}
                  </Badge>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Total Registered Staff */}
        <Card className="shadow-sm border-slate-100/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Registered Staff</CardTitle>
            <Users className="h-4.5 w-4.5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {stats.totalStaff}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered nurses & care assistants
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Active Deployments */}
        <Card className="shadow-sm border-slate-100/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deployments</CardTitle>
            <Activity className="h-4.5 w-4.5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {stats.activeShifts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently deployed to care homes
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Available Worker Pool */}
        <Card className="shadow-sm border-slate-100/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Pool</CardTitle>
            <UserCheck className="h-4.5 w-4.5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {stats.availablePool}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Qualified & awaiting assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roster & Directory */}
      <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 pb-4">
          <CardTitle className="text-base font-semibold text-slate-800">Agency Staff Pool</CardTitle>
          <CardDescription className="text-xs">
            Qualified nurses and care assistants managed by {supervisor.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {staffList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-teal-600" />
              <p className="font-semibold text-slate-600 text-sm">No linked staff members</p>
              <p className="text-xs text-slate-400 mt-1">This supervisor has not registered any nurses or assistants yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/50">
                  <TableHead className="pl-6 py-3 font-semibold text-xs text-slate-600">Staff Member</TableHead>
                  <TableHead className="py-3 font-semibold text-xs text-slate-600">Role</TableHead>
                  <TableHead className="py-3 font-semibold text-xs text-slate-600">Skills & Credentials</TableHead>
                  <TableHead className="py-3 font-semibold text-xs text-slate-600">Deploy Status</TableHead>
                  <TableHead className="py-3 font-semibold text-xs text-slate-600">Current Assignment</TableHead>
                  <TableHead className="pr-6 py-3 font-semibold text-xs text-slate-600 text-right">Registration Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((staff) => {
                  const activeAssignment = assignmentsList.find(a => a.staffEmail === staff.email);

                  return (
                    <TableRow key={staff.id} className="hover:bg-slate-50/30 border-b border-slate-100 last:border-none">
                      <TableCell className="pl-6 py-4">
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{staff.name}</div>
                          <div className="text-xs text-slate-500">{staff.email}</div>
                          {staff.phone && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{staff.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={`capitalize font-semibold text-[10px] ${
                          staff.role === "nurse" 
                            ? "bg-teal-50 text-teal-700 border-teal-100" 
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                          {staff.role === "nurse" ? "Registered Nurse (RN)" : "Care Assistant (HCA)"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="max-w-[250px] space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {staff.skills?.map((skill: string) => (
                              <Badge key={skill} className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none text-[9px] px-1.5 py-0.5">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Award className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{staff.certifications?.join(", ") || "No custom credentials"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`text-[10px] font-semibold uppercase ${
                          staff.status === "active"
                            ? "bg-emerald-100 text-emerald-950 border-none"
                            : staff.status === "available"
                            ? "bg-teal-50 text-teal-700 border-teal-200"
                            : staff.status === "pending_approval"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-none"
                        }`} variant="outline">
                          {staff.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-xs">
                        {activeAssignment ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              {activeAssignment.careHomeName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium capitalize">
                              Unit: {activeAssignment.teamName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned (In Pool)</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right text-xs text-slate-500">
                        {formatDate(staff.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
