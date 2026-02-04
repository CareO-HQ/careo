"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { auditService } from "@/lib/audit-service";

type ActionPlanStatus = "pending" | "in_progress" | "completed";

export default function MyActionPlansPage() {
  const { user } = useSupabase();
  const userEmail = user?.email || "";
  const { activeOrganizationId, role } = useActiveTeam();
  const isOwner = role === "owner" || role === "saas_admin";

  // State
  const [allActionPlans, setAllActionPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActionPlan, setSelectedActionPlan] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ActionPlanStatus>("pending");
  const [statusComment, setStatusComment] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<any>(null);

  // Fetch Data
  const fetchData = React.useCallback(async () => {
    if (!userEmail) return;
    setIsLoading(true);
    try {
      let plans = [];
      if (isOwner && activeOrganizationId) {
        plans = await auditService.getOrgActionPlans(activeOrganizationId);
      } else {
        plans = await auditService.getMyActionPlans(userEmail);
      }

      // Remove duplicates by id if any
      const uniquePlans = plans.filter((plan, index, self) =>
        index === self.findIndex((p) => p.id === plan.id)
      );

      setAllActionPlans(uniquePlans);
    } catch (error) {
      console.error("Failed to fetch action plans:", error);
      toast.error("Failed to load action plans");
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, activeOrganizationId, isOwner]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group action plans by status
  const pendingPlans = allActionPlans.filter((p) => p.status === "pending" || !p.status) || [];
  const inProgressPlans = allActionPlans.filter((p) => p.status === "in_progress") || [];
  const completedPlans = allActionPlans.filter((p) => p.status === "completed") || [];

  const pendingCount = pendingPlans.length;
  const inProgressCount = inProgressPlans.length;
  const completedCount = completedPlans.length;

  // Check if overdue
  const isOverdue = (plan: any) => {
    const dueDate = plan.due_date || plan.dueDate;
    return dueDate && new Date(dueDate).getTime() < Date.now() && plan.status !== "completed";
  };

  // Handle action plan click
  const handleActionPlanClick = (plan: any) => {
    setSelectedActionPlan(plan);
    setNewStatus(plan.status || "pending");
    setStatusComment(plan.latest_comment || "");
    setIsDetailModalOpen(true);
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedActionPlan) return;

    try {
      await auditService.updateActionPlanStatus(
        selectedActionPlan.auditCategory,
        selectedActionPlan.id,
        newStatus,
        statusComment || undefined,
        userEmail,
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
  const handleDeleteClick = (e: React.MouseEvent, plan: any) => {
    e.stopPropagation(); // Prevent card click
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;

    try {
      await auditService.deleteActionPlan(planToDelete.auditCategory, planToDelete.id);
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
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
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
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "carefile":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "environment":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "governance":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "clinical":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (isLoading && allActionPlans.length === 0) {
    return <div className="p-10 text-center">Loading action plans...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Action Plans</h1>
            <p className="text-muted-foreground">
              Track action plans you&apos;ve created and been assigned to
            </p>
          </div>
        </div>
      </div>

      {/* Kanban Board - 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pending
            </h2>
            <Badge variant="secondary" className="text-xs">
              {pendingCount}
            </Badge>
          </div>
          <div className="space-y-2">
            {pendingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-3 space-y-2 cursor-pointer hover:border-gray-400 transition-colors bg-white dark:bg-gray-950 ${isOverdue(plan) ? "border-l-4 border-l-red-500" : "border-gray-200 dark:border-gray-800"
                  }`}
                onClick={() => handleActionPlanClick(plan)}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge className={getPriorityColor(plan.priority) + " text-xs font-normal"}>
                    {plan.priority}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Badge className={getStatusColor(plan.status || "pending") + " text-xs font-normal"}>
                      {getStatusLabel(plan.status)}
                    </Badge>
                    {(plan.due_date || plan.dueDate) && (
                      <span className={`text-xs ${isOverdue(plan) ? "text-red-500 font-medium" : "text-gray-500"}`}>
                        {format(new Date(plan.due_date || plan.dueDate), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2">
                  {plan.description}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-4 ${getCategoryColor(plan.auditCategory)}`}>
                      {plan.auditCategory}
                    </Badge>
                    {plan.resident_name && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {plan.resident_name}
                      </span>
                    )}
                  </div>
                  {plan.created_by === userEmail && plan.assigned_to !== userEmail && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Assigned to: {plan.assigned_to_name || plan.assigned_to}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {pendingPlans.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                No pending tasks
              </div>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              In Progress
            </h2>
            <Badge variant="secondary" className="text-xs">
              {inProgressCount}
            </Badge>
          </div>
          <div className="space-y-2">
            {inProgressPlans.map((plan) => (
              <div
                key={plan.id}
                className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-2 cursor-pointer hover:border-gray-400 transition-colors bg-white dark:bg-gray-950"
                onClick={() => handleActionPlanClick(plan)}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge className={getPriorityColor(plan.priority) + " text-xs font-normal"}>
                    {plan.priority}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Badge className={getStatusColor(plan.status) + " text-xs font-normal"}>
                      {getStatusLabel(plan.status)}
                    </Badge>
                    {(plan.due_date || plan.dueDate) && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(plan.due_date || plan.dueDate), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2">
                  {plan.description}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-4 ${getCategoryColor(plan.auditCategory)}`}>
                      {plan.auditCategory}
                    </Badge>
                    {plan.resident_name && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {plan.resident_name}
                      </span>
                    )}
                  </div>
                  {plan.created_by === userEmail && plan.assigned_to !== userEmail && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Assigned to: {plan.assigned_to_name || plan.assigned_to}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {inProgressPlans.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                No tasks in progress
              </div>
            )}
          </div>
        </div>

        {/* Completed Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Completed
            </h2>
            <Badge variant="secondary" className="text-xs">
              {completedCount}
            </Badge>
          </div>
          <div className="space-y-2">
            {completedPlans.map((plan) => (
              <div
                key={plan.id}
                className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-2 cursor-pointer hover:border-gray-400 transition-colors bg-white dark:bg-gray-950 relative group"
                onClick={() => handleActionPlanClick(plan)}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge className={getPriorityColor(plan.priority) + " text-xs font-normal"}>
                    {plan.priority}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Badge className={getStatusColor(plan.status) + " text-xs font-normal"}>
                      {getStatusLabel(plan.status)}
                    </Badge>
                    {(plan.due_date || plan.dueDate) && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(plan.due_date || plan.dueDate), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2 text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-4 ${getCategoryColor(plan.auditCategory)}`}>
                        {plan.auditCategory}
                      </Badge>
                      {plan.resident_name && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {plan.resident_name}
                        </span>
                      )}
                    </div>
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 flex-shrink-0"
                      onClick={(e) => handleDeleteClick(e, plan)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {plan.created_by === userEmail && plan.assigned_to !== userEmail && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Assigned to: {plan.assigned_to_name || plan.assigned_to}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {completedPlans.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                No completed tasks
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal - Simplified */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          {selectedActionPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">Update Action Plan</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedActionPlan.description}
                </p>

                {/* Compact Info */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs uppercase">
                    {selectedActionPlan.auditCategory}
                  </Badge>
                  {selectedActionPlan.resident_name && (
                    <>
                      <span>•</span>
                      <span className="font-medium">{selectedActionPlan.resident_name}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className={selectedActionPlan.priority === "High" ? "text-red-600 font-medium" : ""}>
                    {selectedActionPlan.priority} Priority
                  </span>
                  {(selectedActionPlan.due_date || selectedActionPlan.dueDate) && (
                    <>
                      <span>•</span>
                      <span className={isOverdue(selectedActionPlan) ? "text-red-600 font-medium" : ""}>
                        Due {format(new Date(selectedActionPlan.due_date || selectedActionPlan.dueDate), "dd/MM/yyyy")}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>By {selectedActionPlan.assigned_to_name || selectedActionPlan.created_by || selectedActionPlan.createdBy}</span>
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
                  disabled={newStatus === selectedActionPlan.status && statusComment === (selectedActionPlan.latest_comment || "")}
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
            {planToDelete && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {planToDelete.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase">
                  {planToDelete.auditCategory}
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
