"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Building2,
  Shield,
  Calendar,
  Cloud,
  Plus,
  Trash2,
  Loader2,
  Check,
  Briefcase,
  TrendingUp,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudSun,
} from "lucide-react";
import { format } from "date-fns";
import { auditService } from "@/lib/audit-service";

type AssignedActionPlan = {
  id: string;
  description: string;
  status?: string;
  priority?: string;
  due_date?: string;
  resident_name?: string;
  auditCategory?: string;
  actionPlanTable?: string;
};
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { supabase, isLoading: isSupabaseLoading } = useSupabase();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Todo / Note lists state
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Tab state for My Tasks
  const [activeTaskTab, setActiveTaskTab] = useState<"mine" | "assigned">("mine");

  // Real data states
  const [chartTimeRange, setChartTimeRange] = useState<7 | 30>(7);
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalIncidentsCount, setTotalIncidentsCount] = useState(0);
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);
  const [resolvedIncidentsCount, setResolvedIncidentsCount] = useState(0);
  const [underReviewIncidentsCount, setUnderReviewIncidentsCount] = useState(0);
  const [assignedActionPlans, setAssignedActionPlans] = useState<AssignedActionPlan[]>([]);
  const [userPendingTodos, setUserPendingTodos] = useState<any[]>([]);
  const [residentTrend, setResidentTrend] = useState(0);
  const [staffTrend, setStaffTrend] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [occupancyTrend, setOccupancyTrend] = useState(0);

  // Weather / Geolocation state
  const [locationText, setLocationText] = useState("Belfast, Northern Ireland");
  const [temperature, setTemperature] = useState(16);
  const [weatherCode, setWeatherCode] = useState(3); // default overcast/cloud

  const activeOrganizationId = profile?.active_organization_id;
  const activeCareHomeId = profile?.active_care_home_id;
  const activeTeamId = profile?.active_team_id;

  // Fetch real location and weather dynamically via free APIs
  useEffect(() => {
    async function getRealLocationAndWeather() {
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        if (!ipRes.ok) return;
        const ipData = await ipRes.json();
        const city = ipData.city || "Belfast";
        const region = ipData.region || "Northern Ireland";
        const lat = ipData.latitude;
        const lon = ipData.longitude;
        
        if (lat && lon) {
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
          if (weatherRes.ok) {
            const weatherData = await weatherRes.json();
            const temp = Math.round(weatherData.current_weather.temperature);
            const code = weatherData.current_weather.weathercode;
            setTemperature(temp);
            setWeatherCode(code);
          }
        }
        setLocationText(`${city}, ${region}`);
      } catch (err) {
        console.error("Failed to fetch location or weather:", err);
      }
    }
    getRealLocationAndWeather();
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-5 h-5 text-amber-500" />;
    if (code === 1 || code === 2) return <CloudSun className="w-5 h-5 text-gray-400" />;
    if (code === 3 || code === 45 || code === 48) return <Cloud className="w-5 h-5 text-gray-400" />;
    if (code >= 51 && code <= 55) return <CloudDrizzle className="w-5 h-5 text-blue-400" />;
    if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return <CloudRain className="w-5 h-5 text-blue-500" />;
    if (code >= 71 && code <= 77) return <CloudSnow className="w-5 h-5 text-blue-300" />;
    if (code >= 95) return <CloudLightning className="w-5 h-5 text-yellow-500" />;
    return <Cloud className="w-5 h-5 text-gray-400" />;
  };

  const fetchDashboardData = useCallback(async () => {
    if (!profile || isSupabaseLoading) return;

    setDataLoading(true);
    try {
      let residentsRes, staffRes, teamsRes;

      if (activeTeamId) {
        const [resData, staffData, teamsData] = await Promise.all([
          supabase.from("residents").select("id", { count: "exact", head: true }).eq("team_id", activeTeamId),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("active_team_id", activeTeamId),
          supabase.from("teams").select("id, name").eq("care_home_id", activeCareHomeId),
        ]);
        residentsRes = resData;
        staffRes = staffData;
        teamsRes = teamsData;
      } else if (activeCareHomeId) {
        const [resData, staffData, teamsData] = await Promise.all([
          supabase.from("residents").select("id", { count: "exact", head: true }).eq("care_home_id", activeCareHomeId),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("active_care_home_id", activeCareHomeId),
          supabase.from("teams").select("id, name").eq("care_home_id", activeCareHomeId),
        ]);
        residentsRes = resData;
        staffRes = staffData;
        teamsRes = teamsData;
      } else {
        const [resData, staffData, teamsData] = await Promise.all([
          supabase.from("residents").select("id", { count: "exact", head: true }).eq("organization_id", activeOrganizationId),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("active_organization_id", activeOrganizationId),
          supabase.from("teams").select("id, name").eq("organization_id", activeOrganizationId),
        ]);
        residentsRes = resData;
        staffRes = staffData;
        teamsRes = teamsData;
      }

      // Trends (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();

      let resAddedQuery = supabase
        .from("residents")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoStr);

      let resDischargedQuery = supabase
        .from("residents")
        .select("id", { count: "exact", head: true })
        .eq("status", "discharged")
        .gte("discharge_date", sevenDaysAgoStr);

      let staffAddedQuery = supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoStr);

      if (activeTeamId) {
        resAddedQuery = resAddedQuery.eq("team_id", activeTeamId);
        resDischargedQuery = resDischargedQuery.eq("team_id", activeTeamId);
        staffAddedQuery = staffAddedQuery.eq("active_team_id", activeTeamId);
      } else if (activeCareHomeId) {
        resAddedQuery = resAddedQuery.eq("care_home_id", activeCareHomeId);
        resDischargedQuery = resDischargedQuery.eq("care_home_id", activeCareHomeId);
        staffAddedQuery = staffAddedQuery.eq("active_care_home_id", activeCareHomeId);
      } else {
        resAddedQuery = resAddedQuery.eq("organization_id", activeOrganizationId);
        resDischargedQuery = resDischargedQuery.eq("organization_id", activeOrganizationId);
        staffAddedQuery = staffAddedQuery.eq("active_organization_id", activeOrganizationId);
      }

      const [resAddedRes, resDischargedRes, staffAddedRes] = await Promise.all([
        resAddedQuery,
        resDischargedQuery,
        staffAddedQuery
      ]);

      const resAddedCount = resAddedRes.count || 0;
      const resDischargedCount = resDischargedRes.count || 0;
      const netResChange = resAddedCount - resDischargedCount;
      setResidentTrend(netResChange);
      setStaffTrend(staffAddedRes.count || 0);

      // Occupancy Rate
      let activeResQuery = supabase
        .from("residents")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

      if (activeTeamId) {
        activeResQuery = activeResQuery.eq("team_id", activeTeamId);
      } else if (activeCareHomeId) {
        activeResQuery = activeResQuery.eq("care_home_id", activeCareHomeId);
      } else {
        activeResQuery = activeResQuery.eq("organization_id", activeOrganizationId);
      }

      const activeResData = await activeResQuery;
      const activeCount = activeResData.count || 0;
      const capacity = Math.max(50, activeCount);
      const computedOccupancyRate = Math.round((activeCount / capacity) * 100);
      setOccupancyRate(computedOccupancyRate);

      const activeCount7DaysAgo = Math.max(0, activeCount - netResChange);
      const capacity7DaysAgo = Math.max(50, activeCount7DaysAgo);
      const occupancyRate7DaysAgo = Math.round((activeCount7DaysAgo / capacity7DaysAgo) * 100);
      setOccupancyTrend(computedOccupancyRate - occupancyRate7DaysAgo);

      // Incident Graph Query (last 7 or 30 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - chartTimeRange + 1);
      const startDateStr = startDate.toISOString().split("T")[0];

      let graphQuery = supabase
        .from("incidents")
        .select(`
          id, date, status,
          resident:residents!inner(care_home_id, team_id)
        `)
        .gte("date", startDateStr);

      if (activeTeamId) {
        graphQuery = graphQuery.eq("resident.team_id", activeTeamId);
      } else if (activeCareHomeId) {
        graphQuery = graphQuery.eq("resident.care_home_id", activeCareHomeId);
      } else {
        graphQuery = graphQuery.eq("organization_id", activeOrganizationId);
      }

      const { data: graphIncidents } = await graphQuery;

      const dateMap: { [key: string]: number } = {};
      for (let i = chartTimeRange - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = format(d, "MMM d");
        dateMap[label] = 0;
      }

      if (graphIncidents) {
        graphIncidents.forEach((inc: any) => {
          if (!inc.date) return;
          try {
            const parts = inc.date.split("-");
            if (parts.length === 3) {
              const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
              const label = format(d, "MMM d");
              if (label in dateMap) {
                dateMap[label]++;
              }
            }
          } catch (e) {
            console.error("Error parsing incident date:", e);
          }
        });
      }

      const processedChartData = Object.keys(dateMap).map(key => ({
        date: key,
        Incidents: dateMap[key],
      }));
      setChartData(processedChartData);

      // Incidents Status Breakdown Query
      let allIncidentsQuery = supabase
        .from("incidents")
        .select(`
          id, status,
          resident:residents!inner(care_home_id, team_id)
        `);

      if (activeTeamId) {
        allIncidentsQuery = allIncidentsQuery.eq("resident.team_id", activeTeamId);
      } else if (activeCareHomeId) {
        allIncidentsQuery = allIncidentsQuery.eq("resident.care_home_id", activeCareHomeId);
      } else {
        allIncidentsQuery = allIncidentsQuery.eq("organization_id", activeOrganizationId);
      }

      const { data: allIncidents } = await allIncidentsQuery;
      let totalInc = 0;
      let openInc = 0;
      let resolvedInc = 0;
      let reviewInc = 0;

      if (allIncidents) {
        totalInc = allIncidents.length;
        allIncidents.forEach((inc: any) => {
          const status = inc.status?.toLowerCase() || "pending";
          if (status === "resolved" || status === "completed") {
            resolvedInc++;
          } else if (status === "under_review" || status === "under-review" || status === "review") {
            reviewInc++;
          } else {
            openInc++;
          }
        });
      }
      setTotalIncidentsCount(totalInc);
      setOpenIncidentsCount(openInc);
      setResolvedIncidentsCount(resolvedInc);
      setUnderReviewIncidentsCount(reviewInc);

      // Fetch user's pending todos (for "Mine" tab)
      const { data: userPendingTodosData } = await supabase
        .from("todos")
        .select("*")
        .eq("organization_id", activeOrganizationId)
        .eq("created_by", profile.id)
        .eq("is_completed", false)
        .order("created_at", { ascending: false });

      setUserPendingTodos(userPendingTodosData || []);

      // Fetch action plans assigned to the current user (for "Assigned" tab)
      const assignedPlansData = await auditService.getAssignedActionPlans({
        userId: profile.id,
        email: profile.email,
        organizationId: activeOrganizationId,
        careHomeId: activeCareHomeId,
        role: profile.role,
      });
      setAssignedActionPlans(
        (assignedPlansData as AssignedActionPlan[]).sort((a, b) => {
          const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          return aDue - bDue;
        })
      );

      // Fetch Latest Incidents with resident details (including room number)
      let incidentsQuery = supabase
        .from("incidents")
        .select(`
          id, incident_types, type_other_details, 
          incident_level, date, time, resident_id,
          resident:residents!inner(first_name, last_name, care_home_id, team_id, room_number)
        `)
        .order("date", { ascending: false })
        .limit(5);

      if (activeTeamId) {
        incidentsQuery = incidentsQuery.eq("resident.team_id", activeTeamId);
      } else if (activeCareHomeId) {
        incidentsQuery = incidentsQuery.eq("resident.care_home_id", activeCareHomeId);
      } else if (activeOrganizationId) {
        incidentsQuery = incidentsQuery.eq("organization_id", activeOrganizationId);
      }

      const { data: incidents } = await incidentsQuery;

      // Fetch Upcoming Appointments
      let appointmentsQuery = supabase
        .from("appointments")
        .select(`
          id, title, start_time, resident_id,
          resident:residents!inner(first_name, last_name, care_home_id, team_id, room_number)
        `)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5);

      if (activeTeamId) {
        appointmentsQuery = appointmentsQuery.eq("resident.team_id", activeTeamId);
      } else if (activeCareHomeId) {
        appointmentsQuery = appointmentsQuery.eq("resident.care_home_id", activeCareHomeId);
      } else if (activeOrganizationId) {
        appointmentsQuery = appointmentsQuery.eq("organization_id", activeOrganizationId);
      }

      const { data: appointments } = await appointmentsQuery;



      const unitNames = teamsRes?.data && teamsRes.data.length > 0
        ? teamsRes.data.map((t: any) => t.name).join(", ")
        : "Linden, Maple, Oak";

      setDashboardData({
        totalResidents: residentsRes.count || 0,
        totalStaff: staffRes.count || 0,
        totalUnits: teamsRes.data?.length || 0,
        unitNames: unitNames,
        latestIncidents: incidents || [],
        upcomingAppointments: appointments || [],
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setDataLoading(false);
    }
  }, [profile, activeOrganizationId, activeCareHomeId, activeTeamId, isSupabaseLoading, supabase, chartTimeRange]);

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

  // Helper function to extract initials
  const getInitials = (firstName: string, lastName: string) => {
    const f = firstName?.[0] || "";
    const l = lastName?.[0] || "";
    return `${f}${l}`.toUpperCase() || "RE";
  };

  // Deterministic styling for initials avatar matching template
  const getInitialsColor = (initials: string) => {
    const init = initials.toUpperCase();
    if (init === "MT") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (init === "JW") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (init === "EF") return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    if (init === "RB") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (init === "DA") return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";

    const charSum = init.charCodeAt(0) + (init.charCodeAt(1) || 0);
    const colors = [
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    ];
    return colors[charSum % colors.length];
  };

  // Severity style mapper
  const getPriorityStyles = (level: string) => {
    const lvl = level?.toLowerCase() || "";
    if (lvl.includes("death") || lvl.includes("permanent") || lvl.includes("critical") || lvl.includes("high")) {
      return { label: "High", className: "text-red-700 bg-red-50 border-red-200" };
    } else if (lvl.includes("minor") || lvl.includes("injury") || lvl.includes("moderate") || lvl.includes("medium")) {
      return { label: "Medium", className: "text-amber-700 bg-amber-50 border-amber-200" };
    }
    return { label: "Low", className: "text-green-700 bg-green-50 border-green-200" };
  };

  // Date formatters
  const formatIncidentTime = (dateStr: string, timeStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      const timeFormatted = timeStr ? timeStr.toUpperCase() : "";

      if (d.toDateString() === today.toDateString()) {
        return `Today, ${timeFormatted || "N/A"}`;
      } else if (d.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${timeFormatted || "N/A"}`;
      } else {
        return `${format(d, "d MMM")}, ${timeFormatted || "N/A"}`;
      }
    } catch (e) {
      return dateStr;
    }
  };

  const formatAppointmentTime = (startTimeStr: string) => {
    if (!startTimeStr) return { date: "N/A", time: "N/A" };
    try {
      const d = new Date(startTimeStr);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const timeFormatted = format(d, "h:mm a");

      if (d.toDateString() === today.toDateString()) {
        return { date: "Today", time: timeFormatted };
      } else if (d.toDateString() === tomorrow.toDateString()) {
        return { date: "Tomorrow", time: timeFormatted };
      } else {
        return { date: format(d, "d MMM"), time: timeFormatted };
      }
    } catch (e) {
      return { date: "N/A", time: "N/A" };
    }
  };

  const formatNoteDate = (dateStr: string) => {
    if (!dateStr) return { label: "", className: "" };
    try {
      const d = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (d.toDateString() === today.toDateString()) {
        return { label: "Today", className: "text-green-600 font-semibold" };
      } else if (d.toDateString() === yesterday.toDateString()) {
        return { label: "Yesterday", className: "text-gray-400" };
      } else {
        return { label: format(d, "MMM d"), className: "text-gray-400" };
      }
    } catch (e) {
      return { label: "", className: "" };
    }
  };

  // Todo interactions
  const handleToggleNote = async (id: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from("todos")
        .update({
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null,
          completed_by: !isCompleted ? profile?.id : null,
        })
        .eq("id", id);

      if (error) throw error;
      fetchDashboardData();
    } catch (error) {
      console.error("Error toggling note:", error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
      fetchDashboardData();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleCompleteActionPlan = async (plan: AssignedActionPlan) => {
    if (!profile?.id) return;
    try {
      await auditService.updateActionPlanStatus(
        plan.auditCategory || "common",
        plan.id,
        "completed",
        undefined,
        profile.id,
        profile.name || profile.email
      );
      fetchDashboardData();
    } catch (err) {
      console.error("Error completing action plan:", err);
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !activeOrganizationId || !profile?.id) return;
    try {
      const { error } = await supabase.from("todos").insert({
        title: newNoteTitle.trim(),
        organization_id: activeOrganizationId,
        team_id: activeTeamId || null,
        created_by: profile.id,
        is_completed: false,
      });

      if (error) throw error;
      setNewNoteTitle("");
      setIsAddingNote(false);
      fetchDashboardData();
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  if (isProfileLoading || isSupabaseLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const todayDateText = format(new Date(), "EEEE, d MMMM yyyy");


  return (
    <div className="w-full space-y-6">
      {/* Home topbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5 mb-6">
        <div>
          <div className="text-xs text-gray-400 font-medium">Welcome back, 👋</div>
          <div className="text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5">
            {profile?.name || "Abi George"}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-medium">
            Here's what's happening at {profile?.care_home_name || "Maple Court Care Home"} today.
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-2.5 border border-gray-200 bg-white rounded-xl shadow-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute -top-1.5 -right-1.5 bg-green-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
              3
            </span>
          </button>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-right hidden sm:block shadow-xs">
            <div className="text-xs font-bold text-gray-900">{todayDateText}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{locationText}</div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-xs">
            {getWeatherIcon(weatherCode)}
            {temperature}°C
          </div>
        </div>
      </div>

      {/* Stats cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Residents */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Total Residents
          </div>
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                  {dashboardData?.totalResidents ?? 0}
                </span>
                <span className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 self-center ${
                  residentTrend >= 0
                    ? "text-green-700 bg-green-50 border border-green-200"
                    : "text-red-700 bg-red-50 border border-red-200"
                }`}>
                  {residentTrend >= 0 ? `+${residentTrend}` : residentTrend}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">vs last 7 days</div>
            </div>
          </div>
        </div>

        {/* Total Staff */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Total Staff
          </div>
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                  {dashboardData?.totalStaff ?? 0}
                </span>
                <span className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 self-center ${
                  staffTrend >= 0
                    ? "text-green-700 bg-green-50 border border-green-200"
                    : "text-red-700 bg-red-50 border border-red-200"
                }`}>
                  {staffTrend >= 0 ? `+${staffTrend}` : staffTrend}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">vs last 7 days</div>
            </div>
          </div>
        </div>

        {/* Total Units */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Total Units
          </div>
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                {dashboardData?.totalUnits ?? 0}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 max-w-[150px] truncate">
                {dashboardData?.unitNames || "None"}
              </div>
            </div>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Occupancy Rate
          </div>
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                  {occupancyRate}%
                </span>
                <span className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 self-center ${
                  occupancyTrend >= 0
                    ? "text-green-700 bg-green-50 border border-green-200"
                    : "text-red-700 bg-red-50 border border-red-200"
                }`}>
                  {occupancyTrend >= 0 ? `+${occupancyTrend}%` : `${occupancyTrend}%`}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">vs last 7 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle row grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Latest Incidents */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col h-[380px] overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3 shrink-0">
            <div className="text-sm font-bold text-gray-900 tracking-tight">Latest Incidents</div>
            <span
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
              onClick={() => router.push("/dashboard/incidents")}
            >
              View all
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2">Resident</th>
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2">Incident</th>
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2">Time</th>
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2">Priority</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.latestIncidents && dashboardData.latestIncidents.length > 0 ? (
                  dashboardData.latestIncidents.map((incident: any) => {
                    const initials = getInitials(
                      incident.resident?.first_name || "",
                      incident.resident?.last_name || ""
                    );
                    const initialsColor = getInitialsColor(initials);
                    const prio = getPriorityStyles(incident.incident_level || "");

                    return (
                      <tr
                        key={incident.id}
                        className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() =>
                          incident.resident_id &&
                          router.push(`/dashboard/residents/${incident.resident_id}/incidents`)
                        }
                      >
                        <td className="py-3 text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${initialsColor}`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 truncate">
                                {incident.resident
                                  ? `${incident.resident.first_name} ${incident.resident.last_name}`
                                  : "Unknown"}
                              </div>
                              <div className="text-[9px] text-gray-400">
                                {incident.resident?.room_number
                                  ? `Room ${incident.resident.room_number}`
                                  : "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-xs text-gray-600 max-w-[100px] truncate">
                          {incident.incident_types && incident.incident_types.length > 0
                            ? incident.incident_types[0]
                            : incident.type_other_details || "Unknown"}
                        </td>
                        <td className="py-3 text-[10px] text-gray-400 whitespace-nowrap">
                          {formatIncidentTime(incident.date, incident.time)}
                        </td>
                        <td className="py-3 text-xs">
                          <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${prio.className}`}>
                            {prio.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-400 text-xs">
                      No recent incidents recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col h-[380px] overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3 shrink-0">
            <div className="text-sm font-bold text-gray-900 tracking-tight">Upcoming Appointments</div>
            <span
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
              onClick={() => router.push("/dashboard/appointment")}
            >
              View all
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {dashboardData?.upcomingAppointments && dashboardData.upcomingAppointments.length > 0 ? (
              dashboardData.upcomingAppointments.map((appt: any) => {
                const initials = getInitials(
                  appt.resident?.first_name || "",
                  appt.resident?.last_name || ""
                );
                const initialsColor = getInitialsColor(initials);
                const timeInfo = formatAppointmentTime(appt.start_time);

                return (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
                    onClick={() =>
                      appt.resident_id &&
                      router.push(`/dashboard/residents/${appt.resident_id}/appointments`)
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${initialsColor}`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-xs truncate">
                          {appt.resident
                            ? `${appt.resident.first_name} ${appt.resident.last_name}`
                            : "Unknown"}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">{appt.title || "Checkup"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-900">{timeInfo.date}</div>
                        <div className="text-[9px] text-gray-400 mt-0.5">{timeInfo.time}</div>
                      </div>
                      <div className="w-6 h-6 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-400 text-xs">
                No upcoming appointments.
              </div>
            )}
          </div>
        </div>

        {/* My Tasks */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col h-[380px] overflow-hidden justify-between">
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="text-sm font-bold text-gray-900 tracking-tight">My Tasks</div>
              {activeTaskTab === "mine" && !isAddingNote && (
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-100 hover:bg-green-100 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  + Add Task
                </button>
              )}
            </div>

            <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-4 shrink-0 p-0.5 bg-gray-50">
              <button
                onClick={() => setActiveTaskTab("mine")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTaskTab === "mine"
                    ? "bg-white text-green-700 shadow-xs border border-gray-100"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Mine
              </button>
              <button
                onClick={() => setActiveTaskTab("assigned")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTaskTab === "assigned"
                    ? "bg-white text-green-700 shadow-xs border border-gray-100"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Assigned
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {activeTaskTab === "mine" ? (
                userPendingTodos && userPendingTodos.length > 0 ? (
                  userPendingTodos.map((todo: any) => (
                    <div key={todo.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-b-0 group">
                      <button
                        onClick={() => handleToggleNote(todo.id, false)}
                        className="w-4 h-4 rounded-md border border-gray-300 hover:border-gray-400 bg-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900 truncate">{todo.title}</div>
                        {todo.due_date && (
                          <div className="text-[9px] text-gray-400 mt-0.5">
                            Due: {format(new Date(todo.due_date), "MMM d")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-10 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <div className="text-4xl mb-2 filter saturate-100">🥑</div>
                    <div className="text-xs font-bold text-gray-900">No personal tasks</div>
                    <div className="text-[10px] text-gray-400 mt-1 max-w-[170px]">
                      You have no pending personal to-dos.
                    </div>
                  </div>
                )
              ) : (
                assignedActionPlans && assignedActionPlans.length > 0 ? (
                  assignedActionPlans.map((plan) => (
                    <div
                      key={`${plan.auditCategory ?? "plan"}:${plan.id}`}
                      className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-b-0 group cursor-pointer"
                      onClick={() => router.push("/dashboard/action-plans")}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteActionPlan(plan);
                        }}
                        className="w-4 h-4 rounded-md border border-gray-300 hover:border-gray-400 bg-white flex items-center justify-center transition-all shrink-0 mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900 leading-snug break-words">
                          {plan.description}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {plan.resident_name ? (
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-1.5 py-0.5">
                              {plan.resident_name}
                            </span>
                          ) : null}
                          {plan.priority ? (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-1.5 py-0.5">
                              {plan.priority}
                            </span>
                          ) : null}
                          {plan.auditCategory ? (
                            <span className="text-[9px] text-gray-500 capitalize">
                              {plan.auditCategory}
                            </span>
                          ) : null}
                          {plan.due_date ? (
                            <span className="text-[9px] text-gray-400">
                              Due: {format(new Date(plan.due_date), "MMM d")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-10 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <div className="text-4xl mb-2 filter saturate-100">📋</div>
                    <div className="text-xs font-bold text-gray-900">No assigned action plans</div>
                    <div className="text-[10px] text-gray-400 mt-1 max-w-[170px]">
                      You have no pending action plans assigned to you.
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Add task/note input at the bottom of My Tasks */}
          {activeTaskTab === "mine" && (
            <div className="mt-4 pt-3 border-t border-gray-100 shrink-0">
              {isAddingNote ? (
                <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
                  <Input
                    value={newNoteTitle}
                    onChange={e => setNewNoteTitle(e.target.value)}
                    placeholder="Type your task..."
                    className="h-8 text-xs flex-1 border-gray-300 focus-visible:ring-green-600 focus-visible:border-green-600"
                    autoFocus
                    onBlur={() => {
                      if (!newNoteTitle.trim()) {
                        setIsAddingNote(false);
                      }
                    }}
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white px-3 font-semibold">
                    Add
                  </Button>
                </form>
              ) : (
                <div
                  onClick={() => setIsAddingNote(true)}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-green-600 cursor-pointer font-bold transition-colors py-1 select-none"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  Add personal task
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="w-full">
        {/* Incident Overview Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="text-sm font-bold text-gray-900 tracking-tight">Incident Overview</div>
              <select
                value={chartTimeRange}
                onChange={(e) => setChartTimeRange(Number(e.target.value) as 7 | 30)}
                className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white cursor-pointer hover:border-gray-300 outline-none"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>

            <div className="w-full mt-2">
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    domain={[0, Math.max(5, ...chartData.map(d => d.Incidents || 0)) + 2]}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Incidents"
                    stroke="#16a34a"
                    strokeWidth={2.2}
                    fillOpacity={1}
                    fill="url(#incidentGrad)"
                    dot={{ r: 4, fill: "#16a34a", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
              <div>
                <div className="text-base font-extrabold text-gray-900 leading-none">{totalIncidentsCount}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Total Incidents</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
              <div>
                <div className="text-base font-extrabold text-gray-900 leading-none">{openIncidentsCount}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Open</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
              <div>
                <div className="text-base font-extrabold text-gray-900 leading-none">{resolvedIncidentsCount}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Resolved</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#9ca3af]" />
              <div>
                <div className="text-base font-extrabold text-gray-900 leading-none">{underReviewIncidentsCount}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Under Review</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
