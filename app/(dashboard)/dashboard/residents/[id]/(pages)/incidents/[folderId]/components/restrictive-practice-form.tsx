"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Check, CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { IncidentTimeSelect } from "@/components/incidents/incident-time-select";
import { cn } from "@/lib/utils";
import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";

interface RestrictivePracticeFormProps {
  folderId: string;
  residentId: string;
  residentName: string;
  residentDOB?: string;
  careManagerName?: string;
  completedByName?: string;
  completedByRole?: string;
  orgLogoUrl?: string;
  careHomeName?: string;
  onSaved?: () => void;
}

export function RestrictivePracticeForm({
  folderId,
  residentId,
  residentName,
  residentDOB,
  careManagerName,
  completedByName,
  completedByRole: prefillCompletedByRole,
  orgLogoUrl,
  careHomeName,
  onSaved,
}: RestrictivePracticeFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [incidentDatePopoverOpen, setIncidentDatePopoverOpen] = React.useState(false);
  const [reviewDatePopoverOpen, setReviewDatePopoverOpen] = React.useState(false);

  const [formData, setFormData] = React.useState({
    serviceUserName: residentName || "",
    serviceUserDOB: residentDOB || "",
    careManager: careManagerName || "",
    incidentDate: undefined as Date | undefined,
    incidentTime: "",
    incidentLocation: "",
    restrictiveTypes: [] as string[],
    otherTypeDetails: "",
    behaviourDescription: "",
    triggerFactors: "",
    deEscalationAttempted: "",
    interventionDetails: "",
    durationMinutes: "",
    staffInvolved: "",
    numberOfStaff: "",
    serviceUserResponse: "",
    injurySustained: false,
    injuryDetails: "",
    medicalAttentionRequired: false,
    medicalDetails: "",
    debrief: "",
    serviceUserViews: "",
    familyNotified: false,
    familyNotifiedDetails: "",
    completedBy: completedByName || "",
    completedByRole: prefillCompletedByRole || "",
    reviewerName: "",
    reviewerRole: "",
    reviewDate: undefined as Date | undefined,
    lessonsLearned: "",
    followUpActions: "",
  });

  const restrictiveTypeOptions = [
    "Physical restraint",
    "Mechanical restraint",
    "Chemical restraint",
    "Seclusion",
    "Environmental restraint",
    "Observation/supervision",
    "Other",
  ];

  const toggleRestrictiveType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      restrictiveTypes: prev.restrictiveTypes.includes(type)
        ? prev.restrictiveTypes.filter((t) => t !== type)
        : [...prev.restrictiveTypes, type],
    }));
  };

  const validate = (): boolean => {
    if (!formData.serviceUserName.trim()) { toast.error("Please enter Service User Name"); return false; }
    if (!formData.incidentDate) { toast.error("Please enter Incident Date"); return false; }
    if (!formData.incidentTime) { toast.error("Please enter Incident Time"); return false; }
    if (formData.restrictiveTypes.length === 0) { toast.error("Please select at least one type of restrictive practice"); return false; }
    if (!formData.behaviourDescription.trim()) { toast.error("Please describe the behaviour"); return false; }
    if (!formData.interventionDetails.trim()) { toast.error("Please describe the intervention"); return false; }
    return true;
  };

  const handleDownloadPdf = async () => {
    try {
      const [firstName, ...rest] = formData.serviceUserName.split(" ");
      const resident = {
        first_name: firstName || formData.serviceUserName,
        last_name: rest.join(" "),
        date_of_birth: formData.serviceUserDOB,
      };

      await generateCareFilePDF({
        formName: "Restrictive Practice Report",
        data: {
          ...formData,
          restrictiveTypes: formData.restrictiveTypes.length
            ? formData.restrictiveTypes.join(", ")
            : undefined,
          incidentDate: formData.incidentDate
            ? format(formData.incidentDate, "yyyy-MM-dd")
            : undefined,
          reviewDate: formData.reviewDate
            ? format(formData.reviewDate, "yyyy-MM-dd")
            : undefined,
        },
        resident,
        orgLogoUrl,
        careHomeName,
      });
    } catch (err) {
      console.error("Error generating Restrictive Practice PDF:", err);
      toast.error("Failed to generate PDF");
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("trust_incident_reports")
        .insert({
          folder_id: folderId,
          resident_id: residentId,
          trust_name: "Restrictive Practice",
          report_type: "restrictive-practice",
          report_data: {
            ...formData,
            incidentDate: formData.incidentDate ? format(formData.incidentDate, "yyyy-MM-dd") : "",
            reviewDate: formData.reviewDate ? format(formData.reviewDate, "yyyy-MM-dd") : undefined,
            status: "submitted",
          },
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Restrictive Practice report submitted successfully");
      onSaved?.();
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b bg-background flex-shrink-0">
        <h2 className="text-lg font-semibold">Restrictive Practice Form</h2>
        <p className="text-sm text-muted-foreground">Restrictive practice documentation</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Service User Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Service User Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serviceUserName" className="mb-2">Service User Name <span className="text-red-500">*</span></Label>
                <Input id="serviceUserName" value={formData.serviceUserName} onChange={(e) => setFormData({ ...formData, serviceUserName: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="serviceUserDOB" className="mb-2">Date of Birth</Label>
                <Input id="serviceUserDOB" value={formData.serviceUserDOB} onChange={(e) => setFormData({ ...formData, serviceUserDOB: e.target.value })} placeholder="DD/MM/YYYY" disabled={isSubmitting} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="careManager" className="mb-2">Care Manager / Key Worker</Label>
                <Input id="careManager" value={formData.careManager} onChange={(e) => setFormData({ ...formData, careManager: e.target.value })} disabled={isSubmitting} />
              </div>
            </div>
          </div>

          {/* Incident Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Incident Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="incidentDate" className="mb-2">Date <span className="text-red-500">*</span></Label>
                <Popover open={incidentDatePopoverOpen} onOpenChange={setIncidentDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className={cn("w-full pl-3 text-left font-normal", !formData.incidentDate && "text-muted-foreground")} disabled={isSubmitting}>
                      {formData.incidentDate ? format(formData.incidentDate, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formData.incidentDate} captionLayout="dropdown" onSelect={(date) => { setFormData({ ...formData, incidentDate: date }); setIncidentDatePopoverOpen(false); }} disabled={isSubmitting} fromYear={2000} toYear={new Date().getFullYear() + 1} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="incidentTime" className="mb-2">Time <span className="text-red-500">*</span></Label>
                <IncidentTimeSelect
                  id="incidentTime"
                  value={formData.incidentTime}
                  onChange={(incidentTime) => setFormData({ ...formData, incidentTime })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="incidentLocation" className="mb-2">Location</Label>
                <Input id="incidentLocation" value={formData.incidentLocation} onChange={(e) => setFormData({ ...formData, incidentLocation: e.target.value })} placeholder="e.g., Bedroom, Lounge, Garden" disabled={isSubmitting} />
              </div>
            </div>
          </div>

          {/* Type of Restrictive Practice */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Type of Restrictive Practice <span className="text-red-500">*</span></h3>
            <div className="space-y-3">
              {restrictiveTypeOptions.map((type) => (
                <div key={type} className="flex items-start space-x-3">
                  <Checkbox id={`type-${type}`} checked={formData.restrictiveTypes.includes(type)} onCheckedChange={() => toggleRestrictiveType(type)} disabled={isSubmitting} />
                  <Label htmlFor={`type-${type}`} className="cursor-pointer">{type}</Label>
                </div>
              ))}
              {formData.restrictiveTypes.includes("Other") && (
                <div className="ml-7">
                  <Label htmlFor="otherTypeDetails" className="mb-2 block">Specify</Label>
                  <Input id="otherTypeDetails" value={formData.otherTypeDetails} onChange={(e) => setFormData({ ...formData, otherTypeDetails: e.target.value })} disabled={isSubmitting} />
                </div>
              )}
            </div>
          </div>

          {/* Behaviour Leading to Intervention */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Behaviour Leading to Intervention</h3>
            <div>
              <Label htmlFor="behaviourDescription" className="mb-2 block">Description of behaviour <span className="text-red-500">*</span></Label>
              <Textarea id="behaviourDescription" value={formData.behaviourDescription} onChange={(e) => setFormData({ ...formData, behaviourDescription: e.target.value })} rows={5} disabled={isSubmitting} placeholder="Describe the behaviour that led to the restrictive intervention" />
            </div>
            <div>
              <Label htmlFor="triggerFactors" className="mb-2 block">Known trigger factors</Label>
              <Textarea id="triggerFactors" value={formData.triggerFactors} onChange={(e) => setFormData({ ...formData, triggerFactors: e.target.value })} rows={3} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="deEscalationAttempted" className="mb-2 block">De-escalation techniques attempted</Label>
              <Textarea id="deEscalationAttempted" value={formData.deEscalationAttempted} onChange={(e) => setFormData({ ...formData, deEscalationAttempted: e.target.value })} rows={3} disabled={isSubmitting} placeholder="What strategies were tried before the restrictive intervention?" />
            </div>
          </div>

          {/* Details of Restrictive Intervention */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Details of Restrictive Intervention</h3>
            <div>
              <Label htmlFor="interventionDetails" className="mb-2 block">Description of intervention used <span className="text-red-500">*</span></Label>
              <Textarea id="interventionDetails" value={formData.interventionDetails} onChange={(e) => setFormData({ ...formData, interventionDetails: e.target.value })} rows={5} disabled={isSubmitting} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="durationMinutes" className="mb-2">Duration (minutes)</Label>
                <Input id="durationMinutes" type="number" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="numberOfStaff" className="mb-2">Number of staff involved</Label>
                <Input id="numberOfStaff" type="number" value={formData.numberOfStaff} onChange={(e) => setFormData({ ...formData, numberOfStaff: e.target.value })} disabled={isSubmitting} />
              </div>
            </div>
            <div>
              <Label htmlFor="staffInvolved" className="mb-2 block">Names and roles of staff involved</Label>
              <Textarea id="staffInvolved" value={formData.staffInvolved} onChange={(e) => setFormData({ ...formData, staffInvolved: e.target.value })} rows={3} disabled={isSubmitting} />
            </div>
          </div>

          {/* Impact on Service User & Post-Incident */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Impact on Service User & Post-Incident</h3>
            <div>
              <Label htmlFor="serviceUserResponse" className="mb-2 block">Service user response during/after intervention</Label>
              <Textarea id="serviceUserResponse" value={formData.serviceUserResponse} onChange={(e) => setFormData({ ...formData, serviceUserResponse: e.target.value })} rows={3} disabled={isSubmitting} />
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox id="injurySustained" checked={formData.injurySustained} onCheckedChange={(checked) => setFormData({ ...formData, injurySustained: checked as boolean })} disabled={isSubmitting} />
              <Label htmlFor="injurySustained" className="cursor-pointer">Injury sustained?</Label>
            </div>
            {formData.injurySustained && (
              <div className="ml-7">
                <Label htmlFor="injuryDetails" className="mb-2 block">Injury details</Label>
                <Textarea id="injuryDetails" value={formData.injuryDetails} onChange={(e) => setFormData({ ...formData, injuryDetails: e.target.value })} rows={2} disabled={isSubmitting} />
              </div>
            )}
            <div className="flex items-start space-x-3">
              <Checkbox id="medicalAttentionRequired" checked={formData.medicalAttentionRequired} onCheckedChange={(checked) => setFormData({ ...formData, medicalAttentionRequired: checked as boolean })} disabled={isSubmitting} />
              <Label htmlFor="medicalAttentionRequired" className="cursor-pointer">Medical attention required?</Label>
            </div>
            {formData.medicalAttentionRequired && (
              <div className="ml-7">
                <Label htmlFor="medicalDetails" className="mb-2 block">Medical details</Label>
                <Textarea id="medicalDetails" value={formData.medicalDetails} onChange={(e) => setFormData({ ...formData, medicalDetails: e.target.value })} rows={2} disabled={isSubmitting} />
              </div>
            )}
            <div>
              <Label htmlFor="debrief" className="mb-2 block">Post-incident debrief</Label>
              <Textarea id="debrief" value={formData.debrief} onChange={(e) => setFormData({ ...formData, debrief: e.target.value })} rows={3} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="serviceUserViews" className="mb-2 block">Service user views (if able)</Label>
              <Textarea id="serviceUserViews" value={formData.serviceUserViews} onChange={(e) => setFormData({ ...formData, serviceUserViews: e.target.value })} rows={2} disabled={isSubmitting} />
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox id="familyNotified" checked={formData.familyNotified} onCheckedChange={(checked) => setFormData({ ...formData, familyNotified: checked as boolean })} disabled={isSubmitting} />
              <Label htmlFor="familyNotified" className="cursor-pointer">Family/next of kin notified?</Label>
            </div>
            {formData.familyNotified && (
              <div className="ml-7">
                <Label htmlFor="familyNotifiedDetails" className="mb-2 block">Details</Label>
                <Input id="familyNotifiedDetails" value={formData.familyNotifiedDetails} onChange={(e) => setFormData({ ...formData, familyNotifiedDetails: e.target.value })} disabled={isSubmitting} />
              </div>
            )}
          </div>

          {/* Review and Approval */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Review and Approval</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="completedBy" className="mb-2 block">Completed by</Label>
                <Input id="completedBy" value={formData.completedBy} onChange={(e) => setFormData({ ...formData, completedBy: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="completedByRole" className="mb-2 block">Role</Label>
                <Input id="completedByRole" value={formData.completedByRole} onChange={(e) => setFormData({ ...formData, completedByRole: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="reviewerName" className="mb-2 block">Reviewer Name</Label>
                <Input id="reviewerName" value={formData.reviewerName} onChange={(e) => setFormData({ ...formData, reviewerName: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="reviewerRole" className="mb-2 block">Reviewer Role</Label>
                <Input id="reviewerRole" value={formData.reviewerRole} onChange={(e) => setFormData({ ...formData, reviewerRole: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="reviewDate" className="mb-2 block">Review Date</Label>
                <Popover open={reviewDatePopoverOpen} onOpenChange={setReviewDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className={cn("w-full pl-3 text-left font-normal", !formData.reviewDate && "text-muted-foreground")} disabled={isSubmitting}>
                      {formData.reviewDate ? format(formData.reviewDate, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formData.reviewDate} captionLayout="dropdown" onSelect={(date) => { setFormData({ ...formData, reviewDate: date }); setReviewDatePopoverOpen(false); }} disabled={isSubmitting} fromYear={2000} toYear={new Date().getFullYear() + 1} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label htmlFor="lessonsLearned" className="mb-2 block">Lessons learned</Label>
              <Textarea id="lessonsLearned" value={formData.lessonsLearned} onChange={(e) => setFormData({ ...formData, lessonsLearned: e.target.value })} rows={3} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="followUpActions" className="mb-2 block">Follow-up actions</Label>
              <Textarea id="followUpActions" value={formData.followUpActions} onChange={(e) => setFormData({ ...formData, followUpActions: e.target.value })} rows={3} disabled={isSubmitting} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 pb-6">
            <Button
              variant="outline"
              size="lg"
              onClick={handleDownloadPdf}
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
              {isSubmitting ? "Submitting..." : (<>Submit Report <Check className="w-4 h-4 ml-2" /></>)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
