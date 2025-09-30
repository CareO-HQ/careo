"use client";

import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { Resident } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getAge } from "@/lib/utils";

export default function CareOAuditPage() {
  const router = useRouter();
  const { activeTeamId, activeTeam } = useActiveTeam();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as Resident[] | undefined;

  const handleViewAudit = (residentId: string) => {
    router.push(`/dashboard/residents/${residentId}/audit`);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col mb-6">
        <p className="font-semibold text-xl">CareO Audit</p>
        <p className="text-sm text-muted-foreground">
          Comprehensive audit management for {activeTeam?.name || "all residents"}
        </p>
      </div>

      {residents === undefined ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading residents...</p>
          </div>
        </div>
      ) : residents.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg font-semibold">No residents found</p>
            <p className="text-muted-foreground">
              No residents available in {activeTeam?.name || "this team"}
            </p>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-32">Room</TableHead>
              <TableHead className="w-24">Age</TableHead>
              <TableHead className="w-48">NHS Number</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {residents.map((resident, index) => (
              <TableRow key={resident._id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="font-medium">
                  {resident.firstName} {resident.lastName}
                </TableCell>
                <TableCell>{resident.roomNumber || "N/A"}</TableCell>
                <TableCell>{getAge(resident.dateOfBirth)}</TableCell>
                <TableCell>{resident.nhsHealthNumber || "N/A"}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAudit(resident._id)}
                  >
                    View Audit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
