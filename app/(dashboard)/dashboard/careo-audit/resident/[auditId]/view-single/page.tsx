"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Resident as ResidentType } from "@/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Download, Printer, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface Question {
  id: string;
  text: string;
  type: "compliance" | "yesno";
}

interface Answer {
  residentId: string;
  questionId: string;
  value: string;
  notes?: string;
  date?: string;
}

interface Comment {
  residentId: string;
  text: string;
}

interface ActionPlan {
  id: string;
  auditId: string;
  text: string;
  assignedTo: string;
  dueDate: Date | undefined;
  priority: string;
}

interface CompletedAudit {
  id: string;
  name: string;
  category: string;
  completedAt: number;
  questions: Question[];
  answers: Answer[];
  comments: Comment[];
  residentDates: { [residentId: string]: string };
  actionPlans: ActionPlan[];
  status: string;
}

export default function ViewCompletedAuditPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;
  const { activeTeamId } = useActiveTeam();

  const [auditData, setAuditData] = useState<CompletedAudit | null>(null);
  const [cameFromArchived, setCameFromArchived] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionPlanToDelete, setActionPlanToDelete] = useState<Id<"residentAuditActionPlans"> | null>(null);

  // Check if it's a database audit (Convex ID)
  const isConvexId = /^[a-z]/.test(auditId);

  // Load from database if it's a Convex ID
  const dbAudit = useQuery(
    api.auditResponses.getResponseById,
    isConvexId && auditId
      ? { responseId: auditId as any }
      : "skip"
  );

  // Load template to get questions (only if we have a database audit)
  const dbTemplate = useQuery(
    api.auditTemplates.getTemplateById,
    isConvexId && dbAudit?.templateId
      ? { templateId: dbAudit.templateId }
      : "skip"
  );

  // Load action plans from database
  const dbActionPlans = useQuery(
    api.auditActionPlans.getActionPlansByAudit,
    isConvexId && auditId
      ? { auditResponseId: auditId as Id<"residentAuditCompletions"> }
      : "skip"
  );

  // Delete action plan mutation
  const deleteActionPlan = useMutation(api.auditActionPlans.deleteActionPlan);

  useEffect(() => {
    // Check if user came from archived page
    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      const fromArchived = referrer.includes('/careo-audit/archived');
      setCameFromArchived(fromArchived);
    }
  }, []);

  const handleBack = () => {
    // Always go back to archived page if we have audit data
    if (auditData && dbAudit) {
      // Include templateId for database audits
      const backUrl = `/dashboard/careo-audit/archived?name=${encodeURIComponent(auditData.name)}&category=${auditData.category}&templateId=${dbAudit.templateId}`;
      router.push(backUrl);
    } else if (auditData) {
      // Fallback without templateId for localStorage audits
      const backUrl = `/dashboard/careo-audit/archived?name=${encodeURIComponent(auditData.name)}&category=${auditData.category}`;
      router.push(backUrl);
    } else {
      // Fallback to main listing
      router.push("/dashboard/careo-audit?tab=resident");
    }
  };

  // Fetch residents
  const dbResidents = useQuery(
    api.residents.getByTeamId,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  ) as ResidentType[] | undefined;

  // Load completed audit data from database or localStorage
  useEffect(() => {
    if (isConvexId && dbAudit && dbTemplate) {
      // Transform database format to component format
      const transformed: CompletedAudit = {
        id: dbAudit._id,
        name: dbAudit.templateName,
        category: dbAudit.category,
        completedAt: dbAudit.completedAt || dbAudit.createdAt,
        questions: dbTemplate.questions || [], // Load questions from template
        answers: [],
        comments: [],
        residentDates: {},
        actionPlans: [],
        status: dbAudit.status,
      };

      // Transform responses to answers format
      dbAudit.responses.forEach((response: any) => {
        response.answers.forEach((answer: any) => {
          if (answer.value) {
            transformed.answers.push({
              residentId: response.residentId,
              questionId: answer.questionId,
              value: answer.value,
              notes: answer.notes,
            });
          }
        });

        if (response.comment) {
          transformed.comments.push({
            residentId: response.residentId,
            text: response.comment,
          });
        }

        if (response.date) {
          transformed.residentDates[response.residentId] = response.date;
        }
      });

      // Transform database action plans to component format
      if (dbActionPlans) {
        transformed.actionPlans = dbActionPlans.map((plan: any) => ({
          id: plan._id,
          auditId: plan.auditResponseId,
          text: plan.description,
          assignedTo: plan.assignedToName || plan.assignedTo,
          dueDate: plan.dueDate ? new Date(plan.dueDate) : undefined,
          priority: plan.priority,
          status: plan.status,
          latestComment: plan.latestComment,
        }));
      }

      setAuditData(transformed);
    } else if (!isConvexId) {
      // Load from localStorage
      const completedAudits = localStorage.getItem('completed-audits');
      if (completedAudits) {
        const audits = JSON.parse(completedAudits);
        const foundAudit = audits.find((a: CompletedAudit) => a.id === auditId);
        if (foundAudit) {
          setAuditData(foundAudit);
        }
      }
    }
  }, [auditId, isConvexId, dbAudit, dbTemplate, dbActionPlans]);

  const getAnswer = (residentId: string, questionId: string) => {
    if (!auditData) return null;
    return auditData.answers.find(
      a => a.residentId === residentId && a.questionId === questionId
    );
  };

  const getComment = (residentId: string) => {
    if (!auditData) return "";
    return auditData.comments.find(c => c.residentId === residentId)?.text || "";
  };

  const getResidentDate = (residentId: string) => {
    if (!auditData?.residentDates) return null;
    return auditData.residentDates[residentId];
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Trigger browser's print dialog with "Save as PDF" option
    toast.info("Use your browser's print dialog to save as PDF", {
      description: "Select 'Save as PDF' as your printer destination",
      duration: 5000,
    });

    // Slight delay to let user see the toast before print dialog
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleDeleteActionPlan = async () => {
    if (!actionPlanToDelete) return;

    try {
      await deleteActionPlan({ actionPlanId: actionPlanToDelete });
      toast.success("Action plan deleted successfully");
      setDeleteDialogOpen(false);
      setActionPlanToDelete(null);
    } catch (error) {
      console.error("Failed to delete action plan:", error);
      toast.error("Failed to delete action plan. Please try again.");
    }
  };

  const openDeleteDialog = (planId: string) => {
    setActionPlanToDelete(planId as Id<"residentAuditActionPlans">);
    setDeleteDialogOpen(true);
  };

  if (!auditData) {
    return null; // Don't show anything while loading
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
          .print\\:hidden {
            display: none !important;
          }
          .shadow-lg {
            box-shadow: none !important;
          }
          .rounded-lg {
            border-radius: 0 !important;
          }
        }
      `}</style>
      <div className="fixed top-0 right-0 bottom-0 left-0 md:left-[var(--sidebar-width,16rem)] flex flex-col bg-muted/30 z-40">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-background border-b px-6 py-3 print:hidden shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Archived
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 overflow-auto">
        <div className="h-full p-6">
          {/* PDF Page */}
          <div className="bg-background overflow-hidden min-h-full">
            {/* Document Header */}
            <div className="border-b bg-muted/30 px-8 py-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">{auditData.name}</h1>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Completed
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Resident Audit Report
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">Completed Date</p>
                  <p className="text-muted-foreground">
                    {format(new Date(auditData.completedAt), "PPP")}
                  </p>
                  <p className="text-muted-foreground">
                    {format(new Date(auditData.completedAt), "p")}
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Data Table */}
            <div className="p-8">
              <h2 className="text-lg font-semibold mb-4">Audit Results</h2>
              <div className="border rounded-lg overflow-hidden">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/50">
                      <TableHead className="font-semibold w-[250px]">
                        Resident Name
                      </TableHead>
                      <TableHead className="font-semibold w-[100px]">
                        Room
                      </TableHead>
                      {auditData.questions.map(question => (
                        <TableHead key={question.id} className="font-semibold min-w-[200px]">
                          {question.text}
                        </TableHead>
                      ))}
                      <TableHead className="font-semibold w-[150px]">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold min-w-[300px]">
                        Comment
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
            {(dbResidents || []).map(resident => {
              const hasData = auditData.answers.some(a => a.residentId === resident._id) ||
                             getComment(resident._id) ||
                             getResidentDate(resident._id);

              // Only show residents that have audit data
              if (!hasData) return null;

              return (
                    <TableRow key={resident._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={resident.imageUrl} alt={`${resident.firstName} ${resident.lastName}`} />
                            <AvatarFallback>
                              {resident.firstName[0]}{resident.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{resident.firstName} {resident.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {resident.roomNumber || "-"}
                      </TableCell>
                      {auditData.questions.map(question => {
                        const answer = getAnswer(resident._id, question.id);
                        return (
                          <TableCell key={question.id}>
                            {answer?.value ? (
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  answer.value === "compliant" || answer.value === "yes" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                                  answer.value === "non-compliant" || answer.value === "no" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                  "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                                }`}
                              >
                                {answer.value === "compliant" ? "Compliant" :
                                 answer.value === "non-compliant" ? "Non-Compliant" :
                                 answer.value === "yes" ? "Yes" :
                                 answer.value === "no" ? "No" :
                                 "N/A"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-sm">
                        {getResidentDate(resident._id)
                          ? format(new Date(getResidentDate(resident._id)!), "MMM dd, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getComment(resident._id) || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Action Plans Section */}
            {auditData.actionPlans && auditData.actionPlans.length > 0 && (
              <div className="px-8 pb-8 space-y-4">
                <h2 className="text-lg font-semibold">Action Plans</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {auditData.actionPlans.map((plan: any) => {
                    // Get status badge color
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case "pending":
                          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
                        case "in_progress":
                          return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
                        case "completed":
                          return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
                        case "overdue":
                          return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                        default:
                          return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
                      }
                    };

                    const getStatusLabel = (status: string) => {
                      switch (status) {
                        case "pending":
                          return "Pending";
                        case "in_progress":
                          return "In Progress";
                        case "completed":
                          return "Completed";
                        default:
                          return status;
                      }
                    };

                    return (
                    <div
                      key={plan.id}
                      className="border rounded-lg p-4 space-y-3 bg-muted/30 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium flex-1">{plan.text}</p>
                        {isConvexId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity print:hidden shrink-0"
                            onClick={() => openDeleteDialog(plan.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Status Badge (if from database) */}
                        {plan.status && (
                          <Badge className={getStatusColor(plan.status)}>
                            {getStatusLabel(plan.status)}
                          </Badge>
                        )}
                        {plan.assignedTo && (
                          <Badge variant="secondary" className="text-xs">
                            {plan.assignedTo}
                          </Badge>
                        )}
                        {plan.dueDate && (
                          <Badge variant="secondary" className="text-xs">
                            {format(new Date(plan.dueDate), "MMM dd, yyyy")}
                          </Badge>
                        )}
                        {plan.priority && (
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              plan.priority === "High" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                              plan.priority === "Medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            }`}
                          >
                            {plan.priority}
                          </Badge>
                        )}
                      </div>
                      {/* Latest Comment */}
                      {plan.latestComment && (
                        <div className="text-xs text-muted-foreground italic border-l-2 pl-2 mt-2">
                          &quot;{plan.latestComment}&quot;
                        </div>
                      )}
                    </div>
                  )}
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t px-8 py-6 bg-muted/30">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>Generated by CareO Audit System</p>
                <p>Page 1 of 1</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this action plan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteActionPlan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
}
