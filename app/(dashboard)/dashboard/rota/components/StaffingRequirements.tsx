"use client";

import React, { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { configureStaffingRequirementsAction } from "@/app/actions/rota";

interface Template {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  sort_order: number;
}

interface StaffingReq {
  shift_template_id: string;
  nurses_required: number;
  care_assistants_required: number;
}

export default function StaffingRequirements({ profile }: { profile: any }) {
  const { supabase } = useSupabase();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [requirements, setRequirements] = useState<Record<string, StaffingReq>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRequirements = async () => {
    if (!profile?.active_team_id) return;
    try {
      setLoading(true);
      
      // 1. Fetch shift templates sorted by sort_order
      const { data: tData, error: tErr } = await supabase
        .from("shift_templates")
        .select("id, name, start_time, end_time, sort_order")
        .eq("team_id", profile.active_team_id)
        .order("sort_order", { ascending: true })
        .order("start_time", { ascending: true });
      
      if (tErr) throw tErr;
      setTemplates(tData || []);

      // 2. Fetch existing staffing requirements
      const { data: rData, error: rErr } = await supabase
        .from("shift_staffing_requirements")
        .select("*")
        .eq("team_id", profile.active_team_id);

      if (rErr) throw rErr;

      const reqsMap: Record<string, StaffingReq> = {};
      rData?.forEach(req => {
        reqsMap[req.shift_template_id] = {
          shift_template_id: req.shift_template_id,
          nurses_required: req.nurses_required,
          care_assistants_required: req.care_assistants_required
        };
      });

      setRequirements(reqsMap);
    } catch (err: any) {
      toast.error(err.message || "Failed to load staffing requirements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [profile?.active_team_id]);

  const handleRequirementChange = (templateId: string, field: "nurses_required" | "care_assistants_required", val: number) => {
    setRequirements(prev => ({
      ...prev,
      [templateId]: {
        shift_template_id: templateId,
        nurses_required: field === "nurses_required" ? val : (prev[templateId]?.nurses_required ?? 1),
        care_assistants_required: field === "care_assistants_required" ? val : (prev[templateId]?.care_assistants_required ?? 3)
      }
    }));
  };

  const handleSave = async () => {
    if (!profile?.active_team_id) return;
    try {
      setSaving(true);

      const requirementsList = templates.map(t => {
        const req = requirements[t.id];
        return {
          shift_template_id: t.id,
          nurses_required: req?.nurses_required ?? 1,
          care_assistants_required: req?.care_assistants_required ?? 3
        };
      });

      const res = await configureStaffingRequirementsAction(profile.id, profile.active_team_id, requirementsList);
      if (res.success) {
        toast.success("Staffing requirements configured successfully");
        fetchRequirements();
      } else {
        toast.error(res.error || "Failed to configure staffing requirements");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure Staffing Requirements</CardTitle>
        <CardDescription>Define minimum staffing levels per shift. These rules feed directly into weekly rota validation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-6">Loading rules...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">Please define Shift Templates first before setting requirements.</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead className="w-[180px]">Nurses Required (RN)</TableHead>
                  <TableHead className="w-[180px]">Care Assistants Required (CA/SCA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => {
                  const req = requirements[t.id] || { shift_template_id: t.id, nurses_required: 1, care_assistants_required: 3 };
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-semibold">{t.name}</TableCell>
                      <TableCell>{t.start_time.slice(0, 5)}</TableCell>
                      <TableCell>{t.end_time.slice(0, 5)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={req.nurses_required}
                          onChange={(e) => handleRequirementChange(t.id, "nurses_required", Number(e.target.value))}
                          className="w-24 h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={req.care_assistants_required}
                          onChange={(e) => handleRequirementChange(t.id, "care_assistants_required", Number(e.target.value))}
                          className="w-24 h-9"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving Rules..." : "Save Staffing Rules"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
