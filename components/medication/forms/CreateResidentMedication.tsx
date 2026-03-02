"use client";

import CreateMedicationForm from "@/components/medication/forms/CreateMedicationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Plus, Pill, Droplet, Heart, Syringe } from "lucide-react";
import { useState } from "react";

type MedicationType = "Scheduled" | "PRN (As Needed)" | "Topical" | "Supplement";

const MEDICATION_OPTIONS = [
  {
    type: "Scheduled" as MedicationType,
    label: "Scheduled",
    description: "Regular medications with set times",
    icon: Pill,
    color: "bg-blue-100 text-blue-600",
  },
  {
    type: "PRN (As Needed)" as MedicationType,
    label: "PRN",
    description: "As needed medications",
    icon: Syringe,
    color: "bg-green-100 text-green-600",
  },
  {
    type: "Topical" as MedicationType,
    label: "Topical",
    description: "Creams, ointments, patches",
    icon: Droplet,
    color: "bg-purple-100 text-purple-600",
  },
  {
    type: "Supplement" as MedicationType,
    label: "Supplement",
    description: "Vitamins and supplements",
    icon: Heart,
    color: "bg-orange-100 text-orange-600",
  },
];

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
  const [selectedType, setSelectedType] = useState<MedicationType | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleTypeSelect = (type: MedicationType) => {
    setSelectedType(type);
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
    setSelectedType(null);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setShowForm(false);
    setSelectedType(null);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Medication
        </Button>
      </DialogTrigger>
      <DialogContent className={showForm ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-md sm:max-w-md"}>
        {!showForm ? (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle className="text-sm font-semibold">Select Medication Type</DialogTitle>
              <DialogDescription className="text-[10px]">
                {residentName ? `Add a new medication for ${residentName}` : "Choose the type of medication to add"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-1.5 max-h-[45vh] overflow-y-auto pr-1">
              {MEDICATION_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Card
                    key={option.type}
                    className="cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors border bg-white"
                    onClick={() => handleTypeSelect(option.type)}
                  >
                    <CardContent className="p-2.5">
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-md ${option.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs">{option.label}</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="h-8 w-8 p-0"
                >
                  ←
                </Button>
                <div>
                  <DialogTitle>Create Medication</DialogTitle>
                  {residentName && (
                    <DialogDescription>
                      Add a new {selectedType?.toLowerCase()} medication for {residentName}
                    </DialogDescription>
                  )}
                </div>
              </div>
            </DialogHeader>
            <CreateMedicationForm
              residentId={residentId}
              teamId={teamId}
              organizationId={organizationId}
              initialType={selectedType}
              onSuccess={() => {
                handleClose();
                window.location.reload();
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
