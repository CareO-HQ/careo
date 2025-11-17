"use client";

import React from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

interface SEHSCTReportFormProps {
  incident: any;
  resident: any;
  user: any;
  open: boolean;
  onClose: () => void;
}

export function SEHSCTReportForm({
  incident,
  resident,
  user,
  open,
  onClose,
}: SEHSCTReportFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Popover states for date pickers
  const [incidentDatePopoverOpen, setIncidentDatePopoverOpen] = React.useState(false);
  const [dobPopoverOpen, setDobPopoverOpen] = React.useState(false);
  const [riskAssessmentPopoverOpen, setRiskAssessmentPopoverOpen] = React.useState(false);
  const [dateClosedPopoverOpen, setDateClosedPopoverOpen] = React.useState(false);
  const [dateApprovedPopoverOpen, setDateApprovedPopoverOpen] = React.useState(false);

  const createSEHSCTReport = useMutation(api.sehsctReports.create);

  const [formData, setFormData] = React.useState({
    // Administrative
    datixRef: "",

    // Section 1 & 2 - A: Where and when
    incidentDate: undefined as Date | undefined,
    incidentTime: "",
    primaryLocation: "",
    exactLocation: "",

    // B: Circumstances
    incidentDescription: "",
    contributoryFactors: "",
    propertyEquipmentMedication: "",
    causedByBehaviorsOfConcern: false,
    documentedInCarePlan: false,
    apparentCauseOfInjury: "",

    // C: Actions
    remedialActionTaken: "",
    actionsTakenToPreventRecurrence: "",
    riskAssessmentUpdateDate: undefined as Date | undefined,

    // D: Equipment or Property
    equipmentInvolved: false,
    equipmentDetails: "",
    reportedToNIAC: false,
    propertyInvolved: false,
    propertyDetails: "",

    // E: Persons notified
    personsNotified: "",

    // F: Individual involved
    hcNumber: "",
    gender: "",
    dateOfBirth: undefined as Date | undefined,
    serviceUserFullName: "",
    serviceUserAddress: "",
    trustKeyWorkerName: "",
    trustKeyWorkerDesignation: "",

    // G: Injury details
    personSufferedInjury: false,
    partOfBodyAffected: "",
    natureOfInjury: "",

    // H: Attention received
    attentionReceived: [] as string[],
    attentionReceivedOther: "",

    // Section 3 - A: Staff/Service Users involved
    staffMembersInvolved: "",
    otherServiceUsersInvolved: "",

    // B: Witnesses
    witnessDetails: "",

    // Section 4 - Provider Information
    providerName: "",
    providerAddress: "",
    groupName: "",
    serviceName: "",
    typeOfService: "",

    // Section 5 - Medication
    medicationNames: "",
    pharmacyDetails: "",

    // Section 6 - Identification and Contact
    identifiedBy: "",
    identifierName: "",
    identifierJobTitle: "",
    identifierTelephone: "",
    identifierEmail: "",
    trustStaffName: "",
    trustStaffJobTitle: "",
    trustStaffTelephone: "",
    trustStaffEmail: "",
    returnEmail: "",

    // Section 7 - Trust Key Worker Completion
    outcomeComments: "",
    reviewOutcome: "",
    furtherActionByProvider: "",
    furtherActionByProviderDate: "",
    furtherActionByProviderActionBy: "",
    furtherActionByTrust: "",
    furtherActionByTrustDate: "",
    furtherActionByTrustActionBy: "",
    lessonsLearned: "",
    finalReviewAndOutcome: "",

    // Review Questions
    allIssuesSatisfactorilyDealt: false,
    clientFamilySatisfied: false,
    allRecommendationsImplemented: "",
    caseReadyForClosure: false,
    caseNotReadyReason: "",

    // Signatures
    keyWorkerNameDesignation: "",
    dateClosed: undefined as Date | undefined,
    lineManagerNameDesignation: "",
    dateApproved: undefined as Date | undefined,
  });

  // Auto-populate form data from incident when dialog opens
  React.useEffect(() => {
    if (open && incident && resident) {
      setFormData({
        // Administrative
        datixRef: "",

        // Section 1 & 2 - A: Where and when (auto-populated from incident)
        incidentDate: incident.date ? new Date(incident.date) : undefined,
        incidentTime: incident.time || "",
        primaryLocation: incident.homeName || "",
        exactLocation: incident.unit || "",

        // B: Circumstances (auto-populated from incident)
        incidentDescription: incident.detailedDescription || "",
        contributoryFactors: incident.typeOtherDetails || "",
        propertyEquipmentMedication: "",
        causedByBehaviorsOfConcern: false,
        documentedInCarePlan: false,
        apparentCauseOfInjury: incident.incidentTypes?.join(", ") || "",

        // C: Actions (auto-populated from incident)
        remedialActionTaken: incident.treatmentDetails || "",
        actionsTakenToPreventRecurrence: incident.preventionMeasures || "",
        riskAssessmentUpdateDate: undefined,

        // D: Equipment or Property
        equipmentInvolved: false,
        equipmentDetails: "",
        reportedToNIAC: false,
        propertyInvolved: false,
        propertyDetails: "",

        // E: Persons notified (auto-populated from incident)
        personsNotified: [
          incident.homeManagerInformedBy ? `Manager: ${incident.homeManagerInformedBy}` : "",
          incident.nokInformedWho ? `NOK: ${incident.nokInformedWho}` : "",
        ].filter(Boolean).join(", ") || "",

        // F: Individual involved (auto-populated from resident + incident)
        hcNumber: resident.nhsHealthNumber || incident.healthCareNumber || "",
        gender: resident.gender || "",
        dateOfBirth: resident.dateOfBirth ? new Date(resident.dateOfBirth) :
                     (incident.injuredPersonDOB ? new Date(incident.injuredPersonDOB) : undefined),
        serviceUserFullName: `${resident.firstName || ""} ${resident.lastName || ""}`.trim() ||
                             `${incident.injuredPersonFirstName || ""} ${incident.injuredPersonSurname || ""}`.trim(),
        serviceUserAddress: resident.gpAddress || "",
        trustKeyWorkerName: resident.keyWorker?.name || "",
        trustKeyWorkerDesignation: resident.keyWorker?.role || "",

        // G: Injury details (auto-populated from incident)
        personSufferedInjury: !!incident.injuryDescription,
        partOfBodyAffected: incident.bodyPartInjured || "",
        natureOfInjury: incident.injuryDescription || "",

        // H: Attention received (auto-populated from incident)
        attentionReceived: incident.treatmentTypes || [],
        attentionReceivedOther: "",

        // Section 3 - A: Staff/Service Users involved (auto-populated from incident)
        staffMembersInvolved: incident.completedByFullName || "",
        otherServiceUsersInvolved: "",

        // B: Witnesses (auto-populated from incident)
        witnessDetails: [incident.witness1Name, incident.witness2Name]
          .filter(Boolean)
          .join(", ") || "",

        // Section 4 - Provider Information (auto-populated from incident)
        providerName: incident.homeName || "",
        providerAddress: "",
        groupName: "",
        serviceName: "",
        typeOfService: "",

        // Section 5 - Medication
        medicationNames: "",
        pharmacyDetails: "",

        // Section 6 - Identification and Contact (auto-populated from incident)
        identifiedBy: "",
        identifierName: incident.completedByFullName || "",
        identifierJobTitle: incident.completedByJobTitle || "",
        identifierTelephone: "",
        identifierEmail: "",
        trustStaffName: resident.careManagerName || "",
        trustStaffJobTitle: "",
        trustStaffTelephone: "",
        trustStaffEmail: resident.careManager?.email || "",
        returnEmail: "",

        // Section 7 - Trust Key Worker Completion (leave empty for user)
        outcomeComments: incident.furtherActionsAdvised || "",
        reviewOutcome: "",
        furtherActionByProvider: "",
        furtherActionByProviderDate: "",
        furtherActionByProviderActionBy: "",
        furtherActionByTrust: "",
        furtherActionByTrustDate: "",
        furtherActionByTrustActionBy: "",
        lessonsLearned: "",
        finalReviewAndOutcome: "",

        // Review Questions (leave empty for user)
        allIssuesSatisfactorilyDealt: false,
        clientFamilySatisfied: false,
        allRecommendationsImplemented: "",
        caseReadyForClosure: false,
        caseNotReadyReason: "",

        // Signatures (leave empty for user)
        keyWorkerNameDesignation: "",
        dateClosed: undefined,
        lineManagerNameDesignation: "",
        dateApproved: undefined,
      });
    }
  }, [open, incident, resident]);

  const totalSteps = 15;

  const handleNext = () => {
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
      case 1: // Administrative + Where and When
        if (!formData.incidentDate) {
          toast.error("Please enter the incident date");
          return false;
        }
        if (!formData.incidentTime.trim()) {
          toast.error("Please enter the incident time");
          return false;
        }
        if (!formData.primaryLocation.trim()) {
          toast.error("Please enter the primary location");
          return false;
        }
        return true;

      case 2: // Incident Description
        if (!formData.incidentDescription.trim()) {
          toast.error("Please enter incident description");
          return false;
        }
        return true;

      case 3: // Circumstances & Cause
        return true; // Optional fields

      case 4: // Actions
        return true; // Optional fields

      case 5: // Equipment or Property
        return true; // Optional fields

      case 6: // Persons Notified
        return true; // Optional fields

      case 7: // Individual Involved
        if (!formData.serviceUserFullName.trim()) {
          toast.error("Please enter service user full name");
          return false;
        }
        if (!formData.dateOfBirth) {
          toast.error("Please enter date of birth");
          return false;
        }
        if (!formData.gender) {
          toast.error("Please select gender");
          return false;
        }
        return true;

      case 8: // Injury Details
        return true; // Optional based on injury checkbox

      case 9: // Attention Received
        return true; // Optional

      case 10: // Staff/Service Users & Witnesses
        return true; // Optional

      case 11: // Provider Information
        if (!formData.providerName.trim()) {
          toast.error("Please enter provider name");
          return false;
        }
        return true;

      case 12: // Medication
        return true; // Optional

      case 13: // Identification
        if (!formData.identifiedBy) {
          toast.error("Please specify who identified the incident");
          return false;
        }
        return true;

      case 14: // Trust Key Worker Review
        return true; // Optional

      case 15: // Final Review & Signatures
        return true; // Optional

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
      await createSEHSCTReport({
        incidentId: incident._id,
        residentId: resident._id,
        organizationId: resident.organizationId,
        teamId: resident.teamId,

        // Administrative
        datixRef: formData.datixRef.trim() || undefined,

        // Section 1 & 2
        incidentDate: formData.incidentDate ? format(formData.incidentDate, "yyyy-MM-dd") : "",
        incidentTime: formData.incidentTime.trim(),
        primaryLocation: formData.primaryLocation.trim(),
        exactLocation: formData.exactLocation.trim() || undefined,
        incidentDescription: formData.incidentDescription.trim(),
        contributoryFactors: formData.contributoryFactors.trim() || undefined,
        propertyEquipmentMedication: formData.propertyEquipmentMedication.trim() || undefined,
        causedByBehaviorsOfConcern: formData.causedByBehaviorsOfConcern,
        documentedInCarePlan: formData.documentedInCarePlan,
        apparentCauseOfInjury: formData.apparentCauseOfInjury.trim() || undefined,
        remedialActionTaken: formData.remedialActionTaken.trim() || undefined,
        actionsTakenToPreventRecurrence: formData.actionsTakenToPreventRecurrence.trim() || undefined,
        riskAssessmentUpdateDate: formData.riskAssessmentUpdateDate ? format(formData.riskAssessmentUpdateDate, "yyyy-MM-dd") : undefined,
        equipmentInvolved: formData.equipmentInvolved,
        equipmentDetails: formData.equipmentDetails.trim() || undefined,
        reportedToNIAC: formData.reportedToNIAC,
        propertyInvolved: formData.propertyInvolved,
        propertyDetails: formData.propertyDetails.trim() || undefined,
        personsNotified: formData.personsNotified.trim() || undefined,

        // Individual involved
        hcNumber: formData.hcNumber.trim() || undefined,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? format(formData.dateOfBirth, "yyyy-MM-dd") : "",
        serviceUserFullName: formData.serviceUserFullName.trim(),
        serviceUserAddress: formData.serviceUserAddress.trim() || undefined,
        trustKeyWorkerName: formData.trustKeyWorkerName.trim() || undefined,
        trustKeyWorkerDesignation: formData.trustKeyWorkerDesignation.trim() || undefined,

        // Injury details
        personSufferedInjury: formData.personSufferedInjury,
        partOfBodyAffected: formData.partOfBodyAffected.trim() || undefined,
        natureOfInjury: formData.natureOfInjury.trim() || undefined,
        attentionReceived: formData.attentionReceived,
        attentionReceivedOther: formData.attentionReceivedOther.trim() || undefined,

        // Section 3
        staffMembersInvolved: formData.staffMembersInvolved.trim() || undefined,
        otherServiceUsersInvolved: formData.otherServiceUsersInvolved.trim() || undefined,
        witnessDetails: formData.witnessDetails.trim() || undefined,

        // Section 4
        providerName: formData.providerName.trim(),
        providerAddress: formData.providerAddress.trim() || undefined,
        groupName: formData.groupName.trim() || undefined,
        serviceName: formData.serviceName.trim() || undefined,
        typeOfService: formData.typeOfService.trim() || undefined,

        // Section 5
        medicationNames: formData.medicationNames.trim() || undefined,
        pharmacyDetails: formData.pharmacyDetails.trim() || undefined,

        // Section 6
        identifiedBy: formData.identifiedBy,
        identifierName: formData.identifierName.trim() || undefined,
        identifierJobTitle: formData.identifierJobTitle.trim() || undefined,
        identifierTelephone: formData.identifierTelephone.trim() || undefined,
        identifierEmail: formData.identifierEmail.trim() || undefined,
        trustStaffName: formData.trustStaffName.trim() || undefined,
        trustStaffJobTitle: formData.trustStaffJobTitle.trim() || undefined,
        trustStaffTelephone: formData.trustStaffTelephone.trim() || undefined,
        trustStaffEmail: formData.trustStaffEmail.trim() || undefined,
        returnEmail: formData.returnEmail.trim() || undefined,

        // Section 7
        outcomeComments: formData.outcomeComments.trim() || undefined,
        reviewOutcome: formData.reviewOutcome || undefined,
        furtherActionByProvider: formData.furtherActionByProvider.trim() || undefined,
        furtherActionByProviderDate: formData.furtherActionByProviderDate.trim() || undefined,
        furtherActionByProviderActionBy: formData.furtherActionByProviderActionBy.trim() || undefined,
        furtherActionByTrust: formData.furtherActionByTrust.trim() || undefined,
        furtherActionByTrustDate: formData.furtherActionByTrustDate.trim() || undefined,
        furtherActionByTrustActionBy: formData.furtherActionByTrustActionBy.trim() || undefined,
        lessonsLearned: formData.lessonsLearned.trim() || undefined,
        finalReviewAndOutcome: formData.finalReviewAndOutcome.trim() || undefined,
        allIssuesSatisfactorilyDealt: formData.allIssuesSatisfactorilyDealt,
        clientFamilySatisfied: formData.clientFamilySatisfied,
        allRecommendationsImplemented: formData.allRecommendationsImplemented || undefined,
        caseReadyForClosure: formData.caseReadyForClosure,
        caseNotReadyReason: formData.caseNotReadyReason.trim() || undefined,
        keyWorkerNameDesignation: formData.keyWorkerNameDesignation.trim() || undefined,
        dateClosed: formData.dateClosed ? format(formData.dateClosed, "yyyy-MM-dd") : undefined,
        lineManagerNameDesignation: formData.lineManagerNameDesignation.trim() || undefined,
        dateApproved: formData.dateApproved ? format(formData.dateApproved, "yyyy-MM-dd") : undefined,

        // Status
        status: "submitted",

        // System fields
        reportedBy: user.user.email,
        reportedByName: user.user.name || user.user.email,
      });

      toast.success("SEHSCT report submitted successfully");
      onClose();
      setCurrentStep(1);
      // Reset form to initial state
      setFormData({
        datixRef: "",
        incidentDate: undefined,
        incidentTime: "",
        primaryLocation: "",
        exactLocation: "",
        incidentDescription: "",
        contributoryFactors: "",
        propertyEquipmentMedication: "",
        causedByBehaviorsOfConcern: false,
        documentedInCarePlan: false,
        apparentCauseOfInjury: "",
        remedialActionTaken: "",
        actionsTakenToPreventRecurrence: "",
        riskAssessmentUpdateDate: undefined,
        equipmentInvolved: false,
        equipmentDetails: "",
        reportedToNIAC: false,
        propertyInvolved: false,
        propertyDetails: "",
        personsNotified: "",
        hcNumber: "",
        gender: "",
        dateOfBirth: undefined,
        serviceUserFullName: "",
        serviceUserAddress: "",
        trustKeyWorkerName: "",
        trustKeyWorkerDesignation: "",
        personSufferedInjury: false,
        partOfBodyAffected: "",
        natureOfInjury: "",
        attentionReceived: [],
        attentionReceivedOther: "",
        staffMembersInvolved: "",
        otherServiceUsersInvolved: "",
        witnessDetails: "",
        providerName: "",
        providerAddress: "",
        groupName: "",
        serviceName: "",
        typeOfService: "",
        medicationNames: "",
        pharmacyDetails: "",
        identifiedBy: "",
        identifierName: "",
        identifierJobTitle: "",
        identifierTelephone: "",
        identifierEmail: "",
        trustStaffName: "",
        trustStaffJobTitle: "",
        trustStaffTelephone: "",
        trustStaffEmail: "",
        returnEmail: "",
        outcomeComments: "",
        reviewOutcome: "",
        furtherActionByProvider: "",
        furtherActionByProviderDate: "",
        furtherActionByProviderActionBy: "",
        furtherActionByTrust: "",
        furtherActionByTrustDate: "",
        furtherActionByTrustActionBy: "",
        lessonsLearned: "",
        finalReviewAndOutcome: "",
        allIssuesSatisfactorilyDealt: false,
        clientFamilySatisfied: false,
        allRecommendationsImplemented: "",
        caseReadyForClosure: false,
        caseNotReadyReason: "",
        keyWorkerNameDesignation: "",
        dateClosed: undefined,
        lineManagerNameDesignation: "",
        dateApproved: undefined,
      });
    } catch (error) {
      console.error("Error submitting SEHSCT report:", error);
      toast.error("Failed to submit SEHSCT report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAttentionReceived = (value: string) => {
    setFormData(prev => ({
      ...prev,
      attentionReceived: prev.attentionReceived.includes(value)
        ? prev.attentionReceived.filter(v => v !== value)
        : [...prev.attentionReceived, value]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            SEHSCT Incident Report Form - Step {currentStep} of {totalSteps}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6 px-1">
          {/* Step 1: Administrative + Where and When */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <h3 className="font-semibold text-lg text-blue-700 mb-2">Administrative - For Office Use Only</h3>
                <div>
                  <Label htmlFor="datixRef" className="mb-2 block">DATIX Ref:</Label>
                  <Input
                    id="datixRef"
                    value={formData.datixRef}
                    onChange={(e) => setFormData({ ...formData, datixRef: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                A – Where and when did the incident occur?
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="incidentDate" className="mb-2 block">Date of Incident <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="incidentTime" className="mb-2 block">Time of Incident <span className="text-red-500">*</span></Label>
                  <Input
                    id="incidentTime"
                    type="time"
                    value={formData.incidentTime}
                    onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="primaryLocation" className="mb-2 block">
                  Primary Location <span className="text-red-500">*</span>
                  <span className="text-sm text-gray-500 font-normal ml-2">(e.g. service user&apos;s home, including address & postcode)</span>
                </Label>
                <Textarea
                  id="primaryLocation"
                  value={formData.primaryLocation}
                  onChange={(e) => setFormData({ ...formData, primaryLocation: e.target.value })}
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="exactLocation" className="mb-2 block">Exact Location</Label>
                <Input
                  id="exactLocation"
                  value={formData.exactLocation}
                  onChange={(e) => setFormData({ ...formData, exactLocation: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="e.g., bedroom, bathroom, garden"
                />
              </div>
            </div>
          )}

          {/* Step 2: Incident Description */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                B – Description of what happened
              </h3>

              <div>
                <Label htmlFor="incidentDescription" className="mb-2 block">
                  Brief, factual description of incident <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="incidentDescription"
                  value={formData.incidentDescription}
                  onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })}
                  rows={8}
                  disabled={isSubmitting}
                  placeholder="Provide a detailed description of what happened..."
                />
              </div>
            </div>
          )}

          {/* Step 3: Contributory Factors & Circumstances */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                B – Contributory Factors & Circumstances
              </h3>

              <div>
                <Label htmlFor="contributoryFactors" className="mb-2 block">Were there contributory factors?</Label>
                <Textarea
                  id="contributoryFactors"
                  value={formData.contributoryFactors}
                  onChange={(e) => setFormData({ ...formData, contributoryFactors: e.target.value })}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="propertyEquipmentMedication" className="mb-2 block">Details of property/equipment/medication involved</Label>
                <Textarea
                  id="propertyEquipmentMedication"
                  value={formData.propertyEquipmentMedication}
                  onChange={(e) => setFormData({ ...formData, propertyEquipmentMedication: e.target.value })}
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="causedByBehaviors"
                    checked={formData.causedByBehaviorsOfConcern}
                    onCheckedChange={(checked) => setFormData({ ...formData, causedByBehaviorsOfConcern: checked as boolean })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="causedByBehaviors" className="cursor-pointer">
                    Was the incident caused as a result of behaviours of concern related to a specific illness or diagnosis?
                  </Label>
                </div>

                {formData.causedByBehaviorsOfConcern && (
                  <div className="flex items-start space-x-3 ml-6">
                    <Checkbox
                      id="documentedInCarePlan"
                      checked={formData.documentedInCarePlan}
                      onCheckedChange={(checked) => setFormData({ ...formData, documentedInCarePlan: checked as boolean })}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="documentedInCarePlan" className="cursor-pointer">
                      If yes, is this documented in their Care Plan?
                    </Label>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="apparentCauseOfInjury" className="mb-2 block">
                  Apparent cause of injury
                  <span className="text-sm text-gray-500 font-normal ml-2">(e.g. slip, trip, fall, physical assault)</span>
                </Label>
                <Input
                  id="apparentCauseOfInjury"
                  value={formData.apparentCauseOfInjury}
                  onChange={(e) => setFormData({ ...formData, apparentCauseOfInjury: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* Step 4: Actions Taken */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                C – Actions
              </h3>

              <div>
                <Label htmlFor="remedialActionTaken" className="mb-2 block">(i) Remedial or other action taken following the incident</Label>
                <Textarea
                  id="remedialActionTaken"
                  value={formData.remedialActionTaken}
                  onChange={(e) => setFormData({ ...formData, remedialActionTaken: e.target.value })}
                  rows={4}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="actionsTakenToPreventRecurrence" className="mb-2 block">(ii) Actions taken to prevent recurrence</Label>
                <Textarea
                  id="actionsTakenToPreventRecurrence"
                  value={formData.actionsTakenToPreventRecurrence}
                  onChange={(e) => setFormData({ ...formData, actionsTakenToPreventRecurrence: e.target.value })}
                  rows={4}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="riskAssessmentUpdateDate" className="mb-2 block">(iii) Date service user&apos;s Risk Assessment / Care Plan updated</Label>
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
            </div>
          )}

          {/* Step 5: Equipment or Property */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                D – Equipment or Property
              </h3>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="equipmentInvolved"
                    checked={formData.equipmentInvolved}
                    onCheckedChange={(checked) => setFormData({ ...formData, equipmentInvolved: checked as boolean })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="equipmentInvolved" className="cursor-pointer">
                    (i) Was any equipment involved?
                  </Label>
                </div>

                {formData.equipmentInvolved && (
                  <>
                    <div className="ml-6">
                      <Label htmlFor="equipmentDetails" className="mb-2 block">Specify equipment details</Label>
                      <Textarea
                        id="equipmentDetails"
                        value={formData.equipmentDetails}
                        onChange={(e) => setFormData({ ...formData, equipmentDetails: e.target.value })}
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex items-start space-x-3 ml-6">
                      <Checkbox
                        id="reportedToNIAC"
                        checked={formData.reportedToNIAC}
                        onCheckedChange={(checked) => setFormData({ ...formData, reportedToNIAC: checked as boolean })}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="reportedToNIAC" className="cursor-pointer">
                        Reported to NI Adverse Incident Centre (NIAC)?
                      </Label>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="propertyInvolved"
                    checked={formData.propertyInvolved}
                    onCheckedChange={(checked) => setFormData({ ...formData, propertyInvolved: checked as boolean })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="propertyInvolved" className="cursor-pointer">
                    (ii) Was any property involved (home/personal possessions)?
                  </Label>
                </div>

                {formData.propertyInvolved && (
                  <div className="ml-6">
                    <Label htmlFor="propertyDetails" className="mb-2 block">Specify property details</Label>
                    <Textarea
                      id="propertyDetails"
                      value={formData.propertyDetails}
                      onChange={(e) => setFormData({ ...formData, propertyDetails: e.target.value })}
                      rows={3}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Persons Notified */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                E – Persons notified
              </h3>

              <div>
                <Label htmlFor="personsNotified" className="mb-2 block">Names and designations / relationship to service user</Label>
                <Textarea
                  id="personsNotified"
                  value={formData.personsNotified}
                  onChange={(e) => setFormData({ ...formData, personsNotified: e.target.value })}
                  rows={6}
                  disabled={isSubmitting}
                  placeholder="Include names, titles/designations, and their relationship to the service user"
                />
              </div>
            </div>
          )}

          {/* Step 7: Individual Involved */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                F – Individual involved or affected
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serviceUserFullName" className="mb-2 block">Full Name of Service User <span className="text-red-500">*</span></Label>
                  <Input
                    id="serviceUserFullName"
                    value={formData.serviceUserFullName}
                    onChange={(e) => setFormData({ ...formData, serviceUserFullName: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="Not initials"
                  />
                </div>

                <div>
                  <Label htmlFor="hcNumber" className="mb-2 block">H&C Number (Mandatory)</Label>
                  <Input
                    id="hcNumber"
                    value={formData.hcNumber}
                    onChange={(e) => setFormData({ ...formData, hcNumber: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="dateOfBirth" className="mb-2 block">Date of Birth <span className="text-red-500">*</span></Label>
                  <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen} modal>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !formData.dateOfBirth && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        {formData.dateOfBirth ? (
                          format(formData.dateOfBirth, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dateOfBirth}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          setFormData({ ...formData, dateOfBirth: date });
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
                  <Label htmlFor="gender" className="mb-2 block">Gender <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="serviceUserAddress" className="mb-2 block">Service User Address (if different from provider address)</Label>
                <Textarea
                  id="serviceUserAddress"
                  value={formData.serviceUserAddress}
                  onChange={(e) => setFormData({ ...formData, serviceUserAddress: e.target.value })}
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trustKeyWorkerName" className="mb-2 block">Name of Trust Key Worker</Label>
                  <Input
                    id="trustKeyWorkerName"
                    value={formData.trustKeyWorkerName}
                    onChange={(e) => setFormData({ ...formData, trustKeyWorkerName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="trustKeyWorkerDesignation" className="mb-2 block">Designation</Label>
                  <Input
                    id="trustKeyWorkerDesignation"
                    value={formData.trustKeyWorkerDesignation}
                    onChange={(e) => setFormData({ ...formData, trustKeyWorkerDesignation: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Injury Details */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                G – Injury details
              </h3>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="personSufferedInjury"
                  checked={formData.personSufferedInjury}
                  onCheckedChange={(checked) => setFormData({ ...formData, personSufferedInjury: checked as boolean })}
                  disabled={isSubmitting}
                />
                <Label htmlFor="personSufferedInjury" className="cursor-pointer">
                  Did the person suffer an injury?
                </Label>
              </div>

              {formData.personSufferedInjury && (
                <>
                  <div>
                    <Label htmlFor="partOfBodyAffected" className="mb-2 block">Part of body affected</Label>
                    <Input
                      id="partOfBodyAffected"
                      value={formData.partOfBodyAffected}
                      onChange={(e) => setFormData({ ...formData, partOfBodyAffected: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="natureOfInjury" className="mb-2 block">Nature of injury sustained</Label>
                    <Textarea
                      id="natureOfInjury"
                      value={formData.natureOfInjury}
                      onChange={(e) => setFormData({ ...formData, natureOfInjury: e.target.value })}
                      rows={4}
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 9: Attention Received */}
          {currentStep === 9 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                H – Attention received
              </h3>

              <div className="space-y-3">
                {['None', 'First aid', 'A&E', 'Seen by GP', 'Yes'].map((option) => (
                  <div key={option} className="flex items-start space-x-3">
                    <Checkbox
                      id={`attention-${option}`}
                      checked={formData.attentionReceived.includes(option)}
                      onCheckedChange={() => toggleAttentionReceived(option)}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor={`attention-${option}`} className="cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="attention-other"
                    checked={formData.attentionReceived.includes('Other')}
                    onCheckedChange={() => toggleAttentionReceived('Other')}
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <Label htmlFor="attention-other" className="cursor-pointer mb-2 block">
                      Other (specify)
                    </Label>
                    {formData.attentionReceived.includes('Other') && (
                      <Input
                        id="attentionReceivedOther"
                        value={formData.attentionReceivedOther}
                        onChange={(e) => setFormData({ ...formData, attentionReceivedOther: e.target.value })}
                        disabled={isSubmitting}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 10: Staff/Service Users & Witnesses */}
          {currentStep === 10 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                SECTION 3 – Staff / Service Users involved & Witnesses
              </h3>

              <div>
                <Label className="mb-2 block font-medium">A – Staff / Service Users involved</Label>

                <div className="space-y-4 mt-3">
                  <div>
                    <Label htmlFor="staffMembersInvolved" className="mb-2 block">Name and designation of any staff members</Label>
                    <Textarea
                      id="staffMembersInvolved"
                      value={formData.staffMembersInvolved}
                      onChange={(e) => setFormData({ ...formData, staffMembersInvolved: e.target.value })}
                      rows={3}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="otherServiceUsersInvolved" className="mb-2 block">Other Service Users involved (include DOB)</Label>
                    <Textarea
                      id="otherServiceUsersInvolved"
                      value={formData.otherServiceUsersInvolved}
                      onChange={(e) => setFormData({ ...formData, otherServiceUsersInvolved: e.target.value })}
                      rows={3}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Label className="mb-2 block font-medium">B – Witnesses</Label>

                <div className="mt-3">
                  <Label htmlFor="witnessDetails" className="mb-2 block">Name, designation, and contact details of any witnesses</Label>
                  <Textarea
                    id="witnessDetails"
                    value={formData.witnessDetails}
                    onChange={(e) => setFormData({ ...formData, witnessDetails: e.target.value })}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 11: Provider Information */}
          {currentStep === 11 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                SECTION 4 – Provider Information
              </h3>

              <div>
                <Label htmlFor="providerName" className="mb-2 block">Provider Name <span className="text-red-500">*</span></Label>
                <Input
                  id="providerName"
                  value={formData.providerName}
                  onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="providerAddress" className="mb-2 block">Provider Address</Label>
                <Textarea
                  id="providerAddress"
                  value={formData.providerAddress}
                  onChange={(e) => setFormData({ ...formData, providerAddress: e.target.value })}
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="groupName" className="mb-2 block">Group Name (if applicable)</Label>
                  <Input
                    id="groupName"
                    value={formData.groupName}
                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="serviceName" className="mb-2 block">Service Name</Label>
                  <Input
                    id="serviceName"
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="typeOfService" className="mb-2 block">
                  Type of Service
                  <span className="text-sm text-gray-500 font-normal ml-2">(e.g. Day Care, Supported Living, etc.)</span>
                </Label>
                <Input
                  id="typeOfService"
                  value={formData.typeOfService}
                  onChange={(e) => setFormData({ ...formData, typeOfService: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* Step 12: Medication */}
          {currentStep === 12 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                SECTION 5 – Medication
              </h3>

              <p className="text-sm text-gray-600">Complete this section if medication was involved in the incident</p>

              <div>
                <Label htmlFor="medicationNames" className="mb-2 block">Name(s) and dose/quantity of each medication</Label>
                <Textarea
                  id="medicationNames"
                  value={formData.medicationNames}
                  onChange={(e) => setFormData({ ...formData, medicationNames: e.target.value })}
                  rows={4}
                  disabled={isSubmitting}
                  placeholder="List medication names, doses, and quantities"
                />
              </div>

              <div>
                <Label htmlFor="pharmacyDetails" className="mb-2 block">Pharmacy details (if Pharmacy-related incident)</Label>
                <Textarea
                  id="pharmacyDetails"
                  value={formData.pharmacyDetails}
                  onChange={(e) => setFormData({ ...formData, pharmacyDetails: e.target.value })}
                  rows={3}
                  disabled={isSubmitting}
                  placeholder="Pharmacy name, address, contact details"
                />
              </div>
            </div>
          )}

          {/* Step 13: Identification and Contact */}
          {currentStep === 13 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                SECTION 6 – Identification and Contact
              </h3>

              <div>
                <Label className="mb-2 block font-medium">A – Who identified the incident? <span className="text-red-500">*</span></Label>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="identifiedByProvider"
                      name="identifiedBy"
                      value="Provider"
                      checked={formData.identifiedBy === "Provider"}
                      onChange={(e) => setFormData({ ...formData, identifiedBy: e.target.value })}
                      disabled={isSubmitting}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="identifiedByProvider" className="cursor-pointer">
                      Identified by Provider
                    </Label>
                  </div>

                  {formData.identifiedBy === "Provider" && (
                    <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="identifierName" className="mb-2 block">Name</Label>
                        <Input
                          id="identifierName"
                          value={formData.identifierName}
                          onChange={(e) => setFormData({ ...formData, identifierName: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="identifierJobTitle" className="mb-2 block">Job Title</Label>
                        <Input
                          id="identifierJobTitle"
                          value={formData.identifierJobTitle}
                          onChange={(e) => setFormData({ ...formData, identifierJobTitle: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="identifierTelephone" className="mb-2 block">Telephone Number</Label>
                        <Input
                          id="identifierTelephone"
                          value={formData.identifierTelephone}
                          onChange={(e) => setFormData({ ...formData, identifierTelephone: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="identifierEmail" className="mb-2 block">Email</Label>
                        <Input
                          id="identifierEmail"
                          type="email"
                          value={formData.identifierEmail}
                          onChange={(e) => setFormData({ ...formData, identifierEmail: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="identifiedByTrust"
                      name="identifiedBy"
                      value="Trust"
                      checked={formData.identifiedBy === "Trust"}
                      onChange={(e) => setFormData({ ...formData, identifiedBy: e.target.value })}
                      disabled={isSubmitting}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="identifiedByTrust" className="cursor-pointer">
                      Identified by Trust
                    </Label>
                  </div>

                  {formData.identifiedBy === "Trust" && (
                    <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="trustStaffName" className="mb-2 block">Trust Staff Name</Label>
                        <Input
                          id="trustStaffName"
                          value={formData.trustStaffName}
                          onChange={(e) => setFormData({ ...formData, trustStaffName: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="trustStaffJobTitle" className="mb-2 block">Job Title</Label>
                        <Input
                          id="trustStaffJobTitle"
                          value={formData.trustStaffJobTitle}
                          onChange={(e) => setFormData({ ...formData, trustStaffJobTitle: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="trustStaffTelephone" className="mb-2 block">Telephone Number</Label>
                        <Input
                          id="trustStaffTelephone"
                          value={formData.trustStaffTelephone}
                          onChange={(e) => setFormData({ ...formData, trustStaffTelephone: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="trustStaffEmail" className="mb-2 block">Email</Label>
                        <Input
                          id="trustStaffEmail"
                          type="email"
                          value={formData.trustStaffEmail}
                          onChange={(e) => setFormData({ ...formData, trustStaffEmail: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <Label className="mb-2 block font-medium">B – Return email for encrypted form</Label>
                <div>
                  <Label htmlFor="returnEmail" className="mb-2 block">Email address for returning encrypted form after Trust sign-off</Label>
                  <Input
                    id="returnEmail"
                    type="email"
                    value={formData.returnEmail}
                    onChange={(e) => setFormData({ ...formData, returnEmail: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 14: Trust Key Worker Review */}
          {currentStep === 14 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                SECTION 7 – Trust Key Worker Completion
              </h3>

              <p className="text-sm text-gray-600">This section is typically completed by Trust staff during review</p>

              <div>
                <Label htmlFor="outcomeComments" className="mb-2 block">Outcome / Comments</Label>
                <Textarea
                  id="outcomeComments"
                  value={formData.outcomeComments}
                  onChange={(e) => setFormData({ ...formData, outcomeComments: e.target.value })}
                  rows={4}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label className="mb-2 block">I have reviewed the Provider&apos;s incident investigation and agree:</Label>
                <div className="space-y-3 ml-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="reviewOutcome1"
                      name="reviewOutcome"
                      value="noFurtherAction"
                      checked={formData.reviewOutcome === "noFurtherAction"}
                      onChange={(e) => setFormData({ ...formData, reviewOutcome: e.target.value })}
                      disabled={isSubmitting}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="reviewOutcome1" className="cursor-pointer">
                      No further action by Trust (rationale)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="reviewOutcome2"
                      name="reviewOutcome"
                      value="furtherActionByProvider"
                      checked={formData.reviewOutcome === "furtherActionByProvider"}
                      onChange={(e) => setFormData({ ...formData, reviewOutcome: e.target.value })}
                      disabled={isSubmitting}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="reviewOutcome2" className="cursor-pointer">
                      Further action required by Provider
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="reviewOutcome3"
                      name="reviewOutcome"
                      value="furtherActionByTrust"
                      checked={formData.reviewOutcome === "furtherActionByTrust"}
                      onChange={(e) => setFormData({ ...formData, reviewOutcome: e.target.value })}
                      disabled={isSubmitting}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="reviewOutcome3" className="cursor-pointer">
                      Further action/follow-up by Trust
                    </Label>
                  </div>
                </div>
              </div>

              {formData.reviewOutcome === "furtherActionByProvider" && (
                <div className="ml-4 space-y-3">
                  <div>
                    <Label htmlFor="furtherActionByProvider" className="mb-2 block">Details</Label>
                    <Textarea
                      id="furtherActionByProvider"
                      value={formData.furtherActionByProvider}
                      onChange={(e) => setFormData({ ...formData, furtherActionByProvider: e.target.value })}
                      rows={2}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="furtherActionByProviderDate" className="mb-2 block">Date</Label>
                      <Input
                        id="furtherActionByProviderDate"
                        value={formData.furtherActionByProviderDate}
                        onChange={(e) => setFormData({ ...formData, furtherActionByProviderDate: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="furtherActionByProviderActionBy" className="mb-2 block">Action By</Label>
                      <Input
                        id="furtherActionByProviderActionBy"
                        value={formData.furtherActionByProviderActionBy}
                        onChange={(e) => setFormData({ ...formData, furtherActionByProviderActionBy: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.reviewOutcome === "furtherActionByTrust" && (
                <div className="ml-4 space-y-3">
                  <div>
                    <Label htmlFor="furtherActionByTrust" className="mb-2 block">Details</Label>
                    <Textarea
                      id="furtherActionByTrust"
                      value={formData.furtherActionByTrust}
                      onChange={(e) => setFormData({ ...formData, furtherActionByTrust: e.target.value })}
                      rows={2}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="furtherActionByTrustDate" className="mb-2 block">Date</Label>
                      <Input
                        id="furtherActionByTrustDate"
                        value={formData.furtherActionByTrustDate}
                        onChange={(e) => setFormData({ ...formData, furtherActionByTrustDate: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="furtherActionByTrustActionBy" className="mb-2 block">Action By</Label>
                      <Input
                        id="furtherActionByTrustActionBy"
                        value={formData.furtherActionByTrustActionBy}
                        onChange={(e) => setFormData({ ...formData, furtherActionByTrustActionBy: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="lessonsLearned" className="mb-2 block">Lessons Learned (details)</Label>
                <Textarea
                  id="lessonsLearned"
                  value={formData.lessonsLearned}
                  onChange={(e) => setFormData({ ...formData, lessonsLearned: e.target.value })}
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="finalReviewAndOutcome" className="mb-2 block">Final Review and Outcome (details)</Label>
                <Textarea
                  id="finalReviewAndOutcome"
                  value={formData.finalReviewAndOutcome}
                  onChange={(e) => setFormData({ ...formData, finalReviewAndOutcome: e.target.value })}
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* Step 15: Review Questions & Signatures */}
          {currentStep === 15 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">
                Review Questions & Signatures
              </h3>

              <div>
                <Label className="mb-3 block font-semibold">Review Questions</Label>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="allIssuesSatisfactorilyDealt"
                      checked={formData.allIssuesSatisfactorilyDealt}
                      onCheckedChange={(checked) => setFormData({ ...formData, allIssuesSatisfactorilyDealt: checked as boolean })}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="allIssuesSatisfactorilyDealt" className="cursor-pointer">
                      Are all issues satisfactorily dealt with?
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="clientFamilySatisfied"
                      checked={formData.clientFamilySatisfied}
                      onCheckedChange={(checked) => setFormData({ ...formData, clientFamilySatisfied: checked as boolean })}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="clientFamilySatisfied" className="cursor-pointer">
                      Is client/family satisfied with outcome?
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="allRecommendationsImplemented" className="mb-2 block">All recommendations implemented?</Label>
                    <Select
                      value={formData.allRecommendationsImplemented}
                      onValueChange={(value) => setFormData({ ...formData, allRecommendationsImplemented: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="allRecommendationsImplemented">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="N/A">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="caseReadyForClosure"
                      checked={formData.caseReadyForClosure}
                      onCheckedChange={(checked) => setFormData({ ...formData, caseReadyForClosure: checked as boolean })}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="caseReadyForClosure" className="cursor-pointer">
                      Case ready for closure?
                    </Label>
                  </div>

                  {!formData.caseReadyForClosure && (
                    <div className="ml-7">
                      <Label htmlFor="caseNotReadyReason" className="mb-2 block">If no, details:</Label>
                      <Textarea
                        id="caseNotReadyReason"
                        value={formData.caseNotReadyReason}
                        onChange={(e) => setFormData({ ...formData, caseNotReadyReason: e.target.value })}
                        rows={2}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 mt-6">
                <Label className="mb-3 block font-semibold">Signatures</Label>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="keyWorkerNameDesignation" className="mb-2 block">Print Key Worker Name & Designation</Label>
                      <Input
                        id="keyWorkerNameDesignation"
                        value={formData.keyWorkerNameDesignation}
                        onChange={(e) => setFormData({ ...formData, keyWorkerNameDesignation: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <Label htmlFor="dateClosed" className="mb-2 block">Date Closed by Trust</Label>
                      <Popover open={dateClosedPopoverOpen} onOpenChange={setDateClosedPopoverOpen} modal>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !formData.dateClosed && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                          >
                            {formData.dateClosed ? (
                              format(formData.dateClosed, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dateClosed}
                            captionLayout="dropdown"
                            onSelect={(date) => {
                              setFormData({ ...formData, dateClosed: date });
                              setDateClosedPopoverOpen(false);
                            }}
                            disabled={isSubmitting}
                            fromYear={2000}
                            toYear={new Date().getFullYear() + 1}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="font-medium mb-3">Line Manager Approval:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="lineManagerNameDesignation" className="mb-2 block">Print Name & Designation</Label>
                        <Input
                          id="lineManagerNameDesignation"
                          value={formData.lineManagerNameDesignation}
                          onChange={(e) => setFormData({ ...formData, lineManagerNameDesignation: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div>
                        <Label htmlFor="dateApproved" className="mb-2 block">Date Approved</Label>
                        <Popover open={dateApprovedPopoverOpen} onOpenChange={setDateApprovedPopoverOpen} modal>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !formData.dateApproved && "text-muted-foreground"
                              )}
                              disabled={isSubmitting}
                            >
                              {formData.dateApproved ? (
                                format(formData.dateApproved, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.dateApproved}
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                setFormData({ ...formData, dateApproved: date });
                                setDateApprovedPopoverOpen(false);
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
