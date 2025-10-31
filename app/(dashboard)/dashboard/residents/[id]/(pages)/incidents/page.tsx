"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  TrendingDown,
  AlertTriangle,
  FileText,
  Calendar,
  Clock,
  User,
  Plus,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Map,
  ClipboardCheck,
  FileBarChart,
  Send
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { ComprehensiveIncidentForm } from "./components/comprehensive-incident-form";
import { NHSReportForm } from "./components/nhs-report-form";
import { BHSCTReportForm } from "./components/bhsct-report-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type IncidentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function IncidentsPage({ params }: IncidentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [showReportForm, setShowReportForm] = React.useState(false);
  const [selectedIncident, setSelectedIncident] = React.useState<any>(null);
  const [showViewDialog, setShowViewDialog] = React.useState(false);
  const [showNHSReportForm, setShowNHSReportForm] = React.useState(false);
  const [nhsReportIncident, setNhsReportIncident] = React.useState<any>(null);
  const [showNHSReportView, setShowNHSReportView] = React.useState(false);
  const [selectedNHSReport, setSelectedNHSReport] = React.useState<any>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [user, setUser] = React.useState<any>(null);
  const itemsPerPage = 5;

  // NHS Trust Picker State
  const [showTrustPicker, setShowTrustPicker] = React.useState(false);
  const [trustPickerIncident, setTrustPickerIncident] = React.useState<any>(null);
  const [selectedTrust, setSelectedTrust] = React.useState<string>("");
  const [showTrustForm, setShowTrustForm] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  const incidents = useQuery(api.incidents.getByResident, {
    residentId: id as Id<"residents">
  });

  const incidentStats = useQuery(api.incidents.getIncidentStats, {
    residentId: id as Id<"residents">
  });

  // Get trust incident reports for all incidents
  const trustReports = useQuery(api.trustIncidentReports.getByResidentId, {
    residentId: id as Id<"residents">
  });

  // Get BHSCT reports for all incidents
  const bhsctReports = useQuery(api.bhsctReports.getByResident, {
    residentId: id as Id<"residents">
  });

  // Get user info
  React.useEffect(() => {
    const getUser = async () => {
      try {
        const { authClient } = await import("@/lib/auth-client");
        const session = await authClient.getSession();
        if (session?.data) {
          setUser(session.data);
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    getUser();
  }, []);

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const handleViewIncident = (incidentId: string) => {
    const incident = incidents?.find(i => i._id === incidentId);
    if (incident) {
      setSelectedIncident(incident);
      setShowViewDialog(true);
    }
  };

  const handleDownloadIncident = async (incidentId: string) => {
    try {
      const incident = incidents?.find(i => i._id === incidentId);
      if (!incident) {
        toast.error("Incident not found");
        return;
      }

      // Generate PDF content
      const pdfContent = generateIncidentPDF(incident);

      // Create a blob and download
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-report-${incident.date}-${incidentId.slice(-6)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Incident report downloaded successfully");
    } catch (error) {
      console.error("Error downloading incident:", error);
      toast.error("Failed to download incident report");
    }
  };

  const handleNHSReport = (incidentId: string) => {
    const incident = incidents?.find(i => i._id === incidentId);
    if (!incident) {
      toast.error("Incident not found");
      return;
    }

    // Open trust picker dialog instead of going directly to form
    setTrustPickerIncident(incident);
    setShowTrustPicker(true);
  };

  const handleTrustSelected = (trust: string) => {
    setSelectedTrust(trust);
    setShowTrustPicker(false);
    setShowTrustForm(true);
  };

  const handleCloseTrustForm = () => {
    setShowTrustForm(false);
    setSelectedTrust("");
    setTrustPickerIncident(null);
  };

  const handleNHSReportCreated = (reportId: string) => {
    // Optionally download the NHS report immediately after creation
    const incident = nhsReportIncident;
    if (incident) {
      const trustReport = trustReports?.find(r => r.incidentId === incident._id && r.reportType === "nhs");
      if (trustReport) {
        generateAndDownloadNHSReport(incident, trustReport);
      }
    }
  };

  const generateAndDownloadNHSReport = async (incident: any, trustReport: any) => {
    try {
      // Check if it's a BHSCT report
      const isBHSCT = trustReport.reportType === "bhsct";

      toast.loading(`Generating ${isBHSCT ? 'BHSCT' : 'NHS'} report PDF...`);

      // Call the PDF generation API
      const response = await fetch('/api/pdf/nhs-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incident,
          trustReport,
          resident,
          isBHSCT
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = isBHSCT
        ? `bhsct-report-${incident.date}-${incident._id.slice(-6)}.pdf`
        : `nhs-report-${incident.date}-${incident._id.slice(-6)}.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success(`${isBHSCT ? 'BHSCT' : 'NHS'} report PDF downloaded successfully`);
    } catch (error) {
      console.error('Error generating NHS report PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate NHS report PDF');
    }
  };

  const handleBodyMap = (incidentId: string) => {
    const incident = incidents?.find(i => i._id === incidentId);
    if (!incident) {
      toast.error("Incident not found");
      return;
    }

    // For now, we'll show a message. In production, this would open a body map interface
    toast.info("Body map feature will open an interactive body diagram to mark injury locations");
    
    // You could navigate to a body map page or open a dialog
    // router.push(`/dashboard/residents/${id}/incidents/${incidentId}/body-map`);
  };

  const handlePS1Report = async (incidentId: string) => {
    try {
      const incident = incidents?.find(i => i._id === incidentId);
      if (!incident) {
        toast.error("Incident not found");
        return;
      }

      // Generate PS1 (Patient Safety Incident) report content
      const ps1Content = generatePS1Report(incident);

      // Create a blob and download
      const blob = new Blob([ps1Content], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ps1-report-${incident.date}-${incidentId.slice(-6)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("PS1 report generated successfully");
    } catch (error) {
      console.error("Error generating PS1 report:", error);
      toast.error("Failed to generate PS1 report");
    }
  };

  const generateIncidentPDF = (incident: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Incident Report - ${incident.date}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 20px; }
            .section { margin-bottom: 20px; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .header { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Incident Report</h1>
            <div class="field">
              <span class="label">Resident:</span>
              <span class="value">${fullName}</span>
            </div>
            <div class="field">
              <span class="label">Report Date:</span>
              <span class="value">${incident.date} ${incident.time}</span>
            </div>
          </div>
          
          <div class="section">
            <h2>Incident Details</h2>
            <div class="field">
              <span class="label">Type:</span>
              <span class="value">${incident.incidentTypes?.join(", ") || "N/A"}</span>
            </div>
            <div class="field">
              <span class="label">Level:</span>
              <span class="value">${incident.incidentLevel?.replace("_", " ").toUpperCase() || "N/A"}</span>
            </div>
            <div class="field">
              <span class="label">Location:</span>
              <span class="value">${incident.homeName} - ${incident.unit}</span>
            </div>
          </div>

          <div class="section">
            <h2>Description</h2>
            <p>${incident.detailedDescription || "No description provided"}</p>
          </div>

          <div class="section">
            <h2>Injured Person</h2>
            <div class="field">
              <span class="label">Name:</span>
              <span class="value">${incident.injuredPersonFirstName} ${incident.injuredPersonSurname}</span>
            </div>
            <div class="field">
              <span class="label">DOB:</span>
              <span class="value">${incident.injuredPersonDOB}</span>
            </div>
            <div class="field">
              <span class="label">Status:</span>
              <span class="value">${incident.injuredPersonStatus?.join(", ") || "N/A"}</span>
            </div>
          </div>

          ${incident.treatmentTypes && incident.treatmentTypes.length > 0 ? `
          <div class="section">
            <h2>Treatment</h2>
            <div class="field">
              <span class="label">Types:</span>
              <span class="value">${incident.treatmentTypes.join(", ")}</span>
            </div>
            ${incident.treatmentDetails ? `
            <div class="field">
              <span class="label">Details:</span>
              <span class="value">${incident.treatmentDetails}</span>
            </div>
            ` : ''}
          </div>
          ` : ''}

          <div class="section">
            <h2>Report Completion</h2>
            <div class="field">
              <span class="label">Completed By:</span>
              <span class="value">${incident.completedByFullName}</span>
            </div>
            <div class="field">
              <span class="label">Job Title:</span>
              <span class="value">${incident.completedByJobTitle}</span>
            </div>
            <div class="field">
              <span class="label">Date Completed:</span>
              <span class="value">${incident.dateCompleted}</span>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const generateBHSCTReportPDF = (incident: any, report: any) => {
    // BHSCT Official Logo (simplified SVG version based on official branding)
    const bhsctLogo = `<svg width="280" height="80" viewBox="0 0 280 80" xmlns="http://www.w3.org/2000/svg">
      <!-- HSC Box with teal background -->
      <rect x="0" y="10" width="80" height="60" fill="#00A3A1" rx="4"/>
      <text x="40" y="35" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">HSC</text>
      <g transform="translate(15, 48)">
        <circle cx="8" cy="0" r="2" fill="white" opacity="0.8"/>
        <circle cx="14" cy="0" r="2" fill="white" opacity="0.8"/>
        <circle cx="20" cy="0" r="2" fill="white" opacity="0.8"/>
        <path d="M 5 0 Q 8 3 11 0" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>
        <path d="M 11 0 Q 14 3 17 0" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>
        <path d="M 17 0 Q 20 3 23 0" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>
      </g>
      <!-- Trust Name Text -->
      <text x="90" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#2C3E50">Belfast Health and</text>
      <text x="90" y="55" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#2C3E50">Social Care Trust</text>
    </svg>`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>BHSCT Incident Report - ${incident.date}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #333; line-height: 1.6; }
            .header { display: flex; align-items: center; justify-content: space-between; padding: 25px 20px; background: white; border-bottom: 4px solid #00A3A1; margin: -40px -40px 30px -40px; }
            .logo-section { display: flex; align-items: center; }
            .trust-badge { background: #00A3A1; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .section { margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: white; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: bold; color: #00A3A1; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #00A3A1; }
            .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
            .field { margin-bottom: 15px; }
            .field-label { font-weight: 600; color: #2C3E50; font-size: 13px; margin-bottom: 5px; display: block; }
            .field-value { color: #333; font-size: 14px; padding: 8px; background: #f8f9fa; border-radius: 4px; display: block; min-height: 20px; }
            .field-value.textarea { white-space: pre-wrap; min-height: 60px; }
            .info-box { background: #E6F7F7; padding: 15px; border-left: 4px solid #00A3A1; margin: 20px 0; border-radius: 4px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; font-size: 11px; color: #666; }
            .report-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .meta-item { background: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center; }
            .meta-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-value { font-size: 14px; font-weight: bold; color: #00A3A1; margin-top: 5px; }
            @media print {
              body { padding: 20px; }
              .section { page-break-inside: avoid; }
              .header { margin: -20px -20px 20px -20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              ${bhsctLogo}
            </div>
            <div class="trust-badge">OFFICIAL REPORT</div>
          </div>

          <div style="text-align: center; margin: 20px 0 30px 0;">
            <h1 style="color: #2C3E50; font-size: 26px; margin-bottom: 5px;">Incident Report Form</h1>
            <p style="color: #666; font-size: 14px;">Confidential Document</p>
          </div>

          <div class="report-meta">
            <div class="meta-item">
              <div class="meta-label">Report ID</div>
              <div class="meta-value">#${report._id.slice(-8).toUpperCase()}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Report Date</div>
              <div class="meta-value">${new Date(report.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Status</div>
              <div class="meta-value">${report.status.toUpperCase()}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Provider and Service User Information</div>
            <div class="field-row">
              <div class="field">
                <span class="field-label">Provider Name</span>
                <span class="field-value">${report.providerName}</span>
              </div>
              <div class="field">
                <span class="field-label">Service User Name</span>
                <span class="field-value">${report.serviceUserName}</span>
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <span class="field-label">Date of Birth</span>
                <span class="field-value">${report.serviceUserDOB}</span>
              </div>
              <div class="field">
                <span class="field-label">Gender</span>
                <span class="field-value">${report.serviceUserGender}</span>
              </div>
            </div>
            <div class="field">
              <span class="field-label">Care Manager</span>
              <span class="field-value">${report.careManager}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Incident Location</div>
            <div class="field">
              <span class="field-label">Address (including postcode) where incident occurred</span>
              <span class="field-value textarea">${report.incidentAddress}</span>
            </div>
            <div class="field">
              <span class="field-label">Exact location where incident occurred</span>
              <span class="field-value">${report.exactLocation}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Incident Details</div>
            <div class="field-row">
              <div class="field">
                <span class="field-label">Date of Incident</span>
                <span class="field-value">${report.incidentDate}</span>
              </div>
              <div class="field">
                <span class="field-label">Time of Incident</span>
                <span class="field-value">${report.incidentTime}</span>
              </div>
            </div>
            <div class="field">
              <span class="field-label">Brief, factual description of incident</span>
              <span class="field-value textarea">${report.incidentDescription}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Injury and Treatment</div>
            <div class="field">
              <span class="field-label">Nature of Injury Sustained</span>
              <span class="field-value textarea">${report.natureOfInjury}</span>
            </div>
            <div class="field">
              <span class="field-label">Details of immediate action taken and treatment given</span>
              <span class="field-value textarea">${report.immediateActionTaken}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Notifications and Witnesses</div>
            <div class="field">
              <span class="field-label">Persons notified including designation/relationship to Service User</span>
              <span class="field-value textarea">${report.personsNotified}</span>
            </div>
            ${report.witnesses ? `
            <div class="field">
              <span class="field-label">Name and designation of any witnesses</span>
              <span class="field-value textarea">${report.witnesses}</span>
            </div>
            ` : ''}
            ${report.staffInvolved ? `
            <div class="field">
              <span class="field-label">Name and designation of any staff member involved</span>
              <span class="field-value textarea">${report.staffInvolved}</span>
            </div>
            ` : ''}
            ${report.otherServiceUsersInvolved ? `
            <div class="field">
              <span class="field-label">Other Service User(s) involved (include DOB)</span>
              <span class="field-value textarea">${report.otherServiceUsersInvolved}</span>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <div class="section-title">Reporter Information</div>
            <div class="field-row">
              <div class="field">
                <span class="field-label">Name of person reporting the incident</span>
                <span class="field-value">${report.reporterName}</span>
              </div>
              <div class="field">
                <span class="field-label">Designation</span>
                <span class="field-value">${report.reporterDesignation}</span>
              </div>
            </div>
            <div class="field">
              <span class="field-label">Date reported</span>
              <span class="field-value">${report.dateReported}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Follow-up Actions</div>
            <div class="field">
              <span class="field-label">Actions taken to prevent recurrence</span>
              <span class="field-value textarea">${report.preventionActions}</span>
            </div>
            ${report.riskAssessmentUpdateDate ? `
            <div class="field">
              <span class="field-label">Date Service User's risk assessment and care plan updated following this incident</span>
              <span class="field-value">${report.riskAssessmentUpdateDate}</span>
            </div>
            ` : ''}
            ${report.otherComments ? `
            <div class="field">
              <span class="field-label">Other Comments</span>
              <span class="field-value textarea">${report.otherComments}</span>
            </div>
            ` : ''}
          </div>

          ${report.reviewerName || report.reviewerDesignation || report.reviewDate ? `
          <div class="section">
            <div class="section-title">Senior Staff / Service Manager Review</div>
            ${report.reviewerName ? `
            <div class="field">
              <span class="field-label">Name (of senior staff / service manager)</span>
              <span class="field-value">${report.reviewerName}</span>
            </div>
            ` : ''}
            ${report.reviewerDesignation ? `
            <div class="field">
              <span class="field-label">Designation</span>
              <span class="field-value">${report.reviewerDesignation}</span>
            </div>
            ` : ''}
            ${report.reviewDate ? `
            <div class="field">
              <span class="field-label">Date</span>
              <span class="field-value">${report.reviewDate}</span>
            </div>
            ` : ''}
          </div>
          ` : ''}

          <div class="info-box">
            <strong>Important:</strong> This report has been generated by Belfast Health and Social Care Trust (BHSCT) for incident reporting purposes.
            Ensure this report is kept confidential and filed according to BHSCT policies and procedures.
          </div>

          <div class="footer">
            <p><strong>Generated by CareO System</strong></p>
            <p>Report ID: ${report._id} | Generated on: ${new Date().toLocaleString()}</p>
            <p>Reported by: ${report.reportedByName} | Original Report Date: ${new Date(report.createdAt).toLocaleDateString()}</p>
            <p style="margin-top: 10px;">© ${new Date().getFullYear()} Belfast Health and Social Care Trust. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  };

  const generateNHSReportWithTrust = (incident: any, trustReport: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>NHS Incident Report - ${incident.date}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #005eb8; border-bottom: 3px solid #005eb8; padding-bottom: 10px; }
            h2 { color: #003087; margin-top: 25px; background: #e8f4fd; padding: 8px; }
            .header { background: #005eb8; color: white; padding: 20px; margin: -20px -20px 20px -20px; }
            .section { margin-bottom: 25px; padding: 15px; border: 1px solid #d4e4f1; }
            .field { margin-bottom: 12px; }
            .label { font-weight: bold; color: #003087; display: inline-block; width: 180px; }
            .value { margin-left: 10px; }
            .nhs-logo { font-size: 24px; font-weight: bold; }
            .critical { background: #fee; padding: 10px; border-left: 4px solid #d5281b; }
            .trust-header { background: #e8f4fd; padding: 15px; margin-bottom: 20px; border-left: 4px solid #005eb8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="nhs-logo">NHS</div>
            <h1 style="color: white; border: none;">Patient Safety Incident Report</h1>
          </div>
          
          <div class="trust-header">
            <h2 style="margin: 0; background: none; color: #003087;">Trust Information</h2>
            <div class="field" style="margin-top: 10px;">
              <span class="label">NHS Trust:</span>
              <span class="value" style="font-weight: bold; font-size: 16px;">${trustReport.trustName}</span>
            </div>
            <div class="field">
              <span class="label">Report Generated:</span>
              <span class="value">${new Date(trustReport.createdAt).toLocaleString()}</span>
            </div>
            <div class="field">
              <span class="label">Generated By:</span>
              <span class="value">${trustReport.createdByName}</span>
            </div>
          </div>
          
          <div class="section">
            <h2>Incident Information</h2>
            <div class="field">
              <span class="label">NHS Number:</span>
              <span class="value">${resident?.nhsHealthNumber || "Not Available"}</span>
            </div>
            <div class="field">
              <span class="label">Patient Name:</span>
              <span class="value">${fullName}</span>
            </div>
            <div class="field">
              <span class="label">Date of Birth:</span>
              <span class="value">${incident.injuredPersonDOB}</span>
            </div>
            <div class="field">
              <span class="label">Incident Date/Time:</span>
              <span class="value">${incident.date} ${incident.time}</span>
            </div>
            <div class="field">
              <span class="label">Location:</span>
              <span class="value">${incident.homeName} - ${incident.unit}</span>
            </div>
          </div>
          
          <div class="section">
            <h2>Incident Classification</h2>
            <div class="field">
              <span class="label">Incident Type:</span>
              <span class="value">${incident.incidentTypes?.join(", ") || "Unspecified"}</span>
            </div>
            <div class="field">
              <span class="label">Severity Level:</span>
              <span class="value">${incident.incidentLevel?.replace("_", " ").toUpperCase() || "Not Assessed"}</span>
            </div>
            ${incident.incidentLevel === "death" || incident.incidentLevel === "permanent_harm" ? `
            <div class="critical">
              <strong>CRITICAL INCIDENT:</strong> This incident requires immediate escalation and reporting to NHS England.
            </div>
            ` : ''}
          </div>

          <div class="section">
            <h2>Clinical Details</h2>
            <div class="field">
              <span class="label">Injuries Sustained:</span>
              <span class="value">${incident.injuryTypes?.join(", ") || "None recorded"}</span>
            </div>
            <div class="field">
              <span class="label">Treatment Provided:</span>
              <span class="value">${incident.treatmentTypes?.join(", ") || "None recorded"}</span>
            </div>
            ${incident.treatmentDetails ? `
            <div class="field">
              <span class="label">Treatment Details:</span>
              <span class="value">${incident.treatmentDetails}</span>
            </div>
            ` : ''}
            <div class="field">
              <span class="label">Medical Professional Notified:</span>
              <span class="value">${incident.medicalProfessionalNotified || "Yes"}</span>
            </div>
          </div>

          <div class="section">
            <h2>Incident Description</h2>
            <p>${incident.detailedDescription || "No description provided"}</p>
          </div>

          ${trustReport.additionalNotes ? `
          <div class="section">
            <h2>Additional NHS Trust Notes</h2>
            <p>${trustReport.additionalNotes}</p>
          </div>
          ` : ''}

          <div class="section">
            <h2>Reporting Information</h2>
            <div class="field">
              <span class="label">Incident Reported By:</span>
              <span class="value">${incident.completedByFullName}</span>
            </div>
            <div class="field">
              <span class="label">Job Title:</span>
              <span class="value">${incident.completedByJobTitle}</span>
            </div>
            <div class="field">
              <span class="label">Incident Date Reported:</span>
              <span class="value">${incident.dateCompleted}</span>
            </div>
            <div class="field">
              <span class="label">NHS Report Created By:</span>
              <span class="value">${trustReport.createdByName}</span>
            </div>
            <div class="field">
              <span class="label">NHS Report Date:</span>
              <span class="value">${new Date(trustReport.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div class="section">
            <p style="font-size: 12px; color: #666;">
              This report has been generated by <strong>${trustReport.trustName}</strong> for NHS reporting purposes. 
              Please ensure all serious incidents are reported through the appropriate NHS reporting channels including NRLS (National Reporting and Learning System).
            </p>
          </div>
        </body>
      </html>
    `;
  };

  const generateNHSReport = (incident: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>NHS Incident Report - ${incident.date}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #005eb8; border-bottom: 3px solid #005eb8; padding-bottom: 10px; }
            h2 { color: #003087; margin-top: 25px; background: #e8f4fd; padding: 8px; }
            .header { background: #005eb8; color: white; padding: 20px; margin: -20px -20px 20px -20px; }
            .section { margin-bottom: 25px; padding: 15px; border: 1px solid #d4e4f1; }
            .field { margin-bottom: 12px; }
            .label { font-weight: bold; color: #003087; display: inline-block; width: 180px; }
            .value { margin-left: 10px; }
            .nhs-logo { font-size: 24px; font-weight: bold; }
            .critical { background: #fee; padding: 10px; border-left: 4px solid #d5281b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="nhs-logo">NHS</div>
            <h1 style="color: white; border: none;">Patient Safety Incident Report</h1>
          </div>
          
          <div class="section">
            <h2>Incident Information</h2>
            <div class="field">
              <span class="label">NHS Number:</span>
              <span class="value">${resident?.nhsHealthNumber || "Not Available"}</span>
            </div>
            <div class="field">
              <span class="label">Patient Name:</span>
              <span class="value">${fullName}</span>
            </div>
            <div class="field">
              <span class="label">Date of Birth:</span>
              <span class="value">${incident.injuredPersonDOB}</span>
            </div>
            <div class="field">
              <span class="label">Incident Date/Time:</span>
              <span class="value">${incident.date} ${incident.time}</span>
            </div>
            <div class="field">
              <span class="label">Location:</span>
              <span class="value">${incident.homeName} - ${incident.unit}</span>
            </div>
          </div>
          
          <div class="section">
            <h2>Incident Classification</h2>
            <div class="field">
              <span class="label">Incident Type:</span>
              <span class="value">${incident.incidentTypes?.join(", ") || "Unspecified"}</span>
            </div>
            <div class="field">
              <span class="label">Severity Level:</span>
              <span class="value">${incident.incidentLevel?.replace("_", " ").toUpperCase() || "Not Assessed"}</span>
            </div>
            ${incident.incidentLevel === "death" || incident.incidentLevel === "permanent_harm" ? `
            <div class="critical">
              <strong>CRITICAL INCIDENT:</strong> This incident requires immediate escalation and reporting to NHS England.
            </div>
            ` : ''}
          </div>

          <div class="section">
            <h2>Clinical Details</h2>
            <div class="field">
              <span class="label">Injuries Sustained:</span>
              <span class="value">${incident.injuryTypes?.join(", ") || "None recorded"}</span>
            </div>
            <div class="field">
              <span class="label">Treatment Provided:</span>
              <span class="value">${incident.treatmentTypes?.join(", ") || "None recorded"}</span>
            </div>
            ${incident.treatmentDetails ? `
            <div class="field">
              <span class="label">Treatment Details:</span>
              <span class="value">${incident.treatmentDetails}</span>
            </div>
            ` : ''}
            <div class="field">
              <span class="label">Medical Professional Notified:</span>
              <span class="value">${incident.medicalProfessionalNotified || "Yes"}</span>
            </div>
          </div>

          <div class="section">
            <h2>Incident Description</h2>
            <p>${incident.detailedDescription || "No description provided"}</p>
          </div>

          <div class="section">
            <h2>Reporting Information</h2>
            <div class="field">
              <span class="label">Reported By:</span>
              <span class="value">${incident.completedByFullName}</span>
            </div>
            <div class="field">
              <span class="label">Job Title:</span>
              <span class="value">${incident.completedByJobTitle}</span>
            </div>
            <div class="field">
              <span class="label">Date Reported:</span>
              <span class="value">${incident.dateCompleted}</span>
            </div>
          </div>

          <div class="section">
            <p style="font-size: 12px; color: #666;">
              This report has been generated for NHS reporting purposes. 
              Please ensure all serious incidents are reported through the appropriate NHS reporting channels including NRLS (National Reporting and Learning System).
            </p>
          </div>
        </body>
      </html>
    `;
  };

  const generatePS1Report = (incident: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PS1 Report - ${incident.date}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1d70b8; border-bottom: 2px solid #1d70b8; padding-bottom: 10px; }
            h2 { color: #003078; margin-top: 20px; }
            .section { margin-bottom: 20px; padding: 15px; background: #f3f5f6; }
            .field { margin-bottom: 10px; display: flex; }
            .label { font-weight: bold; color: #003078; min-width: 200px; }
            .value { flex: 1; }
            .header-info { background: #1d70b8; color: white; padding: 15px; margin: -20px -20px 20px -20px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #b1b4b6; padding: 8px; text-align: left; }
            th { background: #dee0e2; font-weight: bold; }
            .severity-high { color: #d4351c; font-weight: bold; }
            .severity-medium { color: #f47738; font-weight: bold; }
            .severity-low { color: #00703c; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1 style="color: white; border: none; margin: 0;">Patient Safety Incident Report (PS1)</h1>
            <p style="margin: 5px 0;">Care Quality Commission Notification</p>
          </div>
          
          <div class="section">
            <h2>1. Organisation & Location Details</h2>
            <div class="field">
              <span class="label">Organisation:</span>
              <span class="value">${incident.homeName}</span>
            </div>
            <div class="field">
              <span class="label">Unit/Ward:</span>
              <span class="value">${incident.unit}</span>
            </div>
            <div class="field">
              <span class="label">Date of Incident:</span>
              <span class="value">${incident.date}</span>
            </div>
            <div class="field">
              <span class="label">Time of Incident:</span>
              <span class="value">${incident.time}</span>
            </div>
          </div>

          <div class="section">
            <h2>2. Person Affected</h2>
            <div class="field">
              <span class="label">Name:</span>
              <span class="value">${incident.injuredPersonFirstName} ${incident.injuredPersonSurname}</span>
            </div>
            <div class="field">
              <span class="label">Date of Birth:</span>
              <span class="value">${incident.injuredPersonDOB}</span>
            </div>
            <div class="field">
              <span class="label">NHS Number:</span>
              <span class="value">${resident?.nhsHealthNumber || "Not Available"}</span>
            </div>
            <div class="field">
              <span class="label">Person Status:</span>
              <span class="value">${incident.injuredPersonStatus?.join(", ") || "Resident"}</span>
            </div>
          </div>

          <div class="section">
            <h2>3. Incident Details</h2>
            <table>
              <tr>
                <th>Category</th>
                <th>Details</th>
              </tr>
              <tr>
                <td>Incident Type(s)</td>
                <td>${incident.incidentTypes?.join(", ") || "Not specified"}</td>
              </tr>
              <tr>
                <td>Severity Level</td>
                <td class="${
                  incident.incidentLevel === "death" || incident.incidentLevel === "permanent_harm" ? "severity-high" :
                  incident.incidentLevel === "minor_injury" ? "severity-medium" : "severity-low"
                }">${incident.incidentLevel?.replace("_", " ").toUpperCase() || "Not Assessed"}</td>
              </tr>
              <tr>
                <td>Injuries</td>
                <td>${incident.injuryTypes?.join(", ") || "None"}</td>
              </tr>
              <tr>
                <td>Body Parts Affected</td>
                <td>${incident.bodyPartsInjured?.join(", ") || "Not specified"}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2>4. Incident Description</h2>
            <p style="background: white; padding: 10px; border: 1px solid #b1b4b6;">
              ${incident.detailedDescription || "No description provided"}
            </p>
          </div>

          <div class="section">
            <h2>5. Immediate Action Taken</h2>
            <div class="field">
              <span class="label">Treatment Provided:</span>
              <span class="value">${incident.treatmentTypes?.join(", ") || "None"}</span>
            </div>
            ${incident.treatmentDetails ? `
            <div class="field">
              <span class="label">Treatment Details:</span>
              <span class="value">${incident.treatmentDetails}</span>
            </div>
            ` : ''}
            <div class="field">
              <span class="label">Medical Professional Notified:</span>
              <span class="value">${incident.medicalProfessionalNotified || "Yes"}</span>
            </div>
            <div class="field">
              <span class="label">Family Notified:</span>
              <span class="value">${incident.familyNotified || "Yes"}</span>
            </div>
          </div>

          <div class="section">
            <h2>6. Contributing Factors</h2>
            <div class="field">
              <span class="label">Environmental Factors:</span>
              <span class="value">${incident.environmentalFactors?.join(", ") || "None identified"}</span>
            </div>
            <div class="field">
              <span class="label">Other Factors:</span>
              <span class="value">${incident.contributingFactors || "None identified"}</span>
            </div>
          </div>

          <div class="section">
            <h2>7. Report Details</h2>
            <div class="field">
              <span class="label">Report Completed By:</span>
              <span class="value">${incident.completedByFullName}</span>
            </div>
            <div class="field">
              <span class="label">Job Title:</span>
              <span class="value">${incident.completedByJobTitle}</span>
            </div>
            <div class="field">
              <span class="label">Date Completed:</span>
              <span class="value">${incident.dateCompleted}</span>
            </div>
            <div class="field">
              <span class="label">Time Completed:</span>
              <span class="value">${incident.timeCompleted || "Not recorded"}</span>
            </div>
          </div>

          <div class="section">
            <h2>8. Regulatory Requirements</h2>
            <p>☐ CQC Notification Required (for serious injuries/deaths)</p>
            <p>☐ Safeguarding Referral Made</p>
            <p>☐ RIDDOR Report Submitted (if applicable)</p>
            <p>☐ Insurance Company Notified</p>
            <p>☐ Root Cause Analysis Initiated</p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #b1b4b6; font-size: 12px; color: #666;">
            <p><strong>PS1 Report Generated:</strong> ${new Date().toLocaleString()}</p>
            <p>This report should be submitted to the CQC within the required timeframe. Serious injuries and deaths must be reported immediately.</p>
          </div>
        </body>
      </html>
    `;
  };

  // Pagination logic
  const totalIncidents = incidents?.length || 0;
  const totalPages = Math.ceil(totalIncidents / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIncidents = incidents?.slice(startIndex, endIndex) || [];
  const showPagination = totalIncidents > 0; // Always show pagination when there are incidents

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Format incident data for display
  const formattedIncidents = incidents?.map(incident => ({
    id: incident._id,
    date: incident.date,
    time: incident.time,
    type: incident.type,
    severity: incident.severity,
    location: incident.location,
    description: incident.description,
    reportedBy: incident.reportedBy,
    actionTaken: incident.immediateAction,
    followUp: incident.followUpRequired || "No follow-up required"
  })) || [];

  const mockFallsRiskAssessment = {
    lastAssessment: "2024-02-01",
    riskLevel: "Medium",
    score: 6,
    maxScore: 10,
    factors: [
      { factor: "Previous falls", present: true, points: 2 },
      { factor: "Mobility impairment", present: true, points: 2 },
      { factor: "Medication effects", present: true, points: 1 },
      { factor: "Cognitive impairment", present: false, points: 0 },
      { factor: "Environmental hazards", present: true, points: 1 }
    ]
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
      case 'severe':
        return { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' };
      case 'medium':
      case 'moderate':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'low':
      case 'minor':
        return { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fall':
        return { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' };
      case 'medication_error':
        return { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700' };
      case 'injury':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'behavioral':
        return { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' };
      case 'skin_integrity':
        return { bg: 'bg-pink-100', border: 'border-pink-200', text: 'text-pink-700' };
      default:
        return { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' };
    }
  };

  const formatTypeLabel = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatSeverityLabel = (severity: string) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  // Get trust reports for a specific incident (including BHSCT reports)
  const getTrustReportsForIncident = (incidentId: string) => {
    const oldTrustReports = trustReports?.filter(report => report.incidentId === incidentId) || [];
    const bhsctReportsForIncident = bhsctReports?.filter(report => report.incidentId === incidentId) || [];

    // Convert BHSCT reports to the same format as trust reports
    const formattedBhsctReports = bhsctReportsForIncident.map(report => ({
      _id: report._id,
      incidentId: report.incidentId,
      trustName: "BHSCT",
      reportType: "bhsct",
      ...report
    }));

    return [...oldTrustReports, ...formattedBhsctReports];
  };

  const handleViewNHSReport = (report: any, incident: any) => {
    setSelectedNHSReport({ report, incident });
    setShowNHSReportView(true);
  };

  const handleDownloadNHSReportFromBadge = (report: any) => {
    const incident = incidents?.find(i => i._id === report.incidentId);
    if (incident) {
      generateAndDownloadNHSReport(incident, report);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={resident.imageUrl} alt={fullName} className="border" />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Incidents & Falls</h1>
          <p className="text-muted-foreground text-sm">
            View and manage incident reports for {resident.firstName} {resident.lastName}.
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <Button
            onClick={() => setShowReportForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Report Incident
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/residents/${id}/incidents/documents`)}
          >
            <Eye className="w-4 h-4 mr-2" />
            See All Records
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {incidentStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{incidentStats.totalIncidents}</span>
                <span className="text-xs text-muted-foreground">Total Incidents</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-red-600">{incidentStats.fallsCount}</span>
                <span className="text-xs text-muted-foreground">Falls</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-orange-600">{incidentStats.last30Days}</span>
                <span className="text-xs text-muted-foreground">Last 30 Days</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Incidents List */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span>Recent Incidents</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {!incidents || incidents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No incidents recorded</p>
              <p className="text-gray-400 text-sm mt-1">
                Click the Report New Incident button to add the first incident
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedIncidents.map((incident) => (
                <div
                  key={incident._id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {incident.incidentTypes?.join(", ") || "Incident"}
                        </h4>
                        <Badge
                          className={`text-xs border-0 ${
                            incident.incidentLevel === "death" ? "bg-red-100 text-red-800" :
                            incident.incidentLevel === "permanent_harm" ? "bg-red-100 text-red-800" :
                            incident.incidentLevel === "minor_injury" ? "bg-yellow-100 text-yellow-800" :
                            incident.incidentLevel === "no_harm" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {incident.incidentLevel
                            ?.replace("_", " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (c) => c.toUpperCase())}

                        </Badge>
                    
                      </div>
                    
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(incident.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{incident.time}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{incident.completedByFullName}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                            {/* Trust Report Indicators */}
                            {getTrustReportsForIncident(incident._id).map((report) => (
                          <Badge
                            key={report._id}
                            variant="outline"
                            className="text-xs bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                            title={`${report.trustName} Report - Click to view`}
                            onClick={() => handleViewNHSReport(report, incident)}
                          >
                            <FileBarChart className="w-3 h-3 mr-1" />
                            {report.trustName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-3 md:mt-0 md:ml-4 justify-end md:justify-start flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleViewIncident(incident._id)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDownloadIncident(incident._id)}
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleNHSReport(incident._id)}
                      title="Generate NHS Report"
                    >
                      <FileBarChart className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleBodyMap(incident._id)}
                      title="Body Map"
                    >
                      <Map className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handlePS1Report(incident._id)}
                      title="Generate APP1 Report"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Pagination Controls */}
              {showPagination && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalIncidents)} of {totalIncidents} incidents
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Incident Summary */}
      <Card className="border-0">
        <CardHeader className="">
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-gray-900">Incident Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-4 border border-orange-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {incidentStats?.totalIncidents || 0}
                </div>
                <p className="text-sm font-medium text-orange-700">Total Incidents</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <AlertTriangle className="w-16 h-16 text-orange-600" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-red-100 p-4 border border-red-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {incidentStats?.fallsCount || 0}
                </div>
                <p className="text-sm font-medium text-red-700">Falls Recorded</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <TrendingDown className="w-16 h-16 text-red-600" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {mockFallsRiskAssessment.score}/10
                </div>
                <p className="text-sm font-medium text-blue-700">Risk Score</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 border border-green-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {incidentStats?.daysSinceLastIncident || 0}
                </div>
                <p className="text-sm font-medium text-green-700">Days Incident-Free</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Incident Form */}
      {resident && (
        <ComprehensiveIncidentForm
          residentId={id}
          residentName={`${resident.firstName} ${resident.lastName}`}
          isOpen={showReportForm}
          onClose={() => setShowReportForm(false)}
          onSuccess={() => {
            // Refresh incidents data when a new report is submitted
            setShowReportForm(false);
          }}
        />
      )}

      {/* View Incident Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Incident Report Details</DialogTitle>
            <DialogDescription>
              Complete incident report for {fullName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedIncident && (
              <div className="space-y-6">
                {/* Incident Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Incident Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">{selectedIncident.date} at {selectedIncident.time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Incident Level</p>
                      <Badge
                        variant={
                          selectedIncident.incidentLevel === "death" ? "destructive" :
                            selectedIncident.incidentLevel === "permanent_harm" ? "destructive" :
                              selectedIncident.incidentLevel === "minor_injury" ? "secondary" :
                                "outline"
                        }
                      >
                        {selectedIncident.incidentLevel?.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{selectedIncident.homeName} - {selectedIncident.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Incident Types</p>
                      <p className="font-medium">{selectedIncident.incidentTypes?.join(", ") || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Detailed Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedIncident.detailedDescription}</p>
                </div>

                {/* Injured Person Details */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Injured Person Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{selectedIncident.injuredPersonFirstName} {selectedIncident.injuredPersonSurname}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">{selectedIncident.injuredPersonDOB}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium">{selectedIncident.injuredPersonStatus?.join(", ") || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Health Care Number</p>
                      <p className="font-medium">{selectedIncident.healthCareNumber || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Injury Details */}
                {(selectedIncident.injuryDescription || selectedIncident.bodyPartInjured) && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Injury Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedIncident.injuryDescription && (
                        <div>
                          <p className="text-sm text-gray-500">Injury Description</p>
                          <p className="font-medium">{selectedIncident.injuryDescription}</p>
                        </div>
                      )}
                      {selectedIncident.bodyPartInjured && (
                        <div>
                          <p className="text-sm text-gray-500">Body Part Injured</p>
                          <p className="font-medium">{selectedIncident.bodyPartInjured}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Treatment */}
                {(selectedIncident.treatmentTypes?.length > 0 || selectedIncident.treatmentDetails) && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Treatment</h3>
                    <div className="space-y-3">
                      {selectedIncident.treatmentTypes?.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500">Treatment Types</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedIncident.treatmentTypes.map((type: string, index: number) => (
                              <Badge key={index} variant="secondary">{type}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedIncident.treatmentDetails && (
                        <div>
                          <p className="text-sm text-gray-500">Treatment Details</p>
                          <p className="font-medium">{selectedIncident.treatmentDetails}</p>
                        </div>
                      )}
                      {selectedIncident.vitalSigns && (
                        <div>
                          <p className="text-sm text-gray-500">Vital Signs</p>
                          <p className="font-medium">{selectedIncident.vitalSigns}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Witnesses */}
                {(selectedIncident.witness1Name || selectedIncident.witness2Name) && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Witnesses</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedIncident.witness1Name && (
                        <div>
                          <p className="text-sm text-gray-500">Witness 1</p>
                          <p className="font-medium">{selectedIncident.witness1Name}</p>
                          {selectedIncident.witness1Contact && (
                            <p className="text-sm text-gray-600">{selectedIncident.witness1Contact}</p>
                          )}
                        </div>
                      )}
                      {selectedIncident.witness2Name && (
                        <div>
                          <p className="text-sm text-gray-500">Witness 2</p>
                          <p className="font-medium">{selectedIncident.witness2Name}</p>
                          {selectedIncident.witness2Contact && (
                            <p className="text-sm text-gray-600">{selectedIncident.witness2Contact}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions Taken */}
                {selectedIncident.nurseActions?.length > 0 && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Nurse Actions Taken</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedIncident.nurseActions.map((action: string, index: number) => (
                        <Badge key={index} variant="outline">{action}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Report Completion */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Report Completion</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Completed By</p>
                      <p className="font-medium">{selectedIncident.completedByFullName}</p>
                      <p className="text-sm text-gray-600">{selectedIncident.completedByJobTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date Completed</p>
                      <p className="font-medium">{selectedIncident.dateCompleted}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowViewDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => handleDownloadIncident(selectedIncident._id)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NHS Report Form */}
      {nhsReportIncident && (
        <NHSReportForm
          isOpen={showNHSReportForm}
          onClose={() => {
            setShowNHSReportForm(false);
            setNhsReportIncident(null);
          }}
          incidentId={nhsReportIncident._id}
          residentId={id}
          incident={nhsReportIncident}
          user={user}
          onReportCreated={handleNHSReportCreated}
        />
      )}

      {/* NHS Report View Dialog */}
      <Dialog open={showNHSReportView} onOpenChange={setShowNHSReportView}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileBarChart className="w-5 h-5 text-blue-600" />
              </div>
              {selectedNHSReport?.report?.reportType === "bhsct" ? "BHSCT Report Details" : "NHS Trust Report Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedNHSReport?.report?.reportType === "bhsct"
                ? "View the saved BHSCT incident report information"
                : "View the saved NHS trust incident report information"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedNHSReport && (
            <div className="space-y-6">
              {/* Trust Information Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  Trust Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-blue-700">NHS Trust Name</p>
                    <p className="text-blue-900 font-semibold text-lg">
                      {selectedNHSReport.report.trustName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">Report Generated</p>
                    <p className="text-blue-900">
                      {new Date(selectedNHSReport.report.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">Created By</p>
                    <p className="text-blue-900">
                      {selectedNHSReport.report.reportedByName || selectedNHSReport.report.createdByName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">Report Type</p>
                    <Badge className="bg-blue-600 text-white">
                      {selectedNHSReport.report.reportType === "bhsct" ? "BHSCT Report" : "NHS Report"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Incident Summary */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Associated Incident</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Date & Time</p>
                    <p className="font-medium">
                      {selectedNHSReport.incident.date} {selectedNHSReport.incident.time}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Incident Type</p>
                    <p className="font-medium">
                      {selectedNHSReport.incident.incidentTypes?.join(", ") || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Severity Level</p>
                    <Badge
                      className={`text-xs ${
                        selectedNHSReport.incident.incidentLevel === "death" || 
                        selectedNHSReport.incident.incidentLevel === "permanent_harm" 
                          ? "bg-red-100 text-red-800" :
                        selectedNHSReport.incident.incidentLevel === "minor_injury" 
                          ? "bg-yellow-100 text-yellow-800" :
                          "bg-green-100 text-green-800"
                      }`}
                    >
                      {selectedNHSReport.incident.incidentLevel?.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium">
                      {selectedNHSReport.incident.homeName} - {selectedNHSReport.incident.unit}
                    </p>
                  </div>
                </div>
              </div>

              {/* BHSCT Report Details */}
              {selectedNHSReport.report.reportType === "bhsct" && (
                <div className="space-y-4">
                  {/* Provider and Service User Information */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Provider and Service User Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Provider Name</p>
                        <p className="font-medium">{selectedNHSReport.report.providerName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Service User Name</p>
                        <p className="font-medium">{selectedNHSReport.report.serviceUserName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date of Birth</p>
                        <p className="font-medium">{selectedNHSReport.report.serviceUserDOB}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Gender</p>
                        <p className="font-medium">{selectedNHSReport.report.serviceUserGender}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500">Care Manager</p>
                        <p className="font-medium">{selectedNHSReport.report.careManager}</p>
                      </div>
                    </div>
                  </div>

                  {/* Incident Location */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Incident Location</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-500">Address (including postcode)</p>
                        <p className="font-medium">{selectedNHSReport.report.incidentAddress}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Exact location where incident occurred</p>
                        <p className="font-medium">{selectedNHSReport.report.exactLocation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Incident Details */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Incident Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Date of Incident</p>
                        <p className="font-medium">{selectedNHSReport.report.incidentDate}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Time of Incident</p>
                        <p className="font-medium">{selectedNHSReport.report.incidentTime}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500">Description of Incident</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedNHSReport.report.incidentDescription}</p>
                      </div>
                    </div>
                  </div>

                  {/* Injury and Treatment */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Injury and Treatment</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-500">Nature of Injury Sustained</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedNHSReport.report.natureOfInjury}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Immediate Action Taken and Treatment Given</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedNHSReport.report.immediateActionTaken}</p>
                      </div>
                    </div>
                  </div>

                  {/* Notifications and Witnesses */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Notifications and Witnesses</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-500">Persons Notified</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedNHSReport.report.personsNotified}</p>
                      </div>
                      {selectedNHSReport.report.witnesses && (
                        <div>
                          <p className="text-gray-500">Witnesses</p>
                          <p className="font-medium whitespace-pre-wrap">{selectedNHSReport.report.witnesses}</p>
                        </div>
                      )}
                      {selectedNHSReport.report.staffInvolved && (
                        <div>
                          <p className="text-gray-500">Staff Involved</p>
                          <p className="font-medium whitespace-pre-wrap">{selectedNHSReport.report.staffInvolved}</p>
                        </div>
                      )}
                      {selectedNHSReport.report.otherServiceUsersInvolved && (
                        <div>
                          <p className="text-gray-500">Other Service Users Involved</p>
                          <p className="font-medium whitespace-pre-wrap">{selectedNHSReport.report.otherServiceUsersInvolved}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reporter Information */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Reporter Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Reporter Name</p>
                        <p className="font-medium">{selectedNHSReport.report.reporterName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Designation</p>
                        <p className="font-medium">{selectedNHSReport.report.reporterDesignation}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date Reported</p>
                        <p className="font-medium">{selectedNHSReport.report.dateReported}</p>
                      </div>
                    </div>
                  </div>

                  {/* Follow-up Actions */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Follow-up Actions</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-500">Actions Taken to Prevent Recurrence</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedNHSReport.report.preventionActions}</p>
                      </div>
                      {selectedNHSReport.report.riskAssessmentUpdateDate && (
                        <div>
                          <p className="text-gray-500">Risk Assessment Update Date</p>
                          <p className="font-medium">{selectedNHSReport.report.riskAssessmentUpdateDate}</p>
                        </div>
                      )}
                      {selectedNHSReport.report.otherComments && (
                        <div>
                          <p className="text-gray-500">Other Comments</p>
                          <p className="font-medium whitespace-pre-wrap">{selectedNHSReport.report.otherComments}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Senior Staff / Manager Review */}
                  {(selectedNHSReport.report.reviewerName || selectedNHSReport.report.reviewerDesignation || selectedNHSReport.report.reviewDate) && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Senior Staff / Service Manager Review</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {selectedNHSReport.report.reviewerName && (
                          <div>
                            <p className="text-gray-500">Reviewer Name</p>
                            <p className="font-medium">{selectedNHSReport.report.reviewerName}</p>
                          </div>
                        )}
                        {selectedNHSReport.report.reviewerDesignation && (
                          <div>
                            <p className="text-gray-500">Designation</p>
                            <p className="font-medium">{selectedNHSReport.report.reviewerDesignation}</p>
                          </div>
                        )}
                        {selectedNHSReport.report.reviewDate && (
                          <div>
                            <p className="text-gray-500">Review Date</p>
                            <p className="font-medium">{selectedNHSReport.report.reviewDate}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Notes for non-BHSCT reports */}
              {selectedNHSReport.report.reportType !== "bhsct" && selectedNHSReport.report.additionalNotes && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Additional NHS Trust Notes</h3>
                  <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedNHSReport.report.additionalNotes}
                    </p>
                  </div>
                </div>
              )}

              {/* Report Data */}
              {selectedNHSReport.report.reportData && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Report Metadata</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-500">Report ID:</span>
                        <span className="ml-2 font-mono text-xs">
                          {selectedNHSReport.report._id.slice(-8)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          Generated
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Regulatory Information */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 mb-1">NHS Reporting Compliance</p>
                    <p className="text-amber-700">
                      This report has been generated for NHS trust reporting purposes and contains 
                      all necessary information for regulatory compliance. Ensure this report is 
                      submitted through appropriate NHS channels including NRLS if required.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end items-center pt-4 border-t">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Implement forward functionality
                  toast.success("Forward functionality coming soon");
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Forward
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedNHSReport) {
                    handleDownloadNHSReportFromBadge(selectedNHSReport.report);
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button onClick={() => setShowNHSReportView(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NHS Trust Picker Dialog */}
      <Dialog open={showTrustPicker} onOpenChange={setShowTrustPicker}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select NHS Trust</DialogTitle>
            <DialogDescription>
              Choose the NHS Trust for this incident report. Each trust has specific reporting requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[
              { code: "BHSCT", name: "Belfast Health and Social Care Trust", color: "blue" },
              { code: "SEHSCT", name: "South Eastern Health and Social Care Trust", color: "green" },
              { code: "WHSCT", name: "Western Health and Social Care Trust", color: "purple" },
              { code: "SHSCT", name: "Southern Health and Social Care Trust", color: "orange" },
              { code: "NHSCT", name: "Northern Health and Social Care Trust", color: "red" }
            ].map((trust) => (
              <Button
                key={trust.code}
                variant="outline"
                className="w-full justify-start h-auto p-4 hover:bg-gray-50"
                onClick={() => handleTrustSelected(trust.code)}
              >
                <div className="flex items-start space-x-3 w-full">
                  <div className={`p-2 bg-${trust.color}-100 rounded-lg flex-shrink-0`}>
                    <FileBarChart className={`w-5 h-5 text-${trust.color}-600`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-sm">{trust.code}</p>
                    <p className="text-xs text-muted-foreground">{trust.name}</p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Trust-Specific Form Dialog */}
      {selectedTrust === "BHSCT" ? (
        <BHSCTReportForm
          incident={trustPickerIncident}
          resident={resident}
          user={user}
          open={showTrustForm}
          onClose={handleCloseTrustForm}
        />
      ) : (
        <Dialog open={showTrustForm} onOpenChange={handleCloseTrustForm}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedTrust} Incident Report Form</DialogTitle>
              <DialogDescription>
                Complete the {selectedTrust} specific incident report form
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                {/* Other trust forms with dummy fields */}
                {selectedTrust === "SEHSCT" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">South Eastern Health and Social Care Trust - Incident Report</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">SEHSCT Incident ID</label>
                      <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="SEH-IR-XXXX" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Service Area</label>
                      <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="Enter service area" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Severity Rating (SEHSCT)</label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-md">
                        <option>Select severity</option>
                        <option>Low</option>
                        <option>Moderate</option>
                        <option>High</option>
                        <option>Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Immediate Actions Taken</label>
                      <textarea className="w-full mt-1 px-3 py-2 border rounded-md" rows={3} placeholder="Describe actions" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Outcome Status</label>
                      <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="Enter outcome" />
                    </div>
                  </div>
                </div>
              )}

              {selectedTrust === "WHSCT" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Western Health and Social Care Trust - Incident Report</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">WHSCT Report Number</label>
                      <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="WH-2024-XXXX" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Directorate</label>
                      <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="Enter directorate" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Investigation Required</label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-md">
                        <option>Select option</option>
                        <option>Yes - Full Investigation</option>
                        <option>Yes - Review Required</option>
                        <option>No</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Contributing Factors</label>
                      <textarea className="w-full mt-1 px-3 py-2 border rounded-md" rows={3} placeholder="Identify factors" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Preventive Measures</label>
                      <textarea className="w-full mt-1 px-3 py-2 border rounded-md" rows={3} placeholder="Recommended actions" />
                    </div>
                  </div>
                </div>
              )}

              {selectedTrust === "SHSCT" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Southern Health and Social Care Trust - Incident Report</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">SHSCT Reference</label>
                      <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="SH-INC-XXXX" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Care Setting</label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-md">
                        <option>Select setting</option>
                        <option>Residential Care</option>
                        <option>Nursing Home</option>
                        <option>Day Care</option>
                        <option>Community</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Incident Classification</label>
                      <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="Enter classification" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Witness Statements</label>
                      <textarea className="w-full mt-1 px-3 py-2 border rounded-md" rows={4} placeholder="Record witness information" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Follow-up Required</label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-md">
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedTrust === "NHSCT" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Northern Health and Social Care Trust - Incident Report</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">NHSCT Case Number</label>
                      <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="NH-CASE-XXXX" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Program of Care</label>
                      <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="Enter program" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Root Cause Analysis Required</label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-md">
                        <option>Select option</option>
                        <option>Yes - RCA Required</option>
                        <option>No - Review Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Duty of Candour Applied</label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-md">
                        <option>Yes</option>
                        <option>No</option>
                        <option>Not Applicable</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Additional Information</label>
                      <textarea className="w-full mt-1 px-3 py-2 border rounded-md" rows={4} placeholder="NHSCT specific details" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCloseTrustForm} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // For other trusts (not BHSCT), show demo message
                toast.success(`${selectedTrust} report form submitted (Demo)`);
                handleCloseTrustForm();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
      </div>
    </div>
  );
}