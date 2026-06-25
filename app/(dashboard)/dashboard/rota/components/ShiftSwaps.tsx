"use client";

import React, { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { requestShiftSwapAction, approveShiftSwapAction } from "@/app/actions/rota";

interface Shift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  shift_templates?: any;
}

interface SwapRequest {
  id: string;
  requesting_user_id: string;
  target_user_id: string | null;
  requesting_shift_id: string;
  target_shift_id: string | null;
  status: string;
  rejection_reason: string | null;
  requester?: { name: string };
  target_user?: { name: string };
  requesting_shift?: {
    date: string;
    start_time: string;
    end_time: string;
    shift_templates: { name: string };
  };
  target_shift?: {
    date: string;
    start_time: string;
    end_time: string;
    shift_templates: { name: string };
  } | null;
}

export default function ShiftSwaps({ profile, isPowerUser }: { profile: any; isPowerUser: boolean }) {
  const { supabase } = useSupabase();
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [colleagueShifts, setColleagueShifts] = useState<Shift[]>([]);
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form State
  const [selectedMyShiftId, setSelectedMyShiftId] = useState("");
  const [selectedColleagueId, setSelectedColleagueId] = useState("open"); // or user ID
  const [selectedColleagueShiftId, setSelectedColleagueShiftId] = useState("");

  const fetchData = async () => {
    if (!profile?.active_team_id) return;
    try {
      setLoading(true);

      // 1. Fetch swap requests
      let query = supabase
        .from("shift_swaps")
        .select(`
          *,
          requester:users!requesting_user_id(name),
          target_user:users!target_user_id(name),
          requesting_shift:rota_shifts!requesting_shift_id(date, start_time, end_time, shift_templates(name)),
          target_shift:rota_shifts!target_shift_id(date, start_time, end_time, shift_templates(name))
        `)
        .order("created_at", { ascending: false });

      if (isPowerUser) {
        // managers see all swaps in team
        query = query.filter("requesting_shift.rotas.team_id", "eq", profile.active_team_id);
      } else {
        // standard staff see swaps involving them
        query = query.or(`requesting_user_id.eq.${profile.id},target_user_id.eq.${profile.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSwaps((data || []) as any);

      // 2. Fetch my shifts for swapping (only published shifts)
      const { data: myS } = await supabase
        .from("rota_shifts")
        .select("id, date, start_time, end_time, shift_templates(name)")
        .eq("user_id", profile.id)
        .eq("rotas.status", "published")
        .gte("date", new Date().toISOString().split("T")[0]);

      setMyShifts(myS || []);

      // 3. Fetch colleagues in team
      const { data: cols } = await supabase
        .from("users")
        .select("id, name")
        .eq("active_team_id", profile.active_team_id)
        .neq("id", profile.id);

      setColleagues(cols || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load shift swaps");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.active_team_id, profile?.id, isPowerUser]);

  const handleColleagueChange = async (colleagueId: string) => {
    setSelectedColleagueId(colleagueId);
    setSelectedColleagueShiftId("");
    if (colleagueId === "open" || !colleagueId) {
      setColleagueShifts([]);
      return;
    }

    // Fetch this colleague's shifts
    const { data } = await supabase
      .from("rota_shifts")
      .select("id, date, start_time, end_time, shift_templates(name)")
      .eq("user_id", colleagueId)
      .eq("rotas.status", "published")
      .gte("date", new Date().toISOString().split("T")[0]);

    setColleagueShifts(data || []);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMyShiftId) {
      toast.error("Please select one of your shifts to swap.");
      return;
    }

    const targetUser = selectedColleagueId === "open" ? null : selectedColleagueId;
    const targetShift = selectedColleagueShiftId === "" ? null : selectedColleagueShiftId;

    const res = await requestShiftSwapAction(profile.id, {
      requestingShiftId: selectedMyShiftId,
      targetUserId: targetUser,
      targetShiftId: targetShift
    });

    if (res.success) {
      toast.success("Shift swap proposed successfully");
      setDialogOpen(false);
      fetchData();
    } else {
      toast.error(res.error || "Failed to propose swap");
    }
  };

  const handleApprove = async (id: string, approve: boolean) => {
    const res = await approveShiftSwapAction(profile.id, id, approve);
    if (res.success) {
      toast.success(approve ? "Shift swap approved and completed" : "Shift swap rejected");
      fetchData();
    } else {
      toast.error(res.error || "Action failed");
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
          <CardTitle>Shift Swaps</CardTitle>
          <CardDescription>
            {isPowerUser 
              ? "Verify and authorize shift swaps proposed by staff."
              : "Propose shift swaps with colleagues or accept incoming requests."
            }
          </CardDescription>
        </div>
        {!isPowerUser && (
          <Button onClick={() => setDialogOpen(true)}>Propose Swap</Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6">Loading shift swaps...</div>
        ) : swaps.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No shift swap logs found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Requesting Shift</TableHead>
                <TableHead>Colleague / Target</TableHead>
                <TableHead>Target Shift</TableHead>
                <TableHead>Status</TableHead>
                {isPowerUser && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {swaps.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold">{s.requester?.name || "Unknown"}</TableCell>
                  <TableCell>
                    {s.requesting_shift ? (
                      <div>
                        <div className="font-medium">{s.requesting_shift.shift_templates?.name || "Shift"}</div>
                        <div className="text-xs text-muted-foreground">{s.requesting_shift.date} | {s.requesting_shift.start_time.slice(0, 5)}-{s.requesting_shift.end_time.slice(0, 5)}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Deleted shift</span>
                    )}
                  </TableCell>
                  <TableCell>{s.target_user?.name || <span className="text-muted-foreground italic">Open Swap</span>}</TableCell>
                  <TableCell>
                    {s.target_shift ? (
                      <div>
                        <div className="font-medium">{s.target_shift.shift_templates?.name || "Shift"}</div>
                        <div className="text-xs text-muted-foreground">{s.target_shift.date} | {s.target_shift.start_time.slice(0, 5)}-{s.target_shift.end_time.slice(0, 5)}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">No swap target</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(s.status)}</TableCell>
                  {isPowerUser && (
                    <TableCell className="text-right space-x-2">
                      {s.status === "pending" ? (
                        <>
                          <Button size="sm" onClick={() => handleApprove(s.id, true)} className="bg-green-600 hover:bg-green-700">Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleApprove(s.id, false)}>Reject</Button>
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
            <DialogTitle>Propose Shift Swap</DialogTitle>
            <DialogDescription>Swap your shift with a colleague. Validation checks run automatically on approval.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="my-shift">Your Scheduled Shift</Label>
              <Select value={selectedMyShiftId} onValueChange={setSelectedMyShiftId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select one of your shifts" />
                </SelectTrigger>
                <SelectContent>
                  {myShifts.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.date} - {s.shift_templates?.name} ({s.start_time.slice(0,5)}-{s.end_time.slice(0,5)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="colleague">Colleague</Label>
              <Select value={selectedColleagueId} onValueChange={handleColleagueChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open Swap (Ask Anyone)</SelectItem>
                  {colleagues.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedColleagueId !== "open" && colleagueShifts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="colleague-shift">Colleague&apos;s Shift (To Swap For)</Label>
                <Select value={selectedColleagueShiftId} onValueChange={setSelectedColleagueShiftId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift to swap for" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleagueShifts.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.date} - {s.shift_templates?.name} ({s.start_time.slice(0,5)}-{s.end_time.slice(0,5)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Send Proposal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
