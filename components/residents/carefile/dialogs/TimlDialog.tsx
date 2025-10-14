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
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface TimlDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function TimlDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: TimlDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [dateOfBirthPopoverOpen, setDateOfBirthPopoverOpen] = useState(false);
  const [completionDatePopoverOpen, setCompletionDatePopoverOpen] =
    useState(false);

  // TODO: Replace with actual Convex mutations once they're created
  const submitAssessment = useMutation(api.careFiles.timl.submitTimlAssessment);
  const updateAssessment = useMutation(api.careFiles.timl.updateTimlAssessment);

  const form = useForm<z.infer<typeof CreateTimlAssessmentSchema>>({
    resolver: zodResolver(CreateTimlAssessmentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          // Use existing data for editing
          residentId: residentId as Id<"residents">,
          teamId,
          organizationId,
          userId,
          agree: initialData.agree ?? false,
          firstName: initialData.firstName ?? resident.firstName ?? "",
          lastName: initialData.lastName ?? resident.lastName ?? "",
          dateOfBirth:
            initialData.dateOfBirth ?? new Date(resident.dateOfBirth).getTime(),
          desiredName: initialData.desiredName ?? resident.firstName ?? "",
          // Childhood
          born: initialData.born ?? "",
          parentsSiblingsNames: initialData.parentsSiblingsNames ?? "",
          familyMembersOccupation: initialData.familyMembersOccupation ?? "",
          whereLived: initialData.whereLived ?? "",
          schoolAttended: initialData.schoolAttended ?? "",
          favouriteSubject: initialData.favouriteSubject ?? "",
          pets: initialData.pets ?? false,
          petsNames: initialData.petsNames ?? "",
          // Adolescence
          whenLeavingSchool: initialData.whenLeavingSchool ?? "",
          whatWork: initialData.whatWork ?? "",
          whereWorked: initialData.whereWorked ?? "",
          specialTraining: initialData.specialTraining ?? "",
          specialMemoriesWork: initialData.specialMemoriesWork ?? "",
          nationalService: initialData.nationalService ?? "",
          // Adulthood
          partner: initialData.partner ?? "",
          partnerName: initialData.partnerName ?? "",
          whereMet: initialData.whereMet ?? "",
          whereWhenMarried: initialData.whereWhenMarried ?? "",
          whatDidYouWear: initialData.whatDidYouWear ?? "",
          flowers: initialData.flowers ?? "",
          honeyMoon: initialData.honeyMoon ?? "",
          whereLivedAdult: initialData.whereLivedAdult ?? "",
          childrenAndNames: initialData.childrenAndNames ?? "",
          grandchildrenAndNames: initialData.grandchildrenAndNames ?? "",
          specialFriendsAndNames: initialData.specialFriendsAndNames ?? "",
          specialFriendsMetAndStillTouch:
            initialData.specialFriendsMetAndStillTouch ?? "",
          // Retirement
          whenRetired: initialData.whenRetired ?? "",
          lookingForwardTo: initialData.lookingForwardTo ?? "",
          hobbiesInterests: initialData.hobbiesInterests ?? "",
          biggestChangesRetirement: initialData.biggestChangesRetirement ?? "",
          // Current preferences
          whatEnjoyNow: initialData.whatEnjoyNow ?? "",
          whatLikeRead: initialData.whatLikeRead ?? "",
          // Completion
          completedBy: initialData.completedBy ?? "",
          completedByJobRole: initialData.completedByJobRole ?? "",
          completedBySignature: initialData.completedBySignature ?? "",
          date: initialData.date ?? Date.now()
        }
      : {
          // Default values for new forms
          residentId: residentId as Id<"residents">,
          teamId,
          organizationId,
          userId,
          agree: false,
          firstName: resident.firstName ?? "",
          lastName: resident.lastName ?? "",
          dateOfBirth: new Date(resident.dateOfBirth).getTime() ?? Date.now(),
          desiredName: resident.firstName ?? "",
          // Childhood
          born: "",
          parentsSiblingsNames: "",
          familyMembersOccupation: "",
          whereLived: "",
          schoolAttended: "",
          favouriteSubject: "",
          pets: false,
          petsNames: "",
          // Adolescence
          whenLeavingSchool: "",
          whatWork: "",
          whereWorked: "",
          specialTraining: "",
          specialMemoriesWork: "",
          nationalService: "",
          // Adulthood
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
          // Retirement
          whenRetired: "",
          lookingForwardTo: "",
          hobbiesInterests: "",
          biggestChangesRetirement: "",
          // Current preferences
          whatEnjoyNow: "",
          whatLikeRead: "",
          // Completion
          completedBy: "",
          completedByJobRole: "",
          completedBySignature: "",
          date: Date.now()
        }
  });

  const totalSteps = 7;

  const handleNext = async () => {
    let isValid = false;

    // Close the date popovers when moving between steps
    setDateOfBirthPopoverOpen(false);
    setCompletionDatePopoverOpen(false);

    if (step === 1) {
      const fieldsToValidate = [
        "agree",
        "firstName",
        "lastName",
        "dateOfBirth",
        "desiredName"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      const fieldsToValidate = [
        "born",
        "parentsSiblingsNames",
        "familyMembersOccupation",
        "whereLived",
        "schoolAttended",
        "favouriteSubject",
        "pets"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 3) {
      const fieldsToValidate = [
        "whenLeavingSchool",
        "whatWork",
        "whereWorked",
        "specialTraining",
        "specialMemoriesWork",
        "nationalService"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 4) {
      const fieldsToValidate = [
        "partner",
        "partnerName",
        "whereMet",
        "whereWhenMarried",
        "whatDidYouWear",
        "flowers",
        "honeyMoon",
        "whereLivedAdult",
        "childrenAndNames",
        "grandchildrenAndNames",
        "specialFriendsAndNames",
        "specialFriendsMetAndStillTouch"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 5) {
      const fieldsToValidate = [
        "whenRetired",
        "lookingForwardTo",
        "hobbiesInterests",
        "biggestChangesRetirement"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 6) {
      const fieldsToValidate = ["whatEnjoyNow", "whatLikeRead"] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 7) {
      const fieldsToValidate = [
        "completedBy",
        "completedByJobRole",
        "completedBySignature"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    }

    if (isValid || step === totalSteps) {
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        await handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    // Close the date popovers when moving between steps
    setDateOfBirthPopoverOpen(false);
    setCompletionDatePopoverOpen(false);

    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();

        if (isEditMode && initialData) {
          await updateAssessment({
            assessmentId: initialData._id,
            ...formData
          });
          toast.success("TIML assessment updated successfully");
        } else {
          await submitAssessment({
            ...formData,
            residentId: residentId as Id<"residents">
          });
          toast.success("TIML assessment saved successfully");
        }

        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save TIML assessment");
      }
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4" key="step-1">
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
        );

      case 2:
        return (
          <div className="space-y-4" key="step-2">
            <h4 className="text-lg font-medium">Childhood</h4>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="born"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Where were you born?</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="City, country, or region"
                        autoComplete="off"
                      />
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
                    <FormLabel>
                      What were your parents&apos; and siblings&apos; names?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Names of family members"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Family occupations"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Childhood homes and locations"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="School names and locations"
                        autoComplete="off"
                      />
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
                      <Input
                        {...field}
                        placeholder="Favourite school subject"
                        autoComplete="off"
                      />
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
                        <Input
                          {...field}
                          placeholder="Pet names"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4" key="step-3">
            <h4 className="text-lg font-medium">Adolescence & Early Career</h4>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="whenLeavingSchool"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      When did you leave school and what did you do?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="School leaving details"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Early career and jobs"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Workplace locations"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Training, courses, or qualifications"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Work memories and experiences"
                        autoComplete="off"
                      />
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
                    <FormLabel>
                      Did you do National Service or military service?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Military service details"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4" key="step-4">
            <h4 className="text-lg font-medium">Adulthood & Relationships</h4>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="partner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Did you have a partner?</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Partner details"
                        autoComplete="off"
                      />
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
                      <Input
                        {...field}
                        placeholder="Partner's name"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="How and where you met"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Wedding details"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Wedding attire"
                        autoComplete="off"
                      />
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
                      <Input
                        {...field}
                        placeholder="Wedding flowers"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Honeymoon destination"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Adult homes and locations"
                        autoComplete="off"
                      />
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
                    <FormLabel>
                      Do you have children? What are their names?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Children's names and details"
                        autoComplete="off"
                      />
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
                    <FormLabel>
                      Do you have grandchildren? What are their names?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Grandchildren's names and details"
                        autoComplete="off"
                      />
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
                    <FormLabel>
                      Do you have special friends? What are their names?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Special friends"
                        autoComplete="off"
                      />
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
                    <FormLabel>
                      Where did you meet them and are you still in touch?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Friendship details and current contact"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4" key="step-5">
            <h4 className="text-lg font-medium">Retirement</h4>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="whenRetired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>When did you retire?</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Retirement details"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Retirement plans and expectations"
                        autoComplete="off"
                      />
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
                    <FormLabel>
                      What hobbies and interests did you have?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Hobbies and interests during retirement"
                        autoComplete="off"
                      />
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
                    <FormLabel>
                      What were the biggest changes in retirement?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Major changes during retirement"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4" key="step-6">
            <h4 className="text-lg font-medium">Current Preferences</h4>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="whatEnjoyNow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What do you enjoy now?</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Current activities and interests you enjoy"
                        autoComplete="off"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Reading preferences - books, magazines, newspapers"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4" key="step-7">
            <h4 className="text-lg font-medium">Assessment Completion</h4>
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
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
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Basic Information";
      case 2:
        return "Childhood";
      case 3:
        return "Adolescence & Early Career";
      case 4:
        return "Adulthood & Relationships";
      case 5:
        return "Retirement";
      case 6:
        return "Current Preferences";
      case 7:
        return "Assessment Completion";
      default:
        return "TIML Assessment";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "Basic information and consent to complete the life story assessment";
      case 2:
        return "Tell us about your childhood, family, school and early memories";
      case 3:
        return "Share your experiences of leaving school, early work and training";
      case 4:
        return "Tell us about your relationships, marriage, children and friends";
      case 5:
        return "Share your retirement experiences, hobbies and interests";
      case 6:
        return "What do you enjoy and like to do now?";
      case 7:
        return "Complete the assessment with your signature and details";
      default:
        return "Complete the This Is My Life assessment to help us understand your life story";
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Review TIML Assessment" : getStepTitle()}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Review and update the TIML assessment details"
            : getStepDescription()}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-6"
          autoComplete="off"
        >
          <div className="max-h-[60vh] overflow-y-auto px-1">
            {renderStepContent()}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? onClose : handlePrevious}
              disabled={step === 1 || isLoading}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              type="button"
              onClick={step === totalSteps ? handleSubmit : handleNext}
              disabled={isLoading}
            >
              {isLoading
                ? "Saving..."
                : step === totalSteps
                  ? "Save Assessment"
                  : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
