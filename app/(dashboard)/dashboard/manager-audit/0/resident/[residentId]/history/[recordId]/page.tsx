"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { withRoleGuard } from "@/lib/route-guards";

interface ResidentCareFileRecordPageProps {
  params: Promise<{ residentId: string; recordId: string }>;
}

function ResidentCareFileRecordPage({ params }: ResidentCareFileRecordPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const residentId = resolvedParams.residentId;
  const recordId = resolvedParams.recordId;

  const [isLoading, setIsLoading] = useState(true);
  const [recordData, setRecordData] = useState<any>(null);

  useEffect(() => {
    loadRecordData();
  }, [residentId, recordId]);

  const loadRecordData = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('manager_audit_history')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) throw error;

      if (data) {
        setRecordData(data);
      } else {
        toast.error("Audit record not found");
        router.push(`/dashboard/manager-audit/0/resident/${residentId}/history`);
      }
    } catch (error) {
      console.error("Error loading audit record:", error);
      toast.error("Failed to load audit record");
      router.push(`/dashboard/manager-audit/0/resident/${residentId}/history`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/manager-audit/0/resident/${residentId}/history`);
  };

  const handlePrint = () => {
    window.print();
  };

  const getAnswerColor = (value?: string) => {
    if (!value) return "text-muted-foreground";
    if (value === "yes" || value === "compliant") return "text-green-600 font-medium";
    if (value === "no" || value === "non-compliant") return "text-red-600 font-medium";
    if (value === "not-applicable") return "text-gray-500 font-medium";
    return "";
  };

  const getAnswerDisplay = (value?: string) => {
    if (!value) return "-";
    if (value === "yes") return "✓ Yes";
    if (value === "no") return "✗ No";
    if (value === "compliant") return "✓ Compliant";
    if (value === "non-compliant") return "✗ Non-Compliant";
    if (value === "not-applicable") return "— N/A";
    return value;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading audit record...</p>
      </div>
    );
  }

  if (!recordData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Audit record not found</p>
      </div>
    );
  }

  const auditData = recordData.data;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 h-full flex flex-col">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={handleBack} className="no-print">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Care File Audit Record</h2>
          <Badge variant="outline">{auditData.residentName}</Badge>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Completed by {recordData.auditor} • {format(new Date(recordData.completed_date), "PPP")}
          </div>
          <Button onClick={handlePrint} className="no-print">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Audit Results Table */}
      <div className="rounded-md border flex-1 overflow-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[300px] font-semibold sticky left-0 bg-muted z-10 border-r">Questions</TableHead>
              {auditData.columnQuestions.map((q: any) => (
                <TableHead key={q.id} className="min-w-[120px] font-semibold text-center border-r">
                  {q.text}
                </TableHead>
              ))}
              <TableHead className="min-w-[200px] font-semibold border-r">Comment</TableHead>
              <TableHead className="min-w-[200px] font-semibold border-r">Action Required</TableHead>
              <TableHead className="min-w-[150px] font-semibold">Action Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditData.rowQuestions.map((rowQ: any) => (
              <TableRow key={rowQ.id} className={rowQ.isSection ? "bg-accent/30 font-bold" : "hover:bg-muted/30 transition-colors"}>
                <TableCell className={`sticky left-0 bg-white border-r z-10 ${rowQ.isSection ? "bg-accent/30" : ""}`}>
                  {rowQ.text}
                </TableCell>
                {!rowQ.isSection && (
                  <>
                    {auditData.columnQuestions.map((colQ: any) => {
                      const answer = auditData.answers?.find((a: any) => a.residentId === rowQ.id && a.questionId === colQ.id);
                      return (
                        <TableCell key={colQ.id} className="text-center border-r">
                          <span className={`text-sm ${getAnswerColor(answer?.value)}`}>
                            {getAnswerDisplay(answer?.value)}
                          </span>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-sm text-muted-foreground border-r italic">
                      {auditData.fixedColumnData?.[rowQ.id]?.comment || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground border-r italic">
                      {auditData.fixedColumnData?.[rowQ.id]?.actionRequired || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground italic">
                      {auditData.fixedColumnData?.[rowQ.id]?.actionCompleted || "-"}
                    </TableCell>
                  </>
                )}
                {rowQ.isSection && (
                  <TableCell colSpan={auditData.columnQuestions.length + 3} />
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default withRoleGuard(ResidentCareFileRecordPage, ["manager", "admin", "owner"]);
