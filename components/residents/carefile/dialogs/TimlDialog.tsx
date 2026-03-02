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
import { Textarea } from "@/components/ui/textarea";
import { CreateTimlAssessmentSchema } from "@/schemas/residents/care-file/timlSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface TimlDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function TimlDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  userName,
  resident,
  onClose,
  initialData,
  isEditMode = false,
  isInline = false,
  viewOnly = false,
}: TimlDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [dateOfBirthPopoverOpen, setDateOfBirthPopoverOpen] = useState(false);
  const [completionDatePopoverOpen, setCompletionDatePopoverOpen] =
    useState(false);

  const form = useForm<z.infer<typeof CreateTimlAssessmentSchema>>({
    resolver: zodResolver(CreateTimlAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        agree: initialData.agree ?? false,
        firstName: initialData.assessment_data?.firstName ?? resident.first_name ?? "",
        lastName: initialData.assessment_data?.lastName ?? resident.last_name ?? "",
        dateOfBirth:
          initialData.assessment_data?.dateOfBirth ?? new Date(resident.date_of_birth).getTime(),
        desiredName: initialData.assessment_data?.desiredName ?? resident.first_name ?? "",
        born: initialData.assessment_data?.born ?? "",
        parentsSiblingsNames: initialData.assessment_data?.parentsSiblingsNames ?? "",
        familyMembersOccupation: initialData.assessment_data?.familyMembersOccupation ?? "",
        whereLived: initialData.assessment_data?.whereLived ?? "",
        schoolAttended: initialData.assessment_data?.schoolAttended ?? "",
        favouriteSubject: initialData.assessment_data?.favouriteSubject ?? "",
        pets: initialData.assessment_data?.pets ?? false,
        petsNames: initialData.assessment_data?.petsNames ?? "",
        whenLeavingSchool: initialData.assessment_data?.whenLeavingSchool ?? "",
        whatWork: initialData.assessment_data?.whatWork ?? "",
        whereWorked: initialData.assessment_data?.whereWorked ?? "",
        specialTraining: initialData.assessment_data?.specialTraining ?? "",
        specialMemoriesWork: initialData.assessment_data?.specialMemoriesWork ?? "",
        nationalService: initialData.assessment_data?.nationalService ?? "",
        partner: initialData.assessment_data?.partner ?? "",
        partnerName: initialData.assessment_data?.partnerName ?? "",
        whereMet: initialData.assessment_data?.whereMet ?? "",
        whereWhenMarried: initialData.assessment_data?.whereWhenMarried ?? "",
        whatDidYouWear: initialData.assessment_data?.whatDidYouWear ?? "",
        flowers: initialData.assessment_data?.flowers ?? "",
        honeyMoon: initialData.assessment_data?.honeyMoon ?? "",
        whereLivedAdult: initialData.assessment_data?.whereLivedAdult ?? "",
        childrenAndNames: initialData.assessment_data?.childrenAndNames ?? "",
        grandchildrenAndNames: initialData.assessment_data?.grandchildrenAndNames ?? "",
        specialFriendsAndNames: initialData.assessment_data?.specialFriendsAndNames ?? "",
        specialFriendsMetAndStillTouch:
          initialData.assessment_data?.specialFriendsMetAndStillTouch ?? "",
        whenRetired: initialData.assessment_data?.whenRetired ?? "",
        lookingForwardTo: initialData.assessment_data?.lookingForwardTo ?? "",
        hobbiesInterests: initialData.assessment_data?.hobbiesInterests ?? "",
        biggestChangesRetirement: initialData.assessment_data?.biggestChangesRetirement ?? "",
        whatEnjoyNow: initialData.assessment_data?.whatEnjoyNow ?? "",
        whatLikeRead: initialData.assessment_data?.whatLikeRead ?? "",
        completedBy: isEditMode ? userName : (initialData.assessment_data?.completedBy ?? userName),
        completedByJobRole: initialData.assessment_data?.completedByJobRole ?? "",
        completedBySignature: initialData.completedBySignature || initialData.completed_by || userName,
        assessmentDate: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : (initialData.assessment_data?.date ? new Date(initialData.assessment_data.date).getTime() : Date.now()),
        status: initialData.status || "draft"
      }
      : {
        agree: false,
        firstName: resident.first_name ?? "",
        lastName: resident.last_name ?? "",
        dateOfBirth: new Date(resident.date_of_birth).getTime() ?? Date.now(),
        desiredName: resident.first_name ?? "",
        born: "",
        parentsSiblingsNames: "",
        familyMembersOccupation: "",
        whereLived: "",
        schoolAttended: "",
        favouriteSubject: "",
        pets: false,
        petsNames: "",
        whenLeavingSchool: "",
        whatWork: "",
        whereWorked: "",
        specialTraining: "",
        specialMemoriesWork: "",
        nationalService: "",
        partner: "",
        partnerName: "",
        whereMet: "",
        whereWhenMarried: "",
        whatDidYouWear: "",
        flowers: "",
        honeyMoon: "",
        whereLivedAdult: "",
        childrenAndNames: "",
        grandchildrenAndNames: "",
        specialFriendsAndNames: "",
        specialFriendsMetAndStillTouch: "",
        whenRetired: "",
        lookingForwardTo: "",
        hobbiesInterests: "",
        biggestChangesRetirement: "",
        whatEnjoyNow: "",
        whatLikeRead: "",
        completedBy: userName,
        completedByJobRole: "",
        completedBySignature: userName,
        assessmentDate: Date.now(),
        status: "draft"
      }
  });

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          assessment_data: formData,
          management_plan: (formData as any).managementPlan || null,
          treatment_recommendation: (formData as any).treatmentRecommendation || null,
          assessment_date: new Date(formData.assessmentDate).toISOString().split('T')[0],
          completed_by: formData.completedBy,
          created_by: userId,
          status: "completed"
        };

        await submitAssessmentWithVersioning(
          'timl_assessments',
          payload,
          initialData,
          isEditMode
        );

        toast.success(isEditMode ? "TIML assessment updated successfully!" : "TIML assessment saved successfully");

        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save TIML assessment");
      }
    });
  };

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Review" : "Complete"} This Is My Life Assessment
          </DialogTitle>
          <DialogDescription>
            Complete all sections below to record the resident&apos;s life story
          </DialogDescription>
        </DialogHeader>
      )}

      <Form {...form}>
        <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
            autoComplete="off"
          >
            <button
              type="button"
              id="care-file-submit-btn"
              className="hidden"
              onClick={form.handleSubmit(handleSubmit, (errors) => {
                console.error("TIML form errors:", errors);
                toast.error("Please fill in all required fields correctly.");
              })}
            />
            <div className="space-y-8 px-1">

              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Basic Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Basic information and consent to complete the life story assessment
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="agree"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>
                          The resident has agreed to complete this life story
                          assessment
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="off" />
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
                          <Input {...field} autoComplete="off" />
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
                        <Popover
                          open={dateOfBirthPopoverOpen}
                          onOpenChange={setDateOfBirthPopoverOpen}
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
                                  field.onChange(date.getTime());
                                  setDateOfBirthPopoverOpen(false);
                                }
                              }}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="desiredName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          What would you like to be called?
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Preferred name"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 2: Childhood */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Childhood</h4>
                  <p className="text-sm text-muted-foreground">
                    Tell us about your childhood, family, school and early memories
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="born"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Where were you born?</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="City, country, or region" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="parentsSiblingsNames"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What were your parents&apos; and siblings&apos; names?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Names of family members" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="familyMembersOccupation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What work did your family members do?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Family occupations" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whereLived"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Where did you live as a child?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Childhood homes and locations" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="schoolAttended"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What school(s) did you attend?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="School names and locations" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="favouriteSubject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What was your favourite subject?</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Favourite school subject" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pets"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Did you have any pets?</FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("pets") && (
                    <FormField
                      control={form.control}
                      name="petsNames"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What were their names?</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Pet names" autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Section 3: Adolescence & Early Career */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Adolescence & Early Career</h4>
                  <p className="text-sm text-muted-foreground">
                    Share your experiences of leaving school, early work and training
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="whenLeavingSchool"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>When did you leave school and what did you do?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="School leaving details" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatWork"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What work did you do?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Early career and jobs" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whereWorked"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Where did you work?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Workplace locations" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specialTraining"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Did you have any special training?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Training, courses, or qualifications" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specialMemoriesWork"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Any special memories from work?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Work memories and experiences" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationalService"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Did you do National Service or military service?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Military service details" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 4: Adulthood & Relationships */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Adulthood & Relationships</h4>
                  <p className="text-sm text-muted-foreground">
                    Tell us about your relationships, marriage, children and friends
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="partner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Did you have a partner?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Partner details" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="partnerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What was their name?</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Partner's name" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whereMet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Where did you meet?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="How and where you met" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whereWhenMarried"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Where and when did you get married?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Wedding details" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatDidYouWear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What did you wear?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Wedding attire" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flowers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What flowers did you have?</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Wedding flowers" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="honeyMoon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Where did you go for your honeymoon?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Honeymoon destination" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whereLivedAdult"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Where did you live as adults?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Adult homes and locations" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="childrenAndNames"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Do you have children? What are their names?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Children's names and details" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="grandchildrenAndNames"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Do you have grandchildren? What are their names?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Grandchildren's names and details" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specialFriendsAndNames"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Do you have special friends? What are their names?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Special friends" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specialFriendsMetAndStillTouch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Where did you meet them and are you still in touch?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Friendship details and current contact" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 5: Retirement */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Retirement</h4>
                  <p className="text-sm text-muted-foreground">
                    Share your retirement experiences, hobbies and interests
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="whenRetired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>When did you retire?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Retirement details" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lookingForwardTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What were you looking forward to?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Retirement plans and expectations" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hobbiesInterests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What hobbies and interests did you have?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Hobbies and interests during retirement" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="biggestChangesRetirement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What were the biggest changes in retirement?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Major changes during retirement" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 6: Current Preferences */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Current Preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    What do you enjoy and like to do now?
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="whatEnjoyNow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What do you enjoy now?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Current activities and interests you enjoy" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatLikeRead"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What do you like to read?</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Reading preferences - books, magazines, newspapers" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 7: Assessment Completion */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Assessment Completion</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete the assessment with your signature and details
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="completedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Completed by</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Name of person completing assessment"
                            autoComplete="off"
                            readOnly
                            disabled
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="completedByJobRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Job Role</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Job role/position"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="completedBySignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Signature</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Digital signature"
                            autoComplete="off"
                            readOnly
                            disabled
                            className="bg-muted"
                          />
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
                        <FormLabel>Date</FormLabel>
                        <Popover
                          open={completionDatePopoverOpen}
                          onOpenChange={setCompletionDatePopoverOpen}
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
                                {field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? (
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
                                field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? new Date(field.value) : undefined
                              }
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(date.getTime());
                                  setCompletionDatePopoverOpen(false);
                                }
                              }}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            {!viewOnly && (
              <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose?.()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Assessment"
                  )}
                </Button>
              </DialogFooter>
            )}
          </form>
        </fieldset>
      </Form>
    </>
  );
}
