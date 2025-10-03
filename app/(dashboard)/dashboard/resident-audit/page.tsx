"use client";

import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { Resident } from "@/types";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function CareOAuditPage() {
  const router = useRouter();
  const { activeTeamId, activeTeam } = useActiveTeam();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const residentsData = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as Resident[] | undefined;

  // Sort residents by room number
  const residents = residentsData?.sort((a, b) => {
    const roomA = a.roomNumber || "";
    const roomB = b.roomNumber || "";
    return roomA.localeCompare(roomB, undefined, { numeric: true });
  });

  // Get audit data from localStorage for a resident
  const getLocalStorageAuditData = (residentId: string) => {
    if (typeof window === 'undefined') return null;

    const savedData = localStorage.getItem(`resident-audit-${residentId}`);
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (error) {
        console.error("Failed to load audit data from localStorage:", error);
        return null;
      }
    }
    return null;
  };

  const handleViewAudit = (residentId: string) => {
    router.push(`/dashboard/resident-audit/${residentId}/audit`);
  };

  // Total number of audit items per resident (from audit page)
  const TOTAL_AUDIT_ITEMS = 16;

  // Get audit count for a specific resident (excluding not-applicable items)
  const getResidentAuditCount = (residentId: string) => {
    const localData = getLocalStorageAuditData(residentId);
    if (!localData || !localData.rowStatuses) return TOTAL_AUDIT_ITEMS;

    const statuses = Object.values(localData.rowStatuses);
    const naCount = statuses.filter((status: any) => status === "not-applicable").length;

    return TOTAL_AUDIT_ITEMS - naCount;
  };

  // Get overdue count for a specific resident
  const getOverdueCount = (residentId: string) => {
    const localData = getLocalStorageAuditData(residentId);
    if (!localData || !localData.rowStatuses) return 0;

    const statuses = Object.values(localData.rowStatuses);
    return statuses.filter((status: any) => status === "overdue").length;
  };

  // Get completed count
  const getCompletedCount = (residentId: string) => {
    const localData = getLocalStorageAuditData(residentId);
    if (!localData || !localData.rowStatuses) return 0;

    const statuses = Object.values(localData.rowStatuses);
    return statuses.filter((status: any) => status === "completed").length;
  };

  // Get due count based on non-completed status items
  const getDueCount = (residentId: string) => {
    const localData = getLocalStorageAuditData(residentId);
    if (!localData || !localData.rowStatuses) return 0;

    const statuses = Object.values(localData.rowStatuses);
    return statuses.filter((status: any) => {
      // Count items that are not completed and not Not Applicable
      return status !== "completed" && status !== "not-applicable";
    }).length;
  };

  return (
    <div className="w-full">
      <div className="flex flex-col mb-6">
        <p className="font-semibold text-xl">Resident Audit</p>
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
              <TableHead className="w-12">No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-32">Room</TableHead>
              <TableHead className="w-32">Total Audits</TableHead>
              <TableHead className="w-32">Completed</TableHead>
              <TableHead className="w-32">Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {residents.map((resident, index) => (
              <TableRow
                key={resident._id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleViewAudit(resident._id)}
              >
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarImage src={resident.imageUrl} alt={`${resident.firstName} ${resident.lastName}`} />
                      <AvatarFallback>
                        {resident.firstName[0]}{resident.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span>{resident.firstName} {resident.lastName}</span>
                  </div>
                </TableCell>
                <TableCell>{resident.roomNumber || "N/A"}</TableCell>
                <TableCell>{getResidentAuditCount(resident._id)}</TableCell>
                <TableCell>
                  {getCompletedCount(resident._id) > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs px-2 py-0.5 h-5 font-normal">
                      {getCompletedCount(resident._id)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {getDueCount(resident._id) > 0 && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 h-5 font-normal">
                      {getDueCount(resident._id)}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
