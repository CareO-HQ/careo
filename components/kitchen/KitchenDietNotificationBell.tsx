"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotificationsForUser,
  type Notification,
} from "@/lib/notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Utensils, Clock, CheckCheck, Sparkles, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";

interface KitchenDietNotificationBellProps {
  userId: string;
  organizationId?: string | null;
  careHomeId?: string | null;
  activeTeamId?: string | null;
  userRole?: string | null;
  onSelectResident?: (residentId: string, residentName?: string) => void;
}

export function KitchenDietNotificationBell({
  userId,
  organizationId,
  careHomeId,
  activeTeamId,
  userRole,
  onSelectResident,
}: KitchenDietNotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const fetchDietNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const allNotifs = await getNotifications(
        userId,
        50,
        false,
        careHomeId,
        activeTeamId,
        userRole
      );

      // Filter specifically for diet change notifications or general diet updates
      const dietNotifs = (allNotifs as Notification[]).filter(
        (n) => n.type === "diet_change" || n.title.toLowerCase().includes("diet")
      );

      setNotifications(dietNotifs);
      setUnreadCount(dietNotifs.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error("Failed to fetch diet notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, careHomeId, activeTeamId, userRole]);

  useEffect(() => {
    fetchDietNotifications();
  }, [fetchDietNotifications]);

  // Set up real-time listener for diet notifications
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel("kitchen-diet-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newNotif = payload.new as any;
          if (newNotif.type === "diet_change" || newNotif.title?.toLowerCase().includes("diet")) {
            toast.info(newNotif.title || "Diet Notification", {
              description: newNotif.message,
              icon: <Utensils className="w-4 h-4 text-amber-600" />,
            });
            fetchDietNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchDietNotifications]);

  const handleMarkAsRead = async (notifId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationAsRead(notifId, userId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(userId, careHomeId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All diet notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleDismissAll = async () => {
    if (notifications.length === 0) return;
    try {
      setIsDismissing(true);
      await dismissNotificationsForUser(
        userId,
        notifications.map((n) => n.id)
      );
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All diet notifications dismissed");
    } catch (err) {
      console.error("Failed to dismiss notifications:", err);
      toast.error("Failed to dismiss notifications");
    } finally {
      setIsDismissing(false);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    if (notif.metadata?.residentId && onSelectResident) {
      onSelectResident(notif.metadata.residentId, notif.metadata?.residentName);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9 rounded-lg border-gray-200 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-amber-500/20"
          title="Diet Info Notifications"
        >
          <Bell className="h-4 w-4 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-lg rounded-xl border border-gray-200 bg-white z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-md">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900">Diet Notifications</h4>
              <p className="text-[11px] text-gray-500">Resident diet updates</p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-[11px] text-amber-700 hover:text-amber-800 hover:bg-amber-50 h-7 px-2 flex items-center gap-1 font-medium"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
          {notifications.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-2">
                <Bell className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-xs font-semibold text-gray-800">No diet notifications</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Notifications will appear here when resident diet info is changed.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-amber-50/40 ${
                  !notif.isRead ? "bg-amber-50/20" : "bg-white"
                }`}
              >
                <div
                  className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${
                    !notif.isRead
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5
                      className={`text-xs font-semibold truncate ${
                        !notif.isRead ? "text-gray-900" : "text-gray-700"
                      }`}
                    >
                      {notif.title}
                    </h5>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50">
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(notif.created_at)}
                    </span>

                    {!notif.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="h-5 w-5 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/80 rounded-b-xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissAll}
              disabled={isDismissing}
              className="w-full h-7 text-[11px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1.5"
            >
              {isDismissing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Dismiss all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
