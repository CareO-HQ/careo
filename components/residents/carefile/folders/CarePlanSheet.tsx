import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

export default function CarePlanSheetContent({
  open,
  onOpenChange,
  carePlan
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carePlan: {
    aims: string;
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    isLatest: boolean;
  };
}) {
  // Fetch the full care plan data
  const carePlanData = useQuery(api.careFiles.carePlan.getCarePlanAssessment, {
    assessmentId: carePlan.formId as Id<"carePlanAssessments">
  });

  // State for managing planned care entries
  const [plannedCareEntries, setPlannedCareEntries] = useState<
    Array<{
      date: number;
      time?: string;
      details: string;
      signature: string;
    }>
  >([]);

  // Initialize planned care entries when data loads
  useEffect(() => {
    if (carePlanData?.plannedCareDate) {
      setPlannedCareEntries(carePlanData.plannedCareDate);
    }
  }, [carePlanData]);

  // Add new planned care entry
  const handleAddEntry = () => {
    setPlannedCareEntries([
      ...plannedCareEntries,
      {
        date: Date.now(),
        time: "",
        details: "",
        signature: ""
      }
    ]);
  };

  // Update planned care entry
  const handleUpdateEntry = (
    index: number,
    field: "date" | "time" | "details" | "signature",
    value: string | number
  ) => {
    const updated = [...plannedCareEntries];
    if (field === "date") {
      updated[index][field] = value as number;
    } else if (field === "time") {
      updated[index][field] = value as string;
    } else {
      updated[index][field] = value as string;
    }
    setPlannedCareEntries(updated);
  };

  // Delete planned care entry
  const handleDeleteEntry = (index: number) => {
    setPlannedCareEntries(plannedCareEntries.filter((_, i) => i !== index));
  };

  if (!carePlanData) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          size="lg"
          className="z-[60]"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <SheetHeader>
            <SheetTitle>Loading...</SheetTitle>
            <SheetDescription>Loading care plan details</SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        size="lg"
        className="z-[60] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle>{carePlanData.nameOfCarePlan}</SheetTitle>
              <SheetDescription className="w-full">
                <div>
                  Care Plan{" "}
                  <span className="font-medium text-primary">
                    #{carePlanData.carePlanNumber}
                  </span>
                  . Written by:{" "}
                  <span className="font-medium text-primary">
                    {carePlanData.writtenBy}
                  </span>{" "}
                  on{" "}
                  <span className="font-medium text-primary">
                    {format(new Date(carePlanData.dateWritten), "dd MMM yyyy")}
                  </span>
                </div>
                <div className="text-orange-500 text-xs italic w-full bg-orange-50 px-2 py-1 rounded-md mt-1">
                  Previous versions of this care plan can be found under
                  documentation.
                </div>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-col gap-1 px-4">
            {/* Basic Information */}
            <div className="flex flex-row justify-between items-center gap-2">
              <p className="text-muted-foreground text-sm font-medium">
                Resident Information
              </p>
            </div>
            <div className="flex flex-col justify-start items-start gap-1">
              <p className="text-sm font-normal text-muted-foreground">
                Name:{" "}
                <span className="font-medium text-primary">
                  {carePlanData.residentName}
                </span>
              </p>
              <p className="text-sm font-normal text-muted-foreground">
                Date of Birth:{" "}
                <span className="font-medium text-primary">
                  {format(new Date(carePlanData.dob), "dd MMMM yyyy")}
                </span>
              </p>
              <p className="text-sm font-normal text-muted-foreground">
                Bedroom Number:{" "}
                <span className="font-medium text-primary">
                  {carePlanData.bedroomNumber}
                </span>
              </p>
            </div>

            {/* Aims */}
            <div className="flex flex-row justify-between items-center gap-2 mt-4">
              <p className="text-muted-foreground text-sm font-medium">Aims</p>
            </div>
            <div className="flex flex-col justify-start items-start gap-1">
              <Textarea value={carePlanData.aims} className="w-full" readOnly />
            </div>

            {/* Identified Needs */}
            <div className="flex flex-row justify-between items-center gap-2 mt-4">
              <p className="text-muted-foreground text-sm font-medium">
                Identified Needs
              </p>
            </div>
            <div className="flex flex-col justify-start items-start gap-1">
              <Textarea
                defaultValue={carePlanData.identifiedNeeds}
                className="w-full"
              />
            </div>

            {/* Planned Care */}

            <div className="flex flex-row justify-between items-center gap-2 mt-4">
              <p className="text-muted-foreground text-sm font-medium">
                Planned Care
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddEntry}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Entry
              </Button>
            </div>
            <div className="space-y-3">
              {plannedCareEntries.map((entry, index) => (
                <div key={index} className="rounded-lg border p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Entry {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(index)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Date
                        </label>
                        <Input
                          type="date"
                          value={format(new Date(entry.date), "yyyy-MM-dd")}
                          onChange={(e) =>
                            handleUpdateEntry(
                              index,
                              "date",
                              new Date(e.target.value).getTime()
                            )
                          }
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Time (optional)
                        </label>
                        <Input
                          type="time"
                          step="1"
                          value={entry.time || ""}
                          onChange={(e) =>
                            handleUpdateEntry(index, "time", e.target.value)
                          }
                          className="text-sm bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Details
                      </label>
                      <Textarea
                        value={entry.details}
                        onChange={(e) =>
                          handleUpdateEntry(index, "details", e.target.value)
                        }
                        className="text-sm min-h-[80px]"
                        placeholder="Enter care plan details..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Signature
                      </label>
                      <Input
                        value={entry.signature}
                        onChange={(e) =>
                          handleUpdateEntry(index, "signature", e.target.value)
                        }
                        className="text-sm"
                        placeholder="Signed by..."
                      />
                    </div>
                  </div>
                </div>
              ))}
              {plannedCareEntries.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
                  No planned care entries yet. Click &quot;Add Entry&quot; to
                  create one.
                </div>
              )}
            </div>

            <Button className="mt-4">Update Care Plan</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
