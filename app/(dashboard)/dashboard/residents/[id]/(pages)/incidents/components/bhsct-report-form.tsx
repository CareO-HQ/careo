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
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

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

  const createBHSCTReport = useMutation(api.bhsctReports.create);

  const [formData, setFormData] = React.useState({
    // Provider and Service User Information
    providerName: "",
    serviceUserName: "",
    serviceUserDOB: "",
    serviceUserGender: "",
    careManager: "",

    // Incident Location
    incidentAddress: "",
    exactLocation: "",

    // Incident Details
    incidentDate: "",
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
    dateReported: "",

    // Follow-up Actions
    preventionActions: "",
    riskAssessmentUpdateDate: "",
    otherComments: "",

    // Senior Staff / Manager Review
    reviewerName: "",
    reviewerDesignation: "",
    reviewDate: "",
  });

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
        serviceUserDOB: formData.serviceUserDOB,
        serviceUserGender: formData.serviceUserGender,
        careManager: formData.careManager.trim(),

        // Incident Location
        incidentAddress: formData.incidentAddress.trim(),
        exactLocation: formData.exactLocation.trim(),

        // Incident Details
        incidentDate: formData.incidentDate,
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
        dateReported: formData.dateReported,

        // Follow-up Actions
        preventionActions: formData.preventionActions.trim(),
        riskAssessmentUpdateDate: formData.riskAssessmentUpdateDate || undefined,
        otherComments: formData.otherComments.trim() || undefined,

        // Senior Staff / Manager Review
        reviewerName: formData.reviewerName.trim() || undefined,
        reviewerDesignation: formData.reviewerDesignation.trim() || undefined,
        reviewDate: formData.reviewDate || undefined,

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
        serviceUserDOB: "",
        serviceUserGender: "",
        careManager: "",
        incidentAddress: "",
        exactLocation: "",
        incidentDate: "",
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
        dateReported: "",
        preventionActions: "",
        riskAssessmentUpdateDate: "",
        otherComments: "",
        reviewerName: "",
        reviewerDesignation: "",
        reviewDate: "",
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
                  <Label htmlFor="providerName">Provider Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="providerName"
                    value={formData.providerName}
                    onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="serviceUserName">Name of Service User <span className="text-red-500">*</span></Label>
                  <Input
                    id="serviceUserName"
                    value={formData.serviceUserName}
                    onChange={(e) => setFormData({ ...formData, serviceUserName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="serviceUserDOB">Date of Birth (DOB) <span className="text-red-500">*</span></Label>
                  <Input
                    id="serviceUserDOB"
                    type="date"
                    value={formData.serviceUserDOB}
                    onChange={(e) => setFormData({ ...formData, serviceUserDOB: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="serviceUserGender">Gender <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="careManager">Care Manager <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="incidentAddress">Address (including postcode) where incident occurred <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="incidentAddress"
                    value={formData.incidentAddress}
                    onChange={(e) => setFormData({ ...formData, incidentAddress: e.target.value })}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="exactLocation">Exact location where incident occurred <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="incidentDate">Date of Incident <span className="text-red-500">*</span></Label>
                  <Input
                    id="incidentDate"
                    type="date"
                    value={formData.incidentDate}
                    onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="incidentTime">Time of Incident <span className="text-red-500">*</span></Label>
                  <Input
                    id="incidentTime"
                    type="time"
                    value={formData.incidentTime}
                    onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="incidentDescription">Brief, factual description of incident <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="natureOfInjury">Nature of Injury Sustained <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="natureOfInjury"
                    value={formData.natureOfInjury}
                    onChange={(e) => setFormData({ ...formData, natureOfInjury: e.target.value })}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="immediateActionTaken">Details of immediate action taken and treatment given <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="personsNotified">Persons notified including designation/relationship to Service User <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="personsNotified"
                    value={formData.personsNotified}
                    onChange={(e) => setFormData({ ...formData, personsNotified: e.target.value })}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="witnesses">Name and designation of any witnesses</Label>
                  <Textarea
                    id="witnesses"
                    value={formData.witnesses}
                    onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="staffInvolved">Name and designation of any staff member involved</Label>
                  <Textarea
                    id="staffInvolved"
                    value={formData.staffInvolved}
                    onChange={(e) => setFormData({ ...formData, staffInvolved: e.target.value })}
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="otherServiceUsersInvolved">Other Service User(s) involved (include DOB)</Label>
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
                  <Label htmlFor="reporterName">Name of person reporting the incident <span className="text-red-500">*</span></Label>
                  <Input
                    id="reporterName"
                    value={formData.reporterName}
                    onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="reporterDesignation">Designation <span className="text-red-500">*</span></Label>
                  <Input
                    id="reporterDesignation"
                    value={formData.reporterDesignation}
                    onChange={(e) => setFormData({ ...formData, reporterDesignation: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="dateReported">Date reported <span className="text-red-500">*</span></Label>
                  <Input
                    id="dateReported"
                    type="date"
                    value={formData.dateReported}
                    onChange={(e) => setFormData({ ...formData, dateReported: e.target.value })}
                    disabled={isSubmitting}
                  />
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
                  <Label htmlFor="preventionActions">Actions taken to prevent recurrence <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="preventionActions"
                    value={formData.preventionActions}
                    onChange={(e) => setFormData({ ...formData, preventionActions: e.target.value })}
                    rows={4}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="riskAssessmentUpdateDate">Date Service User&apos;s risk assessment and care plan updated following this incident</Label>
                  <Input
                    id="riskAssessmentUpdateDate"
                    type="date"
                    value={formData.riskAssessmentUpdateDate}
                    onChange={(e) => setFormData({ ...formData, riskAssessmentUpdateDate: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="otherComments">Other Comments</Label>
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
                  <Label htmlFor="reviewerName">Name (of senior staff / service manager)</Label>
                  <Input
                    id="reviewerName"
                    value={formData.reviewerName}
                    onChange={(e) => setFormData({ ...formData, reviewerName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="reviewerDesignation">Designation</Label>
                  <Input
                    id="reviewerDesignation"
                    value={formData.reviewerDesignation}
                    onChange={(e) => setFormData({ ...formData, reviewerDesignation: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="reviewDate">Date</Label>
                  <Input
                    id="reviewDate"
                    type="date"
                    value={formData.reviewDate}
                    onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                    disabled={isSubmitting}
                  />
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
