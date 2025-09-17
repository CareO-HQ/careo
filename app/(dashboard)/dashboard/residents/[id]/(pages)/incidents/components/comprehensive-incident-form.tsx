"use client";

import React from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { 
  CalendarIcon, 
  Clock, 
  User, 
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Home,
  UserCheck,
  FileText,
  Shield,
  Activity,
  Phone,
  Mail,
  Signature
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ComprehensiveIncidentSchema = z.object({
  // Section 1: Incident Details
  date: z.date(),
  time: z.string().min(1, "Time is required"),
  homeName: z.string().min(1, "Home name is required"),
  unit: z.string().min(1, "Unit is required"),
  
  // Section 2: Injured Person Details
  injuredPersonFirstName: z.string().min(1, "First name is required"),
  injuredPersonSurname: z.string().min(1, "Surname is required"),
  injuredPersonDOB: z.date(),
  residentInternalId: z.string().optional(),
  dateOfAdmission: z.date().optional(),
  healthCareNumber: z.string().optional(),
  
  // Section 3: Status of Injured Person
  statusResident: z.boolean().optional(),
  statusRelative: z.boolean().optional(),
  statusStaff: z.boolean().optional(),
  statusAgencyStaff: z.boolean().optional(),
  statusVisitor: z.boolean().optional(),
  statusContractor: z.boolean().optional(),
  contractorEmployer: z.string().optional(),
  
  // Section 4: Type of Incident
  incidentTypes: z.array(z.string()).min(1, "At least one incident type must be selected"),
  typeOtherDetails: z.string().optional(),
  
  // Section 5-6: Fall-Specific Questions
  anticoagulantMedication: z.enum(["yes", "no", "unknown"]).optional(),
  fallPathway: z.enum(["green", "amber", "red"]).optional(),
  
  // Section 7: Detailed Description
  detailedDescription: z.string().min(10, "Please provide a detailed description"),
  
  // Section 8: Incident Level
  incidentLevel: z.enum(["death", "permanent_harm", "minor_injury", "no_harm", "near_miss"]),
  
  // Section 9: Details of Injury
  injuryDescription: z.string().optional(),
  bodyPartInjured: z.string().optional(),
  
  // Section 10: Treatment Required
  treatmentTypes: z.array(z.string()).optional(),
  
  // Section 11: Details of Treatment Given
  treatmentDetails: z.string().optional(),
  vitalSigns: z.string().optional(),
  treatmentRefused: z.boolean().optional(),
  
  // Section 12: Witnesses
  witness1Name: z.string().optional(),
  witness1Contact: z.string().optional(),
  witness2Name: z.string().optional(),
  witness2Contact: z.string().optional(),
  
  // Section 13: Further Actions by Nurse
  nurseActions: z.array(z.string()).optional(),
  
  // Section 14: Further Actions Advised
  furtherActionsAdvised: z.string().optional(),
  
  // Section 15: Prevention Measures
  preventionMeasures: z.string().optional(),
  
  // Section 16: Home Manager Informed
  homeManagerInformedBy: z.string().optional(),
  homeManagerInformedDateTime: z.string().optional(),
  
  // Section 17: Out of Hours On-Call
  onCallManagerName: z.string().optional(),
  onCallContactedDateTime: z.string().optional(),
  
  // Section 18: Next of Kin Informed
  nokInformedWho: z.string().optional(),
  nokInformedBy: z.string().optional(),
  nokInformedDateTime: z.string().optional(),
  
  // Section 19: Trust Incident Form Recipients
  careManagerName: z.string().optional(),
  careManagerEmail: z.string().email().optional().or(z.literal("")),
  keyWorkerName: z.string().optional(),
  keyWorkerEmail: z.string().email().optional().or(z.literal("")),
  
  // Section 20: Form Completion Details
  completedByFullName: z.string().min(1, "Your full name is required"),
  completedByJobTitle: z.string().min(1, "Your job title is required"),
  completedBySignature: z.string().optional(),
  dateCompleted: z.date(),
});

interface ComprehensiveIncidentFormProps {
  residentId: string;
  residentName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ComprehensiveIncidentForm({
  residentId,
  residentName,
  isOpen,
  onClose,
  onSuccess
}: ComprehensiveIncidentFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(1);
  const createIncident = useMutation(api.incidents.create);

  const form = useForm<z.infer<typeof ComprehensiveIncidentSchema>>({
    resolver: zodResolver(ComprehensiveIncidentSchema),
    defaultValues: {
      date: new Date(),
      time: format(new Date(), "HH:mm"),
      homeName: "",
      unit: "",
      injuredPersonFirstName: "",
      injuredPersonSurname: "",
      injuredPersonDOB: new Date(),
      residentInternalId: "",
      dateOfAdmission: undefined,
      healthCareNumber: "",
      statusResident: false,
      statusRelative: false,
      statusStaff: false,
      statusAgencyStaff: false,
      statusVisitor: false,
      statusContractor: false,
      contractorEmployer: "",
      incidentTypes: [],
      typeOtherDetails: "",
      anticoagulantMedication: undefined,
      fallPathway: undefined,
      detailedDescription: "",
      incidentLevel: "no_harm",
      injuryDescription: "",
      bodyPartInjured: "",
      treatmentTypes: [],
      treatmentDetails: "",
      vitalSigns: "",
      treatmentRefused: false,
      witness1Name: "",
      witness1Contact: "",
      witness2Name: "",
      witness2Contact: "",
      nurseActions: [],
      furtherActionsAdvised: "",
      preventionMeasures: "",
      homeManagerInformedBy: "",
      homeManagerInformedDateTime: "",
      onCallManagerName: "",
      onCallContactedDateTime: "",
      nokInformedWho: "",
      nokInformedBy: "",
      nokInformedDateTime: "",
      careManagerName: "",
      careManagerEmail: "",
      keyWorkerName: "",
      keyWorkerEmail: "",
      completedByFullName: "",
      completedByJobTitle: "",
      completedBySignature: "",
      dateCompleted: new Date(),
    },
  });

  const watchedIncidentTypes = form.watch("incidentTypes");
  const watchedIncidentLevel = form.watch("incidentLevel");
  const hasFallType = watchedIncidentTypes?.some(type => 
    type === "FallWitnessed" || type === "FallUnwitnessed"
  );

  const incidentTypeOptions = [
    { value: "FallWitnessed", label: "Fall (witnessed)" },
    { value: "FallUnwitnessed", label: "Fall (unwitnessed)" },
    { value: "PressureUlcer", label: "Pressure ulcer" },
    { value: "Wound", label: "Wound" },
    { value: "Illness", label: "Illness" },
    { value: "NearMiss", label: "Near miss" },
    { value: "ExpectedDeath", label: "Expected death" },
    { value: "UnexpectedDeath", label: "Unexpected death" },
    { value: "StaffingLevels", label: "Staffing levels" },
    { value: "Equipment", label: "Equipment" },
    { value: "StaffAccident", label: "Staff accident" },
    { value: "AbuseOfStaff", label: "Abuse of staff" },
    { value: "Behavioural", label: "Behavioural issues" },
    { value: "Safeguarding", label: "Safeguarding involving resident" },
    { value: "Medication", label: "Medication incident" },
    { value: "AbsentWithoutLeave", label: "Absent without leave" },
    { value: "WeightLoss", label: "Weight loss" },
    { value: "Choking", label: "Choking" },
    { value: "Bruise", label: "Bruise" },
    { value: "ResidentAltercation", label: "Resident-on-resident altercation" },
    { value: "Infection", label: "Infection" },
    { value: "Covid", label: "COVID" },
    { value: "FireSafety", label: "Fire & safety" },
    { value: "SelfHarm", label: "Self-harm" },
    { value: "PSNI", label: "PSNI (police) involvement" },
    { value: "Theft", label: "Theft" },
    { value: "MissingResident", label: "Missing resident" },
    { value: "Other", label: "Other" }
  ];

  const treatmentOptions = [
    { value: "FirstAid", label: "First aid" },
    { value: "GP", label: "Referred to GP" },
    { value: "Paramedic", label: "Paramedic attended" },
    { value: "ED", label: "Taken to ED (Emergency Department)" },
    { value: "HospitalAdmit", label: "Admitted to hospital" },
    { value: "999", label: "999 ambulance" }
  ];

  const nurseActionOptions = [
    { value: "OnCallManager", label: "On-call manager informed" },
    { value: "DutySocialWorker", label: "Duty social worker informed" },
    { value: "CarePlanUpdated", label: "Care plan updated" },
    { value: "BodyMapCompleted", label: "Body map completed" },
    { value: "TrustIncidentReport", label: "Trust (adverse) incident report emailed to home manager" },
    { value: "RiskAssessment", label: "Risk assessment completed" },
    { value: "ObservationsCommenced", label: "Observations commenced" },
    { value: "WoundAssessment", label: "Wound assessment completed" },
    { value: "SafeguardingForms", label: "Safeguarding forms prepared for home manager" },
    { value: "KeyWorkerContacted", label: "Key worker contacted" }
  ];

  const steps = [
    { number: 1, title: "Incident & Person Details", sections: "1-3" },
    { number: 2, title: "Incident Type & Description", sections: "4-7" },
    { number: 3, title: "Injury & Treatment", sections: "8-11" },
    { number: 4, title: "Witnesses & Actions", sections: "12-15" },
    { number: 5, title: "Notifications & Completion", sections: "16-20" }
  ];

  const maxSteps = steps.length;

  async function onSubmit(values: z.infer<typeof ComprehensiveIncidentSchema>) {
    try {
      setIsSubmitting(true);
      
      await createIncident({
        // Convert dates to strings
        date: values.date.toISOString().split('T')[0],
        time: values.time,
        homeName: values.homeName,
        unit: values.unit,
        
        // Injured person details
        injuredPersonFirstName: values.injuredPersonFirstName,
        injuredPersonSurname: values.injuredPersonSurname,
        injuredPersonDOB: values.injuredPersonDOB.toISOString().split('T')[0],
        residentId: residentId as Id<"residents">,
        residentInternalId: values.residentInternalId,
        dateOfAdmission: values.dateOfAdmission?.toISOString().split('T')[0],
        healthCareNumber: values.healthCareNumber,
        
        // Status
        statusResident: values.statusResident,
        statusRelative: values.statusRelative,
        statusStaff: values.statusStaff,
        statusAgencyStaff: values.statusAgencyStaff,
        statusVisitor: values.statusVisitor,
        statusContractor: values.statusContractor,
        contractorEmployer: values.contractorEmployer,
        
        // Incident types
        incidentTypes: values.incidentTypes,
        typeOtherDetails: values.typeOtherDetails,
        
        // Fall specific
        anticoagulantMedication: values.anticoagulantMedication,
        fallPathway: values.fallPathway,
        
        // Description
        detailedDescription: values.detailedDescription,
        
        // Level and injury
        incidentLevel: values.incidentLevel,
        injuryDescription: values.injuryDescription,
        bodyPartInjured: values.bodyPartInjured,
        
        // Treatment
        treatmentTypes: values.treatmentTypes,
        treatmentDetails: values.treatmentDetails,
        vitalSigns: values.vitalSigns,
        treatmentRefused: values.treatmentRefused,
        
        // Witnesses
        witness1Name: values.witness1Name,
        witness1Contact: values.witness1Contact,
        witness2Name: values.witness2Name,
        witness2Contact: values.witness2Contact,
        
        // Actions
        nurseActions: values.nurseActions,
        furtherActionsAdvised: values.furtherActionsAdvised,
        preventionMeasures: values.preventionMeasures,
        
        // Notifications
        homeManagerInformedBy: values.homeManagerInformedBy,
        homeManagerInformedDateTime: values.homeManagerInformedDateTime,
        onCallManagerName: values.onCallManagerName,
        onCallContactedDateTime: values.onCallContactedDateTime,
        nokInformedWho: values.nokInformedWho,
        nokInformedBy: values.nokInformedBy,
        nokInformedDateTime: values.nokInformedDateTime,
        
        // Recipients
        careManagerName: values.careManagerName,
        careManagerEmail: values.careManagerEmail,
        keyWorkerName: values.keyWorkerName,
        keyWorkerEmail: values.keyWorkerEmail,
        
        // Completion
        completedByFullName: values.completedByFullName,
        completedByJobTitle: values.completedByJobTitle,
        completedBySignature: values.completedBySignature,
        dateCompleted: values.dateCompleted.toISOString().split('T')[0],
      });

      toast.success("Incident report submitted successfully");
      form.reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting incident report:", error);
      toast.error("Failed to submit incident report");
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid && currentStep < maxSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  function getFieldsForStep(step: number): (keyof z.infer<typeof ComprehensiveIncidentSchema>)[] {
    switch (step) {
      case 1:
        return ["date", "time", "homeName", "unit", "injuredPersonFirstName", "injuredPersonSurname", "injuredPersonDOB"];
      case 2:
        return ["incidentTypes", "detailedDescription"];
      case 3:
        return ["incidentLevel"];
      case 4:
        return [];
      case 5:
        return ["completedByFullName", "completedByJobTitle", "dateCompleted"];
      default:
        return [];
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            Incident Report Form
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Complete incident report for {residentName} - Step {currentStep} of {maxSteps}
          </DialogDescription>
     
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 pb-6">
              
              {/* Step 1: Incident & Person Details */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  {/* Section 1: Incident Details */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 1: Incident Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Incident *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
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
                                  selected={field.value}
                                  onSelect={field.onChange}
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
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time of Incident *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  type="time"
                                  {...field}
                                  className="pl-10"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="homeName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Home Name *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Name of care home/facility"
                                  {...field}
                                  className="pl-10"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Specific unit/wing/house"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 2: Injured Person Details */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 2: Injured Person Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="injuredPersonFirstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="First name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="injuredPersonSurname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Surname *</FormLabel>
                            <FormControl>
                              <Input placeholder="Surname" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="injuredPersonDOB"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick date of birth</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="residentInternalId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Resident ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Internal ID or medical record number" {...field} />
                            </FormControl>
                            <FormDescription>
                              Internal ID or medical record number
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateOfAdmission"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Admission</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick admission date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
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
                        name="healthCareNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Health and Care Number</FormLabel>
                            <FormControl>
                              <Input placeholder="NHS number or equivalent" {...field} />
                            </FormControl>
                            <FormDescription>
                              National health/care identifier (e.g., NHS number)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 3: Status of Injured Person */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 3: Status of Injured Person
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground">Select one or more that apply</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {[
                          { field: "statusResident", label: "Resident in Care" },
                          { field: "statusRelative", label: "Relative" },
                          { field: "statusStaff", label: "Staff Member" },
                          { field: "statusAgencyStaff", label: "Agency Staff" },
                          { field: "statusVisitor", label: "Visitor" },
                          { field: "statusContractor", label: "Contractor" },
                        ].map(({ field, label }) => (
                          <FormField
                            key={field}
                            control={form.control}
                            name={field as keyof z.infer<typeof ComprehensiveIncidentSchema>}
                            render={({ field: formField }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={formField.value as boolean}
                                    onCheckedChange={formField.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal">
                                    {label}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>

                      <FormField
                        control={form.control}
                        name="contractorEmployer"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Contractor Employer (if applicable)</FormLabel>
                            <FormControl>
                              <Input placeholder="Name of contractor's employer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 2: Incident Type & Description */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {/* Section 4: Type of Incident */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertCircle className="w-5 h-5" />
                        Section 4: Type of Incident
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Tick all that apply</p>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="incidentTypes"
                        render={() => (
                          <FormItem>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {incidentTypeOptions.map((item) => (
                                <FormField
                                  key={item.value}
                                  control={form.control}
                                  name="incidentTypes"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={item.value}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(item.value)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), item.value])
                                                : field.onChange(
                                                    (field.value || []).filter(
                                                      (value) => value !== item.value
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">
                                          {item.label}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="typeOtherDetails"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Other Details (if Other selected)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Please specify other incident type..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 5-6: Fall-Specific Questions */}
                  {hasFallType && (
                    <Card className="shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                          Section 5-6: Fall-Specific Questions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <FormField
                          control={form.control}
                          name="anticoagulantMedication"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Anticoagulant Medication</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                  <SelectItem value="unknown">Unknown</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Is the person on blood thinners?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fallPathway"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pathway Followed</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select pathway" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="green">Green</SelectItem>
                                  <SelectItem value="amber">Amber</SelectItem>
                                  <SelectItem value="red">Red</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                According to internal fall-management policy
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Section 7: Detailed Description */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 7: Detailed Description of Incident/Event
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="detailedDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Provide a detailed description of exactly what happened, what the injured person was doing, and how the incident occurred..."
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Include what happened, what the person was doing, and how the incident occurred. Space for drawings/photos can be added later.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 3: Injury & Treatment */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* Section 8: Incident Level */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 8: Incident Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="incidentLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Incident Level *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select incident level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="death">Death</SelectItem>
                                <SelectItem value="permanent_harm">Permanent/Long-term harm</SelectItem>
                                <SelectItem value="minor_injury">Minor injury/First aid</SelectItem>
                                <SelectItem value="no_harm">No harm</SelectItem>
                                <SelectItem value="near_miss">Near miss</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Defines the severity for auditing and statutory reporting
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 9: Details of Injury */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 9: Details of the Injury
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="injuryDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>What was the injury?</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g., fracture, burn, bruise, cut..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bodyPartInjured"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>What part of the body was injured?</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Specify left/right where relevant..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 10: Treatment Required */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 10: Treatment Required
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="treatmentTypes"
                        render={() => (
                          <FormItem>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              {treatmentOptions.map((item) => (
                                <FormField
                                  key={item.value}
                                  control={form.control}
                                  name="treatmentTypes"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={item.value}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(item.value)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), item.value])
                                                : field.onChange(
                                                    (field.value || []).filter(
                                                      (value) => value !== item.value
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">
                                          {item.label}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 11: Details of Treatment Given */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 11: Details of Treatment Given
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      <FormField
                        control={form.control}
                        name="treatmentDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Treatment Details</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe treatment provided..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vitalSigns"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vital Signs</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Record vital signs if taken..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="treatmentRefused"
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
                                Treatment was refused by the person
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 4: Witnesses & Actions */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  {/* Section 12: Witnesses */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 12: Witnesses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <h4 className="font-medium mb-3">Witness 1</h4>
                          <div className="space-y-3">
                            <FormField
                              control={form.control}
                              name="witness1Name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Witness name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="witness1Contact"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Phone number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3">Witness 2</h4>
                          <div className="space-y-3">
                            <FormField
                              control={form.control}
                              name="witness2Name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Witness name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="witness2Contact"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Phone number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Attach statements if needed (can be added later)
                      </p>
                    </CardContent>
                  </Card>

                  {/* Section 13: Further Actions by Nurse */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 13: Further Actions Completed by Nurse
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Tick all that apply</p>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="nurseActions"
                        render={() => (
                          <FormItem>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              {nurseActionOptions.map((item) => (
                                <FormField
                                  key={item.value}
                                  control={form.control}
                                  name="nurseActions"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={item.value}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(item.value)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), item.value])
                                                : field.onChange(
                                                    (field.value || []).filter(
                                                      (value) => value !== item.value
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">
                                          {item.label}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 14: Further Actions Advised */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 14: Advise Further Action(s) to be Taken
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="furtherActionsAdvised"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recommended Next Steps</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe recommended next steps..."
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 15: Prevention Measures */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 15: Actions Taken to Prevent Re-occurrence
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="preventionMeasures"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preventive Measures Implemented</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe measures implemented to prevent similar incidents..."
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 5: Notifications & Completion */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  {/* Section 16: Home Manager Informed */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 16: Home Manager Informed
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="homeManagerInformedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>By whom</FormLabel>
                            <FormControl>
                              <Input placeholder="Name of person who informed manager" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="homeManagerInformedDateTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date/Time</FormLabel>
                            <FormControl>
                              <Input placeholder="Date and time informed" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 17: Out of Hours On-Call */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 17: Out of Hours On-Call Contacted
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="onCallManagerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manager on call</FormLabel>
                            <FormControl>
                              <Input placeholder="Name of on-call manager" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="onCallContactedDateTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date/Time contacted</FormLabel>
                            <FormControl>
                              <Input placeholder="Date and time contacted" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 18: Next of Kin Informed */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 18: NOK (Next of Kin) Informed
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="nokInformedWho"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>To who</FormLabel>
                            <FormControl>
                              <Input placeholder="Name of next of kin" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nokInformedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>By whom</FormLabel>
                            <FormControl>
                              <Input placeholder="Name of person who informed NOK" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nokInformedDateTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date/Time</FormLabel>
                            <FormControl>
                              <Input placeholder="Date and time informed" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 19: Trust Incident Form Recipients */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 19: Trust Incident Form to be Emailed To
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      <div>
                        <h4 className="font-medium mb-3">Care Manager</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <FormField
                            control={form.control}
                            name="careManagerName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Care manager name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="careManagerEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="email" 
                                    placeholder="care.manager@example.com" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3">Key Worker</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <FormField
                            control={form.control}
                            name="keyWorkerName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Key worker name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="keyWorkerEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="email" 
                                    placeholder="key.worker@example.com" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 20: Form Completion Details */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Signature className="w-4 h-4 sm:w-5 sm:h-5" />
                        Section 20: Details of Person Completing This Form
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="completedByFullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="completedByJobTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Title *</FormLabel>
                            <FormControl>
                              <Input placeholder="Your job title" {...field} />
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
                            <FormLabel>Signature</FormLabel>
                            <FormControl>
                              <Input placeholder="Digital signature or typed name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateCompleted"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date Completed *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick completion date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Navigation buttons */}
              <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t bg-gray-50/50 -mx-1 px-4 sm:px-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto order-2 sm:order-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Back</span>
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 order-1 sm:order-2">
                  <span>Step {currentStep} of {maxSteps}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: maxSteps }).map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index + 1 <= currentStep ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {currentStep < maxSteps ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto order-3"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto order-3 bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Submitting...</span>
                        <span className="sm:hidden">Sending...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Submit Report</span>
                        <span className="sm:hidden">Submit</span>
                        <FileText className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}