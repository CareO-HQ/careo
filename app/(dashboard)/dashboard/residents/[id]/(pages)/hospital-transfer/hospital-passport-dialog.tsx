import React from "react";
import { UseFormReturn } from "react-hook-form";
import { HospitalPassportFormData } from "./types";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Home,
  Stethoscope,
  Pill,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  Phone,
  Calendar,
  Paperclip,
} from "lucide-react";


// Custom FormLabel with required indicator
const FormLabelRequired = ({ children, required = false }: { children: React.ReactNode; required?: boolean }) => (
  <FormLabel>
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </FormLabel>
);

interface HospitalPassportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<HospitalPassportFormData>;
  onSubmit: (data: HospitalPassportFormData) => void;
  residentName: string;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  handleNextStep: () => void;
  prevStep: () => void;
}

export function HospitalPassportDialog({
  open,
  onOpenChange,
  form,
  onSubmit,
  residentName,
  currentStep,

  handleNextStep,
  prevStep,
}: HospitalPassportDialogProps) {
  const totalSteps = 4;

  // const steps = [
  //   { id: 1, name: "General & Transfer Details", icon: Home },
  //   { id: 2, name: "Medical & Care Needs", icon: Stethoscope },
  //   { id: 3, name: "Skin, Medication & Attachments", icon: Pill },
  //   { id: 4, name: "Sign-off", icon: FileText },
  // ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Hospital Passport for {residentName}</DialogTitle>
          <DialogDescription>
            Complete all required information for the hospital transfer. Fields marked with * are mandatory.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        {/* <div className="flex items-center justify-between mb-6 px-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center cursor-pointer",
                  index < steps.length - 1 && "flex-1"
                )}
                onClick={() => setCurrentStep(step.id)}
              >
                <div className="flex items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                      currentStep === step.id
                        ? "bg-blue-600 border-blue-600 text-white"
                        : currentStep > step.id
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-gray-100 border-gray-300 text-gray-500"
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "ml-2 text-sm font-medium hidden sm:block",
                      currentStep === step.id
                        ? "text-blue-600"
                        : currentStep > step.id
                        ? "text-green-600"
                        : "text-gray-500"
                    )}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 transition-colors",
                      currentStep > step.id ? "bg-green-600" : "bg-gray-300"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div> */}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-1">
              {/* Step 1: General & Transfer Details */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg">
                    <h3 className="font-medium  mb-4 flex items-center">
                      Person in Care Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="generalDetails.personName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Name of Person in our Care</FormLabelRequired>
                            <FormControl>
                              <Input {...field} readOnly className="bg-gray-50 text-gray-700" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generalDetails.knownAs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Likes to be known as</FormLabelRequired>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generalDetails.dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Date of Birth</FormLabelRequired>
                            <FormControl>
                              <Input type="date" {...field} readOnly className="bg-gray-50 text-gray-700" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generalDetails.nhsNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>NHS Number</FormLabelRequired>
                            <FormControl>
                              <Input {...field} readOnly className="bg-gray-50 text-gray-700" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generalDetails.religion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Religion</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generalDetails.weightOnTransfer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight on Transfer</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 70kg" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generalDetails.careType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Care Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="nursing">Nursing</SelectItem>
                                <SelectItem value="residential">Residential</SelectItem>
                                <SelectItem value="ld">Learning Disability</SelectItem>
                                <SelectItem value="mental_health">Mental Health</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generalDetails.transferDateTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Date and Time of Transfer</FormLabelRequired>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generalDetails.accompaniedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accompanied by</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generalDetails.englishFirstLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Is English the 1st Language?</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      {form.watch("generalDetails.englishFirstLanguage") === "no" && (
                        <FormField
                          control={form.control}
                          name="generalDetails.firstLanguage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Language</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  <div className=" p-4 rounded-lg">
                    <h3 className="font-medium  mb-4 flex items-center">
                      
                      Transfer Locations
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium my-5">Care Home Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="generalDetails.careHomeName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabelRequired required>Care Home Name</FormLabelRequired>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="generalDetails.careHomePhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabelRequired required>Care Home Phone</FormLabelRequired>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="generalDetails.careHomeAddress"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabelRequired required>Care Home Address</FormLabelRequired>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <h4 className="font-medium my-5">Hospital/Facility Being Transferred Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="generalDetails.hospitalName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabelRequired required>Hospital/Facility Name</FormLabelRequired>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="generalDetails.hospitalPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hospital/Facility Phone</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="generalDetails.hospitalAddress"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabelRequired required>Hospital/Facility Address</FormLabelRequired>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className=" p-4 rounded-lg">
                    <h3 className="font-medium mb-4 flex items-center">
                     
                      Contact Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium my-5">Next of Kin/Representative</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="generalDetails.nextOfKinName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabelRequired required>Name</FormLabelRequired>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="generalDetails.nextOfKinPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabelRequired required>Phone</FormLabelRequired>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="generalDetails.nextOfKinAddress"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabelRequired required>Address</FormLabelRequired>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <h4 className="font-medium my-5">GP Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="generalDetails.gpName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabelRequired required>GP Name</FormLabelRequired>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="generalDetails.gpPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabelRequired required>GP Phone</FormLabelRequired>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="generalDetails.gpAddress"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabelRequired required>GP Address</FormLabelRequired>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <h4 className="font-medium my-5">Care Manager (Optional)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="generalDetails.careManagerName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Care Manager Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="generalDetails.careManagerPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Care Manager Phone</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="generalDetails.careManagerAddress"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Care Manager Address</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Medical & Care Needs */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className=" p-4 rounded-lg">
                    <h3 className="font-medium  mb-4">Reason for Transfer</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.situation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Situation</FormLabelRequired>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-[80px]"
                                placeholder="What is happening with the resident right now?"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.background"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Background</FormLabelRequired>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-[80px]"
                                placeholder="What is the clinical background or context?"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.assessment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Assessment</FormLabelRequired>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-[80px]"
                                placeholder="What do you think the problem is?"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.recommendations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Recommendations</FormLabelRequired>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-[80px]"
                                placeholder="What actions do you recommend?"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg">
                    <h3 className="font-medium  mb-4">Medical History</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.pastMedicalHistory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Past Medical History</FormLabelRequired>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-[80px]"
                                placeholder="Include all relevant medical history"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.knownAllergies"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Known Allergies</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="List all known allergies"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.historyOfConfusion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>History of Confusion</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                                <SelectItem value="sometimes">Sometimes</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.learningDisabilityMentalHealth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>History of Learning Disability/Mental Health</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className=" p-4 rounded-lg">
                    <h3 className="font-medium mb-4">Communication & Mobility</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.communicationIssues"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Communication Issues</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., hearing/visual loss/aphasia" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.hearingAid"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">Hearing Aid</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.glasses"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">Glasses</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.otherAids"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="Other aids" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.mobilityAssistance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Level of Mobility Assistance Required</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="independent">Independent</SelectItem>
                                <SelectItem value="minimum">Minimum</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.mobilityAids"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobility Aids Required</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., standard/full hoist" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.historyOfFalls"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">History of Falls</FormLabel>
                            </FormItem>
                          )}
                        />
                        {form.watch("medicalCareNeeds.historyOfFalls") && (
                          <FormField
                            control={form.control}
                            name="medicalCareNeeds.dateOfLastFall"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Last Fall</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className=" p-4 rounded-lg">
                    <h3 className="font-medium  mb-4">Care Needs</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.toiletingAssistance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Toileting Assistance Level</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="independent">Independent</SelectItem>
                                  <SelectItem value="minimum">Minimum</SelectItem>
                                  <SelectItem value="full">Full</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.continenceStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Continence Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="continent">Continent</SelectItem>
                                  <SelectItem value="urine">Incontinent - Urine</SelectItem>
                                  <SelectItem value="faeces">Incontinent - Faeces</SelectItem>
                                  <SelectItem value="both">Incontinent - Both</SelectItem>
                                  <SelectItem value="na">N/A</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.nutritionalAssistance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nutritional Assistance Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="independent">Independent</SelectItem>
                                <SelectItem value="minimum">Minimum</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.dietType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type of Diet/Fluids/Supplements</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.swallowingDifficulties"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">Swallowing Difficulties</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.enteralNutrition"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">Enteral Nutrition</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.mustScore"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>MUST Score</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicalCareNeeds.personalHygieneAssistance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Personal Hygiene/Dressing Assistance Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="independent">Independent</SelectItem>
                                <SelectItem value="minimum">Minimum</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.topDentures"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">Top Dentures</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.bottomDentures"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">Bottom Dentures</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="medicalCareNeeds.denturesAccompanying"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">Dentures Accompanying</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Skin, Medication & Attachments */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className=" p-4 rounded-lg">
                    <h3 className="font-medium  mb-4">Skin Care</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.skinIntegrityAssistance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Level of Assistance for Skin Integrity</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="independent">Independent</SelectItem>
                                <SelectItem value="minimum">Minimum</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.bradenScore"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Braden Score</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.skinStateOnTransfer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Skin State on Transfer</FormLabelRequired>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="State if intact, any rashes, bruising, pressure damage"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.currentSkinCareRegime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Skin Care/Wound Management Regime</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.pressureRelievingEquipment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pressure Relieving Equipment in Use</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="skinMedicationAttachments.knownToTVN"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">Known to TVN</FormLabel>
                            </FormItem>
                          )}
                        />
                        {form.watch("skinMedicationAttachments.knownToTVN") && (
                          <FormField
                            control={form.control}
                            name="skinMedicationAttachments.tvnName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name of TVN</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className=" p-4 rounded-lg">
                    <h3 className="font-medium  mb-4 flex items-center">
                     
                      Medication
                    </h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.currentMedicationRegime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Current Medication Regime</FormLabelRequired>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-[100px]"
                                placeholder="List all current medications"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.lastMedicationDateTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Date and Time Last Medication Administered</FormLabelRequired>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.lastMealDrinkDateTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date and Time Last Meal/Drink Taken</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg">
                    <h3 className="font-medium  mb-4 flex items-center">
                    
                      Attachments
                    </h3>
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.attachments.currentMedications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer">Copy of Current Medications</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.attachments.bodyMap"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer">Body Map</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.attachments.observations"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer">Record of Observations</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.attachments.dnacprForm"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer">DNACPR Form</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skinMedicationAttachments.attachments.enteralFeedingRegime"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer">Copy of Enteral Feeding Regime</FormLabel>
                          </FormItem>
                        )}
                      />
                      <div className="flex items-start space-x-2">
                        <FormField
                          control={form.control}
                          name="skinMedicationAttachments.attachments.other"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">Other</FormLabel>
                            </FormItem>
                          )}
                        />
                        {form.watch("skinMedicationAttachments.attachments.other") && (
                          <FormField
                            control={form.control}
                            name="skinMedicationAttachments.attachments.otherSpecify"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input {...field} placeholder="Please specify" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Sign-off */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className=" p-4 rounded-lg">
                    <h3 className="font-medium  mb-4 flex items-center">
                      Sign-off Section
                    </h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="signOff.printedName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Printed Name of Person Completing Form</FormLabelRequired>
                            <FormControl>
                              <Input {...field} readOnly className="bg-gray-50 text-gray-700" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="signOff.designation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Designation</FormLabelRequired>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="signOff.contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Contact Telephone No</FormLabelRequired>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="signOff.completedDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Date Completed</FormLabelRequired>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="signOff.signature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabelRequired required>Signature</FormLabelRequired>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="min-h-[80px] bg-gray-50 text-gray-700"
                                placeholder="Type your full name as electronic signature"
                                readOnly
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (currentStep === 1) {
                    onOpenChange(false);
                  } else {
                    prevStep();
                  }
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {currentStep === 1 ? "Cancel" : "Previous"}
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>

              {currentStep < totalSteps ? (
                <Button type="button" onClick={handleNextStep}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Generate Passport
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}