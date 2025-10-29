"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Bell,
  Check,
  Filter,
  ArrowLeft,
  ListTodo,
  Calendar,
  User,
  Clock,
  Loader2,
  Trash2,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

type ActionPlanStatus = "pending" | "in_progress" | "completed";

export default function NotificationPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userEmail = session?.user?.email || "";

  // State
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ActionPlanStatus>("pending");
  const [statusComment, setStatusComment] = useState("");
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  // Queries
  const notifications = useQuery(
    api.notifications.getUserNotifications,
    userEmail ? { userId: userEmail, limit: 100 } : "skip"
  );

  // Determine which table the action plan belongs to based on the ID
  const getActionPlanTable = (actionPlanId: string): string => {
    // Convex IDs are prefixed with the table name
    // We need to parse metadata or use a different approach
    // For now, we'll rely on notification metadata to tell us
    return selectedNotification?.metadata?.auditCategory || "resident";
  };

  // Get action plan details - dynamically choose which query based on category
  const residentActionPlanDetails = useQuery(
    api.auditActionPlans.getActionPlanById,
    selectedNotification?.metadata?.actionPlanId && getActionPlanTable(selectedNotification.metadata.actionPlanId) === "resident"
      ? { actionPlanId: selectedNotification.metadata.actionPlanId as Id<"residentAuditActionPlans"> }
      : "skip"
  );

  // Note: We can't query clinical/governance/environment action plans here because
  // those mutations don't have getActionPlanById. We'll need to handle this differently.
  // For now, we'll just use the resident query and handle the error gracefully.
  const actionPlanDetails = residentActionPlanDetails;

  // Mutations
  const markAsRead = useMutation(api.notifications.markNotificationAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllNotificationsAsRead);
  const deleteAllNotifications = useMutation(api.notifications.deleteAllNotifications);

  // Mutations for different audit types
  const updateResidentStatus = useMutation(api.auditActionPlans.updateActionPlanStatus);
  const updateClinicalStatus = useMutation(api.clinicalAuditActionPlans.updateActionPlanStatus);
  const updateGovernanceStatus = useMutation(api.governanceAuditActionPlans.updateActionPlanStatus);
  const updateEnvironmentStatus = useMutation(api.environmentAuditActionPlans.updateActionPlanStatus);
  const updateCareFileStatus = useMutation(api.careFileAuditActionPlans.updateActionPlanStatus);

  // Filter notifications
  const filteredNotifications = notifications?.filter((n) => {
    if (filter === "unread") {
      return !n.isRead;
    }
    return true;
  });

  // Count unread
  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  // Handle notification click
  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await markAsRead({ notificationId: notification._id });
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    // If it's an action plan notification, open the modal
    if (
      notification.type === "action_plan" ||
      notification.type === "action_plan_status_updated"
    ) {
      setSelectedNotification(notification);
      setNewStatus(notification.metadata?.newStatus || "pending");
      setStatusComment("");
      setIsDetailModalOpen(true);
    } else if (notification.link) {
      // For other notifications, navigate to the link
      router.push(notification.link);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      toast.info("No unread notifications");
      return;
    }

    try {
      await markAllAsRead({ userId: userEmail });
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  // Handle delete all notifications
  const handleDeleteAllClick = () => {
    if (!notifications || notifications.length === 0) {
      toast.info("No notifications to delete");
      return;
    }
    setDeleteAllDialogOpen(true);
  };

  const handleDeleteAllConfirm = async () => {
    try {
      const result = await deleteAllNotifications({ userId: userEmail });
      toast.success(`Deleted ${result.deleted} notification${result.deleted !== 1 ? 's' : ''}`);
      setDeleteAllDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
      toast.error("Failed to delete notifications. Please try again.");
    }
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedNotification?.metadata?.actionPlanId) return;

    const actionPlanId = selectedNotification.metadata.actionPlanId;
    const updateData = {
      actionPlanId,
      status: newStatus,
      comment: statusComment || undefined,
      updatedBy: userEmail,
      updatedByName: session?.user?.name || userEmail,
    };

    try {
      // Determine which mutation to use based on audit category from metadata
      let auditCategory = selectedNotification.metadata?.auditCategory;

      // If no category in metadata (old notifications), try each mutation until one works
      if (!auditCategory) {
        console.log("No audit category in notification metadata, trying all mutations...");

        // Try each mutation in order until one succeeds
        const mutations = [
          { name: "resident", fn: updateResidentStatus },
          { name: "carefile", fn: updateCareFileStatus },
          { name: "clinical", fn: updateClinicalStatus },
          { name: "governance", fn: updateGovernanceStatus },
          { name: "environment", fn: updateEnvironmentStatus },
        ];

        for (const mutation of mutations) {
          try {
            await mutation.fn(updateData);
            console.log(`Successfully updated using ${mutation.name} mutation`);
            toast.success("Status updated successfully");
            setIsDetailModalOpen(false);
            setSelectedNotification(null);
            setStatusComment("");
            return;
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            // If it's a table mismatch error, try the next mutation
            if (errorMessage.includes("does not match the table name")) {
              console.log(`${mutation.name} mutation failed with table mismatch, trying next...`);
              continue;
            }
            // If it's a different error, throw it
            throw err;
          }
        }

        // If we get here, none of the mutations worked
        throw new Error("Could not find the correct mutation for this action plan");
      }

      // If we have a category, use it directly
      let updateMutation;
      switch (auditCategory) {
        case "clinical":
          updateMutation = updateClinicalStatus;
          break;
        case "governance":
          updateMutation = updateGovernanceStatus;
          break;
        case "environment":
          updateMutation = updateEnvironmentStatus;
          break;
        case "carefile":
          updateMutation = updateCareFileStatus;
          break;
        default:
          updateMutation = updateResidentStatus;
      }

      await updateMutation(updateData);
      toast.success("Status updated successfully");
      setIsDetailModalOpen(false);
      setSelectedNotification(null);
      setStatusComment("");
    } catch (error) {
      console.error("Failed to update status:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update status";
      if (errorMessage.includes("does not match the table name") || errorMessage.includes("Could not find the correct mutation")) {
        toast.error("This action plan cannot be updated from notifications. Please go to the Action Plans page to update it.");
      } else {
        toast.error("Failed to update status. Please try again.");
      }
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-red-600 bg-red-50 border-red-200";
      case "Medium":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "Low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "in_progress":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "overdue":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
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

  // Get notification type icon/color
  const getNotificationTypeInfo = (type: string) => {
    switch (type) {
      case "action_plan":
        return {
          icon: <ListTodo className="w-4 h-4" />,
          label: "Action Plan Assigned",
          color: "text-blue-600",
        };
      case "action_plan_status_updated":
        return {
          icon: <ListTodo className="w-4 h-4" />,
          label: "Action Plan Updated",
          color: "text-green-600",
        };
      case "action_plan_completed":
        return {
          icon: <ListTodo className="w-4 h-4" />,
          label: "Action Plan Completed",
          color: "text-green-600",
        };
      default:
        return {
          icon: <Bell className="w-4 h-4" />,
          label: "Notification",
          color: "text-gray-600",
        };
    }
  };

  // Mark individual as read
  const markNotificationAsRead = async (notificationId: Id<"notifications">, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAsRead({ notificationId });
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error("Failed to mark as read");
    }
  };

  // Loading state
  if (!session) {
    return (
      <div className="w-full flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Stay updated with your action plans and activities
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-red-100 text-red-700 border-red-200 px-3 py-1">
            {unreadCount} Unread
          </Badge>
        )}
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center justify-between mb-4">
        <Select value={filter} onValueChange={(value: "all" | "unread") => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Notifications" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notifications</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-sm"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark All as Read
            </Button>
          )}
          {notifications && notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteAllClick}
              className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-0">
        {!filteredNotifications || filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const typeInfo = getNotificationTypeInfo(notification.type);
            const initials = notification.senderName
              ? notification.senderName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
              : "S";

            return (
              <div
                key={notification._id}
                className={`flex items-start gap-3 py-4 border-b hover:bg-muted/30 transition-colors cursor-pointer ${
                  !notification.isRead ? "bg-muted/10" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={`text-sm ${notification.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                        <span className="font-medium">{notification.title}</span> • {notification.senderName || "System"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(notification.createdAt), "MMM dd, yyyy • HH:mm")}
                        </span>
                        {notification.metadata?.priority && (
                          <Badge
                            variant="outline"
                            className={`text-xs h-5 ${getPriorityColor(notification.metadata.priority)}`}
                          >
                            {notification.metadata.priority} Priority
                          </Badge>
                        )}
                        {notification.metadata?.newStatus && (
                          <Badge
                            variant="outline"
                            className={`text-xs h-5 ${getStatusColor(notification.metadata.newStatus)}`}
                          >
                            {getStatusLabel(notification.metadata.newStatus)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => markNotificationAsRead(notification._id, e)}
                        className="h-7 px-2 text-xs shrink-0"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Plan Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {actionPlanDetails && (
            <>
              <DialogHeader>
                <DialogTitle>Action Plan Details</DialogTitle>
                <DialogDescription>
                  View details and update status
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Description */}
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm mt-1">{actionPlanDetails.description}</p>
                </div>

                {/* Audit Info */}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{actionPlanDetails.auditCategory}</Badge>
                  <Badge variant="outline">{actionPlanDetails.templateName}</Badge>
                  <Badge variant="outline" className={getPriorityColor(actionPlanDetails.priority)}>
                    {actionPlanDetails.priority}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(actionPlanDetails.status)}>
                    {getStatusLabel(actionPlanDetails.status)}
                  </Badge>
                </div>

                {/* Due Date */}
                {actionPlanDetails.dueDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Due: {format(new Date(actionPlanDetails.dueDate), "MMMM dd, yyyy")}
                    </span>
                  </div>
                )}

                {/* Created By */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Created by {actionPlanDetails.createdByName || actionPlanDetails.createdBy}
                  </span>
                </div>

                {/* Resident Link (if available) */}
                {actionPlanDetails.resident && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Resident: {actionPlanDetails.resident.firstName} {actionPlanDetails.resident.lastName}
                    </span>
                  </div>
                )}

                {/* Status History */}
                {actionPlanDetails.statusHistory && actionPlanDetails.statusHistory.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Status History</Label>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {actionPlanDetails.statusHistory.map((history: any, index: number) => (
                        <div key={index} className="text-sm border-l-2 pl-3 py-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getStatusColor(history.status)}>
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
                  Close
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={newStatus === actionPlanDetails.status && !statusComment}
                >
                  Update Status
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all notifications? This action cannot be undone.
              {notifications && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {notifications.length} notification{notifications.length !== 1 ? 's' : ''} will be deleted
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
