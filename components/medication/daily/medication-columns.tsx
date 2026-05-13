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
  is_controlled_drug?: boolean;
  container_type?: string;
  discontinued_by?: string | null;
  discontinuation_checked_by?: string | null;
}

export const createMedicationColumns = (
  createAndAdministerMedicationIntake?: (medicationId: string, residentId: string, time: string, quantity: number, notes?: string, witnessId?: string, status?: string, prnReason?: string, prnOutcome?: string) => Promise<any>,
  showAdministerButton: boolean = false,
  teamMembers?: Array<{ userId: string; name: string }>,
  currentUser?: { name: string; userId: string },
  useSimplifiedTopicalDialog: boolean = true,
  administeredTimesToday: Record<string, Array<{ time: string, by: string }>> = {},
  preSelectedTime?: string | null,
  showDiscontinuationSignOff: boolean = false,
  resolveStaffDisplayName?: (userId: string | null | undefined) => string
): ColumnDef<Medication>[] => [
    {
      id: "medication",
      header: "Medication",
      cell: ({ row }) => {
        const medication = row.original;

        return (
          <div className="flex flex-col">
            <p className="font-medium">
              {medication.name}
              {medication.is_controlled_drug && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-200 text-red-800 border border-red-300">
                  Controlled
                </span>
              )}
            </p>
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
            if (dosageUnit.includes('Injections')) {
              if (medication.container_type) {
                const ct = medication.container_type.toLowerCase();
                return totalCount === 1 ? ct : (ct.endsWith('s') ? ct : ct + 's');
              }
              return 'mL';
            }
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
            if (medication.container_type) {
              const ct = medication.container_type.toLowerCase();
              return totalCount === 1 ? ct : (ct.endsWith('s') ? ct : ct + 's');
            }
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
    ...(showDiscontinuationSignOff && resolveStaffDisplayName
      ? [
          {
            id: "discontinuedBy",
            header: "Discontinued by",
            cell: ({ row }) => {
              const medication = row.original;
              return (
                <p className="text-sm">
                  {resolveStaffDisplayName(medication.discontinued_by)}
                </p>
              );
            },
          },
          {
            id: "discontinuationWitness",
            header: "Witness",
            cell: ({ row }) => {
              const medication = row.original;
              return (
                <p className="text-sm">
                  {resolveStaffDisplayName(medication.discontinuation_checked_by)}
                </p>
              );
            },
          },
        ] as ColumnDef<Medication>[]
      : []),
    // Only show Actions column for non-PRN medications when Administer button is shown
    ...(showAdministerButton ? [] : [
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
    ...(showAdministerButton
      ? [
        {
          id: "administer",
          header: "Action",
          cell: ({ row }: { row: any }) => {
            const medication = row.original;

            const AdministerDialog = () => {
              const isTopical = medication.schedule_type === "Topical";
              // For topical meds with a pre-selected time, initialize to that time
              const getInitialTime = () => {
                if (isTopical && preSelectedTime) {
                  const [h, m] = preSelectedTime.split(":").map(Number);
                  const d = new Date();
                  d.setHours(h || 0, m || 0, 0, 0);
                  return d;
                }
                return new Date();
              };
              const [isOpen, setIsOpen] = useState(false);
              const [notes, setNotes] = useState("");
              const [prnReason, setPrnReason] = useState("");
              const [prnOutcome, setPrnOutcome] = useState("");
              const [witnessedBy, setWitnessedBy] = useState("");
              const [time, setTime] = useState<Date>(getInitialTime);
              const [units, setUnits] = useState<number | "">(1);
              const [applicationStatus, setApplicationStatus] = useState<
    "taken" | "refused" | "not_required" | "hospitalised" | "social_leave" | "refused_destroyed" | "made_available"
  >("taken");

              const administeredForMedication = administeredTimesToday[medication.id] || [];

              const isPRN = medication.schedule_type === "PRN (As Needed)";
              const useSimplifiedTopical = isTopical && useSimplifiedTopicalDialog;
              const useSimplifiedDialog = isTopical || isPRN; // Use simplified form for both topical and PRN
              // When preSelectedTime is provided for topicals, hide time picker
              const topicalTimeFixed = isTopical && !!preSelectedTime;
              const selectedAdministrationTime = preSelectedTime || format(time, "HH:mm");
              const administrationInfo = administeredForMedication.find(v => v.time === selectedAdministrationTime);
              const isAlreadyAdministeredAtTime = !!administrationInfo;

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
                    if (medication.container_type) {
                      const ct = medication.container_type;
                      const label = ct + (ct.toLowerCase().endsWith('s') ? '' : 's');
                      return { label: label, type: 'number', step: '1' };
                    }
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
                  if (medication.container_type) {
                    const ct = medication.container_type;
                    const label = ct + (ct.toLowerCase().endsWith('s') ? '' : 's');
                    return { label: label, type: 'number', step: '1' };
                  }
                  return { label: 'Dose (mL)', type: 'number', step: '0.1' };
                } else {
                  // Default for tablets, capsules, etc.
                  return { label: 'Tablets/Capsules', type: 'number', step: '1' };
                }
              };

              const unitInfo = getUnitInfo();

              const handleAdminister = async () => {
                if (!createAndAdministerMedicationIntake) {
                  toast.error("Administration function not available");
                  return;
                }

                // Validate required fields
                // Witness is required for non-topical medications in full form
                // For topical in full form, witness is optional
                // Witness is required for PRN medications
                if (!useSimplifiedTopical && !isTopical && !witnessedBy) {
                  toast.error("Please select a witness");
                  return;
                }

                if (isPRN && !witnessedBy) {
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

                if (isPRN && !prnReason) {
                  toast.error("Please enter the purpose of administration");
                  return;
                }

                try {
                  // For topical medications (both simplified and full), use 1 as quantity and add status to notes
                  const quantity = isTopical ? 1 : (typeof units === "number" ? units : parseFloat(units));
                  
                  // Map internal status to display status for topical notes
                  const displayStatus = isTopical 
                    ? (applicationStatus === 'taken' ? 'Applied' : 
                       applicationStatus === 'not_required' ? 'Not required' :
                       applicationStatus.charAt(0).toUpperCase() + applicationStatus.slice(1))
                    : "";

                  const administrationNotes = isTopical
                    ? `Status: ${displayStatus}${notes ? `\n${notes}` : ''}`
                    : notes;

                  await createAndAdministerMedicationIntake(
                    medication.id,
                    medication.resident_id,
                    format(time, "HH:mm"),
                    quantity,
                    administrationNotes,
                    witnessedBy,
                    applicationStatus,
                    prnReason,
                    prnOutcome
                  );

                  toast.success(isTopical
                    ? `Topical medication marked as ${displayStatus}`
                    : "Medication administered successfully"
                  );
                  setIsOpen(false);
                  setNotes("");
                  setPrnReason("");
                  setPrnOutcome("");
                  setWitnessedBy("");
                  setTime(new Date());
                  setUnits(1);
                  setApplicationStatus("taken");
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
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isAlreadyAdministeredAtTime}
                      title={isAlreadyAdministeredAtTime ? `Already administered at ${selectedAdministrationTime} by ${administrationInfo?.by}` : undefined}
                    >
                      {isAlreadyAdministeredAtTime ? "Administered" : "Administer"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className={useSimplifiedDialog ? "max-w-md max-h-[90vh] overflow-y-auto" : ""}>
                    <DialogHeader className={useSimplifiedDialog ? "space-y-1" : ""}>
                      <DialogTitle className={useSimplifiedDialog ? "text-base" : ""}>
                        {isTopical
                          ? "Apply Topical Medication"
                          : isPRN
                          ? "Administer PRN Medication"
                          : "Administer Medication"}
                      </DialogTitle>
                      <DialogDescription className={useSimplifiedDialog ? "text-xs" : ""}>
                        {isTopical || isPRN
                          ? `Record administration of ${medication.name}`
                          : "Confirm administration of this medication"
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className={useSimplifiedDialog ? "space-y-3" : "space-y-4"}>
                      {!useSimplifiedTopical && !isTopical && !isPRN && (
                        <>
                          {/* Compact medication info for regular medications */}
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                            <p className="font-semibold text-sm">{medication.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {medication.strength} {medication.strength_unit} · {medication.dosage_form}
                            </p>
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
                        </>
                      )}

                      {/* Simplified Attio-style form for topical medications */}
                      {!useSimplifiedTopical && isTopical && (
                        <>
                          {/* Compact medication info */}
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                            <p className="font-semibold text-sm">{medication.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {medication.strength} {medication.strength_unit} · {medication.dosage_form}
                            </p>
                          </div>

                          {/* Two-column layout for topical fields */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Application sites badge */}
                            {medication.body_regions && medication.body_regions.length > 0 && (
                              <div className="flex flex-wrap gap-1 col-span-2">
                                {medication.body_regions.slice(0, 3).map((regionId: string) => {
                                  const region = BODY_REGIONS.find(r => r.region_id === regionId);
                                  return (
                                    <span
                                      key={regionId}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                                    >
                                      {region?.region_name || regionId}
                                    </span>
                                  );
                                })}
                                {medication.body_regions.length > 3 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                    +{medication.body_regions.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Applied by - compact */}
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs text-muted-foreground">Applied by</Label>
                              <div className="text-sm font-medium">{currentUser?.name || "N/A"}</div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Simplified Attio-style form for PRN medications */}
                      {!useSimplifiedTopical && isPRN && (
                        <>
                          {/* Compact medication info */}
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                            <p className="font-semibold text-sm">{medication.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {medication.strength} {medication.strength_unit} · {medication.dosage_form}
                            </p>
                          </div>

                          {/* Two-column layout for PRN fields */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Administered by - compact */}
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs text-muted-foreground">Administered by</Label>
                              <div className="text-sm font-medium">{currentUser?.name || "N/A"}</div>
                            </div>
                          </div>
                        </>
                      )}

                      {useSimplifiedTopical ? (
                        <>
                          {/* Topical Medication: Show Staff, Time (read-only from time bar), and Status */}
                          <div className="space-y-2">
                            <Label htmlFor="staffName">Staff Name</Label>
                            <div className="rounded-md border p-3">
                              <p className="text-sm">{currentUser?.name || "N/A"}</p>
                            </div>
                          </div>

                          {/* Time: always read-only, taken from the selected time bar */}
                          <div className="space-y-2">
                            <Label>Time</Label>
                            <div className="rounded-md border p-3 bg-muted/40">
                              <p className="text-sm font-medium">
                                {preSelectedTime || format(time, "HH:mm")}
                              </p>
                              {preSelectedTime && (
                                <p className="text-xs text-muted-foreground">Selected from time bar</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="applicationStatus">
                              Administration Status <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={applicationStatus}
                              onValueChange={(value: "taken" | "refused" | "hospitalised" | "social_leave" | "refused_destroyed" | "not_required" | "made_available") => setApplicationStatus(value)}
                            >
                              <SelectTrigger id="applicationStatus">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="taken">A Applied</SelectItem>
                                <SelectItem value="refused">R Refused</SelectItem>
                                <SelectItem value="not_required">NR Not required (NR)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : !useSimplifiedTopical && isTopical ? (
                        <>
                          {/* Topical Medication: Two-column layout */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                Time
                              </Label>
                              <div className="text-sm font-medium h-8 flex items-center px-3 border rounded-md bg-muted/40">
                                {preSelectedTime || format(time, "HH:mm")}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="applicationStatus" className="text-xs text-muted-foreground">
                                Status <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                value={applicationStatus}
                                onValueChange={(value: "taken" | "refused" | "hospitalised" | "social_leave" | "refused_destroyed" | "not_required" | "made_available") => setApplicationStatus(value)}
                              >
                                <SelectTrigger id="applicationStatus" className="h-8">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="taken">A Applied</SelectItem>
                                  <SelectItem value="refused">R Refused</SelectItem>
                                  <SelectItem value="not_required">NR Not required (NR)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1 col-span-2">
                              <Label htmlFor="notes" className="text-xs text-muted-foreground">
                                Notes (Optional)
                              </Label>
                              <Textarea
                                id="notes"
                                placeholder="Add notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-1 col-span-2">
                              <Label htmlFor="witnessedBy" className="text-xs text-muted-foreground">
                                Witness (Optional)
                              </Label>
                              <Select
                                value={witnessedBy}
                                onValueChange={setWitnessedBy}
                              >
                                <SelectTrigger id="witnessedBy" className="h-8">
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
                          </div>
                        </>
                      ) : isPRN ? (
                        <>
                          {/* PRN Medication: Two-column layout */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="time" className="text-xs text-muted-foreground">
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
                                className="bg-background h-8"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="units" className="text-xs text-muted-foreground">
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
                                className="h-8"
                              />
                            </div>

                            <div className="space-y-1 col-span-2">
                              <Label htmlFor="witnessedBy" className="text-xs text-muted-foreground">
                                Witnessed by <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                value={witnessedBy}
                                onValueChange={setWitnessedBy}
                              >
                                <SelectTrigger id="witnessedBy" className="h-8">
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

                            <div className="space-y-1 col-span-2">
                              <Label htmlFor="notes" className="text-xs text-muted-foreground">
                                Notes (Optional)
                              </Label>
                              <Textarea
                                id="notes"
                                placeholder="Add notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-1 col-span-2">
                              <Label htmlFor="prnReason" className="text-xs text-muted-foreground">
                                Purpose of administration <span className="text-red-500">*</span>
                              </Label>
                              <Textarea
                                id="prnReason"
                                placeholder="e.g., Headache, Persistent pain..."
                                value={prnReason}
                                onChange={(e) => setPrnReason(e.target.value)}
                                rows={2}
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-1 col-span-2">
                              <Label htmlFor="prnOutcome" className="text-xs text-muted-foreground">
                                Patient response/outcome of administration
                              </Label>
                              <Textarea
                                id="prnOutcome"
                                placeholder="e.g., Pain relieved, Patient resting..."
                                value={prnOutcome}
                                onChange={(e) => setPrnOutcome(e.target.value)}
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div className={`flex ${(isTopical || isPRN) ? 'justify-between' : 'justify-end'} gap-2 ${(isTopical || isPRN) ? 'pt-2' : ''}`}>
                      <Button
                        variant={(isTopical || isPRN) ? "ghost" : "outline"}
                        size={(isTopical || isPRN) ? "sm" : "default"}
                        onClick={() => {
                          setIsOpen(false);
                          setNotes("");
                          setPrnReason("");
                          setPrnOutcome("");
                          setWitnessedBy("");
                          setTime(new Date());
                          setUnits(1);
                          setApplicationStatus("taken");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAdminister}
                        size={(isTopical || isPRN) ? "sm" : "default"}
                        className={(isTopical || isPRN) ? "px-6" : ""}
                      >
                        {isTopical ? "Apply" : isPRN ? "Confirm" : "Confirm"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            };

            return <AdministerDialog />;
          }
        } as ColumnDef<Medication>
      ]
      : [])
  ];

export const createTopicalMedicationColumns = (
  createAndAdministerMedicationIntake?: (medicationId: string, residentId: string, time: string, quantity: number, notes?: string, witnessId?: string, status?: string) => Promise<any>,
  showAdministerButton: boolean = false,
  teamMembers?: Array<{ userId: string; name: string }>,
  currentUser?: { name: string; userId: string },
  administeredTimesToday: Record<string, Array<{ time: string, by: string }>> = {},
  preSelectedTime?: string | null
): ColumnDef<Medication>[] => {
  // Get base columns — pass preSelectedTime so topical admin dialog uses it
  const baseColumns = createMedicationColumns(
    createAndAdministerMedicationIntake,
    showAdministerButton,
    teamMembers,
    currentUser,
    false,
    administeredTimesToday,
    preSelectedTime,
    false,
    undefined
  );

  // Remove prescriber column and extract action columns
  const columnsWithoutPrescriber = baseColumns.filter(col => col.id !== "prescriber");

  // Extract actions and administer columns to move them to the end
  const actionsColumn = columnsWithoutPrescriber.find(col => col.id === "actions");
  const administerColumn = columnsWithoutPrescriber.find(col => col.id === "administer");

  // Remove actions and administer from the array
  const columnsWithoutActions = columnsWithoutPrescriber.filter(
    col => col.id !== "actions" && col.id !== "administer"
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
  if (administerColumn) result.push(administerColumn);

  return result;
};
