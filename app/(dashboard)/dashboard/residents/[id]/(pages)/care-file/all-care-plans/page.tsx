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
import { ArrowLeft, Eye, FileText } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import CarePlanViewDialog from "@/components/residents/carefile/folders/CarePlanViewDialog";
import { supabase } from "@/lib/supabase";

export default function AllCarePlansPage() {
  const router = useRouter();
  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[3];
  const searchParams = useSearchParams();
  const version = searchParams.get("v");

  const [viewingCarePlan, setViewingCarePlan] = useState<{
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    isLatest: boolean;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [resident, setResident] = useState<any>(undefined);
  const [allCarePlans, setAllCarePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!residentId) return;

      try {
        // Fetch resident
        const { data: residentData } = await supabase
          .from('residents')
          .select('*')
          .eq('id', residentId)
          .single();
        setResident(residentData);

        // Fetch all care plans for resident
        const { data: carePlansData } = await supabase
          .from('care_plan_assessments')
          .select('*')
          .eq('resident_id', residentId)
          .order('created_at', { ascending: false });

        // Map to convex-like structure for compatibility
        const mappedCarePlans = (carePlansData || []).map(cp => ({
          ...cp,
          _id: cp.id,
          _creationTime: new Date(cp.created_at).getTime(),
          firstName: cp.first_name,
          lastName: cp.last_name,
          imageUrl: cp.image_url
        }));

        setAllCarePlans(mappedCarePlans);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [residentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading care plans...</p>
        </div>
      </div>
    );
  }

  if (!resident) {
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

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();

  const handleViewCarePlan = (carePlan: typeof allCarePlans[0]) => {
    setViewingCarePlan({
      formKey: "care-plan-form",
      formId: carePlan._id,
      name: carePlan.name_of_care_plan || "Care Plan",
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
          onClick={() => router.push(`/dashboard/residents/${residentId}/${version === 'v2' ? 'care-file-v2' : 'care-file'}`)}
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
            View all care plans for {resident.first_name} {resident.last_name}
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
              {allCarePlans.map((carePlan) => {
                const goals = carePlan.goals || {};
                const nameOfCarePlan = goals.nameOfCarePlan || carePlan.care_plan_type || "Care Plan";
                const carePlanNumber = goals.carePlanNumber || carePlan.care_plan_number || "N/A";
                const writtenBy = goals.writtenBy || carePlan.written_by || "N/A";
                const dateWritten = goals.dateWritten || carePlan.date_written;

                return (
                  <TableRow key={carePlan._id}>
                    <TableCell className="font-medium">
                      {nameOfCarePlan}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        {carePlan.care_plan_type || "General"}
                      </span>
                    </TableCell>
                    <TableCell>#{carePlanNumber}</TableCell>
                    <TableCell>{writtenBy}</TableCell>
                    <TableCell>
                      {dateWritten ? format(new Date(dateWritten), "dd MMM yyyy") : "N/A"}
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
                );
              })}
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
