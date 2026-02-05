"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { auditService } from "@/lib/audit-service";

interface ArchivedAudit {
  id: string;
  templateName: string;
  completedAt: number;
  status: string;
  items?: any[];
  overallNotes?: string;
  auditedBy?: string;
}

function ClinicalAuditViewPageContent() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;
  const { activeOrganizationId } = useActiveTeam();

  const { supabase } = useSupabase();
  const [archivedAudits, setArchivedAudits] = useState<ArchivedAudit[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [template, setTemplate] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if auditId is a templateId or responseId
  useEffect(() => {
    if (!auditId || !supabase) return;

    const checkAuditId = async () => {
      try {
        // Try to fetch as completion (responseId)
        const { data: completionData } = await supabase
          .from("audit_clinical_completions")
          .select("template_id")
          .eq("id", auditId)
          .single();

        if (completionData) {
          // It's a responseId, redirect to templateId
          router.replace(`/dashboard/careo-audit/clinical/${completionData.template_id}/view`);
          return;
        }

        // Try to fetch as template
        const { data: templateData } = await supabase
          .from("audit_clinical_templates")
          .select("*")
          .eq("id", auditId)
          .single();

        if (templateData) {
          // It's a templateId
          setTemplateId(auditId);
          setTemplate(templateData);
        } else {
          setTemplateId(null);
        }
      } catch (error) {
        console.error("Error checking audit ID:", error);
        setTemplateId(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuditId();
  }, [auditId, router, supabase]);

  // Fetch template if not already loaded
  useEffect(() => {
    if (!templateId || template) return;

    const fetchTemplate = async () => {
      try {
        const templateData = await auditService.getClinicalTemplateById(templateId);
        setTemplate(templateData);
      } catch (error) {
        console.error("Error fetching template:", error);
      }
    };

    fetchTemplate();
  }, [templateId, template]);

  // Load completed audits from database for this template
  useEffect(() => {
    if (!templateId || !activeOrganizationId || !supabase) return;

    const fetchCompletions = async () => {
      try {
        const { data, error } = await supabase
          .from("audit_clinical_completions")
          .select("*")
          .eq("template_id", templateId)
          .eq("organization_id", activeOrganizationId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false });

        if (error) throw error;

        const formatted = (data || [])
          .map((audit) => ({
            id: audit.id,
            templateName: audit.template_name || template?.name || "",
            completedAt: audit.completed_at ? new Date(audit.completed_at).getTime() : new Date(audit.created_at).getTime(),
            status: audit.status,
            items: audit.items,
            overallNotes: audit.overall_notes,
            auditedBy: audit.audited_by_name || audit.audited_by,
          }))
          .sort((a, b) => b.completedAt - a.completedAt);
        
        setArchivedAudits(formatted);
      } catch (error) {
        console.error("Error fetching completions:", error);
        setArchivedAudits([]);
      }
    };

    fetchCompletions();
  }, [templateId, activeOrganizationId, supabase, template]);

  if (isLoading || template === null) {
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
        <Button onClick={() => router.push(`/dashboard/careo-audit?tab=clinical`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clinical Audits
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
            onClick={() => router.push(`/dashboard/careo-audit?tab=clinical`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Archived Audits</h1>
            <p className="text-sm text-muted-foreground">
              {template?.name || "Clinical Audit"}
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
              No completed audits found for &quot;{template?.name || "this template"}&quot;
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/careo-audit?tab=clinical`)}
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
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedAudits.map((audit, index) => {
                    const completedDate = new Date(audit.completedAt);

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
                                `/dashboard/careo-audit/clinical/${audit.id}/view-single`
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

export default function ClinicalAuditViewPage() {
  return (
    <ErrorBoundary 
      fallback={
        // @ts-expect-error - TypeScript incorrectly infers AuditErrorFallback as intrinsic element
        <AuditErrorFallback context="view" />
      }
    >
      <ClinicalAuditViewPageContent />
    </ErrorBoundary>
  );
}
