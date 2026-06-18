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

  const fetchLogs = async () => {
    if (!profile?.active_team_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("rota_audit_logs")
        .select("*")
        .eq("team_id", profile.active_team_id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
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
                    <div className="text-xs font-mono bg-muted p-1.5 rounded overflow-x-auto max-h-24">
                      {JSON.stringify(log.details)}
                    </div>
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
