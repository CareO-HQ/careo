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
import { NotebookPenIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface TeamMember {
  _id: string;
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
  _id: Id<"medicationIntake">;
  scheduledTime: number;
  state: string;
  notes?: string;
  poppedOutAt?: number;
  poppedOutByUserId?: Id<"users">;
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
    totalCount: number;
  } | null;
  witnessByUserId: Id<"users"> | null;
  witnessAt: number | null;
}

export const createColumns = (
  members: TeamMember[] = [],
  markMedicationIntakeAsPoppedOut?: (args: {
    medicationIntakeId: Id<"medicationIntake">;
  }) => Promise<boolean>,
  setWithnessForMedicationIntake?: (args: {
    medicationIntakeId: Id<"medicationIntake">;
    witnessByUserId: Id<"users">;
  }) => Promise<boolean>,
  updateMedicationIntakeStatus?: (args: {
    intakeId: Id<"medicationIntake">;
    state: string;
  }) => Promise<null>,
  saveMedicationIntakeComment?: (args: {
    intakeId: Id<"medicationIntake">;
    comment: string;
  }) => Promise<null>
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
        <div className="flex flex-row justify-start items-center gap-2">
          <Avatar>
            <AvatarImage src={resident.imageUrl} />
            <AvatarFallback>
              {resident.firstName.charAt(0)}
              {resident.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
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
      const poppedOutAt = row.original.poppedOutAt;

      const markAsOut = async () => {
        if (!markMedicationIntakeAsPoppedOut) {
          toast.error("Function not available");
          return;
        }

        try {
          const success = await markMedicationIntakeAsPoppedOut({
            medicationIntakeId: row.original._id
          });

          if (success) {
            toast.success("Medication popped out successfully");
          } else {
            toast.error("Failed to pop out medication");
          }
        } catch (error) {
          console.error("Error popping out medication:", error);
          toast.error(
            "Failed to pop out medication: " + (error as Error).message
          );
        }
      };

      if (poppedOutAt) {
        return (
          <Tooltip>
            <TooltipTrigger>
              <p className="font-medium text-primary text-sm">
                {formatInTimeZone(new Date(poppedOutAt), "UTC", "HH:mm")}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              {/* TODO: It would be nice to show the name of the user that marked it out */}
              <p>
                Popped out at{" "}
                {formatInTimeZone(new Date(poppedOutAt), "UTC", "HH:mm")}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      }

      return (
        // If popped out, show the name of the user that marked it out and timestamp
        <Button variant="outline" size="sm" onClick={markAsOut}>
          Popped Out
        </Button>
      );
    }
  },
  {
    id: "totalCount",
    header: "Total Count",
    cell: ({ row }) => {
      const medication = row.original.medication;
      return <p>{medication?.totalCount || "N/A"}</p>;
    }
  },
  {
    id: "witness",
    header: "Witnessed By",
    cell: ({ row }) => {
      const medicationIntake = row.original;

      const setWitness = async (value: string) => {
        if (!setWithnessForMedicationIntake) {
          toast.error("Function not available");
          return;
        }
        const success = await setWithnessForMedicationIntake({
          medicationIntakeId: medicationIntake._id,
          witnessByUserId: value as Id<"users">
        });
        if (success) {
          toast.success("Witness set successfully");
        } else {
          toast.error("Failed to set witness");
        }
      };
      return (
        <Select
          onValueChange={setWitness}
          value={medicationIntake.witnessByUserId || undefined}
        >
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select witness" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member, index) => (
              <SelectItem key={index} value={member.userId}>
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
    cell: ({ row }) => {
      const currentState = row.original.state;

      const handleStateChange = async (newState: string) => {
        if (!updateMedicationIntakeStatus) {
          toast.error("Update function not available");
          return;
        }

        try {
          await updateMedicationIntakeStatus({
            intakeId: row.original._id,
            state: newState
          });
          toast.success("State updated successfully");
        } catch (error) {
          console.error("Error updating state:", error);
          toast.error("Failed to update state: " + (error as Error).message);
        }
      };

      return (
        <Select onValueChange={handleStateChange} value={currentState}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="dispensed">Dispensed</SelectItem>
            <SelectItem value="administered">Administered</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="refused">Refused</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      );
    }
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const medicationIntake = row.original;

      const NotesDialog = () => {
        const [comment, setComment] = useState(medicationIntake.notes || "");
        const [isOpen, setIsOpen] = useState(false);

        const handleSave = async () => {
          if (!saveMedicationIntakeComment) {
            toast.error("Save function not available");
            return;
          }

          try {
            await saveMedicationIntakeComment({
              intakeId: medicationIntake._id,
              comment: comment
            });
            toast.success("Comment saved successfully");
            setIsOpen(false);
          } catch (error) {
            console.error("Error saving comment:", error);
            toast.error("Failed to save comment: " + (error as Error).message);
          }
        };

        return (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
              >
                <NotebookPenIcon className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Notes</DialogTitle>
                <DialogDescription>
                  Add notes for this medication intake
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Add notes"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button onClick={handleSave}>Save</Button>
            </DialogContent>
          </Dialog>
        );
      };

      return <NotesDialog />;
    }
  }
];
