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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { nutritionalAssessmentSchema } from "@/schemas/residents/care-file/nutritionalAssessmentSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

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
  isEditMode = false
}: NutritionalAssessmentDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [assessmentDatePopoverOpen, setAssessmentDatePopoverOpen] = useState(false);

  const submitAssessment = useMutation(
    api.careFiles.nutritionalAssessment.submitNutritionalAssessment
  );
  const submitReviewedFormMutation = useMutation(
    api.managerAudits.submitReviewedForm
  );

  const form = useForm<z.infer<typeof nutritionalAssessmentSchema>>({
    resolver: zodResolver(nutritionalAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          residentId,
          teamId,
          organizationId,
          userId,
          residentName: initialData.residentName || `${resident.firstName} ${resident.lastName}`,
          dateOfBirth: initialData.dateOfBirth || format(new Date(resident.dateOfBirth), "dd/MM/yyyy"),
          bedroomNumber: initialData.bedroomNumber || resident.roomNumber || "",
          height: initialData.height || "",
          weight: initialData.weight || "",
          mustScore: initialData.mustScore || "",
          hasSaltInvolvement: initialData.hasSaltInvolvement || false,
          saltTherapistName: initialData.saltTherapistName || "",
          saltContactDetails: initialData.saltContactDetails || "",
          hasDietitianInvolvement: initialData.hasDietitianInvolvement || false,
          dietitianName: initialData.dietitianName || "",
          dietitianContactDetails: initialData.dietitianContactDetails || "",
          foodFortificationRequired: initialData.foodFortificationRequired || "",
          supplementsPrescribed: initialData.supplementsPrescribed || "",
          foodConsistency: initialData.foodConsistency || {},
          fluidConsistency: initialData.fluidConsistency || {},
          assistanceRequired: initialData.assistanceRequired || "",
          completedBy: initialData.completedBy || userName,
          jobRole: initialData.jobRole || "",
          signature: initialData.signature || userName,
          assessmentDate: initialData.assessmentDate || Date.now()
        }
      : {
          residentId,
          teamId,
          organizationId,
          userId,
          residentName: `${resident.firstName} ${resident.lastName}`,
          dateOfBirth: format(new Date(resident.dateOfBirth), "dd/MM/yyyy"),
          bedroomNumber: resident.roomNumber || "",
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
          assessmentDate: Date.now()
        }
  });

  const hasSaltInvolvement = form.watch("hasSaltInvolvement");
  const hasDietitianInvolvement = form.watch("hasDietitianInvolvement");

  function onSubmit(values: z.infer<typeof nutritionalAssessmentSchema>) {
    console.log("Form submission triggered - values:", values);
    startTransition(async () => {
      try {
        if (isEditMode) {
          const data = await submitReviewedFormMutation({
            formType: "nutritionalAssessment",
            formData: {
              ...values,
              residentId: residentId as Id<"residents">,
              savedAsDraft: false
            },
            originalFormData: initialData,
            originalFormId: initialData?._id,
            residentId: residentId as Id<"residents">,
            auditedBy: userName,
            auditNotes: "Form reviewed and updated",
            teamId,
            organizationId
          });
          if (data.hasChanges) {
            toast.success("Form reviewed and updated successfully!");
          } else {
            toast.success("Form reviewed and approved without changes!");
          }
        } else {
          await submitAssessment({
            ...values,
            residentId: residentId as Id<"residents">,
            savedAsDraft: false
          });
          toast.success("Nutritional assessment submitted successfully");
        }
        setTimeout(() => {
          onClose?.();
        }, 500);
      } catch (error) {
        console.error("Error submitting assessment:", error);
        toast.error("Failed to submit assessment. Please try again.");
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nutritional Assessment</DialogTitle>
        <DialogDescription>
          Complete the nutritional assessment for the resident
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[70vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Resident Information */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">1. Resident Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="residentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Resident Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Date of Birth</FormLabel>
                      <FormControl>
                        <Input placeholder="DD/MM/YYYY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bedroomNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Bedroom Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Room 101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Height</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 170cm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Weight</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 70kg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="mustScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Current MUST Score</FormLabel>
                    <FormControl>
                      <Input placeholder="Malnutrition Universal Screening Tool score" {...field} />
                    </FormControl>
                    <FormDescription>
                      Malnutrition Universal Screening Tool
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 2: Clinical Involvement */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">2. Clinical Involvement</h3>

              <FormField
                control={form.control}
                name="hasSaltInvolvement"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Is there SALT (Speech and Language Therapy) involvement?
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {hasSaltInvolvement && (
                <div className="ml-6 space-y-4 border-l-2 border-muted-foreground/20 pl-4">
                  <FormField
                    control={form.control}
                    name="saltTherapistName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name of Speech and Language Therapist</FormLabel>
                        <FormControl>
                          <Input placeholder="Therapist name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="saltContactDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Details</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number or email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="hasDietitianInvolvement"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Is there Dietitian involvement?
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {hasDietitianInvolvement && (
                <div className="ml-6 space-y-4 border-l-2 border-muted-foreground/20 pl-4">
                  <FormField
                    control={form.control}
                    name="dietitianName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name of Dietitian</FormLabel>
                        <FormControl>
                          <Input placeholder="Dietitian name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dietitianContactDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Details</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number or email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Section 3: Dietary Requirements & Supplements */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">3. Dietary Requirements & Supplements</h3>
              <FormField
                control={form.control}
                name="foodFortificationRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Does food require fortification? If so, what is required?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe fortification requirements..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplementsPrescribed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Are supplements prescribed? If so, record all supplements prescribed</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List all prescribed supplements..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 4: IDDSI Consistency Levels */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">4. IDDSI Consistency Levels</h3>

              <div className="space-y-3">
                <FormLabel>Food Consistency (Detail prescribed food consistency)</FormLabel>
                <div className="space-y-2 ml-2">
                  <FormField
                    control={form.control}
                    name="foodConsistency.level7EasyChew"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Level 7: Easy Chew
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="foodConsistency.level6SoftBiteSized"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Level 6: Soft & Bite Sized
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="foodConsistency.level5MincedMoist"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Level 5: Minced & Moist
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="foodConsistency.level4Pureed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Level 4: Pureed
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="foodConsistency.level3Liquidised"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Level 3: Liquidised
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <FormLabel>Fluid Consistency (Detail prescribed fluid consistency)</FormLabel>
                <div className="space-y-2 ml-2">
                  <FormField
                    control={form.control}
                    name="fluidConsistency.level4ExtremelyThick"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Level 4: Extremely Thick
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fluidConsistency.level3ModeratelyThick"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Level 3: Moderately Thick
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fluidConsistency.level2MildlyThick"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Level 2: Mildly Thick
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fluidConsistency.level1SlightlyThick"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Level 1: Slightly Thick
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fluidConsistency.level0Thin"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Level 0: Thin
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Assistance & Administration */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">5. Assistance & Administration</h3>
              <FormField
                control={form.control}
                name="assistanceRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Detail assistance required with eating or drinking</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the assistance needed..."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
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
                      <FormLabel required>Completed By (Name)</FormLabel>
                      <FormControl>
                        <Input placeholder="Staff name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Job Role</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Senior Care Assistant" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="signature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Signature</FormLabel>
                    <FormControl>
                      <Input placeholder="Staff signature" {...field} />
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
                    <FormLabel required>Assessment Date</FormLabel>
                    <Popover modal open={assessmentDatePopoverOpen} onOpenChange={setAssessmentDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
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
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                        onInteractOutside={(e) => e.preventDefault()}
                      >
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) => {
                            field.onChange(date?.getTime());
                            setAssessmentDatePopoverOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </div>
      <DialogFooter>
        <Button onClick={onClose} variant="outline" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Saving..." : "Save Assessment"}
        </Button>
      </DialogFooter>
    </>
  );
}
