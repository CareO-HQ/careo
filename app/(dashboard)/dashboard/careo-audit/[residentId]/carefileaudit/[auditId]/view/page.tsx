"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AuditDetailItem {
  id: string;
  itemName: string;
  status: string;
  reviewer: string | null;
  lastReviewed: string | null;
  notes: string | null;
  dateReviewed?: string;
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
  originalAuditId: string;
  residentId: string;
  name: string;
  category: string;
  completedAt: number;
  auditDetailItems: AuditDetailItem[];
  actionPlans: ActionPlan[];
  status: string;
}

export default function CareFileAuditViewPage() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as Id<"residents">;
  const auditId = params.auditId as string;

  const [latestAudit, setLatestAudit] = useState<CompletedAudit | null>(null);
  const [auditHistory, setAuditHistory] = useState<CompletedAudit[]>([]);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId: residentId });

  // Load audit data from localStorage
  useEffect(() => {
    const completedAudits = localStorage.getItem('completed-audits');
    if (!completedAudits) return;

    const allCompletedAudits: CompletedAudit[] = JSON.parse(completedAudits);

    // Filter audits for this specific audit and resident
    const matchingAudits = allCompletedAudits.filter(
      (audit) =>
        audit.residentId === residentId &&
        audit.originalAuditId === auditId &&
        audit.category === 'carefile'
    );

    // Sort by completion date (most recent first)
    const sortedAudits = matchingAudits.sort((a, b) => b.completedAt - a.completedAt);

    if (sortedAudits.length > 0) {
      setLatestAudit(sortedAudits[0]);
      // Get last 10 audits (excluding the latest which is already shown)
      setAuditHistory(sortedAudits.slice(1, 11));
    }
  }, [residentId, auditId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "non-compliant":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "n/a":
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
      case "n/a":
        return "N/A";
      default:
        return status;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Resident not found</p>
        <Button onClick={() => router.push("/dashboard/careo-audit")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Audits
        </Button>
      </div>
    );
  }

  if (!latestAudit) {
    return (
      <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">No Completed Audits</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No completed audits found for this care file item.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={resident.imageUrl} alt={`${resident.firstName} ${resident.lastName}`} />
              <AvatarFallback>
                {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">
                {latestAudit.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {resident.firstName} {resident.lastName} - Room {resident.roomNumber || "N/A"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Audit Info */}
        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed on</p>
              <p className="font-medium">
                {format(new Date(latestAudit.completedAt), "dd MMM yyyy 'at' HH:mm")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Completed
              </Badge>
            </div>
          </div>
        </div>

        {/* Audit Details Table */}
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Audit Details</h2>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="font-medium border-r last:border-r-0">
                  Question
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Status
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Date
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Comment
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestAudit.auditDetailItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium border-r last:border-r-0">
                    {item.itemName}
                  </TableCell>
                  <TableCell className="border-r last:border-r-0">
                    <Badge variant="secondary" className={`text-xs h-6 ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground border-r last:border-r-0">
                    {item.dateReviewed ? format(new Date(item.dateReviewed), "MMM dd, yyyy") : item.lastReviewed || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground border-r last:border-r-0">
                    {item.notes || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Action Plans */}
        {latestAudit.actionPlans && latestAudit.actionPlans.length > 0 && (
          <div className="px-6 pb-6">
            <h2 className="text-lg font-semibold mb-4">Action Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestAudit.actionPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="border rounded-lg p-4 space-y-3 bg-card"
                >
                  <p className="text-sm">{plan.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.assignedTo && (
                      <Badge variant="secondary" className="text-xs">
                        {plan.assignedTo}
                      </Badge>
                    )}
                    {plan.dueDate && (
                      <Badge variant="secondary" className="text-xs">
                        {format(plan.dueDate, "MMM dd, yyyy")}
                      </Badge>
                    )}
                    {plan.priority && (
                      <Badge
                        variant="secondary"
                        className="text-xs flex items-center gap-1"
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          plan.priority === "High" ? "bg-red-500" :
                          plan.priority === "Medium" ? "bg-yellow-500" :
                          "bg-green-500"
                        }`}></div>
                        {plan.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit History */}
        {auditHistory.length > 0 && (
          <div className="px-6 pb-6 print:hidden" data-audit-history>
            <h2 className="text-lg font-semibold mb-4">Audit History</h2>
            <Accordion type="single" collapsible className="w-full">
              {auditHistory.map((audit, index) => (
                <AccordionItem key={audit.id} value={`audit-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-medium">
                        Completed on {format(new Date(audit.completedAt), "dd MMM yyyy 'at' HH:mm")}
                      </span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Completed
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b">
                            <TableHead className="font-medium">Question</TableHead>
                            <TableHead className="font-medium">Status</TableHead>
                            <TableHead className="font-medium">Date</TableHead>
                            <TableHead className="font-medium">Comment</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {audit.auditDetailItems.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">{item.itemName}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={`text-xs h-6 ${getStatusColor(item.status)}`}>
                                  {getStatusLabel(item.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {item.dateReviewed ? format(new Date(item.dateReviewed), "MMM dd, yyyy") : item.lastReviewed || "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {item.notes || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Action Plans for this audit */}
                      {audit.actionPlans && audit.actionPlans.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-sm font-semibold mb-2">Action Plans</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {audit.actionPlans.map((plan) => (
                              <div
                                key={plan.id}
                                className="border rounded-lg p-3 space-y-2 bg-card"
                              >
                                <p className="text-xs">{plan.text}</p>
                                <div className="flex flex-wrap gap-1">
                                  {plan.assignedTo && (
                                    <Badge variant="secondary" className="text-xs h-5">
                                      {plan.assignedTo}
                                    </Badge>
                                  )}
                                  {plan.dueDate && (
                                    <Badge variant="secondary" className="text-xs h-5">
                                      {format(plan.dueDate, "MMM dd, yyyy")}
                                    </Badge>
                                  )}
                                  {plan.priority && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs h-5 flex items-center gap-1"
                                    >
                                      <div className={`w-1.5 h-1.5 rounded-full ${
                                        plan.priority === "High" ? "bg-red-500" :
                                        plan.priority === "Medium" ? "bg-yellow-500" :
                                        "bg-green-500"
                                      }`}></div>
                                      {plan.priority}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
}
