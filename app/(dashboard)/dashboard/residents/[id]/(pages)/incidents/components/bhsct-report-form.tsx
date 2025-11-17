"use client";

import React from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Check, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BHSCTReportFormProps {
  incident: any;
  resident: any;
  user: any;
  open: boolean;
  onClose: () => void;
}

export function BHSCTReportForm({
  incident,
  resident,
  user,
  open,
  onClose,
}: BHSCTReportFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Popover states for date pickers
  const [dobPopoverOpen, setDobPopoverOpen] = React.useState(false);
  const [incidentDatePopoverOpen, setIncidentDatePopoverOpen] = React.useState(false);
  const [dateReportedPopoverOpen, setDateReportedPopoverOpen] = React.useState(false);
  const [riskAssessmentPopoverOpen, setRiskAssessmentPopoverOpen] = React.useState(false);
  const [reviewDatePopoverOpen, setReviewDatePopoverOpen] = React.useState(false);

  const createBHSCTReport = useMutation(api.bhsctReports.create);

  const [formData, setFormData] = React.useState({
    // Provider and Service User Information
    providerName: "",
    serviceUserName: "",
    serviceUserDOB: undefined as Date | undefined,
    serviceUserGender: "",
    careManager: "",

    // Incident Location
    incidentAddress: "",
    exactLocation: "",

    // Incident Details
    incidentDate: undefined as Date | undefined,
    incidentTime: "",
    incidentDescription: "",

    // Injury and Treatment
    natureOfInjury: "",
    immediateActionTaken: "",

    // Notifications and Witnesses
    personsNotified: "",
    witnesses: "",
    staffInvolved: "",
    otherServiceUsersInvolved: "",

    // Reporter Information
    reporterName: "",
    reporterDesignation: "",
    dateReported: undefined as Date | undefined,

    // Follow-up Actions
    preventionActions: "",
    riskAssessmentUpdateDate: undefined as Date | undefined,
    otherComments: "",

    // Senior Staff / Manager Review
    reviewerName: "",
    reviewerDesignation: "",
    reviewDate: undefined as Date | undefined,
  });

  // Auto-populate form data from incident when dialog opens
  React.useEffect(() => {
    if (open && incident && resident) {
      setFormData({
        // Provider and Service User Information (auto-populated from resident + incident)
        providerName: incident.homeName || "",
        serviceUserName: `${resident.firstName || ""} ${resident.lastName || ""}`.trim() ||
                         `${incident.injuredPersonFirstName || ""} ${incident.injuredPersonSurname || ""}`.trim(),
        serviceUserDOB: resident.dateOfBirth ? new Date(resident.dateOfBirth) :
                        (incident.injuredPersonDOB ? new Date(incident.injuredPersonDOB) : undefined),
        serviceUserGender: resident.gender || "",
        careManager: resident.careManagerName || resident.careManager?.name || incident.careManagerName || "",

        // Incident Location (auto-populated from incident)
        incidentAddress: incident.homeName || "",
        exactLocation: incident.unit || "",

        // Incident Details (auto-populated from incident)
        incidentDate: incident.date ? new Date(incident.date) : undefined,
        incidentTime: incident.time || "",
        incidentDescription: incident.detailedDescription || "",

        // Injury and Treatment (auto-populated from incident)
        natureOfInjury: [incident.injuryDescription, incident.bodyPartInjured]
          .filter(Boolean)
          .join(" - ") || "",
        immediateActionTaken: incident.treatmentDetails || "",

        // Notifications and Witnesses (auto-populated from incident)
        personsNotified: [
          incident.homeManagerInformedBy ? `Manager: ${incident.homeManagerInformedBy}` : "",
          incident.nokInformedWho ? `NOK: ${incident.nokInformedWho}` : "",
        ].filter(Boolean).join(", ") || "",
        witnesses: [incident.witness1Name, incident.witness2Name]
          .filter(Boolean)
          .join(", ") || "",
        staffInvolved: incident.completedByFullName || "",
        otherServiceUsersInvolved: "",

        // Reporter Information (auto-populated from incident)
        reporterName: incident.completedByFullName || "",
        reporterDesignation: incident.completedByJobTitle || "",
        dateReported: incident.dateCompleted ? new Date(incident.dateCompleted) : new Date(),

        // Follow-up Actions (auto-populated from incident)
        preventionActions: incident.preventionMeasures || "",
        riskAssessmentUpdateDate: undefined,
        otherComments: incident.furtherActionsAdvised || "",

        // Senior Staff / Manager Review (leave empty for user to fill)
        reviewerName: "",
        reviewerDesignation: "",
        reviewDate: undefined,
      });
    }
  }, [open, incident, resident]);

  const totalSteps = 8;

  const handleNext = () => {
    // Validation for current step
    if (!validateStep(currentStep)) {
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Provider and Service User Information
        if (!formData.providerName.trim()) {
          toast.error("Please enter Provider Name");
          return false;
        }
        if (!formData.serviceUserName.trim()) {
          toast.error("Please enter Service User Name");
          return false;
        }
        if (!formData.serviceUserDOB) {
          toast.error("Please enter Date of Birth");
          return false;
        }
        if (!formData.serviceUserGender) {
          toast.error("Please select Gender");
          return false;
        }
        if (!formData.careManager.trim()) {
          toast.error("Please enter Care Manager");
          return false;
        }
        return true;

      case 2: // Incident Location
        if (!formData.incidentAddress.trim()) {
          toast.error("Please enter Incident Address");
          return false;
        }
        if (!formData.exactLocation.trim()) {
          toast.error("Please enter Exact Location");
          return false;
        }
        return true;

      case 3: // Incident Details
        if (!formData.incidentDate) {
          toast.error("Please enter Incident Date");
          return false;
        }
        if (!formData.incidentTime) {
          toast.error("Please enter Incident Time");
          return false;
        }
        if (!formData.incidentDescription.trim()) {
          toast.error("Please enter Incident Description");
          return false;
        }
        return true;

      case 4: // Injury and Treatment
        if (!formData.natureOfInjury.trim()) {
          toast.error("Please enter Nature of Injury");
          return false;
        }
        if (!formData.immediateActionTaken.trim()) {
          toast.error("Please enter Immediate Action Taken");
          return false;
        }
        return true;

      case 5: // Notifications and Witnesses
        if (!formData.personsNotified.trim()) {
          toast.error("Please enter Persons Notified");
          return false;
        }
        return true;

      case 6: // Reporter Information
        if (!formData.reporterName.trim()) {
          toast.error("Please enter Reporter Name");
          return false;
        }
        if (!formData.reporterDesignation.trim()) {
          toast.error("Please enter Reporter Designation");
          return false;
        }
        if (!formData.dateReported) {
          toast.error("Please enter Date Reported");
          return false;
        }
        return true;

      case 7: // Follow-up Actions
        if (!formData.preventionActions.trim()) {
          toast.error("Please enter Prevention Actions");
          return false;
        }
        return true;

      case 8: // Review (optional fields)
        return true;

      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createBHSCTReport({
        incidentId: incident._id,
        residentId: resident._id,
        organizationId: resident.organizationId,
        teamId: resident.teamId,

        // Provider and Service User Information
        providerName: formData.providerName.trim(),
        serviceUserName: formData.serviceUserName.trim(),
        serviceUserDOB: formData.serviceUserDOB ? format(formData.serviceUserDOB, "yyyy-MM-dd") : "",
        serviceUserGender: formData.serviceUserGender,
        careManager: formData.careManager.trim(),

        // Incident Location
        incidentAddress: formData.incidentAddress.trim(),
        exactLocation: formData.exactLocation.trim(),

        // Incident Details
        incidentDate: formData.incidentDate ? format(formData.incidentDate, "yyyy-MM-dd") : "",
        incidentTime: formData.incidentTime,
        incidentDescription: formData.incidentDescription.trim(),

        // Injury and Treatment
        natureOfInjury: formData.natureOfInjury.trim(),
        immediateActionTaken: formData.immediateActionTaken.trim(),

        // Notifications and Witnesses
        personsNotified: formData.personsNotified.trim(),
        witnesses: formData.witnesses.trim() || undefined,
        staffInvolved: formData.staffInvolved.trim() || undefined,
        otherServiceUsersInvolved: formData.otherServiceUsersInvolved.trim() || undefined,

        // Reporter Information
        reporterName: formData.reporterName.trim(),
        reporterDesignation: formData.reporterDesignation.trim(),
        dateReported: formData.dateReported ? format(formData.dateReported, "yyyy-MM-dd") : "",

        // Follow-up Actions
        preventionActions: formData.preventionActions.trim(),
        riskAssessmentUpdateDate: formData.riskAssessmentUpdateDate ? format(formData.riskAssessmentUpdateDate, "yyyy-MM-dd") : undefined,
        otherComments: formData.otherComments.trim() || undefined,

        // Senior Staff / Manager Review
        reviewerName: formData.reviewerName.trim() || undefined,
        reviewerDesignation: formData.reviewerDesignation.trim() || undefined,
        reviewDate: formData.reviewDate ? format(formData.reviewDate, "yyyy-MM-dd") : undefined,

        // Status
        status: "submitted",

        // System fields
        reportedBy: user.user.email,
        reportedByName: user.user.name || user.user.email,
      });

      toast.success("BHSCT report submitted successfully");
      onClose();
      setCurrentStep(1);
      // Reset form
      setFormData({
        providerName: "",
        serviceUserName: "",
        serviceUserDOB: undefined,
        serviceUserGender: "",
        careManager: "",
        incidentAddress: "",
        exactLocation: "",
        incidentDate: undefined,
        incidentTime: "",
        incidentDescription: "",
        natureOfInjury: "",
        immediateActionTaken: "",
        personsNotified: "",
        witnesses: "",
        staffInvolved: "",
        otherServiceUsersInvolved: "",
        reporterName: "",
        reporterDesignation: "",
        dateReported: undefined,
        preventionActions: "",
        riskAssessmentUpdateDate: undefined,
        otherComments: "",
        reviewerName: "",
        reviewerDesignation: "",
        reviewDate: undefined,
      });
    } catch (error) {
      console.error("Error submitting BHSCT report:", error);
      toast.error("Failed to submit BHSCT report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            BHSCT Incident Report Form - Step {currentStep} of {totalSteps}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6 px-1">
          {/* Step 1: Provider and Service User Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                Provider and Service User Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="providerName" className="mb-2">Provider Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="providerName"
                    value={formData.providerName}
                    onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="serviceUserName" className="mb-2">Name of Service User <span className="text-red-500">*</span></Label>
                  <Input
                    id="serviceUserName"
                    value={formData.serviceUserName}
                    onChange={(e) => setFormData({ ...formData, serviceUserName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="serviceUserDOB" className="mb-2">Date of Birth (DOB) <span className="text-red-500">*</span></Label>
                  <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen} modal>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !formData.serviceUserDOB && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        {formData.serviceUserDOB ? (
                          format(formData.serviceUserDOB, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.serviceUserDOB}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          setFormData({ ...formData, serviceUserDOB: date });
                          setDobPopoverOpen(false);
                        }}
                        disabled={isSubmitting}
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="serviceUserGender" className="mb-2">Gender <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.serviceUserGender}
                    onValueChange={(value) => setFormData({ ...formData, serviceUserGender: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="serviceUserGender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="careManager" className="mb-2">Care Manager <span className="text-red-500">*</span></Label>
                  <Input
                    id="careManager"
                    value={formData.careManager}
                    onChange={(e) => setFormData({ ...formData, careManager: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Incident Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                Incident Location
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="incidentAddress" className="mb-2">Address (including postcode) where incident occurred <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="incidentAddress"
                    value={formData.incidentAddress}
                    onChange={(e) => setFormData({ ...formData, incidentAddress: e.target.value })}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="exactLocation" className="mb-2">Exact location where incident occurred <span className="text-red-500">*</span></Label>
                  <Input
                    id="exactLocation"
                    value={formData.exactLocation}
                    onChange={(e) => setFormData({ ...formData, exactLocation: e.target.value })}
                    placeholder="e.g., Bedroom, Bathroom, Garden"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Incident Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                Incident Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="incidentDate" className="mb-2">Date of Incident <span className="text-red-500">*</span></Label>
                  <Popover open={incidentDatePopoverOpen} onOpenChange={setIncidentDatePopoverOpen} modal>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !formData.incidentDate && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        {formData.incidentDate ? (
                          format(formData.incidentDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.incidentDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          setFormData({ ...formData, incidentDate: date });
                          setIncidentDatePopoverOpen(false);
                        }}
                        disabled={isSubmitting}
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="incidentTime" className="mb-2">Time of Incident <span className="text-red-500">*</span></Label>
                  <Input
                    id="incidentTime"
                    type="time"
                    value={formData.incidentTime}
                    onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="incidentDescription" className="mb-2">Brief, factual description of incident <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="incidentDescription"
                    value={formData.incidentDescription}
                    onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })}
                    rows={5}
                    placeholder="Include details of any equipment or medication involved"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Injury and Treatment */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                Injury and Treatment
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="natureOfInjury" className="mb-2">Nature of Injury Sustained <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="natureOfInjury"
                    value={formData.natureOfInjury}
                    onChange={(e) => setFormData({ ...formData, natureOfInjury: e.target.value })}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="immediateActionTaken" className="mb-2">Details of immediate action taken and treatment given <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="immediateActionTaken"
                    value={formData.immediateActionTaken}
                    onChange={(e) => setFormData({ ...formData, immediateActionTaken: e.target.value })}
                    rows={4}
                    placeholder="e.g., First aid, GP, hospital admission, etc."
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Notifications and Witnesses */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                Notifications and Witnesses
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="personsNotified" className="mb-2">Persons notified including designation/relationship to Service User <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="personsNotified"
                    value={formData.personsNotified}
                    onChange={(e) => setFormData({ ...formData, personsNotified: e.target.value })}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="witnesses" className="mb-2">Name and designation of any witnesses</Label>
                  <Textarea
                    id="witnesses"
                    value={formData.witnesses}
                    onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="staffInvolved" className="mb-2">Name and designation of any staff member involved</Label>
                  <Textarea
                    id="staffInvolved"
                    value={formData.staffInvolved}
                    onChange={(e) => setFormData({ ...formData, staffInvolved: e.target.value })}
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="otherServiceUsersInvolved" className="mb-2">Other Service User(s) involved (include DOB)</Label>
                  <Textarea
                    id="otherServiceUsersInvolved"
                    value={formData.otherServiceUsersInvolved}
                    onChange={(e) => setFormData({ ...formData, otherServiceUsersInvolved: e.target.value })}
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Reporter Information */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                Reporter Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reporterName" className="mb-2 block">Name of person reporting the incident <span className="text-red-500">*</span></Label>
                  <Input
                    id="reporterName"
                    value={formData.reporterName}
                    onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="reporterDesignation" className="mb-2 block">Designation <span className="text-red-500">*</span></Label>
                  <Input
                    id="reporterDesignation"
                    value={formData.reporterDesignation}
                    onChange={(e) => setFormData({ ...formData, reporterDesignation: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="dateReported" className="mb-2 block">Date reported <span className="text-red-500">*</span></Label>
                  <Popover open={dateReportedPopoverOpen} onOpenChange={setDateReportedPopoverOpen} modal>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !formData.dateReported && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        {formData.dateReported ? (
                          format(formData.dateReported, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dateReported}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          setFormData({ ...formData, dateReported: date });
                          setDateReportedPopoverOpen(false);
                        }}
                        disabled={isSubmitting}
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Follow-up Actions */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                Follow-up Actions
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="preventionActions" className="mb-2 block">Actions taken to prevent recurrence <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="preventionActions"
                    value={formData.preventionActions}
                    onChange={(e) => setFormData({ ...formData, preventionActions: e.target.value })}
                    rows={4}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="riskAssessmentUpdateDate" className="mb-2 block">Date Service User&apos;s risk assessment and care plan updated following this incident</Label>
                  <Popover open={riskAssessmentPopoverOpen} onOpenChange={setRiskAssessmentPopoverOpen} modal>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !formData.riskAssessmentUpdateDate && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        {formData.riskAssessmentUpdateDate ? (
                          format(formData.riskAssessmentUpdateDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.riskAssessmentUpdateDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          setFormData({ ...formData, riskAssessmentUpdateDate: date });
                          setRiskAssessmentPopoverOpen(false);
                        }}
                        disabled={isSubmitting}
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="otherComments" className="mb-2 block">Other Comments</Label>
                  <Textarea
                    id="otherComments"
                    value={formData.otherComments}
                    onChange={(e) => setFormData({ ...formData, otherComments: e.target.value })}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Senior Staff / Manager Review */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                Senior Staff / Service Manager Review
              </h3>
              <p className="text-sm text-muted-foreground">
                These fields are optional and can be completed by senior staff or service manager.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reviewerName" className="mb-2 block">Name (of senior staff / service manager)</Label>
                  <Input
                    id="reviewerName"
                    value={formData.reviewerName}
                    onChange={(e) => setFormData({ ...formData, reviewerName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="reviewerDesignation" className="mb-2 block">Designation</Label>
                  <Input
                    id="reviewerDesignation"
                    value={formData.reviewerDesignation}
                    onChange={(e) => setFormData({ ...formData, reviewerDesignation: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="reviewDate" className="mb-2 block">Date</Label>
                  <Popover open={reviewDatePopoverOpen} onOpenChange={setReviewDatePopoverOpen} modal>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !formData.reviewDate && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        {formData.reviewDate ? (
                          format(formData.reviewDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.reviewDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          setFormData({ ...formData, reviewDate: date });
                          setReviewDatePopoverOpen(false);
                        }}
                        disabled={isSubmitting}
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="border-t pt-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </div>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : (
                <>
                  Submit Report
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
