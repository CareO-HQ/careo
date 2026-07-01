"use client";

import React, { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
  id: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  details: any;
  created_at: string;
}

export default function RotaAuditTrail({ profile }: { profile: any }) {
  const { supabase } = useSupabase();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [templatesMap, setTemplatesMap] = useState<Record<string, string>>({});
  const [shiftsMap, setShiftsMap] = useState<Record<string, { date: string; name: string }>>({});

  const fetchLogs = async () => {
    if (!profile?.active_team_id) return;
    try {
      setLoading(true);

      // 1. Fetch user mappings
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name");
      
      const uMap: Record<string, string> = {};
      if (!userError && userData) {
        userData.forEach((u: any) => {
          uMap[u.id] = u.name;
        });
        setUsersMap(uMap);
      }

      // 2. Fetch shift template mappings
      const { data: templateData, error: templateError } = await supabase
        .from("shift_templates")
        .select("id, name")
        .eq("team_id", profile.active_team_id);
      
      const tMap: Record<string, string> = {};
      if (!templateError && templateData) {
        templateData.forEach((t: any) => {
          tMap[t.id] = t.name;
        });
        setTemplatesMap(tMap);
      }

      // 3. Fetch active shifts of the team to map active shift IDs
      const sMap: Record<string, { date: string; name: string }> = {};
      const { data: rotasData } = await supabase
        .from("rotas")
        .select("id")
        .eq("team_id", profile.active_team_id);
      
      const rIds = rotasData?.map(r => r.id) || [];
      if (rIds.length > 0) {
        const { data: shiftsData } = await supabase
          .from("rota_shifts")
          .select("id, date, shift_template_id")
          .in("rota_id", rIds);
        
        if (shiftsData) {
          shiftsData.forEach((s: any) => {
            sMap[s.id] = {
              date: s.date,
              name: tMap[s.shift_template_id] || "Shift"
            };
          });
        }
      }

      // 4. Fetch audit logs
      const { data, error } = await supabase
        .from("rota_audit_logs")
        .select("*")
        .eq("team_id", profile.active_team_id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // 5. Scan audit logs to extract dates/names for deleted shifts where possible
      if (data) {
        data.forEach((log: any) => {
          const det = log.details;
          if (!det) return;
          if (det.shift_id && det.date) {
            const shiftId = det.shift_id;
            if (!sMap[shiftId]) {
              sMap[shiftId] = {
                date: det.date,
                name: tMap[det.shift_template_id] || "Shift"
              };
            } else if (det.shift_template_id && sMap[shiftId].name === "Shift") {
              sMap[shiftId].name = tMap[det.shift_template_id] || "Shift";
            }
          }
        });
      }

      setShiftsMap(sMap);
      setLogs(data || []);
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [profile?.active_team_id]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "rota_published":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Published</Badge>;
      case "rota_created":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Created</Badge>;
      case "manager_approved_nurse_granted":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Auth Granted</Badge>;
      case "manager_approved_nurse_revoked":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Auth Revoked</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{action.replace(/_/g, " ")}</Badge>;
    }
  };

  const renderDetails = (log: AuditLog) => {
    const { action_type, details } = log;

    if (!details) return "No details available";

    // 1. If details has a pre-formatted message property, display it directly
    if (details.msg) {
      let msgStr = details.msg;
      
      // Match and replace shift UUID references (specifically preceded by "shift" or "between shift" or "from shift" etc.)
      msgStr = msgStr.replace(/(?:shift|between\s+shift)\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi, (match: string, uuid: string) => {
        const lowerUuid = uuid.toLowerCase();
        if (shiftsMap[lowerUuid]) {
          const sInfo = shiftsMap[lowerUuid];
          return `"${sInfo.name}" on ${sInfo.date}`;
        }
        return "shift";
      });

      // Resolve any remaining UUIDs (like user IDs or template IDs or unmatched shift IDs) in details.msg with cleaner labels
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
      msgStr = msgStr.replace(uuidRegex, (match: string) => {
        const lowerMatch = match.toLowerCase();
        if (shiftsMap[lowerMatch]) {
          const sInfo = shiftsMap[lowerMatch];
          return `"${sInfo.name}" on ${sInfo.date}`;
        }
        return usersMap[lowerMatch] || templatesMap[lowerMatch] || match;
      });

      // Clean up double prefixes like "new shift "Day shift" on 2026-06-15" to "new "Day shift" on 2026-06-15"
      msgStr = msgStr.replace(/new\s+shift\s+(")/g, 'new $1');

      return msgStr;
    }

    const getUserName = (id: string) => usersMap[id] || id || "Unknown Staff";
    const getTemplateName = (id: string) => templatesMap[id] || id || "Shift";

    switch (action_type) {
      case "manager_approved_nurse_granted":
        return `Granted Nurse Manager-Approved authorization to ${getUserName(details.target_staff_id)}`;
      case "manager_approved_nurse_revoked":
        return `Revoked Nurse Manager-Approved authorization from ${getUserName(details.target_staff_id)}`;
      case "shift_template_created":
        return `Created shift template "${details.name || 'Unnamed'}"`;
      case "shift_template_edited":
        return `Edited shift template "${details.name || 'Unnamed'}"`;
      case "shift_template_deleted":
        return `Deleted shift template "${details.name || 'Unnamed'}"`;
      case "staffing_rule_changed":
        if (Array.isArray(details.requirements)) {
          const names = details.requirements
            .map((r: any) => getTemplateName(r.shift_template_id))
            .filter(Boolean)
            .join(", ");
          return `Updated staffing requirements rules for ${names || 'shifts'}`;
        }
        return "Updated staffing requirements rules";
      case "rota_created":
        return `Created draft rota for week of ${details.start_date || 'Unknown Date'}`;
      case "rota_published":
        return "Published the rota to staff";
      case "shift_added":
        return `Assigned shift on ${details.date || 'Unknown Date'} to ${details.user_id ? getUserName(details.user_id) : (details.custom_staff_name || 'Unassigned')}`;
      case "shift_removed":
        return `Removed shift on ${details.date || 'Unknown Date'} assigned to ${details.user_id ? getUserName(details.user_id) : (details.custom_staff_name || 'Unassigned')}${details.reason ? ` (Reason: ${details.reason})` : ''}`;
      case "shift_swapped":
        return `Proposed shift swap (Requesting Shift ID: ${details.requesting_shift_id || 'Unknown'})`;
      case "leave_requested":
        return `Requested leave from ${details.start_date || 'Unknown Date'} to ${details.end_date || 'Unknown Date'}`;
      case "leave_approved":
        return `Approved leave request for ${getUserName(details.target_user_id)}`;
      case "leave_rejected":
        return `Rejected leave request for ${getUserName(details.target_user_id)}`;
      default:
        try {
          return JSON.stringify(details);
        } catch {
          return "Audit details log";
        }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rota Audit Trail</CardTitle>
        <CardDescription>Immutable record of all scheduling updates, templates changes, leave approvals, and role updates on this unit.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No audit entries found for this unit.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-semibold">{log.actor_name}</TableCell>
                  <TableCell className="capitalize">{log.actor_role.replace(/_/g, " ")}</TableCell>
                  <TableCell>{getActionBadge(log.action_type)}</TableCell>
                  <TableCell className="max-w-[400px]">
                    <span className="text-sm text-muted-foreground">
                      {renderDetails(log)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "PPP p")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

