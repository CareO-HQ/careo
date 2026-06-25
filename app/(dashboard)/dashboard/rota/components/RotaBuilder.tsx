"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, Calendar, ChevronLeft, ChevronRight, Play, CheckCircle, Trash, Plus, Pencil, Loader2, Sparkles, Users, Briefcase, Building } from "lucide-react";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress";
import {
  createRotaAction,
  addManualShiftAction,
  deleteManualShiftAction,
  publishRotaAction,
  swapOrMoveShiftAction,
  clearRotaShiftsAction,
  unpublishRotaAction,
  createTemporaryStaffAction,
  deleteTemporaryStaffAction
} from "@/app/actions/rota";
import { generateWeeklyRota } from "@/lib/rota-generator";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface Template {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  hours: number;
}

interface RotaShift {
  id: string;
  user_id: string | null;
  custom_staff_name?: string | null;
  slot_role?: "nurse" | "care_assistant" | null;
  shift_template_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  notes: string | null;
  user?: {
    name: string;
    role: string;
  };
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  contracted_weekly_hours: number;
}

function resolveShiftDisplayRole(
  slotRole: "nurse" | "care_assistant" | "other",
  shift: RotaShift | null
): "nurse" | "care_assistant" {
  if (shift?.slot_role === "nurse" || shift?.slot_role === "care_assistant") {
    return shift.slot_role;
  }
  if (shift?.user?.role === "nurse" || shift?.user?.role === "agency_nurse") return "nurse";
  if (shift?.user?.role === "care_assistant" || shift?.user?.role === "agency_care_assistant") {
    return "care_assistant";
  }
  return slotRole === "nurse" ? "nurse" : "care_assistant";
}

export default function RotaBuilder({ profile, isPowerUser }: { profile: any; isPowerUser: boolean }) {
  const { supabase } = useSupabase();
  const [isEditing, setIsEditing] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  });

  const [rotaId, setRotaId] = useState<string | null>(null);
  const [rotaStatus, setRotaStatus] = useState<string>("draft");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rotaShifts, setRotaShifts] = useState<RotaShift[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [temporaryStaff, setTemporaryStaff] = useState<any[]>([]);
  const [staffingRequirements, setStaffingRequirements] = useState<any[]>([]);
  const [weeklyLeaves, setWeeklyLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule generation progress states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [allocatedCount, setAllocatedCount] = useState(0);
  const [totalAllocations, setTotalAllocations] = useState(0);

  // Dialog Add Temporary Staff state
  const [addTempStaffDialogOpen, setAddTempStaffDialogOpen] = useState(false);
  const [tempStaffName, setTempStaffName] = useState("");
  const [tempStaffRole, setTempStaffRole] = useState<"nurse" | "care_assistant">("care_assistant");
  const [tempStaffHours, setTempStaffHours] = useState<number>(0);

  // Dialog Add Shift state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("unassigned");
  const [selectedRole, setSelectedRole] = useState<"nurse" | "care_assistant" | "all">("all");

  // Custom staff name state
  const [isCustomName, setIsCustomName] = useState(false);
  const [customName, setCustomName] = useState("");

  // Drag and Drop state
  const [draggingUser, setDraggingUser] = useState<{ shiftId: string; userId: string; role: string } | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);

  const formattedWeekStart = format(currentWeekStart, "yyyy-MM-dd");
  const formattedWeekEnd = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");

  const datesOfWeek = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(currentWeekStart, i);
    return {
      dateStr: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE dd")
    };
  });

  const fetchData = useCallback(async () => {
    if (!profile?.active_team_id) return;
    try {
      setLoading(true);

      // 1. Fetch shift templates
      const { data: tData } = await supabase
        .from("shift_templates")
        .select("id, name, start_time, end_time, hours")
        .eq("team_id", profile.active_team_id);
      setTemplates(tData || []);

      // 1.5. Fetch staffing requirements
      const { data: reqData } = await supabase
        .from("shift_staffing_requirements")
        .select("shift_template_id, nurses_required, care_assistants_required")
        .eq("team_id", profile.active_team_id);
      setStaffingRequirements(reqData || []);

      // 2. Fetch staff list via team_staff junction table
      const { data: tsRows } = await supabase
        .from("team_staff")
        .select("user_id")
        .eq("team_id", profile.active_team_id);

      const staffIds = tsRows?.map(r => r.user_id) || [];
      let filteredStaff: StaffMember[] = [];

      if (staffIds.length > 0) {
        const { data: sData } = await supabase
          .from("users")
          .select("id, name, role, contracted_weekly_hours")
          .in("id", staffIds);
        // Filter out Manager and Owner roles from staff list
        filteredStaff = (sData || []).filter(u => u.role !== "owner" && u.role !== "manager");
      }
      setStaff(filteredStaff);

      // 2.3 Fetch temporary staff
      const { data: tsTemp } = await supabase
        .from("temporary_staff")
        .select("*")
        .eq("team_id", profile.active_team_id);
      setTemporaryStaff(tsTemp || []);

      // 2.5 Fetch weekly approved leave requests
      const { data: leavesData } = await supabase
        .from("leave_requests")
        .select("user_id, start_date, end_date, type")
        .eq("team_id", profile.active_team_id)
        .eq("status", "approved")
        .lte("start_date", formattedWeekEnd)
        .gte("end_date", formattedWeekStart);
      setWeeklyLeaves(leavesData || []);

      // 3. Fetch rota
      const { data: rData } = await supabase
        .from("rotas")
        .select("id, status")
        .eq("team_id", profile.active_team_id)
        .eq("start_date", formattedWeekStart)
        .maybeSingle();

      if (rData) {
        setRotaId(rData.id);
        setRotaStatus(rData.status);

        // Fetch rota shifts
        const { data: rsData } = await supabase
          .from("rota_shifts")
          .select(`
            *,
            user:users(name, role)
          `)
          .eq("rota_id", rData.id);
        setRotaShifts(rsData || []);
      } else {
        setRotaId(null);
        setRotaStatus("none");
        setRotaShifts([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load rota details");
    } finally {
      setLoading(false);
    }
  }, [profile?.active_team_id, formattedWeekStart, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lookup map for staffing requirements
  const requirementsMap = React.useMemo(() => {
    const map: Record<string, { nurses_required: number; care_assistants_required: number }> = {};
    staffingRequirements.forEach(req => {
      map[req.shift_template_id] = {
        nurses_required: req.nurses_required,
        care_assistants_required: req.care_assistants_required
      };
    });
    return map;
  }, [staffingRequirements]);

  // Helper to match member roles in assignment
  const isRoleMatch = useCallback((memberRole: string | null, targetRole: "nurse" | "care_assistant" | "all") => {
    if (targetRole === "all") return true;
    if (targetRole === "nurse") {
      return memberRole === "nurse" || memberRole === "agency_nurse";
    }
    if (targetRole === "care_assistant") {
      return memberRole === "care_assistant" || memberRole === "agency_care_assistant";
    }
    return false;
  }, []);

  // Navigate Weeks
  const prevWeek = () => {
    setIsEditing(false);
    setCurrentWeekStart(prev => addDays(prev, -7));
  };
  const nextWeek = () => {
    setIsEditing(false);
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  const handleCreateRota = async () => {
    if (!profile?.active_team_id) return;
    const res = await createRotaAction(profile.id, profile.active_team_id, formattedWeekStart, formattedWeekEnd);
    if (res.success) {
      toast.success("Rota draft created successfully");
      fetchData();
    } else {
      toast.error(res.error || "Failed to create rota");
    }
  };

  const handleSmartGenerate = async () => {
    if (!rotaId || !profile?.active_team_id) return;

    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      setAllocatedCount(0);
      setTotalAllocations(0);
      setGenerationStatus("Computing smart allocations...");

      toast.info("Generating smart weekly rota slots...");

      const allocations = await generateWeeklyRota(supabase, {
        teamId: profile.active_team_id,
        startDate: formattedWeekStart,
        endDate: formattedWeekEnd
      });

      const validAllocations = allocations.filter(a => a.assignedTo);
      setTotalAllocations(validAllocations.length);

      // Clear existing shifts of this rota
      setGenerationStatus("Clearing existing shifts...");
      const { error: deleteError } = await supabase
        .from("rota_shifts")
        .delete()
        .eq("rota_id", rotaId);

      if (deleteError) throw deleteError;

      // Add all allocations to the DB
      let current = 0;
      for (const allocation of validAllocations) {
        setGenerationStatus(`Assigning shift ${current + 1} of ${validAllocations.length}...`);

        const isTemp = allocation.assignedTo.startsWith("temp:");
        const userId = isTemp ? null : allocation.assignedTo;
        const customStaffName = isTemp ? allocation.assignedTo.slice(5) : null;

        await addManualShiftAction(profile.id, {
          rotaId,
          userId: userId,
          shiftTemplateId: allocation.template.id,
          date: allocation.date,
          start_time: allocation.template.start_time,
          end_time: allocation.template.end_time,
          break_minutes: allocation.template.break_minutes || 0,
          hours: allocation.template.hours,
          slotRole: allocation.role === "nurse" ? "nurse" : "care_assistant",
          customStaffName: customStaffName
        });

        current++;
        setAllocatedCount(current);
        setGenerationProgress(Math.round((current / validAllocations.length) * 100));
      }

      toast.success("Weekly Rota populated successfully via Smart Scheduler.");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error running smart rota generator");
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setAllocatedCount(0);
      setTotalAllocations(0);
      setGenerationStatus("");
    }
  };

  const handleClearAll = async () => {
    if (!rotaId || !profile?.active_team_id) return;

    if (!confirm("Are you sure you want to clear all shifts from this week's rota?")) {
      return;
    }

    try {
      toast.info("Clearing weekly rota shifts...");
      const res = await clearRotaShiftsAction(profile.id, rotaId);

      if (res.success) {
        toast.success("Weekly Rota cleared successfully.");
        fetchData();
      } else {
        toast.error(res.error || "Failed to clear rota");
      }
    } catch (err: any) {
      toast.error(err.message || "Error clearing rota");
    }
  };

  const handleAddTempStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.active_team_id) return;
    if (!tempStaffName.trim()) {
      toast.error("Please enter a staff name");
      return;
    }

    const res = await createTemporaryStaffAction(profile.id, profile.active_team_id, {
      name: tempStaffName.trim(),
      role: tempStaffRole,
      contracted_weekly_hours: tempStaffHours
    });

    if (res.success) {
      toast.success("Temporary staff member added successfully");
      setAddTempStaffDialogOpen(false);
      setTempStaffName("");
      setTempStaffHours(0);
      fetchData();
    } else {
      toast.error(res.error || "Failed to add temporary staff member");
    }
  };

  const handleOpenAddShift = (dateStr: string, templateId: string, role: "nurse" | "care_assistant" | "all" = "all") => {
    if (!isPowerUser) return;
    if (rotaStatus === "published") {
      toast.error("Cannot add shifts to a published rota.");
      return;
    }
    setSelectedDate(dateStr);
    setSelectedTemplateId(templateId);
    setSelectedStaffId("unassigned");
    setSelectedRole(role);
    setIsCustomName(false);
    setCustomName("");
    setAddDialogOpen(true);
  };

  const handleAddShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotaId) return;

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const staffId = isCustomName ? null : (selectedStaffId === "unassigned" ? null : selectedStaffId);
    const customStaffNameVal = isCustomName ? customName.trim() : null;

    if (isCustomName && !customStaffNameVal) {
      toast.error("Please enter a custom staff name");
      return;
    }

    // Determine the role slot this shift fills so coverage/grid recognise it.
    // For a selected real staff member, derive from their role; otherwise use
    // the slot's role (set when the dialog was opened from a specific slot).
    let slotRole: "nurse" | "care_assistant" | null = null;
    if (staffId) {
      const member = staff.find(s => s.id === staffId);
      if (member) {
        slotRole = (member.role === "nurse" || member.role === "agency_nurse") ? "nurse" : "care_assistant";
      }
    } else if (selectedRole === "nurse" || selectedRole === "care_assistant") {
      slotRole = selectedRole;
    }

    const res = await addManualShiftAction(profile.id, {
      rotaId,
      userId: staffId,
      shiftTemplateId: selectedTemplateId,
      date: selectedDate,
      start_time: template.start_time,
      end_time: template.end_time,
      break_minutes: 0, // default break subtraction done template-level
      hours: template.hours,
      customStaffName: customStaffNameVal,
      slotRole
    });

    if (res.success) {
      toast.success("Shift assigned successfully");
      setAddDialogOpen(false);
      fetchData();
    } else {
      toast.error(res.error || "Failed to assign shift");
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!isPowerUser) return;
    if (rotaStatus === "published") {
      toast.error("Cannot modify a published rota.");
      return;
    }
    const res = await deleteManualShiftAction(profile.id, shiftId);
    if (res.success) {
      toast.success("Shift assignment removed");
      fetchData();
    } else {
      toast.error(res.error || "Failed to remove shift");
    }
  };

  // Drag and Drop Handlers
  const isCompatible = (draggedUserRole: string, targetSlotRole: string) => {
    const isNurseUser = draggedUserRole === "nurse" || draggedUserRole === "agency_nurse";
    const isCAUser = draggedUserRole === "care_assistant" || draggedUserRole === "agency_care_assistant";
    
    const isNurseTarget = targetSlotRole === "nurse" || targetSlotRole === "agency_nurse";
    const isCATarget = targetSlotRole === "care_assistant" || targetSlotRole === "agency_care_assistant";
    
    if (isNurseUser && isNurseTarget) return true;
    if (isCAUser && isCATarget) return true;
    return false;
  };

  const handleDragStart = (e: React.DragEvent, shiftId: string, userId: string, role: string) => {
    if (!isPowerUser || rotaStatus === "published") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", JSON.stringify({ shiftId, userId, role }));
    setDraggingUser({ shiftId, userId, role });
  };

  const handleDragEnd = () => {
    setDraggingUser(null);
    setDragOverSlotId(null);
  };

  const handleDragOver = (e: React.DragEvent, slotId: string, slotRole: string, slotShiftUserRole?: string) => {
    if (!draggingUser) return;
    const targetRole = slotRole === "other" ? (slotShiftUserRole || "other") : slotRole;
    if (isCompatible(draggingUser.role, targetRole)) {
      e.preventDefault(); // Natively allow drop
      if (dragOverSlotId !== slotId) {
        setDragOverSlotId(slotId);
      }
    }
  };

  const handleDragLeave = () => {
    setDragOverSlotId(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetShiftId: string | null,
    targetDate?: string,
    targetTemplateId?: string
  ) => {
    e.preventDefault();
    if (!draggingUser) return;

    const sourceShiftId = draggingUser.shiftId;
    if (sourceShiftId === targetShiftId) {
      handleDragEnd();
      return;
    }

    try {
      const res = await swapOrMoveShiftAction(
        profile.id,
        sourceShiftId,
        targetShiftId,
        targetDate,
        targetTemplateId
      );

      if (res.success) {
        toast.success("Shift updated successfully");
        fetchData();
      } else {
        toast.error(res.error || "Failed to update shift");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during drag and drop");
    } finally {
      handleDragEnd();
    }
  };

  const handleEditToggle = async () => {
    if (rotaStatus === "published") {
      if (!confirm("Editing this rota will unpublish it. It will no longer be visible to non-approved staff until you publish again. Proceed?")) {
        return;
      }
      try {
        setLoading(true);
        const res = await unpublishRotaAction(profile.id, rotaId!);
        if (res.success) {
          toast.success("Rota status reverted to draft.");
          setIsEditing(true);
          fetchData();
        } else {
          toast.error(res.error || "Failed to unpublish rota");
        }
      } catch (err: any) {
        toast.error(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    } else {
      setIsEditing(true);
    }
  };

  const handlePublish = async () => {
    if (!rotaId) return;
    const res = await publishRotaAction(profile.id, rotaId);
    if (res.success) {
      toast.success("Rota has been published and staff notified!");
      setIsEditing(false);
      fetchData();
    } else if (res.validationFailed) {
      // Show blocking error rules
      toast.error(
        <div className="space-y-1">
          <p className="font-bold">Publish Blocked (Nurse Coverage Gate Unmet):</p>
          <ul className="text-xs list-disc list-inside">
            {res.errors?.map((err, idx) => <li key={idx}>{err}</li>)}
          </ul>
        </div>,
        { duration: 8000 }
      );
    } else {
      toast.error(res.error || "Failed to publish rota");
    }
  };

  // Calculations for staff resources metrics
  const getStaffWeeklyHours = (staffId: string) => {
    // Handle custom-name staff (synthetic IDs starting with "custom:")
    if (staffId.startsWith("custom:")) {
      const customName = staffId.slice(7);
      return rotaShifts
        .filter(s => !s.user_id && s.custom_staff_name === customName)
        .reduce((sum, s) => sum + Number(s.hours), 0);
    }
    return rotaShifts
      .filter(s => s.user_id === staffId)
      .reduce((sum, s) => sum + Number(s.hours), 0);
  };

  const totalAssignedHours = rotaShifts.reduce((sum, s) => sum + Number(s.hours), 0);

  // Derive unique assigned staff from rota shifts (user-linked + custom-name)
  const activeStaffCount = React.useMemo(() => {
    const userIds = new Set<string>();
    const customNames = new Set<string>();
    rotaShifts.forEach(s => {
      if (s.user_id) userIds.add(s.user_id);
      else if (s.custom_staff_name) customNames.add(s.custom_staff_name);
    });
    return userIds.size + customNames.size;
  }, [rotaShifts]);

  // Merge team staff + temporary staff + shift-assigned users + custom-name staff
  const mergedStaffForTable = React.useMemo(() => {
    const map = new Map<string, StaffMember>();
    // 1. Team members from team_staff (may have contracted hours)
    staff.forEach(s => map.set(s.id, s));

    // 1.5. Temporary staff from database (as synthetic custom:Name IDs)
    temporaryStaff.forEach(ts => {
      const syntheticId = `custom:${ts.name}`;
      map.set(syntheticId, {
        id: syntheticId,
        name: ts.name,
        role: ts.role,
        contracted_weekly_hours: Number(ts.contracted_weekly_hours || 0),
        is_temporary: true,
      } as any);
    });

    // 2. Users from rota shifts not already in team staff
    rotaShifts.forEach(shift => {
      if (shift.user_id && !map.has(shift.user_id) && shift.user) {
        map.set(shift.user_id, {
          id: shift.user_id,
          name: shift.user.name,
          role: shift.user.role,
          contracted_weekly_hours: 0,
        });
      }
    });

    // 3. Custom-name staff from rota shifts (no user_id)
    const customNames = new Set<string>();
    rotaShifts.forEach(shift => {
      if (!shift.user_id && shift.custom_staff_name) {
        customNames.add(shift.custom_staff_name);
      }
    });
    customNames.forEach(name => {
      const syntheticId = `custom:${name}`;
      if (!map.has(syntheticId)) {
        const nameShifts = rotaShifts.filter(s => !s.user_id && s.custom_staff_name === name);
        const slotRole = nameShifts.find(s => s.slot_role)?.slot_role;
        const role =
          slotRole === "nurse"
            ? "nurse"
            : slotRole === "care_assistant"
            ? "care_assistant"
            : "custom";
        map.set(syntheticId, {
          id: syntheticId,
          name: name,
          role,
          contracted_weekly_hours: 0,
        });
      }
    });

    return Array.from(map.values());
  }, [staff, temporaryStaff, rotaShifts]);

  const { permanentStaff, bankStaff, agencyStaff } = React.useMemo(() => {
    const permanent: StaffMember[] = [];
    const bank: StaffMember[] = [];
    const agency: StaffMember[] = [];

    mergedStaffForTable.forEach(s => {
      if ((s as any).is_temporary || s.id.startsWith("custom:") || s.role === "custom") {
        bank.push(s);
      } else if (s.role === "agency_nurse" || s.role === "agency_care_assistant") {
        agency.push(s);
      } else {
        permanent.push(s);
      }
    });

    return { permanentStaff: permanent, bankStaff: bank, agencyStaff: agency };
  }, [mergedStaffForTable]);

  // Check conflicts
  const getHoursConflict = (sMember: StaffMember) => {
    const hrs = getStaffWeeklyHours(sMember.id);
    if (hrs > sMember.contracted_weekly_hours) return "overtime";
    if (hrs < sMember.contracted_weekly_hours) return "undertime";
    return "normal";
  };

  const totalConflictsCount = mergedStaffForTable.filter(s => {
    const hrs = getStaffWeeklyHours(s.id);
    return hrs > s.contracted_weekly_hours;
  }).length;

  return (
    <div className="space-y-6">
      {/* Date & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 border rounded-xl">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg">
            {format(currentWeekStart, "MMM dd")} - {format(addDays(currentWeekStart, 6), "MMM dd, yyyy")}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Badge variant={rotaStatus === "published" ? "default" : "secondary"} className="ml-2 uppercase">
            {rotaStatus}
          </Badge>
        </div>

        {isPowerUser && (
          <div className="flex gap-2">
            {rotaStatus === "none" ? (
              <Button onClick={handleCreateRota}>Create Weekly Rota Draft</Button>
            ) : (
              <>
                {!isEditing ? (
                  <>
                    <Button onClick={handleEditToggle} className="bg-primary hover:bg-primary/95 text-primary-foreground">
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Rota
                    </Button>
                    {rotaStatus === "draft" && (
                      <Button onClick={handlePublish} variant="outline">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Publish Rota
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleSmartGenerate}>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Schedule
                    </Button>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-900/50 dark:hover:bg-red-950/20" onClick={handleClearAll}>
                      <Trash className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                    <Button onClick={handlePublish} className="bg-primary hover:bg-primary/95 text-primary-foreground">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Publish Rota
                    </Button>
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>
                      Done Editing
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Understaffed Banner Alert */}
      {isPowerUser && rotaStatus !== "none" && totalConflictsCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="flex-1">
            <strong>Warning:</strong> {totalConflictsCount} staff member(s) currently exceed their contracted weekly hours limits.
          </p>
        </div>
      )}

      {/* Rota Grid Timetable */}
      {!isPowerUser && rotaStatus !== "published" ? (
        <Card className="border-none bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/60 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/20 shadow-lg rounded-2xl overflow-hidden p-12 text-center relative border border-slate-100 dark:border-slate-800">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <CardContent className="space-y-6 pt-4 max-w-md mx-auto">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center bg-indigo-100/80 dark:bg-indigo-950/50 rounded-full ring-8 ring-indigo-50/50 dark:ring-indigo-950/20">
              <Calendar className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500 border-4 border-white dark:border-background flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Rota Awaiting Publication
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                The workforce schedule for this week is currently being finalized by team management. Please check back shortly, or navigate to other weeks using the navigation controls above.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : rotaStatus === "none" ? (
        <Card className="p-8 text-center border-dashed">
          <CardContent className="space-y-4 pt-6">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-bold">No Rota Sheet Created</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">Create a weekly rota draft to begin scheduling shifts manually or generating them automatically.</p>
            {isPowerUser && (
              <Button onClick={handleCreateRota}>Create Rota Sheet</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full border-collapse bg-card text-sm text-left">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="p-3 border-r font-semibold w-[180px]">Shift / Time Slot</th>
                {datesOfWeek.map(day => (
                  <th key={day.dateStr} className="p-3 border-r font-semibold text-center w-[150px]">
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr key={template.id} className="border-b hover:bg-muted/10">
                  <td className="p-3 border-r align-top font-semibold">
                    <div>{template.name}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {template.start_time.slice(0, 5)} - {template.end_time.slice(0, 5)}
                    </div>
                  </td>
                  
                  {datesOfWeek.map(day => {
                    const cellShifts = rotaShifts.filter(
                      s => s.shift_template_id === template.id && s.date === day.dateStr
                    );

                    const req = requirementsMap[template.id] || { nurses_required: 1, care_assistants_required: 3 };

                    // 1. Separate shifts by role.
                    // Custom-name shifts (no user_id) are bucketed by their
                    // persisted slot_role so they land in the correct role slot.
                    const nurseShifts = cellShifts.filter(s => s.user?.role === "nurse" || s.user?.role === "agency_nurse");
                    const caShifts = cellShifts.filter(s => s.user?.role === "care_assistant" || s.user?.role === "agency_care_assistant");
                    const customNurseShifts = cellShifts.filter(s => !s.user_id && s.custom_staff_name && s.slot_role === "nurse");
                    const customCAShifts = cellShifts.filter(s => !s.user_id && s.custom_staff_name && s.slot_role === "care_assistant");
                    // Empty placeholders and any legacy custom shift without a valid slot_role
                    const unassignedShifts = cellShifts.filter(
                      s => !s.user_id && !(s.custom_staff_name && (s.slot_role === "nurse" || s.slot_role === "care_assistant"))
                    );
                    const otherShifts = cellShifts.filter(
                      s => s.user_id &&
                           s.user?.role !== "nurse" &&
                           s.user?.role !== "agency_nurse" &&
                           s.user?.role !== "care_assistant" &&
                           s.user?.role !== "agency_care_assistant"
                    );

                    const nurseEligible = [...nurseShifts, ...customNurseShifts];
                    const caEligible = [...caShifts, ...customCAShifts];

                    const nurseSlots: { role: "nurse"; shift: RotaShift | null }[] = [];
                    const caSlots: { role: "care_assistant"; shift: RotaShift | null }[] = [];

                    let nurseShiftIdx = 0;
                    let unassignedShiftIdx = 0;

                    for (let i = 0; i < req.nurses_required; i++) {
                      if (nurseShiftIdx < nurseEligible.length) {
                        nurseSlots.push({ role: "nurse", shift: nurseEligible[nurseShiftIdx++] });
                      } else {
                        nurseSlots.push({ role: "nurse", shift: null });
                      }
                    }

                    let caShiftIdx = 0;
                    for (let i = 0; i < req.care_assistants_required; i++) {
                      if (caShiftIdx < caEligible.length) {
                        caSlots.push({ role: "care_assistant", shift: caEligible[caShiftIdx++] });
                      } else {
                        caSlots.push({ role: "care_assistant", shift: null });
                      }
                    }

                    const extraSlots: { role: "nurse" | "care_assistant" | "other"; shift: RotaShift }[] = [];
                    while (nurseShiftIdx < nurseEligible.length) {
                      extraSlots.push({ role: "nurse", shift: nurseEligible[nurseShiftIdx++] });
                    }
                    while (caShiftIdx < caEligible.length) {
                      extraSlots.push({ role: "care_assistant", shift: caEligible[caShiftIdx++] });
                    }
                    while (unassignedShiftIdx < unassignedShifts.length) {
                      extraSlots.push({ role: "other", shift: unassignedShifts[unassignedShiftIdx++] });
                    }
                    otherShifts.forEach(s => {
                      extraSlots.push({ role: "other", shift: s });
                    });

                    const allSlots = [...nurseSlots, ...caSlots, ...extraSlots];

                    return (
                      <td key={day.dateStr} className="p-2 border-r align-top text-center min-h-[80px]">
                        <div className="space-y-1.5">
                          {allSlots.map((slot, idx) => {
                            const displayRole = slot.shift
                              ? resolveShiftDisplayRole(slot.role, slot.shift)
                              : slot.role === "nurse"
                              ? "nurse"
                              : "care_assistant";
                            const targetRoleForCompat =
                              slot.role === "other"
                                ? slot.shift
                                  ? resolveShiftDisplayRole(slot.role, slot.shift)
                                  : "other"
                                : displayRole;
                            const isSlotCompatible = draggingUser ? isCompatible(draggingUser.role, targetRoleForCompat) : false;

                            if (slot.shift) {
                               const isNurse = displayRole === "nurse";
                               const roleBadge = isNurse ? "RN" : "CA";
                               const isUnassigned = !slot.shift?.user_id && !slot.shift?.custom_staff_name;
                               const staffMember = slot.shift?.user_id ? staff.find(s => s.id === slot.shift?.user_id) : null;
                               const worked = slot.shift?.user_id ? getStaffWeeklyHours(slot.shift?.user_id) : 0;
                               const contracted = staffMember ? staffMember.contracted_weekly_hours : 0;

                               const slotId = slot.shift.id;
                               const isCurrentDragOver = dragOverSlotId === slotId;
                               const isDraggable = isPowerUser && isEditing && rotaStatus !== "published" && !!slot.shift.user_id;

                               return (
                                 <div
                                   key={slotId}
                                   draggable={isDraggable}
                                   onDragStart={(e) => handleDragStart(e, slotId, slot.shift!.user_id!, slot.shift!.user?.role || "")}
                                   onDragEnd={handleDragEnd}
                                   onDragOver={(e) => handleDragOver(e, slotId, displayRole, slot.shift!.user?.role)}
                                   onDragLeave={handleDragLeave}
                                   onDrop={(e) => handleDrop(e, slotId)}
                                   className={`flex items-center justify-between gap-1.5 p-1 border rounded text-xs transition-all bg-white ${
                                     isDraggable ? "cursor-grab active:cursor-grabbing hover:shadow-sm" : ""
                                   } ${
                                     isNurse
                                       ? "border-indigo-200 text-indigo-900"
                                       : "border-teal-200 text-teal-900"
                                   } ${
                                     draggingUser
                                       ? isSlotCompatible
                                         ? isCurrentDragOver
                                           ? "ring-2 ring-sky-500 border-sky-500 bg-sky-50 scale-[1.03] shadow-md"
                                           : "border-sky-400 bg-sky-50/30 border-dashed ring-1 ring-sky-300/40"
                                         : "opacity-40"
                                       : ""
                                   }`}
                                 >
                                   <div className="flex items-center gap-1.5 min-w-0">
                                     <span
                                       className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase ${
                                         isNurse
                                           ? "bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
                                           : "bg-teal-200 text-teal-800 dark:bg-teal-900 dark:text-teal-300"
                                       }`}
                                     >
                                       {roleBadge}
                                     </span>
                                     <span className={`font-medium truncate ${isUnassigned ? "italic text-muted-foreground" : ""}`}>
                                       {slot.shift.custom_staff_name || slot.shift.user?.name || "Unassigned"}
                                     </span>
                                   </div>
                                   {isPowerUser && isEditing && rotaStatus !== "published" && (
                                     <button
                                       onClick={() => handleDeleteShift(slot.shift!.id)}
                                       className="text-red-500 hover:text-red-700 flex-shrink-0 p-0.5 hover:bg-muted rounded transition"
                                     >
                                       <Trash className="w-3.5 h-3.5" />
                                     </button>
                                   )}
                                 </div>
                               );
                             } else {
                               // Render placeholder
                               const isNurse = slot.role === "nurse";
                               const slotId = `empty-${slot.role}-${day.dateStr}-${template.id}-${idx}`;
                               const isCurrentDragOver = dragOverSlotId === slotId;
 
                               if (isPowerUser && isEditing && rotaStatus !== "published") {
                                 return (
                                   <Button
                                     key={slotId}
                                     variant="ghost"
                                     onClick={() => handleOpenAddShift(day.dateStr, template.id, slot.role === "nurse" ? "nurse" : "care_assistant")}
                                     onDragOver={(e) => handleDragOver(e, slotId, slot.role)}
                                     onDragLeave={handleDragLeave}
                                     onDrop={(e) => handleDrop(e, null, day.dateStr, template.id)}
                                     className={`w-full h-8 border border-dashed text-xs p-1 flex items-center justify-between rounded group transition-all ${
                                       isNurse
                                         ? "border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 text-indigo-600 dark:border-indigo-900/40 dark:hover:border-indigo-700 dark:bg-indigo-950/10 dark:text-indigo-400"
                                         : "border-teal-200 hover:border-teal-400 bg-teal-50/20 hover:bg-teal-50/50 text-teal-600 dark:border-teal-900/40 dark:hover:border-teal-700 dark:bg-teal-950/10 dark:text-teal-400"
                                     } ${
                                       draggingUser
                                         ? isSlotCompatible
                                           ? isCurrentDragOver
                                             ? "ring-2 ring-sky-500 border-sky-500 bg-sky-50/80 scale-[1.03] shadow-md text-sky-700"
                                             : "border-sky-400 bg-sky-50/30 ring-1 ring-sky-300/40 border-dashed"
                                           : "opacity-40"
                                         : ""
                                     }`}
                                   >
                                     <span className="flex items-center gap-1.5">
                                       <span
                                         className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase ${
                                           isNurse
                                             ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                                             : "bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300"
                                         }`}
                                       >
                                         {isNurse ? "RN" : "CA"}
                                       </span>
                                       <span className="text-muted-foreground group-hover:text-foreground">Assign</span>
                                     </span>
                                     <Plus className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                   </Button>
                                 );
                               } else {
                                 return (
                                   <div
                                     key={slotId}
                                     className={`w-full h-8 border border-dashed text-xs p-1 flex items-center justify-between rounded ${
                                       isNurse
                                         ? "border-indigo-100 bg-indigo-50/10 text-indigo-400 dark:border-indigo-950 dark:bg-indigo-950/5"
                                         : "border-teal-100 bg-teal-50/10 text-teal-400 dark:border-teal-950 dark:bg-teal-950/5"
                                     }`}
                                   >
                                     <span className="flex items-center gap-1.5">
                                       <span
                                         className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase ${
                                           isNurse
                                             ? "bg-indigo-50 text-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-500"
                                             : "bg-teal-50 text-teal-400 dark:bg-teal-950/40 dark:text-teal-500"
                                         }`}
                                       >
                                         {isNurse ? "RN" : "CA"}
                                       </span>
                                       <span className="text-muted-foreground">Empty Slot</span>
                                     </span>
                                   </div>
                                 );
                               }
                            }
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff Resources Metrics and Checklist */}
      {isPowerUser && rotaStatus !== "none" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Staff Resources</h3>
              {isPowerUser && (
                <Button
                  size="sm"
                  onClick={() => {
                    setTempStaffName("");
                    setTempStaffRole("care_assistant");
                    setTempStaffHours(0);
                    setAddTempStaffDialogOpen(true);
                  }}
                  className="h-8 bg-primary hover:bg-primary/95 text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Temporary Worker
                </Button>
              )}
            </div>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full border-collapse bg-card text-sm text-left">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="p-3 font-semibold">Staff Member</th>
                    <th className="p-3 font-semibold">Role</th>
                    <th className="p-3 font-semibold text-center">Assigned Hours</th>
                    <th className="p-3 font-semibold text-center">Contracted Hours</th>
                    <th className="p-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const renderStaffRow = (sMember: StaffMember) => {
                      const assigned = getStaffWeeklyHours(sMember.id);
                      const contracted = sMember.contracted_weekly_hours;
                      const status = getHoursConflict(sMember);

                      // Map leave details
                      const memberLeaves = weeklyLeaves.filter(l => l.user_id === sMember.id);
                      const isOnLeave = memberLeaves.length > 0;
                      const leaveLabel = memberLeaves[0]
                        ? (memberLeaves[0].type === "annual_leave"
                          ? "Annual Leave"
                          : memberLeaves[0].type === "sick_leave"
                          ? "Sick Leave"
                          : "Training")
                        : "On Leave";

                      // Filled badge styles for better visibility (matching pill design with soft backgrounds)
                      let badgeColor = "bg-green-50 text-green-700 border-green-200 hover:bg-green-50 rounded-full font-medium";
                      let statusLabel = "Within Contract";

                      if (status === "overtime") {
                        badgeColor = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 rounded-full font-medium";
                        statusLabel = "Overtime - Warning";
                      } else if (status === "undertime") {
                        badgeColor = "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 rounded-full font-medium";
                        statusLabel = "Under Contract - Review";
                      }

                      return (
                        <tr key={sMember.id} className="border-b last:border-0 hover:bg-muted/10">
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-2">
                              {sMember.name}
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground uppercase text-xs">
                            {sMember.role === "nurse"
                              ? "Registered Nurse"
                              : sMember.role === "agency_nurse"
                              ? "Agency Nurse"
                              : sMember.role === "agency_care_assistant"
                              ? "Agency Care Assistant"
                              : sMember.role === "custom"
                              ? "Custom Entry"
                              : "Care Assistant"}
                          </td>
                          <td className="p-3 text-center font-mono text-xs">
                            {assigned} hrs
                          </td>
                          <td className="p-3 text-center font-mono text-xs">
                            {contracted} hrs
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end items-center gap-1.5 flex-wrap">
                              {isOnLeave && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 rounded-full font-medium text-[10px] px-2 py-0.5">
                                  {leaveLabel}
                                </Badge>
                              )}
                              <Badge variant="outline" className={`${badgeColor} text-[10px] px-2 py-0.5`}>
                                {statusLabel}
                              </Badge>
                              {(sMember as any).is_temporary && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 p-0 ml-1"
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to remove temporary staff member ${sMember.name}?`)) {
                                      const tsRecord = temporaryStaff.find(ts => ts.name === sMember.name);
                                      if (tsRecord) {
                                        const res = await deleteTemporaryStaffAction(profile.id, tsRecord.id);
                                        if (res.success) {
                                          toast.success("Temporary staff member removed");
                                          fetchData();
                                        } else {
                                          toast.error(res.error || "Failed to remove temporary staff");
                                        }
                                      }
                                    }
                                  }}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    };

                    return (
                      <>
                        {/* Permanent Staff Header */}
                        <tr className="font-semibold border-b border-indigo-100">
                          <td colSpan={5} className="p-2.5 pl-3 text-xs uppercase tracking-wider bg-indigo-50 text-indigo-700">
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Permanent Staff</span>
                            </div>
                          </td>
                        </tr>
                        {permanentStaff.length > 0 ? (
                          permanentStaff.map(s => renderStaffRow(s))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-3 text-center text-xs text-muted-foreground italic">
                              No permanent staff assigned
                            </td>
                          </tr>
                        )}

                        {/* Bank Header */}
                        <tr className="font-semibold border-b border-emerald-100">
                          <td colSpan={5} className="p-2.5 pl-3 text-xs uppercase tracking-wider bg-emerald-50 text-emerald-700">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Bank</span>
                            </div>
                          </td>
                        </tr>
                        {bankStaff.length > 0 ? (
                          bankStaff.map(s => renderStaffRow(s))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-3 text-center text-xs text-muted-foreground italic">
                              No bank staff assigned
                            </td>
                          </tr>
                        )}

                        {/* Agency Header */}
                        <tr className="font-semibold border-b border-amber-100">
                          <td colSpan={5} className="p-2.5 pl-3 text-xs uppercase tracking-wider bg-amber-50 text-amber-700">
                            <div className="flex items-center gap-2">
                              <Building className="w-3.5 h-3.5 text-amber-600" />
                              <span>Agency</span>
                            </div>
                          </td>
                        </tr>
                        {agencyStaff.length > 0 ? (
                          agencyStaff.map(s => renderStaffRow(s))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-3 text-center text-xs text-muted-foreground italic">
                              No agency staff assigned
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            {/* Bottom Total Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="p-3 bg-muted/30 border rounded-lg">
                <div className="text-xs text-muted-foreground">Total Staff</div>
                <div className="text-2xl font-bold">{activeStaffCount} Active</div>
              </div>
              <div className="p-3 bg-muted/30 border rounded-lg">
                <div className="text-xs text-muted-foreground">Weekly Hours</div>
                <div className="text-2xl font-bold">{totalAssignedHours} hrs Assigned</div>
              </div>
              <div className="p-3 bg-muted/30 border rounded-lg">
                <div className="text-xs text-muted-foreground">Conflicts Found</div>
                <div className={`text-2xl font-bold ${totalConflictsCount > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {totalConflictsCount} Required Attention
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog to Assign Shift */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Staff to Shift</DialogTitle>
            <DialogDescription>Assign a team member to this timetable slot.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddShiftSubmit} className="space-y-4 pt-2">
            <div className="flex items-center space-x-2 py-1">
              <Checkbox
                id="custom-name-toggle"
                checked={isCustomName}
                onCheckedChange={(checked) => setIsCustomName(!!checked)}
              />
              <Label htmlFor="custom-name-toggle" className="text-sm font-medium cursor-pointer">
                Enter custom name instead of selecting from dropdown
              </Label>
            </div>

            {isCustomName ? (
              <div className="space-y-2">
                <Label htmlFor="custom-staff-name-input">Staff Name</Label>
                <Input
                  id="custom-staff-name-input"
                  placeholder="Enter custom staff name..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Staff Member</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Leave Unassigned</SelectItem>
                    {staff
                      .filter(member => isRoleMatch(member.role, selectedRole))
                      .map(member => {
                        const template = templates.find(t => t.id === selectedTemplateId);
                        const shiftHours = template ? Number(template.hours) : 0;
                        const currentHrs = getStaffWeeklyHours(member.id);
                        const totalHrs = currentHrs + shiftHours;
                        return (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} ({member.role === "nurse" || member.role === "agency_nurse" ? "RN" : "CA"}) - {totalHrs} / {member.contracted_weekly_hours} hrs
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Assign Shift</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog to Add Temporary Worker */}
      <Dialog open={addTempStaffDialogOpen} onOpenChange={setAddTempStaffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Temporary Worker</DialogTitle>
            <DialogDescription>Define a temporary worker for scheduling and metrics.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTempStaffSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="temp-staff-name">Name</Label>
              <Input
                id="temp-staff-name"
                placeholder="e.g. John Smith"
                value={tempStaffName}
                onChange={(e) => setTempStaffName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="temp-staff-role">Role</Label>
              <Select
                value={tempStaffRole}
                onValueChange={(val: "nurse" | "care_assistant") => setTempStaffRole(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="care_assistant">Care Assistant</SelectItem>
                  <SelectItem value="nurse">Registered Nurse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temp-staff-hours">Contracted Hours (Weekly)</Label>
              <Input
                id="temp-staff-hours"
                type="number"
                min="0"
                max="168"
                value={tempStaffHours}
                onChange={(e) => setTempStaffHours(Number(e.target.value))}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddTempStaffDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add Temporary Worker</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Generation Progress Dialog */}
      <Dialog open={isGenerating} onOpenChange={() => {}}>
        <DialogContent 
          onPointerDownOutside={(e) => e.preventDefault()} 
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="sm:max-w-md border-none bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/90 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/20 shadow-2xl rounded-2xl p-6"
        >
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center bg-indigo-100/80 dark:bg-indigo-950/50 rounded-full ring-8 ring-indigo-50/50 dark:ring-indigo-950/20">
              <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Generating Smart Schedule
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
              {generationStatus}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-2">
            <Progress value={generationProgress} className="h-2 bg-indigo-100 dark:bg-indigo-950/50 [&>div]:bg-indigo-600 dark:[&>div]:bg-indigo-400" />
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>{generationProgress}% Complete</span>
              {totalAllocations > 0 && (
                <span>{allocatedCount} / {totalAllocations} slots</span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
