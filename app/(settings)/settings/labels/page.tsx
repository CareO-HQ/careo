"use client";

import { DataTable } from "@/components/DataTable";
import { columns } from "@/components/settings/labels/columns";
import CreateLabelModal from "@/components/settings/labels/CreateLabelModal";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";

export default function LabelsPage() {
  const { data: member } = authClient.useActiveMember();
  const labels = useQuery(api.labels.getLabelsByOrganization, {
    organizationId: member?.organizationId
      ? (member?.organizationId as string)
      : "skip"
  });
  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <div className="flex flex-row justify-between items-center w-full">
        <p className="font-semibold text-xl">Labels</p>
        <CreateLabelModal />
      </div>
      <div className="flex flex-col justify-start items-start gap-4 w-full">
        <DataTable columns={columns} data={labels ?? []} />
      </div>
    </div>
  );
}
