"use client";

import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { BubblesIcon, NotebookPen, NotebookPenIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  organizationId: string;
  createdAt: string;
  teamMembershipId: string;
  teamRole: string | undefined;
  addedToTeamAt: number;
  addedBy: string;
}

interface MedicationIntake {
  _id: string;
  scheduledTime: number;
  state: string;
  notes: string;
  resident: {
    imageUrl?: string;
    firstName: string;
    lastName: string;
    roomNumber?: string;
  } | null;
  medication: {
    _id: string;
    name: string;
    dosageForm: string;
    strength: string;
    strengthUnit: string;
  } | null;
}

export const createColumns = (
  members: TeamMember[] = []
): ColumnDef<MedicationIntake>[] => [
  {
    id: "resident",
    header: "Resident",
    cell: ({ row }) => {
      const resident = row.original.resident;

      if (!resident) {
        return (
          <div className="flex flex-col">
            <p className="font-medium text-muted-foreground">No resident</p>
          </div>
        );
      }

      return (
        <div className="flex flex-col">
          <p className="font-medium">
            {resident.firstName} {resident.lastName}
          </p>
          {/* <p className="text-xs text-muted-foreground">Room: {resident.roomNumber}</p> */}
        </div>
      );
    }
  },
  {
    accessorKey: "resident.roomNumber",
    header: "Room",
    cell: ({ row }) => {
      const resident = row.original.resident;
      return <p>{resident?.roomNumber || "N/A"}</p>;
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
      const medication = row.original.medication;

      if (!medication) {
        return (
          <div className="flex flex-col">
            <p className="font-medium text-muted-foreground">No medication</p>
          </div>
        );
      }

      const strength = medication.strength;
      const strengthUnit = medication.strengthUnit;
      const dosageForm = medication.dosageForm;

      return (
        <div className="flex flex-col">
          <p className="font-medium">{medication.name}</p>
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
      const markAsOut = () => {
        console.log("marked out intake", row.original._id);
        console.log("medication", row.original.medication?._id);
        // TODO: Show name of the user that marked it out and timestamp
        toast.success("Popped out");
      };
      return (
        // If popped out, show the name of the user that marked it out and timestamp
        <Button variant="outline" size="sm" onClick={markAsOut}>
          Popped Out
        </Button>
      );
    }
  },
  {
    id: "witness",
    header: "Witnessed By",
    cell: () => {
      return (
        <Select>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select witness" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.userId}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
  },
  {
    accessorKey: "state",
    header: "State",
    cell: () => {
      return (
        <Select>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="poppedOut">Option 1</SelectItem>
            <SelectItem value="notPoppedOut">Option 2</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
          </SelectContent>
        </Select>
      );
    }
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: () => {
      return (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <NotebookPenIcon className="w-4 h-4 " />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Notes</DialogTitle>
              <DialogDescription>
                Add notes for this medication intake
              </DialogDescription>
            </DialogHeader>
            <Textarea placeholder="Add notes" />
            <Button>Save</Button>
          </DialogContent>
        </Dialog>
      );
    }
  }
];
