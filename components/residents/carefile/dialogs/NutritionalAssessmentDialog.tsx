"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { nutritionalAssessmentSchema } from "@/schemas/residents/care-file/nutritionalAssessmentSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, ClipboardList } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { monthlyEvaluationSchema } from "@/schemas/residents/care-file/nutritionalAssessmentSchema";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NextReviewDateField from "./NextReviewDateField";

interface NutritionalAssessmentDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  careHomeName?: string;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function NutritionalAssessmentDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  careHomeName = "",
  onClose,
  initialData,
  isEditMode = false,
  isInline = false,
  viewOnly = false
}: NutritionalAssessmentDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [assessmentDatePopoverOpen, setAssessmentDatePopoverOpen] = useState(false);
  const [showAddEvaluation, setShowAddEvaluation] = useState(false);
  const [isSavingEval, setIsSavingEval] = useState(false);
  const [newEvaluation, setNewEvaluation] = useState<Partial<z.infer<typeof monthlyEvaluationSchema>>>({});

  const handleSaveEvaluation = async () => {
    if (!initialData?.id) {
      toast.error("Please save the nutritional assessment first.");
      return;
    }
    
    setIsSavingEval(true);
    try {
      const currentEvals = form.getValues("monthlyEvaluations") || [];
      const updatedEvals = [...currentEvals, newEvaluation as z.infer<typeof monthlyEvaluationSchema>];
      
      const { error } = await supabase
        .from("nutritional_assessments")
        .update({ 
           assessment_details: {
               ...(initialData.assessment_details || {}),
               monthlyEvaluations: updatedEvals
           }
        })
        .eq("id", initialData.id);

      if (error) throw error;
      
      form.setValue("monthlyEvaluations", updatedEvals, { shouldDirty: true });
      if (initialData.assessment_details) {
          initialData.assessment_details.monthlyEvaluations = updatedEvals;
      } else {
          initialData.assessment_details = { monthlyEvaluations: updatedEvals };
      }
      
      toast.success("Evaluation added successfully");
      setShowAddEvaluation(false);
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("Failed to save evaluation");
    } finally {
      setIsSavingEval(false);
    }
  };

  const handleDeleteEvaluation = async (id: string) => {
    if (!initialData?.id) return;
    try {
      const currentEvals = [...(form.getValues("monthlyEvaluations") || [])];
      const updatedEvals = currentEvals.filter(evalItem => evalItem.id !== id);
      
      const { error } = await supabase
        .from("nutritional_assessments")
        .update({ 
           assessment_details: {
               ...(initialData.assessment_details || {}),
               monthlyEvaluations: updatedEvals
           }
        })
        .eq("id", initialData.id);

      if (error) throw error;
      
      form.setValue("monthlyEvaluations", updatedEvals, { shouldDirty: true });
      if (initialData.assessment_details) {
          initialData.assessment_details.monthlyEvaluations = updatedEvals;
      }
      toast.success("Evaluation deleted");
    } catch (error) {
      console.error("Error deleting evaluation:", error);
      toast.error("Failed to delete evaluation");
    }
  };

  const form = useForm<z.infer<typeof nutritionalAssessmentSchema>>({
    resolver: zodResolver(nutritionalAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId,
        teamId,
        organizationId,
        userId,
        residentName: initialData.residentName || `${resident.first_name} ${resident.last_name}`,
        dateOfBirth: initialData.dateOfBirth || (resident.date_of_birth ? format(new Date(resident.date_of_birth), "dd/MM/yyyy") : ""),
        nextReviewDate: initialData.nextReviewDate || initialData.assessment_details?.nextReviewDate || "",
        bedroomNumber: initialData.bedroomNumber || resident.room_number || "",
        height: initialData.assessment_details?.height || initialData.height || "",
        weight: initialData.assessment_details?.weight || initialData.weight || "",
        mustScore: initialData.must_score || initialData.mustScore || "",
        hasSaltInvolvement: initialData.assessment_details?.hasSaltInvolvement || initialData.hasSaltInvolvement || false,
        saltTherapistName: initialData.assessment_details?.saltTherapistName || initialData.saltTherapistName || "",
        saltContactDetails: initialData.assessment_details?.saltContactDetails || initialData.saltContactDetails || "",
        hasDietitianInvolvement: initialData.assessment_details?.hasDietitianInvolvement || initialData.hasDietitianInvolvement || false,
        dietitianName: initialData.assessment_details?.dietitianName || initialData.dietitianName || "",
        dietitianContactDetails: initialData.assessment_details?.dietitianContactDetails || initialData.dietitianContactDetails || "",
        foodFortificationRequired: initialData.assessment_details?.foodFortificationRequired || initialData.foodFortificationRequired || "",
        supplementsPrescribed: initialData.assessment_details?.supplementsPrescribed || initialData.supplementsPrescribed || "",
        foodConsistency: initialData.food_consistency || initialData.foodConsistency || {},
        fluidConsistency: initialData.fluid_consistency || initialData.fluidConsistency || {},
        assistanceRequired: initialData.assessment_details?.assistanceRequired || initialData.assistanceRequired || "",
        completedBy: initialData.completed_by || initialData.completedBy || userName,
        jobRole: initialData.assessment_details?.jobRole || initialData.jobRole || "",
        signature: initialData.assessment_details?.signature || initialData.signature || userName,
        assessmentDate: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : Date.now(),
        monthlyEvaluations: initialData.assessment_details?.monthlyEvaluations || initialData.monthlyEvaluations || []
      }
      : {
        residentId,
        teamId,
        organizationId,
        userId,
        residentName: `${resident.first_name} ${resident.last_name}`,
        dateOfBirth: resident.date_of_birth ? format(new Date(resident.date_of_birth), "dd/MM/yyyy") : "",
        nextReviewDate: "",
        bedroomNumber: resident.room_number || "",
        height: "",
        weight: "",
        mustScore: "",
        hasSaltInvolvement: false,
        saltTherapistName: "",
        saltContactDetails: "",
        hasDietitianInvolvement: false,
        dietitianName: "",
        dietitianContactDetails: "",
        foodFortificationRequired: "",
        supplementsPrescribed: "",
        foodConsistency: {},
        fluidConsistency: {},
        assistanceRequired: "",
        completedBy: userName,
        jobRole: "",
        signature: userName,
        assessmentDate: Date.now(),
        monthlyEvaluations: []
      }
  });

  const hasSaltInvolvement = form.watch("hasSaltInvolvement");
  const hasDietitianInvolvement = form.watch("hasDietitianInvolvement");

  const renderInput = (field: any, props: any = {}) => viewOnly ? (
    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[40px]">
      {field.value || " "}
    </div>
  ) : <Input {...field} {...props} />;

  const renderTextarea = (field: any, props: any = {}) => viewOnly ? (
    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[80px]">
      {field.value || " "}
    </div>
  ) : <Textarea {...field} {...props} />;

  function onSubmit(values: z.infer<typeof nutritionalAssessmentSchema>) {
    startTransition(async () => {
      try {
        if (!userId) throw new Error("User not authenticated");

        const assessmentDetails = {
          height: values.height,
          weight: values.weight,
          hasSaltInvolvement: values.hasSaltInvolvement,
          saltTherapistName: values.saltTherapistName,
          saltContactDetails: values.saltContactDetails,
          hasDietitianInvolvement: values.hasDietitianInvolvement,
          dietitianName: values.dietitianName,
          dietitianContactDetails: values.dietitianContactDetails,
          foodFortificationRequired: values.foodFortificationRequired,
          supplementsPrescribed: values.supplementsPrescribed,
          assistanceRequired: values.assistanceRequired,
          nextReviewDate: values.nextReviewDate,
          jobRole: values.jobRole,
          signature: values.signature,
          monthlyEvaluations: values.monthlyEvaluations || []
        };

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          must_score: values.mustScore,
          food_consistency: values.foodConsistency,
          fluid_consistency: values.fluidConsistency,
          assessment_details: assessmentDetails,
          assessment_date: new Date(values.assessmentDate || Date.now()).toISOString().split('T')[0],
          completed_by: values.completedBy,
          created_by: userId
        };

        await submitAssessmentWithVersioning(
          'nutritional_assessments',
          payload,
          initialData,
          isEditMode
        );

        if (isEditMode && initialData?.id) {
          await supabase.from('manager_audits').insert({
            form_type: 'nutritional_assessments',
            form_id: initialData.id,
            resident_id: residentId,
            audited_by: userId,
            audit_notes: "Form reviewed and updated",
            organization_id: organizationId,
            care_home_id: resident.care_home_id
          });
          toast.success("Nutritional assessment updated successfully!");
        } else {
          toast.success("Nutritional assessment submitted successfully");
        }
        setTimeout(() => onClose?.(), 500);
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment. Please try again.");
      }
    });
  }

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle>Nutritional Assessment</DialogTitle>
          <DialogDescription>Complete the nutritional assessment for the resident</DialogDescription>
        </DialogHeader>
      )}
      <div>
        <Form {...form}>
          <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
            <div className="mb-4 p-4 border rounded-lg bg-muted/40">
              <FormField control={form.control} name="nextReviewDate" render={({ field }) => (<FormItem className="max-w-xs"><FormControl><NextReviewDateField value={field.value || ""} onChange={field.onChange} disabled={viewOnly} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <button
                type="button"
                id="care-file-submit-btn"
                className="hidden"
                onClick={form.handleSubmit(onSubmit, (errors) => {
                  console.error("Nutritional Assessment form errors:", errors);
                  toast.error("Please fill in all required fields correctly.");
                })}
              />
              {/* Section 1: Resident Information */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-semibold">1. Resident Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="residentName" render={({ field }) => (<FormItem><FormLabel required>Resident Name</FormLabel><FormControl>{renderInput(field, { placeholder: "John Doe" })}</FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (<FormItem><FormLabel required>Date of Birth</FormLabel><FormControl>{renderInput(field, { placeholder: "DD/MM/YYYY" })}</FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="bedroomNumber" render={({ field }) => (<FormItem><FormLabel required>Bedroom Number</FormLabel><FormControl>{renderInput(field, { placeholder: "Room 101" })}</FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="height" render={({ field }) => (<FormItem><FormLabel required>Height</FormLabel><FormControl>{renderInput(field, { placeholder: "e.g., 170cm" })}</FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="weight" render={({ field }) => (<FormItem><FormLabel required>Weight</FormLabel><FormControl>{renderInput(field, { placeholder: "e.g., 70kg" })}</FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="mustScore" render={({ field }) => (<FormItem><FormLabel required>Current MUST Score</FormLabel><FormControl>{renderInput(field, { placeholder: "Malnutrition Universal Screening Tool score" })}</FormControl><FormDescription>Malnutrition Universal Screening Tool</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="hasSaltInvolvement" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Is there SALT (Speech and Language Therapy) involvement?</FormLabel></div></FormItem>)} />
                {hasSaltInvolvement && (
                  <div className="ml-6 space-y-4 border-l-2 border-muted-foreground/20 pl-4">
                    <FormField control={form.control} name="saltTherapistName" render={({ field }) => (<FormItem><FormLabel>Name of Speech and Language Therapist</FormLabel><FormControl>{renderInput(field, { placeholder: "Therapist name" })}</FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="saltContactDetails" render={({ field }) => (<FormItem><FormLabel>Contact Details</FormLabel><FormControl>{renderInput(field, { placeholder: "Phone number or email" })}</FormControl><FormMessage /></FormItem>)} />
                  </div>
                )}
                <FormField control={form.control} name="hasDietitianInvolvement" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Is there Dietitian involvement?</FormLabel></div></FormItem>)} />
                {hasDietitianInvolvement && (
                  <div className="ml-6 space-y-4 border-l-2 border-muted-foreground/20 pl-4">
                    <FormField control={form.control} name="dietitianName" render={({ field }) => (<FormItem><FormLabel>Name of Dietitian</FormLabel><FormControl>{renderInput(field, { placeholder: "Dietitian name" })}</FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="dietitianContactDetails" render={({ field }) => (<FormItem><FormLabel>Contact Details</FormLabel><FormControl>{renderInput(field, { placeholder: "Phone number or email" })}</FormControl><FormMessage /></FormItem>)} />
                  </div>
                )}
              </div>

              {/* Section 2: Dietary Requirements */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-semibold">2. Dietary Requirements & Supplements</h3>
                <FormField control={form.control} name="foodFortificationRequired" render={({ field }) => (<FormItem><FormLabel>Does food require fortification?</FormLabel><FormControl>{renderTextarea(field, { placeholder: "Describe fortification requirements...", rows: 3 })}</FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="supplementsPrescribed" render={({ field }) => (<FormItem><FormLabel>Are supplements prescribed?</FormLabel><FormControl>{renderTextarea(field, { placeholder: "List all prescribed supplements...", rows: 3 })}</FormControl><FormMessage /></FormItem>)} />
              </div>

              {/* Section 3: IDDSI - Simplified checkbox groups */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-semibold">3. IDDSI Consistency Levels</h3>
                <p className="text-xs text-muted-foreground">Food consistency levels (7: Easy Chew, 6: Soft, 5: Minced, 4: Pureed, 3: Liquidised)</p>
                <div className="space-y-2 ml-2">
                  {["level7EasyChew", "level6SoftBiteSized", "level5MincedMoist", "level4Pureed", "level3Liquidised"].map((key) => (
                    <FormField key={key} control={form.control} name={`foodConsistency.${key}` as any} render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel className="font-normal capitalize">{key.replace('level', 'Level ').replace(/([A-Z])/g, ' $1').trim()}</FormLabel></div></FormItem>)} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">Fluid consistency levels</p>
                <div className="space-y-2 ml-2">
                  {["level4ExtremelyThick", "level3ModeratelyThick", "level2MildlyThick", "level1SlightlyThick", "level0Thin"].map((key) => (
                    <FormField key={key} control={form.control} name={`fluidConsistency.${key}` as any} render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel className="font-normal capitalize">{key.replace('level', 'Level ').replace(/([A-Z])/g, ' $1').trim()}</FormLabel></div></FormItem>)} />
                  ))}
                </div>
              </div>

              {/* Section 4: Assistance & Administration */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-semibold">4. Assistance & Administration</h3>
                <FormField control={form.control} name="assistanceRequired" render={({ field }) => (<FormItem><FormLabel required>Detail assistance required</FormLabel><FormControl>{renderTextarea(field, { placeholder: "Describe the assistance needed...", rows: 4 })}</FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="completedBy" render={({ field }) => (<FormItem><FormLabel required>Completed By</FormLabel><FormControl>{renderInput(field, { placeholder: "Staff name" })}</FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="jobRole" render={({ field }) => (<FormItem><FormLabel required>Job Role</FormLabel><FormControl>{renderInput(field, { placeholder: "e.g., Senior Care Assistant" })}</FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="signature" render={({ field }) => (<FormItem><FormLabel required>Signature</FormLabel><FormControl>{renderInput(field, { placeholder: "Staff signature" })}</FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="assessmentDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Assessment Date</FormLabel>
                    <Popover modal open={assessmentDatePopoverOpen} onOpenChange={setAssessmentDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button type="button" variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" onInteractOutside={(e) => e.preventDefault()}>
                        <Calendar mode="single" captionLayout="dropdown" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { field.onChange(date?.getTime()); setAssessmentDatePopoverOpen(false); }} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </form>
          </fieldset>
        </Form>
      </div>

      {/* Monthly Evaluations Tab Section */}
      <div className="px-4 pb-4 mt-8 border-t pt-6">
        <Tabs defaultValue="evaluations" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="evaluations" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Monthly Evaluations
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="evaluations" className="mt-0">
            <div className="p-5 bg-card rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-primary">Recorded Evaluations</h3>
                  <p className="text-sm text-muted-foreground">Manage ongoing monthly nutritional reviews</p>
                </div>
                {initialData?.id && !showAddEvaluation && (
                  <Button type="button" variant="default" size="sm" className="keep-interactive" onClick={() => {
                      setShowAddEvaluation(true);
                      setNewEvaluation({ date: Date.now(), id: Date.now().toString(), completedBy: userName });
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Evaluation
                  </Button>
                )}
                {!initialData?.id && (
                  <span className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded">Save assessment first</span>
                )}
              </div>
          
          {/* List of Previous Evaluations */}
          <div className="space-y-3">
            {[...(form.watch("monthlyEvaluations") || [])]
              .sort((a, b) => (b.date || 0) - (a.date || 0))
              .map((evaluation: z.infer<typeof monthlyEvaluationSchema>) => (
              <div key={evaluation.id} className="p-3 border rounded-md relative bg-background">
                  <div className="flex justify-between items-center mb-2 border-b pb-2">
                    <div className="font-semibold text-sm">Evaluation on {format(new Date(evaluation.date), "dd/MM/yyyy")} by {evaluation.completedBy}</div>
                    <Button type="button" variant="ghost" size="sm" className="keep-interactive" onClick={() => handleDeleteEvaluation(evaluation.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
                    <div><span className="font-medium text-foreground">MUST Score Change:</span> <span className="capitalize">{evaluation.mustScoreChange || "N/A"}</span> {evaluation.mustScoreChangeNotes && ` - ${evaluation.mustScoreChangeNotes}`}</div>
                    <div><span className="font-medium text-foreground">SALT Referral Req:</span> <span className="capitalize">{evaluation.saltReferralRequired || "N/A"}</span> {evaluation.saltReferralRequiredNotes && ` - ${evaluation.saltReferralRequiredNotes}`}</div>
                    <div><span className="font-medium text-foreground">SALT Input Recv:</span> <span className="capitalize">{evaluation.saltInputReceived || "N/A"}</span> {evaluation.saltInputReceivedNotes && ` - ${evaluation.saltInputReceivedNotes}`}</div>
                    <div><span className="font-medium text-foreground">Specialised Diet Change:</span> <span className="capitalize">{evaluation.specialisedDietChange || "N/A"}</span> {evaluation.specialisedDietChangeNotes && ` - ${evaluation.specialisedDietChangeNotes}`}</div>
                    <div><span className="font-medium text-foreground">Food Consistency:</span> <span className="capitalize">{evaluation.foodConsistencyChange || "N/A"}</span> {evaluation.foodConsistencyChangeNotes && ` - ${evaluation.foodConsistencyChangeNotes}`}</div>
                    <div><span className="font-medium text-foreground">Fluid Consistency:</span> <span className="capitalize">{evaluation.fluidConsistencyChange || "N/A"}</span> {evaluation.fluidConsistencyChangeNotes && ` - ${evaluation.fluidConsistencyChangeNotes}`}</div>
                    <div><span className="font-medium text-foreground">Food Fortification:</span> <span className="capitalize">{evaluation.foodFortificationRequired || "N/A"}</span> {evaluation.foodFortificationRequiredNotes && ` - ${evaluation.foodFortificationRequiredNotes}`}</div>
                    <div><span className="font-medium text-foreground">Supplements Prescribed:</span> <span className="capitalize">{evaluation.supplementsPrescribed || "N/A"}</span> {evaluation.supplementsPrescribedNotes && ` - ${evaluation.supplementsPrescribedNotes}`}</div>
                    <div className="md:col-span-2"><span className="font-medium text-foreground">Assistance Required:</span> <span className="capitalize">{evaluation.assistanceRequired || "N/A"}</span> {evaluation.assistanceRequiredNotes && ` - ${evaluation.assistanceRequiredNotes}`}</div>
                  </div>
              </div>
            ))}
            {(form.watch("monthlyEvaluations") || []).length === 0 && !showAddEvaluation && (
              <div className="text-sm text-muted-foreground italic text-center py-4">No monthly evaluations recorded.</div>
            )}
          </div>

          {/* Add Evaluation Form inline */}
          {showAddEvaluation && (
            <div className="p-4 border rounded-md space-y-4 bg-background mt-4 overflow-x-auto shadow-sm">
              <h4 className="font-medium text-sm border-b pb-2">New Monthly Evaluation</h4>
              
              <div className="space-y-4 min-w-[600px]">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b">
                  <div className="col-span-5">CHANGE YES / NO Please state</div>
                  <div className="col-span-1 text-center">Y</div>
                  <div className="col-span-1 text-center">N</div>
                  <div className="col-span-5">Please state (Notes)</div>
                </div>

                {[
                  { key: "mustScoreChange", label: "1. Any change in MUST Score?" },
                  { key: "saltReferralRequired", label: "2. SALT/ Dietician Referral Required?" },
                  { key: "saltInputReceived", label: "3. SALT/ Dietician Input Received?" },
                  { key: "specialisedDietChange", label: "4. Any change to specialised diet?" },
                  { key: "foodConsistencyChange", label: "5. Any change in food consistency?" },
                  { key: "fluidConsistencyChange", label: "6. Any change in fluid consistency?" },
                  { key: "foodFortificationRequired", label: "7. Does food require fortification?" },
                  { key: "supplementsPrescribed", label: "8. Have supplements been prescribed?" },
                  { key: "assistanceRequired", label: "9. Is any assistance required with eating or drinking?" },
                ].map((item: any) => (
                  <div key={item.key} className="grid grid-cols-12 gap-2 items-center text-sm border-b pb-2 last:border-0 hover:bg-muted/30 transition-colors">
                    <div className="col-span-5 pr-2">{item.label}</div>
                    <div className="col-span-1 text-center flex justify-center">
                      <Checkbox 
                        className="keep-interactive"
                        checked={newEvaluation[item.key as keyof typeof newEvaluation] === "yes"} 
                        onCheckedChange={(c) => setNewEvaluation({...newEvaluation, [item.key]: c ? "yes" : ""})} 
                      />
                    </div>
                    <div className="col-span-1 text-center flex justify-center">
                      <Checkbox 
                        className="keep-interactive"
                        checked={newEvaluation[item.key as keyof typeof newEvaluation] === "no"} 
                        onCheckedChange={(c) => setNewEvaluation({...newEvaluation, [item.key]: c ? "no" : ""})} 
                      />
                    </div>
                    <div className="col-span-5">
                      <Input 
                        placeholder="Notes..." 
                        value={(newEvaluation[`${item.key}Notes` as keyof typeof newEvaluation] as string) || ""}
                        onChange={(e) => setNewEvaluation({...newEvaluation, [`${item.key}Notes`]: e.target.value})}
                        className="h-8 text-xs bg-background keep-interactive"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" size="sm" className="keep-interactive" onClick={() => setShowAddEvaluation(false)} disabled={isSavingEval}>Cancel</Button>
                <Button type="button" size="sm" className="keep-interactive" onClick={handleSaveEvaluation} disabled={isSavingEval}>
                  {isSavingEval ? "Saving..." : "Save Evaluation"}
                </Button>
              </div>
            </div>
          )}
              </div>
          </TabsContent>
        </Tabs>
      </div>
      {!isInline && !viewOnly && (
        <DialogFooter>
          <Button onClick={() => onClose?.()} variant="outline" disabled={isLoading}>Cancel</Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} type="submit">{isLoading ? "Saving..." : "Save Assessment"}</Button>
        </DialogFooter>
      )}
    </>
  );
}
