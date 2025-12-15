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
import { ArrowLeft, Eye, FileText } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useState } from "react";
import CarePlanViewDialog from "@/components/residents/carefile/folders/CarePlanViewDialog";

export default function AllCarePlansPage() {
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

  // Fetch only the latest care plans from each folder
  const allCarePlans = useQuery(api.careFiles.carePlan.getLatestCarePlansForResident, {
    residentId: residentId as Id<"residents">
  });

  if (resident === undefined || allCarePlans === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading care plans...</p>
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

  const handleViewCarePlan = (carePlan: typeof allCarePlans[0]) => {
    setViewingCarePlan({
      formKey: "care-plan-form",
      formId: carePlan._id,
      name: carePlan.nameOfCarePlan || "Care Plan",
      completedAt: carePlan._creationTime,
      isLatest: true
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
          <h1 className="text-xl sm:text-2xl font-bold">All Care Plans</h1>
          <p className="text-muted-foreground text-sm">
            View all care plans for {resident.firstName} {resident.lastName}
          </p>
        </div>
      </div>

      {/* Care Plans Table */}
      <div className="rounded-lg border bg-card">
        {!allCarePlans || allCarePlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No Care Plans Found</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No care plans have been created for this resident yet. Care plans will appear here once they are created from the care file folders.
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
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCarePlans.map((carePlan) => (
                <TableRow key={carePlan._id}>
                  <TableCell className="font-medium">
                    {carePlan.nameOfCarePlan}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
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
