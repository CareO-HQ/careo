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
import { format } from "date-fns";
import { MoreVertical, Pencil, Eye } from "lucide-react";
import EditMedicationDialog from "@/components/medication/forms/EditMedicationDialog";
import { InteractiveBodyMap } from "@/components/body-map/InteractiveBodyMap";
import { BODY_REGIONS } from "@/lib/config/body-regions";

interface Medication {
  id: string;
  created_at: string;
  name: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  route: string;
  frequency: string;
  schedule_type: string;
  times: string[];
  time_quantities: Record<string, number> | null;
  instructions?: string;
  prescriber_name: string;
  start_date: string;
  end_date?: string;
  status: string;
  total_count: number;
  resident_id: string;
  body_regions?: string[];
}

export const createMedicationColumns = (
  createAndAdministerMedicationIntake?: (medicationId: string, residentId: string, time: string, quantity: number, notes?: string) => Promise<any>,
  showAdministrateButton: boolean = false,
  teamMembers?: Array<{ userId: string; name: string }>,
  currentUser?: { name: string; userId: string },
  useSimplifiedTopicalDialog: boolean = true
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
              {medication.strength} {medication.strength_unit} -{" "}
              {medication.dosage_form}
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
        return <p>{row.original.schedule_type}</p>;
      }
    },
    {
      id: "frequency",
      header: "Frequency / Unit",
      cell: ({ row }) => {
        const med = row.original;
        // For PRN and Supplements, frequency field contains dosage unit
        if (med.schedule_type === "PRN (As Needed)" || med.schedule_type === "Supplement") {
          return (
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground">Dosage Unit:</p>
              <p className="font-medium">{med.frequency || "Not specified"}</p>
            </div>
          );
        }
        return <p>{row.original.frequency}</p>;
      }
    },
    {
      id: "totalCount",
      header: "Total Count",
      cell: ({ row }) => {
        const medication = row.original;
        const totalCount = medication.total_count;

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
      id: "prescriber",
      header: "Prescriber",
      cell: ({ row }) => {
        return <p className="text-sm">{row.original.prescriber_name}</p>;
      }
    },
    {
      id: "instructions",
      header: "Instructions",
      cell: ({ row }) => {
        const medication = row.original;
        const instructions = medication.instructions;
        const isPRNOrTopical = medication.schedule_type === "PRN (As Needed)" || medication.schedule_type === "Topical";

        if (!instructions) {
          return <p className="text-sm text-muted-foreground">No instructions</p>;
        }

        // For PRN and Topical medications, truncate if lengthy
        if (isPRNOrTopical && instructions.length > 30) {
          const truncated = instructions.substring(0, 30) + "...";
          return (
            <p
              className="text-sm text-muted-foreground cursor-help"
              title={instructions}
            >
              {truncated}
            </p>
          );
        }

        return (
          <p className="text-sm text-muted-foreground">
            {instructions}
          </p>
        );
      }
    },
    // Only show Actions column for non-PRN medications when Administrate button is shown
    ...(showAdministrateButton ? [] : [
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: { row: any }) => {
          const medication = row.original;

          const ActionsCell = () => {
            const [editDialogOpen, setEditDialogOpen] = useState(false);
            const [dropdownOpen, setDropdownOpen] = useState(false);

            return (
              <>
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditDialogOpen(true);
                      setDropdownOpen(false);
                    }}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Medication
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {editDialogOpen && (
                  <EditMedicationDialog
                    medication={medication}
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                  />
                )}
              </>
            );
          };

          return <ActionsCell />;
        }
      } as ColumnDef<Medication>
    ]),
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
              const [units, setUnits] = useState<number | "">(1);
              const [applicationStatus, setApplicationStatus] = useState<"applied" | "refused" | "missed">("applied");

              const isTopical = medication.schedule_type === "Topical";
              const useSimplifiedTopical = isTopical && useSimplifiedTopicalDialog;

              // Determine unit label and type based on frequency field (for PRN/Supplements) or dosage form
              const getUnitInfo = () => {
                // For PRN and Supplements, use the frequency field which stores dosage unit
                if (medication.schedule_type === "PRN (As Needed)" || medication.schedule_type === "Supplement") {
                  const dosageUnit = medication.frequency || "";

                  if (dosageUnit.includes('Drops')) {
                    return { label: 'Drops', type: 'number', step: '1' };
                  } else if (dosageUnit.includes('mL')) {
                    return { label: 'mL (Milliliters)', type: 'number', step: '0.1' };
                  } else if (dosageUnit.includes('Puffs')) {
                    return { label: 'Puffs', type: 'number', step: '1' };
                  } else if (dosageUnit.includes('Applications')) {
                    return { label: 'Applications', type: 'number', step: '1' };
                  } else if (dosageUnit.includes('Sprays')) {
                    return { label: 'Sprays', type: 'number', step: '1' };
                  } else if (dosageUnit.includes('Patches')) {
                    return { label: 'Patches', type: 'number', step: '1' };
                  } else if (dosageUnit.includes('Injections')) {
                    return { label: 'Injections (mL)', type: 'number', step: '0.1' };
                  } else {
                    return { label: 'Tablets/Capsules', type: 'number', step: '1' };
                  }
                }

                // For scheduled medications, determine from dosage form
                const dosageForm = medication.dosage_form.toLowerCase();

                if (dosageForm.includes('liquid') || dosageForm.includes('syrup') || dosageForm.includes('drops')) {
                  return { label: 'Dose (mL or drops)', type: 'number', step: '0.1' };
                } else if (dosageForm.includes('inhaler') || dosageForm.includes('spray')) {
                  return { label: 'Puffs', type: 'number', step: '1' };
                } else if (dosageForm.includes('cream') || dosageForm.includes('ointment') || dosageForm.includes('gel') || dosageForm.includes('patch')) {
                  return { label: 'Applications', type: 'number', step: '1' };
                } else if (dosageForm.includes('injection')) {
                  return { label: 'Dose (mL)', type: 'number', step: '0.1' };
                } else {
                  // Default for tablets, capsules, etc.
                  return { label: 'Tablets/Capsules', type: 'number', step: '1' };
                }
              };

              const unitInfo = getUnitInfo();

              const handleAdministrate = async () => {
                if (!createAndAdministerMedicationIntake) {
                  toast.error("Administration function not available");
                  return;
                }

                // Validate required fields
                // Witness is required for non-topical medications in full form
                // For topical in full form, witness is optional
                if (!useSimplifiedTopical && !isTopical && !witnessedBy) {
                  toast.error("Please select a witness");
                  return;
                }

                // For topical medications (both simplified and full), use status instead of units
                // For other medications, validate units
                if (!isTopical) {
                  if (units === "" || units < 0) {
                    toast.error(`Please enter a valid ${unitInfo.label.toLowerCase()} amount`);
                    return;
                  }
                }

                try {
                  // For topical medications (both simplified and full), use 1 as quantity and add status to notes
                  const quantity = isTopical ? 1 : (typeof units === "number" ? units : parseFloat(units));
                  const administrationNotes = isTopical
                    ? `Status: ${applicationStatus.charAt(0).toUpperCase() + applicationStatus.slice(1)}${notes ? `\n${notes}` : ''}`
                    : notes;

                  await createAndAdministerMedicationIntake(
                    medication.id,
                    medication.resident_id,
                    format(time, "HH:mm"),
                    quantity,
                    administrationNotes
                  );

                  toast.success(isTopical
                    ? `Topical medication marked as ${applicationStatus}`
                    : "Medication administered successfully"
                  );
                  setIsOpen(false);
                  setNotes("");
                  setWitnessedBy("");
                  setTime(new Date());
                  setUnits(1);
                  setApplicationStatus("applied");
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
                  <DialogContent className={useSimplifiedTopical ? "max-w-md" : ""}>
                    <DialogHeader>
                      <DialogTitle>
                        {useSimplifiedTopical ? "Apply Topical Medication" : "Administrate Medication"}
                      </DialogTitle>
                      <DialogDescription>
                        {useSimplifiedTopical
                          ? `Record application of ${medication.name}`
                          : "Confirm administration of this medication"
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!useSimplifiedTopical && (
                        <>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              Medication Details
                            </p>
                            <div className="rounded-md border p-3 space-y-1">
                              <p className="font-semibold">{medication.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {medication.strength} {medication.strength_unit} -{" "}
                                {medication.dosage_form}
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
                              Witnessed by {isTopical ? "(Optional)" : <span className="text-red-500">*</span>}
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
                        </>
                      )}

                      {useSimplifiedTopical ? (
                        <>
                          {/* Topical Medication: Only show Staff, Time, and Status */}
                          <div className="space-y-2">
                            <Label htmlFor="staffName">Staff Name</Label>
                            <div className="rounded-md border p-3">
                              <p className="text-sm">{currentUser?.name || "N/A"}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="time">
                              Time <span className="text-red-500">*</span>
                            </Label>
                            {medication.times && medication.times.length > 0 ? (
                              <Select
                                value={format(time, "HH:mm")}
                                onValueChange={(value) => {
                                  const [hours, minutes] = value.split(":").map(Number);
                                  const newTime = new Date();
                                  newTime.setHours(hours || 0);
                                  newTime.setMinutes(minutes || 0);
                                  newTime.setSeconds(0);
                                  newTime.setMilliseconds(0);
                                  setTime(newTime);
                                }}
                              >
                                <SelectTrigger id="time">
                                  <SelectValue placeholder="Select prescribed time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {medication.times.map((prescribedTime: string) => (
                                    <SelectItem key={prescribedTime} value={prescribedTime}>
                                      {prescribedTime}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
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
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="applicationStatus">
                              Application Status <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={applicationStatus}
                              onValueChange={(value: "applied" | "refused" | "missed") => setApplicationStatus(value)}
                            >
                              <SelectTrigger id="applicationStatus">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="refused">Refused</SelectItem>
                                <SelectItem value="missed">Missed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Regular Medication: Show all fields */}
                          <div className="space-y-2">
                            <Label htmlFor="time">
                              Time <span className="text-red-500">*</span>
                            </Label>
                            {isTopical && medication.times && medication.times.length > 0 ? (
                              <Select
                                value={format(time, "HH:mm")}
                                onValueChange={(value) => {
                                  const [hours, minutes] = value.split(":").map(Number);
                                  const newTime = new Date();
                                  newTime.setHours(hours || 0);
                                  newTime.setMinutes(minutes || 0);
                                  newTime.setSeconds(0);
                                  newTime.setMilliseconds(0);
                                  setTime(newTime);
                                }}
                              >
                                <SelectTrigger id="time">
                                  <SelectValue placeholder="Select prescribed time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {medication.times.map((prescribedTime: string) => (
                                    <SelectItem key={prescribedTime} value={prescribedTime}>
                                      {prescribedTime}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
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
                            )}
                          </div>

                          {isTopical ? (
                            <div className="space-y-2">
                              <Label htmlFor="applicationStatus">
                                Application Status <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                value={applicationStatus}
                                onValueChange={(value: "applied" | "refused" | "missed") => setApplicationStatus(value)}
                              >
                                <SelectTrigger id="applicationStatus">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="applied">Applied</SelectItem>
                                  <SelectItem value="refused">Refused</SelectItem>
                                  <SelectItem value="missed">Missed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label htmlFor="units">
                                {unitInfo.label} <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="units"
                                type="number"
                                min="0"
                                step={unitInfo.step}
                                value={units}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || value === null) {
                                    setUnits("");
                                  } else {
                                    const parsed = parseFloat(value);
                                    if (!isNaN(parsed) && parsed >= 0) {
                                      setUnits(parsed);
                                    }
                                  }
                                }}
                                placeholder={`Enter ${unitInfo.label.toLowerCase()}`}
                              />
                            </div>
                          )}

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
                        </>
                      )}
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
                          setApplicationStatus("applied");
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

export const createTopicalMedicationColumns = (
  createAndAdministerMedicationIntake?: (medicationId: string, residentId: string, time: string, quantity: number, notes?: string) => Promise<any>,
  showAdministrateButton: boolean = false,
  teamMembers?: Array<{ userId: string; name: string }>,
  currentUser?: { name: string; userId: string }
): ColumnDef<Medication>[] => {
  // Get base columns
  const baseColumns = createMedicationColumns(
    createAndAdministerMedicationIntake,
    showAdministrateButton,
    teamMembers,
    currentUser,
    false
  );

  // Remove prescriber column and extract action columns
  const columnsWithoutPrescriber = baseColumns.filter(col => col.id !== "prescriber");

  // Extract actions and administrate columns to move them to the end
  const actionsColumn = columnsWithoutPrescriber.find(col => col.id === "actions");
  const administrateColumn = columnsWithoutPrescriber.find(col => col.id === "administrate");

  // Remove actions and administrate from the array
  const columnsWithoutActions = columnsWithoutPrescriber.filter(
    col => col.id !== "actions" && col.id !== "administrate"
  );

  // Body map column definition
  const bodyMapColumn: ColumnDef<Medication> = {
      id: "bodyMap",
      header: "Application Sites",
      cell: ({ row }) => {
        const medication = row.original;
        const bodyRegions = medication.body_regions || [];

        if (bodyRegions.length === 0) {
          return <span className="text-xs text-muted-foreground">No sites selected</span>;
        }

        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                View ({bodyRegions.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Application Sites - {medication.name}</DialogTitle>
                <DialogDescription>
                  Body regions where this topical medication should be applied
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <InteractiveBodyMap
                  entries={bodyRegions.map((regionId: string) => {
                    const region = BODY_REGIONS.find(r => r.region_id === regionId);
                    return {
                      id: regionId,
                      region_id: regionId,
                      region_name: region?.region_name || regionId,
                      condition_type: "other" as const,
                      severity: 1,
                      notes: "Application site",
                      date_time: new Date().toISOString(),
                      status: "active" as const
                    };
                  })}
                  onRegionClick={() => {}} // Read-only in view mode
                  selectedRegionId={null}
                  viewMode={true}
                />
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-sm font-medium mb-2">Selected Application Sites:</p>
                  <div className="flex flex-wrap gap-2">
                    {bodyRegions.map((regionId: string) => {
                      const region = BODY_REGIONS.find(r => r.region_id === regionId);
                      return (
                        <span
                          key={regionId}
                          className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-md border border-purple-200"
                        >
                          {region?.region_name || regionId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      }
  };

  // Build the final column array: base columns + body map + action columns at the end
  const result = [...columnsWithoutActions, bodyMapColumn];

  // Add action columns at the very end
  if (actionsColumn) result.push(actionsColumn);
  if (administrateColumn) result.push(administrateColumn);

  return result;
};
