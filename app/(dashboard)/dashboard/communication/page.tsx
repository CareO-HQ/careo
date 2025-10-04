"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Bell, CheckCheck, Clock } from "lucide-react";

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
    title: "Medication Review Required",
    message: "Mrs. Sarah Johnson's medication plan needs review by end of week.",
    timestamp: "2 hours ago",
    isRead: false,
    type: "urgent",
  },
  {
    id: "2",
    title: "Audit Completed",
    message: "Governance & Compliance audit for Q4 has been successfully completed.",
    timestamp: "5 hours ago",
    isRead: false,
    type: "success",
  },
  {
    id: "3",
    title: "Staff Training Reminder",
    message: "Fire safety training scheduled for all staff on Friday at 10:00 AM.",
    timestamp: "1 day ago",
    isRead: true,
    type: "info",
  },
  {
    id: "4",
    title: "Incident Report Filed",
    message: "New incident report filed for Room 204 - requires manager review.",
    timestamp: "1 day ago",
    isRead: false,
    type: "warning",
  },
  {
    id: "5",
    title: "Care Plan Updated",
    message: "John Smith's care plan has been updated with new dietary requirements.",
    timestamp: "2 days ago",
    isRead: true,
    type: "success",
  },
  {
    id: "6",
    title: "Equipment Maintenance Due",
    message: "Hoist equipment in Room 301 is due for maintenance inspection.",
    timestamp: "3 days ago",
    isRead: true,
    type: "warning",
  },
];

export default function CommunicationPage() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "urgent":
        return "border-l-4 border-l-red-500 bg-red-50";
      case "warning":
        return "border-l-4 border-l-yellow-500 bg-yellow-50";
      case "success":
        return "border-l-4 border-l-green-500 bg-green-50";
      default:
        return "border-l-4 border-l-blue-500 bg-blue-50";
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "urgent":
        return <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-700 text-xs">Warning</Badge>;
      case "success":
        return <Badge className="bg-green-100 text-green-700 text-xs">Success</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 text-xs">Info</Badge>;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Communications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-red-100 text-red-700">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            View and manage your notifications
          </p>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="text-muted-foreground"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No notifications</p>
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg transition-all ${getTypeStyles(
                notification.type
              )} ${notification.isRead ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm">{notification.title}</h3>
                    {getTypeBadge(notification.type)}
                    {!notification.isRead && (
                      <Badge
                        variant="outline"
                        className="bg-white border-primary text-primary text-xs"
                      >
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {notification.timestamp}
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-6 px-2 text-xs text-primary hover:text-primary"
                      >
                        <CheckCheck className="w-3 h-3 mr-1" />
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearNotification(notification.id)}
                  className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
