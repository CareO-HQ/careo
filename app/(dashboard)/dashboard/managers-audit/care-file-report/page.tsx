"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Resident } from "@/types";
import { format } from "date-fns";

const getTodayDate = () => {
  return format(new Date(), "d MMM yyyy, HH:mm");
};

export default function CareFileReportPage() {
  const router = useRouter();
  const { activeTeamId, activeTeam } = useActiveTeam();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as Resident[] | undefined;

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/managers-audit?tab=care-file")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex flex-col mb-6">
        <p className="font-semibold text-xl">Care File Audit Report</p>
        <p className="text-sm text-muted-foreground">
          Comprehensive report for care file audits
        </p>
      </div>

      <div className="space-y-3">
        {residents?.map((resident) => {
          const name = `${resident.firstName} ${resident.lastName}`;

          return (
            <div
              key={resident._id}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/managers-audit/care-file/${resident._id}`)}
            >
              <FileText className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm">
                  {name} - Care File Audit.pdf
                  <span className="text-muted-foreground ml-2">Created: {getTodayDate()}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <Download className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}

        {(!residents || residents.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            {!activeTeamId ? "Please select a team" : "No residents found for this team"}
          </div>
        )}
      </div>
    </div>
  );
}
