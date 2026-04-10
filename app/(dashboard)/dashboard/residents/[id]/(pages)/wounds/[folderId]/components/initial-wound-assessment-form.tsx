"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Save,
  Loader2,
  AlertTriangle,
  Edit,
  Trash2,
  Printer,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateInitialWoundAssessmentPDF } from "@/lib/initial-wound-assessment-pdf-utils";
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

// --- Zod Schema ---
const InitialWoundAssessmentSchema = z.object({
  // Header
  assessmentDate: z.date(),
  assessmentCompletedBy: z.string().min(1, "Assessor name required"),

  // WOUND Section
  dateWoundOccurred: z.date().optional(),
  woundLocation: z.string().min(1, "Wound location required"),
  typeOfWound: z.string().min(1, "Type of wound required"),

  // WOUND SIZE (CM)
  maximumLength: z.string().optional(),
  maximumWidth: z.string().optional(),
  maximumDepth: z.string().optional(),

  // WOUND BED (%)
  necroticPercentage: z.number().min(0).max(100).optional(),
  sloughyPercentage: z.number().min(0).max(100).optional(),
  granulationPercentage: z.number().min(0).max(100).optional(),
  epithelialisationPercentage: z.number().min(0).max(100).optional(),
  evidenceOfInfection: z.enum(["yes", "no"]),

  // EXUDATE
  exudateType: z.string().optional(),
  exudateColour: z.string().optional(),
  exudateVolume: z.enum(["high", "moderate", "low"]).optional(),
  anyMalodourNoted: z.enum(["yes", "no"]),

  // WOUND MARGIN
  woundMarginColour: z.string().optional(),
  anyOedema: z.enum(["yes", "no"]),
  anyHeat: z.enum(["yes", "no"]),
  surroundingErythema: z.enum(["yes", "no"]),
  maxDistanceFromMargin: z.string().optional(),
  conditionOfSurroundingSkin: z.string().optional(),

  // PAIN
  anyPainFromWound: z.enum(["yes", "no"]),
  painSeverity: z.number().min(1).max(10).optional(),
  painFrequency: z.string().optional(),

  // Documentation Checklist
  woundPhotographed: z.enum(["yes", "no"]),
  bodyMapCompleted: z.enum(["yes", "no"]),
  woundSwabSent: z.enum(["yes", "no"]),
  bradenReevaluated: z.enum(["yes", "no"]),
  bradenScore: z.number().optional(),
  mustScore: z.number().optional(),
});

type InitialWoundAssessmentFormValues = z.infer<typeof InitialWoundAssessmentSchema>;

type Props = {
  woundFolderId: string;
  residentId: string;
  residentName: string;
  residentDOB?: string;
  orgLogoUrl?: string;
  woundNumber?: number;
  assessments?: Array<any>;
  isLoadingAssessments?: boolean;
  onSaved?: () => void;
};

export function InitialWoundAssessmentForm({
  woundFolderId,
  residentId,
  residentName,
  residentDOB,
  orgLogoUrl,
  woundNumber,
  assessments = [],
  isLoadingAssessments = false,
  onSaved,
}: Props) {
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Show form if no assessments exist, in edit mode, or no assessment selected
  const showNewForm = (assessments.length === 0 && !selectedAssessmentId) || isEditMode;

  // Auto-select first assessment if it exists
  React.useEffect(() => {
    if (assessments.length > 0 && !selectedAssessmentId) {
      setSelectedAssessmentId(assessments[0].id);
    }
  }, [assessments, selectedAssessmentId]);

  const form = useForm<InitialWoundAssessmentFormValues>({
    resolver: zodResolver(InitialWoundAssessmentSchema),
    defaultValues: {
      assessmentDate: new Date(),
      assessmentCompletedBy: profile?.name || "",
      woundLocation: "",
      typeOfWound: "",
      maximumLength: "",
      maximumWidth: "",
      maximumDepth: "",
      necroticPercentage: undefined,
      sloughyPercentage: undefined,
      granulationPercentage: undefined,
      epithelialisationPercentage: undefined,
      evidenceOfInfection: "no",
      exudateType: "",
      exudateColour: "",
      exudateVolume: "low",
      anyMalodourNoted: "no",
      woundMarginColour: "",
      anyOedema: "no",
      anyHeat: "no",
      surroundingErythema: "no",
      maxDistanceFromMargin: "",
      conditionOfSurroundingSkin: "",
      anyPainFromWound: "no",
      painSeverity: undefined,
      painFrequency: "",
      woundPhotographed: "no",
      bodyMapCompleted: "no",
      woundSwabSent: "no",
      bradenReevaluated: "no",
      bradenScore: undefined,
      mustScore: undefined,
    },
  });

  // Calculate total tissue percentage (for display only, no validation)
  const tissuePercentages = form.watch([
    "necroticPercentage",
    "sloughyPercentage",
    "granulationPercentage",
    "epithelialisationPercentage",
  ]);
  const totalPercentage: number = tissuePercentages.reduce((sum, val) => (sum ?? 0) + (val ?? 0), 0) as number;

  // Watch for infection evidence
  const evidenceOfInfection = form.watch("evidenceOfInfection");
  const hasInfection = evidenceOfInfection === "yes";

  // Watch for pain
  const anyPainFromWound = form.watch("anyPainFromWound");

  // View selected assessment (define this before useEffect that uses it)
  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);

  // Update assessor name when profile loads
  React.useEffect(() => {
    if (profile?.name && !form.getValues("assessmentCompletedBy")) {
      form.setValue("assessmentCompletedBy", profile.name);
    }
  }, [profile?.name, form]);

  // Populate form when entering edit mode
  React.useEffect(() => {
    if (isEditMode && selectedAssessment) {
      form.reset({
        assessmentDate: selectedAssessment.assessment_date ? new Date(selectedAssessment.assessment_date) : new Date(),
        assessmentCompletedBy: selectedAssessment.assessment_completed_by || "",
        dateWoundOccurred: selectedAssessment.date_wound_occurred ? new Date(selectedAssessment.date_wound_occurred) : undefined,
        woundLocation: selectedAssessment.wound_location || "",
        typeOfWound: selectedAssessment.type_of_wound || "",
        maximumLength: selectedAssessment.maximum_length?.toString() || "",
        maximumWidth: selectedAssessment.maximum_width?.toString() || "",
        maximumDepth: selectedAssessment.maximum_depth?.toString() || "",
        necroticPercentage: selectedAssessment.necrotic_percentage ?? undefined,
        sloughyPercentage: selectedAssessment.sloughy_percentage ?? undefined,
        granulationPercentage: selectedAssessment.granulation_percentage ?? undefined,
        epithelialisationPercentage: selectedAssessment.epithelialisation_percentage ?? undefined,
        evidenceOfInfection: selectedAssessment.evidence_of_infection ? "yes" : "no",
        exudateType: selectedAssessment.exudate_type || "",
        exudateColour: selectedAssessment.exudate_colour || "",
        exudateVolume: selectedAssessment.exudate_volume || "low",
        anyMalodourNoted: selectedAssessment.any_malodour_noted ? "yes" : "no",
        woundMarginColour: selectedAssessment.wound_margin_colour || "",
        anyOedema: selectedAssessment.any_oedema ? "yes" : "no",
        anyHeat: selectedAssessment.any_heat ? "yes" : "no",
        surroundingErythema: selectedAssessment.surrounding_erythema ? "yes" : "no",
        maxDistanceFromMargin: selectedAssessment.max_distance_from_margin?.toString() || "",
        conditionOfSurroundingSkin: selectedAssessment.condition_of_surrounding_skin || "",
        anyPainFromWound: selectedAssessment.any_pain_from_wound ? "yes" : "no",
        painSeverity: selectedAssessment.pain_severity ?? undefined,
        painFrequency: selectedAssessment.pain_frequency || "",
        woundPhotographed: selectedAssessment.wound_photographed ? "yes" : "no",
        bodyMapCompleted: selectedAssessment.body_map_completed ? "yes" : "no",
        woundSwabSent: selectedAssessment.wound_swab_sent ? "yes" : "no",
        bradenReevaluated: selectedAssessment.braden_reevaluated ? "yes" : "no",
        bradenScore: selectedAssessment.braden_score ?? undefined,
        mustScore: selectedAssessment.must_score ?? undefined,
      });
    }
  }, [isEditMode, selectedAssessment, form]);

  const onSubmit = async (data: InitialWoundAssessmentFormValues) => {
    console.log("=== Form Submission Started ===");
    console.log("Form Data:", data);

    setIsSubmitting(true);

    try {
      console.log("Profile:", profile);
      console.log("Folder ID:", woundFolderId);
      console.log("Resident ID:", residentId);

      // Check if required data exists
      if (!profile?.id) {
        toast.error("User profile not loaded. Please refresh the page.");
        setIsSubmitting(false);
        return;
      }

      if (!profile?.active_organization_id) {
        toast.error("No active organization found. Please select an organization.");
        setIsSubmitting(false);
        return;
      }

      console.log(isEditMode ? "Updating data in database..." : "Inserting data into database...");

      // Prepare assessment data
      const assessmentData = {
        wound_folder_id: woundFolderId,
        resident_id: residentId,
        organization_id: profile?.active_organization_id,
        care_home_id: profile?.active_care_home_id,

        // Header
        assessment_date: format(data.assessmentDate, "yyyy-MM-dd"),
        assessment_completed_by: data.assessmentCompletedBy,

        // WOUND Section
        date_wound_occurred: data.dateWoundOccurred ? format(data.dateWoundOccurred, "yyyy-MM-dd") : null,
        wound_location: data.woundLocation,
        type_of_wound: data.typeOfWound,

        // WOUND SIZE
        maximum_length: data.maximumLength ? parseFloat(data.maximumLength) : null,
        maximum_width: data.maximumWidth ? parseFloat(data.maximumWidth) : null,
        maximum_depth: data.maximumDepth ? parseFloat(data.maximumDepth) : null,

        // WOUND BED
        necrotic_percentage: data.necroticPercentage ?? 0,
        sloughy_percentage: data.sloughyPercentage ?? 0,
        granulation_percentage: data.granulationPercentage ?? 0,
        epithelialisation_percentage: data.epithelialisationPercentage ?? 0,
        evidence_of_infection: data.evidenceOfInfection === "yes",

        // EXUDATE
        exudate_type: data.exudateType,
        exudate_colour: data.exudateColour,
        exudate_volume: data.exudateVolume,
        any_malodour_noted: data.anyMalodourNoted === "yes",

        // WOUND MARGIN
        wound_margin_colour: data.woundMarginColour,
        any_oedema: data.anyOedema === "yes",
        any_heat: data.anyHeat === "yes",
        surrounding_erythema: data.surroundingErythema === "yes",
        max_distance_from_margin: data.maxDistanceFromMargin ? parseFloat(data.maxDistanceFromMargin) : null,
        condition_of_surrounding_skin: data.conditionOfSurroundingSkin,

        // PAIN
        any_pain_from_wound: data.anyPainFromWound === "yes",
        pain_severity: data.painSeverity ?? null,
        pain_frequency: data.painFrequency,

        // Documentation Checklist
        wound_photographed: data.woundPhotographed === "yes",
        body_map_completed: data.bodyMapCompleted === "yes",
        wound_swab_sent: data.woundSwabSent === "yes",
        braden_reevaluated: data.bradenReevaluated === "yes",
        braden_score: data.bradenScore ?? null,
        must_score: data.mustScore ?? null,

        // Audit fields
        recorded_by: profile?.id,
      };

      // Save to database (insert or update)
      let dbError;
      if (isEditMode && selectedAssessmentId) {
        const { error } = await supabase
          .from("initial_wound_assessments")
          .update(assessmentData)
          .eq("id", selectedAssessmentId);
        dbError = error;
      } else {
        const { error } = await supabase
          .from("initial_wound_assessments")
          .insert(assessmentData);
        dbError = error;
      }

      if (dbError) {
        console.error("=== Database Error ===");
        console.error("Full error object:", dbError);

        const errorMessage = dbError?.message || "Unknown database error";
        const errorCode = dbError?.code || "UNKNOWN";
        const errorDetails = dbError?.details || "No details";
        const errorHint = dbError?.hint || "No hint";

        console.error("Error Message:", errorMessage);
        console.error("Error Code:", errorCode);
        console.error("Error Details:", errorDetails);
        console.error("Error Hint:", errorHint);

        // Show user-friendly error
        if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
          toast.error("Database table not found. Please run the migration first.", {
            duration: 10000,
            description: "Check Supabase SQL Editor",
          });
        } else if (errorMessage.includes("could not find")) {
          toast.error("Database table 'initial_wound_assessments' not found", {
            duration: 10000,
            description: "Please run the SQL migration in Supabase Dashboard",
          });
        } else {
          toast.error(`Database error: ${errorMessage}`, {
            duration: 10000,
          });
        }
        throw new Error(errorMessage);
      }

      console.log("✓ Successfully saved to database");
      toast.success(isEditMode ? "Assessment updated successfully" : "Initial wound assessment saved successfully");

      // Create notification if infection detected (only on new assessments)
      if (hasInfection && !isEditMode) {
        await supabase.from("notifications").insert({
          organization_id: profile?.active_organization_id,
          care_home_id: profile?.active_care_home_id,
          type: "wound_infection_alert",
          title: "Infection Detected - Initial Assessment",
          message: `Initial wound assessment for ${residentName} shows evidence of infection at ${data.woundLocation}`,
          link: `/dashboard/residents/${residentId}/wounds/${woundFolderId}`,
        });
      }

      // Reset form and exit edit mode
      form.reset();
      setIsEditMode(false);

      if (onSaved) onSaved();

      // Don't hide form, let the parent component handle navigation
    } catch (error) {
      console.error("=== Caught Error ===");
      console.error("Error type:", typeof error);
      console.error("Error value:", error);

      if (error && typeof error === 'object' && 'message' in error) {
        console.error("Error message:", (error as Error).message);
        toast.error(`Failed to save: ${(error as Error).message}`, {
          duration: 8000,
        });
      } else {
        console.error("Unknown error:", String(error));
        toast.error("Failed to save initial wound assessment", {
          duration: 8000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete assessment
  const handleDelete = async () => {
    if (!selectedAssessmentId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("initial_wound_assessments")
        .delete()
        .eq("id", selectedAssessmentId);

      if (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete assessment");
        return;
      }

      toast.success("Assessment deleted successfully");
      setSelectedAssessmentId(null);
      setShowDeleteDialog(false);

      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error deleting assessment:", error);
      toast.error("An error occurred while deleting");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit button click
  const handleEdit = () => {
    setIsEditMode(true);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditMode(false);
    form.reset();
  };

  const handlePrintAssessment = async () => {
    if (!selectedAssessment) return;

    try {
      await generateInitialWoundAssessmentPDF({
        residentName,
        residentDOB,
        orgLogoUrl,
        woundNumber,
        assessment: selectedAssessment,
      });
    } catch (error) {
      console.error("Failed to generate initial wound assessment PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const formatDateValue = (value?: string | null, pattern = "dd-MM-yyyy"): string => {
    if (!value) return "N/A";
    return format(new Date(value), pattern);
  };

  const formatTextValue = (value?: string | null): string => {
    if (!value) return "N/A";
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "N/A";
  };

  const formatNumberValue = (
    value?: number | string | null,
    suffix?: string
  ): string => {
    if (value === null || value === undefined || value === "") return "N/A";
    return suffix ? `${value} ${suffix}` : `${value}`;
  };

  const formatYesNo = (value?: boolean | null): "Yes" | "No" => {
    return value === true ? "Yes" : "No";
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-5xl mx-auto p-6">
        {/* Loading state */}
        {isLoadingAssessments && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Selected Assessment Viewer - Show existing assessment */}
        {!isLoadingAssessments && selectedAssessmentId && selectedAssessment && !isEditMode && (
          <div className="bg-white border rounded-lg shadow-sm print:shadow-none print:border-none print:rounded-none print:text-[11px] print:leading-tight">
            {/* Header with Action Buttons */}
            <div className="border-b bg-slate-50 px-6 py-4 print:px-3 print:py-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <h1 className="text-2xl font-bold text-center flex-1 border-2 border-black py-2">INITIAL WOUND ASSESSMENT</h1>
                  {woundNumber && (
                    <Badge variant="outline" className="font-mono font-semibold text-base">
                      Wound #{woundNumber}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 ml-4 print:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintAssessment}
                    className="gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Name of Resident:</span> {residentName}
                </div>
                <div>
                  <span className="font-semibold">Date of Birth:</span> {residentDOB ? format(new Date(residentDOB), "dd-MM-yyyy") : "N/A"}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-0 print:px-3 print:py-2">
              {/* Assessment Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-xs font-semibold">Assessment Completed by:</span>
                  <p className="text-sm mt-1">{formatTextValue(selectedAssessment.assessment_completed_by)}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold">Date:</span>
                  <p className="text-sm mt-1">{formatDateValue(selectedAssessment.assessment_date)}</p>
                </div>
              </div>

              {/* WOUND Section */}
              <div className="border-2 border-black">
                <div className="bg-slate-100 border-b-2 border-black px-3 py-1">
                  <div className="grid grid-cols-2">
                    <div className="font-bold text-sm">WOUND</div>
                    <div className="font-bold text-sm">DETAILS OF WOUND</div>
                  </div>
                </div>

                <div className="divide-y divide-gray-300">
                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Date wound occurred/noted</div>
                    <div className="px-3 py-1.5 text-xs">{formatDateValue(selectedAssessment.date_wound_occurred, "dd/MM/yyyy")}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Wound location</div>
                    <div className="px-3 py-1.5 text-xs">{formatTextValue(selectedAssessment.wound_location)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Type of wound</div>
                    <div className="px-3 py-1.5 text-xs">{formatTextValue(selectedAssessment.type_of_wound)}</div>
                  </div>
                </div>

                {/* WOUND SIZE */}
                <div className="bg-slate-100 border-y-2 border-black px-3 py-1">
                  <div className="font-bold text-sm text-center">WOUND SIZE (CM)</div>
                </div>

                <div className="divide-y divide-gray-300">
                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Maximum length</div>
                    <div className="px-3 py-1.5 text-xs">{formatNumberValue(selectedAssessment.maximum_length, "cm")}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Maximum width</div>
                    <div className="px-3 py-1.5 text-xs">{formatNumberValue(selectedAssessment.maximum_width, "cm")}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Maximum depth</div>
                    <div className="px-3 py-1.5 text-xs">{formatNumberValue(selectedAssessment.maximum_depth, "cm")}</div>
                  </div>
                </div>

                {/* WOUND BED */}
                <div className="bg-slate-100 border-y-2 border-black px-3 py-1">
                  <div className="font-bold text-sm text-center">WOUND BED (%)</div>
                </div>

                <div className="divide-y divide-gray-300">
                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Necrotic</div>
                    <div className="px-3 py-1.5 text-xs">{selectedAssessment.necrotic_percentage ?? 0}%</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Sloughy</div>
                    <div className="px-3 py-1.5 text-xs">{selectedAssessment.sloughy_percentage ?? 0}%</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Granulation</div>
                    <div className="px-3 py-1.5 text-xs">{selectedAssessment.granulation_percentage ?? 0}%</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Epithelialisation</div>
                    <div className="px-3 py-1.5 text-xs">{selectedAssessment.epithelialisation_percentage ?? 0}%</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Evidence of Infection (Y/N)</div>
                    <div className="px-3 py-1.5 text-xs font-semibold">{formatYesNo(selectedAssessment.evidence_of_infection)}</div>
                  </div>
                </div>

                {/* EXUDATE */}
                <div className="bg-slate-100 border-y-2 border-black px-3 py-1">
                  <div className="font-bold text-sm text-center">EXUDATE</div>
                </div>

                <div className="divide-y divide-gray-300">
                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Type</div>
                    <div className="px-3 py-1.5 text-xs">{formatTextValue(selectedAssessment.exudate_type)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Colour</div>
                    <div className="px-3 py-1.5 text-xs">{formatTextValue(selectedAssessment.exudate_colour)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Volume (high/mod/low)</div>
                    <div className="px-3 py-1.5 text-xs capitalize">{formatTextValue(selectedAssessment.exudate_volume)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Any Malodour noted?(Y/N)</div>
                    <div className="px-3 py-1.5 text-xs">{formatYesNo(selectedAssessment.any_malodour_noted)}</div>
                  </div>
                </div>

                {/* WOUND MARGIN */}
                <div className="bg-slate-100 border-y-2 border-black px-3 py-1">
                  <div className="font-bold text-sm text-center">WOUND MARGIN</div>
                </div>

                <div className="divide-y divide-gray-300">
                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Colour</div>
                    <div className="px-3 py-1.5 text-xs">{formatTextValue(selectedAssessment.wound_margin_colour)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Any Oedema? (Y/N)</div>
                    <div className="px-3 py-1.5 text-xs">{formatYesNo(selectedAssessment.any_oedema)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Any Heat? (Y/N)</div>
                    <div className="px-3 py-1.5 text-xs">{formatYesNo(selectedAssessment.any_heat)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Is there surrounding erythema? (Y/N)</div>
                    <div className="px-3 py-1.5 text-xs">{formatYesNo(selectedAssessment.surrounding_erythema)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Maximum distance from wound margin (cm)</div>
                    <div className="px-3 py-1.5 text-xs">{formatNumberValue(selectedAssessment.max_distance_from_margin, "cm")}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Condition of surrounding skin</div>
                    <div className="px-3 py-1.5 text-xs">{formatTextValue(selectedAssessment.condition_of_surrounding_skin)}</div>
                  </div>
                </div>

                {/* PAIN */}
                <div className="bg-slate-100 border-y-2 border-black px-3 py-1">
                  <div className="font-bold text-sm text-center">PAIN</div>
                </div>

                <div className="divide-y divide-gray-300">
                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Any pain from wound?</div>
                    <div className="px-3 py-1.5 text-xs">{formatYesNo(selectedAssessment.any_pain_from_wound)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Severity (1-10)</div>
                    <div className="px-3 py-1.5 text-xs">{formatNumberValue(selectedAssessment.pain_severity)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Frequency</div>
                    <div className="px-3 py-1.5 text-xs">{formatTextValue(selectedAssessment.pain_frequency)}</div>
                  </div>
                </div>
              </div>

              {/* Documentation Checklist */}
              <div className="border-2 border-black mt-6">
                <div className="divide-y divide-gray-300">
                  <div className="grid grid-cols-2">
                    <div className="px-3 py-2 text-xs font-medium border-r border-gray-300 bg-gray-50"></div>
                    <div className="px-3 py-2 text-xs font-bold text-center bg-gray-50">COMPLETED</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Wound photographed?</div>
                    <div className="px-3 py-1.5 text-xs">{formatYesNo(selectedAssessment.wound_photographed)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Body Map completed?</div>
                    <div className="px-3 py-1.5 text-xs">{formatYesNo(selectedAssessment.body_map_completed)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Wound swab sent?</div>
                    <div className="px-3 py-1.5 text-xs">{formatYesNo(selectedAssessment.wound_swab_sent)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Braden re-evaluated</div>
                    <div className="px-3 py-1.5 text-xs">{formatYesNo(selectedAssessment.braden_reevaluated)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">Braden Score</div>
                    <div className="px-3 py-1.5 text-xs">{formatNumberValue(selectedAssessment.braden_score)}</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300 bg-gray-50">MUST score</div>
                    <div className="px-3 py-1.5 text-xs">{formatNumberValue(selectedAssessment.must_score)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg print:hidden">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Initial assessment has been completed. Only one initial assessment is allowed per wound folder.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* New Assessment Form - Plain Document Style */}
        {!isLoadingAssessments && showNewForm && (
          <div className="bg-white border rounded-lg shadow-sm">
            {/* Header */}
            <div className="border-b bg-slate-50 px-6 py-4">
              {isEditMode && (
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    <Edit className="w-3 h-3 mr-1" />
                    Edit Mode
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-2xl font-bold text-center border-2 border-black py-2 flex-1">INITIAL WOUND ASSESSMENT</h1>
                {woundNumber && (
                  <Badge variant="outline" className="font-mono font-semibold text-base">
                    Wound #{woundNumber}
                  </Badge>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Name of Resident:</span> {residentName}
                </div>
                <div>
                  <span className="font-semibold">Date of Birth:</span> {residentDOB ? format(new Date(residentDOB), "dd-MM-yyyy") : "N/A"}
                </div>
              </div>
            </div>

            {hasInfection && (
              <div className="mx-6 mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-900 text-sm">Evidence of Infection Noted</p>
                    <p className="text-xs text-orange-800 mt-1">
                      Clinical review recommended. Consider wound swab and GP/Tissue Viability consultation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Form {...form}>
              <form
                onSubmit={(e) => {
                  console.log("Form submit event triggered");
                  form.handleSubmit(
                    (data) => {
                      console.log("Form validation passed");
                      onSubmit(data);
                    },
                    (errors) => {
                      console.log("=== Form Validation Errors ===", errors);
                      toast.error("Please fill in all required fields", {
                        description: Object.keys(errors).join(", "),
                      });
                    }
                  )(e);
                }}
              >
                <div className="p-6 space-y-0">
                  {/* Assessment Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <FormField
                      control={form.control}
                      name="assessmentCompletedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold">Assessment Completed by:</FormLabel>
                          <FormControl>
                            <Input className="h-8 text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assessmentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold">Date:</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "h-8 text-sm w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(field.value, "dd-MM-yyyy") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* WOUND Section */}
                  <div className="border-2 border-black">
                    <div className="bg-slate-100 border-b-2 border-black px-3 py-1">
                      <div className="grid grid-cols-2">
                        <div className="font-bold text-sm">WOUND</div>
                        <div className="font-bold text-sm">DETAILS OF WOUND</div>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-300">
                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Date wound occurred/noted</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="dateWoundOccurred"
                            render={({ field }) => (
                              <FormItem>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="ghost"
                                        className={cn(
                                          "h-6 text-xs w-full justify-start text-left font-normal p-0 hover:bg-transparent",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? format(field.value, "dd/MM/yyyy") : <span>Select date</span>}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => date > new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Wound location</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="woundLocation"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input className="h-6 text-xs border-0 p-0 focus-visible:ring-0" placeholder="Enter location" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Type of wound</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="typeOfWound"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input className="h-6 text-xs border-0 p-0 focus-visible:ring-0" placeholder="Enter type" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* WOUND SIZE */}
                    <div className="bg-slate-100 border-y-2 border-black px-3 py-1">
                      <div className="font-bold text-sm text-center">WOUND SIZE (CM)</div>
                    </div>

                    <div className="divide-y divide-gray-300">
                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Maximum length</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="maximumLength"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="number" step="0.1" className="h-6 text-xs border-0 p-0 focus-visible:ring-0" placeholder="0.0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Maximum width</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="maximumWidth"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="number" step="0.1" className="h-6 text-xs border-0 p-0 focus-visible:ring-0" placeholder="0.0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Maximum depth</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="maximumDepth"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="number" step="0.1" className="h-6 text-xs border-0 p-0 focus-visible:ring-0" placeholder="0.0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* WOUND BED */}
                    <div className="bg-slate-100 border-y-2 border-black px-3 py-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-center flex-1">WOUND BED (%)</div>
                        {totalPercentage > 0 && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                            Total: {totalPercentage}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="divide-y divide-gray-300">
                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Necrotic</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="necroticPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                    placeholder=""
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Sloughy</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="sloughyPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                    placeholder=""
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Granulation</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="granulationPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                    placeholder=""
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Epithelialisation</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="epithelialisationPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                    placeholder=""
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Evidence of Infection (Y/N)</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="evidenceOfInfection"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="yes" id="infection-yes" className="h-3 w-3" />
                                      <Label htmlFor="infection-yes" className="text-xs font-normal">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="no" id="infection-no" className="h-3 w-3" />
                                      <Label htmlFor="infection-no" className="text-xs font-normal">No</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* EXUDATE */}
                    <div className="bg-slate-100 border-y-2 border-black px-3 py-1">
                      <div className="font-bold text-sm text-center">EXUDATE</div>
                    </div>

                    <div className="divide-y divide-gray-300">
                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Type</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="exudateType"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input className="h-6 text-xs border-0 p-0 focus-visible:ring-0" placeholder="e.g., Serous" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Colour</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="exudateColour"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input className="h-6 text-xs border-0 p-0 focus-visible:ring-0" placeholder="e.g., Clear" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Volume (high/mod/low)</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="exudateVolume"
                            render={({ field }) => (
                              <FormItem>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-6 text-xs border-0 p-0 focus:ring-0">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="high" className="text-xs">High</SelectItem>
                                    <SelectItem value="moderate" className="text-xs">Moderate</SelectItem>
                                    <SelectItem value="low" className="text-xs">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Any Malodour noted?(Y/N)</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="anyMalodourNoted"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="yes" id="malodour-yes" className="h-3 w-3" />
                                      <Label htmlFor="malodour-yes" className="text-xs font-normal">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="no" id="malodour-no" className="h-3 w-3" />
                                      <Label htmlFor="malodour-no" className="text-xs font-normal">No</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* WOUND MARGIN */}
                    <div className="bg-slate-100 border-y-2 border-black px-3 py-1">
                      <div className="font-bold text-sm text-center">WOUND MARGIN</div>
                    </div>

                    <div className="divide-y divide-gray-300">
                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Colour</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="woundMarginColour"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input className="h-6 text-xs border-0 p-0 focus-visible:ring-0" placeholder="e.g., Pink" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Any Oedema? (Y/N)</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="anyOedema"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="yes" id="oedema-yes" className="h-3 w-3" />
                                      <Label htmlFor="oedema-yes" className="text-xs font-normal">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="no" id="oedema-no" className="h-3 w-3" />
                                      <Label htmlFor="oedema-no" className="text-xs font-normal">No</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Any Heat? (Y/N)</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="anyHeat"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="yes" id="heat-yes" className="h-3 w-3" />
                                      <Label htmlFor="heat-yes" className="text-xs font-normal">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="no" id="heat-no" className="h-3 w-3" />
                                      <Label htmlFor="heat-no" className="text-xs font-normal">No</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Is there surrounding erythema? (Y/N)</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="surroundingErythema"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="yes" id="erythema-yes" className="h-3 w-3" />
                                      <Label htmlFor="erythema-yes" className="text-xs font-normal">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="no" id="erythema-no" className="h-3 w-3" />
                                      <Label htmlFor="erythema-no" className="text-xs font-normal">No</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Maximum distance of from wound margin (cm)</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="maxDistanceFromMargin"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="number" step="0.1" className="h-6 text-xs border-0 p-0 focus-visible:ring-0" placeholder="0.0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Condition of surrounding skin</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="conditionOfSurroundingSkin"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea className="min-h-[50px] text-xs border-0 p-0 focus-visible:ring-0 resize-none" placeholder="Describe..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* PAIN */}
                    <div className="bg-slate-100 border-y-2 border-black px-3 py-1">
                      <div className="font-bold text-sm text-center">PAIN</div>
                    </div>

                    <div className="divide-y divide-gray-300">
                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Any pain from wound?</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="anyPainFromWound"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="yes" id="pain-yes" className="h-3 w-3" />
                                      <Label htmlFor="pain-yes" className="text-xs font-normal">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="no" id="pain-no" className="h-3 w-3" />
                                      <Label htmlFor="pain-no" className="text-xs font-normal">No</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Severity (1-10)</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="painSeverity"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                    placeholder="1-10"
                                    disabled={anyPainFromWound === "no"}
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Frequency</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="painFrequency"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input className="h-6 text-xs border-0 p-0 focus-visible:ring-0" placeholder="e.g., Constant" disabled={anyPainFromWound === "no"} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documentation Checklist */}
                  <div className="border-2 border-black mt-6">
                    <div className="divide-y divide-gray-300">
                      <div className="grid grid-cols-2">
                        <div className="px-3 py-2 text-xs font-medium border-r border-gray-300"></div>
                        <div className="px-3 py-2 text-xs font-bold text-center">DATE & SIGNATURE</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Wound photographed?</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="woundPhotographed"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="yes" id="photo-yes" className="h-3 w-3" />
                                      <Label htmlFor="photo-yes" className="text-xs font-normal">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="no" id="photo-no" className="h-3 w-3" />
                                      <Label htmlFor="photo-no" className="text-xs font-normal">No</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Body Map completed?</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="bodyMapCompleted"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="yes" id="bodymap-yes" className="h-3 w-3" />
                                      <Label htmlFor="bodymap-yes" className="text-xs font-normal">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="no" id="bodymap-no" className="h-3 w-3" />
                                      <Label htmlFor="bodymap-no" className="text-xs font-normal">No</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Wound swab sent?</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="woundSwabSent"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="yes" id="swab-yes" className="h-3 w-3" />
                                      <Label htmlFor="swab-yes" className="text-xs font-normal">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="no" id="swab-no" className="h-3 w-3" />
                                      <Label htmlFor="swab-no" className="text-xs font-normal">No</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Braden re-evaluated</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="bradenReevaluated"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="yes" id="braden-yes" className="h-3 w-3" />
                                      <Label htmlFor="braden-yes" className="text-xs font-normal">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <RadioGroupItem value="no" id="braden-no" className="h-3 w-3" />
                                      <Label htmlFor="braden-no" className="text-xs font-normal">No</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">Braden Score</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="bradenScore"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                    placeholder="Score"
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">MUST score</div>
                        <div className="px-3 py-1.5">
                          <FormField
                            control={form.control}
                            name="mustScore"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                    placeholder="Score"
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="border-t px-6 py-4 bg-slate-50 flex justify-end gap-3">
                  {isEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                      size="lg"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting} size="lg">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isEditMode ? "Updating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isEditMode ? "Update Assessment" : "Save Initial Assessment"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Initial Assessment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this initial wound assessment. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}
