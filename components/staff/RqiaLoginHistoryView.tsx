"use client";

import React, { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { format } from "date-fns";
import { ShieldCheck, Clock, User, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RqiaLoginLog {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  logged_in_at: string;
  created_at: string;
}

interface RqiaLoginHistoryViewProps {
  userId: string;
  staffName?: string;
}

export function RqiaLoginHistoryView({ userId, staffName }: RqiaLoginHistoryViewProps) {
  const { supabase } = useSupabase();
  const [logs, setLogs] = useState<RqiaLoginLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      if (!supabase || !userId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("rqia_login_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_in_at", { ascending: false });

        if (error) {
          console.error("Error fetching RQIA login logs:", error);
          setLogs([]);
        } else {
          setLogs(data || []);
        }
      } catch (err) {
        console.error("Error loading RQIA login logs:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, [supabase, userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-sm">Loading inspection login logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-lg text-slate-900">
            Inspection Session Logs
          </h3>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {logs.length} {logs.length === 1 ? "Session Log" : "Session Logs"}
        </Badge>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
          <p className="font-medium text-slate-700 text-sm">No inspection sessions recorded</p>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            No session login entries have been registered by {staffName || "this inspector"} yet.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Inspector Name</th>
                <th className="py-3 px-4">Entry / Login Time</th>
                <th className="py-3 px-4">Session Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const logDate = new Date(log.logged_in_at || log.created_at);
                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-slate-900">
                          {log.full_name || `${log.first_name} ${log.last_name}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{format(logDate, "p")}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {format(logDate, "PPP")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
