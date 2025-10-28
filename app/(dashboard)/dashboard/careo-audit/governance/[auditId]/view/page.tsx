"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorBoundary, AuditErrorFallback } from "@/components/error-boundary";
import { useActiveTeam } from "@/hooks/use-active-team";

interface ArchivedAudit {
  id: string;
  templateName: string;
  completedAt: number;
  status: string;
  items?: any[];
  overallNotes?: string;
  auditedBy?: string;
}

function GovernanceAuditViewPageContent() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;
  const { activeOrganizationId } = useActiveTeam();

  const [archivedAudits, setArchivedAudits] = useState<ArchivedAudit[]>([]);
  const [templateId, setTemplateId] = useState<Id<"governanceAuditTemplates"> | null>(null);
  const [isCheckingId, setIsCheckingId] = useState(true);

  // Try to get templateId from responseId (in case old URL is used)
  const templateIdFromResponse = useQuery(
    api.governanceAuditResponses.getTemplateIdFromResponse,
    auditId && isCheckingId ? { possibleResponseId: auditId } : "skip"
  );

  // Determine if auditId is a templateId or responseId, and redirect if needed
  useEffect(() => {
    if (!isCheckingId) return;

    // If we got a templateId from the response query, it means auditId was a responseId
    if (templateIdFromResponse) {
      // Redirect to the correct URL with templateId
      router.replace(`/dashboard/careo-audit/governance/${templateIdFromResponse}/view`);
      setIsCheckingId(false);
    } else if (templateIdFromResponse === null) {
      // Query returned null, which means auditId is not a valid responseId
      // So it must be a templateId already
      setTemplateId(auditId as Id<"governanceAuditTemplates">);
      setIsCheckingId(false);
    }
  }, [templateIdFromResponse, auditId, router, isCheckingId]);

  // Fetch template to get the name
  const template = useQuery(
    api.governanceAuditTemplates.getTemplateById,
    templateId ? { templateId } : "skip"
  );

  // Load completed audits from database for this template
  const dbArchivedAudits = useQuery(
    api.governanceAuditResponses.getCompletedResponsesByTemplate,
    templateId && activeOrganizationId
      ? {
          templateId,
          organizationId: activeOrganizationId,
        }
      : "skip"
  );

  // Load all action plans for this template
  const allTemplateActionPlans = useQuery(
    api.governanceAuditActionPlans.getActionPlansByTemplate,
    templateId ? { templateId } : "skip"
  );

  useEffect(() => {
    if (dbArchivedAudits) {
      const formatted = dbArchivedAudits
        .filter((audit) => audit.status === "completed")
        .map((audit) => ({
          id: audit._id,
          templateName: audit.templateName,
          completedAt: audit.completedAt || audit.createdAt,
          status: audit.status,
          items: audit.items,
          overallNotes: audit.overallNotes,
          auditedBy: audit.auditedBy,
        }))
        .sort((a, b) => b.completedAt - a.completedAt);
      setArchivedAudits(formatted as any);
    }
  }, [dbArchivedAudits]);

  // Helper function to get action plans count for a specific audit response
  const getActionPlansCountForAudit = (auditResponseId: string): number => {
    if (!allTemplateActionPlans) return 0;

    return allTemplateActionPlans.filter(
      (plan: any) => plan.auditResponseId === auditResponseId
    ).length;
  };

  if (template === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Template not found</p>
        <Button onClick={() => router.push(`/dashboard/careo-audit?tab=governance`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Governance Audits
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/careo-audit?tab=governance`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Archived Audits</h1>
            <p className="text-sm text-muted-foreground">
              {template.name}
            </p>
          </div>
        </div>
        <Badge variant="secondary">
          {archivedAudits.length} Completed Audit{archivedAudits.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {archivedAudits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Archived Audits</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No completed audits found for &quot;{template.name}&quot;
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/careo-audit?tab=governance`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Audits
            </Button>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">
                Completion History
              </h2>
              <p className="text-sm text-muted-foreground">
                All completed versions of this audit, sorted by most recent
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/50">
                    <TableHead className="font-semibold w-[80px]">#</TableHead>
                    <TableHead className="font-semibold">Completed Date</TableHead>
                    <TableHead className="font-semibold">Time</TableHead>
                    <TableHead className="font-semibold">Audited By</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold">Action Plans</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedAudits.map((audit, index) => {
                    const completedDate = new Date(audit.completedAt);
                    const actionPlanCount = getActionPlansCountForAudit(audit.id);

                    return (
                      <TableRow key={audit.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          #{archivedAudits.length - index}
                        </TableCell>
                        <TableCell className="font-medium">
                          {format(completedDate, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(completedDate, "h:mm a")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {audit.auditedBy || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {audit.items?.length || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {actionPlanCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          >
                            Completed
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/dashboard/careo-audit/governance/${audit.id}/view-single`
                              )
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GovernanceAuditViewPage() {
  return (
    <ErrorBoundary fallback={<AuditErrorFallback context="view" />}>
      <GovernanceAuditViewPageContent />
    </ErrorBoundary>
  );
}
