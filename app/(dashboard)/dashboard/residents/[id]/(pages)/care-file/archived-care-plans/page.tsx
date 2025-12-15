"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft, Eye, FileText, Archive } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useState } from "react";
import CarePlanViewDialog from "@/components/residents/carefile/folders/CarePlanViewDialog";

export default function ArchivedCarePlansPage() {
  const router = useRouter();
  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[3] as Id<"residents">;

  const [viewingCarePlan, setViewingCarePlan] = useState<{
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    isLatest: boolean;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const resident = useQuery(api.residents.getById, {
    residentId: residentId as Id<"residents">
  });

  // Fetch archived care plans for this resident
  const archivedCarePlans = useQuery(api.careFiles.carePlan.getArchivedCarePlansForResident, {
    residentId: residentId as Id<"residents">
  });

  if (resident === undefined || archivedCarePlans === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading archived care plans...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  const handleViewCarePlan = (carePlan: typeof archivedCarePlans[0]) => {
    setViewingCarePlan({
      formKey: "care-plan-form",
      formId: carePlan._id,
      name: carePlan.nameOfCarePlan || "Care Plan",
      completedAt: carePlan._creationTime,
      isLatest: false
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${residentId}/care-file`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={resident.imageUrl} alt={fullName} className="border" />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-600" />
            <h1 className="text-xl sm:text-2xl font-bold">Archived Care Plans</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            View previous versions of care plans for {resident.firstName} {resident.lastName}
          </p>
        </div>
      </div>

      {/* Archived Care Plans Table */}
      <div className="rounded-lg border bg-card">
        {!archivedCarePlans || archivedCarePlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Archive className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No Archived Care Plans</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No archived care plans found. When a care plan is updated, the previous version will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Care Plan Name</TableHead>
                <TableHead>Folder</TableHead>
                <TableHead>Care Plan Number</TableHead>
                <TableHead>Written By</TableHead>
                <TableHead>Date Written</TableHead>
                <TableHead>Archived At</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedCarePlans.map((carePlan) => (
                <TableRow key={carePlan._id} className="bg-muted/20">
                  <TableCell className="font-medium">
                    {carePlan.nameOfCarePlan}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                      {carePlan.folderKey || "General"}
                    </span>
                  </TableCell>
                  <TableCell>#{carePlan.carePlanNumber}</TableCell>
                  <TableCell>{carePlan.writtenBy}</TableCell>
                  <TableCell>
                    {format(new Date(carePlan.dateWritten), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(carePlan._creationTime), "dd MMM yyyy, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                      Archived
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewCarePlan(carePlan)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Care Plan View Dialog */}
      {viewingCarePlan && (
        <CarePlanViewDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          carePlan={viewingCarePlan}
        />
      )}
    </div>
  );
}
