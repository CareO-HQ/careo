"use client";

import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";

interface MedicationIntake {
  _id: string;
  scheduledTime: string;
  state: string;
  resident: {
    imageUrl?: string;
    firstName: string;
    lastName: string;
    roomNumber: string;
  };
  medication: {
    _id: string;
    name: string;
    dosageForm: string;
    strength: string;
    strengthUnit: string;
  };
}

export const columns: ColumnDef<MedicationIntake>[] = [
  {
    id: "resident",
    header: "Resident",
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <p className="font-medium">
            {row.original.resident.firstName} {row.original.resident.lastName}
          </p>
          {/* <p className="text-xs text-muted-foreground">Room: {row.original.resident.roomNumber}</p> */}
        </div>
      );
    }
  },
  {
    accessorKey: "resident.roomNumber",
    header: "Room",
    cell: ({ row }) => {
      return <p>{row.original.resident.roomNumber}</p>;
    }
  },
  {
    accessorKey: "scheduledTime",
    header: "Time",
    cell: ({ row }) => {
      const date = new Date(row.original.scheduledTime);
      return <p>{formatInTimeZone(date, "UTC", "HH:mm")}</p>;
    }
  },
  {
    id: "medication",
    header: "Medication",
    cell: ({ row }) => {
      const strength = row.original.medication.strength;
      const strengthUnit = row.original.medication.strengthUnit;
      const dosageForm = row.original.medication.dosageForm;

      return (
        <div className="flex flex-col">
          <p className="font-medium">{row.original.medication.name}</p>
          <p className="text-xs text-muted-foreground">
            {strength} {strengthUnit} - {dosageForm}
          </p>
        </div>
      );
    }
  },
  {
    id: "poppedOut",
    header: "Popped Out",
    cell: ({ row }) => {
      const markedOut = () => {
        console.log("marked out intake", row.original._id);
        console.log("medication", row.original.medication._id);
        // TODO: Show name of the user that marked it out and timestamp
        toast.success("Popped out");
      };
      return (
        // If popped out, show the name of the user that marked it out and timestamp
        <Button variant="outline" size="sm" onClick={markedOut}>
          Popped Out
        </Button>
      );
    }
  },
  {
    id: "witness",
    header: "Witnessed By",
    cell: ({ row }) => {
      const allUsers = [];
      return (
        // If popped out, show the name of the user that marked it out and timestamp
        <Button variant="outline" size="sm" onClick={markedOut}>
          Popped Out
        </Button>
      );
    }
  }
];
