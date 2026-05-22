"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash2, CalendarIcon, PlusCircle } from "lucide-react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { auditService } from "@/lib/audit-service";
import { markActionPlanNotificationsAsRead } from "@/lib/notifications";

type ActionPlanStatus = "pending" | "in_progress" | "completed";

type ActionPlanScope = "all" | "for_me" | "by_me";

function isActionPlanScope(value: string): value is ActionPlanScope {
  return value === "all" || value === "for_me" || value === "by_me";
}

type OrgMemberRow = {
  id: string;
  email: string;
  name: string | null;
  image_url: string | null;
  role: string | null;
};

type ActionPlanRecord = Record<string, unknown> & {
  auditCategory?: string;
  id: string;
  actionPlanTable?: string;
};

function normalizeFetchedActionPlan(plan: ActionPlanRecord): ActionPlanRecord {
  if (plan.actionPlanTable === "audit_care_file_action_plans") {
    return { ...plan, auditCategory: "carefile" };
  }
  return plan;
}

function isCommonActionPlan(plan: unknown): boolean {
  if (!plan || typeof plan !== "object") return false;
  const p = plan as Record<string, unknown>;
  return (
    p["auditCategory"] === "common" &&
    p["actionPlanTable"] !== "audit_care_file_action_plans"
  );
}

function normalizePlanStatus(status: unknown): string {
  if (typeof status !== "string") return "";
  return status.replace(/-/g, "_");
}

function readPlanDueRaw(plan: unknown): unknown {
  if (!plan || typeof plan !== "object") return undefined;
  const p = plan as Record<string, unknown>;
  return p["due_date"] ?? p["dueDate"];
}

function planHasDueDate(plan: unknown): boolean {
  const raw = readPlanDueRaw(plan);
  return raw != null && String(raw).trim().length > 0;
}

/** Prefer stored label, then org roster match (id / email), then email fallback (never raw UUID when avoidable). */
function resolveStaffDisplayName(
  members: OrgMemberRow[],
  opts: { userId?: unknown; email?: unknown; storedName?: unknown }
): string {
  const stored =
    typeof opts.storedName === "string" && opts.storedName.trim().length > 0
      ? opts.storedName.trim()
      : "";
  if (stored) return stored;

  const uid = typeof opts.userId === "string" ? opts.userId.trim() : "";
  const mailRaw = typeof opts.email === "string" ? opts.email.trim() : "";
  const mailLc = mailRaw.toLowerCase();

  const byId = uid.length > 0 && !uid.includes("@") ? members.find((m) => m.id === uid) : undefined;
  const byEmail = mailLc
    ? members.find((m) => (m.email || "").toLowerCase() === mailLc)
    : undefined;
  const byUidEmail = uid.includes("@")
    ? members.find((m) => (m.email || "").toLowerCase() === uid.toLowerCase())
    : undefined;

  const row = byId ?? byEmail ?? byUidEmail;
  if (row) {
    const n = row.name?.trim();
    if (n) return n;
    if (row.email) return row.email;
  }

  if (mailRaw.length > 0) return mailRaw;
  if (uid.includes("@")) return uid;
  return uid;
}

export default function MyActionPlansPage() {
  const { supabase, user } = useSupabase();
  const { profile } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userEmail = user?.email || "";
  const { activeOrganizationId, activeCareHomeId, role } = useActiveTeam();
  const isOwner = role === "owner" || role === "saas_admin";

  const userIsPlanCreator = (plan: unknown): boolean => {
    if (!plan || typeof plan !== "object") return false;
    const p = plan as Record<string, unknown>;
    const created = p["created_by"];
    const createdStr = typeof created === "string" ? created : "";
    return createdStr === userEmail || (!!user?.id && createdStr === user.id);
  };
  const userIsPlanAssignee = (plan: unknown): boolean => {
    if (!plan || typeof plan !== "object") return false;
    const p = plan as Record<string, unknown>;
    const assigned = p["assigned_to"];
    const assignedStr = typeof assigned === "string" ? assigned : "";
    return assignedStr === userEmail || (!!user?.id && assignedStr === user.id);
  };

  // State
  const [allActionPlans, setAllActionPlans] = useState<ActionPlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActionPlan, setSelectedActionPlan] = useState<ActionPlanRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ActionPlanStatus>("pending");
  const [statusComment, setStatusComment] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<ActionPlanRecord | null>(null);

  const [orgMembers, setOrgMembers] = useState<OrgMemberRow[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedToEmail, setAssignedToEmail] = useState("");
  const [createPriority, setCreatePriority] = useState("");
  const [createDueDate, setCreateDueDate] = useState<Date | undefined>();
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [actionPlanScope, setActionPlanScope] = useState<ActionPlanScope>("all");

  // Fetch Data
  const fetchData = React.useCallback(async () => {
    if (!userEmail && !user?.id) return;
    setIsLoading(true);
    try {
      const commonArgs = {
        userId: user?.id ?? "",
        email: userEmail,
        organizationId: activeOrganizationId,
        careHomeId: activeCareHomeId,
      };

      let plans: ActionPlanRecord[] = [];

      if (isOwner && activeOrganizationId) {
        plans = await auditService.getOrgActionPlans(activeOrganizationId);
        const common = await auditService.getCareHomeCommonActionPlansForParticipant(commonArgs);
        plans = [...plans, ...common];
      } else if (role === "manager" && activeOrganizationId && activeCareHomeId) {
        plans = await auditService.getCareHomeActionPlans(activeOrganizationId, activeCareHomeId);
        const common = await auditService.getCareHomeCommonActionPlansForParticipant(commonArgs);
        plans = [...plans, ...common];
      } else {
        plans = await auditService.getMyActionPlans({
          ...commonArgs,
          role,
        });
      }

      const normalizedPlans = plans.map(normalizeFetchedActionPlan);

      const uniquePlans = normalizedPlans.filter((plan, index, self) => {
        const cat = typeof plan.auditCategory === "string" ? plan.auditCategory : "";
        const key = `${cat}:${plan.id}`;
        return (
          index ===
          self.findIndex((p) => `${typeof p.auditCategory === "string" ? p.auditCategory : ""}:${p.id}` === key)
        );
      });

      // If the same id ever appears twice (e.g. data quirk), prefer audit-sourced rows over "common".
      const rankCategory = (c: string | undefined) => (c === "common" ? 0 : 1);
      const byId = new Map<string, (typeof uniquePlans)[number]>();
      for (const plan of uniquePlans) {
        const id = String(plan.id);
        const prev = byId.get(id);
        if (!prev) {
          byId.set(id, plan);
          continue;
        }
        const prevCat =
          typeof prev.auditCategory === "string" ? prev.auditCategory : undefined;
        const nextCat =
          typeof plan.auditCategory === "string" ? plan.auditCategory : undefined;
        if (rankCategory(nextCat) > rankCategory(prevCat)) {
          byId.set(id, plan);
        }
      }
      const mergedUnique = Array.from(byId.values());

      setAllActionPlans(mergedUnique);
    } catch (error) {
      console.error("Failed to fetch action plans:", error);
      toast.error("Failed to load action plans");
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, user?.id, activeOrganizationId, activeCareHomeId, isOwner, role]);

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

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateDialogOpen(true);
    }
  }, [searchParams]);

  const assignableOrgMembers = orgMembers.filter((m) => m.role !== "owner");

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open && searchParams.get("create") === "1") {
      router.replace("/dashboard/action-plans", { scroll: false });
    }
  };

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
        created_by_name: profile.name || profile.email || "Staff",
      });
      toast.success("Action plan created");
      setActionPlanText("");
      setAssignedTo("");
      setAssignedToEmail("");
      setCreatePriority("");
      setCreateDueDate(undefined);
      handleCreateDialogOpenChange(false);
      await fetchData();
    } catch (error) {
      console.error("Failed to create common action plan:", error);
      toast.error("Failed to create action plan. Try again.");
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mark all action plan related notifications as read when visiting this page
  useEffect(() => {
    if (user?.id && activeOrganizationId) {
      markActionPlanNotificationsAsRead(user.id, activeOrganizationId, profile?.active_care_home_id);
    }
  }, [user?.id, activeOrganizationId]);

  // Real-time subscription to action plan changes across all categories
  useEffect(() => {
    if (!activeOrganizationId) return;

    const apTables = [
      "audit_resident_action_plans",
      "audit_care_file_action_plans",
      "audit_governance_action_plans",
      "audit_clinical_action_plans",
      "audit_environment_action_plans",
      "audit_manager_action_plans",
      "care_home_common_action_plans",
    ];

    const apChannels = apTables.map((tableName) =>
      supabase
        .channel(`${tableName}-list-changes`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: tableName,
            ...(activeOrganizationId ? { filter: `organization_id=eq.${activeOrganizationId}` } : {}),
          },
          () => {
            fetchData();
          }
        )
        .subscribe()
    );

    return () => {
      apChannels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [activeOrganizationId, fetchData, supabase]);

  const scopedActionPlans = useMemo(() => {
    if (actionPlanScope === "all") return allActionPlans;
    if (actionPlanScope === "for_me") return allActionPlans.filter((p) => userIsPlanAssignee(p));
    return allActionPlans.filter((p) => userIsPlanCreator(p));
  }, [allActionPlans, actionPlanScope, userEmail, user?.id]);

  // Group action plans by status
  const pendingPlans = scopedActionPlans.filter((p) => {
    const s = normalizePlanStatus(p.status);
    return !s || s === "pending";
  });
  const inProgressPlans = scopedActionPlans.filter((p) => normalizePlanStatus(p.status) === "in_progress");
  const completedPlans = scopedActionPlans.filter((p) => normalizePlanStatus(p.status) === "completed");

  const pendingCount = pendingPlans.length;
  const inProgressCount = inProgressPlans.length;
  const completedCount = completedPlans.length;

  // Check if overdue (plan rows are loosely typed from API)
  const isOverdue = (plan: unknown): boolean => {
    if (!plan || typeof plan !== "object") return false;
    const p = plan as Record<string, unknown>;
    const rawDue = p["due_date"] ?? p["dueDate"];
    const dueDate =
      typeof rawDue === "string" && rawDue.trim().length > 0
        ? rawDue.trim()
        : rawDue != null
          ? String(rawDue)
          : "";
    const s = normalizePlanStatus(p["status"]);
    return !!dueDate && new Date(dueDate).getTime() < Date.now() && s !== "completed";
  };

  // Handle action plan click
  const handleActionPlanClick = (plan: (typeof allActionPlans)[number]) => {
    setSelectedActionPlan(plan);
    const s = normalizePlanStatus(plan.status);
    let next: ActionPlanStatus = "pending";
    if (s === "in_progress") next = "in_progress";
    else if (s === "completed") next = "completed";
    setNewStatus(next);
    setStatusComment((plan.latest_comment as string) || "");
    setIsDetailModalOpen(true);
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedActionPlan) return;
    if (!user) return;

    try {
      const cat =
        typeof selectedActionPlan.auditCategory === "string"
          ? selectedActionPlan.auditCategory
          : "";
      await auditService.updateActionPlanStatus(
        cat,
        selectedActionPlan.id,
        newStatus,
        statusComment || undefined,
        user.id,
        user?.user_metadata?.name || userEmail
      );

      toast.success("Status updated successfully");
      setIsDetailModalOpen(false);
      setSelectedActionPlan(null);
      setStatusComment("");
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status. Please try again.");
    }
  };

  // Handle delete action plan
  const handleDeleteClick = (e: React.MouseEvent, plan: (typeof allActionPlans)[number]) => {
    e.stopPropagation(); // Prevent card click
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;

    try {
      const cat =
        typeof planToDelete.auditCategory === "string" ? planToDelete.auditCategory : "";
      await auditService.deleteActionPlan(cat, planToDelete.id);
      toast.success("Action plan deleted successfully");
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Failed to delete action plan:", error);
      toast.error("Failed to delete action plan. Please try again.");
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-0";
      case "medium":
        return "bg-amber-100 text-amber-900 border-0";
      case "low":
        return "bg-emerald-100 text-emerald-900 border-0";
      default:
        return "bg-muted text-muted-foreground border-0";
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (normalizePlanStatus(status)) {
      case "pending":
        return "bg-amber-100 text-amber-900 border-0";
      case "in_progress":
        return "bg-sky-100 text-sky-900 border-0";
      case "completed":
        return "bg-emerald-100 text-emerald-900 border-0";
      case "overdue":
        return "bg-red-100 text-red-800 border-0";
      default:
        return "bg-muted text-muted-foreground border-0";
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (normalizePlanStatus(status)) {
      case "pending":
        return "Pending";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return status || "Pending";
    }
  };

  // Get audit category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "resident":
        return "bg-violet-100 text-violet-900 border-violet-200/80";
      case "carefile":
        return "bg-sky-100 text-sky-900 border-sky-200/80";
      case "environment":
        return "bg-emerald-100 text-emerald-900 border-emerald-200/80";
      case "governance":
        return "bg-orange-100 text-orange-900 border-orange-200/80";
      case "clinical":
        return "bg-indigo-100 text-indigo-900 border-indigo-200/80";
      case "manager":
        return "bg-teal-100 text-teal-900 border-teal-200/80";
      case "common":
        return "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200/80";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 text-foreground">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Action Plans</h1>
          <Tabs
            value={actionPlanScope}
            onValueChange={(v) => {
              if (isActionPlanScope(v)) setActionPlanScope(v);
            }}
            className="w-full max-w-md"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="for_me">For me</TabsTrigger>
              <TabsTrigger value="by_me">By me</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-muted-foreground">
            Track action plans you&apos;ve created and been assigned to
          </p>
        </div>
        <Button
          type="button"
          variant="default"
          className="gap-2 shrink-0"
          onClick={() => setCreateDialogOpen(true)}
        >
          <PlusCircle className="h-4 w-4" aria-hidden />
          Add action plan
        </Button>
      </div>

      {isLoading && allActionPlans.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">Loading action plans...</div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-foreground">
              Pending
            </h2>
            <Badge variant="secondary" className="text-xs">
              {pendingCount}
            </Badge>
          </div>
          <div className="space-y-2">
            {pendingPlans.map((plan) => (
              <div
                key={`${plan.auditCategory ?? "?"}:${plan.id}`}
                className={`border border-border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-accent/40 hover:border-muted-foreground/25 transition-colors bg-card text-card-foreground shadow-sm ${isOverdue(plan) ? "border-l-4 border-l-destructive" : ""
                  }`}
                onClick={() => handleActionPlanClick(plan)}
              >
                {isCommonActionPlan(plan) ? (
                  <div className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Common action plan · shared with assignee only
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <Badge className={getPriorityColor(String(plan.priority ?? "")) + " text-xs font-normal"}>
                    {String(plan.priority ?? "")}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Badge className={getStatusColor(String(plan.status || "pending")) + " text-xs font-normal"}>
                      {getStatusLabel(String(plan.status || "pending"))}
                    </Badge>
                    {planHasDueDate(plan) ? (
                      <span className={`text-xs ${isOverdue(plan) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {format(new Date(String(readPlanDueRaw(plan))), "dd/MM/yyyy")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2 text-foreground">
                  {String(plan.description ?? "")}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-4 ${getCategoryColor(String(plan.auditCategory ?? ""))}`}>
                      {String(plan.auditCategory ?? "")}
                    </Badge>
                    {plan.resident_name ? (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {String(plan.resident_name)}
                      </span>
                    ) : null}
                  </div>
                  {userIsPlanCreator(plan) && !userIsPlanAssignee(plan) ? (
                    <p className="text-xs text-muted-foreground">
                      Assigned to:{" "}
                      {resolveStaffDisplayName(orgMembers, {
                        userId: plan.assigned_to,
                        email: plan.assigned_to_email,
                        storedName: plan.assigned_to_name,
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {pendingPlans.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No pending tasks
              </div>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-foreground">
              In Progress
            </h2>
            <Badge variant="secondary" className="text-xs">
              {inProgressCount}
            </Badge>
          </div>
          <div className="space-y-2">
            {inProgressPlans.map((plan) => (
              <div
                key={`${plan.auditCategory ?? "?"}:${plan.id}`}
                className="border border-border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-accent/40 hover:border-muted-foreground/25 transition-colors bg-card text-card-foreground shadow-sm"
                onClick={() => handleActionPlanClick(plan)}
              >
                {isCommonActionPlan(plan) ? (
                  <div className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Common action plan · shared with assignee only
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <Badge className={getPriorityColor(String(plan.priority ?? "")) + " text-xs font-normal"}>
                    {String(plan.priority ?? "")}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Badge className={getStatusColor(String(plan.status ?? "")) + " text-xs font-normal"}>
                      {getStatusLabel(String(plan.status ?? ""))}
                    </Badge>
                    {planHasDueDate(plan) ? (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(String(readPlanDueRaw(plan))), "dd/MM/yyyy")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2 text-foreground">
                  {String(plan.description ?? "")}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-4 ${getCategoryColor(String(plan.auditCategory ?? ""))}`}>
                      {String(plan.auditCategory ?? "")}
                    </Badge>
                    {plan.resident_name ? (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {String(plan.resident_name)}
                      </span>
                    ) : null}
                  </div>
                  {userIsPlanCreator(plan) && !userIsPlanAssignee(plan) ? (
                    <p className="text-xs text-muted-foreground">
                      Assigned to:{" "}
                      {resolveStaffDisplayName(orgMembers, {
                        userId: plan.assigned_to,
                        email: plan.assigned_to_email,
                        storedName: plan.assigned_to_name,
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {inProgressPlans.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No tasks in progress
              </div>
            )}
          </div>
        </div>

        {/* Completed Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-foreground">
              Completed
            </h2>
            <Badge variant="secondary" className="text-xs">
              {completedCount}
            </Badge>
          </div>
          <div className="space-y-2">
            {completedPlans.map((plan) => (
              <div
                key={`${plan.auditCategory ?? "?"}:${plan.id}`}
                className="border border-border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-accent/40 hover:border-muted-foreground/25 transition-colors bg-card text-card-foreground shadow-sm relative group"
                onClick={() => handleActionPlanClick(plan)}
              >
                {isCommonActionPlan(plan) ? (
                  <div className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Common action plan · shared with assignee only
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <Badge className={getPriorityColor(String(plan.priority ?? "")) + " text-xs font-normal"}>
                    {String(plan.priority ?? "")}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Badge className={getStatusColor(String(plan.status ?? "")) + " text-xs font-normal"}>
                      {getStatusLabel(String(plan.status ?? ""))}
                    </Badge>
                    {planHasDueDate(plan) ? (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(String(readPlanDueRaw(plan))), "dd/MM/yyyy")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2 text-muted-foreground">
                  {String(plan.description ?? "")}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-4 ${getCategoryColor(String(plan.auditCategory ?? ""))}`}>
                        {String(plan.auditCategory ?? "")}
                      </Badge>
                      {plan.resident_name ? (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {String(plan.resident_name)}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                      onClick={(e) => handleDeleteClick(e, plan)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {userIsPlanCreator(plan) && !userIsPlanAssignee(plan) ? (
                    <p className="text-xs text-muted-foreground">
                      Assigned to:{" "}
                      {resolveStaffDisplayName(orgMembers, {
                        userId: plan.assigned_to,
                        email: plan.assigned_to_email,
                        storedName: plan.assigned_to_name,
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {completedPlans.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No completed tasks
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Add action plan</DialogTitle>
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
            <Button variant="outline" onClick={() => handleCreateDialogOpenChange(false)} className="h-9">
              Cancel
            </Button>
            <Button onClick={() => void handleAddCommonActionPlan()} className="h-9">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal - Simplified */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          {selectedActionPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg text-foreground">Update Action Plan</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {selectedActionPlan && isCommonActionPlan(selectedActionPlan) ? (
                  <div className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Common action plan · care home · visible to you and the other party only
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {String(selectedActionPlan.description ?? "")}
                </p>

                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs uppercase">
                    {String(selectedActionPlan.auditCategory ?? "")}
                  </Badge>
                  {selectedActionPlan.resident_name ? (
                    <>
                      <span>•</span>
                      <span className="font-medium">{String(selectedActionPlan.resident_name)}</span>
                    </>
                  ) : null}
                  <span>•</span>
                  <span
                    className={
                      selectedActionPlan.priority === "High" ? "text-destructive font-medium" : ""
                    }
                  >
                    {String(selectedActionPlan.priority ?? "")} Priority
                  </span>
                  {planHasDueDate(selectedActionPlan) ? (
                    <>
                      <span>•</span>
                      <span className={isOverdue(selectedActionPlan) ? "text-destructive font-medium" : ""}>
                        Due{" "}
                        {format(
                          new Date(String(readPlanDueRaw(selectedActionPlan))),
                          "dd/MM/yyyy"
                        )}
                      </span>
                    </>
                  ) : null}
                  <span>•</span>
                  <span>
                    Assigned to{" "}
                    {resolveStaffDisplayName(orgMembers, {
                      userId: selectedActionPlan.assigned_to,
                      email: selectedActionPlan.assigned_to_email,
                      storedName: selectedActionPlan.assigned_to_name,
                    })}
                  </span>
                  {String(selectedActionPlan.created_by ?? "") !==
                  String(selectedActionPlan.assigned_to ?? "") ? (
                    <>
                      <span>•</span>
                      <span>
                        Created by{" "}
                        {resolveStaffDisplayName(orgMembers, {
                          userId: selectedActionPlan.created_by,
                          storedName: selectedActionPlan.created_by_name,
                        })}
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Status Update */}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ActionPlanStatus)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <Label htmlFor="comment" className="text-sm">Comment (Optional)</Label>
                  <Textarea
                    id="comment"
                    placeholder="Add a note..."
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={
                    normalizePlanStatus(newStatus) ===
                      normalizePlanStatus(String(selectedActionPlan.status ?? "")) &&
                    statusComment === String(selectedActionPlan.latest_comment || "")
                  }
                >
                  Update
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this action plan? This action cannot be undone.
            </AlertDialogDescription>
            {planToDelete ? (
              <div className="mt-3 p-3 bg-muted rounded-md border border-border/60">
                <p className="text-sm font-medium text-foreground">
                  {String(planToDelete.description ?? "")}
                </p>
                <p className="text-xs text-muted-foreground mt-1 uppercase">
                  {String(planToDelete.auditCategory ?? "")}
                </p>
              </div>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
