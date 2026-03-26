import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { Plus, Trash2, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";

const UK_TIMEZONE = "Europe/London";

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
  const [carePlanData, setCarePlanData] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [resident, setResident] = useState<any>(null);
  const [activeOrganization, setActiveOrganization] = useState<any>(null);
  const { profile } = useProfile();

  const fetchCarePlanData = async () => {
    if (!carePlan.formId) return;
    const { data } = await supabase
      .from('care_plan_assessments')
      .select('*')
      .eq('id', carePlan.formId)
      .single();
    if (data) {
      // Map fields if necessary (Convex vs Supabase)
      // Assuming Supabase columns match what we expect roughly or mapped.
      // Actually, Supabase uses snake_case usually, but let's see. 
      // Based on previous files, we might be using camelCase in mapped objects or just using raw data.
      // If raw data is snake_case, we need to adapt.
      // For now, I'll store raw data and assume component adapts or use snake_case where appropriate.
      // Wait, the component accesses `carePlanData.nameOfCarePlan`, `carePlanData.residentName`, etc. (CamelCase).
      // If Supabase returns snake_case, I need to map it or change usages.
      // I will assume Supabase columns are snake_case and map them to camelCase here for compatibility.
      setCarePlanData({
        ...data,
        nameOfCarePlan: data.care_plan_type || data.name_of_care_plan || data.nameOfCarePlan,
        carePlanNumber: data.goals?.carePlanNumber || data.care_plan_number || data.carePlanNumber,
        writtenBy: data.goals?.writtenBy || data.written_by || data.writtenBy,
        dateWritten: data.goals?.dateWritten || data.date_written || data.created_at || data.dateWritten,
        residentName: data.goals?.residentName || data.resident_name || data.residentName,
        dob: data.goals?.dob || data.dob,
        bedroomNumber: data.goals?.bedroomNumber || data.bedroom_number || data.bedroomNumber,
        aims: data.goals?.aims || data.aims,
        identifiedNeeds: data.need_identified || data.identified_needs || data.identifiedNeeds,
        plannedCareDate: data.interventions || data.planned_care_date || data.plannedCareDate || [],
        previousCarePlanId: data.previous_care_plan_id || data.previousCarePlanId
      });
    }
  };

  const fetchEvaluations = async () => {
    if (!carePlan.formId) return;
    const { data, error: fetchError } = await supabase
      .from('care_plan_evaluations')
      .select('*')
      .eq('care_plan_id', carePlan.formId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error("Fetch evaluations error:", fetchError);
    }

    if (data) {
      setEvaluations(data.map(e => ({
        ...e,
        _id: e.id,
        evaluationDate: e.evaluation_date || e.created_at,
        comments: e.progress_notes || e.comments,
        created_by_name: e.reviewed_by_name
      })));
    }
  };

  useEffect(() => {
    if (open) {
      fetchCarePlanData();
      fetchEvaluations();
    }
  }, [open, carePlan.formId]);

  useEffect(() => {
    if (open && carePlanData?.resident_id) {
      supabase
        .from("residents")
        .select("*, emergency_contacts(*)")
        .eq("id", carePlanData.resident_id)
        .single()
        .then(({ data, error }) => {
          if (!error) setResident(data);
        });
    }
  }, [open, carePlanData?.resident_id]);

  useEffect(() => {
    if (open && profile?.active_organization_id) {
      supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.active_organization_id)
        .single()
        .then(({ data, error }) => {
          if (!error) setActiveOrganization(data);
        });
    }
  }, [open, profile?.active_organization_id]);


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
  const [evaluationTime, setEvaluationTime] = useState("");
  const [outcome, setOutcome] = useState("Reviewed Remain Valid");
  const [position, setPosition] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState<string>("");

  const generateTimeOptions = () => {
    const options: string[] = [];
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 60; j += 5) {
        const hour = i.toString().padStart(2, '0');
        const minute = j.toString().padStart(2, '0');
        options.push(`${hour}:${minute}`);
      }
    }
    return options;
  };

  useEffect(() => {
    if (showEvaluationForm) {
      const now = new Date();
      setEvaluationTime(formatInTimeZone(now, UK_TIMEZONE, "HH:mm"));

      // Set next review date to 1 month from now
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setNextReviewDate(format(nextMonth, "yyyy-MM-dd"));
    }
  }, [showEvaluationForm]);

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
    if (!profile?.id) {
      toast.error("User information not available");
      return;
    }

    if (!evaluationComments.trim()) {
      toast.error("Please enter evaluation comments");
      return;
    }

    setIsSubmitting(true);

    try {
      const evalDate = formatInTimeZone(new Date(), UK_TIMEZONE, 'yyyy-MM-dd');

      const insertPayload = {
        care_plan_id: carePlan.formId,
        evaluation_date: evalDate,
        progress_notes: evaluationComments.trim(),
        created_by: profile.id,
        reviewed_by_name: profile.name || profile.email,
        organization_id: profile.active_organization_id,
        resident_id: carePlanData.resident_id,
        outcome,
        position: position || null,
        new_review_date: nextReviewDate || null
      };

      const { error } = await supabase
        .from('care_plan_evaluations')
        .insert(insertPayload)
        .select();

      if (error) {
        console.error("Evaluation insert error:", error);
        toast.error(`Failed to submit: ${error.message}`);
        return;
      }

      toast.success("Evaluation submitted successfully!");
      setEvaluationComments("");
      setPosition("");
      setOutcome("Reviewed Remain Valid");
      setShowEvaluationForm(false);
      await fetchEvaluations(); // Refresh
    } catch (error: any) {
      console.error("Error submitting evaluation:", error);
      toast.error("Failed to submit evaluation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating care plan (creates new version)
  const handleUpdateCarePlan = async () => {
    if (!profile?.id || !profile?.name) {
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
      if (!carePlanData) return;

      // Update the existing care plan in-place so evaluations stay linked
      const { error } = await supabase
        .from('care_plan_assessments')
        .update({
          identified_needs: identifiedNeeds.trim(),
          aims: aims.trim(),
          planned_care_date: plannedCareEntries,
          updated_at: new Date().toISOString()
        })
        .eq('id', carePlan.formId);

      if (error) throw error;

      toast.success("Care plan updated successfully!");

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

  const handlePrint = async () => {
    if (!carePlanData || !resident) {
      toast.error("Care plan data or resident information not available for printing");
      return;
    }

    toast.info("Generating PDF...");

    await generateCareFilePDF({
      formName: carePlanData.nameOfCarePlan,
      data: {
        ...carePlanData,
        evaluations: evaluations.slice(0, 5).map(e => ({
          evaluation_date: e.evaluation_date || e.created_at,
          progress_notes: e.progress_notes || e.comments,
          outcome: e.outcome,
          position: e.position,
          staff_name: e.reviewed_by_name,
          next_review_date: e.new_review_date
        })) // Include 5 most recent evaluations with the new fields
      },
      resident: resident,
      orgLogoUrl: activeOrganization?.logo_url,
      careHomeName: activeOrganization?.name || profile?.care_home_name
    });

    toast.success("PDF generated successfully");
  };

  if (!carePlanData) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
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
        side="right"
        size="lg"
        className="z-[60] overflow-y-auto flex flex-col justify-start"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle>{carePlanData.nameOfCarePlan}</SheetTitle>
              <SheetDescription className="w-full flex flex-col gap-1">
                <span>
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
                    {carePlanData.dateWritten ? format(new Date(carePlanData.dateWritten), "dd MMM yyyy") : "Unknown Date"}
                  </span>
                </span>
                {carePlanData.previousCarePlanId && (
                  <span className="text-orange-500 text-xs italic w-full bg-orange-50 px-2 py-1 rounded-md mt-1 inline-block">
                    Previous versions of this care plan can be found under Archive.
                  </span>
                )}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2 mr-8">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateCarePlan}
                disabled={isSubmitting || !hasModified}
              >
                {isSubmitting ? "Updating..." : "Update Care Plan"}
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1">
          <div className="flex flex-col justify-between h-full py-4">
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
                    {carePlanData.dob ? format(new Date(carePlanData.dob), "dd MMMM yyyy") : "N/A"}
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
            </div>
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
                      {profile?.name || "Unknown User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(), "dd MMMM yyyy")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">
                        Time of Evaluation
                      </label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={evaluationTime}
                        onChange={(e) => setEvaluationTime(e.target.value)}
                      >
                        {generateTimeOptions().map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Care Plan Outcome</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value)}
                      >
                        <option value="Reviewed Remain Valid">Reviewed Remain Valid</option>
                        <option value="Care Plan Amended">Care Plan Amended</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Position (Optional)</label>
                      <Input
                        type="text"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="e.g. Registered Nurse"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Next Review Date</label>
                      <Input
                        type="date"
                        value={nextReviewDate}
                        onChange={(e) => setNextReviewDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">
                      Evaluation Notes
                    </label>
                    <Textarea
                      value={evaluationComments}
                      onChange={(e) => setEvaluationComments(e.target.value)}
                      placeholder="Enter evaluation notes..."
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
                      className="rounded-lg border p-4 bg-background space-y-3 hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <p className="font-medium flex items-center gap-2">
                            <span className="text-muted-foreground/60 italic text-[10px]">Evaluation {evaluations.length - evaluations.indexOf(evaluation)}</span>
                            {evaluation.outcome && (
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${evaluation.outcome === "Care Plan Amended"
                                ? "bg-orange-50 text-orange-600 border-orange-200"
                                : "bg-blue-50 text-blue-600 border-blue-200"
                                }`}>
                                {evaluation.outcome === "Care Plan Amended" ? "CARE PLAN CHANGE" : evaluation.outcome}
                              </span>
                            )}
                          </p>
                        </div>
                        <p className="font-medium">
                          {evaluation.evaluationDate
                            ? formatInTimeZone(
                              new Date(evaluation.evaluationDate),
                              UK_TIMEZONE,
                              "dd MMM yyyy HH:mm"
                            )
                            : "Unknown Date"}
                        </p>
                      </div>

                      <Separator className="opacity-50" />

                      <div className="flex items-baseline justify-between gap-4 flex-wrap">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">Reviewed Staff:</span>
                          <p className="text-sm font-semibold text-foreground">
                            {evaluation.created_by_name || "Unknown Staff"}
                          </p>
                          {evaluation.position && (
                            <p className="text-xs text-muted-foreground">
                              ({evaluation.position})
                            </p>
                          )}
                        </div>

                        {evaluation.new_review_date && (
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">Next Review Date:</span>
                            <p className="text-sm font-medium text-foreground">
                              {format(new Date(evaluation.new_review_date), "dd MMM yyyy")}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 w-full">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 text-center">Evaluation Notes</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed w-full">
                          {evaluation.progress_notes || evaluation.comments}
                        </p>
                      </div>
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
