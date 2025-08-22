"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import z from "zod";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { CreateResidentSchema } from "@/schemas/CreateResidentSchema";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import Stepper from "@/components/stepper/Stepper"; 

interface CreateResidentFormProps {
  onSubmit?: (values: z.infer<typeof CreateResidentSchema>) => void;
  onCancel?: () => void;
}

export function CreateResidentForm({
  onSubmit: onSubmitProp,
}: CreateResidentFormProps) {
  const [isLoading, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const totalSteps = 2;
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
      emergencyContacts: [
        {
          name: "",
          phoneNumber: "",
          relationship: "",
          isPrimary: true,
        },
      ],
      medicalInfo: {
        allergies: "",
        medications: "",
        medicalConditions: "",
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emergencyContacts",
  });

  function onSubmit(values: z.infer<typeof CreateResidentSchema>) {
    startTransition(async () => {
      try {
        if (!activeOrganization?.id || !user?.user?.id) {
          toast.error("Missing organization or user information");
          return;
        }
        console.log(values)

        const residentId = await createResidentMutation({
          firstName: values.firstName,
          lastName: values.lastName,
          dateOfBirth: values.dateOfBirth,
          phoneNumber: values.phoneNumber,
          roomNumber: values.roomNumber,
          admissionDate: values.admissionDate,
          teamId: values.teamId,
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

        if (onSubmitProp) {
          await onSubmitProp(values);
        }

        toast.success("Resident created successfully");
        form.reset();
        setStep(1); 
      } catch (error) {
        toast.error("Error creating resident");
        console.error("Error creating resident:", error);
      }
    });
  }

  const handleNext = async () => {
    const valid = await form.trigger([
      "firstName",
      "lastName",
      "dateOfBirth",
      "phoneNumber",
      "roomNumber",
      "teamId",
      "admissionDate",
    ]);
    if (valid) {
      setStep(2);
    } else {
      toast.error("Please fill all required fields in this step.");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 w-full max-w-5xl mx-auto"
      >
        <Stepper step={step} totalSteps={totalSteps} />

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Basic resident details and care home assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" disabled={isLoading} {...field} />
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
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" disabled={isLoading} {...field} />
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
                      <FormLabel>Date of Birth *</FormLabel>
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
                      <FormLabel>Room Number</FormLabel>
                      <FormControl>
                        <Input placeholder="101A" disabled={isLoading} {...field} />
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
                      <FormLabel>Team/Unit</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nursing Unit A"
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
                name="admissionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Date *</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Emergency Contacts */}
        {step === 2 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Emergency Contacts</CardTitle>
                <CardDescription>Add one or more emergency contacts</CardDescription>
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
                    isPrimary: false,
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
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
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
