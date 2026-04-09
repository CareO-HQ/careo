"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Save, Loader2, FileText, Download, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from "jspdf";

// Schema for a single assessment
const SingleAssessmentSchema = z.object({
  assessmentDate: z.date().optional(),
  woundNumber: z.string().optional(),
  analgesiaRequired: z.boolean().optional(),
  regularOngoingAnalgesia: z.boolean().optional(),
  preDressingOnly: z.boolean().optional(),
  length: z.string().optional(),
  width: z.string().optional(),
  depth: z.string().optional(),
  trackingUndermining: z.boolean().optional(),
  photographTakenDate: z.date().optional(),
  necrotic: z.boolean().optional(),
  sloughy: z.boolean().optional(),
  granulating: z.boolean().optional(),
  epithelialising: z.boolean().optional(),
  hypergranulating: z.boolean().optional(),
  haematoma: z.boolean().optional(),
  boneTendon: z.boolean().optional(),
  exudateLow: z.boolean().optional(),
  exudateModerate: z.boolean().optional(),
  exudateHigh: z.boolean().optional(),
  exudateSerous: z.boolean().optional(),
  exudateHaemoserous: z.boolean().optional(),
  exudatePurulent: z.boolean().optional(),
  macerated: z.boolean().optional(),
  oedematous: z.boolean().optional(),
  erythema: z.boolean().optional(),
  excoriated: z.boolean().optional(),
  fragile: z.boolean().optional(),
  dryScaly: z.boolean().optional(),
  healthyIntact: z.boolean().optional(),
  heat: z.boolean().optional(),
  newSloughNecrosis: z.boolean().optional(),
  increasingPain: z.boolean().optional(),
  increasingExudate: z.boolean().optional(),
  increasingOdour: z.boolean().optional(),
  friableGranulation: z.boolean().optional(),
  debridement: z.boolean().optional(),
  absorption: z.boolean().optional(),
  hydration: z.boolean().optional(),
  protection: z.boolean().optional(),
  palliativeConservative: z.boolean().optional(),
  assessorInitials: z.string().optional(),
  dressingRenewed: z.boolean().optional(),
  reassessmentDate: z.date().optional(),
});

// Schema for 5 assessments
const WoundAssessmentSchema = z.object({
  assessments: z.array(SingleAssessmentSchema).length(5),
});

type WoundAssessmentFormValues = z.infer<typeof WoundAssessmentSchema>;
type GroupRow =
  | { type: "section"; label: string }
  | { type: "field"; label: string; key: string; valueType: "boolean" | "date" | "text" };

type Props = {
  woundFolderId: string;
  residentId: string;
  residentName: string;
  residentDOB?: string;
  woundNumber?: number;
  assessments?: any[];
  isLoadingAssessments?: boolean;
  onSaved?: () => void;
};

// --- Sub-components for Form Fields ---

/**
 * A reusable date picker component for assessment form cells.
 * This component handles its own state for the popover to avoid "rules-of-hooks" 
 * violations when used inside FormField render callbacks.
 */
const AssessmentDatePicker = ({ 
  field, 
  isSaved, 
  disabledMatcher 
}: { 
  field: any, 
  isSaved: boolean, 
  disabledMatcher?: (date: Date) => boolean 
}) => {
  const [open, setOpen] = React.useState(false);
  return (
    <FormItem>
      <Popover open={open && !isSaved} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="ghost"
              className={cn(
                "h-7 text-xs w-full justify-start p-1",
                !field.value && "text-muted-foreground"
              )}
              disabled={isSaved}
            >
              {field.value ? (
                format(field.value, "dd/MM/yyyy")
              ) : (
                <span>Pick date</span>
              )}
              <CalendarIcon className="ml-auto h-3 w-3" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        {!isSaved && (
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={field.value}
              onSelect={(date) => {
                field.onChange(date);
                setOpen(false);
              }}
              disabled={disabledMatcher}
            />
          </PopoverContent>
        )}
      </Popover>
      <FormMessage />
    </FormItem>
  );
};

export function WoundAssessmentForm({
  woundFolderId,
  residentId,
  residentName,
  residentDOB,
  woundNumber,
  onSaved,
}: Props) {
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previousSheets, setPreviousSheets] = useState<any[][]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const currentAssessmentNumber = assessments.length + 1;

  const form = useForm<WoundAssessmentFormValues>({
    resolver: zodResolver(WoundAssessmentSchema),
    defaultValues: {
      assessments: Array(5).fill(null).map(() => ({
        assessmentDate: undefined,
        woundNumber: woundNumber?.toString() || "",
        analgesiaRequired: false,
        regularOngoingAnalgesia: false,
        preDressingOnly: false,
        length: "",
        width: "",
        depth: "",
        trackingUndermining: false,
        photographTakenDate: undefined,
        necrotic: false,
        sloughy: false,
        granulating: false,
        epithelialising: false,
        hypergranulating: false,
        haematoma: false,
        boneTendon: false,
        exudateLow: false,
        exudateModerate: false,
        exudateHigh: false,
        exudateSerous: false,
        exudateHaemoserous: false,
        exudatePurulent: false,
        macerated: false,
        oedematous: false,
        erythema: false,
        excoriated: false,
        fragile: false,
        dryScaly: false,
        healthyIntact: false,
        heat: false,
        newSloughNecrosis: false,
        increasingPain: false,
        increasingExudate: false,
        increasingOdour: false,
        friableGranulation: false,
        debridement: false,
        absorption: false,
        hydration: false,
        protection: false,
        palliativeConservative: false,
        assessorInitials: profile?.name || "",
        dressingRenewed: false,
        reassessmentDate: undefined,
      })),
    },
  });

  // Fetch existing assessments and populate the form
  useEffect(() => {
    fetchAssessments();
  }, [woundFolderId]);

  // Update wound number for all assessments when woundNumber prop changes
  useEffect(() => {
    if (woundNumber) {
      const currentAssessments = form.getValues('assessments');
      // Only update if assessments exist and don't have wound numbers set
      const hasEmptyWoundNumbers = currentAssessments.some(a => !a.woundNumber);
      if (hasEmptyWoundNumbers) {
        currentAssessments.forEach((_, index) => {
          form.setValue(`assessments.${index}.woundNumber`, woundNumber.toString());
        });
      }
    }
  }, [woundNumber]);

  useEffect(() => {
    const fetchOrgLogo = async () => {
      if (!profile?.active_organization_id) return;
      const { data, error } = await supabase
        .from("organizations")
        .select("logo_url")
        .eq("id", profile.active_organization_id)
        .single();
      if (!error && data?.logo_url) {
        setOrgLogoUrl(data.logo_url);
      }
    };
    fetchOrgLogo();
  }, [profile?.active_organization_id]);

  const fetchAssessments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("wound_assessments")
        .select("*")
        .eq("wound_folder_id", woundFolderId)
        .order("assessment_date", { ascending: false });

      if (!error && data) {
        console.log("Fetched assessments:", data.length);

        // Populate form with the most recent 5 assessments
        const newSavedSet = new Set<number>();
        const first5 = data.slice(0, 5);

        console.log("First 5 assessments to load:", first5.length);

        // Get the most recent assessor initials to carry forward
        const lastAssessorInitials = first5.length > 0 && first5[first5.length - 1]?.assessor_initials
          ? first5[first5.length - 1].assessor_initials
          : (data.length > 0 && data[0]?.assessor_initials ? data[0].assessor_initials : profile?.name || "");

        // First, reset any empty slots to default values
        for (let i = 0; i < 5; i++) {
          if (i >= first5.length) {
            form.setValue(`assessments.${i}`, {
              assessmentDate: undefined,
              woundNumber: woundNumber?.toString() || "",
              analgesiaRequired: false,
              regularOngoingAnalgesia: false,
              preDressingOnly: false,
              length: "",
              width: "",
              depth: "",
              trackingUndermining: false,
              photographTakenDate: undefined,
              necrotic: false,
              sloughy: false,
              granulating: false,
              epithelialising: false,
              hypergranulating: false,
              haematoma: false,
              boneTendon: false,
              exudateLow: false,
              exudateModerate: false,
              exudateHigh: false,
              exudateSerous: false,
              exudateHaemoserous: false,
              exudatePurulent: false,
              macerated: false,
              oedematous: false,
              erythema: false,
              excoriated: false,
              fragile: false,
              dryScaly: false,
              healthyIntact: false,
              heat: false,
              newSloughNecrosis: false,
              increasingPain: false,
              increasingExudate: false,
              increasingOdour: false,
              friableGranulation: false,
              debridement: false,
              absorption: false,
              hydration: false,
              protection: false,
              palliativeConservative: false,
              assessorInitials: lastAssessorInitials,
              dressingRenewed: false,
              reassessmentDate: undefined,
            });
          }
        }

        // Now populate with saved assessments
        first5.forEach((assessment, index) => {
          const formData = {
            assessmentDate: assessment.assessment_date ? new Date(assessment.assessment_date) : undefined,
            woundNumber: assessment.wound_number || "",
            analgesiaRequired: assessment.analgesia_required || false,
            regularOngoingAnalgesia: assessment.regular_ongoing_analgesia || false,
            preDressingOnly: assessment.pre_dressing_only || false,
            length: assessment.length_cm?.toString() || "",
            width: assessment.width_cm?.toString() || "",
            depth: assessment.depth_cm?.toString() || "",
            trackingUndermining: assessment.tracking_undermining || false,
            photographTakenDate: assessment.photograph_taken_date ? new Date(assessment.photograph_taken_date) : undefined,
            necrotic: assessment.necrotic || false,
            sloughy: assessment.sloughy || false,
            granulating: assessment.granulating || false,
            epithelialising: assessment.epithelialising || false,
            hypergranulating: assessment.hypergranulating || false,
            haematoma: assessment.haematoma || false,
            boneTendon: assessment.bone_tendon || false,
            exudateLow: assessment.exudate_low || false,
            exudateModerate: assessment.exudate_moderate || false,
            exudateHigh: assessment.exudate_high || false,
            exudateSerous: assessment.exudate_serous || false,
            exudateHaemoserous: assessment.exudate_haemoserous || false,
            exudatePurulent: assessment.exudate_purulent || false,
            macerated: assessment.macerated || false,
            oedematous: assessment.oedematous || false,
            erythema: assessment.erythema || false,
            excoriated: assessment.excoriated || false,
            fragile: assessment.fragile || false,
            dryScaly: assessment.dry_scaly || false,
            healthyIntact: assessment.healthy_intact || false,
            heat: assessment.heat || false,
            newSloughNecrosis: assessment.new_slough_necrosis || false,
            increasingPain: assessment.increasing_pain || false,
            increasingExudate: assessment.increasing_exudate || false,
            increasingOdour: assessment.increasing_odour || false,
            friableGranulation: assessment.friable_granulation || false,
            debridement: assessment.debridement || false,
            absorption: assessment.absorption || false,
            hydration: assessment.hydration || false,
            protection: assessment.protection || false,
            palliativeConservative: assessment.palliative_conservative || false,
            assessorInitials: assessment.assessor_initials || "",
            dressingRenewed: assessment.dressing_renewed || false,
            reassessmentDate: assessment.reassessment_date ? new Date(assessment.reassessment_date) : undefined,
          };

          form.setValue(`assessments.${index}`, formData);
          newSavedSet.add(index);
        });

        console.log("newSavedSet after populating:", Array.from(newSavedSet));

        // Update all states together to trigger a single re-render
        setAssessments(data);
        setSavedAssessments(newSavedSet);

        // Group all saved assessments into sets of 7 for history display
        const remaining = data;
        const sheets: any[][] = [];
        for (let i = 0; i < remaining.length; i += 7) {
          sheets.push(remaining.slice(i, i + 7));
        }
        setPreviousSheets(sheets);

        // Always keep the editable form as a fresh single assessment entry.
        const latestAssessorInitials =
          data.length > 0 && data[0]?.assessor_initials
            ? data[0].assessor_initials
            : profile?.name || "";
        setSavedAssessments(new Set());
        form.reset({
          assessments: Array(5).fill(null).map(() => ({
            assessmentDate: undefined,
            woundNumber: woundNumber?.toString() || "",
            analgesiaRequired: false,
            regularOngoingAnalgesia: false,
            preDressingOnly: false,
            length: "",
            width: "",
            depth: "",
            trackingUndermining: false,
            photographTakenDate: undefined,
            necrotic: false,
            sloughy: false,
            granulating: false,
            epithelialising: false,
            hypergranulating: false,
            haematoma: false,
            boneTendon: false,
            exudateLow: false,
            exudateModerate: false,
            exudateHigh: false,
            exudateSerous: false,
            exudateHaemoserous: false,
            exudatePurulent: false,
            macerated: false,
            oedematous: false,
            erythema: false,
            excoriated: false,
            fragile: false,
            dryScaly: false,
            healthyIntact: false,
            heat: false,
            newSloughNecrosis: false,
            increasingPain: false,
            increasingExudate: false,
            increasingOdour: false,
            friableGranulation: false,
            debridement: false,
            absorption: false,
            hydration: false,
            protection: false,
            palliativeConservative: false,
            assessorInitials: latestAssessorInitials,
            dressingRenewed: false,
            reassessmentDate: undefined,
          })),
        });
      }
    } catch (err) {
      console.error("Error fetching assessments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<Set<number>>(new Set());

  const saveIndividualAssessment = async (index: number) => {
    if (!profile?.active_organization_id) {
      toast.error("No active organization found");
      return;
    }

    const assessment = form.getValues(`assessments.${index}`);

    console.log("Saving assessment at index:", index);
    console.log("Assessment data:", assessment);
    console.log("Assessment date:", assessment.assessmentDate);
    console.log("Assessment date type:", typeof assessment.assessmentDate);
    console.log("Is Date?", assessment.assessmentDate instanceof Date);

    // Validate assessment date more thoroughly
    if (!assessment.assessmentDate || !(assessment.assessmentDate instanceof Date)) {
      toast.error("Please select an assessment date");
      return;
    }

    setSavingIndex(index);

    try {
      const { error: dbError } = await supabase.from("wound_assessments").insert({
        wound_folder_id: woundFolderId,
        resident_id: residentId,
        organization_id: profile.active_organization_id,
        assessment_date: assessment.assessmentDate
          ? format(assessment.assessmentDate, "yyyy-MM-dd")
          : null,
        wound_number: assessment.woundNumber || null,
        // Analgesia required - not used (empty field)
        analgesia_required: false,
        regular_ongoing_analgesia: assessment.regularOngoingAnalgesia || false,
        pre_dressing_only: assessment.preDressingOnly || false,
        length_cm: assessment.length ? parseFloat(assessment.length) : null,
        width_cm: assessment.width ? parseFloat(assessment.width) : null,
        depth_cm: assessment.depth ? parseFloat(assessment.depth) : null,
        tracking_undermining: assessment.trackingUndermining || false,
        photograph_taken_date: assessment.photographTakenDate
          ? format(assessment.photographTakenDate, "yyyy-MM-dd")
          : null,
        necrotic: assessment.necrotic || false,
        sloughy: assessment.sloughy || false,
        granulating: assessment.granulating || false,
        epithelialising: assessment.epithelialising || false,
        hypergranulating: assessment.hypergranulating || false,
        haematoma: assessment.haematoma || false,
        bone_tendon: assessment.boneTendon || false,
        exudate_low: assessment.exudateLow || false,
        exudate_moderate: assessment.exudateModerate || false,
        exudate_high: assessment.exudateHigh || false,
        exudate_serous: assessment.exudateSerous || false,
        exudate_haemoserous: assessment.exudateHaemoserous || false,
        exudate_purulent: assessment.exudatePurulent || false,
        macerated: assessment.macerated || false,
        oedematous: assessment.oedematous || false,
        erythema: assessment.erythema || false,
        excoriated: assessment.excoriated || false,
        fragile: assessment.fragile || false,
        dry_scaly: assessment.dryScaly || false,
        healthy_intact: assessment.healthyIntact || false,
        heat: assessment.heat || false,
        new_slough_necrosis: assessment.newSloughNecrosis || false,
        increasing_pain: assessment.increasingPain || false,
        increasing_exudate: assessment.increasingExudate || false,
        increasing_odour: assessment.increasingOdour || false,
        friable_granulation: assessment.friableGranulation || false,
        debridement: assessment.debridement || false,
        absorption: assessment.absorption || false,
        hydration: assessment.hydration || false,
        protection: assessment.protection || false,
        palliative_conservative: assessment.palliativeConservative || false,
        assessor_initials: assessment.assessorInitials || "",
        dressing_renewed: assessment.dressingRenewed || false,
        reassessment_date: assessment.reassessmentDate
          ? format(assessment.reassessmentDate, "yyyy-MM-dd")
          : null,
        recorded_by: profile.id,
      });

      if (dbError) {
        console.error("Database error:", dbError);
        toast.error(`Failed to save: ${dbError.message}`);
        return;
      }

      // Update wound folder's next review date if reassessment date is provided
      if (assessment.reassessmentDate) {
        const { error: folderError } = await supabase
          .from("wound_folders")
          .update({
            next_review_date: format(assessment.reassessmentDate, "yyyy-MM-dd"),
          })
          .eq("id", woundFolderId);

        if (folderError) {
          console.error("Failed to update folder next review date:", folderError);
          // Don't fail the whole operation, just log the error
        }
      }

      toast.success("Assessment saved successfully");

      // Refetch assessments to update the UI
      await fetchAssessments();

      // Notify parent component if callback provided
      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      console.error("Error saving assessment:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setSavingIndex(null);
    }
  };

  // Debug logging
  console.log("Saved assessments count:", savedAssessments.size);
  console.log("Saved assessments:", Array.from(savedAssessments));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderGroupCell = (
    group: any[],
    colIdx: number,
    key: string,
    type: "boolean" | "date" | "text" = "text",
  ) => {
    const item = group[colIdx];
    if (!item) return "-";

    if (type === "boolean") return item[key] ? "✓" : "-";
    if (type === "date") {
      return item[key] ? format(new Date(item[key]), "dd/MM/yyyy") : "-";
    }
    return item[key] ?? "-";
  };

  const downloadGroupPdf = async (groupIndex: number, start: number, end: number) => {
    try {
      const group = previousSheets[groupIndex] ?? [];

      const rows: GroupRow[] = [
        { type: "field", label: "Date of Assessment", key: "assessment_date", valueType: "date" },
        { type: "field", label: "Wound Number", key: "wound_number", valueType: "text" },
        { type: "field", label: "Regular/on-going analgesia", key: "regular_ongoing_analgesia", valueType: "boolean" },
        { type: "field", label: "Pre-dressing only", key: "pre_dressing_only", valueType: "boolean" },
        { type: "section", label: "Wound Dimensions" },
        { type: "field", label: "Length (cm/mm)", key: "length_cm", valueType: "text" },
        { type: "field", label: "Width (cm/mm)", key: "width_cm", valueType: "text" },
        { type: "field", label: "Depth (cm/mm)", key: "depth_cm", valueType: "text" },
        { type: "field", label: "Tracking/undermining", key: "tracking_undermining", valueType: "boolean" },
        { type: "field", label: "Photograph taken date", key: "photograph_taken_date", valueType: "date" },
        { type: "section", label: "Tissue type on wound bed" },
        { type: "field", label: "Necrotic (Black)", key: "necrotic", valueType: "boolean" },
        { type: "field", label: "Sloughy (Yellow/Green)", key: "sloughy", valueType: "boolean" },
        { type: "field", label: "Granulating (Red)", key: "granulating", valueType: "boolean" },
        { type: "field", label: "Epithelialising (Pink)", key: "epithelialising", valueType: "boolean" },
        { type: "field", label: "Hypergranulating (Red)", key: "hypergranulating", valueType: "boolean" },
        { type: "field", label: "Haematoma", key: "haematoma", valueType: "boolean" },
        { type: "field", label: "Bone/tendon", key: "bone_tendon", valueType: "boolean" },
        { type: "section", label: "Wound exudate levels/type" },
        { type: "field", label: "Low", key: "exudate_low", valueType: "boolean" },
        { type: "field", label: "Moderate", key: "exudate_moderate", valueType: "boolean" },
        { type: "field", label: "High", key: "exudate_high", valueType: "boolean" },
        { type: "field", label: "Serous (Straw)", key: "exudate_serous", valueType: "boolean" },
        { type: "field", label: "Haemoserous (Red/Straw)", key: "exudate_haemoserous", valueType: "boolean" },
        { type: "field", label: "Purulent (Green/Brown/Yellow)", key: "exudate_purulent", valueType: "boolean" },
        { type: "section", label: "Peri-wound skin" },
        { type: "field", label: "Macerated (White)", key: "macerated", valueType: "boolean" },
        { type: "field", label: "Oedematous", key: "oedematous", valueType: "boolean" },
        { type: "field", label: "Erythema (Red)", key: "erythema", valueType: "boolean" },
        { type: "field", label: "Excoriated (Red)", key: "excoriated", valueType: "boolean" },
        { type: "field", label: "Fragile", key: "fragile", valueType: "boolean" },
        { type: "field", label: "Dry/scaly", key: "dry_scaly", valueType: "boolean" },
        { type: "field", label: "Healthy/intact", key: "healthy_intact", valueType: "boolean" },
        { type: "section", label: "Signs of infection" },
        { type: "field", label: "Heat", key: "heat", valueType: "boolean" },
        { type: "field", label: "New slough/necrosis", key: "new_slough_necrosis", valueType: "boolean" },
        { type: "field", label: "Increasing pain", key: "increasing_pain", valueType: "boolean" },
        { type: "field", label: "Increasing exudate", key: "increasing_exudate", valueType: "boolean" },
        { type: "field", label: "Increasing odour", key: "increasing_odour", valueType: "boolean" },
        { type: "field", label: "Friable granulation tissue", key: "friable_granulation", valueType: "boolean" },
        { type: "section", label: "Treatment objectives" },
        { type: "field", label: "Debridement", key: "debridement", valueType: "boolean" },
        { type: "field", label: "Absorption", key: "absorption", valueType: "boolean" },
        { type: "field", label: "Hydration", key: "hydration", valueType: "boolean" },
        { type: "field", label: "Protection", key: "protection", valueType: "boolean" },
        { type: "field", label: "Palliative / conservative", key: "palliative_conservative", valueType: "boolean" },
        { type: "field", label: "Assessor Initials", key: "assessor_initials", valueType: "text" },
        { type: "field", label: "Dressing renewed", key: "dressing_renewed", valueType: "boolean" },
        { type: "field", label: "Re-assessment date", key: "reassessment_date", valueType: "date" },
      ];

      const getCellValue = (row: GroupRow, colIdx: number): string => {
        if (row.type === "section") return "";
        const item = group[colIdx];
        if (!item) return "-";
        if (row.valueType === "boolean") return item[row.key] ? "Yes" : "-";
        if (row.valueType === "date") {
          return item[row.key] ? format(new Date(item[row.key]), "dd/MM/yyyy") : "-";
        }
        return item[row.key] ? String(item[row.key]) : "-";
      };

      const pdf = new jsPDF("landscape", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pdfWidth - margin * 2;
      const labelWidth = 56;
      const colWidth = (contentWidth - labelWidth) / 7;
      let y = margin;

      const drawBorder = () => {
        pdf.setDrawColor(22, 163, 74);
        pdf.setLineWidth(0.7);
        pdf.rect(margin, margin, contentWidth, pdfHeight - margin * 2);
      };

      drawBorder();

      if (orgLogoUrl) {
        try {
          const response = await fetch(orgLogoUrl, { mode: "cors", credentials: "omit" });
          if (response.ok) {
            const blob = await response.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error("logo read failed"));
              reader.readAsDataURL(blob);
            });
            const logoW = 22;
            const logoH = 12;
            pdf.addImage(dataUrl, "PNG", pdfWidth - margin - logoW - 2, y + 1, logoW, logoH);
          }
        } catch {
          // Ignore logo failures and continue.
        }
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(22, 101, 52);
      pdf.text("Ongoing Wound Assessment (Appendix H)", margin + 2, y + 6);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.setTextColor(75, 85, 99);
      pdf.text(`Assessments ${start} to ${end}`, margin + 2, y + 11);
      y += 16;

      const baseRowHeight = 6.3;
      const baseSectionHeight = 6.3;
      const baseHeaderHeight = 7.2;
      const staticHeaderHeight = y - margin;
      const variableHeight =
        baseHeaderHeight +
        rows.reduce(
          (acc, row) => acc + (row.type === "section" ? baseSectionHeight : baseRowHeight),
          0
        );
      const availableVariableHeight = pdfHeight - margin - staticHeaderHeight - 2;
      const fitScale = Math.min(1, availableVariableHeight / variableHeight);

      const rowHeight = Math.max(3.6, baseRowHeight * fitScale);
      const sectionHeight = Math.max(3.8, baseSectionHeight * fitScale);
      const headerHeight = Math.max(4.2, baseHeaderHeight * fitScale);
      const headerFontSize = Math.max(8, 10.8 * fitScale);
      const bodyFontSize = Math.max(7.4, 9.6 * fitScale);

      const drawHeaderRow = () => {
        pdf.setFillColor(243, 244, 246);
        pdf.rect(margin, y, contentWidth, headerHeight, "F");
        pdf.setDrawColor(209, 213, 219);
        pdf.rect(margin, y, contentWidth, headerHeight);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(headerFontSize);
        pdf.setTextColor(31, 41, 55);
        pdf.text("Field", margin + 2, y + headerHeight * 0.68);
        for (let i = 0; i < 7; i++) {
          const x = margin + labelWidth + i * colWidth;
          pdf.line(x, y, x, y + headerHeight);
          pdf.text(`A${start + i}`, x + colWidth / 2, y + headerHeight * 0.68, { align: "center" });
        }
        y += headerHeight;
      };

      drawHeaderRow();

      rows.forEach((row) => {
        if (row.type === "section") {
          pdf.setFillColor(229, 231, 235);
          pdf.rect(margin, y, contentWidth, sectionHeight, "F");
          pdf.setDrawColor(209, 213, 219);
          pdf.rect(margin, y, contentWidth, sectionHeight);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(Math.max(6.2, bodyFontSize));
          pdf.setTextColor(31, 41, 55);
          pdf.text(row.label, margin + 2, y + sectionHeight * 0.7);
          y += sectionHeight;
          return;
        }

        pdf.setDrawColor(229, 231, 235);
        pdf.rect(margin, y, contentWidth, rowHeight);
        pdf.line(margin + labelWidth, y, margin + labelWidth, y + rowHeight);
        for (let i = 1; i < 7; i++) {
          const x = margin + labelWidth + i * colWidth;
          pdf.line(x, y, x, y + rowHeight);
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(bodyFontSize);
        pdf.setTextColor(17, 24, 39);
        pdf.text(row.label, margin + 1.2, y + rowHeight * 0.7);

        for (let i = 0; i < 7; i++) {
          const x = margin + labelWidth + i * colWidth;
          const value = getCellValue(row, i);
          pdf.text(value, x + colWidth / 2, y + rowHeight * 0.7, { align: "center" });
        }
        y += rowHeight;
      });

      pdf.save(`wound-assessments-${start}-${end}.pdf`);
      toast.success(`Downloaded assessments ${start}-${end} PDF`);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  const toggleGroupCollapse = (groupIndex: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupIndex)) {
        next.delete(groupIndex);
      } else {
        next.add(groupIndex);
      }
      return next;
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-full mx-auto p-6">
        <div className="bg-white border-2 border-gray-300">
          {/* Header */}
          <div className="border-b-2 border-gray-300 p-4 bg-gray-50">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-center">
                Ongoing Wound Assessment (Appendix H)
              </h1>
              {woundNumber && (
                <Badge variant="outline" className="font-mono font-semibold text-base">
                  Wound #{woundNumber}
                </Badge>
              )}
            </div>
            <p className="text-xs text-center text-gray-600">
              Complete on initial assessment and at every dressing change
              thereafter
            </p>
            {/* Progress Indicator */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-gray-700">
                Assessments Completed:
              </span>
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-green-500 text-white">
                  {Math.max(currentAssessmentNumber - 1, 0)}
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-700">
                (Next: {currentAssessmentNumber})
              </span>
            </div>
          </div>

          {/* Resident Information */}
          <div className="grid grid-cols-2 border-b-2 border-gray-300">
            <div className="border-r-2 border-gray-300 p-2">
              <span className="text-xs font-semibold">Resident name: </span>
              <span className="text-xs">{residentName}</span>
            </div>
            <div className="p-2">
              <span className="text-xs font-semibold">Date of Birth: </span>
              <span className="text-xs">
                {residentDOB ? format(new Date(residentDOB), "dd/MM/yyyy") : "N/A"}
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()}>
              {/* Column Headers */}
              <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300 border-b-2 border-gray-300 bg-gray-100">
                <div className="p-2"></div>
                {[0].map((idx) => (
                  <div key={idx} className="p-2 text-center font-bold text-xs">
                    Assessment {currentAssessmentNumber}
                  </div>
                ))}
              </div>

              {/* Table structure */}
              <div className="divide-y divide-gray-300">
                {/* Date of Assessment Row */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Date of Assessment
                  </div>
                  {[0].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.assessmentDate`}
                        render={({ field }) => (
                          <AssessmentDatePicker 
                            field={field} 
                            isSaved={savedAssessments.has(index)} 
                            disabledMatcher={(date) => date > new Date()}
                          />
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Wound Number Row */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Wound Number
                  </div>
                  {[0].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.woundNumber`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="h-7 text-xs border-0 p-1 bg-gray-50"
                                placeholder="#"
                                readOnly
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Analgesia required */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Analgesia required
                    <div className="text-[10px] text-gray-500 font-normal">
                      (Refer to pain assessment tool)
                    </div>
                  </div>
                  {[0].map((index) => (
                    <div key={index} className="p-2">
                      {/* Empty cell - no input required */}
                    </div>
                  ))}
                </div>

                {/* Regular/on-going analgesia */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">
                    Regular/on-going analgesia
                  </div>
                  {[0].map((index) => (
                    <div key={index} className="p-2 flex justify-center">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.regularOngoingAnalgesia`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={savedAssessments.has(index)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Pre-dressing only */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">Pre-dressing only</div>
                  {[0].map((index) => (
                    <div key={index} className="p-2 flex justify-center">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.preDressingOnly`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={savedAssessments.has(index)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Wound Dimensions Header */}
                <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                  Wound Dimensions (enter size)
                </div>

                {/* Length */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">Length (cm/mm)</div>
                  {[0].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.length`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="h-7 text-xs border-0 p-1"
                                placeholder="e.g., 2.5"
                                type="number"
                                step="0.1"
                                readOnly={savedAssessments.has(index)}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Width */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">Width (cm/mm)</div>
                  {[0].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.width`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="h-7 text-xs border-0 p-1"
                                placeholder="e.g., 1.5"
                                type="number"
                                step="0.1"
                                readOnly={savedAssessments.has(index)}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Depth */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">Depth (cm/mm)</div>
                  {[0].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.depth`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="h-7 text-xs border-0 p-1"
                                placeholder="e.g., 0.5"
                                type="number"
                                step="0.1"
                                readOnly={savedAssessments.has(index)}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Tracking/undermining */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">
                    Is wound tracking/undermining
                  </div>
                  {[0].map((index) => (
                    <div key={index} className="p-2 flex justify-center">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.trackingUndermining`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={savedAssessments.has(index)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Photograph taken date */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">Photograph taken date</div>
                  {[0].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.photographTakenDate`}
                        render={({ field }) => (
                          <AssessmentDatePicker 
                            field={field} 
                            isSaved={savedAssessments.has(index)} 
                            disabledMatcher={(date) => date > new Date()}
                          />
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Tissue type header */}
                <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                  Tissue type on wound bed (tick relevant boxes)
                </div>

                {/* Tissue types */}
                {[
                  { name: "necrotic", label: "Necrotic (Black)" },
                  { name: "sloughy", label: "Sloughy (Yellow/Green)" },
                  { name: "granulating", label: "Granulating (Red)" },
                  { name: "epithelialising", label: "Epithelialising (Pink)" },
                  { name: "hypergranulating", label: "Hypergranulating (Red)" },
                  { name: "haematoma", label: "Haematoma" },
                  { name: "boneTendon", label: "Bone/tendon" },
                ].map((tissue) => (
                  <div
                    key={tissue.name}
                    className="grid grid-cols-[250px_1fr] divide-x divide-gray-300"
                  >
                    <div className="p-2 bg-gray-50 text-xs">{tissue.label}</div>
                    {[0].map((index) => (
                      <div key={index} className="p-2 flex justify-center">
                        <FormField
                          control={form.control}
                          name={`assessments.${index}.${tissue.name}` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={savedAssessments.has(index)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Wound exudate header */}
                <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                  Wound exudate levels/type (tick all relevant boxes)
                </div>

                {/* Exudate levels */}
                {[
                  { name: "exudateLow", label: "Low" },
                  { name: "exudateModerate", label: "Moderate" },
                  { name: "exudateHigh", label: "High" },
                  { name: "exudateSerous", label: "Serous (Straw)" },
                  { name: "exudateHaemoserous", label: "Haemoserous (Red/Straw)" },
                  { name: "exudatePurulent", label: "Purulent (Green/Brown/Yellow)" },
                ].map((exudate) => (
                  <div
                    key={exudate.name}
                    className="grid grid-cols-[250px_1fr] divide-x divide-gray-300"
                  >
                    <div className="p-2 bg-gray-50 text-xs">{exudate.label}</div>
                    {[0].map((index) => (
                      <div key={index} className="p-2 flex justify-center">
                        <FormField
                          control={form.control}
                          name={`assessments.${index}.${exudate.name}` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={savedAssessments.has(index)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Peri-wound skin header */}
                <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                  Peri-wound skin (tick relevant boxes)
                </div>

                {/* Peri-wound skin options */}
                {[
                  { name: "macerated", label: "Macerated (White)" },
                  { name: "oedematous", label: "Oedematous" },
                  { name: "erythema", label: "Erythema (Red)" },
                  { name: "excoriated", label: "Excoriated (Red)" },
                  { name: "fragile", label: "Fragile" },
                  { name: "dryScaly", label: "Dry/scaly" },
                  { name: "healthyIntact", label: "Healthy/intact" },
                ].map((skin) => (
                  <div
                    key={skin.name}
                    className="grid grid-cols-[250px_1fr] divide-x divide-gray-300"
                  >
                    <div className="p-2 bg-gray-50 text-xs">{skin.label}</div>
                    {[0].map((index) => (
                      <div key={index} className="p-2 flex justify-center">
                        <FormField
                          control={form.control}
                          name={`assessments.${index}.${skin.name}` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={savedAssessments.has(index)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Signs of infection header */}
                <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                  Signs of infection * 1 or more of these signs may indicate
                  possible infection
                </div>

                {/* Signs of infection options */}
                {[
                  { name: "heat", label: "Heat *" },
                  {
                    name: "newSloughNecrosis",
                    label: "New slough/necrosis(deteriorating wound bed)*",
                  },
                  { name: "increasingPain", label: "Increasing pain*" },
                  { name: "increasingExudate", label: "Increasing exudate*" },
                  { name: "increasingOdour", label: "Increasing odour*" },
                  { name: "friableGranulation", label: "Friable granulation tissue*" },
                ].map((infection) => (
                  <div
                    key={infection.name}
                    className="grid grid-cols-[250px_1fr] divide-x divide-gray-300"
                  >
                    <div className="p-2 bg-gray-50 text-xs">{infection.label}</div>
                    {[0].map((index) => (
                      <div key={index} className="p-2 flex justify-center">
                        <FormField
                          control={form.control}
                          name={`assessments.${index}.${infection.name}` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={savedAssessments.has(index)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Treatment objectives header */}
                <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                  Treatment objectives (tick relevant box)
                </div>

                {/* Treatment objectives */}
                {[
                  { name: "debridement", label: "Debridement" },
                  { name: "absorption", label: "Absorption" },
                  { name: "hydration", label: "Hydration" },
                  { name: "protection", label: "Protection" },
                  {
                    name: "palliativeConservative",
                    label: "Palliative / conservative",
                  },
                ].map((treatment) => (
                  <div
                    key={treatment.name}
                    className="grid grid-cols-[250px_1fr] divide-x divide-gray-300"
                  >
                    <div className="p-2 bg-gray-50 text-xs">{treatment.label}</div>
                    {[0].map((index) => (
                      <div key={index} className="p-2 flex justify-center">
                        <FormField
                          control={form.control}
                          name={`assessments.${index}.${treatment.name}` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={savedAssessments.has(index)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Assessor initials */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Assessors Print Initials
                  </div>
                  {[0].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.assessorInitials`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="h-7 text-xs border-0 p-1"
                                placeholder="Initials"
                                readOnly={savedAssessments.has(index)}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Dressing Renewed */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Dressing Renewed
                  </div>
                  {[0].map((index) => (
                    <div key={index} className="p-2 flex justify-center">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.dressingRenewed`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={savedAssessments.has(index)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Re-assessment date */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Re-assessment date
                  </div>
                  {[0].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.reassessmentDate`}
                        render={({ field }) => (
                          <AssessmentDatePicker 
                            field={field} 
                            isSaved={savedAssessments.has(index)} 
                            disabledMatcher={(date) => date < new Date()}
                          />
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Save Buttons Row */}
                <div className="grid grid-cols-[250px_1fr] divide-x divide-gray-300 border-t-2 border-gray-300 bg-gray-50">
                  <div className="p-2 bg-gray-50 font-semibold text-xs flex items-center">
                    Save Assessment
                  </div>
                  {[0].map((index) => (
                    <div key={index} className="p-2 flex justify-center">
                      <Button
                        type="button"
                        onClick={() => saveIndividualAssessment(index)}
                        disabled={savingIndex === index || savedAssessments.has(index)}
                        size="sm"
                        className="w-full"
                        variant={savedAssessments.has(index) ? "secondary" : "default"}
                      >
                        {savingIndex === index ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : savedAssessments.has(index) ? (
                          <>
                            ✓ Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-3 h-3 mr-1" />
                            Done
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Padding after Save Assessment */}
                <div className="p-4 bg-white"></div>

              </div>
            </form>
          </Form>

          {/* Previous Assessment Sheets */}
          {previousSheets.length > 0 && (
            <div className="mt-6 border-t-2 border-gray-300 p-4 bg-gray-50 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-800">Saved Assessments (Grouped by 7)</span>
              </div>
              {previousSheets.map((group, groupIndex) => {
                const start = groupIndex * 7 + 1;
                const end = start + group.length - 1;
                const isCollapsed = collapsedGroups.has(groupIndex);
                return (
                  <div key={groupIndex} className="bg-white border border-gray-300 rounded-md p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleGroupCollapse(groupIndex)}
                        className="flex items-center gap-2 font-semibold text-sm text-left"
                      >
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        )}
                        <span>Assessments {start} to {end}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => downloadGroupPdf(groupIndex, start, end)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                    {!isCollapsed && (
                    <div className="rounded-md border border-gray-300 p-2">
                      <div className="mb-2 flex items-center justify-between border-b border-gray-200 pb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Ongoing Wound Assessment (Appendix H)</p>
                          <p className="text-xs text-gray-600">
                            Assessments {start} to {end}
                          </p>
                        </div>
                        {orgLogoUrl ? (
                          <img
                            src={orgLogoUrl}
                            alt="Organization logo"
                            className="h-10 w-auto object-contain"
                            crossOrigin="anonymous"
                          />
                        ) : null}
                      </div>
                    <div className="w-full pb-2">
                    <div id={`assessment-group-sheet-${groupIndex}`} className="w-full border border-gray-300 rounded-md">
                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 bg-gray-100 border-b border-gray-300">
                        <div className="p-1 text-[10px] leading-tight font-semibold break-words">Field</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => {
                          const assessmentNumber = start + colIdx;
                          return (
                            <div key={`head-${assessmentNumber}`} className="p-1 text-center text-[10px] leading-tight font-semibold break-words">
                              Assessment {assessmentNumber}
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                        <div className="p-1 text-[10px] leading-tight font-semibold bg-gray-50 break-words">Date of Assessment</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => {
                          return (
                            <div key={`date-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                              {renderGroupCell(group, colIdx, "assessment_date", "date")}
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                        <div className="p-1 text-[10px] leading-tight font-semibold bg-gray-50 break-words">Wound Number</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => {
                          return (
                            <div key={`wound-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                              {renderGroupCell(group, colIdx, "wound_number")}
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                        <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">Regular/on-going analgesia</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => (
                          <div key={`analgesia-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                            {renderGroupCell(group, colIdx, "regular_ongoing_analgesia", "boolean")}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                        <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">Pre-dressing only</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => (
                          <div key={`predressing-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                            {renderGroupCell(group, colIdx, "pre_dressing_only", "boolean")}
                          </div>
                        ))}
                      </div>

                      <div className="p-1 text-[10px] leading-tight font-semibold bg-gray-100 border-b border-gray-300 break-words">Wound Dimensions</div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                        <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">Length (cm/mm)</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => (
                          <div key={`length-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                            {renderGroupCell(group, colIdx, "length_cm")}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                        <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">Width (cm/mm)</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => (
                          <div key={`width-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                            {renderGroupCell(group, colIdx, "width_cm")}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                        <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">Depth (cm/mm)</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => (
                          <div key={`depth-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                            {renderGroupCell(group, colIdx, "depth_cm")}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                        <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">Tracking/undermining</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => (
                          <div key={`tracking-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                            {renderGroupCell(group, colIdx, "tracking_undermining", "boolean")}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                        <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">Photograph taken date</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => (
                          <div key={`photo-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                            {renderGroupCell(group, colIdx, "photograph_taken_date", "date")}
                          </div>
                        ))}
                      </div>

                      <div className="p-2 text-xs font-semibold bg-gray-100 border-b border-gray-300">Tissue type on wound bed</div>
                      {[
                        ["Necrotic (Black)", "necrotic"],
                        ["Sloughy (Yellow/Green)", "sloughy"],
                        ["Granulating (Red)", "granulating"],
                        ["Epithelialising (Pink)", "epithelialising"],
                        ["Hypergranulating (Red)", "hypergranulating"],
                        ["Haematoma", "haematoma"],
                        ["Bone/tendon", "bone_tendon"],
                      ].map(([label, key]) => (
                        <div key={key} className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                          <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">{label}</div>
                          {Array.from({ length: 7 }).map((_, colIdx) => (
                            <div key={`${key}-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                              {renderGroupCell(group, colIdx, key, "boolean")}
                            </div>
                          ))}
                        </div>
                      ))}

                      <div className="p-2 text-xs font-semibold bg-gray-100 border-b border-gray-300">Wound exudate levels/type</div>
                      {[
                        ["Low", "exudate_low"],
                        ["Moderate", "exudate_moderate"],
                        ["High", "exudate_high"],
                        ["Serous (Straw)", "exudate_serous"],
                        ["Haemoserous (Red/Straw)", "exudate_haemoserous"],
                        ["Purulent (Green/Brown/Yellow)", "exudate_purulent"],
                      ].map(([label, key]) => (
                        <div key={key} className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                          <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">{label}</div>
                          {Array.from({ length: 7 }).map((_, colIdx) => (
                            <div key={`${key}-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                              {renderGroupCell(group, colIdx, key, "boolean")}
                            </div>
                          ))}
                        </div>
                      ))}

                      <div className="p-2 text-xs font-semibold bg-gray-100 border-b border-gray-300">Peri-wound skin</div>
                      {[
                        ["Macerated (White)", "macerated"],
                        ["Oedematous", "oedematous"],
                        ["Erythema (Red)", "erythema"],
                        ["Excoriated (Red)", "excoriated"],
                        ["Fragile", "fragile"],
                        ["Dry/scaly", "dry_scaly"],
                        ["Healthy/intact", "healthy_intact"],
                      ].map(([label, key]) => (
                        <div key={key} className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                          <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">{label}</div>
                          {Array.from({ length: 7 }).map((_, colIdx) => (
                            <div key={`${key}-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                              {renderGroupCell(group, colIdx, key, "boolean")}
                            </div>
                          ))}
                        </div>
                      ))}

                      <div className="p-2 text-xs font-semibold bg-gray-100 border-b border-gray-300">Signs of infection</div>
                      {[
                        ["Heat", "heat"],
                        ["New slough/necrosis", "new_slough_necrosis"],
                        ["Increasing pain", "increasing_pain"],
                        ["Increasing exudate", "increasing_exudate"],
                        ["Increasing odour", "increasing_odour"],
                        ["Friable granulation tissue", "friable_granulation"],
                      ].map(([label, key]) => (
                        <div key={key} className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                          <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">{label}</div>
                          {Array.from({ length: 7 }).map((_, colIdx) => (
                            <div key={`${key}-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                              {renderGroupCell(group, colIdx, key, "boolean")}
                            </div>
                          ))}
                        </div>
                      ))}

                      <div className="p-2 text-xs font-semibold bg-gray-100 border-b border-gray-300">Treatment objectives</div>
                      {[
                        ["Debridement", "debridement"],
                        ["Absorption", "absorption"],
                        ["Hydration", "hydration"],
                        ["Protection", "protection"],
                        ["Palliative / conservative", "palliative_conservative"],
                      ].map(([label, key]) => (
                        <div key={key} className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-b border-gray-300">
                          <div className="p-1 text-[10px] leading-tight bg-gray-50 break-words">{label}</div>
                          {Array.from({ length: 7 }).map((_, colIdx) => (
                            <div key={`${key}-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                              {renderGroupCell(group, colIdx, key, "boolean")}
                            </div>
                          ))}
                        </div>
                      ))}

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300">
                        <div className="p-1 text-[10px] leading-tight font-semibold bg-gray-50 break-words">Assessor Initials</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => {
                          return (
                            <div key={`assessor-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                              {renderGroupCell(group, colIdx, "assessor_initials")}
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-t border-gray-300">
                        <div className="p-1 text-[10px] leading-tight font-semibold bg-gray-50 break-words">Dressing renewed</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => (
                          <div key={`dressing-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                            {renderGroupCell(group, colIdx, "dressing_renewed", "boolean")}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-t border-gray-300">
                        <div className="p-1 text-[10px] leading-tight font-semibold bg-gray-50 break-words">Re-assessment date</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => (
                          <div key={`reassessment-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                            {renderGroupCell(group, colIdx, "reassessment_date", "date")}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] divide-x divide-gray-300 border-t border-gray-300">
                        <div className="p-1 text-[10px] leading-tight font-semibold bg-gray-50 break-words">Created at</div>
                        {Array.from({ length: 7 }).map((_, colIdx) => {
                          const item = group[colIdx];
                          return (
                            <div key={`created-${start + colIdx}`} className="p-1 text-center text-[10px] leading-tight break-words">
                              {item?.created_at
                                ? format(new Date(item.created_at), "dd/MM/yyyy HH:mm")
                                : "-"}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    </div>
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
