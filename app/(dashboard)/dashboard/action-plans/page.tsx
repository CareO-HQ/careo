"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Calendar, Clock, AlertCircle, CheckCircle2, ListTodo, Trash2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

type ActionPlanStatus = "pending" | "in_progress" | "completed";

export default function MyActionPlansPage() {
  const { data: session } = authClient.useSession();
  const userEmail = session?.user?.email || "";

  // State
  const [selectedActionPlan, setSelectedActionPlan] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ActionPlanStatus>("pending");
  const [statusComment, setStatusComment] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<any>(null);

  // Queries - Get action plans assigned to user
  const assignedActionPlans = useQuery(
    api.auditActionPlans.getMyActionPlans,
    userEmail ? { assignedTo: userEmail, status: "all" } : "skip"
  );

  // Get action plans created by user
  const createdActionPlans = useQuery(
    api.auditActionPlans.getCreatedActionPlans,
    userEmail ? { createdBy: userEmail, status: "all" } : "skip"
  );

  // Merge both lists and remove duplicates (in case user creates a plan and assigns to themselves)
  const allActionPlans = React.useMemo(() => {
    const assigned = assignedActionPlans || [];
    const created = createdActionPlans || [];

    // Combine both arrays
    const combined = [...assigned, ...created];

    // Remove duplicates by _id
    const uniquePlans = combined.filter((plan, index, self) =>
      index === self.findIndex((p) => p._id === plan._id)
    );

    return uniquePlans;
  }, [assignedActionPlans, createdActionPlans]);

  // Check if user has created any action plans (they're a manager/creator)
  const hasCreatedPlans = (createdActionPlans?.length || 0) > 0;

  // Get new action plans count (only for assigned plans)
  const newActionPlansCount = useQuery(
    api.auditActionPlans.getNewActionPlansCount,
    userEmail ? { assignedTo: userEmail } : "skip"
  );

  // Mutations
  const updateStatus = useMutation(api.auditActionPlans.updateActionPlanStatus);
  const deleteActionPlan = useMutation(api.auditActionPlans.deleteActionPlan);
  const markAsViewed = useMutation(api.auditActionPlans.markActionPlansAsViewed);

  // Mark action plans as viewed when page is loaded (only for assigned plans)
  useEffect(() => {
    if (userEmail && newActionPlansCount && newActionPlansCount > 0) {
      markAsViewed({ assignedTo: userEmail });
    }
  }, [userEmail, newActionPlansCount, markAsViewed]);

  // Group action plans by status
  const pendingPlans = allActionPlans?.filter((p) => p.status === "pending") || [];
  const inProgressPlans = allActionPlans?.filter((p) => p.status === "in_progress") || [];
  const completedPlans = allActionPlans?.filter((p) => p.status === "completed") || [];

  const pendingCount = pendingPlans.length;
  const inProgressCount = inProgressPlans.length;
  const completedCount = completedPlans.length;

  // Check if overdue
  const isOverdue = (plan: any) => {
    return plan.dueDate && plan.dueDate < Date.now() && plan.status !== "completed";
  };

  // Handle action plan click
  const handleActionPlanClick = (plan: any) => {
    setSelectedActionPlan(plan);
    setNewStatus(plan.status);
    setStatusComment("");
    setIsDetailModalOpen(true);
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedActionPlan) return;

    try {
      await updateStatus({
        actionPlanId: selectedActionPlan._id,
        status: newStatus,
        comment: statusComment || undefined,
        updatedBy: userEmail,
        updatedByName: session?.user?.name || userEmail,
      });

      toast.success("Status updated successfully");
      setIsDetailModalOpen(false);
      setSelectedActionPlan(null);
      setStatusComment("");
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
      await deleteActionPlan({ actionPlanId: planToDelete._id });
      toast.success("Action plan deleted successfully");
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    } catch (error) {
      console.error("Failed to delete action plan:", error);
      toast.error("Failed to delete action plan. Please try again.");
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Low":
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
        return status;
    }
  };

  // Get audit category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "resident":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "clinical":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "environment":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "governance":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Action Plans</h1>
            <p className="text-muted-foreground">
              Track action plans you've created and been assigned to
            </p>
          </div>
          {newActionPlansCount !== undefined && newActionPlansCount > 0 && (
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-500 text-white text-sm font-bold">
              {newActionPlansCount}
            </div>
          )}
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
                key={plan._id}
                className={`border rounded-lg p-3 space-y-2 cursor-pointer hover:border-gray-400 transition-colors bg-white dark:bg-gray-950 ${
                  isOverdue(plan) ? "border-l-4 border-l-red-500" : "border-gray-200 dark:border-gray-800"
                }`}
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
                    {plan.dueDate && (
                      <span className={`text-xs ${isOverdue(plan) ? "text-red-500 font-medium" : "text-gray-500"}`}>
                        {format(new Date(plan.dueDate), "MMM dd")}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2">
                  {plan.description}
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {plan.templateName}
                  </p>
                  {plan.createdBy === userEmail && plan.assignedTo !== userEmail && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Assigned to: {plan.assignedToName || plan.assignedTo}
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
                key={plan._id}
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
                    {plan.dueDate && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(plan.dueDate), "MMM dd")}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2">
                  {plan.description}
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {plan.templateName}
                  </p>
                  {plan.createdBy === userEmail && plan.assignedTo !== userEmail && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Assigned to: {plan.assignedToName || plan.assignedTo}
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
                key={plan._id}
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
                    {plan.dueDate && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(plan.dueDate), "MMM dd")}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2 text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {plan.templateName}
                    </p>
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
                  {plan.createdBy === userEmail && plan.assignedTo !== userEmail && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Assigned to: {plan.assignedToName || plan.assignedTo}
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

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedActionPlan && (
            <>
              <DialogHeader>
                <DialogTitle>Action Plan Details</DialogTitle>
                <DialogDescription>
                  Update the status and add comments
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Description */}
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm mt-1">{selectedActionPlan.description}</p>
                </div>

                {/* Audit Info */}
                <div className="flex gap-2">
                  <Badge variant="outline" className={getCategoryColor(selectedActionPlan.auditCategory)}>
                    {selectedActionPlan.auditCategory}
                  </Badge>
                  <Badge variant="outline">{selectedActionPlan.templateName}</Badge>
                  <Badge className={getPriorityColor(selectedActionPlan.priority)}>
                    {selectedActionPlan.priority}
                  </Badge>
                </div>

                {/* Due Date */}
                {selectedActionPlan.dueDate && (
                  <div>
                    <Label className="text-sm font-medium">Due Date</Label>
                    <p className={`text-sm mt-1 ${isOverdue(selectedActionPlan) ? "text-red-500 font-medium" : ""}`}>
                      {format(new Date(selectedActionPlan.dueDate), "MMMM dd, yyyy")}
                      {isOverdue(selectedActionPlan) && " (Overdue)"}
                    </p>
                  </div>
                )}

                {/* Created By */}
                <div>
                  <Label className="text-sm font-medium">Created By</Label>
                  <p className="text-sm mt-1">
                    {selectedActionPlan.createdByName || selectedActionPlan.createdBy}
                  </p>
                </div>

                {/* Status History */}
                {selectedActionPlan.statusHistory && selectedActionPlan.statusHistory.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Status History</Label>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {selectedActionPlan.statusHistory.map((history: any, index: number) => (
                        <div key={index} className="text-sm border-l-2 pl-3 py-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(history.status)}>
                              {getStatusLabel(history.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(history.updatedAt), "MMM dd, yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            by {history.updatedByName || history.updatedBy}
                          </p>
                          {history.comment && (
                            <p className="text-sm italic mt-1">"{history.comment}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  {/* Status Update */}
                  <div>
                    <Label htmlFor="status">Update Status</Label>
                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ActionPlanStatus)}>
                      <SelectTrigger id="status" className="mt-1">
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
                  <div>
                    <Label htmlFor="comment">Comment (Optional)</Label>
                    <Textarea
                      id="comment"
                      placeholder="Add a comment about this status update..."
                      value={statusComment}
                      onChange={(e) => setStatusComment(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={newStatus === selectedActionPlan.status && !statusComment}
                >
                  Update Status
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
              Are you sure you want to delete this completed action plan? This action cannot be undone.
              {planToDelete && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {planToDelete.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {planToDelete.templateName}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
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
