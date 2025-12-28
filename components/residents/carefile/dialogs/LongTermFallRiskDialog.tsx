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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  longTermFallsRiskAssessmentSchema,
  calculateFallsRiskScore
} from "@/schemas/residents/care-file/longTermFallSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface LongTermFallRiskDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function LongTermFallRiskDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: LongTermFallRiskDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const submitAssessment = useMutation(
    api.careFiles.longTermFalls.submitLongTermFallsAssessment
  );
  const submitReviewedFormMutation = useMutation(
    api.managerAudits.submitReviewedForm
  );

  const form = useForm<z.infer<typeof longTermFallsRiskAssessmentSchema>>({
    resolver: zodResolver(longTermFallsRiskAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          residentId,
          teamId,
          organizationId,
          userId,
          age: initialData.age,
          gender: initialData.gender,
          historyOfFalls: initialData.historyOfFalls,
          mobilityLevel: initialData.mobilityLevel,
          standUnsupported: initialData.standUnsupported || false,
          personalActivities: initialData.personalActivities,
          domesticActivities: initialData.domesticActivities,
          footwear: initialData.footwear,
          visionProblems: initialData.visionProblems || false,
          bladderBowelMovement: initialData.bladderBowelMovement,
          residentEnvironmentalRisks:
            initialData.residentEnvironmentalRisks || false,
          socialRisks: initialData.socialRisks,
          medicalCondition: initialData.medicalCondition,
          medicines: initialData.medicines,
          safetyAwarness: initialData.safetyAwarness || false,
          mentalState: initialData.mentalState,
          completedBy: isEditMode
            ? userName
            : initialData.completedBy || userName,
          completionDate:
            initialData.completionDate || new Date().toISOString().split("T")[0]
        }
      : {
          residentId,
          teamId,
          organizationId,
          userId,
          completedBy: userName,
          completionDate: new Date().toISOString().split("T")[0],
          standUnsupported: false,
          visionProblems: false,
          residentEnvironmentalRisks: false,
          safetyAwarness: false
        }
  });

  const onSubmit = async (
    data: z.infer<typeof longTermFallsRiskAssessmentSchema>
  ) => {
    startTransition(async () => {
      try {
        if (isEditMode) {
          await submitReviewedFormMutation({
            formType: "longTermFallsRiskAssessment",
            formData: data,
            originalFormData: initialData || {},
            originalFormId: initialData?._id || "",
            residentId: data.residentId as Id<"residents">,
            auditedBy: userName,
            teamId: data.teamId,
            organizationId: data.organizationId
          });
          toast.success(
            "Long Term Falls Risk Assessment reviewed successfully"
          );
        } else {
          await submitAssessment({
            ...data,
            residentId: data.residentId as Id<"residents">
          });
          toast.success(
            "Long Term Falls Risk Assessment submitted successfully"
          );
        }
        onClose?.();
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment. Please try again.");
      }
    });
  };

  const handleNextStep = async () => {
    let isValid = false;

    // Close the date popover when moving between steps
    setDatePopoverOpen(false);

    if (step === 1) {
      const fieldsToValidate = ["age", "gender", "historyOfFalls"] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      const fieldsToValidate = [
        "mobilityLevel",
        "standUnsupported",
        "personalActivities",
        "domesticActivities"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 3) {
      const fieldsToValidate = [
        "footwear",
        "visionProblems",
        "bladderBowelMovement",
        "residentEnvironmentalRisks"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 4) {
      const fieldsToValidate = [
        "socialRisks",
        "medicalCondition",
        "medicines"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 5) {
      const fieldsToValidate = [
        "safetyAwarness",
        "mentalState",
        "completedBy",
        "completionDate"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);

      if (step === 5) {
        console.log(form.getValues());
        form.handleSubmit(onSubmit)();
        return;
      }
    }

    if (isValid) {
      setStep(step + 1);
    }
  };

  const handlePreviousStep = () => {
    // Close the date popover when moving between steps
    setDatePopoverOpen(false);

    if (step === 1) {
      return;
    }
    setStep(step - 1);
  };

  const currentValues = form.watch();
  const scoreResult = form.formState.isValid
    ? calculateFallsRiskScore(currentValues)
    : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {step === 1 && "Demographics & Fall History"}
          {step === 2 && "Mobility & Daily Activities"}
          {step === 3 && "Environmental & Physical Factors"}
          {step === 4 && "Medical & Social Factors"}
          {step === 5 && "Assessment Completion"}
        </DialogTitle>
        <DialogDescription>
          {step === 1 && "Basic demographic information and fall history"}
          {step === 2 &&
            "Assessment of mobility levels and daily living activities"}
          {step === 3 && "Environmental hazards and physical considerations"}
          {step === 4 && "Medical conditions and social support factors"}
          {step === 5 && "Complete the assessment with final details"}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="overflow-y-auto px-1 space-y-4">
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Age Group</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select age group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="65-80">65-80 years</SelectItem>
                            <SelectItem value="81-85">81-85 years</SelectItem>
                            <SelectItem value="86+">86+ years</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Gender</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="historyOfFalls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>History of Falls</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select fall history" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NEVER">Never fallen</SelectItem>
                          <SelectItem value="FALL-MORE-THAN-12">
                            Fall more than 12 months ago
                          </SelectItem>
                          <SelectItem value="FALL-LAST-12">
                            Fall within last 12 months
                          </SelectItem>
                          <SelectItem value="RECURRENT-LAST-12">
                            Recurrent falls in last 12 months
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 2 && (
              <>
                <FormField
                  control={form.control}
                  name="mobilityLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Mobility Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select mobility level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INDEPENDENT-SAFE-UNAIDED">
                            Independent and safe without aid
                          </SelectItem>
                          <SelectItem value="INDEPENDENT-WITH-AID">
                            Independent with walking aid
                          </SelectItem>
                          <SelectItem value="ASSISTANCE-1-AID">
                            Requires assistance from 1 person + aid
                          </SelectItem>
                          <SelectItem value="ASSISTANCE-2-AID">
                            Requires assistance from 2+ people + aid
                          </SelectItem>
                          <SelectItem value="IMMOBILE">Immobile</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="standUnsupported"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Can stand unsupported</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personalActivities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Personal Care Activities</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select personal care level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INDEPENDENT-SAFE">
                            Independent and safe
                          </SelectItem>
                          <SelectItem value="INDEPENDENT-EQUIPMENT">
                            Independent with equipment
                          </SelectItem>
                          <SelectItem value="ASSISTANCE">
                            Requires assistance
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="domesticActivities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domestic Activities</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select domestic activity level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INDEPENDENT-SAFE">
                            Independent and safe
                          </SelectItem>
                          <SelectItem value="INDEPENDENT-EQUIPMENT">
                            Independent with equipment
                          </SelectItem>
                          <SelectItem value="ASSISTANCE">
                            Requires assistance
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 3 && (
              <>
                <FormField
                  control={form.control}
                  name="footwear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Footwear Assessment</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select footwear status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SAFE">
                            Safe and appropriate footwear
                          </SelectItem>
                          <SelectItem value="UNSAFE">
                            Unsafe or inappropriate footwear
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="visionProblems"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Has vision problems</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bladderBowelMovement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Bladder/Bowel Issues</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select bladder/bowel status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NO-PROBLEMS">
                            No problems identified
                          </SelectItem>
                          <SelectItem value="IDENTIFIED-PROBLEMS">
                            Problems identified
                          </SelectItem>
                          <SelectItem value="FREQUENCY">
                            Frequency issues
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="residentEnvironmentalRisks"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Environmental risks present</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 4 && (
              <>
                <FormField
                  control={form.control}
                  name="socialRisks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Social Support</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select social support level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="24H-CARE">
                            24-hour care available
                          </SelectItem>
                          <SelectItem value="LIMITED-SUPPORT">
                            Limited support available
                          </SelectItem>
                          <SelectItem value="LIVES-ALONE">
                            Lives alone
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medicalCondition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Medical Conditions</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select primary medical condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NO-IDENTIFIED">
                            No identified conditions
                          </SelectItem>
                          <SelectItem value="POSTURAL">
                            Postural problems
                          </SelectItem>
                          <SelectItem value="CARDIAC">
                            Cardiac conditions
                          </SelectItem>
                          <SelectItem value="SKELETAL-CONDITION">
                            Skeletal conditions
                          </SelectItem>
                          <SelectItem value="FRACTURES">
                            History of fractures
                          </SelectItem>
                          <SelectItem value="NEUROLOGICAL-PROBLEMS">
                            Neurological problems
                          </SelectItem>
                          <SelectItem value="LISTED-CONDITIONS">
                            Multiple listed conditions
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medicines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Number of Medications</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select medication count" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NO-MEDICATIONS">
                            No medications
                          </SelectItem>
                          <SelectItem value="LESS-4">
                            Less than 4 medications
                          </SelectItem>
                          <SelectItem value="4-OR-MORE">
                            4 or more medications
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 5 && (
              <>
                <FormField
                  control={form.control}
                  name="safetyAwarness"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Demonstrates safety awareness</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mentalState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Mental State</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select mental state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ORIENTATED">Orientated</SelectItem>
                          <SelectItem value="CONFUSED">Confused</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="completedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Completed By</FormLabel>
                        <FormControl>
                          <Input placeholder="Completed By" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="completionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Completion Date</FormLabel>
                        <Popover
                          open={datePopoverOpen}
                          onOpenChange={setDatePopoverOpen}
                          modal
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(
                                    date.toISOString().split("T")[0]
                                  );
                                  setDatePopoverOpen(false);
                                }
                              }}
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {scoreResult && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">
                      Risk Assessment Score
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Score</p>
                        <p className="text-2xl font-bold">
                          {scoreResult.totalScore}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Risk Level</p>
                        <p
                          className={`text-lg font-semibold ${
                            scoreResult.riskLevel === "LOW"
                              ? "text-green-600"
                              : scoreResult.riskLevel === "MODERATE"
                                ? "text-yellow-600"
                                : scoreResult.riskLevel === "HIGH"
                                  ? "text-orange-600"
                                  : "text-red-600"
                          }`}
                        >
                          {scoreResult.riskLevel}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? onClose : handlePreviousStep}
              disabled={step === 1 || isLoading}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              onClick={
                step === 5
                  ? () => {
                      console.log("Assessment data:", form.getValues());
                      form.handleSubmit(onSubmit)();
                    }
                  : handleNextStep
              }
              disabled={isLoading}
              type={step === 5 ? "submit" : "button"}
            >
              {isLoading
                ? "Saving..."
                : step === 1
                  ? "Start Assessment"
                  : step === 5
                    ? "Save Assessment"
                    : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
