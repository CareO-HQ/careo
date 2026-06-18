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
import { requestLeaveAction, approveLeaveAction } from "@/app/actions/rota";

interface LeaveRequest {
  id: string;
  user_id: string;
  team_id: string;
  start_date: string;
  end_date: string;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Request form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<"annual_leave" | "sick_leave" | "training">("annual_leave");
  const [notes, setNotes] = useState("");

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

  useEffect(() => {
    fetchRequests();
  }, [profile?.active_team_id, profile?.id, isPowerUser]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.active_team_id) return;

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before or equal to End date.");
      return;
    }

    const res = await requestLeaveAction(profile.id, {
      teamId: profile.active_team_id as string,
      startDate,
      endDate,
      type: leaveType,
      notes
    });

    if (res.success) {
      if (res.warning) {
        toast.warning(res.warning, { duration: 6000 });
      } else {
        toast.success("Leave request submitted successfully");
      }
      setDialogOpen(false);
      fetchRequests();
    } else {
      toast.error(res.error || "Failed to submit request");
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            {isPowerUser 
              ? "Approve or reject leave requests for your unit." 
              : `Submit and track your leave requests. Current annual leave balance: ${profile?.annual_leave_balance || 0} days.`
            }
          </CardDescription>
        </div>
        {!isPowerUser && (
          <Button onClick={() => setDialogOpen(true)}>Request Leave</Button>
        )}
      </CardHeader>
      <CardContent>
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
                  <TableCell>{r.start_date} to {r.end_date}</TableCell>
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
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>Submit leave request for approval. Annual leave deductions count working days.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="l-type">Leave Type</Label>
              <Select value={leaveType} onValueChange={(val: any) => setLeaveType(val)}>
                <SelectTrigger>
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
                <Label htmlFor="l-start">Start Date</Label>
                <Input id="l-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-end">End Date</Label>
                <Input id="l-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="l-notes">Notes / Reason</Label>
              <Input id="l-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Provide optional notes" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Request</Button>
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
