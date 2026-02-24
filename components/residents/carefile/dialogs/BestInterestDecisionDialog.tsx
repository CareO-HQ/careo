"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bestInterestDecisionSchema,
  type BestInterestDecisionFormData,
} from "@/schemas/residents/care-file/bestInterestDecisionSchema";
import { format } from "date-fns";
import { X, Plus, Loader2 } from "lucide-react";

interface BestInterestDecisionDialogProps {
  residentId: string;
  teamId: string;
  organizationId: string;
  userId: string;
  userName?: string;
  resident: any;
  onClose?: () => void;
  initialData?: any;
  isInline?: boolean;
}

const DECISION_TYPES = [
  "Medical treatment",
  "Care placement",
  "Bed rails / equipment",
  "Restraint / Restrictive practice",
  "Financial matter",
  "Daily living support",
  "Other (specify)"
];

const DISCUSSION_PARTICIPANTS = [
  "Next of Kin / Family",
  "Advocate",
  "MDT members",
  "GP / Nurse",
  "Social Worker",
  "OT / Physio",
  "Resident (where possible)",
  "Others (specify)"
];

export default function BestInterestDecisionDialog({
  residentId,
  teamId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
  isInline = false,
}: BestInterestDecisionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BestInterestDecisionFormData>({
    resolver: zodResolver(bestInterestDecisionSchema),
    defaultValues: initialData ? {
      residentId: initialData.residentId,
      teamId: initialData.teamId,
      organizationId: initialData.organizationId,
      userId: initialData.userId,
      residentFullName: initialData.residentFullName,
      dateOfBirth: initialData.dateOfBirth,
      residentIdNumber: initialData.residentIdNumber,
      dateOfDecision: initialData.dateOfDecision,
      typeOfDecision: initialData.typeOfDecision,
      otherDecisionType: initialData.otherDecisionType,
      detailsOfDecision: initialData.detailsOfDecision,
      ableToUnderstand: initialData.ableToUnderstand,
      reasonsForLackOfCapacity: initialData.reasonsForLackOfCapacity,
      assessorName: initialData.assessorName,
      assessorRole: initialData.assessorRole,
      assessorSignature: initialData.assessorSignature,
      assessmentDate: initialData.assessmentDate,
      discussionWith: initialData.discussionWith,
      viewsExpressed: initialData.viewsExpressed,
      optionsConsidered: initialData.optionsConsidered,
      reasonForPreferredOption: initialData.reasonForPreferredOption,
      risksIfNotFollowed: initialData.risksIfNotFollowed,
      decisionOutcome: initialData.decisionOutcome,
      summaryRationale: initialData.summaryRationale,
      decisionMakerName: initialData.decisionMakerName,
      decisionMakerRole: initialData.decisionMakerRole,
      decisionMakerSignature: initialData.decisionMakerSignature,
      decisionMakerDate: initialData.decisionMakerDate,
      witnessName: initialData.witnessName,
      witnessRole: initialData.witnessRole,
      witnessSignature: initialData.witnessSignature,
      witnessDate: initialData.witnessDate,
      nextOfKinName: initialData.nextOfKinName,
      nextOfKinRelationship: initialData.nextOfKinRelationship,
      nextOfKinSignature: initialData.nextOfKinSignature,
      nextOfKinDate: initialData.nextOfKinDate,
      savedAsDraft: initialData.savedAsDraft,
      createdAt: initialData.createdAt,
    } : {
      residentId,
      teamId,
      organizationId,
      userId,
      residentFullName: resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : "",
      dateOfBirth: resident?.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
      residentIdNumber: resident?.nhs_health_number || resident?.id || "",
      dateOfDecision: format(new Date(), "yyyy-MM-dd"),
      typeOfDecision: [],
      detailsOfDecision: "",
      ableToUnderstand: "YES",
      assessorName: userName || "",
      assessorRole: "",
      assessorSignature: "",
      assessmentDate: format(new Date(), "yyyy-MM-dd"),
      discussionWith: [],
      viewsExpressed: [{
        personConsulted: "",
        relationship: "",
        viewPreference: "",
        notes: ""
      }],
      optionsConsidered: [{
        option: "",
        benefits: "",
        risks: "",
        preferred: false
      }],
      reasonForPreferredOption: "",
      risksIfNotFollowed: "",
      decisionOutcome: "PROCEED",
      summaryRationale: "",
      decisionMakerName: userName || "",
      decisionMakerRole: "",
      decisionMakerSignature: "",
      decisionMakerDate: format(new Date(), "yyyy-MM-dd"),
    }
  });

  const { fields: viewsFields, append: appendView, remove: removeView } = useFieldArray({
    control: form.control,
    name: "viewsExpressed"
  });

  const { fields: optionsFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: form.control,
    name: "optionsConsidered"
  });

  const onSubmit = async (data: BestInterestDecisionFormData) => {
    try {
      setIsSubmitting(true);

      await submitAssessmentWithVersioning(
        "best_interest_decisions",
        {
          resident_id: residentId,
          organization_id: organizationId,
          assessment_data: data,
          decision_details: data.detailsOfDecision || data.summaryRationale || "Best interest decision",
          assessment_date: data.dateOfDecision,
          completed_by: data.assessorName,
          created_by: userId
        },
        initialData,
        !!initialData
      );

      toast.success("Best interest decision submitted successfully");
      setTimeout(() => {
        onClose?.();
      }, 500);
    } catch (error) {
      console.error("Error submitting decision:", error);
      toast.error("Failed to submit decision. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-8">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Best Interest Decision Form</DialogTitle>
          <DialogDescription>
            Record the best interest decision for a resident who lacks capacity to make this decision.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="space-y-12 pb-20">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
            <button type="submit" id="care-file-submit-btn" className="hidden" />

            {/* Section A: Resident Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Section A — Resident Information</h3>
              </div>

              <FormField
                control={form.control}
                name="residentFullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resident Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            field.onChange(date.getTime());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="residentIdNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resident ID / File Number</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfDecision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Decision</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section B: Decision Being Made */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Section B — Decision Being Made</h3>
              </div>

              <FormField
                control={form.control}
                name="typeOfDecision"
                render={() => (
                  <FormItem>
                    <FormLabel>Type of Decision</FormLabel>
                    <div className="space-y-2">
                      {DECISION_TYPES.map((type) => (
                        <FormField
                          key={type}
                          control={form.control}
                          name="typeOfDecision"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type)}
                                  onCheckedChange={(checked) => {
                                    const newValue = checked
                                      ? [...(field.value || []), type]
                                      : field.value?.filter((v) => v !== type) || [];
                                    field.onChange(newValue);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{type}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("typeOfDecision")?.includes("Other (specify)") && (
                <FormField
                  control={form.control}
                  name="otherDecisionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Decision Type (specify)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="detailsOfDecision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details of Decision Required</FormLabel>
                    <FormControl><Textarea rows={6} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section C: Capacity Assessment */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Section C — Capacity Assessment</h3>
              </div>

              <FormField
                control={form.control}
                name="ableToUnderstand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Is the resident able to understand the decision?</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="YES" id="yes" />
                          <FormLabel htmlFor="yes" className="font-normal">Yes</FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="NO" id="no" />
                          <FormLabel htmlFor="no" className="font-normal">No</FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("ableToUnderstand") === "NO" && (
                <div className="border rounded-lg p-4 space-y-4">
                  <FormLabel>Reasons for Lack of Capacity</FormLabel>

                  {[
                    { name: "reasonsForLackOfCapacity.cognitiveImpairment", label: "Cognitive impairment" },
                    { name: "reasonsForLackOfCapacity.communicationDifficulty", label: "Communication difficulty" },
                    { name: "reasonsForLackOfCapacity.fluctuatingCapacity", label: "Fluctuating capacity" },
                    { name: "reasonsForLackOfCapacity.other", label: "Other (specify)" },
                  ].map((item) => (
                    <FormField
                      key={item.name}
                      control={form.control}
                      name={item.name as any}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">{item.label}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}

                  {form.watch("reasonsForLackOfCapacity.other") && (
                    <FormField
                      control={form.control}
                      name="reasonsForLackOfCapacity.otherDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea rows={3} placeholder="Specify other reasons..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold">Assessment Conducted By</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assessorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessor Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assessorRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role (RN, GP, OT, etc)</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assessorSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Signature</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assessmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Section D: Best Interest Considerations */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Section D — Best Interest Considerations</h3>
              </div>

              <FormField
                control={form.control}
                name="discussionWith"
                render={() => (
                  <FormItem>
                    <FormLabel>Discussion With</FormLabel>
                    <div className="space-y-2">
                      {DISCUSSION_PARTICIPANTS.map((participant) => (
                        <FormField
                          key={participant}
                          control={form.control}
                          name="discussionWith"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(participant)}
                                  onCheckedChange={(checked) => {
                                    const newValue = checked
                                      ? [...(field.value || []), participant]
                                      : field.value?.filter((v) => v !== participant) || [];
                                    field.onChange(newValue);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{participant}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Views Expressed</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendView({ personConsulted: "", relationship: "", viewPreference: "", notes: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add View
                  </Button>
                </div>

                {viewsFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-4 relative">
                    {viewsFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => removeView(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`viewsExpressed.${index}.personConsulted`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Person Consulted</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`viewsExpressed.${index}.relationship`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship to Resident</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name={`viewsExpressed.${index}.viewPreference`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>View / Preference</FormLabel>
                          <FormControl><Textarea rows={3} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`viewsExpressed.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl><Textarea rows={2} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Section E: Options & Risks */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Section E — Options & Risks</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Options Considered</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendOption({ option: "", benefits: "", risks: "", preferred: false })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>

                {optionsFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-4 relative">
                    {optionsFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <FormField
                      control={form.control}
                      name={`optionsConsidered.${index}.option`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Option</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`optionsConsidered.${index}.benefits`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Benefits</FormLabel>
                          <FormControl><Textarea rows={3} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`optionsConsidered.${index}.risks`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risks</FormLabel>
                          <FormControl><Textarea rows={3} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`optionsConsidered.${index}.preferred`}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">Preferred Option</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>

              <FormField
                control={form.control}
                name="reasonForPreferredOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Preferred Option</FormLabel>
                    <FormControl><Textarea rows={4} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="risksIfNotFollowed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risks if Decision Not Followed</FormLabel>
                    <FormControl><Textarea rows={4} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section F: Best Interest Decision */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Section F — Best Interest Decision</h3>
              </div>

              <FormField
                control={form.control}
                name="decisionOutcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Best Interest Decision Outcome</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="PROCEED" id="proceed" />
                          <FormLabel htmlFor="proceed" className="font-normal">Proceed with option</FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="DO_NOT_PROCEED" id="not-proceed" />
                          <FormLabel htmlFor="not-proceed" className="font-normal">Do not proceed</FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="summaryRationale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary of Rationale</FormLabel>
                    <div className="text-xs text-muted-foreground mb-2">
                      Include why this decision is in the resident&apos;s best interest and reference to resident&apos;s past wishes if known
                    </div>
                    <FormControl><Textarea rows={8} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section G: Signatures */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">Section G — Signatures</h3>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">Decision Made By</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="decisionMakerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="decisionMakerRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="RN">Registered Nurse</SelectItem>
                              <SelectItem value="GP">GP</SelectItem>
                              <SelectItem value="Social Worker">Social Worker</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="decisionMakerSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Signature</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="decisionMakerDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">Witness / Additional Signatory (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="witnessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="witnessRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="witnessSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Signature</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="witnessDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">Next of Kin / Representative Acknowledgement (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nextOfKinName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextOfKinRelationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextOfKinSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Signature</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextOfKinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

          </form>
        </Form>
      </div>

      {!isInline && (
        <div className="border-t pt-8 flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-6 px-6 pb-2">
          <Button variant="outline" onClick={() => onClose?.()} disabled={isSubmitting} size="lg">
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting} size="lg" className="min-w-[180px]">
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
            ) : (
              initialData ? "Save Changes" : "Submit Decision"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
