"use client";

import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { CreateResidentSchema } from "@/schemas/CreateResidentSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import {  ChevronDownIcon, PlusIcon, Trash2Icon, User2Icon } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ImageSelector from "@/components/onboarding/profile/ImageSelector";
import { Calendar } from "@/components/ui/calendar";

interface CreateResidentFormProps {
  onSubmit?: (values: z.infer<typeof CreateResidentSchema>) => void;
  onCancel?: () => void;
  onSuccess?: () => void;
  editMode?: boolean;
  residentData?: any;
}

export function CreateResidentForm({
  onSubmit: onSubmitProp,
  onSuccess,
  editMode = false,
  residentData
}: CreateResidentFormProps) {
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [admissionDatePopoverOpen, setAdmissionDatePopoverOpen] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();

  const createResidentMutation = useMutation(api.residents.create);
  const updateResidentMutation = useMutation(api.residents.update);
  const createEmergencyContactMutation = useMutation(api.residents.createEmergencyContact);
  const generateUploadUrlMutation = useMutation(api.files.image.generateUploadUrl);
  const sendImageMutation = useMutation(api.files.image.sendImage);

  type FormType = z.infer<typeof CreateResidentSchema>;

  // Function to get default values based on edit mode
  const getDefaultValues = () => {
    if (editMode && residentData) {
      return {
        firstName: residentData.firstName || "",
        lastName: residentData.lastName || "",
        dateOfBirth: residentData.dateOfBirth || "",
        phoneNumber: residentData.phoneNumber || "",
        roomNumber: residentData.roomNumber || "",
        admissionDate: residentData.admissionDate || "",
        teamId: residentData.teamId || "",
        nhsHealthNumber: residentData.nhsHealthNumber || "",
        healthConditions: Array.isArray(residentData.healthConditions)
          ? residentData.healthConditions.map((hc: any) => ({ condition: typeof hc === 'string' ? hc : hc.condition }))
          : [],
        risks: Array.isArray(residentData.risks)
          ? residentData.risks.map((r: any) => typeof r === 'string' ? { risk: r, level: "low" } : r)
          : [],
        dependencies: residentData.dependencies || {
          mobility: undefined,
          eating: undefined,
          dressing: undefined,
          toileting: undefined,
        },
        emergencyContacts: residentData.emergencyContacts?.length > 0
          ? residentData.emergencyContacts
          : [{ name: "", phoneNumber: "", relationship: "", isPrimary: true }],
        gpDetails: {
          name: residentData.gpName || "",
          address: residentData.gpAddress || "",
          phoneNumber: residentData.gpPhone || "",
        },
        careManagerDetails: {
          name: residentData.careManagerName || "",
          address: residentData.careManagerAddress || "",
          phoneNumber: residentData.careManagerPhone || "",
        },
      };
    }

    return {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      phoneNumber: "",
      roomNumber: "",
      admissionDate: "",
      teamId: "",
      nhsHealthNumber: "",
      healthConditions: [],
      risks: [],
      dependencies: {
        mobility: undefined,
        eating: undefined,
        dressing: undefined,
        toileting: undefined,
      },
      emergencyContacts: [
        {
          name: "",
          phoneNumber: "",
          relationship: "",
          isPrimary: true,
        },
      ],
      gpDetails: {
        name: "",
        address: "",
        phoneNumber: "",
      },
      careManagerDetails: {
        name: "",
        address: "",
        phoneNumber: "",
      },
    };
  };

  const form = useForm<FormType>({
    resolver: zodResolver(CreateResidentSchema),
    mode: "onChange",
    defaultValues: getDefaultValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emergencyContacts",
  });

  const {
    fields: healthConditionsFields,
    append: appendHealthCondition,
    remove: removeHealthCondition,
  } = useFieldArray({
    control: form.control,
    name: "healthConditions",
  });

  const { fields: risksFields, append: appendRisk, remove: removeRisk } = useFieldArray({
    control: form.control,
    name: "risks",
  });

  const getTeams = useCallback(() => {
    if (!activeOrganization?.id) return;

    startTransition(async () => {
      await authClient.organization.listTeams(
        {},
        {
          onSuccess: ({ data }) => {
            const filteredTeams =
              data?.filter((team: { id: string; name: string }) => team.name !== activeOrganization?.name) || [];
            setTeams(filteredTeams);
          },
          onError: (error) => {
            console.error("Error fetching teams:", error);
            toast.error("Failed to load teams");
          },
        }
      );
    });
  }, [activeOrganization?.id, activeOrganization?.name]);

  const MAX_CONDITIONS = 10;
  const MAX_RISKS = 10;
  const MAX_CONTACT = 5;

  useEffect(() => {
    getTeams();
  }, [getTeams]);

  // Update form values when in edit mode and resident data changes
  useEffect(() => {
    if (editMode && residentData) {
      const defaultValues = getDefaultValues();
      form.reset(defaultValues);
      // Set the team ID separately if we're in edit mode
      if (residentData.teamId) {
        form.setValue("teamId", residentData.teamId);
      }
    }
  }, [editMode, residentData, form]);

  async function onSubmit(values: FormType) {
    startTransition(async () => {
      try {
        if (!activeOrganization?.id || !user?.user?.id) {
          toast.error("Missing organization or user information");
          return;
        }

        if (editMode && residentData?._id) {
          // Update existing resident
          await updateResidentMutation({
            residentId: residentData._id,
            firstName: values.firstName,
            lastName: values.lastName,
            dateOfBirth: values.dateOfBirth,
            phoneNumber: values.phoneNumber,
            roomNumber: values.roomNumber,
            admissionDate: values.admissionDate,
            nhsHealthNumber: values.nhsHealthNumber,
            // GP Details
            gpName: values.gpDetails?.name,
            gpAddress: values.gpDetails?.address,
            gpPhone: values.gpDetails?.phoneNumber,
            // Care Manager Details
            careManagerName: values.careManagerDetails?.name,
            careManagerAddress: values.careManagerDetails?.address,
            careManagerPhone: values.careManagerDetails?.phoneNumber,
            // Note: Health conditions, risks, dependencies, and emergency contacts
            // would need separate mutation handlers for proper editing.
          });

          if (selectedFile) {
            const uploadUrl = await generateUploadUrlMutation();
            const result = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": selectedFile!.type },
              body: selectedFile,
            });
            const { storageId } = await result.json();
            await sendImageMutation({
              storageId,
              type: "resident",
              residentId: residentData._id,
            });
          }

          toast.success("Resident updated successfully");
        } else {
          // Create new resident
          const residentId = await createResidentMutation({
            firstName: values.firstName,
            lastName: values.lastName,
            dateOfBirth: values.dateOfBirth,
            phoneNumber: values.phoneNumber,
            roomNumber: values.roomNumber,
            admissionDate: values.admissionDate,
            teamId: values.teamId,
            nhsHealthNumber: values.nhsHealthNumber,
            // GP Details
            gpName: values.gpDetails?.name,
            gpAddress: values.gpDetails?.address,
            gpPhone: values.gpDetails?.phoneNumber,
            // Care Manager Details
            careManagerName: values.careManagerDetails?.name,
            careManagerAddress: values.careManagerDetails?.address,
            careManagerPhone: values.careManagerDetails?.phoneNumber,
            healthConditions: values.healthConditions?.map((hc) => hc.condition) || [],
            risks: values.risks || [],
            dependencies: values.dependencies,
            organizationId: activeOrganization.id,
            createdBy: user.user.id,
          });

          if (residentId && values.emergencyContacts) {
            for (const contact of values.emergencyContacts) {
              await createEmergencyContactMutation({
                residentId,
                name: contact.name,
                phoneNumber: contact.phoneNumber,
                relationship: contact.relationship,
                isPrimary: contact.isPrimary || false,
                organizationId: activeOrganization.id,
              });
            }
          }

          if (selectedFile) {
            const uploadUrl = await generateUploadUrlMutation();
            const result = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": selectedFile!.type },
              body: selectedFile,
            });
            const { storageId } = await result.json();
            await sendImageMutation({
              storageId,
              type: "resident",
              residentId,
            });
          }

          toast.success("Resident created successfully");
        }

        form.reset();
        setStep(1);

        if (onSuccess) onSuccess();
        if (onSubmitProp) onSubmitProp(values);
      } catch (error) {
        toast.error(editMode ? "Error updating resident" : "Error creating resident");
        console.error(editMode ? "Error updating resident:" : "Error creating resident:", error);
      }
    });
  }

  const handleContinue = async () => {
    if (step === 1) {
      const valid = await form.trigger([
        "firstName",
        "lastName",
        "dateOfBirth",
        "phoneNumber",
        "roomNumber",
        "teamId",
        "admissionDate",
        "nhsHealthNumber",
      ]);
      if (valid) setStep(2);
      else toast.error("Please fill all required fields in this step.");
    } else if (step === 2) {
      const valid = await form.trigger([
        "dependencies.mobility",
        "dependencies.eating",
        "dependencies.dressing",
        "dependencies.toileting",
      ]);
      if (valid) setStep(3);
      else toast.error("Please select dependency levels for all daily living activities.");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 w-full max-w-5xl mx-auto"
      >
        {/* Step 1: Personal Info */}
        {step === 1 && (
          <>
            <div className="mb-12">
              <ImageSelector
                placeholder={<User2Icon strokeWidth={1.5} className="w-14 h-14 text-muted-foreground" />}
                currentImageUrl={""}
                fileId={undefined}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                userInitial={""}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel required>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel required>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel required>Date of Birth</FormLabel>
                    <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen} modal>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-48 justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading}
                        >
                          {field.value
                            ? new Date(field.value).toLocaleDateString()
                            : "Select date"}
                          <ChevronDownIcon />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          captionLayout="dropdown"
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date.toISOString().split("T")[0]);
                              setDobPopoverOpen(false);
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="roomNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel required>Room Number</FormLabel>
                  <FormControl>
                    <Input placeholder="101A" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="teamId" render={({ field }) => (
                <FormItem>
                  <FormLabel required>Team/Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams.length ? teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      )) : <div className="px-2 py-1.5 text-sm text-muted-foreground">No teams available</div>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="nhsHealthNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel required>NHS Health & Care Number</FormLabel>
                  <FormControl>
                    <Input placeholder="A345657" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="admissionDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel required>Admission Date</FormLabel>
                  <Popover open={admissionDatePopoverOpen} onOpenChange={setAdmissionDatePopoverOpen} modal>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-48 justify-between font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isLoading}
                      >
                        {field.value
                          ? new Date(field.value).toLocaleDateString()
                          : "Select date"}
                        <ChevronDownIcon />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date.toISOString().split("T")[0]);
                            setAdmissionDatePopoverOpen(false);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="w-full flex flex-row justify-end">
              <Button type="button" onClick={handleContinue}>Continue</Button>
            </div>
          </>
        )}

        {/* Step 2: Health Conditions and Risks */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Health Conditions Section */}
            <div className="space-y-4 mb-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Health Conditions</h3>
                  <p className="text-sm text-muted-foreground">
                    Add any known health conditions
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendHealthCondition({ condition: "" })}
                  disabled={
                    isLoading ||
                    healthConditionsFields.length === MAX_CONDITIONS
                  }
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Condition
                </Button>
              </div>

              {healthConditionsFields.length > 0 && (
                <div
                  className={`space-y-3 ${healthConditionsFields.length > 3 ? "max-h-50 overflow-y-auto" : ""}`}
                >
                  {healthConditionsFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3">
                      <FormField
                        control={form.control}
                        name={`healthConditions.${index}.condition`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Diabetes"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHealthCondition(index)}
                        disabled={isLoading}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {healthConditionsFields.length === 0 && (
                <div className="p-2 bg-zinc-50 rounded text-xs text-pretty text-muted-foreground">
                  No health conditions added yet. Click &quot;Add
                  Condition&quot; to get started.
                </div>
              )}
            </div>

            {/* Risks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Risks</h3>
                  <p className="text-sm text-muted-foreground">
                    Add any known risks or safety concerns
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendRisk({ risk: "", level: "low" })}
                  disabled={isLoading || risksFields.length === MAX_RISKS}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Risk
                </Button>
              </div>

              {risksFields.length > 0 && (
                <div
                  className={`space-y-3 ${risksFields.length > 3 ? "max-h-50 overflow-y-auto" : ""}`}
                >
                  {risksFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3">
                      <div className="flex flex-1">
                        <FormField
                          control={form.control}
                          name={`risks.${index}.risk`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder="Fall risk"
                                  disabled={isLoading}
                                  {...field}
                                  className="rounded-r-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`risks.${index}.level`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={isLoading}
                                >
                                  <SelectTrigger className="w-24 rounded-l-none border-l-0">
                                    <SelectValue placeholder="Level" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">
                                      Medium
                                    </SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRisk(index)}
                        disabled={isLoading}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {risksFields.length === 0 && (
                <div className="p-2 bg-zinc-50 rounded text-xs text-pretty text-muted-foreground">
                  No risks added yet. Click &quot;Add Risk&quot; to get started.
                </div>
              )}
            </div>

            {/* Dependencies Section */}
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Dependencies</h3>
                <p className="text-sm text-muted-foreground">
                  Assess care dependency levels for daily activities
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mobility */}
                <FormField
                  control={form.control}
                  name="dependencies.mobility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Mobility</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Independent">
                              Independent
                            </SelectItem>
                            <SelectItem value="Supervision Needed">
                              Supervision Needed
                            </SelectItem>
                            <SelectItem value="Assistance Needed">
                              Assistance Needed
                            </SelectItem>
                            <SelectItem value="Fully Dependent">
                              Fully Dependent
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Eating */}
                <FormField
                  control={form.control}
                  name="dependencies.eating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Eating</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Independent">
                              Independent
                            </SelectItem>
                            <SelectItem value="Supervision Needed">
                              Supervision Needed
                            </SelectItem>
                            <SelectItem value="Assistance Needed">
                              Assistance Needed
                            </SelectItem>
                            <SelectItem value="Fully Dependent">
                              Fully Dependent
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dressing */}
                <FormField
                  control={form.control}
                  name="dependencies.dressing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Dressing</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Independent">
                              Independent
                            </SelectItem>
                            <SelectItem value="Supervision Needed">
                              Supervision Needed
                            </SelectItem>
                            <SelectItem value="Assistance Needed">
                              Assistance Needed
                            </SelectItem>
                            <SelectItem value="Fully Dependent">
                              Fully Dependent
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Toileting */}
                <FormField
                  control={form.control}
                  name="dependencies.toileting"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Toileting</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Independent">
                              Independent
                            </SelectItem>
                            <SelectItem value="Supervision Needed">
                              Supervision Needed
                            </SelectItem>
                            <SelectItem value="Assistance Needed">
                              Assistance Needed
                            </SelectItem>
                            <SelectItem value="Fully Dependent">
                              Fully Dependent
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Buttons Section */}
            <div className="w-full flex flex-row justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button type="button" onClick={handleContinue}>
                Continue
              </Button>
            </div>
          </div>
        )}
        {/* Step 3: Emergency Contacts */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Emergency Contacts</h3>
                  <div className="p-2 bg-zinc-50 rounded text-xs text-pretty text-muted-foreground">
                    Add one or more emergency contacts
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      name: "",
                      phoneNumber: "",
                      relationship: "",
                      isPrimary: false
                    })
                  }
                  disabled={isLoading || fields.length >= MAX_CONTACT}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Contact
                </Button>
              </div>

              <div
                className={`space-y-6 ${fields.length > 2 ? "max-h-96 overflow-y-auto" : ""}`}
              >
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Contact {index + 1}
                      </h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={isLoading}
                        >
                          <Trash2Icon className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`emergencyContacts.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel required>Contact Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Jane Doe"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`emergencyContacts.${index}.phoneNumber`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel required>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+1 (555) 987-6543"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`emergencyContacts.${index}.relationship`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel required>Relationship</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Daughter"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`emergencyContacts.${index}.isPrimary`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Set all other contacts to false when this one is set to true
                                  const currentValues =
                                    form.getValues("emergencyContacts");
                                  currentValues.forEach((_, i) => {
                                    form.setValue(
                                      `emergencyContacts.${i}.isPrimary`,
                                      i === index
                                    );
                                  });
                                } else {
                                  field.onChange(false);
                                }
                              }}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Primary Contact
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {index < fields.length - 1 && <hr className="my-6" />}
                  </div>
                ))}
              </div>
            </div>

            {/* GP Details Section */}
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">GP Details</h3>
                <div className="p-2 bg-zinc-50 rounded text-xs text-pretty text-muted-foreground">
                  General Practitioner information (optional)
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gpDetails.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GP Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Dr. Smith"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gpDetails.phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GP Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 (555) 123-4567"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="gpDetails.address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GP Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Medical Center Dr, City, State"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Care Manager Details Section */}
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Care Manager Details</h3>
                <div className="p-2 bg-zinc-50 rounded text-xs text-pretty text-muted-foreground">
                  Care manager information (optional)
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="careManagerDetails.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Care Manager Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jane Johnson"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="careManagerDetails.phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Care Manager Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 (555) 987-6543"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="careManagerDetails.address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Care Manager Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="456 Care Services Blvd, City, State"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? (editMode ? "Updating..." : "Creating...")
                  : (editMode ? "Update Resident" : "Create Resident")
                }
              </Button>
            </div>
          </div>
        )}

      </form>
    </Form>
  );
}


