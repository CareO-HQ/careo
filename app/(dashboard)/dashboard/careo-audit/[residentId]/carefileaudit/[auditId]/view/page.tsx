"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  careFileAuditHubPath,
  careFileAuditTemplateHistoryPath,
} from "@/lib/care-file-audit-routes";

/**
 * Legacy: `/carefileaudit/:auditId/view` → canonical
 * `/carefileaudit/template/:templateId/history`.
 */
export default function LegacyCareFileAuditViewRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as string;
  const auditId = params.auditId as string;
  const { supabase } = useSupabase();

  useEffect(() => {
    if (!auditId || !supabase) return;

    const run = async () => {
      const { data: completionData } = await supabase
        .from("audit_care_file_completions")
        .select("template_id")
        .eq("id", auditId)
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
        .select("id")
        .eq("id", auditId)
        .single();

      if (templateData) {
        router.replace(
          careFileAuditTemplateHistoryPath(residentId, auditId) as Route
        );
        return;
      }

      router.replace(careFileAuditHubPath(residentId) as Route);
    };

    void run();
  }, [auditId, residentId, router, supabase]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Redirecting…</p>
    </div>
  );
}
