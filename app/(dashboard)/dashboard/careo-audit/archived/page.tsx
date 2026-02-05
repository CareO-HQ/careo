"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useActiveTeam } from "@/hooks/use-active-team";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { auditService } from "@/lib/audit-service";

interface ArchivedAudit {
  id: string;
  name: string;
  category: string;
  completedAt: number;
  status: string;
  questions?: any[];
  answers?: any[];
  actionPlans?: any[];
}

function ArchivedAuditsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auditName = searchParams.get("name") || "";
  const auditCategory = searchParams.get("category") || "resident";
  const templateId = searchParams.get("templateId") || "";

  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const { supabase } = useSupabase();
  const [archivedAudits, setArchivedAudits] = useState<ArchivedAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load completed audits from database
  useEffect(() => {
    if (!templateId || !supabase) {
      setIsLoading(false);
      return;
    }

    const fetchArchivedAudits = async () => {
      try {
        let data: any[] = [];
        
        if (auditCategory === "resident" && activeTeamId) {
          const { data: residentData, error } = await supabase
            .from("audit_resident_completions")
            .select("*")
            .eq("template_id", templateId)
            .eq("team_id", activeTeamId)
            .eq("status", "completed")
            .order("completed_at", { ascending: false });
          
          if (error) throw error;
          data = residentData || [];
        } else if (auditCategory === "governance" && activeOrganizationId) {
          const { data: governanceData, error } = await supabase
            .from("audit_governance_completions")
            .select("*")
            .eq("template_id", templateId)
            .eq("organization_id", activeOrganizationId)
            .eq("status", "completed")
            .order("completed_at", { ascending: false });
          
          if (error) throw error;
          data = governanceData || [];
        } else if (auditCategory === "clinical" && activeOrganizationId) {
          const { data: clinicalData, error } = await supabase
            .from("audit_clinical_completions")
            .select("*")
            .eq("template_id", templateId)
            .eq("organization_id", activeOrganizationId)
            .eq("status", "completed")
            .order("completed_at", { ascending: false });
          
          if (error) throw error;
          data = clinicalData || [];
        } else if (auditCategory === "environment" && activeOrganizationId) {
          const { data: environmentData, error } = await supabase
            .from("audit_environment_completions")
            .select("*")
            .eq("template_id", templateId)
            .eq("organization_id", activeOrganizationId)
            .eq("status", "completed")
            .order("completed_at", { ascending: false });
          
          if (error) throw error;
          data = environmentData || [];
        }

        const formatted = data.map((audit) => ({
          id: audit.id,
          name: audit.template_name || auditName,
          category: auditCategory,
          completedAt: audit.completed_at ? new Date(audit.completed_at).getTime() : new Date(audit.created_at).getTime(),
          status: audit.status,
          responses: audit.responses || audit.items,
        }));
        
        setArchivedAudits(formatted);
      } catch (error) {
        console.error("Error fetching archived audits:", error);
        setArchivedAudits([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchivedAudits();
  }, [templateId, auditCategory, activeTeamId, activeOrganizationId, supabase, auditName]);

  // Loading state handled in useEffect above
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }


  const loadArchivedAuditsFromLocalStorage = () => {
    const completedAudits = localStorage.getItem("completed-audits");
    if (completedAudits) {
      const audits = JSON.parse(completedAudits);
      const filtered = audits
        .filter(
          (a: any) =>
            a.name === auditName &&
            a.category === auditCategory &&
            a.status === "completed"
        )
        .sort((a: any, b: any) => b.completedAt - a.completedAt);
      setArchivedAudits(filtered);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/careo-audit?tab=${auditCategory}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Archived Audits</h1>
            <p className="text-sm text-muted-foreground">{auditName}</p>
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
              No completed audits found for &quot;{auditName}&quot;
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/careo-audit?tab=${auditCategory}`)}
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
                    <TableHead className="font-semibold">Questions</TableHead>
                    {auditCategory === "resident" && (
                      <TableHead className="font-semibold">Residents</TableHead>
                    )}
                    <TableHead className="font-semibold">Action Plans</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedAudits.map((audit, index) => {
                    const completedDate = new Date(audit.completedAt);
                    const residentCount = audit.answers
                      ? new Set(audit.answers.map((a: any) => a.residentId)).size
                      : 0;

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
                            {audit.questions?.length || 0}
                          </Badge>
                        </TableCell>
                        {auditCategory === "resident" && (
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {residentCount}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {audit.actionPlans?.length || 0}
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
                                `/dashboard/careo-audit/${auditCategory}/${audit.id}/view-single` as any
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

export default function ArchivedAuditsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <ArchivedAuditsContent />
    </Suspense>
  );
}
