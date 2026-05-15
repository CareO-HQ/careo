"use client";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { AbbeyPainSchema } from "@/schemas/residents/care-file/abbeyPainSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import NextReviewDateField from "./NextReviewDateField";

const VIEW_DIV = "w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-90 whitespace-pre-wrap break-words min-h-10";

interface AbbeyPainDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  userRole?: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
  isInline?: boolean;
  viewOnly?: boolean;
  refreshForms?: () => void;
}

const domains = [
  {
    key: "vocalization",
    label: "Vocalization",
    description: "Whimpering, crying"
  },
  {
    key: "facialExpression",
    label: "Facial expression",
    description: "Tense, frowning, grimacing, frightened"
  },
  {
    key: "bodyLanguage",
    label: "Body language",
    description: "Fidgeting, rocking, guarding, withdrawn"
  },
  {
    key: "physiologicalChanges",
    label: "Physiological changes",
    description: "Temp, pulse or BP elevations, diaphoresis, flushing/pallor"
  },
  {
    key: "physicalChanges",
    label: "Physical changes",
    description: "Skin tears, pressure sores, arthritis, contractures, previous injuries"
  }
];

const scoringOptions = [
  { label: "Absent", value: 0 },
  { label: "Mild", value: 1 },
  { label: "Moderate", value: 2 },
  { label: "Severe", value: 3 }
];

const painTypes = ["Chronic", "Acute", "Acute on chronic", "N/A"];

export default function AbbeyPainDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  userRole,
  resident,
  onClose,
  initialData,
  isEditMode = false,
  isInline = false,
  viewOnly = false,
  refreshForms,
}: AbbeyPainDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [showSummary, setShowSummary] = useState(viewOnly);
  const [pastAssessments, setPastAssessments] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const defaultValues: z.infer<typeof AbbeyPainSchema> = initialData
    ? {
        ...initialData.assessment_data,
        nextReviewDate: initialData.assessment_data?.nextReviewDate || initialData.nextReviewDate || "",
      }
    : {
        residentId,
        organizationId,
        userId,
        vocalization: 0,
        facialExpression: 0,
        bodyLanguage: 0,
        physiologicalChanges: 0,
        physicalChanges: 0,
        typeOfPain: "N/A",
        totalScore: 0,
        painClassification: "No pain",
        completedByName: userName,
        nextReviewDate: "",
        completedByDesignation: userRole || "",
        completedByDate: Date.now(),
        completedBySignature: userName,
        assessmentDate: Date.now(),
        status: "completed",
      };

  const form = useForm<z.infer<typeof AbbeyPainSchema>>({
    resolver: zodResolver(AbbeyPainSchema),
    mode: "onChange",
    defaultValues
  });

  const watchAllFields = form.watch();

  useEffect(() => {
    const total = 
      (watchAllFields.vocalization || 0) +
      (watchAllFields.facialExpression || 0) +
      (watchAllFields.bodyLanguage || 0) +
      (watchAllFields.physiologicalChanges || 0) +
      (watchAllFields.physicalChanges || 0);
    
    let classification = "No pain";
    if (total >= 14) classification = "Severe pain";
    else if (total >= 8) classification = "Moderate pain";
    else if (total >= 3) classification = "Mild pain";

    const level = classification.toLowerCase();
    const type = watchAllFields.typeOfPain || "N/A";
    const fullClassification = type === "N/A" ? classification : `${type} ${level}`;

    form.setValue("totalScore", total);
    form.setValue("painClassification", fullClassification);
  }, [
    watchAllFields.vocalization,
    watchAllFields.facialExpression,
    watchAllFields.bodyLanguage,
    watchAllFields.physiologicalChanges,
    watchAllFields.physicalChanges,
    watchAllFields.typeOfPain,
    form
  ]);

  const fetchHistory = async () => {
    if (!residentId) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('abbey_pain_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .eq('status', 'completed')
        .order('assessment_date', { ascending: false });

      if (error) throw error;
      setPastAssessments(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [residentId]);

  const handleSubmit = async (values: z.infer<typeof AbbeyPainSchema>) => {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          assessment_data: values,
          assessment_date: new Date(values.assessmentDate).toISOString().split('T')[0],
          completed_by: values.completedByName,
          created_by: userId,
          status: "completed"
        };

        await submitAssessmentWithVersioning(
          'abbey_pain_assessments',
          payload,
          initialData,
          isEditMode
        );

        toast.success(isEditMode ? "Abbey Pain Tool updated successfully!" : "Abbey Pain Tool saved successfully");
        refreshForms?.();
        
        if (!isEditMode) {
          form.reset(defaultValues);
          setShowSummary(false);
          fetchHistory();
        } else {
          setShowSummary(true);
        }

        if (!isInline && isEditMode) {
            onClose?.();
        }
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save Abbey Pain Tool");
      }
    });
  };

  const currentTotal = watchAllFields.totalScore;
  const currentClassification = watchAllFields.painClassification;

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Review" : "Complete"} Abbey Pain Tool
          </DialogTitle>
          <DialogDescription>
            For people with dementia who cannot verbalise their pain.
          </DialogDescription>
        </DialogHeader>
      )}

      <Form {...form}>
        <div className="mb-4 p-4 border rounded-lg bg-muted/40 mt-4">
          <FormField
            control={form.control}
            name="nextReviewDate"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormControl>
                  <NextReviewDateField value={field.value || ""} onChange={field.onChange} disabled={viewOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-10 mt-4">
          <fieldset disabled={viewOnly} className={cn("space-y-6", viewOnly && "opacity-90")}>
            {domains.map((domain) => (
              <FormField
                key={domain.key}
                control={form.control}
                name={domain.key as any}
                render={({ field }) => (
                  <FormItem className="space-y-3 p-4 border rounded-lg bg-card">
                    <div>
                      <FormLabel className="text-base font-semibold">{domain.label}</FormLabel>
                      <p className="text-sm text-muted-foreground">{domain.description}</p>
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value?.toString()}
                        className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                      >
                        {scoringOptions.map((option) => (
                          <FormItem key={option.value} className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={option.value.toString()} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {option.label} ({option.value > 0 ? `+${option.value}` : option.value})
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <FormField
              control={form.control}
              name="typeOfPain"
              render={({ field }) => (
                <FormItem className="space-y-3 p-4 border rounded-lg bg-card">
                  <FormLabel className="text-base font-semibold">Type of Pain</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                    >
                      {painTypes.map((type) => (
                        <FormItem key={type} className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={type} />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">{type}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Real-time score display */}
            <div className={cn(
                "p-4 rounded-lg border-2 transition-colors",
                currentTotal >= 14 ? "bg-red-50 border-red-200" :
                currentTotal >= 8 ? "bg-orange-50 border-orange-200" :
                currentTotal >= 3 ? "bg-yellow-50 border-yellow-200" :
                "bg-green-50 border-green-200"
            )}>
                <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total Score: {currentTotal}</span>
                    <span className={cn(
                        "font-bold px-3 py-1 rounded-full text-sm uppercase",
                        currentTotal >= 14 ? "bg-red-500 text-white" :
                        currentTotal >= 8 ? "bg-orange-500 text-white" :
                        currentTotal >= 3 ? "bg-yellow-500 text-black" :
                        "bg-green-500 text-white"
                    )}>
                        {currentClassification}
                    </span>
                </div>
            </div>

            {/* Staff Section */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">Completion Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="completedByName" render={({ field }) => (
                  <FormItem><FormLabel>Completed By</FormLabel><FormControl>
                    {viewOnly ? (
                      <div className={VIEW_DIV}>{field.value || " "}</div>
                    ) : (
                      <Input {...field} />
                    )}
                  </FormControl></FormItem>
                )} />
                <FormField control={form.control} name="completedBySignature" render={({ field }) => (
                  <FormItem><FormLabel>Signature (Type name)</FormLabel><FormControl>
                    {viewOnly ? (
                      <div className={cn(VIEW_DIV, "font-signature italic text-lg text-primary")}>{field.value || " "}</div>
                    ) : (
                      <Input {...field} className="font-signature italic text-lg" />
                    )}
                  </FormControl></FormItem>
                )} />
              </div>
            </div>
          </fieldset>

          {(showSummary || viewOnly) && (
            <div className="mt-8 space-y-4 p-6 bg-muted/30 rounded-xl border border-dashed animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-lg font-bold border-b pb-2">Assessment Summary</h3>
              <div className="grid grid-cols-1 gap-3">
                {domains.map(d => (
                    <div key={d.key} className="flex justify-between items-center text-sm">
                        <span>{d.label}</span>
                        <span className="font-mono bg-background px-2 py-0.5 rounded border">
                            {watchAllFields[d.key as keyof typeof watchAllFields]}
                        </span>
                    </div>
                ))}
                <div className="flex justify-between items-center text-sm pt-2 border-t font-bold">
                    <span>Total Score</span>
                    <span>{currentTotal}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                    <span>Classification</span>
                    <span>{currentClassification}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span>Pain Type</span>
                    <span>{watchAllFields.typeOfPain}</span>
                </div>
              </div>
            </div>
          )}

          <button type="submit" id="care-file-submit-btn" className="hidden" />
        </form>
      </Form>

      <div className="mt-12 space-y-8 text-left pb-20">
        <div className="space-y-4">
          <h3 className="text-xl font-bold border-b pb-2 text-primary">Abbey Pain Scale Guidelines</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[150px] font-bold">Pain Level</TableHead>
                  <TableHead className="w-[120px] font-bold text-center">Score Range</TableHead>
                  <TableHead className="font-bold">Intervention Guidance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-muted/30">
                  <TableCell className="font-bold text-emerald-700">No Pain</TableCell>
                  <TableCell className="text-center font-medium">0-2</TableCell>
                  <TableCell className="text-sm">Regular monitoring. Continue normal care routine.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/30">
                  <TableCell className="font-bold text-amber-700">Mild Pain</TableCell>
                  <TableCell className="text-center font-medium">3-7</TableCell>
                  <TableCell className="text-sm">Identify source if possible. Consider non-pharmacological interventions or mild analgesics.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/30">
                  <TableCell className="font-bold text-orange-700">Moderate Pain</TableCell>
                  <TableCell className="text-center font-medium">8-13</TableCell>
                  <TableCell className="text-sm">Review medication. Implement pain management plan. Possible GP or specialist referral.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/30">
                  <TableCell className="font-bold text-rose-700">Severe Pain</TableCell>
                  <TableCell className="text-center font-medium">14+</TableCell>
                  <TableCell className="text-sm">Urgent professional referral and intervention. Immediate intensive pain management required.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold border-b pb-2 text-primary">Past Assessments</h3>
          {isLoadingHistory ? (
            <div className="flex justify-center p-8">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Loading history...</p>
              </div>
            </div>
          ) : pastAssessments.length === 0 ? (
            <div className="text-center p-8 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground text-sm">No previous assessments found</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead className="whitespace-nowrap">Next Review Date</TableHead>
                    <TableHead className="text-center">Vocal</TableHead>
                    <TableHead className="text-center">Facial</TableHead>
                    <TableHead className="text-center">Body</TableHead>
                    <TableHead className="text-center">Physio</TableHead>
                    <TableHead className="text-center">Physical</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-right">Classification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastAssessments.map((assessment) => {
                    const data = assessment.assessment_data;
                    const total = data.totalScore;
                    return (
                      <TableRow key={assessment.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {format(new Date(assessment.assessment_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {data.nextReviewDate
                            ? format(new Date(data.nextReviewDate), "dd/MM/yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">{data.vocalization}</TableCell>
                        <TableCell className="text-center">{data.facialExpression}</TableCell>
                        <TableCell className="text-center">{data.bodyLanguage}</TableCell>
                        <TableCell className="text-center">{data.physiologicalChanges}</TableCell>
                        <TableCell className="text-center">{data.physicalChanges}</TableCell>
                        <TableCell className="text-center font-bold">{total}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            total >= 14 ? "bg-red-100 text-red-800 border border-red-200" :
                            total >= 8 ? "bg-orange-100 text-orange-800 border border-orange-200" :
                            total >= 3 ? "bg-amber-100 text-amber-800 border border-amber-200" :
                            "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          )}>
                            {data.painClassification || "N/A"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
