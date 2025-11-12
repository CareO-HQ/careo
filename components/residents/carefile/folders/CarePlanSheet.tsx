import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { format } from "date-fns";
import { Plus, Trash2, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function CarePlanSheetContent({
  open,
  onOpenChange,
  carePlan
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carePlan: {
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

  // Fetch evaluations for this care plan
  const evaluations = useQuery(api.careFiles.carePlan.getCarePlanEvaluations, {
    carePlanId: carePlan.formId as Id<"carePlanAssessments">
  });

  // Get current user
  const { data: currentUser } = authClient.useSession();

  // Mutation for creating new care plan version
  const createNewVersion = useMutation(
    api.careFiles.carePlan.createNewCarePlanVersion
  );

  // Mutation for creating evaluation
  const createEvaluation = useMutation(
    api.careFiles.carePlan.createCarePlanEvaluation
  );

  // State for managing form data
  const [aims, setAims] = useState("");
  const [identifiedNeeds, setIdentifiedNeeds] = useState("");
  const [plannedCareEntries, setPlannedCareEntries] = useState<
    Array<{
      date: number;
      time?: string;
      details: string;
      signature: string;
    }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasModified, setHasModified] = useState(false);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [openDatePickers, setOpenDatePickers] = useState<{ [key: number]: boolean }>({});
  const [evaluationComments, setEvaluationComments] = useState("");

  // Initialize form data when care plan loads
  useEffect(() => {
    if (carePlanData) {
      const initialAims = carePlanData.aims || "";
      const initialNeeds = carePlanData.identifiedNeeds || "";
      const initialEntries = carePlanData.plannedCareDate || [];

      setAims(initialAims);
      setIdentifiedNeeds(initialNeeds);
      setPlannedCareEntries(initialEntries);
      setHasModified(false);
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
    setHasModified(true);
    toast.info("CHANGE");
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
    setHasModified(true);
  };

  // Delete planned care entry
  const handleDeleteEntry = (index: number) => {
    setPlannedCareEntries(plannedCareEntries.filter((_, i) => i !== index));
    setHasModified(true);
    toast.info("CHANGE");
  };

  // Handle submitting evaluation
  const handleSubmitEvaluation = async () => {
    if (!currentUser?.user?.id) {
      toast.error("User information not available");
      return;
    }

    if (!evaluationComments.trim()) {
      toast.error("Please enter evaluation comments");
      return;
    }

    setIsSubmitting(true);

    try {
      await createEvaluation({
        carePlanId: carePlan.formId as Id<"carePlanAssessments">,
        evaluationDate: Date.now(),
        comments: evaluationComments.trim()
      });

      toast.success("Evaluation submitted successfully!");
      setEvaluationComments("");
      setShowEvaluationForm(false);
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      toast.error("Failed to submit evaluation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating care plan (creates new version)
  const handleUpdateCarePlan = async () => {
    if (!currentUser?.user?.id || !currentUser?.user?.name) {
      toast.error("User information not available");
      return;
    }

    if (!identifiedNeeds.trim() || !aims.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (plannedCareEntries.length === 0) {
      toast.error("Please add at least one planned care entry");
      return;
    }

    // Validate planned care entries
    for (const entry of plannedCareEntries) {
      if (!entry.details.trim() || !entry.signature.trim()) {
        toast.error("All planned care entries must have details and signature");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await createNewVersion({
        previousCarePlanId: carePlan.formId as Id<"carePlanAssessments">,
        identifiedNeeds: identifiedNeeds.trim(),
        aims: aims.trim(),
        plannedCareDate: plannedCareEntries,
        userId: currentUser.user.id,
        writtenBy: currentUser.user.name
      });

      toast.success(
        "Care plan updated successfully! A new version has been created."
      );

      // Reset modified state and close the sheet after successful update
      setHasModified(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating care plan:", error);
      toast.error("Failed to update care plan. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
        className="z-[60] overflow-y-auto flex flex-col justify-start"
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
                {carePlanData.previousCarePlanId && (
                  <div className="text-orange-500 text-xs italic w-full bg-orange-50 px-2 py-1 rounded-md mt-1">
                    Previous versions of this care plan can be found under
                    documentation.
                  </div>
                )}
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
              <Textarea
                value={aims}
                onChange={(e) => {
                  setAims(e.target.value);
                  setHasModified(true);
                }}
                className="w-full"
                placeholder="Enter care plan aims..."
              />
            </div>

            {/* Identified Needs */}
            <div className="flex flex-row justify-between items-center gap-2 mt-4">
              <p className="text-muted-foreground text-sm font-medium">
                Identified Needs
              </p>
            </div>
            <div className="flex flex-col justify-start items-start gap-1">
              <Textarea
                value={identifiedNeeds}
                onChange={(e) => {
                  setIdentifiedNeeds(e.target.value);
                  setHasModified(true);
                }}
                className="w-full"
                placeholder="Enter identified needs..."
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
                        <Popover
                          open={openDatePickers[index] || false}
                          onOpenChange={(open) => {
                            setOpenDatePickers(prev => ({ ...prev, [index]: open }));
                          }}
                          modal
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              type="button"
                              className={cn(
                                "w-full justify-start text-left font-normal text-sm h-9",
                                !entry.date && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-3 w-3" />
                              {entry.date ? (
                                format(new Date(entry.date), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={entry.date ? new Date(entry.date) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  handleUpdateEntry(index, "date", date.getTime());
                                  setOpenDatePickers(prev => ({ ...prev, [index]: false }));
                                }
                              }}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(23, 59, 59, 999);
                                return date > today;
                              }}
                              captionLayout="dropdown"
                              defaultMonth={entry.date ? new Date(entry.date) : new Date()}
                              startMonth={new Date(new Date().getFullYear() - 1, 0)}
                              endMonth={new Date()}
                            />
                          </PopoverContent>
                        </Popover>
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

            <Button
              className="mt-4"
              onClick={handleUpdateCarePlan}
              disabled={isSubmitting || !hasModified}
            >
              {isSubmitting ? "Updating..." : "Update Care Plan"}
            </Button>
            <Separator className="my-4" />

            {/* Evaluations Section */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-row justify-between items-center gap-2">
                <p className="text-muted-foreground text-sm font-medium">
                  Evaluations
                </p>
                {!showEvaluationForm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEvaluationForm(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Evaluation
                  </Button>
                )}
              </div>

              {showEvaluationForm && (
                <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {currentUser?.user?.name || "Unknown User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(), "dd MMMM yyyy 'at' HH:mm")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">
                      Comments
                    </label>
                    <Textarea
                      value={evaluationComments}
                      onChange={(e) => setEvaluationComments(e.target.value)}
                      placeholder="Enter evaluation comments..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmitEvaluation}
                      disabled={isSubmitting || !evaluationComments.trim()}
                      size="sm"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Evaluation"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEvaluationForm(false);
                        setEvaluationComments("");
                      }}
                      disabled={isSubmitting}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Display existing evaluations */}
              {evaluations && evaluations.length > 0 && (
                <div className="space-y-3 mt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Previous Evaluations
                  </p>
                  {evaluations.map((evaluation) => (
                    <div
                      key={evaluation._id}
                      className="rounded-lg border p-4 bg-background space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(evaluation.evaluationDate),
                            "dd MMMM yyyy 'at' HH:mm"
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {evaluation.comments}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {evaluations &&
                evaluations.length === 0 &&
                !showEvaluationForm && (
                  <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg">
                    No evaluations yet. Click &quot;New Evaluation&quot; to
                    create one.
                  </div>
                )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
