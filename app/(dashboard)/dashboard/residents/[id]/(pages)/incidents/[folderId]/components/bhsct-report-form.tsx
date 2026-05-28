"use client";

import React, { useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Printer, Save, Download } from "lucide-react";
import { format } from "date-fns";
import { IncidentTimeSelect } from "@/components/incidents/incident-time-select";
import { formatIncidentTimeDisplay } from "@/lib/incident-time-utils";

interface BHSCTReportFormProps {
  folderId: string;
  residentId: string;
  residentName: string;
  residentDOB?: string;
  residentGender?: string;
  careManagerName?: string;
  providerName?: string;
  reporterName?: string;
  reporterRole?: string;
  orgLogoUrl?: string; // Using static /Bhsctlogo.jpg instead for identical printing
  careHomeName?: string;
  onSaved?: () => void;
  savedReport?: Record<string, any>; // If provided, the form is in read-only view mode
}

import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";

export function BHSCTReportForm({
  folderId,
  residentId,
  residentName,
  residentDOB,
  residentGender,
  careManagerName,
  providerName: prefillProvider,
  reporterName: prefillReporter,
  reporterRole: prefillRole,
  orgLogoUrl,
  careHomeName,
  onSaved,
  savedReport,
}: BHSCTReportFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isViewMode, setIsViewMode] = React.useState(!!savedReport);
  const printRef = useRef<HTMLDivElement>(null);

  const parsedDOB = residentDOB ? new Date(residentDOB) : undefined;
  const normalizedGender = residentGender
    ? residentGender.charAt(0).toUpperCase() + residentGender.slice(1).toLowerCase()
    : "";

  const [formData, setFormData] = React.useState({
    providerName: prefillProvider || careHomeName || "",
    serviceUserName: residentName || "",
    serviceUserDOB: parsedDOB && !isNaN(parsedDOB.getTime()) ? format(parsedDOB, "yyyy-MM-dd") : "",
    serviceUserGender: normalizedGender === "Male" || normalizedGender === "Female" ? normalizedGender : "",
    careManager: careManagerName || "",
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
    reporterName: prefillReporter || "",
    reporterSignature: "",
    reporterDesignation: prefillRole || "",
    dateReported: format(new Date(), "yyyy-MM-dd"),
    preventionActions: "",
    riskAssessmentUpdateDate: "",
    otherComments: "",
    reviewerName: "",
    reviewerSignature: "",
    reviewerDesignation: "",
    reviewDate: "",
  });

  // Pre-fill with saved report data when in view mode
  useEffect(() => {
    if (savedReport) {
      setFormData((prev) => ({
        ...prev,
        ...savedReport
      }));
      setIsViewMode(true);
    }
  }, [savedReport]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const [firstName, ...rest] = (residentName || "").split(" ");
      const resident = residentName
        ? {
          first_name: firstName || residentName,
          last_name: rest.join(" "),
          date_of_birth: residentDOB,
        }
        : undefined;

      await generateCareFilePDF({
        formName: "BHSCT Incident Report",
        data: formData,
        resident,
        orgLogoUrl,
        careHomeName: careHomeName || formData.providerName,
      });
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const validate = (): boolean => {
    if (!formData.providerName.trim()) { toast.error("Please enter Provider Name"); return false; }
    if (!formData.serviceUserName.trim()) { toast.error("Please enter Service User Name"); return false; }
    if (!formData.serviceUserDOB) { toast.error("Please enter Date of Birth"); return false; }
    if (!formData.serviceUserGender) { toast.error("Please select Gender"); return false; }
    if (!formData.incidentAddress.trim()) { toast.error("Please enter Incident Address"); return false; }
    if (!formData.exactLocation.trim()) { toast.error("Please enter Exact Location"); return false; }
    if (!formData.incidentDate) { toast.error("Please enter Incident Date"); return false; }
    if (!formData.incidentTime) { toast.error("Please enter Incident Time"); return false; }
    if (!formData.incidentDescription.trim()) { toast.error("Please enter Incident Description"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        folder_id: folderId,
        resident_id: residentId,
        trust_name: "BHSCT",
        report_type: "bhsct",
        report_data: {
          ...formData,
          status: "submitted",
        }
      };

      if (savedReport?.id) {
        const { error } = await supabase
          .from("trust_incident_reports")
          .update(payload)
          .eq("id", savedReport.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("trust_incident_reports")
          .insert(payload);
        if (error) throw error;
      }

      toast.success("BHSCT report saved successfully");
      setIsViewMode(true);
      onSaved?.();
    } catch (error) {
      console.error("Error submitting BHSCT report:", error);
      toast.error("Failed to submit BHSCT report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputDate = ({ value, onChange, disabled }: { value: string, onChange: (v: string) => void, disabled?: boolean }) => (
    <div className="w-full">
      {!isViewMode ? (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isViewMode}
          className="w-full outline-none bg-transparent print:hidden font-sans"
        />
      ) : (
        <div className="w-full outline-none bg-transparent print:hidden font-sans pt-[3px] px-2">{value ? format(new Date(value), "yyyy-MM-dd") : ""}</div>
      )}
      <div className="hidden print:block w-full px-2">{value ? format(new Date(value), "dd/MM/yyyy") : ""}</div>
    </div>
  );

  const InputTime = ({ value, onChange, disabled }: { value: string, onChange: (v: string) => void, disabled?: boolean }) => (
    <div className="w-full">
      {!isViewMode ? (
        <IncidentTimeSelect
          value={value}
          onChange={onChange}
          disabled={disabled || isViewMode}
          className="print:hidden w-full"
        />
      ) : (
        <div className="w-full outline-none bg-transparent print:hidden font-sans py-1 px-2">
          {formatIncidentTimeDisplay(value) || value}
        </div>
      )}
      <div className="hidden print:block w-full px-2">
        {formatIncidentTimeDisplay(value) || value}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-hidden font-sans print:bg-white text-black">
      {/* Top Bar (Hidden during print) */}
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between flex-shrink-0 print:hidden z-10 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">BHSCT Incident Report Form</h2>
          <p className="text-sm text-gray-500">
            {isViewMode ? "Viewing submitted report details." : "Please fill out this physical form replica."}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isDownloading || isSubmitting}>
            <Download className="w-4 h-4 mr-2" /> {isDownloading ? "Downloading..." : "Download PDF"}
          </Button>
          {isViewMode ? (
            <Button onClick={() => setIsViewMode(false)} disabled={isSubmitting}>
              Edit Report
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (<><Save className="w-4 h-4 mr-2" /> Save Report</>)}
            </Button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-form, #printable-form * {
            visibility: visible;
          }
          #printable-form {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            transform: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}} />

      {/* Scrollable Form Container */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-8 w-full print:p-0 print:bg-white print:overflow-visible relative">

        {/* Printable Area */}
        <div id="printable-form" ref={printRef} className="bg-white p-8 shadow-sm border mx-auto max-w-4xl print:shadow-none print:border-none print:p-4 text-black text-[15px] leading-snug">

          <div className="flex items-center mb-8">
            <img src="/Bhsctlogo.jpg" alt="BHSCT Logo" className="w-[300px] h-auto object-contain" />
            <div className="flex-1 text-center items-center justify-center flex">
              <h1 className="font-bold text-[22px] uppercase">Independent Sector<br />Adverse Incident Report Form</h1>
            </div>
          </div>

          <p className="text-center mb-6 text-lg">
            To be completed following any adverse incident involving a Service User of<br />
            <span className="font-bold">Belfast Health & Social Care Trust.</span>
          </p>

          <div className="border-t-[2px] border-l-[2px] border-black [&_input]:border-none [&_input]:bg-transparent [&_input]:px-2 [&_input]:py-1 [&_input]:w-full [&_input:focus]:outline-none [&_textarea]:border-none [&_textarea]:bg-transparent [&_textarea]:px-2 [&_textarea]:py-1 [&_textarea]:w-full [&_textarea:focus]:outline-none [&_textarea]:resize-none">

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-1/3 p-2 border-r-[2px] border-black font-bold flex items-center">Provider Name</div>
              <div className="w-2/3 border-r-[2px] border-black flex items-center">
                <input type="text" value={formData.providerName} onChange={e => handleChange('providerName', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-1/3 p-2 border-r-[2px] border-black font-bold flex items-center">Name of<br />Service User</div>
              <div className="w-2/3 border-r-[2px] border-black flex items-center">
                <input type="text" value={formData.serviceUserName} onChange={e => handleChange('serviceUserName', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-1/3 p-2 border-r-[2px] border-black font-bold flex items-center">DOB</div>
              <div className="w-2/3 border-r-[2px] border-black flex items-center">
                <InputDate value={formData.serviceUserDOB} onChange={(v) => handleChange('serviceUserDOB', v)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-1/3 p-2 border-r-[2px] border-black font-bold flex items-center">Male</div>
              <div className="w-2/3 border-r-[2px] border-black flex items-center px-6">
                <div
                  className={`w-10 h-10 border-[2px] border-black flex items-center justify-center text-xl font-bold ${isViewMode ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                  onClick={() => !isSubmitting && !isViewMode && handleChange('serviceUserGender', 'Male')}
                >
                  {formData.serviceUserGender === 'Male' && '✓'}
                </div>
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-1/3 p-2 border-r-[2px] border-black font-bold flex items-center">Female</div>
              <div className="w-2/3 border-r-[2px] border-black flex items-center px-6">
                <div
                  className={`w-10 h-10 border-[2px] border-black flex items-center justify-center text-xl font-bold ${isViewMode ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                  onClick={() => !isSubmitting && !isViewMode && handleChange('serviceUserGender', 'Female')}
                >
                  {formData.serviceUserGender === 'Female' && '✓'}
                </div>
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-1/3 p-2 border-r-[2px] border-black font-bold flex items-center">Care Manager</div>
              <div className="w-2/3 border-r-[2px] border-black flex items-center">
                <input type="text" value={formData.careManager} onChange={e => handleChange('careManager', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold">Address (including post code) where incident occurred</div>
              <div className="border-r-[2px] border-black h-24">
                <textarea className="h-full" value={formData.incidentAddress} onChange={e => handleChange('incidentAddress', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold">Exact location where incident occurred</div>
              <div className="border-r-[2px] border-black h-20">
                <textarea className="h-full" value={formData.exactLocation} onChange={e => handleChange('exactLocation', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-1/3 p-2 border-r-[2px] border-black font-bold flex items-center">Date of Incident</div>
              <div className="w-2/3 border-r-[2px] border-black flex items-center">
                <InputDate value={formData.incidentDate} onChange={(v) => handleChange('incidentDate', v)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-1/3 p-2 border-r-[2px] border-black font-bold flex items-center">Time of Incident</div>
              <div className="w-2/3 border-r-[2px] border-black flex items-center">
                <InputTime value={formData.incidentTime} onChange={(v) => handleChange('incidentTime', v)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold leading-snug">Brief, factual description of incident<br />(including details of any equipment or medication involved)</div>
              <div className="border-r-[2px] border-black h-[400px]">
                <textarea className="h-full" value={formData.incidentDescription} onChange={e => handleChange('incidentDescription', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

          </div>

          <div className="page-break my-12 opacity-0 print:my-0">&nbsp;</div>
          <div className="h-[2px] bg-gray-300 w-full my-12 print:hidden relative before:content-['Page_Break'] before:absolute before:-top-3 before:left-1/2 before:-translate-x-1/2 before:bg-gray-100 before:px-4 before:text-gray-500 before:text-sm"></div>

          {/* PAGE 2 */}
          <div className="border-t-[2px] border-l-[2px] border-black [&_input]:border-none [&_input]:bg-transparent [&_input]:px-2 [&_input]:py-1 [&_input]:w-full [&_input:focus]:outline-none [&_textarea]:border-none [&_textarea]:bg-transparent [&_textarea]:px-2 [&_textarea]:py-1 [&_textarea]:w-full [&_textarea:focus]:outline-none [&_textarea]:resize-none">

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold">Nature of Injury Sustained</div>
              <div className="border-r-[2px] border-black h-40">
                <textarea className="h-full" value={formData.natureOfInjury} onChange={e => handleChange('natureOfInjury', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold leading-snug">Details of immediate action taken and treatment given<br />(ie. First aid, GP, hospital admission etc)</div>
              <div className="border-r-[2px] border-black h-48">
                <textarea className="h-full" value={formData.immediateActionTaken} onChange={e => handleChange('immediateActionTaken', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold">Persons notified including designation / relationship to Service User</div>
              <div className="border-r-[2px] border-black flex flex-col group items-start">
                <textarea className="h-24 leading-loose bg-[linear-gradient(transparent_96%,black_96%)] bg-[length:100%_2rem]" style={{ lineHeight: '2rem' }} value={formData.personsNotified} onChange={e => handleChange('personsNotified', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold">Name and designation of any witnesses</div>
              <div className="border-r-[2px] border-black">
                <textarea className="h-24 leading-loose bg-[linear-gradient(transparent_96%,black_96%)] bg-[length:100%_2rem]" style={{ lineHeight: '2rem' }} value={formData.witnesses} onChange={e => handleChange('witnesses', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold leading-snug">Name and designation of any staff member or any other Service User(s)<br />involved. If other Service User(s) involved please include DOB.</div>
              <div className="border-r-[2px] border-black">
                <textarea
                  className="h-32 leading-loose bg-[linear-gradient(transparent_96%,black_96%)] bg-[length:100%_2rem] whitespace-pre-wrap"
                  style={{ lineHeight: '2rem' }}
                  value={formData.staffInvolved}
                  onChange={e => handleChange('staffInvolved', e.target.value)}
                  disabled={isSubmitting || isViewMode}
                />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-[40%] p-2 border-r-[2px] border-black font-bold flex items-center leading-tight">Name of person reporting<br />the incident</div>
              <div className="w-[60%] border-r-[2px] border-black flex items-center">
                <input type="text" value={formData.reporterName} onChange={e => handleChange('reporterName', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-[40%] p-2 border-r-[2px] border-black font-bold flex items-center">Signature</div>
              <div className="w-[60%] border-r-[2px] border-black flex items-center">
                <input type="text" value={formData.reporterSignature} onChange={e => handleChange('reporterSignature', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-[40%] p-2 border-r-[2px] border-black font-bold flex items-center">Designation</div>
              <div className="w-[60%] border-r-[2px] border-black flex items-center">
                <input type="text" value={formData.reporterDesignation} onChange={e => handleChange('reporterDesignation', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-[40%] p-2 border-r-[2px] border-black font-bold flex items-center">Date reported</div>
              <div className="w-[60%] border-r-[2px] border-black flex items-center">
                <InputDate value={formData.dateReported} onChange={(v) => handleChange('dateReported', v)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

          </div>

          <div className="page-break my-12 opacity-0 print:my-0">&nbsp;</div>
          <div className="h-[2px] bg-gray-300 w-full my-12 print:hidden relative before:content-['Page_Break'] before:absolute before:-top-3 before:left-1/2 before:-translate-x-1/2 before:bg-gray-100 before:px-4 before:text-gray-500 before:text-sm"></div>

          {/* PAGE 3 */}
          <div className="mb-2 font-bold text-[17px]">
            To be completed by Provider Senior Staff / Service Manager
          </div>

          <div className="border-t-[2px] border-l-[2px] border-black [&_input]:border-none [&_input]:bg-transparent [&_input]:px-2 [&_input]:py-1 [&_input]:w-full [&_input:focus]:outline-none [&_textarea]:border-none [&_textarea]:bg-transparent [&_textarea]:px-2 [&_textarea]:py-1 [&_textarea]:w-full [&_textarea:focus]:outline-none [&_textarea]:resize-none">

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold">Actions taken to prevent recurrence</div>
              <div className="border-r-[2px] border-black h-[400px]">
                <textarea className="h-full" value={formData.preventionActions} onChange={e => handleChange('preventionActions', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold leading-tight">Date Service User&apos;s risk assessment and care plan updated following this<br />incident</div>
              <div className="border-r-[2px] border-black min-h-[40px] flex items-center">
                <InputDate value={formData.riskAssessmentUpdateDate} onChange={(v) => handleChange('riskAssessmentUpdateDate', v)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="border-b-[2px] border-black">
              <div className="p-2 border-r-[2px] border-black font-bold">Other Comments</div>
              <div className="border-r-[2px] border-black h-48">
                <textarea className="h-full" value={formData.otherComments} onChange={e => handleChange('otherComments', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-[40%] p-2 border-r-[2px] border-black font-bold flex items-center">Name</div>
              <div className="w-[60%] border-r-[2px] border-black flex items-center">
                <input type="text" value={formData.reviewerName} onChange={e => handleChange('reviewerName', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-[40%] p-2 border-r-[2px] border-black font-bold flex items-center">Signature</div>
              <div className="w-[60%] border-r-[2px] border-black flex items-center">
                <input type="text" value={formData.reviewerSignature} onChange={e => handleChange('reviewerSignature', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-[40%] p-2 border-r-[2px] border-black font-bold flex items-center">Designation</div>
              <div className="w-[60%] border-r-[2px] border-black flex items-center">
                <input type="text" value={formData.reviewerDesignation} onChange={e => handleChange('reviewerDesignation', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="flex border-b-[2px] border-black min-h-[40px]">
              <div className="w-[40%] p-2 border-r-[2px] border-black font-bold flex items-center">Date</div>
              <div className="w-[60%] border-r-[2px] border-black flex items-center">
                <InputDate value={formData.reviewDate} onChange={(v) => handleChange('reviewDate', v)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
