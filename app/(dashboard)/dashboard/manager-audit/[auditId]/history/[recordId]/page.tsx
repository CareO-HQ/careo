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

const AUDIT_LEVEL_SUBJECT_ID = "audit-level";

interface AuditRecordViewPageProps {
  params: Promise<{ auditId: string; recordId: string }>;
}

function AuditRecordViewPage({ params }: AuditRecordViewPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const auditId = resolvedParams.auditId;
  const recordId = resolvedParams.recordId;
  const auditName = auditNames[auditId] || "Unknown Audit";

  const [isLoading, setIsLoading] = useState(true);
  const [recordData, setRecordData] = useState<any>(null);

  useEffect(() => {
    loadRecordData();
  }, [auditId, recordId]);

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
        // Transform Supabase structure to match the frontend expectations
        const record = {
          ...data,
          id: data.id,
          completedDate: data.completed_date,
          auditor: data.auditor,
          residentsAudited: data.entries_count,
          data: data.data // This contains the full snapshot
        };
        setRecordData(record);
      } else {
        toast.error("Audit record not found");
        router.push(`/dashboard/manager-audit/${auditId}/history`);
      }
    } catch (error) {
      console.error("Error loading audit record:", error);
      toast.error("Failed to load audit record");
      router.push(`/dashboard/manager-audit/${auditId}/history`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/manager-audit/${auditId}/history`);
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
          <h2 className="text-3xl font-bold tracking-tight">{auditName}</h2>
          <Badge variant="outline">{recordData.residentsAudited} Residents</Badge>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Completed by {recordData.auditor} • {format(new Date(recordData.completedDate), "PPP")}
          </div>
          <Button onClick={handlePrint} className="no-print">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Audit Results Table */}
      <div className="rounded-md border flex-1 overflow-auto bg-white">
        {auditData.homeBasedData ? (
          /* New home-based audit view */
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[45%] font-semibold">Question</TableHead>
                <TableHead className="min-w-[160px] font-semibold">Status / Response</TableHead>
                <TableHead className="min-w-[260px] font-semibold">Audit Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(auditData.homeBasedData.questions || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    No questions in this audit
                  </TableCell>
                </TableRow>
              ) : (
                (auditData.homeBasedData.questions || []).map((question: any) => {
                  if (question.isSection) {
                    return (
                      <TableRow key={question.id} className="bg-accent/30 font-bold">
                        <TableCell colSpan={3}>{question.text}</TableCell>
                      </TableRow>
                    );
                  }

                  const subjectId = auditData.homeBasedData.subjectId || AUDIT_LEVEL_SUBJECT_ID;
                  const answer = (auditData.homeBasedData.answers || []).find(
                    (item: any) => item.residentId === subjectId && item.questionId === question.id
                  );
                  const comment = (auditData.homeBasedData.comments || []).find(
                    (item: any) => item.residentId === subjectId
                  );

                  return (
                    <TableRow key={question.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="text-sm">{question.text}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {question.type === "yesno"
                            ? "Yes / No"
                            : question.type === "text"
                              ? "Text"
                              : question.type === "date"
                                ? "Date"
                                : "Compliance"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${getAnswerColor(answer?.value)}`}>
                          {getAnswerDisplay(answer?.value)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {comment?.text || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        ) : auditData.gridData ? (
          /* Grid-based Audit View */
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[300px] font-semibold sticky left-0 bg-muted z-10 border-r">Questions</TableHead>
                {auditData.gridData.columnQuestions.map((q: any) => (
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
              {auditData.gridData.rowQuestions.map((rowQ: any) => (
                <TableRow key={rowQ.id} className={rowQ.isSection ? "bg-accent/30 font-bold" : "hover:bg-muted/30 transition-colors"}>
                  <TableCell className={`sticky left-0 bg-white border-r z-10 ${rowQ.isSection ? "bg-accent/30" : ""}`}>
                    {rowQ.text}
                  </TableCell>
                  {!rowQ.isSection && (
                    <>
                      {auditData.gridData.columnQuestions.map((colQ: any) => {
                        const answer = auditData.gridData.answers?.find((a: any) => a.residentId === rowQ.id && a.questionId === colQ.id);
                        return (
                          <TableCell key={colQ.id} className="text-center border-r">
                            <span className={`text-sm ${getAnswerColor(answer?.value)}`}>
                              {getAnswerDisplay(answer?.value)}
                            </span>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-sm text-muted-foreground border-r italic">
                        {auditData.gridData.fixedColumnData?.[rowQ.id]?.comment || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground border-r italic">
                        {auditData.gridData.fixedColumnData?.[rowQ.id]?.actionRequired || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground italic">
                        {auditData.gridData.fixedColumnData?.[rowQ.id]?.actionCompleted || "-"}
                      </TableCell>
                    </>
                  )}
                  {rowQ.isSection && (
                    <TableCell colSpan={auditData.gridData.columnQuestions.length + 3} />
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          /* Standard Resident-based Audit View */
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px] font-semibold">Resident</TableHead>
                {(auditData.questions || []).map((q: any) => (
                  <TableHead key={q.id} className="min-w-[140px] max-w-[180px] font-semibold">
                    <div className="flex items-center justify-between px-2 gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs leading-tight truncate flex-1 cursor-help">
                            {q.text.length > 20 ? `${q.text.substring(0, 20)}...` : q.text}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{q.text}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[250px] font-semibold">Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!auditData.residents || auditData.residents.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={(auditData.questions?.length || 0) + 2} className="h-32 text-center text-muted-foreground">
                    No residents in this audit
                  </TableCell>
                </TableRow>
              ) : (
                auditData.residents.map((resident: any) => (
                  <TableRow key={resident.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={resident.imageUrl} />
                          <AvatarFallback className="text-xs">
                            {resident.firstName[0]}{resident.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm">{resident.firstName} {resident.lastName}</div>
                          {resident.roomNumber && (
                            <div className="text-xs text-muted-foreground">Room {resident.roomNumber}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {resident.answers.map((answer: any) => (
                      <TableCell key={answer.questionId} className="px-2 py-3">
                        <span className={`text-sm ${getAnswerColor(answer.value)}`}>
                          {getAnswerDisplay(answer.value)}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="px-3">
                      <span className="text-sm text-muted-foreground">
                        {resident.comment || "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Action Plans */}
      {auditData.actionPlans && auditData.actionPlans.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xl font-bold">Audit Action Plans</h3>
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Resident</TableHead>
                  <TableHead className="font-semibold">Action Required</TableHead>
                  <TableHead className="font-semibold">Assigned To</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditData.actionPlans.map((plan: any) => (
                  <TableRow key={plan.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-primary">{plan.residentName || 'General'}</TableCell>
                    <TableCell>{plan.text}</TableCell>
                    <TableCell>{plan.assignedToName || plan.assignedToEmail || plan.assignedTo}</TableCell>
                    <TableCell>{plan.dueDate ? format(new Date(plan.dueDate), "dd/MM/yyyy") : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={plan.priority === 'High' ? 'destructive' : 'outline'}>
                        {plan.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        plan.status === 'completed' ? 'bg-green-500 hover:bg-green-600' :
                          plan.status === 'in_progress' ? 'bg-blue-500 hover:bg-blue-600' :
                            'bg-yellow-500 hover:bg-yellow-600'
                      }>
                        {(plan.status || 'pending').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

export default withRoleGuard(AuditRecordViewPage, ["manager", "admin", "owner"]);
