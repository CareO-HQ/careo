"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Eye, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import { withRoleGuard } from "@/lib/route-guards";
import { format } from "date-fns";
import { useActiveTeam } from "@/hooks/use-active-team";
import { generateManagerAuditPDF } from "@/lib/manager-audit-pdf-utils";

const auditNames: Record<string, string> = {
  "0": "Care File Audit",
  "1": "Accidents and Incidents Analysis",
  "2": "Agency Profiles and Induction Records",
  "3": "Bedrails Audit",
  "4": "Domestic Services",
  "5": "CARE Documentation (10% to be checked)",
  "6": "Catering Audit",
  "7": "Competency Assessment Review",
  "8": "Complaints Analysis",
  "9": "Decontamination",
  "10": "Dining Experience",
  "11": "DOLS",
  "12": "Domestic Audit",
  "13": "Fall audit",
  "14": "Hand Hygiene Audit",
  "15": "Hoist and Sling Register",
  "16": "IPC Short Audit",
  "17": "Mandatory Training Stats",
  "18": "Medication Audit",
  "19": "Modified Diet and Fluids Audit",
  "20": "NMC NISSC Logs",
  "21": "Restrictive Practice",
  "22": "RTW Tracker",
  "23": "Safeguarding Database",
  "24": "Safety Alerts",
  "25": "Smoking Compliance",
  "26": "Supervision and Appraisal Matrix",
  "27": "Weights Analysis",
  "28": "Wounds Analysis",
  "29": "GDPR",
  "30": "Personnel Files",
  "31": "Resident Agreement",
  "32": "NISCC Registration Tracker",
  "33": "NMC Registration Tracker",
  "34": "Incident audit",
  "35": "Moving & Handling Audit",
  "36": "Choking Risk Assessment Audit",
  "37": "DNACPR Audit",
  "38": "Care Management Reviews",
  "39": "Pressure Damage Prevention Audit",
  "40": "Health & Monitoring Audit",
  "41": "Mattress and Visual Checks Audit",
  "42": "Infection Control Audit",
};

interface HistoryRecord {
  id: string;
  completedDate: string;
  auditor: string;
  residentsAudited: number;
  status: "completed" | "partial";
  notes?: string;
}

interface AuditHistoryPageProps {
  params: Promise<{ auditId: string }>;
}

function AuditHistoryPage({ params }: AuditHistoryPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const auditId = resolvedParams.auditId;
  const auditName = auditNames[auditId] || "Unknown Audit";
  const isTeamBased = ["18", "3"].includes(auditId);
  const isStaffBased = ["7", "22", "26", "32", "33"].includes(auditId);
  const isHomeBased = ["1", "9", "10", "13", "14", "16", "23", "24", "29", "42"].includes(auditId);

  const { activeCareHomeId, activeOrganizationId } = useActiveTeam();
  const [isLoading, setIsLoading] = useState(true);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [downloadingRecordId, setDownloadingRecordId] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!activeCareHomeId) return;

      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('manager_audit_history')
          .select('id, completed_date, auditor, entries_count, notes')
          .eq('care_home_id', activeCareHomeId)
          .eq('audit_type_id', auditId)
          .order('completed_date', { ascending: false });

          if (error) throw error;

      if (data) {
        setHistoryRecords(data.map(r => ({
          id: r.id,
          completedDate: r.completed_date,
          auditor: r.auditor,
          residentsAudited: r.entries_count,
          status: "completed",
          notes: r.notes
        })));
      }
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load audit history");
    } finally {
      setIsLoading(false);
    }
  };

    if (activeCareHomeId && activeOrganizationId) {
      loadHistory();
    }
  }, [auditId, activeCareHomeId, activeOrganizationId]);

  const handleBack = () => {
    router.push("/dashboard/manager-audit");
  };

  const handleViewReport = (recordId: string) => {
    toast.info("Opening detailed report...");
    // Navigate to specific report view
    router.push(`/dashboard/manager-audit/${auditId}/history/${recordId}`);
  };

  const handleDownloadReport = async (recordId: string) => {
    try {
      setDownloadingRecordId(recordId);
      const downloadToast = toast.loading("Generating PDF report...");
      await generateManagerAuditPDF({ recordId });
      toast.success("PDF report downloaded", { id: downloadToast });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setDownloadingRecordId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Audit History</h2>
            <p className="text-muted-foreground">{auditName}</p>
          </div>
        </div>
        <Badge variant="outline">{historyRecords.length} Previous Audits</Badge>
      </div>

      {/* History Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Completed Date</TableHead>
              <TableHead>Auditor</TableHead>
              <TableHead className="w-[150px]">{isTeamBased ? 'Teams Audited' : isStaffBased ? 'Staff Audited' : isHomeBased ? 'Questions Audited' : 'Residents Audited'}</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[300px]">Notes</TableHead>
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No audit history found.
                </TableCell>
              </TableRow>
            ) : (
              historyRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(record.completedDate), "PPP")}</span>
                    </div>
                  </TableCell>
                  <TableCell>{record.auditor}</TableCell>
                  <TableCell>{record.residentsAudited}</TableCell>
                  <TableCell>
                    <Badge variant={record.status === "completed" ? "default" : "secondary"}>
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReport(record.id)}
                        disabled={!!downloadingRecordId}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReport(record.id)}
                        disabled={!!downloadingRecordId}
                      >
                        <Download className="h-4 w-4 mr-1" /> {downloadingRecordId === record.id ? "Downloading..." : "Download"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {historyRecords.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Showing {historyRecords.length} completed audit{historyRecords.length !== 1 ? 's' : ''}</p>
          <p>Most recent audit: {format(new Date(historyRecords[0].completedDate), "PPP")}</p>
        </div>
      )}
    </div>
  );
}

export default withRoleGuard(AuditHistoryPage, ["manager", "admin", "owner"]);
