"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditDetail {
  id: string;
  item: string;
  status: string;
  notes: string;
  lastChecked: string;
}

export default function CareFileAuditViewPage() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as Id<"residents">;

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId: residentId });

  // Dummy audit data
  const auditInfo = {
    name: "Pre-Admission Assessment",
    auditor: "Sarah Johnson",
    dateCompleted: "15 Jan 2024",
    status: "completed",
    overallScore: "95%",
  };

  const [auditDetails] = useState<AuditDetail[]>([
    {
      id: "1",
      item: "Personal Information Form",
      status: "completed",
      notes: "All fields completed accurately",
      lastChecked: "15 Jan 2024",
    },
    {
      id: "2",
      item: "Medical History Documentation",
      status: "completed",
      notes: "Comprehensive medical history recorded",
      lastChecked: "15 Jan 2024",
    },
    {
      id: "3",
      item: "Medication List",
      status: "completed",
      notes: "Current medications verified with GP",
      lastChecked: "15 Jan 2024",
    },
    {
      id: "4",
      item: "Allergy Information",
      status: "completed",
      notes: "No known allergies documented",
      lastChecked: "15 Jan 2024",
    },
    {
      id: "5",
      item: "Emergency Contact Details",
      status: "completed",
      notes: "Primary and secondary contacts recorded",
      lastChecked: "15 Jan 2024",
    },
    {
      id: "6",
      item: "GP Contact Information",
      status: "completed",
      notes: "GP details verified and up to date",
      lastChecked: "15 Jan 2024",
    },
    {
      id: "7",
      item: "Consent Forms",
      status: "completed",
      notes: "All required consent forms signed",
      lastChecked: "15 Jan 2024",
    },
    {
      id: "8",
      item: "Financial Assessment",
      status: "completed",
      notes: "Financial arrangements documented",
      lastChecked: "15 Jan 2024",
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "missing":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (resident === undefined) {
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
        <Button onClick={() => router.push("/dashboard/careo-audit")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Audits
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
            onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={resident.imageUrl} alt={`${resident.firstName} ${resident.lastName}`} />
              <AvatarFallback>
                {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">
                {auditInfo.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {resident.firstName} {resident.lastName} - Room {resident.roomNumber || "N/A"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Audit Details Table */}
      <div className="flex-1 overflow-auto p-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-t">
              <TableHead className="w-12 border-r last:border-r-0">
                <input type="checkbox" className="rounded border-gray-300" />
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Item
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Status
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Notes
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Last Checked
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditDetails.map((detail) => (
              <TableRow key={detail.id} className="hover:bg-muted/50">
                <TableCell className="border-r last:border-r-0">
                  <input type="checkbox" className="rounded border-gray-300" checked={detail.status === "completed"} readOnly />
                </TableCell>
                <TableCell className="font-medium border-r last:border-r-0">
                  {detail.item}
                </TableCell>
                <TableCell className="border-r last:border-r-0">
                  <Badge variant="secondary" className={getStatusColor(detail.status)}>
                    {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground border-r last:border-r-0">
                  {detail.notes}
                </TableCell>
                <TableCell className="text-muted-foreground border-r last:border-r-0">
                  {detail.lastChecked}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Bottom border */}
        <div className="border-t"></div>
      </div>
    </div>
  );
}
