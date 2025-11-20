"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { MoreVertical, Pencil } from "lucide-react";
import EditMedicationDialog from "@/components/medication/forms/EditMedicationDialog";

interface Medication {
  _id: string;
  _creationTime: number;
  name: string;
  strength: string;
  strengthUnit: string;
  dosageForm: string;
  route: string;
  frequency: string;
  scheduleType: string;
  times: string[];
  instructions?: string;
  prescriberName: string;
  startDate: number;
  endDate?: number;
  status: string;
  totalCount: number;
}

export const createMedicationColumns = (
  createAndAdministerMedicationIntake?: (args: {
    medicationId: Id<"medication">;
    notes?: string;
    witnessedBy: string;
    time: number;
    units: number;
  }) => Promise<null>,
  showAdministrateButton: boolean = false,
  teamMembers?: Array<{ userId: string; name: string }>,
  currentUser?: { name: string; userId: string }
): ColumnDef<Medication>[] => [
  {
    id: "medication",
    header: "Medication",
    cell: ({ row }) => {
      const medication = row.original;

      return (
        <div className="flex flex-col">
          <p className="font-medium">{medication.name}</p>
          <p className="text-xs text-muted-foreground">
            {medication.strength} {medication.strengthUnit} -{" "}
            {medication.dosageForm}
          </p>
        </div>
      );
    }
  },
  {
    id: "route",
    header: "Route",
    cell: ({ row }) => {
      return <p>{row.original.route}</p>;
    }
  },
  {
    id: "scheduleType",
    header: "Schedule Type",
    cell: ({ row }) => {
      return <p>{row.original.scheduleType}</p>;
    }
  },
  {
    id: "frequency",
    header: "Frequency",
    cell: ({ row }) => {
      return <p>{row.original.frequency}</p>;
    }
  },
  {
    id: "totalCount",
    header: "Total Count",
    cell: ({ row }) => {
      return <p>{row.original.totalCount}</p>;
    }
  },
  {
    id: "prescriber",
    header: "Prescriber",
    cell: ({ row }) => {
      return <p className="text-sm">{row.original.prescriberName}</p>;
    }
  },
  {
    id: "instructions",
    header: "Instructions",
    cell: ({ row }) => {
      const instructions = row.original.instructions;
      return (
        <p className="text-sm text-muted-foreground">
          {instructions || "No instructions"}
        </p>
      );
    }
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const medication = row.original;
      const [editDialogOpen, setEditDialogOpen] = useState(false);

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Medication
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <EditMedicationDialog
            medication={medication}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        </>
      );
    }
  },
  ...(showAdministrateButton
    ? [
        {
          id: "administrate",
          header: "Action",
          cell: ({ row }: { row: any }) => {
            const medication = row.original;

            const AdministrateDialog = () => {
              const [isOpen, setIsOpen] = useState(false);
              const [notes, setNotes] = useState("");
              const [witnessedBy, setWitnessedBy] = useState("");
              const [time, setTime] = useState<Date>(new Date());
              const [units, setUnits] = useState(1);

              const handleAdministrate = async () => {
                if (!createAndAdministerMedicationIntake) {
                  toast.error("Administration function not available");
                  return;
                }

                // Validate required fields
                if (!witnessedBy) {
                  toast.error("Please select a witness");
                  return;
                }

                if (units < 1) {
                  toast.error("Units must be at least 1");
                  return;
                }

                try {
                  await createAndAdministerMedicationIntake({
                    medicationId: medication._id as Id<"medication">,
                    notes: notes.trim() || undefined,
                    witnessedBy: witnessedBy,
                    time: time.getTime(),
                    units: units
                  });

                  toast.success("Medication administered successfully");
                  setIsOpen(false);
                  setNotes("");
                  setWitnessedBy("");
                  setTime(new Date());
                  setUnits(1);
                } catch (error) {
                  console.error("Error administering medication:", error);
                  toast.error(
                    "Failed to administer medication: " +
                      (error as Error).message
                  );
                }
              };

              return (
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm">
                      Administrate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Administrate Medication</DialogTitle>
                      <DialogDescription>
                        Confirm administration of this medication
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Medication Details
                        </p>
                        <div className="rounded-md border p-3 space-y-1">
                          <p className="font-semibold">{medication.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {medication.strength} {medication.strengthUnit} -{" "}
                            {medication.dosageForm}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Route: {medication.route}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Frequency: {medication.frequency}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dispensedBy">Dispensed by</Label>
                        <Select disabled value={currentUser?.userId || ""}>
                          <SelectTrigger id="dispensedBy">
                            <SelectValue
                              placeholder={currentUser?.name || "N/A"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {currentUser && (
                              <SelectItem value={currentUser.userId}>
                                {currentUser.name}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="witnessedBy">
                          Witnessed by <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={witnessedBy}
                          onValueChange={setWitnessedBy}
                        >
                          <SelectTrigger id="witnessedBy">
                            <SelectValue placeholder="Select witness" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers?.map((member) => (
                              <SelectItem
                                key={member.userId}
                                value={member.userId}
                              >
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time">
                          Time <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="time"
                          id="time"
                          value={format(time, "HH:mm")}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value
                              .split(":")
                              .map(Number);
                            const newTime = new Date();
                            newTime.setHours(hours || 0);
                            newTime.setMinutes(minutes || 0);
                            newTime.setSeconds(0);
                            newTime.setMilliseconds(0);
                            setTime(newTime);
                          }}
                          className="bg-background"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="units">
                          Units <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="units"
                          type="number"
                          min="1"
                          value={units}
                          onChange={(e) =>
                            setUnits(parseInt(e.target.value) || 1)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          placeholder="Add any notes about this administration"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsOpen(false);
                          setNotes("");
                          setWitnessedBy("");
                          setTime(new Date());
                          setUnits(1);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAdministrate}>Confirm</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            };

            return <AdministrateDialog />;
          }
        } as ColumnDef<Medication>
      ]
    : [])
];
