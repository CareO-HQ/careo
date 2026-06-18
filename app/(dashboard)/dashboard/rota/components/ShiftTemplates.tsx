"use client";

import React, { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";
import {
  createShiftTemplateAction,
  updateShiftTemplateAction,
  deleteShiftTemplateAction
} from "@/app/actions/rota";

interface Template {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  hours: number;
  notes: string | null;
}

export default function ShiftTemplates({ profile }: { profile: any }) {
  const { supabase } = useSupabase();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breakMins, setBreakMins] = useState(30);

  const fetchTemplates = async () => {
    if (!profile?.active_team_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("team_id", profile.active_team_id)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [profile?.active_team_id]);

  const calculateHours = (start: string, end: string, breaks: number) => {
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    
    const startMins = sH * 60 + sM;
    let endMins = eH * 60 + eM;
    
    if (endMins < startMins) {
      endMins += 24 * 60; // crossover midnight
    }
    
    const diffMins = endMins - startMins - breaks;
    return Math.max(0, Math.round((diffMins / 60) * 100) / 100);
  };

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setName("");
    setStartTime("08:00");
    setEndTime("17:00");
    setBreakMins(30);
    setDialogOpen(true);
  };

  const handleOpenEdit = (t: Template) => {
    setEditingTemplate(t);
    setName(t.name);
    setStartTime(t.start_time.slice(0, 5));
    setEndTime(t.end_time.slice(0, 5));
    setBreakMins(t.break_minutes);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.active_team_id) return;

    const calculatedHrs = calculateHours(startTime, endTime, breakMins);

    if (editingTemplate) {
      // Edit
      const res = await updateShiftTemplateAction(profile.id, editingTemplate.id, {
        name,
        start_time: startTime,
        end_time: endTime,
        break_minutes: breakMins,
        hours: calculatedHrs
      });

      if (res.success) {
        toast.success("Shift template updated successfully");
        setDialogOpen(false);
        fetchTemplates();
      } else {
        toast.error(res.error || "Failed to update template");
      }
    } else {
      // Add
      const res = await createShiftTemplateAction(profile.id, profile.active_team_id, {
        name,
        start_time: startTime,
        end_time: endTime,
        break_minutes: breakMins,
        hours: calculatedHrs
      });

      if (res.success) {
        toast.success("Shift template created successfully");
        setDialogOpen(false);
        fetchTemplates();
      } else {
        toast.error(res.error || "Failed to create template");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template? Any assignments referencing this template might lose their name context.")) return;
    const res = await deleteShiftTemplateAction(profile.id, id);
    if (res.success) {
      toast.success("Template deleted");
      fetchTemplates();
    } else {
      toast.error(res.error || "Failed to delete template");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Configure Rota Settings</CardTitle>
          <CardDescription>Define your standard shift patterns and global operational rules.</CardDescription>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Shift Type
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6">Loading shift definitions...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No shift templates defined for this unit.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift Name</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Break (min)</TableHead>
                <TableHead>Hours Worked</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-semibold">{t.name}</TableCell>
                  <TableCell>{t.start_time.slice(0, 5)}</TableCell>
                  <TableCell>{t.end_time.slice(0, 5)}</TableCell>
                  <TableCell>{t.break_minutes} mins</TableCell>
                  <TableCell>{t.hours} hrs</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(t)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Shift Type" : "Add Shift Type"}</DialogTitle>
            <DialogDescription>Create a standard reusable template for this unit.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="t-name">Shift Name</Label>
              <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Day Shift, Early, Late" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-start">Start Time</Label>
                <Input id="t-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-end">End Time</Label>
                <Input id="t-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-break">Break Duration (minutes)</Label>
              <Input id="t-break" type="number" value={breakMins} onChange={(e) => setBreakMins(Number(e.target.value))} required />
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm flex justify-between items-center">
              <span>Computed paid shift hours:</span>
              <span className="font-bold text-lg text-primary">
                {calculateHours(startTime, endTime, breakMins)} hrs
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Template</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
