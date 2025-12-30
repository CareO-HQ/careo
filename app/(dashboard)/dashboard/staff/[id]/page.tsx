"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatRoleName } from "@/lib/utils";
import { canViewStaffList, UserRole } from "@/lib/permissions";
import { useEffect } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  User,
  Calendar,
  ClipboardList,
  Users,
  Shield
} from "lucide-react";
import { Route } from "next";
import { useRouter } from "next/navigation";
import React from "react";

type StaffPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function StaffProfilePage({ params }: StaffPageProps) {
  const { id } = React.use(params);
  const { data: activeOrg, isPending: isActiveOrgLoading } = authClient.useActiveOrganization();
  const { data: activeMember, isPending: isActiveMemberLoading } = authClient.useActiveMember();

  useEffect(() => {
    if (!isActiveMemberLoading && activeMember) {
      if (!canViewStaffList(activeMember.role as UserRole)) {
        router.push("/dashboard");
      }
    }
  }, [activeMember, isActiveMemberLoading, router]);

  if (isActiveOrgLoading || isActiveMemberLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (activeMember && !canViewStaffList(activeMember.role as UserRole)) {
    return null;
  }

  // Find the staff member from organization members
  const staffMember = activeOrg?.members?.find((m) => m.id === id || m.userId === id);

  // Fetch staff member's profile image from Convex
  const userImage = useQuery(
    api.files.image.getUserImageByUserId,
    staffMember?.userId ? { userId: staffMember.userId } : "skip"
  );

  console.log("Staff member:", staffMember);
  console.log("Looking for ID:", id);
  console.log("User image:", userImage);

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!staffMember) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Staff member not found</p>
          <p className="text-muted-foreground">
            The staff member you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = staffMember.user.name || staffMember.user.email;
  const nameParts = staffMember.user.name?.split(' ') || [];
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : staffMember.user.name?.[0]?.toUpperCase() || staffMember.user.email[0].toUpperCase();

  const handleCardClick = (cardType: string) => {
    router.push(`/dashboard/staff/${id}/${cardType}` as Route);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/staff")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-20 h-20">
            <AvatarImage
              src={userImage?.url || staffMember.user.image || ""}
              alt={fullName}
              className="border"
            />
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <Badge variant="secondary">
                {formatRoleName(staffMember.role)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {staffMember.user.email}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="relative bg-gray-50 hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      {/* STAFF INFORMATION */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Staff Information</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer shadow-none hover:shadow-sm transition-shadow"
            onClick={() => handleCardClick("overview")}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Overview</h3>
                    <p className="text-sm text-muted-foreground">
                      Basic information
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer shadow-none hover:shadow-sm transition-shadow opacity-50 pointer-events-none"
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Schedule</h3>
                    <p className="text-sm text-muted-foreground">
                      Shifts & availability
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer shadow-none hover:shadow-sm transition-shadow opacity-50 pointer-events-none"
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <ClipboardList className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Tasks</h3>
                    <p className="text-sm text-muted-foreground">
                      Assigned tasks
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TEAM & ACCESS */}
      <div className="mb-8">
        <p className="font-medium text-lg mb-2">Team & Access</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer shadow-none hover:shadow-sm transition-shadow opacity-50 pointer-events-none"
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Teams</h3>
                    <p className="text-sm text-muted-foreground">
                      Team assignments
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer shadow-none hover:shadow-sm transition-shadow opacity-50 pointer-events-none"
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col items-start justify-start gap-2 space-x-3">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Shield className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Permissions</h3>
                    <p className="text-sm text-muted-foreground">
                      Access & roles
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
