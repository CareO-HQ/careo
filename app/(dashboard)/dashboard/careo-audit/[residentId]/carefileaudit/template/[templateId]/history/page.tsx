"use client";

import { useState, useEffect } from "react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { auditService } from "@/lib/audit-service";
import {
  careFileAuditCompletionPath,
  careFileAuditHubPath,
  careFileAuditTemplateHistoryPath,
} from "@/lib/care-file-audit-routes";
import { Resident } from "@/types";
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

interface ArchivedAudit {
  id: string;
  templateName: string;
  completedAt: number;
  status: string;
  items?: unknown[];
  overallNotes?: string;
}

function CareFileAuditTemplateHistoryPageContent() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as string;
  const routeKey = params.templateId as string;
  const { supabase } = useSupabase();

  const [archivedAudits, setArchivedAudits] = useState<ArchivedAudit[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [resident, setResident] = useState<Resident | null | undefined>(undefined);
  const [template, setTemplate] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !residentId) {
      setResident(null);
      return;
    }

    const fetchResident = async () => {
      try {
        const { data, error } = await supabase
          .from("residents")
          .select("*")
          .eq("id", residentId)
          .single();

        if (error) throw error;
        setResident(data as Resident);
      } catch (error) {
        console.error("Error fetching resident:", error);
        setResident(null);
      }
    };

    void fetchResident();
  }, [supabase, residentId]);

  useEffect(() => {
    if (!routeKey || !supabase) return;

    const resolveRouteKey = async () => {
      try {
        const { data: completionData } = await supabase
          .from("audit_care_file_completions")
          .select("template_id")
          .eq("id", routeKey)
          .single();

        if (completionData?.template_id) {
          router.replace(
            careFileAuditTemplateHistoryPath(
              residentId,
              String(completionData.template_id)
            ) as Route
          );
          return;
        }

        const { data: templateData } = await supabase
          .from("audit_care_file_templates")
          .select("*")
          .eq("id", routeKey)
          .single();

        if (templateData) {
          setTemplateId(routeKey);
          setTemplate(templateData as Record<string, unknown>);
        } else {
          setTemplateId(null);
        }
      } catch (error) {
        console.error("Error resolving template route:", error);
        setTemplateId(null);
      } finally {
        setIsLoading(false);
      }
    };

    void resolveRouteKey();
  }, [routeKey, residentId, router, supabase]);

  useEffect(() => {
    if (!templateId || template) return;

    const fetchTemplate = async () => {
      try {
        const templateData = await auditService.getCareFileTemplateById(templateId);
        setTemplate(templateData as Record<string, unknown> | null);
      } catch (error) {
        console.error("Error fetching template:", error);
      }
    };

    void fetchTemplate();
  }, [templateId, template]);

  const [dbArchivedAudits, setDbArchivedAudits] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    if (!templateId || !residentId || !supabase) return;

    const fetchCompletions = async () => {
      try {
        const { data, error } = await supabase
          .from("audit_care_file_completions")
          .select("*")
          .eq("template_id", templateId)
          .eq("resident_id", residentId)
          .order("completed_at", { ascending: false });

        if (error) throw error;
        setDbArchivedAudits(data || []);
      } catch (error) {
        console.error("Error fetching completions:", error);
        setDbArchivedAudits([]);
      }
    };

    void fetchCompletions();
  }, [templateId, residentId, supabase]);

  const [allTemplateActionPlans, setAllTemplateActionPlans] = useState<
    Record<string, unknown>[]
  >([]);
  useEffect(() => {
    if (!templateId || !supabase) return;

    const fetchActionPlans = async () => {
      try {
        const { data: completions } = await supabase
          .from("audit_care_file_completions")
          .select("id")
          .eq("template_id", templateId);

        if (!completions || completions.length === 0) {
          setAllTemplateActionPlans([]);
          return;
        }

        const completionIds = completions.map((c) => c.id as string);
        const { data, error } = await supabase
          .from("audit_care_file_action_plans")
          .select("*")
          .in("audit_response_id", completionIds);

        if (error) throw error;
        setAllTemplateActionPlans(data || []);
      } catch (error) {
        console.error("Error fetching action plans:", error);
        setAllTemplateActionPlans([]);
      }
    };

    void fetchActionPlans();
  }, [templateId, supabase]);

  useEffect(() => {
    const formatted = dbArchivedAudits
      .filter((audit) => audit.status === "completed")
      .map((audit) => ({
        id: String(audit.id),
        templateName:
          (audit.template_name as string) ||
          (template?.name as string | undefined) ||
          "",
        completedAt: audit.completed_at
          ? new Date(String(audit.completed_at)).getTime()
          : new Date(String(audit.created_at)).getTime(),
        status: String(audit.status),
        items: audit.items as unknown[] | undefined,
        overallNotes: audit.overall_notes as string | undefined,
      }))
      .sort((a, b) => b.completedAt - a.completedAt);
    setArchivedAudits(formatted);
  }, [dbArchivedAudits, template]);

  const getActionPlansCountForAudit = (auditResponseId: string): number => {
    if (!allTemplateActionPlans.length) return 0;
    return allTemplateActionPlans.filter(
      (plan) => plan.audit_response_id === auditResponseId
    ).length;
  };

  const hubPath = careFileAuditHubPath(residentId);

  if (isLoading || resident === undefined || template === null) {
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
        <Button
          onClick={() =>
            router.push("/dashboard/careo-audit?tab=carefile" as Route)
          }
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Care File Audits
        </Button>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Template not found</p>
        <Button onClick={() => router.push(hubPath as Route)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Care File Audits
        </Button>
      </div>
    );
  }

  const templateName =
    (template.name as string | undefined) || "Care File Audit";

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(hubPath as Route)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Archived Audits</h1>
            <p className="text-sm text-muted-foreground">
              {templateName} - {resident?.first_name} {resident?.last_name}
            </p>
          </div>
        </div>
        <Badge variant="secondary">
          {archivedAudits.length} Completed Audit
          {archivedAudits.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {archivedAudits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Archived Audits</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No completed audits found for &quot;{templateName}&quot;
            </p>
            <Button variant="outline" onClick={() => router.push(hubPath as Route)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Audits
            </Button>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Completion History</h2>
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
                                careFileAuditCompletionPath(
                                  residentId,
                                  audit.id
                                ) as Route
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

export default function CareFileAuditTemplateHistoryPage() {
  return (
    <ErrorBoundary
      fallback={
        // @ts-expect-error - TypeScript incorrectly infers AuditErrorFallback as intrinsic element
        <AuditErrorFallback context="view" />
      }
    >
      <CareFileAuditTemplateHistoryPageContent />
    </ErrorBoundary>
  );
}
