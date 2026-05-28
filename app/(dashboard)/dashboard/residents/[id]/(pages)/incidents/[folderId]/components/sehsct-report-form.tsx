"use client";

import React, { useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Save, Download } from "lucide-react";
import { format } from "date-fns";
import { IncidentTimeSelect } from "@/components/incidents/incident-time-select";
import { formatIncidentTimeDisplay } from "@/lib/incident-time-utils";
import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";

interface SEHSCTReportFormProps {
  folderId: string;
  residentId: string;
  residentName: string;
  residentDOB?: string;
  residentGender?: string;
  nhsNumber?: string;
  careManagerName?: string;
  providerName?: string;
  reporterName?: string;
  orgLogoUrl?: string; // Using static /SEHSCTmainlogo.jpg instead for identical printing
  careHomeName?: string;
  onSaved?: () => void;
  savedReport?: Record<string, any>; // If provided, the form is in read-only view mode
}

export function SEHSCTReportForm({
  folderId,
  residentId,
  residentName,
  residentDOB,
  residentGender,
  nhsNumber,
  careManagerName,
  providerName: prefillProvider,
  reporterName: prefillReporter,
  orgLogoUrl,
  careHomeName,
  onSaved,
  savedReport,
}: SEHSCTReportFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isViewMode, setIsViewMode] = React.useState(!!savedReport);
  const printRef = useRef<HTMLDivElement>(null);

  const parsedDOB = residentDOB ? new Date(residentDOB) : undefined;
  const normalizedGender = residentGender
    ? residentGender.charAt(0).toUpperCase() + residentGender.slice(1).toLowerCase()
    : "";

  const [formData, setFormData] = React.useState({
    datixRef: "",
    incidentDate: "",
    incidentTime: "",
    primaryLocation: "",
    exactLocation: "",
    incidentDescription: "",
    causedByBehaviors: undefined as boolean | undefined,
    documentedInCarePlan: undefined as boolean | undefined,
    apparentCauseOfInjury: "",
    remedialAction: "",
    preventionActions: "",
    riskAssessmentUpdateDate: "",
    equipmentInvolved: undefined as boolean | undefined,
    equipmentDetails: "",
    reportedToNIAC: undefined as boolean | undefined,
    propertyInvolved: undefined as boolean | undefined,
    propertyDetails: "",
    personsNotified: "",
    hcNumber: nhsNumber || "",
    gender: normalizedGender === "Male" || normalizedGender === "Female" ? normalizedGender : "",
    dob: parsedDOB && !isNaN(parsedDOB.getTime()) ? format(parsedDOB, "yyyy-MM-dd") : "",
    serviceUserFullName: residentName || "",
    serviceUserAddress: "",
    trustKeyWorkerName: "",
    trustKeyWorkerDesignation: "",
    injurySuffered: undefined as boolean | undefined,
    bodyPartAffected: "",
    natureOfInjury: "",
    attentionReceived: [] as string[],
    attentionOther: "",
    staffInvolved: "",
    witnessDetails: "",
    providerName: prefillProvider || careHomeName || "",
    providerAddress: "",
    groupName: "",
    serviceName: "",
    typeOfService: "",
    medicationInvolved: "",
    whoIdentified: "Provider", // Default
    identifierName: prefillReporter || "",
    identifierJob: "",
    identifierTel: "",
    identifierEmail: "",
    trustStaffName: "",
    trustStaffJob: "",
    trustStaffTel: "",
    trustStaffEmail: "",
    encryptedReturnEmail: "",
    outcomeAgreement: undefined as string | undefined, // '1', '2', '3'
    outcomeRationale: "",
    furtherActionProviderDetails: "",
    furtherActionProviderDate: "",
    furtherActionProviderBy: "",
    furtherActionTrustDetails: "",
    furtherActionTrustDate: "",
    furtherActionTrustBy: "",
    lessonsLearned: "",
    finalReviewDetails: "",
    allIssuesDealt: undefined as boolean | undefined,
    allIssuesDealtDetails: "",
    clientSatisfied: undefined as boolean | undefined,
    recommendationsImplemented: undefined as string | undefined, // 'Yes', 'No', 'NA'
    readyForClosure: undefined as boolean | undefined,
    keyWorkerNameDesignation: "",
    keyWorkerSignature: "",
    dateClosedByTrust: "",
    lineManagerNameDesignation: "",
    lineManagerSignature: "",
    dateApproved: "",
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

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAttentionReceived = (option: string) => {
    if (isViewMode || isSubmitting) return;
    setFormData(prev => ({
      ...prev,
      attentionReceived: prev.attentionReceived.includes(option)
        ? prev.attentionReceived.filter(o => o !== option)
        : [...prev.attentionReceived, option]
    }));
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
        formName: "SEHSCT Incident Report",
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
    if (!formData.serviceUserFullName.trim()) { toast.error("Please enter Service User Name"); return false; }
    if (!formData.dob) { toast.error("Please enter Date of Birth"); return false; }
    if (!formData.gender) { toast.error("Please select Gender"); return false; }
    if (!formData.incidentDate) { toast.error("Please enter Incident Date"); return false; }
    if (!formData.incidentTime) { toast.error("Please enter Incident Time"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        folder_id: folderId,
        resident_id: residentId,
        trust_name: "SEHSCT",
        report_type: "sehsct",
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

      toast.success("SEHSCT report saved successfully");
      setIsViewMode(true);
      onSaved?.();
    } catch (error) {
      console.error("Error submitting SEHSCT report:", error);
      toast.error("Failed to submit SEHSCT report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputDate = ({ value, onChange, disabled }: { value: string, onChange: (v: string) => void, disabled?: boolean }) => (
    <div className="w-full h-full flex items-center">
      {!isViewMode ? (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isViewMode}
          className="w-full outline-none bg-transparent print:hidden font-sans px-2"
        />
      ) : (
        <div className="w-full outline-none bg-transparent print:hidden font-sans px-2">{value ? format(new Date(value), "yyyy-MM-dd") : ""}</div>
      )}
      <div className="hidden print:block w-full px-2">{value ? format(new Date(value), "dd/MM/yyyy") : ""}</div>
    </div>
  );

  const InputTime = ({ value, onChange, disabled }: { value: string, onChange: (v: string) => void, disabled?: boolean }) => (
    <div className="w-full h-full flex items-center">
      {!isViewMode ? (
        <IncidentTimeSelect
          value={value}
          onChange={onChange}
          disabled={disabled || isViewMode}
          className="print:hidden w-full px-2"
        />
      ) : (
        <div className="w-full outline-none bg-transparent print:hidden font-sans px-2">
          {formatIncidentTimeDisplay(value) || value}
        </div>
      )}
      <div className="hidden print:block w-full px-2">
        {formatIncidentTimeDisplay(value) || value}
      </div>
    </div>
  );

  const CheckboxSquare = ({ checked, onClick, label }: { checked: boolean, onClick?: () => void, label?: string }) => (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 border-[2px] border-black flex items-center justify-center text-lg font-bold ${isViewMode ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
        onClick={onClick}
      >
        {checked && '✓'}
      </div>
      {label && <span className="text-sm">{label}</span>}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-hidden font-sans print:bg-white text-black">
      {/* Top Bar (Hidden during print) */}
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between flex-shrink-0 print:hidden z-10 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">SEHSCT Incident Report Form</h2>
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
        <div id="printable-form" ref={printRef} className="bg-white p-8 shadow-sm border mx-auto max-w-4xl print:shadow-none print:border-none print:p-4 text-black text-[14px] leading-tight">

          <div className="flex justify-between items-start mb-6">
            <div className="w-[30%]">
              <img src="/SEHSCTmainlogo.jpg" alt="SEHSCT Logo" className="w-full h-auto object-contain" />
            </div>
            <div className="w-[70%] text-center">
              <h1 className="font-bold text-[20px] mb-1">INCIDENT FORM</h1>
              <p className="text-[12px] font-bold">for use by all Independent Sector Providers that hold a<br />Contract with the South Eastern Health & Social Care Trust</p>
            </div>
            <div className="absolute top-8 right-8 print:top-4 print:right-4 border border-black p-2 bg-white w-40 h-20 text-[11px]">
              For Office Use Only<br />DATIX Ref:<br />
              <input
                type="text"
                className="w-full border-none outline-none mt-4 bg-transparent"
                value={formData.datixRef}
                onChange={e => handleChange('datixRef', e.target.value)}
                disabled={isSubmitting || isViewMode}
              />
            </div>
          </div>

          <div className="flex gap-4 mb-4 text-[11px] leading-tight">
            <div className="w-1/2">
              <ul className="list-disc pl-4 space-y-1">
                <li>Use this form to report ALL incidents involving a service user/resident</li>
                <li>Complete a separate form for each service user directly involved/affected</li>
                <li>To be completed and forwarded within 2 working days of the incident occurring</li>
              </ul>
            </div>
            <div className="w-1/2">
              <ul className="list-disc pl-4 space-y-1">
                <li>Forms must be typed and not handwritten</li>
                <li>Use Encryption when forwarding to the Trust by email</li>
                <li>Record only known facts – do not record opinions</li>
                <li>Email the completed notification to the Trust Key Worker and copy to <a href="mailto:Indsector.governance@setrust.hscni.net" className="text-blue-600 underline">Indsector.governance@setrust.hscni.net</a></li>
              </ul>
            </div>
          </div>

          <h2 className="font-bold text-lg mb-2">SECTION 1 & 2</h2>

          <div className="border-[1px] border-black">
            {/* Row A */}
            <div className="bg-black text-white px-2 py-1 font-bold">A – Where and when did the incident occur?</div>
            <div className="flex border-b-[1px] border-black h-10">
              <div className="w-1/4 border-r-[1px] border-black flex items-center px-2 font-bold">Date of Incident</div>
              <div className="w-1/4 border-r-[1px] border-black flex items-center">
                <InputDate value={formData.incidentDate} onChange={v => handleChange('incidentDate', v)} />
              </div>
              <div className="w-1/4 border-r-[1px] border-black flex items-center px-2 font-bold">Time of Incident</div>
              <div className="w-1/4 flex items-center">
                <InputTime value={formData.incidentTime} onChange={v => handleChange('incidentTime', v)} />
              </div>
            </div>
            <div className="flex border-b-[1px] border-black">
              <div className="w-1/2 border-r-[1px] border-black">
                <div className="px-2 py-1 font-bold border-b-[1px] border-black bg-gray-50">Primary Location e.g. service users home<br /><span className="text-[10px] font-normal">(including Address & Postcode if appropriate)</span></div>
                <textarea className="w-full h-16 p-2 border-none outline-none resize-none" value={formData.primaryLocation} onChange={e => handleChange('primaryLocation', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
              <div className="w-1/2">
                <div className="px-2 py-1 font-bold border-b-[1px] border-black bg-gray-50">Exact location</div>
                <textarea className="w-full h-16 p-2 border-none outline-none resize-none" value={formData.exactLocation} onChange={e => handleChange('exactLocation', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            {/* Row B */}
            <div className="bg-black text-white px-2 py-1 font-bold">B – Outline apparent circumstances of the incident (give brief factual objective details)</div>
            <div className="px-2 py-1 font-bold bg-gray-200 border-b-[1px] border-black text-[12px]">Outline what happened together with any relevant circumstances. Where applicable, what was the person doing? Were there any contributory factors? If any property/equipment/medication involved, give details in section F below.</div>
            <div className="border-b-[1px] border-black">
              <textarea className="w-full h-40 p-2 border-none outline-none resize-none" value={formData.incidentDescription} onChange={e => handleChange('incidentDescription', e.target.value)} disabled={isSubmitting || isViewMode} />
            </div>
            <div className="flex border-b-[1px] border-black h-10 items-center">
              <div className="flex-1 px-2 font-bold text-[12px]">Was the incident caused as a result of behaviours of concern related to a specific illness or diagnosis?</div>
              <div className="flex gap-4 px-4 h-full border-l-[1px] border-black items-center">
                <CheckboxSquare checked={formData.causedByBehaviors === true} onClick={() => !isViewMode && handleChange('causedByBehaviors', true)} label="Yes" />
                <CheckboxSquare checked={formData.causedByBehaviors === false} onClick={() => !isViewMode && handleChange('causedByBehaviors', false)} label="No" />
              </div>
            </div>
            <div className="flex border-b-[1px] border-black h-10 items-center">
              <div className="flex-1 px-2 font-bold text-[12px]">If yes, is this documented in their Care Plan?</div>
              <div className="flex gap-4 px-4 h-full border-l-[1px] border-black items-center">
                <CheckboxSquare checked={formData.documentedInCarePlan === true} onClick={() => !isViewMode && handleChange('documentedInCarePlan', true)} label="Yes" />
                <CheckboxSquare checked={formData.documentedInCarePlan === false} onClick={() => !isViewMode && handleChange('documentedInCarePlan', false)} label="No" />
              </div>
            </div>
            <div className="flex h-10 items-center border-b-[1px] border-black">
              <div className="w-[40%] px-2 font-bold text-[12px]">What was the apparent cause of injury?<br /><span className="text-[10px] font-normal">e.g. slip, trip, fall, physical assault etc.</span></div>
              <div className="flex-1 h-full border-l-[1px] border-black">
                <input type="text" className="w-full h-full p-2 border-none outline-none bg-transparent" value={formData.apparentCauseOfInjury} onChange={e => handleChange('apparentCauseOfInjury', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            {/* Row C */}
            <div className="bg-black text-white px-2 py-1 font-bold">C(i) – Outline any remedial or other action taken following the incident (give brief factual details)</div>
            <div className="border-b-[1px] border-black">
              <textarea className="w-full h-24 p-2 border-none outline-none resize-none" value={formData.remedialAction} onChange={e => handleChange('remedialAction', e.target.value)} disabled={isSubmitting || isViewMode} />
            </div>
            <div className="bg-black text-white px-2 py-1 font-bold">C(ii) – Actions taken to Prevent Recurrence</div>
            <div className="border-b-[1px] border-black">
              <textarea className="w-full h-24 p-2 border-none outline-none resize-none" value={formData.preventionActions} onChange={e => handleChange('preventionActions', e.target.value)} disabled={isSubmitting || isViewMode} />
            </div>
            <div className="bg-black text-white px-2 py-1 font-bold">C(iii) – Date service user’s Risk Assessment/Care Plan updated following incident (where applicable)</div>
            <div className="border-b-[1px] border-black h-12">
              <InputDate value={formData.riskAssessmentUpdateDate} onChange={v => handleChange('riskAssessmentUpdateDate', v)} />
            </div>

            {/* Row D */}
            <div className="bg-black text-white px-2 py-1 font-bold">D(i) – Was any equipment involved? If so please complete the following details as far as possible:</div>
            <div className="flex border-b-[1px] border-black p-2 gap-4">
              <CheckboxSquare checked={formData.equipmentInvolved === true} onClick={() => !isViewMode && handleChange('equipmentInvolved', true)} label="Yes (Specify)" />
              <input type="text" className="flex-1 border-b border-black outline-none px-1" value={formData.equipmentDetails} onChange={e => handleChange('equipmentDetails', e.target.value)} disabled={isSubmitting || isViewMode} />
              <CheckboxSquare checked={formData.equipmentInvolved === false} onClick={() => !isViewMode && handleChange('equipmentInvolved', false)} label="No" />
            </div>
            <div className="flex border-b-[1px] border-black p-2 gap-4 items-center">
              <span className="text-[12px] font-bold">If yes, where relevant, have you reported to NIAC (NI Adverse Incident Centre)</span>
              <CheckboxSquare checked={formData.reportedToNIAC === true} onClick={() => !isViewMode && handleChange('reportedToNIAC', true)} label="Yes" />
              <CheckboxSquare checked={formData.reportedToNIAC === false} onClick={() => !isViewMode && handleChange('reportedToNIAC', false)} label="No" />
            </div>
            <div className="bg-black text-white px-2 py-1 font-bold">D(ii) – Was any property involved? (Home or personal possessions)? If so, please specify:</div>
            <div className="flex p-2 gap-4 items-start h-20">
              <div className="flex flex-col gap-2">
                <CheckboxSquare checked={formData.propertyInvolved === true} onClick={() => !isViewMode && handleChange('propertyInvolved', true)} label="Yes" />
                <CheckboxSquare checked={formData.propertyInvolved === false} onClick={() => !isViewMode && handleChange('propertyInvolved', false)} label="No" />
              </div>
              <textarea className="flex-1 h-full p-2 border border-gray-300 outline-none resize-none" value={formData.propertyDetails} onChange={e => handleChange('propertyDetails', e.target.value)} disabled={isSubmitting || isViewMode} />
            </div>
          </div>

          <div className="text-right text-[10px] my-2">Page | 1</div>
          <p className="text-[10px] text-gray-500 mb-8 italic">Independent Sector Provider Incidents Form (Draft Version V4 May 2024)</p>

          <div className="page-break my-12 opacity-0 print:my-0">&nbsp;</div>

          {/* PAGE 2 */}
          <div className="border-[1px] border-black mt-4">
            <div className="bg-black text-white px-2 py-1 font-bold">E – Persons notified including designation / relationship to Service User</div>
            <div className="border-b-[1px] border-black overflow-hidden">
              <textarea className="w-full h-24 p-2 border-none outline-none resize-none" value={formData.personsNotified} onChange={e => handleChange('personsNotified', e.target.value)} disabled={isSubmitting || isViewMode} />
            </div>

            <div className="bg-black text-white px-2 py-1 font-bold">F – Individual involved in or affected by the incident?</div>
            <div className="flex border-b-[1px] border-black h-12">
              <div className="w-[30%] border-r-[1px] border-black flex flex-col justify-center px-2 bg-gray-200">
                <span className="font-bold">H&C Number</span>
                <span className="text-[10px]">(Mandatory)</span>
              </div>
              <div className="w-[70%]">
                <input type="text" className="w-full h-full p-2 border-none outline-none bg-transparent" value={formData.hcNumber} onChange={e => handleChange('hcNumber', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
            <div className="flex border-b-[1px] border-black h-12">
              <div className="w-[30%] border-r-[1px] border-black flex items-center px-2 font-bold bg-gray-50">Gender</div>
              <div className="w-[40%] border-r-[1px] border-black flex items-center px-4 gap-4">
                <CheckboxSquare checked={formData.gender === 'Male'} onClick={() => !isViewMode && handleChange('gender', 'Male')} label="Male" />
                <CheckboxSquare checked={formData.gender === 'Female'} onClick={() => !isViewMode && handleChange('gender', 'Female')} label="Female" />
              </div>
              <div className="w-[10%] border-r-[1px] border-black flex items-center px-2 font-bold bg-gray-200">DOB</div>
              <div className="w-[20%]">
                <InputDate value={formData.dob} onChange={v => handleChange('dob', v)} />
              </div>
            </div>
            <div className="flex border-b-[1px] border-black h-12">
              <div className="w-[30%] border-r-[1px] border-black flex flex-col justify-center px-2 bg-gray-50">
                <span className="font-bold">Full Name of</span>
                <span className="font-bold">Service User <span className="font-normal text-[10px]">(Not initials)</span></span>
              </div>
              <div className="w-[70%]">
                <input type="text" className="w-full h-full p-2 border-none outline-none bg-transparent font-bold text-lg" value={formData.serviceUserFullName} onChange={e => handleChange('serviceUserFullName', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
            <div className="flex border-b-[1px] border-black h-12">
              <div className="w-[30%] border-r-[1px] border-black flex flex-col justify-center px-2 bg-gray-50 leading-tight">
                <span className="font-bold">Service User Address</span>
                <span className="text-[10px]">(if different from provider address above)</span>
              </div>
              <div className="w-[70%]">
                <input type="text" className="w-full h-full p-2 border-none outline-none bg-transparent" value={formData.serviceUserAddress} onChange={e => handleChange('serviceUserAddress', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
            <div className="flex border-b-[1px] border-black h-12">
              <div className="w-[30%] border-r-[1px] border-black flex flex-col justify-center px-2 bg-gray-50 leading-tight">
                <span className="font-bold">Name of Trust Key</span>
                <span className="font-bold">Worker & Designation</span>
              </div>
              <div className="w-[70%] flex h-full">
                <div className="w-1/2 border-r border-black flex items-center px-2">
                  <span className="text-[10px] mr-2">Name:</span>
                  <input type="text" className="flex-1 h-full outline-none bg-transparent" value={formData.trustKeyWorkerName} onChange={e => handleChange('trustKeyWorkerName', e.target.value)} disabled={isSubmitting || isViewMode} />
                </div>
                <div className="w-1/2 flex items-center px-2">
                  <span className="text-[10px] mr-2">Designation:</span>
                  <input type="text" className="flex-1 h-full outline-none bg-transparent" value={formData.trustKeyWorkerDesignation} onChange={e => handleChange('trustKeyWorkerDesignation', e.target.value)} disabled={isSubmitting || isViewMode} />
                </div>
              </div>
            </div>

            <div className="bg-black text-white px-2 py-1 font-bold">G – Did the person/individual suffer an injury as a result of the incident?</div>
            <div className="flex border-b-[1px] border-black p-2 items-center gap-4 h-10">
              <CheckboxSquare checked={formData.injurySuffered === true} onClick={() => !isViewMode && handleChange('injurySuffered', true)} label="Yes – Complete below" />
              <CheckboxSquare checked={formData.injurySuffered === false} onClick={() => !isViewMode && handleChange('injurySuffered', false)} label="No" />
            </div>
            <div className="flex border-b-[1px] border-black h-12">
              <div className="w-[40%] border-r-[1px] border-black flex flex-col justify-center px-2 bg-gray-50 leading-tight">
                <span className="font-bold">Which part of the body was affected?</span>
                <span className="text-[10px]">e.g. back, left shoulder, right eye, neck, trunk etc.</span>
              </div>
              <div className="flex-1">
                <input type="text" className="w-full h-full p-2 border-none outline-none bg-transparent" value={formData.bodyPartAffected} onChange={e => handleChange('bodyPartAffected', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
            <div className="flex border-b-[1px] border-black h-12">
              <div className="w-[40%] border-r-[1px] border-black flex flex-col justify-center px-2 bg-gray-50 leading-tight">
                <span className="font-bold">What nature of injury was sustained?</span>
                <span className="text-[10px]">e.g. abrasion, bruising, laceration, sprain/strain, fracture etc.</span>
              </div>
              <div className="flex-1">
                <input type="text" className="w-full h-full p-2 border-none outline-none bg-transparent" value={formData.natureOfInjury} onChange={e => handleChange('natureOfInjury', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="bg-black text-white px-2 py-1 font-bold">H – Did the person receive any attention (e.g. treatment, advice, counselling, etc.)?</div>
            <div className="p-2 space-y-2">
              <div className="flex gap-4 flex-wrap">
                {['None', 'First aid', 'A&E', 'Seen by GP', 'Yes'].map(opt => (
                  <CheckboxSquare key={opt} checked={formData.attentionReceived.includes(opt)} onClick={() => toggleAttentionReceived(opt)} label={opt} />
                ))}
              </div>
              <div className="flex items-center gap-4">
                <CheckboxSquare checked={formData.attentionReceived.includes('Other')} onClick={() => toggleAttentionReceived('Other')} label="Other (specify):" />
                <input
                  type="text"
                  className="flex-1 border-b border-black outline-none h-6 bg-transparent"
                  value={formData.attentionOther}
                  onChange={e => handleChange('attentionOther', e.target.value)}
                  disabled={isSubmitting || isViewMode || !formData.attentionReceived.includes('Other')}
                />
              </div>
            </div>
          </div>

          <h2 className="font-bold text-lg mt-6 mb-2">SECTION 3</h2>
          <div className="border-[1px] border-black">
            <div className="bg-black text-white px-2 py-1 font-bold">A – Name and designation of any staff member/s or any other Service User/s involved.</div>
            <div className="px-2 py-0.5 bg-gray-200 border-b-[1px] border-black font-bold text-[12px]">If other Service User/s involved please include DOB.</div>
            <div className="border-b-[1px] border-black">
              <textarea className="w-full h-40 p-2 border-none outline-none resize-none" value={formData.staffInvolved} onChange={e => handleChange('staffInvolved', e.target.value)} disabled={isSubmitting || isViewMode} />
            </div>
            <div className="bg-black text-white px-2 py-1 font-bold">B – Name, designation and contact details of any witnesses</div>
            <div>
              <textarea className="w-full h-24 p-2 border-none outline-none resize-none" value={formData.witnessDetails} onChange={e => handleChange('witnessDetails', e.target.value)} disabled={isSubmitting || isViewMode} />
            </div>
          </div>

          <h2 className="font-bold text-lg mt-6 mb-2">SECTION 4</h2>
          <div className="border-[1px] border-black">
            <div className="bg-black text-white px-2 py-1 font-bold">Provider Information</div>
            <div className="flex border-b-[1px] border-black h-16">
              <div className="w-[30%] border-r-[1px] border-black flex flex-col justify-center px-2 bg-gray-50 font-bold leading-tight">
                <span>Provider Name</span>
                <span>& Address</span>
              </div>
              <div className="w-[70%]">
                <textarea className="w-full h-full p-2 border-none outline-none bg-transparent resize-none" value={formData.providerName + "\n" + formData.providerAddress} onChange={e => {
                  const lines = e.target.value.split("\n");
                  handleChange('providerName', lines[0] || "");
                  handleChange('providerAddress', lines.slice(1).join("\n"));
                }} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
            <div className="flex border-b-[1px] border-black h-12">
              <div className="w-[30%] border-r-[1px] border-black flex items-center px-2 font-bold bg-gray-50 leading-tight">
                <span>Group name if applicable</span>
              </div>
              <div className="w-[70%]">
                <input type="text" className="w-full h-full p-2 border-none outline-none bg-transparent" value={formData.groupName} onChange={e => handleChange('groupName', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
            <div className="flex border-b-[1px] border-black h-10">
              <div className="w-[30%] border-r-[1px] border-black flex items-center px-2 font-bold bg-gray-50">Service Name</div>
              <div className="w-[70%]">
                <input type="text" className="w-full h-full p-2 border-none outline-none bg-transparent" value={formData.serviceName} onChange={e => handleChange('serviceName', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
            <div className="flex h-16">
              <div className="w-[30%] border-r-[1px] border-black flex flex-col justify-center px-2 bg-gray-50 leading-tight font-bold">
                <span>Type of Service</span>
                <span className="font-normal text-[10px] italic">(i.e. Day Care, Supported living, etc)</span>
              </div>
              <div className="w-[70%]">
                <input type="text" className="w-full h-full p-2 border-none outline-none bg-transparent" value={formData.typeOfService} onChange={e => handleChange('typeOfService', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
          </div>

          <div className="text-right text-[10px] my-2">Page | 2</div>
          <p className="text-[10px] text-gray-500 mb-8 italic">Independent Sector Provider Incidents Form (Draft Version V4 May 2024)</p>

          <div className="page-break my-12 opacity-0 print:my-0">&nbsp;</div>

          {/* PAGE 3 */}
          <h2 className="font-bold text-lg mt-6 mb-2">SECTION 5</h2>
          <div className="border-[1px] border-black">
            <div className="bg-black text-white px-2 py-1 font-bold leading-tight">
              F(iii) –If this incident involved medication, please record the name(s) and dose/quantity of each medication involved. If the medication incident occurred due to a Pharmacy related incident, please also give details of the relevant Pharmacy:
            </div>
            <div className="h-64">
              <textarea className="w-full h-full p-2 border-none outline-none resize-none" value={formData.medicationInvolved} onChange={e => handleChange('medicationInvolved', e.target.value)} disabled={isSubmitting || isViewMode} />
            </div>
          </div>

          <h2 className="font-bold text-lg mt-6 mb-2">SECTION 6</h2>
          <div className="border-[1px] border-black">
            <div className="bg-black text-white px-2 py-1 font-bold">A – Who identified the incident?</div>
            <div className="flex border-b-[1px] border-black h-10 items-center px-2 gap-40 bg-gray-200">
              <CheckboxSquare checked={formData.whoIdentified === 'Provider'} onClick={() => !isViewMode && handleChange('whoIdentified', 'Provider')} label="Identified by Provider" />
              <CheckboxSquare checked={formData.whoIdentified === 'Trust'} onClick={() => !isViewMode && handleChange('whoIdentified', 'Trust')} label="Identified by Trust" />
            </div>
            <div className="flex border-b-[1px] border-black">
              <div className="w-1/2 border-r-[1px] border-black">
                <div className="flex h-10 border-b border-black">
                  <div className="w-[40%] bg-gray-200 p-2 font-bold border-r border-black flex items-center">Name</div>
                  <div className="flex-1">
                    <input type="text" className="w-full h-full px-2 outline-none" value={formData.identifierName} onChange={e => handleChange('identifierName', e.target.value)} disabled={isSubmitting || isViewMode} />
                  </div>
                </div>
                <div className="flex h-10 border-b border-black">
                  <div className="w-[40%] bg-gray-200 p-2 font-bold border-r border-black flex items-center">Job Title:</div>
                  <div className="flex-1">
                    <input type="text" className="w-full h-full px-2 outline-none" value={formData.identifierJob} onChange={e => handleChange('identifierJob', e.target.value)} disabled={isSubmitting || isViewMode} />
                  </div>
                </div>
                <div className="flex h-10 border-b border-black">
                  <div className="w-[40%] bg-gray-200 p-2 font-bold border-r border-black flex items-center leading-tight">Telephone Number:</div>
                  <div className="flex-1">
                    <input type="text" className="w-full h-full px-2 outline-none" value={formData.identifierTel} onChange={e => handleChange('identifierTel', e.target.value)} disabled={isSubmitting || isViewMode} />
                  </div>
                </div>
                <div className="flex h-10">
                  <div className="w-[40%] bg-gray-200 p-2 font-bold border-r border-black flex items-center">Email:</div>
                  <div className="flex-1">
                    <input type="text" className="w-full h-full px-2 outline-none" value={formData.identifierEmail} onChange={e => handleChange('identifierEmail', e.target.value)} disabled={isSubmitting || isViewMode} />
                  </div>
                </div>
              </div>
              <div className="w-1/2">
                <div className="flex h-10 border-b border-black">
                  <div className="w-[40%] bg-gray-200 p-2 font-bold border-r border-black flex items-center leading-tight">Trust Staff Name:</div>
                  <div className="flex-1">
                    <input type="text" className="w-full h-full px-2 outline-none" value={formData.trustStaffName} onChange={e => handleChange('trustStaffName', e.target.value)} disabled={isSubmitting || isViewMode} />
                  </div>
                </div>
                <div className="flex h-10 border-b border-black">
                  <div className="w-[40%] bg-gray-200 p-2 font-bold border-r border-black flex items-center">Job Title:</div>
                  <div className="flex-1">
                    <input type="text" className="w-full h-full px-2 outline-none" value={formData.trustStaffJob} onChange={e => handleChange('trustStaffJob', e.target.value)} disabled={isSubmitting || isViewMode} />
                  </div>
                </div>
                <div className="flex h-10 border-b border-black">
                  <div className="w-[40%] bg-gray-200 p-2 font-bold border-r border-black flex items-center leading-tight">Telephone Number:</div>
                  <div className="flex-1">
                    <input type="text" className="w-full h-full px-2 outline-none" value={formData.trustStaffTel} onChange={e => handleChange('trustStaffTel', e.target.value)} disabled={isSubmitting || isViewMode} />
                  </div>
                </div>
                <div className="flex h-10">
                  <div className="w-[40%] bg-gray-200 p-2 font-bold border-r border-black flex items-center">Email:</div>
                  <div className="flex-1">
                    <input type="text" className="w-full h-full px-2 outline-none" value={formData.trustStaffEmail} onChange={e => handleChange('trustStaffEmail', e.target.value)} disabled={isSubmitting || isViewMode} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex h-12">
              <div className="w-[40%] bg-black text-white p-2 font-bold flex items-center leading-tight">
                B - Please record email address for returning encrypted form when signed off in Trust:
              </div>
              <div className="flex-1">
                <input type="text" className="w-full h-full px-2 outline-none" value={formData.encryptedReturnEmail} onChange={e => handleChange('encryptedReturnEmail', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
          </div>

          <div className="text-right text-[10px] my-2">Page | 3</div>
          <p className="text-[10px] text-gray-500 mb-8 italic">Independent Sector Provider Incidents Form (Draft Version V4 May 2024)</p>
          <div className="page-break my-12 opacity-0 print:my-0">&nbsp;</div>

          {/* PAGE 4 */}
          <div className="text-center font-bold mb-2">This section is required to be completed by the Trust Key Worker</div>
          <h2 className="font-bold text-lg mb-2">SECTION 7</h2>
          <div className="border-[1px] border-black">
            <div className="bg-black text-white text-center py-1 font-bold">Outcome / Comments</div>
            <div className="bg-black text-white px-2 py-0.5 text-[12px] font-bold">I have reviewed the Provider’s incident investigation and action(s) taken or planned and I agree:</div>

            {/* Outcome Row 1 */}
            <div className="flex border-b border-black">
              <div className="w-10 border-r border-black p-2 flex justify-center items-start pt-3">1.</div>
              <div className="flex-1 border-r border-black p-2">
                <div className="flex gap-2">
                  <CheckboxSquare checked={formData.outcomeAgreement === '1'} onClick={() => !isViewMode && handleChange('outcomeAgreement', '1')} label="No further action by Trust (please provide rationale):" />
                </div>
                <textarea className="w-full h-32 mt-2 border-none outline-none resize-none" value={formData.outcomeRationale} onChange={e => handleChange('outcomeRationale', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
              <div className="w-[20%]"></div>
            </div>
            {/* Outcome Row 2 */}
            <div className="flex border-b border-black">
              <div className="w-10 border-r border-black p-2 flex justify-center items-start pt-3">2.</div>
              <div className="flex-1 border-r border-black p-2">
                <div className="flex gap-2">
                  <CheckboxSquare checked={formData.outcomeAgreement === '2'} onClick={() => !isViewMode && handleChange('outcomeAgreement', '2')} label="Further action required by Provider (please detail below):" />
                </div>
                <textarea className="w-full h-24 mt-2 border-none outline-none resize-none" value={formData.furtherActionProviderDetails} onChange={e => handleChange('furtherActionProviderDetails', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
              <div className="w-[20%] flex flex-col">
                <div className="h-1/2 border-b border-black p-2 text-[10px] underline">Date Action By:</div>
                <input type="text" className="h-1/2 w-full px-2 outline-none" value={formData.furtherActionProviderBy} onChange={e => handleChange('furtherActionProviderBy', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
            {/* Outcome Row 3 */}
            <div className="flex border-b border-black h-32">
              <div className="w-10 border-r border-black p-2 flex justify-center items-start pt-3">3.</div>
              <div className="flex-1 border-r border-black p-2">
                <div className="flex gap-2">
                  <CheckboxSquare checked={formData.outcomeAgreement === '3'} onClick={() => !isViewMode && handleChange('outcomeAgreement', '3')} label="Further action/follow up by Trust (please detail below):" />
                </div>
                <textarea className="w-full h-16 mt-2 border-none outline-none resize-none" value={formData.furtherActionTrustDetails} onChange={e => handleChange('furtherActionTrustDetails', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
              <div className="w-[20%] flex flex-col">
                <div className="h-1/2 border-b border-black p-2 text-[10px] underline">Date Action By:</div>
                <input type="text" className="h-1/2 w-full px-2 outline-none" value={formData.furtherActionTrustBy} onChange={e => handleChange('furtherActionTrustBy', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            <div className="bg-black text-white px-2 py-1 font-bold">Lessons Learned <span className="font-normal text-[11px]">(please detail below)</span></div>
            <div className="border-b border-black h-32">
              <textarea className="w-full h-full p-2 outline-none resize-none" value={formData.lessonsLearned} onChange={e => handleChange('lessonsLearned', e.target.value)} disabled={isSubmitting || isViewMode} />
            </div>

            <div className="bg-black text-white px-2 py-1 font-bold">Final Review and Outcome <span className="font-normal text-[11px]">(please detail below)</span></div>
            <div className="flex h-64">
              <div className="w-[45%] border-r border-black p-2 space-y-4">
                <div className="space-y-1">
                  <p className="font-bold">Are all issues satisfactorily dealt with?</p>
                  <div className="flex gap-4 px-2">
                    <CheckboxSquare checked={formData.allIssuesDealt === true} onClick={() => !isViewMode && handleChange('allIssuesDealt', true)} label="Yes" />
                    <CheckboxSquare checked={formData.allIssuesDealt === false} onClick={() => !isViewMode && handleChange('allIssuesDealt', false)} label="No" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-bold">Is client and/or family satisfied with the outcome?</p>
                  <div className="flex gap-4 px-2">
                    <CheckboxSquare checked={formData.clientSatisfied === true} onClick={() => !isViewMode && handleChange('clientSatisfied', true)} label="Yes" />
                    <CheckboxSquare checked={formData.clientSatisfied === false} onClick={() => !isViewMode && handleChange('clientSatisfied', false)} label="No" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-bold">All recommendations implemented?</p>
                  <div className="flex gap-4 flex-wrap px-2">
                    <CheckboxSquare checked={formData.recommendationsImplemented === 'Yes'} onClick={() => !isViewMode && handleChange('recommendationsImplemented', 'Yes')} label="Yes" />
                    <CheckboxSquare checked={formData.recommendationsImplemented === 'No'} onClick={() => !isViewMode && handleChange('recommendationsImplemented', 'No')} label="No" />
                    <CheckboxSquare checked={formData.recommendationsImplemented === 'NA'} onClick={() => !isViewMode && handleChange('recommendationsImplemented', 'NA')} label="NA" />
                  </div>
                </div>
                <div className="space-y-1 pt-4">
                  <p className="font-bold">Case ready for closure?</p>
                  <div className="flex gap-4 px-2">
                    <CheckboxSquare checked={formData.readyForClosure === true} onClick={() => !isViewMode && handleChange('readyForClosure', true)} label="Yes" />
                    <CheckboxSquare checked={formData.readyForClosure === false} onClick={() => !isViewMode && handleChange('readyForClosure', false)} label="No" />
                  </div>
                </div>
              </div>
              <div className="flex-1 p-2">
                <div className="font-bold border-b border-black mb-1">If the response is no, please give details?</div>
                <textarea className="w-full h-full border-none outline-none resize-none" value={formData.finalReviewDetails} onChange={e => handleChange('finalReviewDetails', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>

            {/* Signatures */}
            <div className="flex h-10 border-t border-black">
              <div className="w-[45%] bg-black text-white p-2 font-bold flex items-center">Print Key Worker Name & Designation</div>
              <div className="flex-1">
                <input type="text" className="w-full h-full px-2 outline-none" value={formData.keyWorkerNameDesignation} onChange={e => handleChange('keyWorkerNameDesignation', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
            <div className="flex h-10 border-t border-black">
              <div className="w-[45%] bg-black text-white p-2 font-bold flex items-center">Key Worker Signature</div>
              <div className="flex-1">
                <input type="text" className="w-full h-full px-2 outline-none" value={formData.keyWorkerSignature} onChange={e => handleChange('keyWorkerSignature', e.target.value)} disabled={isSubmitting || isViewMode} />
              </div>
            </div>
            <div className="flex h-10 border-t border-black">
              <div className="w-[45%] bg-black text-white p-2 font-bold flex items-center">Date Closed by Trust</div>
              <div className="flex-1">
                <InputDate value={formData.dateClosedByTrust} onChange={v => handleChange('dateClosedByTrust', v)} />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-bold italic underline">Approval By Key Workers Line Manager</h3>
            <div className="border border-black">
              <div className="flex h-10">
                <div className="w-[45%] bg-black text-white p-2 font-bold flex items-center">Print Name & Designation</div>
                <div className="flex-1">
                  <input type="text" className="w-full h-full px-2 outline-none" value={formData.lineManagerNameDesignation} onChange={e => handleChange('lineManagerNameDesignation', e.target.value)} disabled={isSubmitting || isViewMode} />
                </div>
              </div>
              <div className="flex h-10 border-t border-black">
                <div className="w-[45%] bg-black text-white p-2 font-bold flex items-center">Signature</div>
                <div className="flex-1">
                  <input type="text" className="w-full h-full px-2 outline-none" value={formData.lineManagerSignature} onChange={e => handleChange('lineManagerSignature', e.target.value)} disabled={isSubmitting || isViewMode} />
                </div>
              </div>
              <div className="flex h-10 border-t border-black">
                <div className="w-[45%] bg-black text-white p-2 font-bold flex items-center">Date approved</div>
                <div className="flex-1">
                  <InputDate value={formData.dateApproved} onChange={v => handleChange('dateApproved', v)} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-right text-[10px] my-2">Page | 4</div>
          <p className="text-[10px] text-gray-500 mb-4 italic">Independent Sector Provider Incidents Form (Draft Version V4 May 2024)</p>

        </div>
      </div>
    </div>
  );
}
