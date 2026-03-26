"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { PersonalProfileSchema } from "@/schemas/residents/care-file/personalProfileSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

const VIEW_DIV = "w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-90 whitespace-pre-wrap break-words min-h-10";

interface PersonalProfileDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  userRole: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function PersonalProfileDialog({
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
}: PersonalProfileDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [familyRepDatePopoverOpen, setFamilyRepDatePopoverOpen] = useState(false);
  const [completedDatePopoverOpen, setCompletedDatePopoverOpen] = useState(false);

  const defaultFormValues: z.infer<typeof PersonalProfileSchema> = {
    residentId,
    organizationId,
    userId,
    firstName: resident.first_name ?? "",
    lastName: resident.last_name ?? "",
    dateOfBirth: resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
    desiredName: resident.first_name ?? "",
    informationSharingConsent: false,
    birthAndGrowth: "",
    parentsDetails: "",
    siblingsDetails: "",
    religionSpirituality: "",
    schoolChildhood: "",
    friendsNeighbours: "",
    partnerFamilyDetails: "",
    workHistory: "",
    personality: "",
    hobbiesInterests: "",
    likes: "",
    dislikes: "",
    happiestMemory: "",
    enjoyTalkingAbout: "",
    traumaticEvents: "",
    usualRoutine: "",
    mentalHealthProblems: "",
    illnessRecovery: "",
    physicalHealthProblems: "",
    feelingsAboutCare: "",
    staffDifficulties: "",
    additionalComments: "",
    familyRepName: "",
    familyRepRelationship: "",
    familyRepDate: undefined,
    familyRepSignature: "",
    completedByName: userName,
    completedByDesignation: userRole ? userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "",
    completedByDate: Date.now(),
    completedBySignature: userName,
    assessmentDate: Date.now(),
    status: "draft",
  };

  const form = useForm<z.infer<typeof PersonalProfileSchema>>({
    resolver: zodResolver(PersonalProfileSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        ...defaultFormValues,
        ...initialData.assessment_data,
        status: initialData.status || "draft",
      }
      : defaultFormValues
  });

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          assessment_data: formData,
          assessment_date: new Date(formData.assessmentDate).toISOString().split('T')[0],
          completed_by: formData.completedByName || userName,
          created_by: userId,
          status: "completed"
        };

        await submitAssessmentWithVersioning(
          'personal_profiles',
          payload,
          initialData,
          isEditMode
        );

        toast.success(isEditMode ? "Personal Profile updated successfully!" : "Personal Profile saved successfully");
        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save Personal Profile");
      }
    });
  };

  const SectionHeader = ({ title, description }: { title: string, description?: string }) => (
    <div className="space-y-1 pb-2 border-b mt-8 first:mt-0">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">{title}</h4>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Review" : "Complete"} Personal Profile
          </DialogTitle>
          <DialogDescription>
            This information will help staff provide person-centered care.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="bg-muted/30 p-4 rounded-lg mb-6 text-sm italic">
        How will this information help us to understand the person with dementia? To provide good person-centered care we need to know as much as possible about the person&apos;s life, their family, their work, their personality, their likes and dislikes, and what makes them who they are today.
      </div>

      <Form {...form}>
        <fieldset disabled={viewOnly} className={cn("space-y-8", viewOnly && "pointer-events-none opacity-90")}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 pb-10">
            
            {/* Resident Details */}
            <div className="space-y-4">
              <SectionHeader title="Resident Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>First Name</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className={VIEW_DIV}>{field.value || " "}</div>
                        ) : (
                          <Input {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Last Name</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className={VIEW_DIV}>{field.value || " "}</div>
                        ) : (
                          <Input {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="desiredName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>What would you like to be called?</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className={VIEW_DIV}>{field.value || " "}</div>
                        ) : (
                          <Input {...field} placeholder="Preferred name" />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>Date of Birth</FormLabel>
                      <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => { field.onChange(date?.getTime()); setDobPopoverOpen(false); }}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Life Story Sections */}
            <div className="grid grid-cols-1 gap-6 mt-8">
              <div className="space-y-4">
                <SectionHeader title="Background & Growth" description="Place of birth? Where he/she grew up? Where else did he/she live? Why did he/she move?" />
                <FormField control={form.control} name="birthAndGrowth" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Parents" description="Parents' names? What parents did for a living? Relationship with parents? Date parents died, cause of death?" />
                <FormField control={form.control} name="parentsDetails" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Siblings" description="Brothers and sisters names? Relationships with siblings?" />
                <FormField control={form.control} name="siblingsDetails" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Religion / Spirituality" description="Beliefs? Dates of religious customs? Celebrated? Times of day to pray? Weekly service attended? Name of clergy?" />
                <FormField control={form.control} name="religionSpirituality" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="School Days & Childhood" description="Favourite subject, achievements, best friend, any traumatic events or illness?" />
                <FormField control={form.control} name="schoolChildhood" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Friends & Neighbours" description="Significant friends / neighbours?" />
                <FormField control={form.control} name="friendsNeighbours" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Partner, Marriage & Children" description="How did he/she meet their spouse? Length of courtship? Date of marriage? Children's names etc." />
                <FormField control={form.control} name="partnerFamilyDetails" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Work History" description="Did he/she work? Where did he/she work, for how long, did he/she enjoy work?" />
                <FormField control={form.control} name="workHistory" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Personality" description="Happy, gentle, quick tempered, easy going, introvert, extrovert, etc. What made him/her upset? How did he/she cope when stressed?" />
                <FormField control={form.control} name="personality" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Hobbies & Interests" description="Including pets. What did they do to relax?" />
                <FormField control={form.control} name="hobbiesInterests" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Likes" description="Food, drink, music, films, places, colours, clothes and toiletries, socialising." />
                <FormField control={form.control} name="likes" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Dislikes" description="Food, drink, approaches, bathing/washing preferences, people, places." />
                <FormField control={form.control} name="dislikes" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Happiest Memory" description="Happiest memory? Proudest moment? Biggest achievement?" />
                <FormField control={form.control} name="happiestMemory" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Communication" description="What did he/she enjoy talking about? What makes him/her laugh?" />
                <FormField control={form.control} name="enjoyTalkingAbout" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Traumatic Events" description="Loss of a child/pet, accidents, violent events, breakdown of relationship, etc." />
                <FormField control={form.control} name="traumaticEvents" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Usual Routine" description="Prior to coming into care. Time to get up, bed, meals, TV/radio, visits, reading, etc." />
                <FormField control={form.control} name="usualRoutine" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Mental Health" description="Has he/she ever had any mental health problems? (e.g. depression, anxiety etc)" />
                <FormField control={form.control} name="mentalHealthProblems" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Illness Recovery" description="If he/she was ill in the past what would have helped to make him/her feel better?" />
                <FormField control={form.control} name="illnessRecovery" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Physical Health & Pain" description="Physical health problems? Complain of pain? How did he/she cope with pain?" />
                <FormField control={form.control} name="physicalHealthProblems" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Feelings About Care" description="Has he/she ever talked about being in care and how did he/she feel about it?" />
                <FormField control={form.control} name="feelingsAboutCare" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Staff Observations" description="Why do you think staff are experiencing difficulties? What do you think might help?" />
                <FormField control={form.control} name="staffDifficulties" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Additional Comments" description="Special stories, memories, etc." />
                <FormField control={form.control} name="additionalComments" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "min-h-[100px]")}>{field.value || " "}</div>
                      ) : (
                        <Textarea {...field} className="min-h-[100px]" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Consent & Signatures */}
            <div className="space-y-8 mt-12 bg-muted/20 p-6 rounded-xl border border-dashed">
              <SectionHeader title="Consent & Signatures" />
              
              <FormField
                control={form.control}
                name="informationSharingConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree that this information is shared with relevant staff
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {/* Family / Representative Section */}
              <div className="space-y-4 mt-6">
                <h5 className="text-sm font-medium border-l-2 border-primary pl-2">Family / Representative</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="familyRepName" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl>
                      {viewOnly ? (
                        <div className={VIEW_DIV}>{field.value || " "}</div>
                      ) : (
                        <Input {...field} />
                      )}
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="familyRepDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover open={familyRepDatePopoverOpen} onOpenChange={setFamilyRepDatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button></FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { field.onChange(date?.getTime()); setFamilyRepDatePopoverOpen(false); }} />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="familyRepSignature" render={({ field }) => (
                    <FormItem><FormLabel>Signature (Type name)</FormLabel><FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "font-signature italic text-lg")}>{field.value || " "}</div>
                      ) : (
                        <Input {...field} className="font-signature italic text-lg" />
                      )}
                    </FormControl></FormItem>
                  )} />
                </div>
              </div>

              {/* Staff Section */}
              <div className="space-y-4 mt-6">
                <h5 className="text-sm font-medium border-l-2 border-primary pl-2">Completed By (Staff)</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="completedByName" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl>
                      {viewOnly ? (
                        <div className={VIEW_DIV}>{field.value || " "}</div>
                      ) : (
                        <Input {...field} />
                      )}
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="completedByDesignation" render={({ field }) => (
                    <FormItem><FormLabel>Designation / Job Role</FormLabel><FormControl>
                      {viewOnly ? (
                        <div className={VIEW_DIV}>{field.value || " "}</div>
                      ) : (
                        <Input {...field} />
                      )}
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="completedByDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover open={completedDatePopoverOpen} onOpenChange={setCompletedDatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button></FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { field.onChange(date?.getTime()); setCompletedDatePopoverOpen(false); }} />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="completedBySignature" render={({ field }) => (
                    <FormItem><FormLabel>Signature (Type name)</FormLabel><FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "font-signature italic text-lg")}>{field.value || " "}</div>
                      ) : (
                        <Input {...field} className="font-signature italic text-lg" />
                      )}
                    </FormControl></FormItem>
                  )} />
                </div>
              </div>
            </div>


            <button type="submit" id="care-file-submit-btn" className="hidden" />
          </form>
        </fieldset>
      </Form>
    </>
  );
}
