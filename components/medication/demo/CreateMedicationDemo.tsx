"use client";

import CreateMedicationForm from "@/components/medication/forms/CreateMedicationForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";

export default function CreateMedicationDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { profile } = useProfile();
  // Dummy residentId for demo purposes
  const dummyResidentId = "demo-resident-id";
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>Create Medication</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>DEMO Create Medication</DialogTitle>
        </DialogHeader>
        <CreateMedicationForm
          residentId={dummyResidentId}
          organizationId={profile?.active_organization_id ?? undefined}
          onSuccess={() => setDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
