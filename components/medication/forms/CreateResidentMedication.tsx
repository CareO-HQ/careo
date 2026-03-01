"use client";

import CreateMedicationForm from "@/components/medication/forms/CreateMedicationForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function CreateResidentMedication({
  residentId,
  residentName,
  teamId,
  organizationId
}: {
  residentId: string;
  residentName?: string;
  teamId?: string;
  organizationId?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Medication
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Medication</DialogTitle>
          {residentName && (
            <DialogDescription>
              Add a new medication, supplement, or vitamin for {residentName}
            </DialogDescription>
          )}
        </DialogHeader>
        <CreateMedicationForm
          residentId={residentId}
          teamId={teamId}
          organizationId={organizationId}
          onSuccess={() => setDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
