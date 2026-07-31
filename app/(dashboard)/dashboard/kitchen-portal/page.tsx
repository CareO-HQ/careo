"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Loader2,
  Utensils,
  Search,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  User,
  Droplets,
  PlusCircle,
  CalendarIcon,
  ClipboardList,
  MessageSquare,
  Clock,
  Edit3,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { KitchenDietNotificationBell } from "@/components/kitchen/KitchenDietNotificationBell";
import { auditService } from "@/lib/audit-service";

type OrgMemberRow = {
  id: string;
  email: string;
  name: string | null;
  image_url: string | null;
  role: string | null;
};

type AllergyItem = {
  allergy: string;
};

type DietInfo = {
  id?: string;
  resident_id: string;
  diet_types?: string[];
  other_diet_type?: string;
  cultural_restrictions?: string;
  allergies?: AllergyItem[];
  choking_risk?: "low" | "medium" | "high" | string;
  food_consistency?: string;
  fluid_consistency?: string;
  assistance_required?: "yes" | "no" | string;
  chef_notified?: "yes" | "no" | string;
  chef_name?: string;
};

type ResidentWithDiet = {
  id: string;
  first_name: string;
  last_name: string;
  image_url: string | null;
  room_number?: string | null;
  fluid_target?: number | null;
  team_id?: string | null;
  team_name?: string | null;
  diet?: DietInfo | null;
};

const FOOD_CONSISTENCY_LABELS: Record<string, string> = {
  level7: "Level 7 - Regular",
  level6: "Level 6 - Soft & Bite-Sized",
  level5: "Level 5 - Minced & Moist",
  level4: "Level 4 - Pureed",
  level3: "Level 3 - Liquidised",
};

const FLUID_CONSISTENCY_LABELS: Record<string, string> = {
  level0: "Level 0 - Thin",
  level1: "Level 1 - Slightly Thick",
  level2: "Level 2 - Mildly Thick",
  level3: "Level 3 - Moderately Thick",
  level4: "Level 4 - Extremely Thick",
};

export default function KitchenPortalPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { data: session } = authClient.useSession();
  const searchParams = useSearchParams();
  const userId = session?.user?.id || profile?.id || "";
  const userEmail = session?.user?.email || profile?.email || "";

  const [activeTab, setActiveTab] = useState<"diet_info" | "action_plans">("diet_info");

  const [residents, setResidents] = useState<ResidentWithDiet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [chokingFilter, setChokingFilter] = useState<string>("all");
  const [allergyFilter, setAllergyFilter] = useState<string>("all");
  const [highlightedResidentId, setHighlightedResidentId] = useState<string | null>(null);

  // Action plan state & filter
  const [actionPlans, setActionPlans] = useState<Record<string, any>[]>([]);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [planStatusFilter, setPlanStatusFilter] = useState<string>("all");

  // Status update modal state
  const [selectedPlanForUpdate, setSelectedPlanForUpdate] = useState<Record<string, any> | null>(null);
  const [updateStatusDialogOpen, setUpdateStatusDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  const [updateComment, setUpdateComment] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Action plan creation state
  const [orgMembers, setOrgMembers] = useState<OrgMemberRow[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedToEmail, setAssignedToEmail] = useState("");
  const [createPriority, setCreatePriority] = useState("");
  const [createDueDate, setCreateDueDate] = useState<Date | undefined>();
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [isSubmittingActionPlan, setIsSubmittingActionPlan] = useState(false);

  const activeOrganizationId = profile?.active_organization_id;
  const activeCareHomeId = profile?.active_care_home_id;
  const activeTeamId = profile?.active_team_id;
  const activeTeamName = profile?.active_team_name;

  useEffect(() => {
    if (!activeOrganizationId) return;
    let cancelled = false;
    void auditService.getOrganizationMembers(activeOrganizationId).then((data) => {
      if (!cancelled && Array.isArray(data)) {
        setOrgMembers(data as OrgMemberRow[]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId]);

  const assignableOrgMembers = useMemo(() => {
    return orgMembers.filter((m) => m.role !== "owner");
  }, [orgMembers]);

  const fetchActionPlans = useCallback(async () => {
    if (!activeOrganizationId || (!userId && !userEmail)) return;
    try {
      setIsPlansLoading(true);
      const plans = await auditService.getMyActionPlans({
        userId,
        email: userEmail,
        organizationId: activeOrganizationId,
        careHomeId: activeCareHomeId,
        role: profile?.role,
      });
      setActionPlans(plans || []);
    } catch (err) {
      console.error("Failed to fetch kitchen action plans:", err);
    } finally {
      setIsPlansLoading(false);
    }
  }, [activeOrganizationId, activeCareHomeId, userId, userEmail, profile?.role]);

  useEffect(() => {
    void fetchActionPlans();
  }, [fetchActionPlans]);

  // Realtime subscription for common action plan status changes
  useEffect(() => {
    if (!activeOrganizationId) return;
    const channel = supabase
      .channel("kitchen-common-action-plans-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "care_home_common_action_plans",
          filter: `organization_id=eq.${activeOrganizationId}`,
        },
        () => {
          void fetchActionPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrganizationId, fetchActionPlans]);

  const handleAddCommonActionPlan = async () => {
    if (!actionPlanText.trim() || !assignedTo || !assignedToEmail || !createPriority || !createDueDate) {
      toast.error("Please fill all action plan fields");
      return;
    }
    if (!activeOrganizationId || !activeCareHomeId || !profile?.id) {
      toast.error("Select organization and care home to add an action plan");
      return;
    }
    const assigneeMember = assignableOrgMembers.find((m) => m.email === assignedToEmail);
    if (!assigneeMember || assigneeMember.role === "owner") {
      toast.error("Cannot assign common action plans to the organization owner.");
      return;
    }
    try {
      setIsSubmittingActionPlan(true);
      await auditService.createCareHomeCommonActionPlan({
        description: actionPlanText.trim(),
        priority: createPriority,
        due_date: createDueDate.toISOString(),
        assigned_to: assignedTo,
        assigned_to_email: assignedToEmail,
        assigned_to_name: assigneeMember.name?.trim() || assigneeMember.email || undefined,
        organization_id: activeOrganizationId,
        careHomeId: activeCareHomeId,
        creatorId: profile.id,
        created_by: profile.id,
        created_by_name: profile.name || profile.email || "Kitchen Staff",
      });
      toast.success("Action plan created successfully");
      setActionPlanText("");
      setAssignedTo("");
      setAssignedToEmail("");
      setCreatePriority("");
      setCreateDueDate(undefined);
      setCreateDialogOpen(false);
      void fetchActionPlans();
    } catch (error) {
      console.error("Failed to create action plan:", error);
      toast.error("Failed to create action plan. Please try again.");
    } finally {
      setIsSubmittingActionPlan(false);
    }
  };

  const handleOpenUpdateModal = (plan: Record<string, any>) => {
    setSelectedPlanForUpdate(plan);
    const status = (plan.status || "pending").replace(/-/g, "_");
    if (status === "in_progress" || status === "completed" || status === "pending") {
      setUpdateStatus(status as any);
    } else {
      setUpdateStatus("pending");
    }
    setUpdateComment((plan.latest_comment as string) || "");
    setUpdateStatusDialogOpen(true);
  };

  const handleSaveStatusUpdate = async () => {
    if (!selectedPlanForUpdate || !userId) return;
    try {
      setIsUpdatingStatus(true);
      await auditService.updateActionPlanStatus(
        "common",
        selectedPlanForUpdate.id as string,
        updateStatus,
        updateComment.trim() || undefined,
        userId,
        profile?.name || userEmail || "Kitchen Staff"
      );
      toast.success("Action plan status updated successfully");
      setUpdateStatusDialogOpen(false);
      setSelectedPlanForUpdate(null);
      setUpdateComment("");
      void fetchActionPlans();
    } catch (err) {
      console.error("Failed to update action plan status:", err);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    const resId = searchParams.get("residentId");
    if (resId) {
      setHighlightedResidentId(resId);
      setActiveTab("diet_info");
    }
  }, [searchParams]);

  const handleSelectResidentFromNotif = useCallback((residentId: string, residentName?: string) => {
    setActiveTab("diet_info");
    setHighlightedResidentId(residentId);
    if (residentName && residentName.trim() !== "") {
      setSearchQuery(residentName.trim());
    } else {
      setResidents((prev) => {
        const target = prev.find((r) => r.id === residentId);
        if (target) {
          setSearchQuery(`${target.first_name} ${target.last_name}`);
        }
        return prev;
      });
    }
  }, []);

  const fetchKitchenData = useCallback(async () => {
    if (!activeOrganizationId) return;

    try {
      setIsLoading(true);

      // 1. Fetch residents belonging to active org/care home/team
      let query = supabase
        .from("residents")
        .select(`
          id,
          first_name,
          last_name,
          image_url,
          room_number,
          fluid_target,
          team_id,
          team:teams!team_id(name)
        `)
        .eq("organization_id", activeOrganizationId);

      if (activeCareHomeId) {
        query = query.eq("care_home_id", activeCareHomeId);
      }

      if (activeTeamId) {
        query = query.eq("team_id", activeTeamId);
      }

      query = query.order("first_name", { ascending: true });

      const { data: residentsData, error: residentsError } = await query;

      if (residentsError) {
        console.error("Error fetching residents for kitchen portal:", residentsError);
        throw residentsError;
      }

      if (!residentsData || residentsData.length === 0) {
        setResidents([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch diet_lifestyle information for these residents
      const residentIds = residentsData.map((r) => r.id);
      const { data: dietData, error: dietError } = await supabase
        .from("diet_lifestyle")
        .select("*")
        .in("resident_id", residentIds);

      if (dietError) {
        console.error("Error fetching diet_lifestyle for kitchen portal:", dietError);
      }

      // Map diet info to residents
      const dietMap = new Map<string, DietInfo>();
      (dietData || []).forEach((diet: any) => {
        dietMap.set(diet.resident_id, diet);
      });

      const combined: ResidentWithDiet[] = residentsData.map((res: any) => ({
        id: res.id,
        first_name: res.first_name,
        last_name: res.last_name,
        image_url: res.image_url,
        room_number: res.room_number,
        fluid_target: res.fluid_target,
        team_id: res.team_id,
        team_name: res.team?.name || null,
        diet: dietMap.get(res.id) || null,
      }));

      setResidents(combined);
    } catch (error) {
      console.error("Failed to load kitchen portal data:", error);
      toast.error("Failed to load diet information");
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganizationId, activeCareHomeId, activeTeamId]);

  useEffect(() => {
    fetchKitchenData();
  }, [fetchKitchenData]);

  // Filtering residents based on search query, choking risk, allergy status
  const filteredResidents = useMemo(() => {
    return residents.filter((res) => {
      // Search query filter (name or room)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const fullName = `${res.first_name} ${res.last_name}`.toLowerCase();
        const room = (res.room_number || "").toLowerCase();
        if (!fullName.includes(query) && !room.includes(query)) {
          return false;
        }
      }

      // Choking risk filter
      if (chokingFilter !== "all") {
        if ((res.diet?.choking_risk || "none").toLowerCase() !== chokingFilter) {
          return false;
        }
      }

      // Allergy filter
      if (allergyFilter === "has_allergies") {
        if (!res.diet?.allergies || res.diet.allergies.length === 0) {
          return false;
        }
      } else if (allergyFilter === "no_allergies") {
        if (res.diet?.allergies && res.diet.allergies.length > 0) {
          return false;
        }
      }

      return true;
    });
  }, [residents, searchQuery, chokingFilter, allergyFilter]);

  // Filtered action plans
  const filteredActionPlans = useMemo(() => {
    return actionPlans.filter((plan) => {
      if (planSearchQuery.trim() !== "") {
        const q = planSearchQuery.toLowerCase();
        const desc = (plan.description || "").toLowerCase();
        const assignee = (plan.assigned_to_name || plan.assigned_to_email || "").toLowerCase();
        const creator = (plan.created_by_name || "").toLowerCase();
        if (!desc.includes(q) && !assignee.includes(q) && !creator.includes(q)) {
          return false;
        }
      }

      if (planStatusFilter !== "all") {
        const normStatus = (plan.status || "pending").replace(/-/g, "_");
        const isOverdue =
          plan.due_date &&
          new Date(plan.due_date).getTime() < Date.now() &&
          normStatus !== "completed";

        if (planStatusFilter === "overdue") {
          if (!isOverdue) return false;
        } else {
          if (normStatus !== planStatusFilter) return false;
        }
      }

      return true;
    });
  }, [actionPlans, planSearchQuery, planStatusFilter]);

  const getChokingBadgeColor = (risk?: string) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300 font-semibold";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-300 font-semibold";
      case "low":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusBadge = (status?: string, dueDate?: string) => {
    const normStatus = (status || "pending").replace(/-/g, "_");
    const isOverdue = dueDate && new Date(dueDate).getTime() < Date.now() && normStatus !== "completed";

    if (isOverdue) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300 font-semibold gap-1">
          <AlertTriangle className="w-3 h-3 text-red-600" /> Overdue
        </Badge>
      );
    }

    switch (normStatus) {
      case "completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold gap-1">
            <Loader2 className="w-3 h-3 text-blue-600 animate-spin" /> In Progress
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Pending
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch ((priority || "").toLowerCase()) {
      case "high":
        return <Badge className="bg-red-50 text-red-700 border-red-200">High Priority</Badge>;
      case "medium":
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200">Medium Priority</Badge>;
      case "low":
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Low Priority</Badge>;
    }
  };

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <p className="text-sm text-gray-500 font-medium">Loading kitchen portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
              <Utensils className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Kitchen Staff Portal
                {activeTeamName && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold">
                    Unit: {activeTeamName}
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeTab === "diet_info"
                  ? `Showing diet and dietary requirement cards for ${filteredResidents.length} resident(s)`
                  : `Managing ${actionPlans.length} action plan(s)`}
              </p>
            </div>
          </div>

          {/* Top Actions & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Diet Notifications Bell Icon */}
            {userId && (
              <KitchenDietNotificationBell
                userId={userId}
                organizationId={activeOrganizationId}
                careHomeId={activeCareHomeId}
                activeTeamId={activeTeamId}
                userRole={profile?.role}
                onSelectResident={handleSelectResidentFromNotif}
              />
            )}

            {/* View Specific Controls */}
            {activeTab === "diet_info" ? (
              <>
                {/* Resident Search Input */}
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search resident or room..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-gray-50/50"
                  />
                </div>

                {/* Choking Filter */}
                <Select value={chokingFilter} onValueChange={setChokingFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs bg-gray-50/50">
                    <SelectValue placeholder="Choking Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                  </SelectContent>
                </Select>

                {/* Allergies Filter */}
                <Select value={allergyFilter} onValueChange={setAllergyFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs bg-gray-50/50">
                    <SelectValue placeholder="Allergies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Residents</SelectItem>
                    <SelectItem value="has_allergies">Has Allergies</SelectItem>
                    <SelectItem value="no_allergies">No Allergies</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                {/* Action Plan Search Input */}
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search action plans..."
                    value={planSearchQuery}
                    onChange={(e) => setPlanSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-gray-50/50"
                  />
                </div>

                {/* Action Plan Status Filter */}
                <Select value={planStatusFilter} onValueChange={setPlanStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs bg-gray-50/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {/* Add Action Plan Button */}
            <Button
              type="button"
              className="h-9 gap-1.5 text-xs font-semibold shrink-0"
              onClick={() => setCreateDialogOpen(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Add Action Plan
            </Button>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200/80 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("diet_info")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 flex items-center gap-1.5 ${
              activeTab === "diet_info"
                ? "bg-white text-amber-900 shadow-sm font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Utensils className="w-3.5 h-3.5 text-amber-600" />
            Diet Information ({filteredResidents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("action_plans")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 flex items-center gap-1.5 ${
              activeTab === "action_plans"
                ? "bg-white text-amber-900 shadow-sm font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
            Action Plans ({actionPlans.length})
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "diet_info" ? (
          /* Resident Diet Cards Grid */
          filteredResidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-lg border border-dashed border-gray-300 p-8">
              <div className="p-3 bg-amber-50 rounded-full mb-3">
                <Utensils className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">No resident diet records found</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                {searchQuery || chokingFilter !== "all" || allergyFilter !== "all"
                  ? "Try adjusting your search or filters to see resident diet cards."
                  : "No residents are assigned to this unit yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredResidents.map((res) => {
                const diet = res.diet;
                const hasAllergies = diet?.allergies && diet.allergies.length > 0;
                const isHighlighted = res.id === highlightedResidentId;

                return (
                  <div
                    key={res.id}
                    className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                      isHighlighted
                        ? "ring-2 ring-amber-500 border-amber-500 shadow-md"
                        : "border-gray-200 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {/* Card Top / Header */}
                    <div>
                      <div className="p-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="w-10 h-10 border border-gray-200">
                            <AvatarImage src={res.image_url || ""} />
                            <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white font-semibold text-xs">
                              {res.first_name?.[0]}
                              {res.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-gray-900 truncate">
                              {res.first_name} {res.last_name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {res.room_number && (
                                <span className="text-[11px] font-medium text-gray-600 bg-gray-200/70 px-1.5 py-0.5 rounded">
                                  Rm {res.room_number}
                                </span>
                              )}
                              {res.team_name && (
                                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                                  {res.team_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Content / Diet Information */}
                      <div className="p-3.5 space-y-3">
                        {/* Allergies Banner / Badges */}
                        <div>
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-red-500" /> Allergies
                          </span>
                          {hasAllergies ? (
                            <div className="flex flex-wrap gap-1">
                              {diet.allergies!.map((a, idx) => (
                                <Badge key={idx} className="bg-red-100 text-red-800 border-red-300 text-xs font-semibold">
                                  {a.allergy}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-green-700 font-medium inline-flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                              <CheckCircle2 className="w-3 h-3 text-green-600" /> No known allergies
                            </span>
                          )}
                        </div>

                        {/* Diet Types & Cultural Restrictions */}
                        {((diet?.diet_types && diet.diet_types.length > 0) ||
                          diet?.other_diet_type ||
                          diet?.cultural_restrictions) && (
                          <div>
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                              Diet Types
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {diet.diet_types?.map((type, idx) => (
                                <Badge key={idx} className="bg-blue-50 text-blue-800 border-blue-200 text-xs">
                                  {type}
                                </Badge>
                              ))}
                              {diet.other_diet_type && (
                                <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-xs">
                                  {diet.other_diet_type}
                                </Badge>
                              )}
                              {diet.cultural_restrictions && (
                                <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-xs">
                                  {diet.cultural_restrictions}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* IDDSI Consistency Levels */}
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 space-y-1.5">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
                            IDDSI Consistency
                          </span>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Food:</span>
                              <span className="font-semibold text-gray-900">
                                {diet?.food_consistency
                                  ? FOOD_CONSISTENCY_LABELS[diet.food_consistency] || diet.food_consistency
                                  : "Standard"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Fluid:</span>
                              <span className="font-semibold text-gray-900">
                                {diet?.fluid_consistency
                                  ? FLUID_CONSISTENCY_LABELS[diet.fluid_consistency] || diet.fluid_consistency
                                  : "Standard"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Risk & Assistance Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">
                              Choking Risk
                            </span>
                            <Badge className={`${getChokingBadgeColor(diet?.choking_risk)} text-[11px] py-0.5 capitalize`}>
                              {diet?.choking_risk ? `${diet.choking_risk} Risk` : "Not Assessed"}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">
                              Assistance
                            </span>
                            <span className="font-medium text-gray-800">
                              {diet?.assistance_required === "yes" ? "Required" : "Independent"}
                            </span>
                          </div>
                        </div>

                        {/* Chef Notification & Fluid Target */}
                        {(diet?.chef_notified === "yes" || res.fluid_target) && (
                          <div className="pt-2 border-t border-gray-100 flex flex-col gap-1 text-[11px]">
                            {diet?.chef_notified === "yes" && (
                              <p className="text-gray-600">
                                <span className="font-semibold text-gray-800">Chef Notified:</span>{" "}
                                {diet.chef_name || "Yes"}
                              </p>
                            )}
                            {res.fluid_target && (
                              <p className="text-blue-700 flex items-center gap-1 font-medium">
                                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                                Target: {res.fluid_target} ml/day
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Bottom / Footer Status */}
                    <div className="px-3.5 py-2 bg-gray-50/50 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
                      <span>CareO Kitchen Staff Portal</span>
                      {diet?.id ? (
                        <span className="text-emerald-600 font-medium">Diet Info Updated</span>
                      ) : (
                        <span className="text-amber-600 font-medium">Standard Diet</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Action Plans Grid */
          isPlansLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-amber-600" />
                <p className="text-xs text-gray-500 font-medium">Loading action plans...</p>
              </div>
            </div>
          ) : filteredActionPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-lg border border-dashed border-gray-300 p-8">
              <div className="p-3 bg-amber-50 rounded-full mb-3">
                <ClipboardList className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">No action plans found</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1 mb-4">
                {planSearchQuery || planStatusFilter !== "all"
                  ? "No action plans match your current search or status filter."
                  : "You haven't created or been assigned any action plans yet."}
              </p>
              <Button
                type="button"
                className="h-9 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                onClick={() => setCreateDialogOpen(true)}
              >
                <PlusCircle className="h-4 w-4" />
                Create First Action Plan
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActionPlans.map((plan) => {
                const assigneeName = plan.assigned_to_name || plan.assigned_to_email || plan.assigned_to || "Unassigned";
                const creatorName = plan.created_by_name || "Kitchen Staff";
                const formattedDueDate = plan.due_date ? format(new Date(plan.due_date), "dd/MM/yyyy") : "No due date";

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-3">
                      {/* Top Header Row: Status & Priority Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {getStatusBadge(plan.status, plan.due_date)}
                        {getPriorityBadge(plan.priority)}
                      </div>

                      {/* Action Description */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-3">
                          {plan.description}
                        </h4>
                      </div>

                      {/* Plan Meta Grid */}
                      <div className="space-y-2 pt-1 text-xs text-gray-600 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400 font-medium">Assigned To:</span>
                          <span className="font-semibold text-gray-800 truncate max-w-[180px]">{assigneeName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400 font-medium">Created By:</span>
                          <span className="font-medium text-gray-700 truncate max-w-[180px]">{creatorName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400 font-medium">Due Date:</span>
                          <span className="font-medium text-gray-800 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 text-gray-400" />
                            {formattedDueDate}
                          </span>
                        </div>

                        {/* Latest Comment / Note */}
                        {plan.latest_comment && (
                          <div className="bg-amber-50/60 rounded-md p-2 border border-amber-100 text-[11px] mt-2 space-y-0.5">
                            <span className="font-semibold text-amber-900 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-amber-600" /> Latest Comment:
                            </span>
                            <p className="text-amber-950 italic line-clamp-2">{plan.latest_comment}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold gap-1.5 border-amber-200 text-amber-900 hover:bg-amber-50"
                        onClick={() => handleOpenUpdateModal(plan)}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        Update Status
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Create Action Plan Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Add Action Plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Action</Label>
              <Input
                value={actionPlanText}
                onChange={(e) => setActionPlanText(e.target.value)}
                placeholder="What needs to be done?"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Assign To</Label>
              <Select
                value={assignedToEmail}
                onValueChange={(val) => {
                  setAssignedToEmail(val);
                  const member = assignableOrgMembers.find((m) => m.email === val);
                  if (member) setAssignedTo(member.id);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select team member (owner excluded)" />
                </SelectTrigger>
                <SelectContent>
                  {assignableOrgMembers.map((member) => (
                    <SelectItem key={member.email} value={member.email}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.image_url ?? ""} />
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {(member.name?.[0] || member.email[0] || "").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.name || member.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Priority</Label>
                <Select value={createPriority} onValueChange={setCreatePriority}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Due Date</Label>
                <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen} modal>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      <span className="text-sm">
                        {createDueDate ? format(createDueDate, "dd/MM/yy") : "Pick date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={createDueDate}
                      onSelect={(date) => {
                        if (date) {
                          setCreateDueDate(date);
                          setDueDatePopoverOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button
              onClick={() => void handleAddCommonActionPlan()}
              disabled={isSubmittingActionPlan}
              className="h-9 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmittingActionPlan ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Action Plan Status Dialog */}
      <Dialog open={updateStatusDialogOpen} onOpenChange={setUpdateStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Update Action Plan Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            {selectedPlanForUpdate && (
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200/80 text-xs">
                <p className="font-semibold text-gray-900">{selectedPlanForUpdate.description}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm">Status</Label>
              <Select
                value={updateStatus}
                onValueChange={(val) => setUpdateStatus(val as "pending" | "in_progress" | "completed")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Comment / Notes (Optional)</Label>
              <Textarea
                value={updateComment}
                onChange={(e) => setUpdateComment(e.target.value)}
                placeholder="Add a progress update or comment..."
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUpdateStatusDialogOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveStatusUpdate()}
              disabled={isUpdatingStatus}
              className="h-9 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isUpdatingStatus ? "Updating..." : "Save Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
