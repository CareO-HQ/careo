"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as React from "react";
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
  "13": "Falls Analysis",
  "14": "Hand Hygiene Audit",
  "15": "Hoist and Sling Register",
  "16": "IPC Short Audit",
  "17": "Mandatory Training Stats",
  "18": "Medication Audit",
  "19": "Modified Diet Audit",
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

  const [isLoading, setIsLoading] = useState(true);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem(`manager-audit-history-${auditId}`);
    if (savedHistory) {
      setHistoryRecords(JSON.parse(savedHistory));
    } else {
      // Mock data for demonstration
      setHistoryRecords([
        {
          id: "1",
          completedDate: new Date(2024, 0, 15).toISOString(),
          auditor: "Jane Smith",
          residentsAudited: 24,
          status: "completed",
          notes: "All residents compliant"
        },
        {
          id: "2",
          completedDate: new Date(2024, 1, 15).toISOString(),
          auditor: "John Doe",
          residentsAudited: 22,
          status: "completed",
          notes: "Minor issues identified and resolved"
        },
        {
          id: "3",
          completedDate: new Date(2023, 11, 15).toISOString(),
          auditor: "Sarah Johnson",
          residentsAudited: 25,
          status: "completed",
          notes: "Full compliance achieved"
        },
      ]);
    }
    setIsLoading(false);
  }, [auditId]);

  const handleBack = () => {
    router.push("/dashboard/manager-audit");
  };

  const handleViewReport = (recordId: string) => {
    toast.info("Opening detailed report...");
    // Navigate to specific report view
    router.push(`/dashboard/manager-audit/${auditId}/history/${recordId}`);
  };

  const handleDownloadReport = (recordId: string) => {
    toast.success("Downloading report...");
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
              <TableHead className="w-[150px]">Residents Audited</TableHead>
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
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReport(record.id)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Download
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
