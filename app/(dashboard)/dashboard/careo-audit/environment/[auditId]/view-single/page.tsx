"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
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
import { ErrorBoundary, AuditErrorFallback } from "@/components/error-boundary";

interface ItemResponse {
  itemId: string;
  itemName: string;
  status?: "compliant" | "non-compliant" | "not-applicable" | "checked" | "unchecked";
  notes?: string;
  date?: string;
}

interface ActionPlan {
  id: string;
  auditId: string;
  text: string;
  assignedTo: string;
  dueDate: Date | undefined;
  priority: string;
  status?: "pending" | "in_progress" | "completed" | "overdue";
  latestComment?: string;
}

function EnvironmentAuditViewSinglePageContent() {
  const params = useParams();
  const router = useRouter();
  // auditId parameter actually contains the responseId for this page
  const responseId = params.auditId as Id<"environmentAuditCompletions">;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionPlanToDelete, setActionPlanToDelete] = useState<Id<"environmentAuditActionPlans"> | null>(null);

  // Load the completed response from database
  const dbResponse = useQuery(
    api.environmentAuditResponses.getResponseById,
    { responseId }
  );

  // Load action plans from database
  const dbActionPlans = useQuery(
    api.environmentAuditActionPlans.getActionPlansByAudit,
    { auditResponseId: responseId }
  );

  // Delete action plan mutation
  const deleteActionPlan = useMutation(api.environmentAuditActionPlans.deleteActionPlan);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
      case "checked":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "non-compliant":
      case "unchecked":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "not-applicable":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "compliant":
        return "Compliant";
      case "non-compliant":
        return "Non-Compliant";
      case "not-applicable":
        return "N/A";
      case "checked":
        return "Checked";
      case "unchecked":
        return "Unchecked";
      default:
        return status;
    }
  };

  const getActionPlanStatusColor = (status?: string) => {
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

  const getActionPlanStatusLabel = (status?: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "overdue":
        return "Overdue";
      default:
        return status || "Pending";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.info("Use your browser's print dialog to save as PDF", {
      description: "Select 'Save as PDF' as your printer destination",
      duration: 5000,
    });

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
    setActionPlanToDelete(planId as Id<"environmentAuditActionPlans">);
    setDeleteDialogOpen(true);
  };

  if (dbResponse === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!dbResponse) {
    return (
      <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/dashboard/careo-audit?tab=environment`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Audit Not Found</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Completed audit not found.</p>
        </div>
      </div>
    );
  }

  // Transform action plans from database format
  const actionPlans: ActionPlan[] = dbActionPlans
    ? dbActionPlans.map((plan: any) => ({
        id: plan._id,
        auditId: plan.auditResponseId,
        text: plan.description,
        assignedTo: plan.assignedToName || plan.assignedTo,
        dueDate: plan.dueDate ? new Date(plan.dueDate) : undefined,
        priority: plan.priority,
        status: plan.status,
        latestComment: plan.latestComment,
      }))
    : [];

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
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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
                      <div>
                        <h1 className="text-2xl font-bold">{dbResponse.templateName}</h1>
                        <p className="text-sm text-muted-foreground">
                          Environment Audit
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Completed
                    </Badge>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">Completed Date</p>
                    <p className="text-muted-foreground">
                      {format(new Date(dbResponse.completedAt || dbResponse.createdAt), "PPP")}
                    </p>
                    <p className="text-muted-foreground">
                      {format(new Date(dbResponse.completedAt || dbResponse.createdAt), "p")}
                    </p>
                    <p className="font-medium mt-2">Audited By</p>
                    <p className="text-muted-foreground">{dbResponse.auditedBy}</p>
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
                        <TableHead className="font-semibold min-w-[300px]">
                          Question
                        </TableHead>
                        <TableHead className="font-semibold w-[150px]">
                          Status
                        </TableHead>
                        <TableHead className="font-semibold w-[150px]">
                          Date
                        </TableHead>
                        <TableHead className="font-semibold min-w-[300px]">
                          Notes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dbResponse.items && dbResponse.items.length > 0 ? (
                        dbResponse.items.map((item: ItemResponse) => (
                          <TableRow key={item.itemId} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {item.itemName}
                            </TableCell>
                            <TableCell>
                              {item.status ? (
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${getStatusColor(item.status)}`}
                                >
                                  {getStatusLabel(item.status)}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.date ? format(new Date(item.date), "MMM dd, yyyy") : "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.notes || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No audit items recorded
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Overall Notes */}
                {dbResponse.overallNotes && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold mb-2">Overall Notes</h3>
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm">{dbResponse.overallNotes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Plans Section */}
              {actionPlans.length > 0 && (
                <div className="px-8 pb-8 space-y-4">
                  <h2 className="text-lg font-semibold">Action Plans</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {actionPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="border rounded-lg p-4 space-y-3 bg-muted/30 relative group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium flex-1">{plan.text}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity print:hidden shrink-0"
                            onClick={() => openDeleteDialog(plan.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {plan.status && (
                            <Badge className={getActionPlanStatusColor(plan.status)}>
                              {getActionPlanStatusLabel(plan.status)}
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
                                plan.priority === "High"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : plan.priority === "Medium"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              }`}
                            >
                              {plan.priority}
                            </Badge>
                          )}
                        </div>
                        {plan.latestComment && (
                          <div className="text-xs text-muted-foreground italic border-l-2 pl-2 mt-2">
                            &quot;{plan.latestComment}&quot;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            <AlertDialogAction onClick={handleDeleteActionPlan} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function EnvironmentAuditViewSinglePage() {
  return (
    <ErrorBoundary fallback={<AuditErrorFallback context="view-single" />}>
      <EnvironmentAuditViewSinglePageContent />
    </ErrorBoundary>
  );
}
