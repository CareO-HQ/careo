"use client";

import React, { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, List as ListIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from "date-fns";
import { requestLeaveAction, approveLeaveAction, assignLeaveAction } from "@/app/actions/rota";

interface LeaveRequest {
  id: string;
  user_id: string;
  team_id: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  type: string;
  status: string;
  notes: string | null;
  rejection_reason: string | null;
  users?: {
    name: string;
    email: string;
    annual_leave_balance: number;
  };
}

export default function LeaveManagement({ profile, isPowerUser }: { profile: any; isPowerUser: boolean }) {
  const { supabase } = useSupabase();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Assign form state (Manager only)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignStartDate, setAssignStartDate] = useState("");
  const [assignEndDate, setAssignEndDate] = useState("");
  const [assignStartTime, setAssignStartTime] = useState("");
  const [assignEndTime, setAssignEndTime] = useState("");
  const [assignLeaveType, setAssignLeaveType] = useState<"annual_leave" | "sick_leave" | "training">("annual_leave");
  const [assignNotes, setAssignNotes] = useState("");

  // Staff list state (Manager only)
  const [staff, setStaff] = useState<any[]>([]);

  // Calendar month state
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  const fetchRequests = async () => {
    if (!profile?.active_team_id) return;
    try {
      setLoading(true);
      
      let query = supabase
        .from("leave_requests")
        .select("*, users(name, email, annual_leave_balance)")
        .order("created_at", { ascending: false });

      if (isPowerUser) {
        query = query.eq("team_id", profile.active_team_id);
      } else {
        query = query.eq("user_id", profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data as any || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!profile?.active_team_id) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("active_team_id", profile.active_team_id);
      if (error) throw error;
      setStaff((data || []).filter((u: any) => u.role !== "owner" && u.role !== "manager"));
    } catch (err: any) {
      console.error("Failed to load staff list:", err.message);
    }
  };

  useEffect(() => {
    fetchRequests();
    if (isPowerUser) {
      fetchStaff();
    }
  }, [profile?.active_team_id, profile?.id, isPowerUser]);



  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.active_team_id) return;

    if (!assignUserId || assignUserId === "") {
      toast.error("Please select a staff member.");
      return;
    }

    if (new Date(assignStartDate) > new Date(assignEndDate)) {
      toast.error("Start date must be before or equal to End date.");
      return;
    }

    const res = await assignLeaveAction(profile.id, {
      userId: assignUserId,
      teamId: profile.active_team_id as string,
      startDate: assignStartDate,
      endDate: assignEndDate,
      startTime: assignStartTime || undefined,
      endTime: assignEndTime || undefined,
      type: assignLeaveType,
      notes: assignNotes
    });

    if (res.success) {
      toast.success("Leave assigned successfully");
      setAssignDialogOpen(false);
      setAssignUserId("");
      setAssignStartDate("");
      setAssignEndDate("");
      setAssignStartTime("");
      setAssignEndTime("");
      setAssignNotes("");
      fetchRequests();
    } else {
      toast.error(res.error || "Failed to assign leave");
    }
  };

  const handleApprove = async (id: string) => {
    const res = await approveLeaveAction(profile.id, id, true);
    if (res.success) {
      toast.success("Leave approved");
      fetchRequests();
    } else {
      toast.error(res.error || "Failed to approve leave");
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    const res = await approveLeaveAction(profile.id, rejectingId, false, rejectionReason);
    if (res.success) {
      toast.success("Leave rejected");
      setRejectDialogOpen(false);
      fetchRequests();
    } else {
      toast.error(res.error || "Failed to reject leave");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
    }
  };

  // Calendar generation logic
  const startMonth = startOfMonth(calendarMonth);
  const endMonth = endOfMonth(calendarMonth);
  const startWeek = startOfWeek(startMonth, { weekStartsOn: 1 });
  const endWeek = endOfWeek(endMonth, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startWeek, end: endWeek });

  const getDayLeaves = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return requests.filter(
      (r) =>
        r.status === "approved" &&
        r.start_date <= dayStr &&
        r.end_date >= dayStr
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Leave Management</CardTitle>
          <CardDescription>
            {isPowerUser 
              ? "Assign leaves, view calendar coverage, or process leave requests for your unit." 
              : `Submit and track your leave requests. Current annual leave balance: ${profile?.annual_leave_balance || 0} days.`
            }
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {isPowerUser && (
            <Button onClick={() => setAssignDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Assign Leave
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <ListIcon className="w-4 h-4" />
              <span>List View</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span>Calendar View</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {loading ? (
              <div className="text-center py-6">Loading leave requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">No leave requests found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    {isPowerUser && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-semibold">{r.users?.name || "Unknown Staff"}</div>
                        <div className="text-xs text-muted-foreground">Bal: {r.users?.annual_leave_balance ?? 0} days</div>
                      </TableCell>
                      <TableCell className="capitalize">{r.type.replace("_", " ")}</TableCell>
                      <TableCell>
                        <div>
                          {r.start_date} {r.start_time ? `(${r.start_time.slice(0, 5)})` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          to {r.end_date} {r.end_time ? `(${r.end_time.slice(0, 5)})` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{r.notes || <span className="text-muted-foreground italic text-xs">No notes</span>}</div>
                        {r.rejection_reason && (
                          <div className="text-xs text-red-500 font-medium mt-1">Reason: {r.rejection_reason}</div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      {isPowerUser && (
                        <TableCell className="text-right space-x-2">
                          {r.status === "pending" ? (
                            <>
                              <Button size="sm" onClick={() => handleApprove(r.id)} className="bg-green-600 hover:bg-green-700">Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRejectClick(r.id)}>Reject</Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Processed</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            {/* Month Select Navigation */}
            <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border">
              <Button variant="outline" size="icon" onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-lg text-card-foreground">
                {format(calendarMonth, "MMMM yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="border rounded-xl p-2 bg-card overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1.5 text-center font-semibold text-muted-foreground text-xs uppercase mb-2 py-1 border-b">
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                  <div>Sun</div>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const isCurrentMonth = isSameMonth(day, calendarMonth);
                    const isToday = isSameDay(day, new Date());
                    const dayLeaves = getDayLeaves(day);

                    return (
                      <div
                        key={dayStr}
                        className={`min-h-[110px] p-1.5 border rounded-lg flex flex-col justify-between transition-colors ${
                          isCurrentMonth 
                            ? "bg-card text-foreground border-border" 
                            : "bg-muted/10 text-muted-foreground/60 border-muted/20"
                        } ${isToday ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      >
                        {/* Day Number */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                            {format(day, "d")}
                          </span>
                          {dayLeaves.length > 0 && (
                            <span className="text-[9px] text-muted-foreground bg-muted/80 px-1.5 py-0.2 rounded-full font-medium">
                              {dayLeaves.length} {dayLeaves.length === 1 ? "leave" : "leaves"}
                            </span>
                          )}
                        </div>

                        {/* Day Leaves Badges */}
                        <div className="flex-1 overflow-y-auto max-h-[85px] space-y-1 pr-0.5 custom-scrollbar">
                          {dayLeaves.map((r) => {
                            let badgeColor = "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-900/40 dark:text-indigo-300";
                            if (r.type === "sick_leave") {
                              badgeColor = "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-300";
                            } else if (r.type === "training") {
                              badgeColor = "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-300";
                            }

                            const timeStr = r.start_time && r.end_time 
                              ? ` (${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)})`
                              : "";

                            return (
                              <div
                                key={r.id}
                                className={`text-[10px] px-1.5 py-0.5 border rounded truncate font-medium flex items-center justify-between ${badgeColor}`}
                                title={`${r.users?.name || "Unknown Staff"} - ${r.type.replace("_", " ")}${timeStr}${r.notes ? `\nNotes: ${r.notes}` : ""}`}
                              >
                                <span className="truncate">{r.users?.name || "Unknown Staff"}</span>
                                {timeStr && <span className="text-[8px] opacity-80 shrink-0 font-normal ml-1">{r.start_time?.slice(0, 5)}-{r.end_time?.slice(0, 5)}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>



      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Leave</DialogTitle>
            <DialogDescription>Directly assign and approve leave for a staff member.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="a-user">Staff Member</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger id="a-user">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.role === "nurse" ? "RN" : "CA"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-type">Leave Type</Label>
              <Select value={assignLeaveType} onValueChange={(val: any) => setAssignLeaveType(val)}>
                <SelectTrigger id="a-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual_leave">Annual Leave</SelectItem>
                  <SelectItem value="sick_leave">Sick Leave</SelectItem>
                  <SelectItem value="training">Training / Study Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="a-start">Start Date</Label>
                <Input id="a-start" type="date" value={assignStartDate} onChange={(e) => setAssignStartDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-end">End Date</Label>
                <Input id="a-end" type="date" value={assignEndDate} onChange={(e) => setAssignEndDate(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="a-start-time">Start Time (Optional)</Label>
                <Input id="a-start-time" type="time" value={assignStartTime} onChange={(e) => setAssignStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-end-time">End Time (Optional)</Label>
                <Input id="a-end-time" type="time" value={assignEndTime} onChange={(e) => setAssignEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-notes">Notes / Reason</Label>
              <Input id="a-notes" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Provide optional notes" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Assign Leave</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Please specify a reason for rejecting this leave request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="rej-reason">Rejection Reason</Label>
              <Input id="rej-reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="e.g. Understaffing on this date" required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRejectConfirm} variant="destructive">Confirm Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
