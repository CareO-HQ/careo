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
import { Checkbox } from "@/components/ui/checkbox";
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
  FormDescription,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Upload,
  AlertTriangle,
  TrendingDown,
  Camera,
  Save,
  CheckCircle2,
  Plus,
  ArrowLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Zod Schema ---
const WoundAssessmentSchema = z.object({
  // Section 1: Resident Information
  assessmentDate: z.date(),
  woundNumber: z.string().min(1, "Wound number is required"),

  // Section 2: Pain / Analgesia
  analgesiaRequired: z.enum(["yes", "no"]),
  regularOngoingAnalgesia: z.boolean(),
  preDressingOnly: z.boolean(),

  // Section 3: Wound Dimensions
  length: z.string().optional(),
  width: z.string().optional(),
  depth: z.string().optional(),
  trackingUndermining: z.enum(["yes", "no"]).optional(),
  photographTakenDate: z.date().optional(),
  photographFile: z.any().optional(),

  // Section 4: Tissue Type (percentages must total 100)
  necroticPercentage: z.number().min(0).max(100).optional(),
  sloughyPercentage: z.number().min(0).max(100).optional(),
  granulatingPercentage: z.number().min(0).max(100).optional(),
  epithelialisingPercentage: z.number().min(0).max(100).optional(),
  hypergranulatingPercentage: z.number().min(0).max(100).optional(),
  haematomaPercentage: z.number().min(0).max(100).optional(),
  boneTendonPercentage: z.number().min(0).max(100).optional(),

  // Section 5: Wound Exudate
  exudateLevel: z.enum(["low", "moderate", "high"]),
  exudateType: z.enum(["serous", "haemoserous", "purulent"]),

  // Section 6: Peri-wound Skin
  periwoundSkin: z.array(z.string()),

  // Section 7: Signs of Infection
  signsOfInfection: z.array(z.string()),

  // Section 8: Treatment Objectives
  treatmentObjectives: z.array(z.string()).min(1, "Select at least one treatment objective"),

  // Section 9: Clinical Record
  assessorInitials: z.string().min(1, "Assessor initials required"),
  dressingRenewed: z.enum(["yes", "no"]),
  reassessmentDate: z.date(),
  clinicalNotes: z.string().optional(),
});

type WoundAssessmentFormValues = z.infer<typeof WoundAssessmentSchema>;

type Props = {
  woundFolderId: string;
  residentId: string;
  residentName: string;
  residentDOB?: string;
  assessments?: any[];
  isLoadingAssessments?: boolean;
  onSaved?: () => void;
};

export function WoundAssessmentForm({
  woundFolderId,
  residentId,
  residentName,
  residentDOB,
  assessments = [],
  isLoadingAssessments = false,
  onSaved,
}: Props) {
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const form = useForm<WoundAssessmentFormValues>({
    resolver: zodResolver(WoundAssessmentSchema),
    defaultValues: {
      assessmentDate: new Date(),
      woundNumber: "",
      analgesiaRequired: "no",
      regularOngoingAnalgesia: false,
      preDressingOnly: false,
      length: "",
      width: "",
      depth: "",
      trackingUndermining: "no",
      necroticPercentage: undefined,
      sloughyPercentage: undefined,
      granulatingPercentage: undefined,
      epithelialisingPercentage: undefined,
      hypergranulatingPercentage: undefined,
      haematomaPercentage: undefined,
      boneTendonPercentage: undefined,
      exudateLevel: "low",
      exudateType: "serous",
      periwoundSkin: [],
      signsOfInfection: [],
      treatmentObjectives: [],
      assessorInitials: profile?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "",
      dressingRenewed: "yes",
      reassessmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      clinicalNotes: "",
    },
  });

  // Calculate total tissue percentage
  const tissuePercentages = form.watch([
    "necroticPercentage",
    "sloughyPercentage",
    "granulatingPercentage",
    "epithelialisingPercentage",
    "hypergranulatingPercentage",
    "haematomaPercentage",
    "boneTendonPercentage",
  ]);
  const totalPercentage: number = tissuePercentages.reduce((sum, val) => (sum ?? 0) + (val ?? 0), 0) as number;
  const percentageValid = totalPercentage === 100;

  // Watch for infection signs to show alert
  const signsOfInfection = form.watch("signsOfInfection");
  const hasInfectionSigns = signsOfInfection && signsOfInfection.length > 0;

  // Handle photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setPhotoFile(file);
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setUploadedPhotoUrl(previewUrl);
    form.setValue("photographTakenDate", new Date());
    toast.success("Photo selected");
  };

  const onSubmit = async (data: WoundAssessmentFormValues) => {
    // Validate tissue percentages
    if (!percentageValid) {
      toast.error("Tissue type percentages must total 100%");
      return;
    }

    console.log("=== Wound Assessment Submission Started ===");
    console.log("Form data:", data);
    console.log("User profile:", { profile, profileId: profile?.id, activeOrgId: profile?.active_organization_id });
    console.log("Context:", { woundFolderId, residentId });

    setIsSubmitting(true);

    try {
      let photoStoragePath: string | null = null;

      // Upload photo if provided
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${residentId}/${woundFolderId}/wound-${data.woundNumber}-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("wound-photos")
          .upload(fileName, photoFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Error uploading photo:", uploadError);
          toast.error(`Failed to upload photo: ${uploadError.message}`);
          setIsSubmitting(false);
          return; // Stop submission if photo upload fails
        } else {
          photoStoragePath = uploadData.path;
          toast.success("Photo uploaded successfully");
        }
      }

      // Save to database
      const { error: dbError } = await supabase.from("wound_assessments").insert({
        wound_folder_id: woundFolderId,
        resident_id: residentId,
        organization_id: profile?.active_organization_id,
        care_home_id: profile?.active_care_home_id,

        // Section 1
        assessment_date: format(data.assessmentDate, "yyyy-MM-dd"),
        wound_number: data.woundNumber,

        // Section 2
        analgesia_required: data.analgesiaRequired === "yes",
        regular_ongoing_analgesia: data.regularOngoingAnalgesia,
        pre_dressing_only: data.preDressingOnly,

        // Section 3
        length_cm: data.length ? parseFloat(data.length) : null,
        width_cm: data.width ? parseFloat(data.width) : null,
        depth_cm: data.depth ? parseFloat(data.depth) : null,
        tracking_undermining: data.trackingUndermining === "yes",
        photograph_taken_date: data.photographTakenDate ? format(data.photographTakenDate, "yyyy-MM-dd") : null,
        photograph_storage_path: photoStoragePath,

        // Section 4
        necrotic_percentage: data.necroticPercentage ?? 0,
        sloughy_percentage: data.sloughyPercentage ?? 0,
        granulating_percentage: data.granulatingPercentage ?? 0,
        epithelialising_percentage: data.epithelialisingPercentage ?? 0,
        hypergranulating_percentage: data.hypergranulatingPercentage ?? 0,
        haematoma_percentage: data.haematomaPercentage ?? 0,
        bone_tendon_percentage: data.boneTendonPercentage ?? 0,

        // Section 5
        exudate_level: data.exudateLevel,
        exudate_type: data.exudateType,

        // Section 6
        periwound_skin: data.periwoundSkin,

        // Section 7
        signs_of_infection: data.signsOfInfection,

        // Section 8
        treatment_objectives: data.treatmentObjectives,

        // Section 9
        assessor_initials: data.assessorInitials,
        dressing_renewed: data.dressingRenewed === "yes",
        reassessment_date: format(data.reassessmentDate, "yyyy-MM-dd"),
        clinical_notes: data.clinicalNotes,

        // Audit fields
        recorded_by: profile?.id,
      });

      if (dbError) {
        console.error("Database error details:", {
          error: dbError,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
        });
        throw dbError;
      }

      toast.success("Wound assessment saved successfully");

      // Create notification if infection signs detected
      if (hasInfectionSigns) {
        await supabase.from("notifications").insert({
          organization_id: profile?.active_organization_id,
          care_home_id: profile?.active_care_home_id,
          type: "wound_infection_alert",
          title: "Infection Signs Detected",
          message: `Wound ${data.woundNumber} for ${residentName} shows signs of infection: ${data.signsOfInfection.join(", ")}`,
          link: `/dashboard/residents/${residentId}/wounds/${woundFolderId}`,
        });
      }

      // Reset form and hide it
      setShowNewForm(false);
      form.reset();
      setUploadedPhotoUrl(null);
      setPhotoFile(null);

      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error saving wound assessment:", error);

      // More detailed error message
      let errorMessage = "Failed to save wound assessment";
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }

      toast.error(errorMessage, {
        duration: 8000,
        description: "Check the browser console for more details",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // View selected assessment
  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6 text-red-600" />
            Wound Assessments
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Appendix H - RQIA Compliant Clinical Documentation
          </p>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span><strong>Resident:</strong> {residentName}</span>
            {residentDOB && <span><strong>DOB:</strong> {format(new Date(residentDOB), "dd/MM/yyyy")}</span>}
          </div>
        </div>

        {/* Assessment History & New Button */}
        {!showNewForm && !selectedAssessmentId && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Assessment History</CardTitle>
                <Button onClick={() => setShowNewForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Assessment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAssessments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : assessments.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No assessments recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click &quot;New Assessment&quot; to create the first one</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assessments.map((assessment, index) => {
                    const assessmentDate = assessment.assessment_date ? new Date(assessment.assessment_date) : null;
                    const hasInfection = assessment.signs_of_infection && assessment.signs_of_infection.length > 0;
                    const woundArea = assessment.length_cm && assessment.width_cm
                      ? (assessment.length_cm * assessment.width_cm).toFixed(2)
                      : null;

                    return (
                      <div
                        key={assessment.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedAssessmentId(assessment.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">
                                {assessmentDate ? format(assessmentDate, "dd MMM yyyy") : "Unknown date"}
                              </span>
                              {index === 0 && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">Latest</Badge>
                              )}
                              {hasInfection && (
                                <Badge variant="destructive" className="bg-orange-100 text-orange-700 border-orange-300">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Infection Signs
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground mt-2">
                              {woundArea && (
                                <div>
                                  <span className="font-medium">Area:</span> {woundArea} cm²
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Exudate:</span> {assessment.exudate_level || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Granulating:</span> {assessment.granulating_percentage || 0}%
                              </div>
                              <div>
                                <span className="font-medium">By:</span> {assessment.assessor_initials || assessment.recorded_by_user?.name || 'Unknown'}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Selected Assessment Viewer */}
        {selectedAssessmentId && selectedAssessment && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Assessment - {selectedAssessment.assessment_date ? format(new Date(selectedAssessment.assessment_date), "dd MMM yyyy") : "Unknown date"}
                </CardTitle>
                <Button variant="outline" onClick={() => setSelectedAssessmentId(null)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to List
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display assessment details here - simplified view */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Wound Number:</span> {selectedAssessment.wound_number || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Assessor:</span> {selectedAssessment.assessor_initials || 'N/A'}
                </div>
                {selectedAssessment.length_cm && (
                  <div>
                    <span className="font-semibold">Dimensions:</span> {selectedAssessment.length_cm} × {selectedAssessment.width_cm} × {selectedAssessment.depth_cm || 0} cm
                  </div>
                )}
                <div>
                  <span className="font-semibold">Exudate:</span> {selectedAssessment.exudate_level} / {selectedAssessment.exudate_type}
                </div>
                {selectedAssessment.signs_of_infection && selectedAssessment.signs_of_infection.length > 0 && (
                  <div className="col-span-full">
                    <span className="font-semibold text-orange-700">Infection Signs:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedAssessment.signs_of_infection.map((sign: string) => (
                        <Badge key={sign} variant="outline" className="text-orange-700 border-orange-300">
                          {sign.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedAssessment.clinical_notes && (
                  <div className="col-span-full">
                    <span className="font-semibold">Clinical Notes:</span>
                    <p className="text-muted-foreground mt-1">{selectedAssessment.clinical_notes}</p>
                  </div>
                )}
                {selectedAssessment.signedUrl && (
                  <div className="col-span-full mt-4">
                    <span className="font-semibold block mb-2">Wound Photograph:</span>
                    <img
                      src={selectedAssessment.signedUrl}
                      alt="Wound"
                      className="max-w-full h-auto rounded-lg border shadow-sm"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* New Assessment Form */}
        {showNewForm && !selectedAssessmentId && (
          <>

            {hasInfectionSigns && (
              <Card className="mb-6 border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">Infection Signs Detected</p>
                      <p className="text-sm text-orange-800 mt-1">
                        Clinical review recommended. GP/Tissue Viability Nurse may need to be contacted.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Section 1: Resident Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Section 1: Resident Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="assessmentDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date of Assessment *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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

                      <FormField
                        control={form.control}
                        name="woundNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wound Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., W001" {...field} />
                            </FormControl>
                            <FormDescription>Unique identifier for tracking</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: Pain / Analgesia */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Section 2: Pain / Analgesia</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="analgesiaRequired"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Analgesia Required *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex space-x-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="analgesia-yes" />
                                <Label htmlFor="analgesia-yes">Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="analgesia-no" />
                                <Label htmlFor="analgesia-no">No</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("analgesiaRequired") === "yes" && (
                      <div className="space-y-3 pl-6 border-l-2 border-blue-200">
                        <FormField
                          control={form.control}
                          name="regularOngoingAnalgesia"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Regular / Ongoing Analgesia</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="preDressingOnly"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Pre-Dressing Only</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Section 3: Wound Dimensions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Section 3: Wound Dimensions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="length"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Length (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder="0.0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="width"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Width (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder="0.0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="depth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Depth (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder="0.0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="trackingUndermining"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tracking / Undermining</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex space-x-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="tracking-yes" />
                                <Label htmlFor="tracking-yes">Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="tracking-no" />
                                <Label htmlFor="tracking-no">No</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="space-y-3">
                      <Label>Wound Photograph</Label>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("photo-upload")?.click()}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Upload Photo
                        </Button>
                        <input
                          id="photo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                        {uploadedPhotoUrl && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Photo attached
                          </Badge>
                        )}
                      </div>
                      {uploadedPhotoUrl && (
                        <div className="mt-3">
                          <img
                            src={uploadedPhotoUrl}
                            alt="Wound photo preview"
                            className="max-w-sm rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Section 4: Tissue Type */}
                <Card className={!percentageValid && totalPercentage > 0 ? "border-orange-300" : ""}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Section 4: Tissue Type on Wound Bed</span>
                      <Badge
                        variant={percentageValid ? "default" : "destructive"}
                        className={percentageValid ? "bg-emerald-100 text-emerald-700" : ""}
                      >
                        Total: {totalPercentage}%
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Enter percentages (must total 100%) {percentageValid && "✓"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="necroticPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Necrotic (Black)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder=""
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sloughyPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sloughy (Yellow/Green)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder=""
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="granulatingPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Granulating (Red)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder=""
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="epithelialisingPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Epithelialising (Pink)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder=""
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hypergranulatingPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hypergranulating</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder=""
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="haematomaPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Haematoma</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder=""
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="boneTendonPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bone / Tendon</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
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
                  </CardContent>
                </Card>

                {/* Section 5: Wound Exudate */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Section 5: Wound Exudate</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="exudateLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exudate Level *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="exudateType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exudate Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="serous">Serous (Straw colored)</SelectItem>
                              <SelectItem value="haemoserous">Haemoserous (Red/Straw)</SelectItem>
                              <SelectItem value="purulent">Purulent (Green/Brown/Yellow)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Section 6: Peri-wound Skin */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Section 6: Peri-wound Skin</CardTitle>
                    <p className="text-sm text-muted-foreground">Tick all that apply</p>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="periwoundSkin"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                              "macerated",
                              "oedematous",
                              "erythema",
                              "excoriated",
                              "fragile",
                              "dry_scaly",
                              "healthy_intact",
                            ].map((item) => (
                              <FormField
                                key={item}
                                control={form.control}
                                name="periwoundSkin"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          const updated = checked
                                            ? [...(field.value || []), item]
                                            : field.value?.filter((value) => value !== item);
                                          field.onChange(updated);
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal capitalize cursor-pointer">
                                      {item.replace(/_/g, " / ")}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Section 7: Signs of Infection */}
                <Card className={hasInfectionSigns ? "border-orange-300" : ""}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>Section 7: Signs of Infection</span>
                      {hasInfectionSigns && <AlertTriangle className="w-5 h-5 text-orange-600" />}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Tick all that apply</p>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="signsOfInfection"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              "heat",
                              "new_slough_necrosis",
                              "increasing_pain",
                              "increasing_exudate",
                              "increasing_odour",
                              "friable_granulation_tissue",
                            ].map((item) => (
                              <FormField
                                key={item}
                                control={form.control}
                                name="signsOfInfection"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          const updated = checked
                                            ? [...(field.value || []), item]
                                            : field.value?.filter((value) => value !== item);
                                          field.onChange(updated);
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal capitalize cursor-pointer">
                                      {item.replace(/_/g, " / ")}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Section 8: Treatment Objectives */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Section 8: Treatment Objectives</CardTitle>
                    <p className="text-sm text-muted-foreground">Tick all that apply</p>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="treatmentObjectives"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              "debridement",
                              "absorption",
                              "hydration",
                              "protection",
                              "palliative_conservative",
                            ].map((item) => (
                              <FormField
                                key={item}
                                control={form.control}
                                name="treatmentObjectives"
                                render={({ field }) => (

                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          const updated = checked
                                            ? [...(field.value || []), item]
                                            : field.value?.filter((value) => value !== item);
                                          field.onChange(updated);
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal capitalize cursor-pointer">
                                      {item.replace(/_/g, " / ")}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Section 9: Clinical Record */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Section 9: Clinical Record</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="assessorInitials"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assessor Initials *</FormLabel>
                            <FormControl>
                              <Input placeholder="ABC" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dressingRenewed"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dressing Renewed *</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="yes" id="dressing-yes" />
                                  <Label htmlFor="dressing-yes">Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="no" id="dressing-no" />
                                  <Label htmlFor="dressing-no">No</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="reassessmentDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Re-assessment Date *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>Next review date</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="clinicalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clinical Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional observations, treatment plan changes, etc."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="space-y-3">
                  {!percentageValid && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold text-orange-900">Section 4 incomplete</p>
                          <p className="text-orange-700 text-xs mt-0.5">
                            Tissue type percentages must total 100%. Current total: {totalPercentage}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pb-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewForm(false);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !percentageValid} size="lg">
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Assessment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
