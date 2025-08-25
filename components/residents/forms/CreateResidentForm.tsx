"use client";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { CreateResidentSchema } from "@/schemas/CreateResidentSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CreateResidentFormProps {
  onSubmit?: (values: z.infer<typeof CreateResidentSchema>) => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function CreateResidentForm({
  onSubmit: onSubmitProp,
  onSuccess
}: CreateResidentFormProps) {
  const [isLoading, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const totalSteps = 3;
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const createResidentMutation = useMutation(api.residents.create);
  const createEmergencyContactMutation = useMutation(
    api.residents.createEmergencyContact
  );

  const form = useForm<z.infer<typeof CreateResidentSchema>>({
    resolver: zodResolver(CreateResidentSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      phoneNumber: "",
      roomNumber: "",
      admissionDate: "",
      teamId: "",
      healthConditions: [],
      risks: [],
      emergencyContacts: [
        {
          name: "",
          phoneNumber: "",
          relationship: "",
          isPrimary: true
        }
      ],
      medicalInfo: {
        allergies: "",
        medications: "",
        medicalConditions: ""
      }
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emergencyContacts"
  });

  const {
    fields: healthConditionsFields,
    append: appendHealthCondition,
    remove: removeHealthCondition
  } = useFieldArray({
    control: form.control,
    name: "healthConditions"
  });

  const {
    fields: risksFields,
    append: appendRisk,
    remove: removeRisk
  } = useFieldArray({
    control: form.control,
    name: "risks"
  });

  const getTeams = useCallback(() => {
    if (!activeOrganization?.id) return;

    startTransition(async () => {
      await authClient.organization.listTeams(
        {},
        {
          onSuccess: ({ data }) => {
            const filteredTeams =
              data?.filter(
                (team: { id: string; name: string }) =>
                  team.name !== activeOrganization?.name
              ) || [];
            setTeams(filteredTeams);
          },
          onError: (error) => {
            console.error("Error fetching teams:", error);
            toast.error("Failed to load teams");
          }
        }
      );
    });
  }, [activeOrganization?.id, activeOrganization?.name]);

  const MAX_CONDITIONS = 10;
  const MAX_RISKS = 10;

  useEffect(() => {
    getTeams();
  }, [getTeams]);

  function onSubmit(values: z.infer<typeof CreateResidentSchema>) {
    startTransition(async () => {
      try {
        if (!activeOrganization?.id || !user?.user?.id) {
          toast.error("Missing organization or user information");
          return;
        }
        console.log(values);

        const residentId = await createResidentMutation({
          firstName: values.firstName,
          lastName: values.lastName,
          dateOfBirth: values.dateOfBirth,
          phoneNumber: values.phoneNumber,
          roomNumber: values.roomNumber,
          admissionDate: values.admissionDate,
          teamId: values.teamId,
          nhsHealthNumber: values.nhsHealthNumber,
          healthConditions:
            values.healthConditions?.map((hc) => hc.condition) || [],
          risks: values.risks?.map((r) => r.risk) || [],
          organizationId: activeOrganization.id,
          createdBy: user.user.id
        });

        if (residentId && values.emergencyContacts) {
          for (const contact of values.emergencyContacts) {
            await createEmergencyContactMutation({
              residentId,
              name: contact.name,
              phoneNumber: contact.phoneNumber,
              relationship: contact.relationship,
              isPrimary: contact.isPrimary || false,
              organizationId: activeOrganization.id
            });
          }
        }

        if (onSubmitProp) {
          await onSubmitProp(values);
        }

        toast.success("Resident created successfully");
        form.reset();
        setStep(1);

        // Close the form if callback provided
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        toast.error("Error creating resident");
        console.error("Error creating resident:", error);
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
        "nhsHealthNumber"
      ]);
      if (valid) {
        setStep(2);
      } else {
        toast.error("Please fill all required fields in this step.");
      }
    } else if (step === 2) {
      // Step 2 validation - health conditions and risks are optional
      // No specific validation needed as fields are optional
      setStep(3);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 w-full max-w-5xl mx-auto"
      >
        {step === 1 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
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
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Room Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="101A"
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
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Team/Unit</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams.length > 0 ? (
                          teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No teams available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="nhsHealthNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>NHS Health & Care Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="A345657"
                        type="text"
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
                name="admissionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Admission Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-full flex flex-row justify-end">
              <Button type="button" onClick={handleContinue}>
                Continue
              </Button>
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
                <div className="space-y-3">
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
                  onClick={() => appendRisk({ risk: "" })}
                  disabled={isLoading || risksFields.length === MAX_RISKS}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Risk
                </Button>
              </div>

              {risksFields.length > 0 && (
                <div className="space-y-3">
                  {risksFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Emergency Contacts</CardTitle>
                <CardDescription>
                  Add one or more emergency contacts
                </CardDescription>
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
                disabled={isLoading}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
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
                          <FormLabel>Contact Name *</FormLabel>
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
                          <FormLabel>Phone Number *</FormLabel>
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
                          <FormLabel>Relationship *</FormLabel>
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
                            onCheckedChange={field.onChange}
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
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Resident"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </form>
    </Form>
  );
}
