"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { withRoleGuard } from "@/lib/route-guards";
import { ManagerAuditRecordDetailView } from "@/components/manager-audit/manager-audit-record-detail-view";

interface AuditRecordViewPageProps {
  params: Promise<{ auditId: string; recordId: string }>;
}

function AuditRecordViewPage({ params }: AuditRecordViewPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const auditId = resolvedParams.auditId;
  const recordId = resolvedParams.recordId;

  return (
    <ManagerAuditRecordDetailView
      auditId={auditId}
      recordId={recordId}
      onBack={() => router.push(`/dashboard/manager-audit/${auditId}/history`)}
    />
  );
}

export default withRoleGuard(AuditRecordViewPage, ["manager", "admin", "owner"]);
