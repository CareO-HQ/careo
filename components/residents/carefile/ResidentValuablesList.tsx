"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Edit, Plus, Trash } from "lucide-react";
import { useResidentValuables } from "@/hooks/use-resident-valuables";
import ResidentValuables from "./dialogs/ResidentValuables";
import { Resident } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface ResidentValuablesListProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  resident: Resident;
}

export default function ResidentValuablesList({
  teamId,
  residentId,
  organizationId,
  userId,
  resident
}: ResidentValuablesListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(
    null
  );
  const [isEditMode, setIsEditMode] = useState(false);

  const { valuablesAssessments, isLoading, handleDeleteValuables } =
    useResidentValuables(residentId);

  const handleEdit = (assessment: any) => {
    setSelectedAssessment(assessment);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedAssessment(null);
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const handleDelete = (assessmentId: string) => {
    setAssessmentToDelete(assessmentId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (assessmentToDelete) {
      await handleDeleteValuables(assessmentToDelete);
      setIsDeleteDialogOpen(false);
      setAssessmentToDelete(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP"
    }).format(amount);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Resident Valuables</h2>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Valuables
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4">Loading...</div>
      ) : valuablesAssessments && valuablesAssessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {valuablesAssessments.map((assessment) => (
            <Card key={assessment._id} className="overflow-hidden">
              <CardHeader className="bg-muted">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      {format(new Date(assessment.date), "PPP")}
                    </CardTitle>
                    <CardDescription>
                      Completed by: {assessment.completedBy}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(assessment)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(assessment._id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Money</h3>
                    <p className="text-lg font-bold">
                      {formatCurrency(assessment.total)}
                    </p>
                  </div>

                  {assessment.valuables && assessment.valuables.length > 0 && (
                    <div>
                      <h3 className="font-medium">Valuables</h3>
                      <ul className="list-disc list-inside">
                        {assessment.valuables.map(
                          (item: string, index: number) => (
                            <li key={index} className="text-sm">
                              {item}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {assessment.clothing && assessment.clothing.length > 0 && (
                    <div>
                      <h3 className="font-medium">Clothing</h3>
                      <ul className="list-disc list-inside">
                        {assessment.clothing.map(
                          (item: string, index: number) => (
                            <li key={index} className="text-sm">
                              {item}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {assessment.other && assessment.other.length > 0 && (
                    <div>
                      <h3 className="font-medium">Other Items</h3>
                      <ul className="list-none space-y-2">
                        {assessment.other.map((item: any, index: number) => (
                          <li
                            key={index}
                            className="text-sm border-l-2 border-muted-foreground pl-2"
                          >
                            <p className="font-medium">{item.details}</p>
                            <p className="text-xs text-muted-foreground">
                              Received by {item.receivedBy} on{" "}
                              {format(new Date(item.date), "PPP")} at{" "}
                              {item.time}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground mb-4">
              No valuables assessments found
            </p>
            <Button onClick={handleAdd} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Valuables Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <ResidentValuables
            teamId={teamId}
            residentId={residentId}
            organizationId={organizationId}
            userId={userId}
            resident={resident}
            onClose={() => setIsDialogOpen(false)}
            initialData={selectedAssessment}
            isEditMode={isEditMode}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              resident valuables assessment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
