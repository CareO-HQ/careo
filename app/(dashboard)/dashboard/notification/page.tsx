"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Filter, Bell } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Notification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: "info" | "warning" | "success" | "urgent";
};

const initialNotifications: Notification[] = [
  {
    id: "1",
    title: "Medication Due",
    message: "John Smith's medication is due at 2:00 PM",
    timestamp: "6 Oct 2025, 15:17",
    isRead: false,
    type: "warning",
  },
  {
    id: "2",
    title: "Incident Report",
    message: "New incident report submitted for Emily Brown",
    timestamp: "6 Oct 2025, 14:17",
    isRead: false,
    type: "urgent",
  },
  {
    id: "3",
    title: "Care Plan Updated",
    message: "Care plan for Richard George has been updated",
    timestamp: "6 Oct 2025, 13:17",
    isRead: false,
    type: "info",
  },
  {
    id: "4",
    title: "Staff Shift Change",
    message: "Sarah Johnson will be covering evening shift today",
    timestamp: "6 Oct 2025, 12:17",
    isRead: false,
    type: "info",
  },
  {
    id: "5",
    title: "Audit Complete",
    message: "Risk Assessment Audit has been completed successfully",
    timestamp: "5 Oct 2025, 15:17",
    isRead: false,
    type: "success",
  },
  {
    id: "6",
    title: "Appointment Reminder",
    message: "Dr. Williams visit scheduled for Margaret Davis at 10:00 AM tomorrow",
    timestamp: "6 Oct 2025, 11:17",
    isRead: false,
    type: "info",
  },
  {
    id: "7",
    title: "Critical Alert",
    message: "Emergency call button activated in Room 12",
    timestamp: "6 Oct 2025, 10:17",
    isRead: true,
    type: "urgent",
  },
  {
    id: "8",
    title: "Dietary Requirements",
    message: "New dietary restrictions added for Thomas Anderson",
    timestamp: "6 Oct 2025, 09:17",
    isRead: true,
    type: "warning",
  },
  {
    id: "9",
    title: "Visitor Check-in",
    message: "Family member checked in to visit Patricia Wilson",
    timestamp: "6 Oct 2025, 07:17",
    isRead: true,
    type: "info",
  },
  {
    id: "10",
    title: "Training Completed",
    message: "Monthly safeguarding training completed by all staff",
    timestamp: "4 Oct 2025, 15:17",
    isRead: true,
    type: "success",
  },
];

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(notification => {
    if (filter === "unread") return !notification.isRead;
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const getTypeBadgeText = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">Stay updated with important alerts and messages</p>
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

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-sm"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-0">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No notifications</p>
          </div>
        ) : (
          filteredNotifications.map((notification, index) => (
            <div
              key={notification.id}
              className={`flex items-start gap-3 py-4 hover:bg-muted/30 transition-colors ${
                !notification.isRead ? "bg-muted/10" : ""
              }`}
            >
              {/* Check Icon */}
              <div className={`mt-0.5 ${notification.isRead ? "opacity-40" : ""}`}>
                <Check className="w-5 h-5 text-blue-500" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className={`text-sm ${notification.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                      <span className="font-medium">{notification.title}</span> - {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Created: {notification.timestamp}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs h-5 ${getTypeColor(notification.type)}`}
                      >
                        {getTypeBadgeText(notification.type)}
                      </Badge>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="h-7 px-2 text-xs shrink-0"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
