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
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface TeamMember {
  id?: string;
  userId: string;
  email?: string;
  name: string;
  image?: string | null;
  role?: string;
  organizationId?: string;
  createdAt?: string;
  teamMembershipId?: string;
  teamRole?: string | undefined;
  addedToTeamAt?: number;
  addedBy?: string;
}

interface MedicationIntake {
  id: string;
  scheduled_time: string;
  status: string; // Corresponds to 'state' in the column definition
  comment?: string;
  popped_out_at?: string;
  popped_out_by_id?: string;
  resident?: {
    image_url?: string;
    first_name?: string;
    last_name?: string;
    room_number?: string;
  } | null;
  medication?: {
    id: string;
    name: string;
    dosage_form: string;
    strength: string;
    strength_unit: string;
    total_count: number;
  } | null;
  witness_id?: string | null;
  witness_at?: string | null;
}

export const createColumns = (
  members: TeamMember[] = [],
  markMedicationIntakeAsPoppedOut?: (intakeId: string, isPoppedOut: boolean) => Promise<void>,
  setWithnessForMedicationIntake?: (intakeId: string, witnessId: string | null) => Promise<void>,
  updateMedicationIntakeStatus?: (args: {
    intakeId: string;
    state:
    | "scheduled"
    | "dispensed"
    | "administered"
    | "missed"
    | "refused"
    | "skipped";
  }) => Promise<void | null>,
  saveMedicationIntakeComment?: (intakeId: string, comment: string) => Promise<void>,
  currentUser?: { name: string; userId: string },
  isRoundCompleted?: boolean
): ColumnDef<MedicationIntake>[] => [
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
        const strengthUnit = medication.strength_unit;
        const dosageForm = medication.dosage_form;

        return (
          <div className={`flex flex-col ${isRoundCompleted ? 'opacity-60' : ''}`}>
            <p className="font-medium">{medication.name}</p>
            <p className="text-xs text-muted-foreground">
              {strength} {strengthUnit} - {dosageForm}
            </p>
            {isRoundCompleted && (
              <p className="text-xs text-gray-500 italic mt-0.5">🔒 Locked</p>
            )}
          </div>
        );
      }
    },
    {
      id: "poppedOut",
      header: "Popped Out",
      cell: ({ row }) => {
        const poppedOutAt = row.original.popped_out_at;

        const markAsOut = async () => {
          if (!markMedicationIntakeAsPoppedOut) {
            toast.error("Function not available");
            return;
          }

          try {
            await markMedicationIntakeAsPoppedOut(row.original.id, true);
            toast.success("Medication popped out successfully");
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
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="font-medium text-green-700 text-sm">
                    {formatInTimeZone(new Date(poppedOutAt), "UTC", "HH:mm")}
                  </p>
                </div>
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
          <Button
            variant="outline"
            size="sm"
            onClick={markAsOut}
            className={`${isRoundCompleted ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-50'}`}
            disabled={isRoundCompleted}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span>Pop Out</span>
            </div>
          </Button>
        );
      }
    },
    {
      id: "totalCount",
      header: "Total Count",
      cell: ({ row }) => {
        const medication = row.original.medication;
        return <p>{medication?.total_count || "N/A"}</p>;
      }
    },
    {
      id: "dispensedBy",
      header: "Dispensed by",
      cell: () => {
        return (
          <Select disabled value={currentUser?.userId || ""}>
            <SelectTrigger className={`w-[180px] ${isRoundCompleted ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
              <SelectValue placeholder={currentUser?.name || "N/A"} />
            </SelectTrigger>
            <SelectContent>
              {currentUser && (
                <SelectItem value={currentUser.userId}>
                  {currentUser.name}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        );
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
          try {
            await setWithnessForMedicationIntake(medicationIntake.id, value);
            toast.success("Witness set successfully");
          } catch (error) {
            toast.error("Failed to set witness");
          }
        };
        return (
          <Select
            onValueChange={setWitness}
            value={medicationIntake.witness_id || undefined}
            disabled={isRoundCompleted}
          >
            <SelectTrigger className={`w-[180px] ${isRoundCompleted ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-white'}`}>
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
        const currentState = row.original.status;

        const handleStateChange = async (
          newState:
            | "given"
            | "refused"
        ) => {
          if (!updateMedicationIntakeStatus) {
            toast.error("Update function not available");
            return;
          }

          try {
            // Map "given" to "administered" for the mutation
            const mappedState = newState === "given" ? "administered" : newState;
            await updateMedicationIntakeStatus({
              intakeId: row.original.id,
              state: mappedState as "scheduled" | "dispensed" | "administered" | "refused" | "missed" | "skipped"
            });
            toast.success("State updated successfully");
          } catch (error) {
            console.error("Error updating state:", error);
            toast.error("Failed to update state: " + (error as Error).message);
          }
        };

        // Get color based on state
        const getStateColor = (state: string) => {
          switch (state) {
            case "given":
              return "bg-green-100 border-green-300 text-green-800 hover:bg-green-200";
            case "refused":
              return "bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200";
            case "missed":
              return "bg-red-100 border-red-300 text-red-800 hover:bg-red-200";
            case "scheduled":
              return "bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200";
            default:
              return "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200";
          }
        };

        const getStateDot = (state: string) => {
          switch (state) {
            case "given":
              return "bg-green-500";
            case "refused":
              return "bg-orange-500";
            case "missed":
              return "bg-red-500";
            case "scheduled":
              return "bg-blue-500";
            default:
              return "bg-gray-500";
          }
        };

        return (
          <Select
            onValueChange={handleStateChange}
            value={currentState}
            disabled={isRoundCompleted}
          >
            <SelectTrigger className={`w-[180px] ${getStateColor(currentState)} ${isRoundCompleted ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStateDot(currentState)}`} />
                <SelectValue placeholder="Select state" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="given">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Given</span>
                </div>
              </SelectItem>
              <SelectItem value="refused">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Refused</span>
                </div>
              </SelectItem>
              <SelectItem value="missed">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Missed</span>
                </div>
              </SelectItem>
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
          const [comment, setComment] = useState(medicationIntake.comment || "");
          const [isOpen, setIsOpen] = useState(false);

          const handleSave = async () => {
            if (!saveMedicationIntakeComment) {
              toast.error("Save function not available");
              return;
            }

            try {
              await saveMedicationIntakeComment(medicationIntake.id, comment);
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
                  className={`text-muted-foreground ${isRoundCompleted ? 'opacity-60 cursor-not-allowed' : 'hover:text-primary'}`}
                  disabled={isRoundCompleted}
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
    },



  ];
