"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Check, CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";

interface TrustReportFormProps {
  folderId: string;
  residentId: string;
  residentName: string;
  residentDOB?: string;
  residentGender?: string;
  careManagerName?: string;
  providerName?: string;
  reporterName?: string;
  reporterRole?: string;
  trustName: string;
  trustCode: string;
  trustDescription: string;
  orgLogoUrl?: string;
  careHomeName?: string;
  onSaved?: () => void;
}

export function TrustReportForm({
  folderId,
  residentId,
  residentName,
  residentDOB,
  residentGender,
  careManagerName,
  providerName: prefillProvider,
  reporterName: prefillReporter,
  reporterRole: prefillRole,
  trustName,
  trustCode,
  trustDescription,
  orgLogoUrl,
  careHomeName,
  onSaved,
}: TrustReportFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [dobPopoverOpen, setDobPopoverOpen] = React.useState(false);
  const [incidentDatePopoverOpen, setIncidentDatePopoverOpen] = React.useState(false);
  const [dateReportedPopoverOpen, setDateReportedPopoverOpen] = React.useState(false);
  const [riskAssessmentPopoverOpen, setRiskAssessmentPopoverOpen] = React.useState(false);
  const [reviewDatePopoverOpen, setReviewDatePopoverOpen] = React.useState(false);

  const parsedDOB = residentDOB ? new Date(residentDOB) : undefined;
  const normalizedGender = residentGender
    ? residentGender.charAt(0).toUpperCase() + residentGender.slice(1).toLowerCase()
    : "";

  const [formData, setFormData] = React.useState({
    providerName: prefillProvider || "",
    serviceUserName: residentName || "",
    serviceUserDOB: (parsedDOB && !isNaN(parsedDOB.getTime()) ? parsedDOB : undefined) as Date | undefined,
    serviceUserGender: normalizedGender === "Male" || normalizedGender === "Female" ? normalizedGender : "",
    careManager: careManagerName || "",
    incidentAddress: "",
    exactLocation: "",
    incidentDate: undefined as Date | undefined,
    incidentTime: "",
    incidentDescription: "",
    natureOfInjury: "",
    immediateActionTaken: "",
    personsNotified: "",
    witnesses: "",
    staffInvolved: "",
    otherServiceUsersInvolved: "",
    reporterName: prefillReporter || "",
    reporterDesignation: prefillRole || "",
    dateReported: new Date() as Date | undefined,
    preventionActions: "",
    riskAssessmentUpdateDate: undefined as Date | undefined,
    otherComments: "",
    reviewerName: "",
    reviewerDesignation: "",
    reviewDate: undefined as Date | undefined,
  });

  const validate = (): boolean => {
    if (!formData.providerName.trim()) { toast.error("Please enter Provider Name"); return false; }
    if (!formData.serviceUserName.trim()) { toast.error("Please enter Service User Name"); return false; }
    if (!formData.serviceUserDOB) { toast.error("Please enter Date of Birth"); return false; }
    if (!formData.serviceUserGender) { toast.error("Please select Gender"); return false; }
    if (!formData.careManager.trim()) { toast.error("Please enter Care Manager"); return false; }
    if (!formData.incidentAddress.trim()) { toast.error("Please enter Incident Address"); return false; }
    if (!formData.exactLocation.trim()) { toast.error("Please enter Exact Location"); return false; }
    if (!formData.incidentDate) { toast.error("Please enter Incident Date"); return false; }
    if (!formData.incidentTime) { toast.error("Please enter Incident Time"); return false; }
    if (!formData.incidentDescription.trim()) { toast.error("Please enter Incident Description"); return false; }
    if (!formData.natureOfInjury.trim()) { toast.error("Please enter Nature of Injury"); return false; }
    if (!formData.immediateActionTaken.trim()) { toast.error("Please enter Immediate Action Taken"); return false; }
    if (!formData.personsNotified.trim()) { toast.error("Please enter Persons Notified"); return false; }
    if (!formData.reporterName.trim()) { toast.error("Please enter Reporter Name"); return false; }
    if (!formData.reporterDesignation.trim()) { toast.error("Please enter Reporter Designation"); return false; }
    if (!formData.dateReported) { toast.error("Please enter Date Reported"); return false; }
    if (!formData.preventionActions.trim()) { toast.error("Please enter Prevention Actions"); return false; }
    return true;
  };

  const handleDownloadPdf = async () => {
    try {
      const [firstName, ...rest] = residentName.split(" ");
      const resident = {
        first_name: firstName || residentName,
        last_name: rest.join(" "),
        date_of_birth: residentDOB,
      };

      await generateCareFilePDF({
        formName: `${trustName} Incident Report`,
        data: {
          ...formData,
          serviceUserDOB: formData.serviceUserDOB
            ? format(formData.serviceUserDOB, "yyyy-MM-dd")
            : undefined,
          incidentDate: formData.incidentDate
            ? format(formData.incidentDate, "yyyy-MM-dd")
            : undefined,
          dateReported: formData.dateReported
            ? format(formData.dateReported, "yyyy-MM-dd")
            : undefined,
          riskAssessmentUpdateDate: formData.riskAssessmentUpdateDate
            ? format(formData.riskAssessmentUpdateDate, "yyyy-MM-dd")
            : undefined,
          reviewDate: formData.reviewDate
            ? format(formData.reviewDate, "yyyy-MM-dd")
            : undefined,
        },
        resident,
        orgLogoUrl,
        careHomeName: careHomeName || prefillProvider,
      });
    } catch (err) {
      console.error(`Error generating ${trustName} PDF:`, err);
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
          trust_name: trustName,
          report_type: trustCode,
          report_data: {
            providerName: formData.providerName.trim(),
            serviceUserName: formData.serviceUserName.trim(),
            serviceUserDOB: formData.serviceUserDOB ? format(formData.serviceUserDOB, "yyyy-MM-dd") : "",
            serviceUserGender: formData.serviceUserGender,
            careManager: formData.careManager.trim(),
            incidentAddress: formData.incidentAddress.trim(),
            exactLocation: formData.exactLocation.trim(),
            incidentDate: formData.incidentDate ? format(formData.incidentDate, "yyyy-MM-dd") : "",
            incidentTime: formData.incidentTime,
            incidentDescription: formData.incidentDescription.trim(),
            natureOfInjury: formData.natureOfInjury.trim(),
            immediateActionTaken: formData.immediateActionTaken.trim(),
            personsNotified: formData.personsNotified.trim(),
            witnesses: formData.witnesses.trim() || undefined,
            staffInvolved: formData.staffInvolved.trim() || undefined,
            otherServiceUsersInvolved: formData.otherServiceUsersInvolved.trim() || undefined,
            reporterName: formData.reporterName.trim(),
            reporterDesignation: formData.reporterDesignation.trim(),
            dateReported: formData.dateReported ? format(formData.dateReported, "yyyy-MM-dd") : "",
            preventionActions: formData.preventionActions.trim(),
            riskAssessmentUpdateDate: formData.riskAssessmentUpdateDate ? format(formData.riskAssessmentUpdateDate, "yyyy-MM-dd") : undefined,
            otherComments: formData.otherComments.trim() || undefined,
            reviewerName: formData.reviewerName.trim() || undefined,
            reviewerDesignation: formData.reviewerDesignation.trim() || undefined,
            reviewDate: formData.reviewDate ? format(formData.reviewDate, "yyyy-MM-dd") : undefined,
            status: "submitted",
          }
        })
        .select()
        .single();
      if (error) throw error;
      toast.success(`${trustName} report submitted successfully`);
      onSaved?.();
    } catch (error) {
      console.error(`Error submitting ${trustName} report:`, error);
      toast.error(`Failed to submit ${trustName} report`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b bg-background flex-shrink-0">
        <h2 className="text-lg font-semibold">{trustName} Incident Report Form</h2>
        <p className="text-sm text-muted-foreground">{trustDescription}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Provider and Service User Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Provider and Service User Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="providerName" className="mb-2">Provider Name <span className="text-red-500">*</span></Label>
                <Input id="providerName" value={formData.providerName} onChange={(e) => setFormData({ ...formData, providerName: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="serviceUserName" className="mb-2">Name of Service User <span className="text-red-500">*</span></Label>
                <Input id="serviceUserName" value={formData.serviceUserName} onChange={(e) => setFormData({ ...formData, serviceUserName: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="serviceUserDOB" className="mb-2">Date of Birth <span className="text-red-500">*</span></Label>
                <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className={cn("w-full pl-3 text-left font-normal", !formData.serviceUserDOB && "text-muted-foreground")} disabled={isSubmitting}>
                      {formData.serviceUserDOB ? format(formData.serviceUserDOB, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formData.serviceUserDOB} captionLayout="dropdown" onSelect={(date) => { setFormData({ ...formData, serviceUserDOB: date }); setDobPopoverOpen(false); }} disabled={isSubmitting} fromYear={1900} toYear={new Date().getFullYear()} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="serviceUserGender" className="mb-2">Gender <span className="text-red-500">*</span></Label>
                <Select value={formData.serviceUserGender} onValueChange={(value) => setFormData({ ...formData, serviceUserGender: value })} disabled={isSubmitting}>
                  <SelectTrigger id="serviceUserGender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="careManager" className="mb-2">Care Manager <span className="text-red-500">*</span></Label>
                <Input id="careManager" value={formData.careManager} onChange={(e) => setFormData({ ...formData, careManager: e.target.value })} disabled={isSubmitting} />
              </div>
            </div>
          </div>

          {/* Incident Location */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Incident Location</h3>
            <div>
              <Label htmlFor="incidentAddress" className="mb-2">Address where incident occurred <span className="text-red-500">*</span></Label>
              <Textarea id="incidentAddress" value={formData.incidentAddress} onChange={(e) => setFormData({ ...formData, incidentAddress: e.target.value })} rows={3} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="exactLocation" className="mb-2">Exact location <span className="text-red-500">*</span></Label>
              <Input id="exactLocation" value={formData.exactLocation} onChange={(e) => setFormData({ ...formData, exactLocation: e.target.value })} placeholder="e.g., Bedroom, Bathroom, Garden" disabled={isSubmitting} />
            </div>
          </div>

          {/* Incident Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Incident Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="incidentDate" className="mb-2">Date of Incident <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="incidentTime" className="mb-2">Time of Incident <span className="text-red-500">*</span></Label>
                <Input id="incidentTime" type="time" value={formData.incidentTime} onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })} disabled={isSubmitting} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="incidentDescription" className="mb-2">Description of incident <span className="text-red-500">*</span></Label>
                <Textarea id="incidentDescription" value={formData.incidentDescription} onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })} rows={5} placeholder="Include details of any equipment or medication involved" disabled={isSubmitting} />
              </div>
            </div>
          </div>

          {/* Injury and Treatment */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Injury and Treatment</h3>
            <div>
              <Label htmlFor="natureOfInjury" className="mb-2">Nature of Injury Sustained <span className="text-red-500">*</span></Label>
              <Textarea id="natureOfInjury" value={formData.natureOfInjury} onChange={(e) => setFormData({ ...formData, natureOfInjury: e.target.value })} rows={3} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="immediateActionTaken" className="mb-2">Immediate action taken and treatment given <span className="text-red-500">*</span></Label>
              <Textarea id="immediateActionTaken" value={formData.immediateActionTaken} onChange={(e) => setFormData({ ...formData, immediateActionTaken: e.target.value })} rows={4} placeholder="e.g., First aid, GP, hospital admission" disabled={isSubmitting} />
            </div>
          </div>

          {/* Notifications and Witnesses */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Notifications and Witnesses</h3>
            <div>
              <Label htmlFor="personsNotified" className="mb-2">Persons notified <span className="text-red-500">*</span></Label>
              <Textarea id="personsNotified" value={formData.personsNotified} onChange={(e) => setFormData({ ...formData, personsNotified: e.target.value })} rows={3} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="witnesses" className="mb-2">Name and designation of any witnesses</Label>
              <Textarea id="witnesses" value={formData.witnesses} onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })} rows={2} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="staffInvolved" className="mb-2">Staff member(s) involved</Label>
              <Textarea id="staffInvolved" value={formData.staffInvolved} onChange={(e) => setFormData({ ...formData, staffInvolved: e.target.value })} rows={2} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="otherServiceUsersInvolved" className="mb-2">Other Service User(s) involved</Label>
              <Textarea id="otherServiceUsersInvolved" value={formData.otherServiceUsersInvolved} onChange={(e) => setFormData({ ...formData, otherServiceUsersInvolved: e.target.value })} rows={2} disabled={isSubmitting} />
            </div>
          </div>

          {/* Reporter Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Reporter Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reporterName" className="mb-2 block">Reporter Name <span className="text-red-500">*</span></Label>
                <Input id="reporterName" value={formData.reporterName} onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="reporterDesignation" className="mb-2 block">Designation <span className="text-red-500">*</span></Label>
                <Input id="reporterDesignation" value={formData.reporterDesignation} onChange={(e) => setFormData({ ...formData, reporterDesignation: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="dateReported" className="mb-2 block">Date reported <span className="text-red-500">*</span></Label>
                <Popover open={dateReportedPopoverOpen} onOpenChange={setDateReportedPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className={cn("w-full pl-3 text-left font-normal", !formData.dateReported && "text-muted-foreground")} disabled={isSubmitting}>
                      {formData.dateReported ? format(formData.dateReported, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formData.dateReported} captionLayout="dropdown" onSelect={(date) => { setFormData({ ...formData, dateReported: date }); setDateReportedPopoverOpen(false); }} disabled={isSubmitting} fromYear={2000} toYear={new Date().getFullYear() + 1} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Follow-up Actions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Follow-up Actions</h3>
            <div>
              <Label htmlFor="preventionActions" className="mb-2 block">Actions taken to prevent recurrence <span className="text-red-500">*</span></Label>
              <Textarea id="preventionActions" value={formData.preventionActions} onChange={(e) => setFormData({ ...formData, preventionActions: e.target.value })} rows={4} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="riskAssessmentUpdateDate" className="mb-2 block">Risk assessment update date</Label>
              <Popover open={riskAssessmentPopoverOpen} onOpenChange={setRiskAssessmentPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className={cn("w-full pl-3 text-left font-normal", !formData.riskAssessmentUpdateDate && "text-muted-foreground")} disabled={isSubmitting}>
                    {formData.riskAssessmentUpdateDate ? format(formData.riskAssessmentUpdateDate, "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formData.riskAssessmentUpdateDate} captionLayout="dropdown" onSelect={(date) => { setFormData({ ...formData, riskAssessmentUpdateDate: date }); setRiskAssessmentPopoverOpen(false); }} disabled={isSubmitting} fromYear={2000} toYear={new Date().getFullYear() + 1} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="otherComments" className="mb-2 block">Other Comments</Label>
              <Textarea id="otherComments" value={formData.otherComments} onChange={(e) => setFormData({ ...formData, otherComments: e.target.value })} rows={3} disabled={isSubmitting} />
            </div>
          </div>

          {/* Senior Staff / Manager Review */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-black border-b pb-2">Senior Staff / Manager Review</h3>
            <p className="text-sm text-muted-foreground">Optional fields for senior staff or service manager.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reviewerName" className="mb-2 block">Reviewer Name</Label>
                <Input id="reviewerName" value={formData.reviewerName} onChange={(e) => setFormData({ ...formData, reviewerName: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="reviewerDesignation" className="mb-2 block">Designation</Label>
                <Input id="reviewerDesignation" value={formData.reviewerDesignation} onChange={(e) => setFormData({ ...formData, reviewerDesignation: e.target.value })} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="reviewDate" className="mb-2 block">Date</Label>
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
