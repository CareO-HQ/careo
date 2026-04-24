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
import { NotebookPenIcon, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  quantity?: number;
}

const PreparedCell = ({ 
  row, 
  markMedicationIntakeAsPoppedOut, 
  isRoundCompleted 
}: { 
  row: any, 
  markMedicationIntakeAsPoppedOut?: (intakeId: string, isPoppedOut: boolean) => Promise<void>, 
  isRoundCompleted?: boolean 
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const poppedOutAt = row.original.popped_out_at;
  const quantity = row.original.quantity || 1;
  const medication = row.original.medication;

  const markAsOut = async () => {
    if (!markMedicationIntakeAsPoppedOut) {
      toast.error("Function not available");
      return;
    }

    try {
      await markMedicationIntakeAsPoppedOut(row.original.id, true);
      toast.success("Medication prepared successfully");
    } catch (error) {
      console.error("Error preparing medication:", error);
      toast.error(
        "Failed to prepare medication: " + (error as Error).message
      );
    }
  };

  const handlePrepareClick = () => {
    if (!medication) {
      markAsOut();
      return;
    }

    // Determine if it's a mL measurement
    const dosageForm = medication.dosage_form?.toLowerCase() || '';
    const dosageUnit = (medication.frequency || "").toLowerCase();
    
    const isMLMeasurement = 
      dosageForm.includes('liquid') || 
      dosageForm.includes('syrup') || 
      dosageForm.includes('injection') ||
      dosageUnit.includes('ml') ||
      dosageUnit.includes('injection');

    if (quantity > 1 && !isMLMeasurement) {
      setIsConfirmOpen(true);
    } else {
      markAsOut();
    }
  };

  if (poppedOutAt) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs text-muted-foreground">
          {formatInTimeZone(new Date(poppedOutAt), "UTC", "HH:mm")}
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handlePrepareClick}
        className={`flex items-center justify-center ${isRoundCompleted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        disabled={isRoundCompleted}
      >
        <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 hover:border-green-400 transition-colors" />
      </button>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Preparation</AlertDialogTitle>
            <AlertDialogDescription>
              Have you prepared {quantity}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={markAsOut}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

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
    | "taken"
    | "refused"
    | "hospitalised"
    | "social_leave"
    | "refused_destroyed"
    | "not_required"
    | "made_available"
    | "missed"
    | "skipped";
  }) => Promise<void | null>,
  saveMedicationIntakeComment?: (intakeId: string, comment: string) => Promise<void>,
  currentUser?: { name: string; userId: string },
  isRoundCompleted?: boolean
): ColumnDef<any>[] => [
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
      id: "quantity",
      header: "Dose",
      cell: ({ row }) => {
        const quantity = row.original.quantity || 1;
        const medication = row.original.medication;

        if (!medication) return <p className="font-medium text-center">{quantity}</p>;

        // Get unit label based on dosage form or frequency field (for PRN/Supplements)
        const getUnitLabel = () => {
          // For PRN and Supplements, check frequency field (stores dosage unit)
          if (medication.schedule_type === "PRN (As Needed)" || medication.schedule_type === "Supplement") {
            const dosageUnit = medication.frequency || "";

            if (dosageUnit.includes('mL')) return 'mL';
            if (dosageUnit.includes('Drops')) return quantity === 1 ? 'drop' : 'drops';
            if (dosageUnit.includes('Puffs')) return quantity === 1 ? 'puff' : 'puffs';
            if (dosageUnit.includes('Applications')) return quantity === 1 ? 'application' : 'applications';
            if (dosageUnit.includes('Sprays')) return quantity === 1 ? 'spray' : 'sprays';
            if (dosageUnit.includes('Patches')) return quantity === 1 ? 'patch' : 'patches';
            if (dosageUnit.includes('Injections')) return 'mL';
            if (dosageUnit.includes('Tablets')) return quantity === 1 ? 'tablet' : 'tablets';
          }

          // For scheduled medications, determine from dosage form
          const dosageForm = medication.dosage_form?.toLowerCase() || '';

          if (dosageForm.includes('liquid') || dosageForm.includes('syrup')) {
            return 'mL';
          } else if (dosageForm.includes('drops')) {
            return quantity === 1 ? 'drop' : 'drops';
          } else if (dosageForm.includes('inhaler') || dosageForm.includes('spray')) {
            return quantity === 1 ? 'puff' : 'puffs';
          } else if (dosageForm.includes('sachet') || dosageForm.includes('powder')) {
            return quantity === 1 ? 'sachet' : 'sachets';
          } else if (dosageForm.includes('cream') || dosageForm.includes('ointment') || dosageForm.includes('gel')) {
            return quantity === 1 ? 'application' : 'applications';
          } else if (dosageForm.includes('patch')) {
            return quantity === 1 ? 'patch' : 'patches';
          } else if (dosageForm.includes('injection')) {
            return 'mL';
          } else if (dosageForm.includes('tablet')) {
            return quantity === 1 ? 'tablet' : 'tablets';
          } else if (dosageForm.includes('capsule')) {
            return quantity === 1 ? 'capsule' : 'capsules';
          } else if (dosageForm.includes('softgel')) {
            return quantity === 1 ? 'softgel' : 'softgels';
          } else if (dosageForm.includes('gummy')) {
            return quantity === 1 ? 'gummy' : 'gummies';
          }

          return '';
        };

        const unit = getUnitLabel();

        return (
          <div className="font-medium text-center">
            <p className="text-sm">{quantity} {unit}</p>
          </div>
        );
      }
    },
    {
      id: "poppedOut",
      header: "Prepared",
      cell: ({ row }) => (
        <PreparedCell 
          row={row} 
          markMedicationIntakeAsPoppedOut={markMedicationIntakeAsPoppedOut}
          isRoundCompleted={isRoundCompleted}
        />
      )
    },
    {
      id: "totalCount",
      header: "Total Count",
      cell: ({ row }) => {
        const medication = row.original.medication;
        const totalCount = medication?.total_count;

        if (!totalCount) return <p className="text-muted-foreground">N/A</p>;

        // Get unit label based on dosage form or frequency field
        const getUnitLabel = () => {
          // For PRN and Supplements, check frequency field (stores dosage unit)
          if (medication.schedule_type === "PRN (As Needed)" || medication.schedule_type === "Supplement") {
            const dosageUnit = medication.frequency || "";

            if (dosageUnit.includes('mL')) return 'mL';
            if (dosageUnit.includes('Drops')) return 'drops';
            if (dosageUnit.includes('Puffs')) return 'puffs';
            if (dosageUnit.includes('Patches')) return totalCount === 1 ? 'patch' : 'patches';
            if (dosageUnit.includes('Injections')) return 'mL';
            if (dosageUnit.includes('Tablets')) return totalCount === 1 ? 'tablet' : 'tablets';
          }

          // For scheduled medications, determine from dosage form
          const dosageForm = medication.dosage_form?.toLowerCase() || '';

          if (dosageForm.includes('liquid') || dosageForm.includes('syrup')) {
            return 'mL';
          } else if (dosageForm.includes('drops')) {
            return 'mL';
          } else if (dosageForm.includes('inhaler')) {
            return 'puffs';
          } else if (dosageForm.includes('spray')) {
            return totalCount === 1 ? 'spray' : 'sprays';
          } else if (dosageForm.includes('injection')) {
            return 'mL';
          } else if (dosageForm.includes('sachet') || dosageForm.includes('powder')) {
            return totalCount === 1 ? 'sachet' : 'sachets';
          } else if (dosageForm.includes('patch')) {
            return totalCount === 1 ? 'patch' : 'patches';
          } else if (dosageForm.includes('tablet')) {
            return totalCount === 1 ? 'tablet' : 'tablets';
          } else if (dosageForm.includes('capsule')) {
            return totalCount === 1 ? 'capsule' : 'capsules';
          } else if (dosageForm.includes('softgel')) {
            return totalCount === 1 ? 'softgel' : 'softgels';
          } else if (dosageForm.includes('gummy')) {
            return totalCount === 1 ? 'gummy' : 'gummies';
          }

          return '';
        };

        const unit = getUnitLabel();

        return <p className="text-sm">{totalCount} {unit}</p>;
      }
    },
    {
      id: "dispensedBy",
      header: "Dispensed by",
      cell: () => {
        return (
          <div className="text-sm">
            {currentUser?.name || "N/A"}
          </div>
        );
      }
    },
    {
      id: "witness",
      header: "Witnessed By",
      cell: ({ row }) => {
        const medicationIntake = row.original;
        const witnessName = members.find(m => m.userId === medicationIntake.witness_id)?.name;

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
            <SelectTrigger className={`border-none shadow-none hover:bg-slate-50 ${isRoundCompleted ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <SelectValue placeholder="Select witness">
                {witnessName && <span className="text-sm">{witnessName}</span>}
              </SelectValue>
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
      header: "Status",
      cell: ({ row }) => {
        const currentState = row.original.status;
        const medicationIntake = row.original;

        const handleStatusChange = async (
          newStatus:
            | "taken"
            | "refused"
            | "hospitalised"
            | "social_leave"
            | "refused_destroyed"
            | "not_required"
            | "made_available"
        ) => {
          if (!updateMedicationIntakeStatus) {
            toast.error("Update function not available");
            return;
          }

          // Check if medication is prepared before marking as given
          // Check if medication is prepared before marking as taken
          if (newStatus === "taken" && !medicationIntake.popped_out_at) {
            toast.error("Please prepare the medication first");
            return;
          }
    
          // Check if witness is selected when marking as taken
          if (newStatus === "taken" && !medicationIntake.witness_id) {
            toast.error("Please select a witness before marking as taken");
            return;
          }

          try {
            await updateMedicationIntakeStatus({
              intakeId: row.original.id,
              state: newStatus as any
            });
            toast.success("Status updated successfully");
          } catch (error) {
            console.error("Error updating state:", error);
            toast.error("Failed to update state: " + (error as Error).message);
          }
        };

        // Get badge style based on status
        const getStatusBadge = (status: string) => {
          switch (status) {
            case "taken":
            case "administered":
              return "bg-green-50 text-green-700 border-green-200";
            case "refused":
            case "refused_destroyed":
              return "bg-red-50 text-red-700 border-red-200";
            case "hospitalised":
              return "bg-blue-50 text-blue-700 border-blue-200";
            case "social_leave":
              return "bg-orange-50 text-orange-700 border-orange-200";
            case "not_required":
              return "bg-gray-50 text-gray-700 border-gray-200";
            case "made_available":
              return "bg-purple-50 text-purple-700 border-purple-200";
            case "missed":
              return "bg-amber-50 text-amber-700 border-amber-200";
            case "scheduled":
              return "bg-blue-50 text-blue-700 border-blue-200";
            default:
              return "bg-slate-50 text-slate-700 border-slate-200";
          }
        };

        const getStatusText = (status: string) => {
          switch (status) {
            case "taken":
            case "administered":
              return "T Taken";
            case "refused":
              return "R Refused";
            case "hospitalised":
              return "C Hospitalised";
            case "social_leave":
              return "D Social leave";
            case "refused_destroyed":
              return "E Refused/Destroyed";
            case "not_required":
              return "NR Not required";
            case "made_available":
              return "M Made available";
            case "missed":
              return "Missed";
            case "scheduled":
              return "Scheduled";
            default:
              return status;
          }
        };

        return (
          <Select
            onValueChange={handleStatusChange}
            value={currentState}
          >
            <SelectTrigger className={`border-none shadow-none hover:bg-slate-50 h-8 ${isRoundCompleted ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getStatusBadge(currentState)}`}>
                {getStatusText(currentState)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="taken">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  T Taken
                </span>
              </SelectItem>
              <SelectItem value="refused">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  R Refused
                </span>
              </SelectItem>
              <SelectItem value="refused_destroyed">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  E Refused/Destroyed
                </span>
              </SelectItem>
              <SelectItem value="hospitalised">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  C Hospitalised
                </span>
              </SelectItem>
              <SelectItem value="social_leave">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                  D Social leave
                </span>
              </SelectItem>
              <SelectItem value="not_required">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                  NR Not required
                </span>
              </SelectItem>
              <SelectItem value="made_available">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  M Made available
                </span>
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
