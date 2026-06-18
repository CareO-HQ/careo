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
import { AlertCircle, Calendar, ChevronLeft, ChevronRight, Play, CheckCircle, Trash, Plus } from "lucide-react";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import {
  createRotaAction,
  addManualShiftAction,
  deleteManualShiftAction,
  publishRotaAction
} from "@/app/actions/rota";
import { generateWeeklyRota } from "@/lib/rota-generator";

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

export default function RotaBuilder({ profile, isPowerUser }: { profile: any; isPowerUser: boolean }) {
  const { supabase } = useSupabase();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  });

  const [rotaId, setRotaId] = useState<string | null>(null);
  const [rotaStatus, setRotaStatus] = useState<string>("draft");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rotaShifts, setRotaShifts] = useState<RotaShift[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffingRequirements, setStaffingRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog Add Shift state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("unassigned");
  const [selectedRole, setSelectedRole] = useState<"nurse" | "care_assistant" | "all">("all");

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

      // 2. Fetch staff list
      const { data: sData } = await supabase
        .from("users")
        .select("id, name, role, contracted_weekly_hours")
        .eq("active_team_id", profile.active_team_id);
      // Filter out Manager and Owner roles from staff list
      const filteredStaff = (sData || []).filter(u => u.role !== "owner" && u.role !== "manager");
      setStaff(filteredStaff);

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
    setCurrentWeekStart(prev => addDays(prev, -7));
  };
  const nextWeek = () => {
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
      toast.info("Generating smart weekly rota slots...");

      const allocations = await generateWeeklyRota(supabase, {
        teamId: profile.active_team_id,
        startDate: formattedWeekStart,
        endDate: formattedWeekEnd
      });

      // Clear existing shifts of this rota
      const { error: deleteError } = await supabase
        .from("rota_shifts")
        .delete()
        .eq("rota_id", rotaId);

      if (deleteError) throw deleteError;

      // Add all allocations to the DB
      for (const allocation of allocations) {
        await addManualShiftAction(profile.id, {
          rotaId,
          userId: allocation.assignedTo,
          shiftTemplateId: allocation.template.id,
          date: allocation.date,
          start_time: allocation.template.start_time,
          end_time: allocation.template.end_time,
          break_minutes: allocation.template.break_minutes || 0,
          hours: allocation.template.hours
        });
      }

      toast.success("Weekly Rota populated successfully via Smart Scheduler.");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error running smart rota generator");
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
    setAddDialogOpen(true);
  };

  const handleAddShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotaId) return;

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const staffId = selectedStaffId === "unassigned" ? null : selectedStaffId;

    const res = await addManualShiftAction(profile.id, {
      rotaId,
      userId: staffId,
      shiftTemplateId: selectedTemplateId,
      date: selectedDate,
      start_time: template.start_time,
      end_time: template.end_time,
      break_minutes: 0, // default break subtraction done template-level
      hours: template.hours
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

  const handlePublish = async () => {
    if (!rotaId) return;
    const res = await publishRotaAction(profile.id, rotaId);
    if (res.success) {
      toast.success("Rota has been published and staff notified!");
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
  const getStaffWeeklyHours = (userId: string) => {
    return rotaShifts
      .filter(s => s.user_id === userId)
      .reduce((sum, s) => sum + Number(s.hours), 0);
  };

  const totalAssignedHours = rotaShifts.reduce((sum, s) => sum + Number(s.hours), 0);

  // Check conflicts
  const getHoursConflict = (sMember: StaffMember) => {
    const hrs = getStaffWeeklyHours(sMember.id);
    if (hrs > sMember.contracted_weekly_hours) return "overtime";
    if (hrs < sMember.contracted_weekly_hours) return "undertime";
    return "normal";
  };

  const totalConflictsCount = staff.filter(s => {
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
                {rotaStatus !== "published" && (
                  <Button variant="outline" onClick={handleSmartGenerate}>
                    <Play className="w-4 h-4 mr-2" />
                    Generate Schedule
                  </Button>
                )}
                {rotaStatus !== "published" && (
                  <Button onClick={handlePublish} className="bg-primary hover:bg-primary/95 text-primary-foreground">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Publish Rota
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Understaffed Banner Alert */}
      {rotaStatus !== "none" && totalConflictsCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="flex-1">
            <strong>Warning:</strong> {totalConflictsCount} staff member(s) currently exceed their contracted weekly hours limits.
          </p>
        </div>
      )}

      {/* Rota Grid Timetable */}
      {rotaStatus === "none" ? (
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

                    // 1. Separate shifts by role
                    const nurseShifts = cellShifts.filter(s => s.user?.role === "nurse" || s.user?.role === "agency_nurse");
                    const caShifts = cellShifts.filter(s => s.user?.role === "care_assistant" || s.user?.role === "agency_care_assistant");
                    const unassignedShifts = cellShifts.filter(s => !s.user_id);
                    const otherShifts = cellShifts.filter(
                      s => s.user_id &&
                           s.user?.role !== "nurse" &&
                           s.user?.role !== "agency_nurse" &&
                           s.user?.role !== "care_assistant" &&
                           s.user?.role !== "agency_care_assistant"
                    );

                    const nurseSlots: { role: "nurse"; shift: RotaShift | null }[] = [];
                    const caSlots: { role: "care_assistant"; shift: RotaShift | null }[] = [];

                    let nurseShiftIdx = 0;
                    let unassignedShiftIdx = 0;

                    for (let i = 0; i < req.nurses_required; i++) {
                      if (nurseShiftIdx < nurseShifts.length) {
                        nurseSlots.push({ role: "nurse", shift: nurseShifts[nurseShiftIdx++] });
                      } else if (unassignedShiftIdx < unassignedShifts.length) {
                        nurseSlots.push({ role: "nurse", shift: unassignedShifts[unassignedShiftIdx++] });
                      } else {
                        nurseSlots.push({ role: "nurse", shift: null });
                      }
                    }

                    let caShiftIdx = 0;
                    for (let i = 0; i < req.care_assistants_required; i++) {
                      if (caShiftIdx < caShifts.length) {
                        caSlots.push({ role: "care_assistant", shift: caShifts[caShiftIdx++] });
                      } else if (unassignedShiftIdx < unassignedShifts.length) {
                        caSlots.push({ role: "care_assistant", shift: unassignedShifts[unassignedShiftIdx++] });
                      } else {
                        caSlots.push({ role: "care_assistant", shift: null });
                      }
                    }

                    const extraSlots: { role: "nurse" | "care_assistant" | "other"; shift: RotaShift }[] = [];
                    while (nurseShiftIdx < nurseShifts.length) {
                      extraSlots.push({ role: "nurse", shift: nurseShifts[nurseShiftIdx++] });
                    }
                    while (caShiftIdx < caShifts.length) {
                      extraSlots.push({ role: "care_assistant", shift: caShifts[caShiftIdx++] });
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
                            if (slot.shift) {
                               const isNurse = slot.role === "nurse" || slot.shift?.user?.role === "nurse" || slot.shift?.user?.role === "agency_nurse";
                               const roleBadge = isNurse ? "RN" : "CA";
                               const isUnassigned = !slot.shift?.user_id;
                               const staffMember = slot.shift?.user_id ? staff.find(s => s.id === slot.shift?.user_id) : null;
                               const worked = slot.shift?.user_id ? getStaffWeeklyHours(slot.shift?.user_id) : 0;
                               const contracted = staffMember ? staffMember.contracted_weekly_hours : 0;

                              return (
                                <div
                                  key={slot.shift?.id}
                                  className={`flex items-center justify-between gap-1.5 p-1 border rounded text-xs transition-colors bg-white ${
                                    isNurse
                                      ? "border-indigo-200 text-indigo-900"
                                      : "border-teal-200 text-teal-900"
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
                                      {slot.shift.user?.name || "Unassigned"}
                                      {staffMember && ` (${worked}/${contracted}h)`}
                                    </span>
                                  </div>
                                  {isPowerUser && rotaStatus !== "published" && (
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

                              if (isPowerUser && rotaStatus !== "published") {
                                return (
                                  <Button
                                    key={`empty-${slot.role}-${idx}`}
                                    variant="ghost"
                                    onClick={() => handleOpenAddShift(day.dateStr, template.id, slot.role === "nurse" ? "nurse" : "care_assistant")}
                                    className={`w-full h-8 border border-dashed text-xs p-1 flex items-center justify-between rounded group transition-all ${
                                      isNurse
                                        ? "border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 text-indigo-600 dark:border-indigo-900/40 dark:hover:border-indigo-700 dark:bg-indigo-950/10 dark:text-indigo-400"
                                        : "border-teal-200 hover:border-teal-400 bg-teal-50/20 hover:bg-teal-50/50 text-teal-600 dark:border-teal-900/40 dark:hover:border-teal-700 dark:bg-teal-950/10 dark:text-teal-400"
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
                                    key={`empty-${slot.role}-${idx}`}
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
      {rotaStatus !== "none" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-bold text-lg">Staff Resources</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full border-collapse bg-card text-sm text-left">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="p-3 font-semibold">Staff Member</th>
                    <th className="p-3 font-semibold">Role</th>
                    <th className="p-3 font-semibold text-center">Assigned / Contracted Hours</th>
                    <th className="p-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(sMember => {
                    const assigned = getStaffWeeklyHours(sMember.id);
                    const contracted = sMember.contracted_weekly_hours;
                    const status = getHoursConflict(sMember);

                    let badgeColor = "text-green-800 border-green-300 dark:text-green-300 dark:border-green-900/50";
                    let statusLabel = "Within Contract";

                    if (status === "overtime") {
                      badgeColor = "text-amber-800 border-amber-300 dark:text-amber-300 dark:border-amber-900/50";
                      statusLabel = "Overtime - Warning";
                    } else if (status === "undertime") {
                      badgeColor = "text-blue-800 border-blue-300 dark:text-blue-300 dark:border-blue-900/50";
                      statusLabel = "Under Contract - Review";
                    }

                    return (
                      <tr key={sMember.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="p-3 font-medium">{sMember.name}</td>
                        <td className="p-3 text-muted-foreground uppercase text-xs">
                          {sMember.role === "nurse"
                            ? "Registered Nurse"
                            : sMember.role === "agency_nurse"
                            ? "Agency Nurse"
                            : sMember.role === "agency_care_assistant"
                            ? "Agency Care Assistant"
                            : "Care Assistant"}
                        </td>
                        <td className="p-3 text-center font-mono text-xs">
                          {assigned} / {contracted} hrs
                        </td>
                        <td className="p-3 text-right">
                          <Badge variant="outline" className={`${badgeColor} text-[10px] px-2 py-0.5`}>
                            {statusLabel}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Total Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="p-3 bg-muted/30 border rounded-lg">
                <div className="text-xs text-muted-foreground">Total Staff</div>
                <div className="text-2xl font-bold">{staff.length} Active</div>
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
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Assign Shift</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
