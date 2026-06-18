"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/hooks/use-profile";
import RotaBuilder from "./components/RotaBuilder";
import ShiftTemplates from "./components/ShiftTemplates";
import StaffingRequirements from "./components/StaffingRequirements";
import LeaveManagement from "./components/LeaveManagement";
import ShiftSwaps from "./components/ShiftSwaps";
import RotaAuditTrail from "./components/RotaAuditTrail";
import { canManageRotaTemplatesAndRules } from "@/lib/permissions";

export default function RotaDashboard() {
  const { profile, isLoading } = useProfile();
  const [activeTab, setActiveTab] = useState("calendar");

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading Rota...</p>
        </div>
      </div>
    );
  }

  const isPowerUser = canManageRotaTemplatesAndRules(profile.role, profile.is_manager_approved_nurse);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workforce & Rota</h1>
          <p className="text-muted-foreground">Manage shifts, leave requests, shift templates, and view hours analytics.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Rota Builder</TabsTrigger>
          {isPowerUser && <TabsTrigger value="templates">Shift Templates</TabsTrigger>}
          {isPowerUser && <TabsTrigger value="rules">Staffing Requirements</TabsTrigger>}
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
          <TabsTrigger value="swaps">Shift Swaps</TabsTrigger>
          {isPowerUser && <TabsTrigger value="audit">Audit Trail</TabsTrigger>}
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <RotaBuilder profile={profile} isPowerUser={isPowerUser} />
        </TabsContent>

        {isPowerUser && (
          <TabsContent value="templates">
            <ShiftTemplates profile={profile} />
          </TabsContent>
        )}

        {isPowerUser && (
          <TabsContent value="rules">
            <StaffingRequirements profile={profile} />
          </TabsContent>
        )}

        <TabsContent value="leave">
          <LeaveManagement profile={profile} isPowerUser={isPowerUser} />
        </TabsContent>

        <TabsContent value="swaps">
          <ShiftSwaps profile={profile} isPowerUser={isPowerUser} />
        </TabsContent>

        {isPowerUser && (
          <TabsContent value="audit">
            <RotaAuditTrail profile={profile} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
