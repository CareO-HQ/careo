"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { careFileAuditCompletionPath } from "@/lib/care-file-audit-routes";

/**
 * Legacy: `/carefileaudit/:responseId/view-single` → canonical
 * `/carefileaudit/completion/:completionId`.
 */
export default function LegacyCareFileAuditViewSingleRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as string;
  const responseId = params.auditId as string;

  useEffect(() => {
    if (!responseId) return;
    router.replace(
      careFileAuditCompletionPath(residentId, responseId) as Route
    );
  }, [residentId, responseId, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Redirecting…</p>
    </div>
  );
}
