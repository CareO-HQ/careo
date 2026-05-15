"use client";

import { useState, useEffect } from "react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { auditService } from "@/lib/audit-service";
import {
  careFileAuditHubPath,
  careFileAuditTemplateHistoryPath,
} from "@/lib/care-file-audit-routes";
import { Resident } from "@/types";
import { ArrowLeft } from "lucide-react";
import { ErrorBoundary, AuditErrorFallback } from "@/components/error-boundary";
import { CareFileAuditHistoryView } from "@/components/careo-audit/care-file-audit-history-view";
import type { CareFileTemplateItem } from "@/lib/manager-care-file-audit-history";
import { parseCareFileTemplateItemsFromApi } from "@/lib/care-file-audit";

function resolveCareFileAuditCompletionBackHref(
  residentId: string,
  response: { template_id?: string | null } | null
): string {
  const tid =
    typeof response?.template_id === "string"
      ? response.template_id.trim()
      : "";
  if (tid) return careFileAuditTemplateHistoryPath(residentId, tid);
  return careFileAuditHubPath(residentId);
}

function CareFileAuditCompletionPageContent() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as string;
  const completionId = params.completionId as string;
  const { supabase } = useSupabase();

  const [resident, setResident] = useState<Resident | null | undefined>(
    undefined
  );
  const [dbResponse, setDbResponse] = useState<Record<string, unknown> | null>(
    null
  );
  const [dbActionPlans, setDbActionPlans] = useState<Record<string, unknown>[]>(
    []
  );
  const [templateItems, setTemplateItems] = useState<CareFileTemplateItem[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !residentId) {
      setResident(null);
      return;
    }
    supabase
      .from("residents")
      .select("*")
      .eq("id", residentId)
      .single()
      .then(({ data, error }) => {
        if (error) setResident(null);
        else setResident(data as Resident);
      });
  }, [supabase, residentId]);

  useEffect(() => {
    if (!completionId) return;
    const load = async () => {
      try {
        const response = await auditService.getCareFileResponseById(completionId);
        setDbResponse(response as Record<string, unknown> | null);

        if (response?.template_id) {
          const tmpl = await auditService.getCareFileTemplateById(
            response.template_id
          );
          const parsed = parseCareFileTemplateItemsFromApi(
            tmpl as Record<string, unknown> | null | undefined
          );
          if (parsed && parsed.length > 0) {
            setTemplateItems(parsed as CareFileTemplateItem[]);
          } else {
            setTemplateItems(null);
          }
        } else {
          setTemplateItems(null);
        }

        const plans = await auditService.getCareFileActionPlans(completionId);
        setDbActionPlans((plans || []) as Record<string, unknown>[]);
      } catch (error) {
        console.error("Error fetching audit data:", error);
        setDbResponse(null);
        setDbActionPlans([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [completionId]);

  if (resident === undefined || isLoading) {
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

  if (!dbResponse) {
    const hubHref = careFileAuditHubPath(residentId);
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Completed audit not found.</p>
        <Button variant="outline" onClick={() => router.push(hubHref as Route)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const backHref = resolveCareFileAuditCompletionBackHref(residentId, dbResponse);

  return (
    <CareFileAuditHistoryView
      resident={resident}
      dbResponse={dbResponse}
      dbActionPlans={dbActionPlans}
      templateItems={templateItems}
      onBack={() => router.push(backHref as Route)}
    />
  );
}

export default function CareFileAuditCompletionPage() {
  return (
    <ErrorBoundary
      fallback={
        // @ts-expect-error - TypeScript incorrectly infers AuditErrorFallback as intrinsic element
        <AuditErrorFallback context="view" />
      }
    >
      <CareFileAuditCompletionPageContent />
    </ErrorBoundary>
  );
}
