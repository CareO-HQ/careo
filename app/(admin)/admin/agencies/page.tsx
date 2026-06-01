"use client";

import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Users, 
  UserCheck, 
  Briefcase, 
  Activity, 
  Search, 
  RefreshCw, 
  FileText, 
  Award, 
  CalendarDays,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  ChevronRight,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

export default function AgenciesPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const router = useRouter();

  // Data states
  const [supervisorsList, setSupervisorsList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);
  const [careHomesList, setCareHomesList] = useState<any[]>([]);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [requestsList, setRequestsList] = useState<any[]>([]);

  // UI / UX states
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("agencies");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected agency mapping removed - navigation is used instead


  const [stats, setStats] = useState({
    totalAgencies: 0,
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

  // Fetch Data from DB
  const fetchAgencyData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Parallel queries to fetch all related agency entities
      const [staffRes, requestsRes, careHomesRes, teamsRes] = await Promise.all([
        supabase.from("agency_staff").select("*").order("created_at", { ascending: false }),
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

      // Categorize supervisors (agencies) and staff (nurses/care assistants)
      const supervisors = allAgencyStaff.filter(s => s.role === "supervisor");
      const staffMembers = allAgencyStaff.filter(s => s.role === "nurse" || s.role === "care_assistant");

      // Map active assignments to show caretakers on shift
      const activeRequests = allRequests.filter(r => r.status === "active");
      const mappedAssignments = activeRequests.map(req => {
        const staff = staffMembers.find(s => s.id === req.agency_staff_id);
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
      });

      setSupervisorsList(supervisors);
      setStaffList(staffMembers);
      setAssignmentsList(mappedAssignments);
      setCareHomesList(allCareHomes);
      setTeamsList(allTeams);
      setRequestsList(allRequests);

      // Calculate operational stats
      setStats({
        totalAgencies: supervisors.length,
        totalStaff: staffMembers.length,
        activeShifts: mappedAssignments.length,
        availablePool: staffMembers.filter(s => s.status === "available").length
      });

      // Selected agency is now derived from supervisorsList in render scope

    } catch (error: any) {
      console.error("Error loading agency data:", error);
      toast.error("Failed to load staffing agency metrics.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Filter lists based on Search & Select query
  const filteredSupervisors = supervisorsList.filter(item => {
    const term = searchQuery.toLowerCase();
    const agencyName = item.agency_name || `${item.name} Staffing`;
    return (
      agencyName.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term)
    );
  });

  const filteredStaff = staffList.filter(item => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(term) || item.email.toLowerCase().includes(term);
    const matchesRole = roleFilter === "all" || item.role === roleFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredAssignments = assignmentsList.filter(item => {
    const term = searchQuery.toLowerCase();
    return item.staffName.toLowerCase().includes(term) || item.careHomeName.toLowerCase().includes(term);
  });

  // Get staff list linked to a specific supervisor
  const getStaffForSupervisor = (supId: string) => {
    return staffList.filter(s => s.supervisor_id === supId);
  };

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-3">
        <RefreshCw className="animate-spin h-8 w-8 text-teal-600" />
        <p className="text-sm text-muted-foreground font-medium">Fetching agency structures...</p>
      </div>
    );
  }

  if (!profile || !profile.is_saas_admin) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6 relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5 border-slate-100">
        <div>
          <h1 className="text-2xl font-medium tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-teal-600" />
            Agencies & Staffing
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor registered agencies, supervisor credentials, total staff pools, and active care home deployments.
          </p>
        </div>
        <Button 
          onClick={fetchAgencyData} 
          disabled={isLoading}
          variant="outline"
          className="self-start sm:self-center border-slate-200 hover:bg-slate-50 flex gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Registry
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Registered Agencies */}
        <Card className="shadow-sm border-slate-100/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Agencies</CardTitle>
            <Briefcase className="h-4.5 w-4.5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {stats.totalAgencies}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active supervisor profiles
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Total Agency Staff */}
        <Card className="shadow-sm border-slate-100/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Agency Staff</CardTitle>
            <Users className="h-4.5 w-4.5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {stats.totalStaff}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Qualified temp workers
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Active Assignments */}
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
              Currently on shift
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Available Worker Pool */}
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
              Awaiting shift assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Console */}
      <Tabs defaultValue="agencies" value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Navigation & Search Filters header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white/45 p-3 rounded-xl border border-slate-100 shadow-sm backdrop-blur-sm">
          <TabsList className="grid grid-cols-3 w-full lg:w-[480px] bg-slate-100/80 p-1 rounded-lg">
            <TabsTrigger value="agencies" className="rounded-md text-xs font-semibold flex gap-2">
              <Briefcase className="w-3.5 h-3.5" />
              Agencies ({supervisorsList.length})
            </TabsTrigger>
            <TabsTrigger value="staff" className="rounded-md text-xs font-semibold flex gap-2">
              <Users className="w-3.5 h-3.5" />
              Staff Pool ({staffList.length})
            </TabsTrigger>
            <TabsTrigger value="assignments" className="rounded-md text-xs font-semibold flex gap-2">
              <Activity className="w-3.5 h-3.5" />
              Active Deployments ({assignmentsList.length})
            </TabsTrigger>
          </TabsList>

          {/* Interactive Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder={
                  activeTab === "agencies" ? "Search agencies/supervisors..." :
                  activeTab === "staff" ? "Search staff by name/email..." : "Search assignments..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-200 text-xs h-9 focus-visible:ring-teal-500"
              />
            </div>

            {/* Special filters for Staff Directory */}
            {activeTab === "staff" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-600 focus:outline-teal-500 w-full sm:w-32 h-9"
                >
                  <option value="all">All Roles</option>
                  <option value="nurse">Nurse</option>
                  <option value="care_assistant">Care Assistant</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-600 focus:outline-teal-500 w-full sm:w-36 h-9"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="offboarded">Offboarded</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ==================== 1. AGENCIES TAB ==================== */}
        <TabsContent value="agencies" className="mt-4">
          <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 pb-4">
              <CardTitle className="text-base font-semibold text-slate-800">Staffing Agencies</CardTitle>
              <CardDescription className="text-xs">
                List of registered agency portals. Click on any row to view supervisor profile and linked staff pool.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredSupervisors.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30 text-teal-600" />
                  <p className="font-semibold text-slate-600 text-sm">No agencies found</p>
                  <p className="text-xs text-slate-400 mt-1">Supervisors registered via the Agency Portal will show up here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50/50">
                      <TableHead className="pl-6 py-3 font-semibold text-xs text-slate-600">Agency Name</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Supervisor</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Supervisor Contact</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Total Staff</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Status</TableHead>
                      <TableHead className="pr-6 py-3 font-semibold text-xs text-slate-600 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSupervisors.map((agency) => {
                      const agencyStaffCount = getStaffForSupervisor(agency.id).length;
                      return (
                        <TableRow 
                          key={agency.id} 
                          onClick={() => router.push(`/admin/agencies/${agency.id}`)}
                          className="hover:bg-slate-50/50 border-b border-slate-100 last:border-none cursor-pointer transition-colors"
                        >
                          <TableCell className="pl-6 py-4 font-bold text-slate-800 text-sm">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {agency.agency_name ? agency.agency_name.charAt(0).toUpperCase() : agency.name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[200px]">
                                {agency.agency_name || `${agency.name} Staffing`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-medium text-slate-700">{agency.name}</div>
                            <span className="text-[10px] text-teal-600 font-semibold uppercase tracking-wider">Supervisor</span>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-0.5 text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{agency.email}</span>
                              </div>
                              {agency.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{agency.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-50 border-none font-semibold text-xs">
                              {agencyStaffCount} staff members
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="capitalize bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-semibold">
                              {agency.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-6 py-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 text-xs ml-auto"
                            >
                              Details
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== 2. STAFF POOL TAB ==================== */}
        <TabsContent value="staff" className="mt-4">
          <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 pb-4">
              <CardTitle className="text-base font-semibold text-slate-800">Temporary Staff Directory</CardTitle>
              <CardDescription className="text-xs">
                Global directory of nurses and care assistants. These workers are managed by supervisors and deployed to care homes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredStaff.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-teal-600" />
                  <p className="font-semibold text-slate-600 text-sm">No agency staff found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search term.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50/50">
                      <TableHead className="pl-6 py-3 font-semibold text-xs text-slate-600">Staff Member</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Agency</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Role</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Skills & Credentials</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Deploy Status</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Current Assignment</TableHead>
                      <TableHead className="pr-6 py-3 font-semibold text-xs text-slate-600 text-right">Registration Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((staff) => {
                      const supervisor = supervisorsList.find(s => s.id === staff.supervisor_id);
                      const agencyName = supervisor 
                        ? (supervisor.agency_name || `${supervisor.name} Staffing`)
                        : "Global / Shared Pool";
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
                            <span className={`text-xs font-semibold ${supervisor ? "text-slate-700" : "text-slate-400 italic"}`}>
                              {agencyName}
                            </span>
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
        </TabsContent>

        {/* ==================== 3. DEPLOYMENTS TAB ==================== */}
        <TabsContent value="assignments" className="mt-4">
          <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 pb-4">
              <CardTitle className="text-base font-semibold text-slate-800">Active deployments</CardTitle>
              <CardDescription className="text-xs">
                Real-time tracking of temporary workers currently deployed on-shift at different Care Homes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredAssignments.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-30 text-teal-600" />
                  <p className="font-semibold text-slate-600 text-sm">No active deployments</p>
                  <p className="text-xs text-slate-400 mt-1">There are no agency workers currently working active shifts.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50/50">
                      <TableHead className="pl-6 py-3 font-semibold text-xs text-slate-600">Active Staff</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Role</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Assigned Care Home</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Assigned Unit/Team</TableHead>
                      <TableHead className="py-3 font-semibold text-xs text-slate-600">Activation Date</TableHead>
                      <TableHead className="pr-6 py-3 font-semibold text-xs text-slate-600 text-right">Verification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map((assignment) => (
                      <TableRow key={assignment.id} className="hover:bg-slate-50/30 border-b border-slate-100 last:border-none">
                        <TableCell className="pl-6 py-4">
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{assignment.staffName}</div>
                            <div className="text-xs text-slate-500">{assignment.staffEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className={`capitalize font-semibold text-[10px] ${
                            assignment.role === "nurse" 
                              ? "bg-teal-50 text-teal-700 border-teal-100" 
                              : "bg-blue-50 text-blue-700 border-blue-100"
                          }`}>
                            {assignment.role === "nurse" ? "Nurse" : "Care Assistant"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-semibold text-slate-700 flex items-center gap-1 text-sm">
                            <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            {assignment.careHomeName}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-xs font-medium text-slate-600">
                          {assignment.teamName}
                        </TableCell>
                        <TableCell className="py-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDate(assignment.activatedAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 py-4 text-right">
                          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            Live Shift Access
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


    </div>
  );
}
