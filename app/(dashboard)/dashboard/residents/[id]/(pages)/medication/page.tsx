"use client";

import ShiftTimes from "@/components/medication/daily/ShiftTimes";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

type MedicationPageProps = {
  params: Promise<{ id: string }>;
};

export default function MedicationPage({ params }: MedicationPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const resident = useQuery(api.residents.getById, {
    residentId: (id as Id<"residents">) ?? "skip"
  }) as any;

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="mt-2 text-muted-foreground">Loading medications...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
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

  console.log(resident);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <p className="font-semibold text-xl">Medication</p>
        <p className="text-sm text-muted-foreground">
          Add and manage medications for the resident.
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-sm font-medium">
          Today&apos;s Schedule
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-2">
          <ShiftTimes
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
          />
        </div>
      </div>
    </div>
  );
}
