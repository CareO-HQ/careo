"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
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
  type: "info" | "warning" | "urgent" | "success";
  read: boolean;
  timestamp: Date;
  category: string;
};

const initialNotifications: Notification[] = [
  {
    id: "1",
    title: "Medication Due",
    message: "John Smith's medication is due at 2:00 PM",
    type: "warning",
    read: false,
    timestamp: new Date(),
    category: "medication"
  },
  {
    id: "2",
    title: "Incident Report",
    message: "New incident report submitted for Emily Brown",
    type: "urgent",
    read: false,
    timestamp: new Date(Date.now() - 3600000),
    category: "incident"
  },
  {
    id: "3",
    title: "Care Plan Updated",
    message: "Care plan for Richard George has been updated",
    type: "info",
    read: false,
    timestamp: new Date(Date.now() - 7200000),
    category: "care-plan"
  },
  {
    id: "4",
    title: "Staff Shift Change",
    message: "Sarah Johnson will be covering evening shift today",
    type: "info",
    read: true,
    timestamp: new Date(Date.now() - 10800000),
    category: "staff"
  },
  {
    id: "5",
    title: "Audit Complete",
    message: "Risk Assessment Audit has been completed successfully",
    type: "success",
    read: true,
    timestamp: new Date(Date.now() - 86400000),
    category: "audit"
  },
];

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(notification => {
    if (filter === "unread") return !notification.read;
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const getTypeColor = (type: Notification["type"]) => {
    switch (type) {
      case "urgent":
        return "bg-red-100 text-red-700 border-red-200";
      case "warning":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "success":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "urgent":
        return "🚨";
      case "warning":
        return "⚠️";
      case "success":
        return "✅";
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated with important alerts and messages
          </p>
        </div>
        <Badge variant="secondary" className="bg-red-100 text-red-700 h-8 px-3">
          {unreadCount} Unread
        </Badge>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notifications</SelectItem>
              <SelectItem value="unread">Unread Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="gap-2"
        >
          <CheckCheck className="h-4 w-4" />
          Mark All as Read
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-1">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No notifications to display</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-center justify-between px-4 py-3 hover:bg-muted/50 rounded-lg transition-colors group ${
                notification.read ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Check className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <h3 className="text-sm font-normal text-foreground">
                    {notification.title} - {notification.message}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Created: {format(notification.timestamp, "d MMM yyyy, HH:mm")}
                    </span>
                    <Badge variant="outline" className={`text-xs px-2 py-0 h-4 ${getTypeColor(notification.type)}`}>
                      {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(notification.id)}
                    className="h-8 px-2"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteNotification(notification.id)}
                  className="h-8 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
