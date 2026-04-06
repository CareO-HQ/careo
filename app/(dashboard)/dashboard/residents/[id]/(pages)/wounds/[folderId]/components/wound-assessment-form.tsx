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
import { CalendarIcon, Save, Loader2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export function WoundAssessmentForm({
  woundFolderId,
  residentId,
  residentName,
  residentDOB,
  woundNumber,
}: Props) {
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previousSheets, setPreviousSheets] = useState<any[][]>([]);
  const [showPreviousSheets, setShowPreviousSheets] = useState(false);

  const form = useForm<WoundAssessmentFormValues>({
    resolver: zodResolver(WoundAssessmentSchema),
    defaultValues: {
      assessments: Array(5).fill(null).map(() => ({
        assessmentDate: undefined,
        woundNumber: "",
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

  const fetchAssessments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("wound_assessments")
        .select("*")
        .eq("wound_folder_id", woundFolderId)
        .order("assessment_date", { ascending: false });

      if (!error && data) {
        setAssessments(data);

        console.log("Fetched assessments:", data.length);

        // Populate form with the most recent 5 assessments
        const newSavedSet = new Set<number>();
        const first5 = data.slice(0, 5);

        console.log("First 5 assessments to load:", first5.length);

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
        setSavedAssessments(newSavedSet);

        // Group remaining assessments into sheets of 5
        const remaining = data.slice(5);
        const sheets: any[][] = [];
        for (let i = 0; i < remaining.length; i += 5) {
          sheets.push(remaining.slice(i, i + 5));
        }
        setPreviousSheets(sheets);
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

    if (!assessment.assessmentDate) {
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
        analgesia_required: assessment.analgesiaRequired || false,
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

      // Mark this assessment as saved
      setSavedAssessments(prev => new Set(prev).add(index));

      fetchAssessments();
    } catch (error) {
      console.error("Error saving assessment:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setSavingIndex(null);
    }
  };

  // Check if all 5 assessments are saved
  const allAssessmentsSaved = savedAssessments.size === 5;

  // Debug logging
  console.log("Saved assessments count:", savedAssessments.size);
  console.log("Saved assessments:", Array.from(savedAssessments));
  console.log("All assessments saved?", allAssessmentsSaved);

  // Function to create a new assessment sheet
  const createNewAssessmentSheet = async () => {
    try {
      // First, fetch all assessments to update previous sheets
      const { data, error } = await supabase
        .from("wound_assessments")
        .select("*")
        .eq("wound_folder_id", woundFolderId)
        .order("assessment_date", { ascending: false });

      if (!error && data) {
        // All assessments become previous sheets (grouped by 5)
        const sheets: any[][] = [];
        for (let i = 0; i < data.length; i += 5) {
          sheets.push(data.slice(i, i + 5));
        }
        setPreviousSheets(sheets);
      }

      // Clear the form and reset saved assessments
      form.reset({
        assessments: Array(5).fill(null).map(() => ({
          assessmentDate: undefined,
          woundNumber: "",
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
      });

      setSavedAssessments(new Set());

      toast.success("New assessment sheet created");
    } catch (error) {
      console.error("Error creating new sheet:", error);
      toast.error("Failed to create new sheet");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                      savedAssessments.has(idx)
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold text-gray-700">
                ({savedAssessments.size}/5)
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
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()}>
              {/* Column Headers */}
              <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b-2 border-gray-300 bg-gray-100">
                <div className="p-2"></div>
                {[1, 2, 3, 4, 5].map((num, idx) => (
                  <div key={num} className="p-2 text-center font-bold text-xs">
                    Assessment {num}
                    {savedAssessments.has(idx) && (
                      <span className="ml-1 text-green-600">✓ Saved</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Table structure */}
              <div className="divide-y divide-gray-300">
                {/* Date of Assessment Row */}
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Date of Assessment
                  </div>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.assessmentDate`}
                        render={({ field }) => (
                          <FormItem>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "h-7 text-xs w-full justify-start p-1",
                                      !field.value && "text-muted-foreground"
                                    )}
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
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date()}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Wound Number Row */}
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Wound Number
                  </div>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.woundNumber`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="h-7 text-xs border-0 p-1"
                                placeholder="Enter wound number"
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
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Analgesia required
                    <div className="text-[10px] text-gray-500 font-normal">
                      (Refer to pain assessment tool)
                    </div>
                  </div>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="p-2 flex justify-center">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.analgesiaRequired`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Regular/on-going analgesia */}
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">
                    Regular/on-going analgesia
                  </div>
                  {[0, 1, 2, 3, 4].map((index) => (
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
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">Pre-dressing only</div>
                  {[0, 1, 2, 3, 4].map((index) => (
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
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">Length (cm/mm)</div>
                  {[0, 1, 2, 3, 4].map((index) => (
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
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">Width (cm/mm)</div>
                  {[0, 1, 2, 3, 4].map((index) => (
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
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">Depth (cm/mm)</div>
                  {[0, 1, 2, 3, 4].map((index) => (
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
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">
                    Is wound tracking/undermining
                  </div>
                  {[0, 1, 2, 3, 4].map((index) => (
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
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 text-xs">Photograph taken date</div>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.photographTakenDate`}
                        render={({ field }) => (
                          <FormItem>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "h-7 text-xs w-full justify-start p-1",
                                      !field.value && "text-muted-foreground"
                                    )}
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
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date()}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
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
                    className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300"
                  >
                    <div className="p-2 bg-gray-50 text-xs">{tissue.label}</div>
                    {[0, 1, 2, 3, 4].map((index) => (
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
                    className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300"
                  >
                    <div className="p-2 bg-gray-50 text-xs">{exudate.label}</div>
                    {[0, 1, 2, 3, 4].map((index) => (
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
                    className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300"
                  >
                    <div className="p-2 bg-gray-50 text-xs">{skin.label}</div>
                    {[0, 1, 2, 3, 4].map((index) => (
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
                    className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300"
                  >
                    <div className="p-2 bg-gray-50 text-xs">{infection.label}</div>
                    {[0, 1, 2, 3, 4].map((index) => (
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
                    className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300"
                  >
                    <div className="p-2 bg-gray-50 text-xs">{treatment.label}</div>
                    {[0, 1, 2, 3, 4].map((index) => (
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
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Assessors Print Initials
                  </div>
                  {[0, 1, 2, 3, 4].map((index) => (
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
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Dressing Renewed
                  </div>
                  {[0, 1, 2, 3, 4].map((index) => (
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
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300">
                  <div className="p-2 bg-gray-50 font-semibold text-xs">
                    Re-assessment date
                  </div>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="p-2">
                      <FormField
                        control={form.control}
                        name={`assessments.${index}.reassessmentDate`}
                        render={({ field }) => (
                          <FormItem>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "h-7 text-xs w-full justify-start p-1",
                                      !field.value && "text-muted-foreground"
                                    )}
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
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Save Buttons Row */}
                <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-t-2 border-gray-300 bg-gray-50">
                  <div className="p-2 bg-gray-50 font-semibold text-xs flex items-center">
                    Save Assessment
                  </div>
                  {[0, 1, 2, 3, 4].map((index) => (
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

                {/* New Assessment Sheet Button */}
                {allAssessmentsSaved && (
                  <div className="border-t-2 border-gray-300 bg-blue-50 p-4">
                    <div className="flex items-center justify-center gap-3">
                      <p className="text-sm text-gray-700">
                        All 5 assessments completed. Start a new assessment sheet?
                      </p>
                      <Button
                        type="button"
                        onClick={createNewAssessmentSheet}
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        New Assessment Sheet
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </Form>

          {/* Previous Assessment Sheets */}
          {previousSheets.length > 0 && (
            <div className="mt-6 border-t-2 border-gray-300">
              <button
                type="button"
                onClick={() => setShowPreviousSheets(!showPreviousSheets)}
                className="w-full p-4 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-800">
                    Previous Assessment Sheets ({previousSheets.length})
                  </span>
                </div>
                {showPreviousSheets ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {showPreviousSheets && (
                <div className="p-4 bg-gray-50 space-y-6">
                  {previousSheets.map((sheet, sheetIndex) => {
                    const sheetNumber = sheetIndex + 1;
                    const dateRange = sheet.length > 0
                      ? `${format(new Date(sheet[sheet.length - 1].assessment_date), "dd/MM/yyyy")} - ${format(new Date(sheet[0].assessment_date), "dd/MM/yyyy")}`
                      : "";

                    return (
                      <div key={sheetIndex} className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 border-b-2 border-gray-300 p-3">
                          <h3 className="font-bold text-sm">
                            Assessment Sheet #{sheetNumber}
                            {dateRange && (
                              <span className="ml-2 text-gray-600 font-normal">
                                ({dateRange})
                              </span>
                            )}
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <div className="min-w-full">
                            {/* Column Headers */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b-2 border-gray-300 bg-gray-100">
                              <div className="p-2"></div>
                              {sheet.map((_, idx) => (
                                <div key={idx} className="p-2 text-center font-bold text-xs">
                                  Assessment {idx + 1}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Date of Assessment */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 font-semibold text-xs">
                                Date of Assessment
                              </div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.assessment_date
                                    ? format(new Date(assessment.assessment_date), "dd/MM/yyyy")
                                    : "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Wound Number */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 font-semibold text-xs">
                                Wound Number
                              </div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.wound_number || "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Analgesia required */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 font-semibold text-xs">
                                Analgesia required
                              </div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.analgesia_required ? "✓" : "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Regular/on-going analgesia */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 text-xs">
                                Regular/on-going analgesia
                              </div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.regular_ongoing_analgesia ? "✓" : "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Pre-dressing only */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 text-xs">Pre-dressing only</div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.pre_dressing_only ? "✓" : "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Section Header */}
                            <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                              Wound Dimensions (enter size)
                            </div>

                            {/* Length */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 text-xs">Length (cm/mm)</div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.length_cm || "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Width */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 text-xs">Width (cm/mm)</div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.width_cm || "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Depth */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 text-xs">Depth (cm/mm)</div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.depth_cm || "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Tracking/Undermining */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 text-xs">Tracking/undermining</div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.tracking_undermining ? "✓" : "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Photograph taken date */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 text-xs">Photograph taken date</div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.photograph_taken_date
                                    ? format(new Date(assessment.photograph_taken_date), "dd/MM/yyyy")
                                    : "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Section Header - Tissue Types */}
                            <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                              Tissue type on wound bed (yes or no)
                            </div>

                            {/* Tissue Types */}
                            {[
                              { label: "Necrotic (Black)", key: "necrotic" },
                              { label: "Sloughy (Yellow/Green)", key: "sloughy" },
                              { label: "Granulating (Red)", key: "granulating" },
                              { label: "Epithelialising (Pink)", key: "epithelialising" },
                              { label: "Hypergranulating (Red)", key: "hypergranulating" },
                              { label: "Haematoma", key: "haematoma" },
                              { label: "Bone/tendon visible", key: "bone_tendon" },
                            ].map((tissue) => (
                              <div key={tissue.key} className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                                <div className="p-2 bg-gray-50 text-xs">
                                  {tissue.label}
                                </div>
                                {sheet.map((assessment, idx) => (
                                  <div key={idx} className="p-2 text-xs text-center">
                                    {assessment[tissue.key] ? "✓" : "-"}
                                  </div>
                                ))}
                                {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                  <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                                ))}
                              </div>
                            ))}

                            {/* Section Header - Exudate */}
                            <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                              Exudate
                            </div>

                            {/* Exudate Amount */}
                            {[
                              { label: "Low", key: "exudate_low" },
                              { label: "Moderate", key: "exudate_moderate" },
                              { label: "High", key: "exudate_high" },
                            ].map((exudate) => (
                              <div key={exudate.key} className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                                <div className="p-2 bg-gray-50 text-xs">
                                  {exudate.label}
                                </div>
                                {sheet.map((assessment, idx) => (
                                  <div key={idx} className="p-2 text-xs text-center">
                                    {assessment[exudate.key] ? "✓" : "-"}
                                  </div>
                                ))}
                                {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                  <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                                ))}
                              </div>
                            ))}

                            {/* Exudate Type */}
                            {[
                              { label: "Serous", key: "exudate_serous" },
                              { label: "Haemoserous", key: "exudate_haemoserous" },
                              { label: "Purulent", key: "exudate_purulent" },
                            ].map((exudate) => (
                              <div key={exudate.key} className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                                <div className="p-2 bg-gray-50 text-xs">
                                  {exudate.label}
                                </div>
                                {sheet.map((assessment, idx) => (
                                  <div key={idx} className="p-2 text-xs text-center">
                                    {assessment[exudate.key] ? "✓" : "-"}
                                  </div>
                                ))}
                                {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                  <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                                ))}
                              </div>
                            ))}

                            {/* Section Header - Peri-wound Skin */}
                            <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                              Peri-wound skin
                            </div>

                            {[
                              { label: "Macerated", key: "macerated" },
                              { label: "Oedematous", key: "oedematous" },
                              { label: "Erythema", key: "erythema" },
                              { label: "Excoriated", key: "excoriated" },
                              { label: "Fragile", key: "fragile" },
                              { label: "Dry/scaly", key: "dry_scaly" },
                              { label: "Healthy/intact", key: "healthy_intact" },
                            ].map((skin) => (
                              <div key={skin.key} className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                                <div className="p-2 bg-gray-50 text-xs">
                                  {skin.label}
                                </div>
                                {sheet.map((assessment, idx) => (
                                  <div key={idx} className="p-2 text-xs text-center">
                                    {assessment[skin.key] ? "✓" : "-"}
                                  </div>
                                ))}
                                {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                  <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                                ))}
                              </div>
                            ))}

                            {/* Section Header - Signs of Infection */}
                            <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                              Signs of infection
                            </div>

                            {[
                              { label: "Heat", key: "heat" },
                              { label: "New slough/necrosis", key: "new_slough_necrosis" },
                              { label: "Increasing pain", key: "increasing_pain" },
                              { label: "Increasing exudate", key: "increasing_exudate" },
                              { label: "Increasing odour", key: "increasing_odour" },
                              { label: "Friable granulation", key: "friable_granulation" },
                            ].map((sign) => (
                              <div key={sign.key} className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                                <div className="p-2 bg-gray-50 text-xs">
                                  {sign.label}
                                </div>
                                {sheet.map((assessment, idx) => (
                                  <div key={idx} className="p-2 text-xs text-center">
                                    {assessment[sign.key] ? "✓" : "-"}
                                  </div>
                                ))}
                                {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                  <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                                ))}
                              </div>
                            ))}

                            {/* Section Header - Treatment Objectives */}
                            <div className="p-2 bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                              Treatment objectives
                            </div>

                            {[
                              { label: "Debridement", key: "debridement" },
                              { label: "Absorption", key: "absorption" },
                              { label: "Hydration", key: "hydration" },
                              { label: "Protection", key: "protection" },
                              { label: "Palliative/Conservative", key: "palliative_conservative" },
                            ].map((treatment) => (
                              <div key={treatment.key} className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                                <div className="p-2 bg-gray-50 text-xs">
                                  {treatment.label}
                                </div>
                                {sheet.map((assessment, idx) => (
                                  <div key={idx} className="p-2 text-xs text-center">
                                    {assessment[treatment.key] ? "✓" : "-"}
                                  </div>
                                ))}
                                {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                  <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                                ))}
                              </div>
                            ))}

                            {/* Assessor Initials */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 font-semibold text-xs">
                                Assessors Print Initials
                              </div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.assessor_initials || "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Dressing renewed */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 font-semibold text-xs">
                                Dressing renewed
                              </div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.dressing_renewed ? "✓" : "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>

                            {/* Re-assessment Date */}
                            <div className="grid grid-cols-[250px_repeat(5,1fr)] divide-x divide-gray-300 border-b border-gray-300">
                              <div className="p-2 bg-gray-50 font-semibold text-xs">
                                Re-assessment date
                              </div>
                              {sheet.map((assessment, idx) => (
                                <div key={idx} className="p-2 text-xs text-center">
                                  {assessment.reassessment_date
                                    ? format(new Date(assessment.reassessment_date), "dd/MM/yyyy")
                                    : "-"}
                                </div>
                              ))}
                              {Array.from({ length: 5 - sheet.length }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="p-2 bg-gray-50"></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
