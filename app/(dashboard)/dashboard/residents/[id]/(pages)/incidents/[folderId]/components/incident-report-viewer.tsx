"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { generateIncidentReportPDF } from "@/lib/incident-pdf-utils";
import { toast } from "sonner";
import {
  CalendarIcon,
  User,
  AlertCircle,
  Shield,
  Activity,
  FileText,
  Phone,
  Mail,
  Loader2,
  Download,
  Pencil,
} from "lucide-react";

// --- Options for label lookups ---
const INCIDENT_TYPE_LABELS: Record<string, string> = {
  FallWitnessed: "Fall (witnessed)",
  FallUnwitnessed: "Fall (unwitnessed)",
  PressureUlcer: "Pressure ulcer",
  Wound: "Wound",
  Illness: "Illness",
  NearMiss: "Near miss",
  ExpectedDeath: "Expected death",
  UnexpectedDeath: "Unexpected death",
  StaffingLevels: "Staffing levels",
  Equipment: "Equipment",
  StaffAccident: "Staff accident",
  AbuseOfStaff: "Abuse of staff",
  Behavioural: "Behavioural issues",
  Safeguarding: "Safeguarding involving resident",
  Medication: "Medication incident",
  AbsentWithoutLeave: "Absent without leave",
  WeightLoss: "Weight loss",
  Choking: "Choking",
  Bruise: "Bruise",
  ResidentAltercation: "Resident-on-resident altercation",
  Infection: "Infection",
  Covid: "COVID",
  FireSafety: "Fire & safety",
  SelfHarm: "Self-harm",
  PSNI: "PSNI (police) involvement",
  Theft: "Theft",
  MissingResident: "Missing resident",
  Other: "Other",
};

const TREATMENT_LABELS: Record<string, string> = {
  FirstAid: "First aid",
  GP: "Referred to GP",
  Paramedic: "Paramedic attended",
  ED: "Taken to ED",
  HospitalAdmit: "Admitted to hospital",
  "999": "999 ambulance",
};

const NURSE_ACTION_LABELS: Record<string, string> = {
  OnCallManager: "On-call manager informed",
  DutySocialWorker: "Duty social worker informed",
  CarePlanUpdated: "Care plan updated",
  BodyMapCompleted: "Body map completed",
  TrustIncidentReport: "Trust incident report emailed to home manager",
  RiskAssessment: "Risk assessment completed",
  ObservationsCommenced: "Observations commenced",
  WoundAssessment: "Wound assessment completed",
  SafeguardingForms: "Safeguarding forms prepared for home manager",
  KeyWorkerContacted: "Key worker contacted",
};

const INCIDENT_LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  death: { label: "Death", color: "bg-red-100 text-red-800 border-red-200" },
  permanent_harm: { label: "Permanent Harm", color: "bg-red-100 text-red-700 border-red-200" },
  minor_injury: { label: "Minor Injury", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  no_harm: { label: "No Harm", color: "bg-green-100 text-green-800 border-green-200" },
  near_miss: { label: "Near Miss", color: "bg-blue-100 text-blue-800 border-blue-200" },
};

const PERSON_STATUS_LABELS: Record<string, string> = {
  Resident: "Resident in Care",
  Relative: "Relative",
  Staff: "Staff Member",
  AgencyStaff: "Agency Staff",
  Visitor: "Visitor",
  Contractor: "Contractor",
};

// --- Helper ---
function ViewField({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1">
      {icon && <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1.5">
      {icon && <span className="text-primary">{icon}</span>}
      <h3 className="text-xs font-bold uppercase tracking-wider text-primary">{title}</h3>
    </div>
  );
}

// --- Props ---
interface IncidentReportViewerProps {
  folderId: string;
  orgLogoUrl?: string;
  canEdit?: boolean;
  onEdit?: () => void;
}

export function IncidentReportViewer({
  folderId,
  orgLogoUrl,
  canEdit = false,
  onEdit,
}: IncidentReportViewerProps) {
  const [incident, setIncident] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDownloading, setIsDownloading] = React.useState(false);

  React.useEffect(() => {
    const fetchIncident = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("folder_id", folderId)
        .maybeSingle();

      if (!error && data) {
        setIncident(data);
      }
      setIsLoading(false);
    };
    fetchIncident();
  }, [folderId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading incident report…</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <p className="text-sm text-muted-foreground">No incident report found.</p>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      await generateIncidentReportPDF({ incident, orgLogoUrl });
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const i = incident;
  const levelInfo = INCIDENT_LEVEL_LABELS[i.incident_level] || {
    label: i.incident_level,
    color: "bg-gray-100 text-gray-700",
  };

  const hasFall = i.incident_types?.some(
    (t: string) => t === "FallWitnessed" || t === "FallUnwitnessed"
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-5">
        {/* Header */}
        <div className="border rounded-lg p-4 mb-4 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold">Incident Report</h2>
                <p className="text-xs text-muted-foreground">
                  {i.date ? format(new Date(i.date), "dd MMM yyyy") : "—"}
                  {i.time ? ` at ${i.time}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="h-8 text-xs gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="h-8 text-xs gap-1.5"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {isDownloading ? "Generating…" : "Download PDF"}
              </Button>
              <Badge className={`text-[10px] ${levelInfo.color} border`}>
                {levelInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Section 1: Incident Details */}
        <SectionHeader title="Incident Details" icon={<CalendarIcon className="w-3.5 h-3.5" />} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 pl-1">
          <ViewField label="Date" value={i.date ? format(new Date(i.date), "dd/MM/yyyy") : undefined} />
          <ViewField label="Time" value={i.time} />
          <ViewField label="Home Name" value={i.home_name} />
          <ViewField label="Unit" value={i.unit} />
        </div>

        <Separator className="my-2" />

        {/* Section 2: Injured Person */}
        <SectionHeader title="Injured Person Details" icon={<User className="w-3.5 h-3.5" />} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 pl-1">
          <ViewField label="First Name" value={i.injured_person_first_name} />
          <ViewField label="Surname" value={i.injured_person_surname} />
          <ViewField
            label="Date of Birth"
            value={i.injured_person_dob ? format(new Date(i.injured_person_dob), "dd/MM/yyyy") : undefined}
          />
          <ViewField label="Resident ID" value={i.resident_internal_id} />
          <ViewField
            label="Date of Admission"
            value={i.date_of_admission ? format(new Date(i.date_of_admission), "dd/MM/yyyy") : undefined}
          />
          <ViewField label="Health Care Number" value={i.health_care_number} />
        </div>

        <Separator className="my-2" />

        {/* Section 3: Status */}
        <SectionHeader title="Status of Injured Person" icon={<Shield className="w-3.5 h-3.5" />} />
        <div className="pl-1 py-1">
          {i.injured_person_status && i.injured_person_status.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {i.injured_person_status.map((s: string) => (
                <Badge key={s} variant="secondary" className="text-[11px]">
                  {PERSON_STATUS_LABELS[s] || s}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not specified</p>
          )}
          {i.contractor_employer && (
            <ViewField label="Contractor/Employer" value={i.contractor_employer} />
          )}
        </div>

        <Separator className="my-2" />

        {/* Section 4: Type of Incident */}
        <SectionHeader title="Type of Incident" icon={<AlertCircle className="w-3.5 h-3.5" />} />
        <div className="pl-1 py-1">
          {i.incident_types && i.incident_types.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {i.incident_types.map((t: string) => (
                <Badge key={t} variant="outline" className="text-[11px]">
                  {INCIDENT_TYPE_LABELS[t] || t}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not specified</p>
          )}
          {i.type_other_details && (
            <ViewField label="Other Details" value={i.type_other_details} />
          )}
        </div>

        {/* Sections 5-6: Fall Questions */}
        {hasFall && (
          <>
            <Separator className="my-2" />
            <SectionHeader title="Fall-Specific Questions" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 pl-1">
              <ViewField
                label="On Anticoagulant Medication?"
                value={
                  i.anticoagulant_medication
                    ? i.anticoagulant_medication.charAt(0).toUpperCase() + i.anticoagulant_medication.slice(1)
                    : undefined
                }
              />
              <ViewField
                label="Falls Pathway"
                value={
                  i.fall_pathway
                    ? i.fall_pathway.charAt(0).toUpperCase() + i.fall_pathway.slice(1)
                    : undefined
                }
              />
            </div>
          </>
        )}

        <Separator className="my-2" />

        {/* Section 7: Detailed Description */}
        <SectionHeader title="Detailed Description" />
        <div className="pl-1 py-1">
          <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-md p-3 border text-foreground">
            {i.detailed_description || "—"}
          </p>
        </div>

        <Separator className="my-2" />

        {/* Section 8: Incident Level */}
        <SectionHeader title="Incident Level" icon={<Activity className="w-3.5 h-3.5" />} />
        <div className="pl-1 py-1">
          <Badge className={`${levelInfo.color} border text-xs`}>
            {levelInfo.label}
          </Badge>
        </div>

        {/* Section 9: Injury Details */}
        {(i.injury_description || i.body_part_injured) && (
          <>
            <Separator className="my-2" />
            <SectionHeader title="Details of Injury" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 pl-1">
              <ViewField label="Injury Description" value={i.injury_description} />
              <ViewField label="Body Part Injured" value={i.body_part_injured} />
            </div>
          </>
        )}

        {/* Section 10-11: Treatment */}
        {(i.treatment_types?.length > 0 || i.treatment_details || i.vital_signs) && (
          <>
            <Separator className="my-2" />
            <SectionHeader title="Treatment" />
            <div className="pl-1 py-1 space-y-2">
              {i.treatment_types?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                    Treatment Required
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {i.treatment_types.map((t: string) => (
                      <Badge key={t} variant="secondary" className="text-[11px]">
                        {TREATMENT_LABELS[t] || t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <ViewField label="Treatment Details" value={i.treatment_details} />
              <ViewField label="Vital Signs" value={i.vital_signs} />
              {i.treatment_refused && (
                <Badge variant="destructive" className="text-[11px]">
                  Treatment Refused
                </Badge>
              )}
            </div>
          </>
        )}

        {/* Section 12: Witnesses */}
        <>
          <Separator className="my-2" />
          <SectionHeader title="Witnesses" />
          <div className="pl-1 space-y-1">
            <ViewField
              label="Witnesses present"
              value={i.witness1_name || i.witness2_name ? "Yes" : "No"}
            />
            {i.witness1_name || i.witness2_name ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                <ViewField label="Witness 1" value={i.witness1_name} icon={<User className="w-3 h-3" />} />
                <ViewField label="Contact" value={i.witness1_contact} icon={<Phone className="w-3 h-3" />} />
                <ViewField label="Witness 2" value={i.witness2_name} icon={<User className="w-3 h-3" />} />
                <ViewField label="Contact" value={i.witness2_contact} icon={<Phone className="w-3 h-3" />} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No witness</p>
            )}
          </div>
        </>

        {/* Section 13: Nurse Actions */}
        {i.nurse_actions?.length > 0 && (
          <>
            <Separator className="my-2" />
            <SectionHeader title="Further Actions by Nurse" />
            <div className="pl-1 py-1">
              <div className="flex flex-wrap gap-1.5">
                {i.nurse_actions.map((a: string) => (
                  <Badge key={a} variant="secondary" className="text-[11px]">
                    {NURSE_ACTION_LABELS[a] || a}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Section 14-15: Further Actions & Prevention */}
        {(i.further_actions_advised || i.prevention_measures) && (
          <>
            <Separator className="my-2" />
            <SectionHeader title="Further Actions & Prevention" />
            <div className="pl-1 space-y-1">
              <ViewField label="Further Actions Advised" value={i.further_actions_advised} />
              <ViewField label="Prevention Measures" value={i.prevention_measures} />
            </div>
          </>
        )}

        {/* Section 16-17: Notifications */}
        <>
          <Separator className="my-2" />
          <SectionHeader title="Notifications" icon={<Phone className="w-3.5 h-3.5" />} />
          <div className="pl-1 space-y-2">
            <ViewField
              label="Home Manager Informed"
              value={i.home_manager_informed_by || i.home_manager_informed_date_time ? "Yes" : "No"}
            />
            {(i.home_manager_informed_by || i.home_manager_informed_date_time) && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                <ViewField label="Home Manager Informed By" value={i.home_manager_informed_by} />
                <ViewField
                  label="Date & Time"
                  value={
                    i.home_manager_informed_date_time
                      ? format(new Date(i.home_manager_informed_date_time), "dd/MM/yyyy HH:mm")
                      : undefined
                  }
                />
              </div>
            )}
            <ViewField
              label="Out of Hours On-Call Contacted"
              value={i.on_call_manager_name || i.on_call_contacted_date_time ? "Yes" : "No"}
            />
            {(i.on_call_manager_name || i.on_call_contacted_date_time) && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                <ViewField label="On-Call Manager" value={i.on_call_manager_name} />
                <ViewField
                  label="Date & Time"
                  value={
                    i.on_call_contacted_date_time
                      ? format(new Date(i.on_call_contacted_date_time), "dd/MM/yyyy HH:mm")
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </>

        {/* Section 18: NOK */}
        <>
          <Separator className="my-2" />
          <SectionHeader title="Next of Kin Informed" />
          <div className="pl-1 space-y-1">
            <ViewField
              label="Next of Kin Informed"
              value={i.nok_informed_who || i.nok_informed_by || i.nok_informed_date_time ? "Yes" : "No"}
            />
            {(i.nok_informed_who || i.nok_informed_by || i.nok_informed_date_time) && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                <ViewField label="NOK Name" value={i.nok_informed_who} />
                <ViewField label="Informed By" value={i.nok_informed_by} />
                <ViewField
                  label="Date & Time"
                  value={
                    i.nok_informed_date_time
                      ? format(new Date(i.nok_informed_date_time), "dd/MM/yyyy HH:mm")
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </>

        {/* Section 19: Trust Recipients */}
        <>
          <Separator className="my-2" />
          <SectionHeader title="Trust Incident Form Recipients" icon={<Mail className="w-3.5 h-3.5" />} />
          <div className="pl-1 space-y-1">
            <ViewField
              label="Trust Incident Form Recipients"
              value={
                i.trust_care_manager_name ||
                i.trust_care_manager_email ||
                i.trust_key_worker_name ||
                i.trust_key_worker_email
                  ? "Yes"
                  : "No"
              }
            />
            {(i.trust_care_manager_name ||
              i.trust_care_manager_email ||
              i.trust_key_worker_name ||
              i.trust_key_worker_email) && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                <ViewField label="Care Manager" value={i.trust_care_manager_name} />
                <ViewField label="Email" value={i.trust_care_manager_email} />
                <ViewField label="Key Worker" value={i.trust_key_worker_name} />
                <ViewField label="Email" value={i.trust_key_worker_email} />
              </div>
            )}
          </div>
        </>

        <Separator className="my-2" />

        {/* Section 20: Completion */}
        <SectionHeader title="Completed By" icon={<User className="w-3.5 h-3.5" />} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 pl-1">
          <ViewField label="Full Name" value={i.completed_by_full_name} />
          <ViewField label="Job Title" value={i.completed_by_job_title} />
          <ViewField label="Signature" value={i.completed_by_signature} />
          <ViewField
            label="Date Completed"
            value={i.date_completed ? format(new Date(i.date_completed), "dd/MM/yyyy") : undefined}
          />
        </div>

        {/* Footer */}
        <div className="mt-6 mb-4 text-center">
          <p className="text-[10px] text-muted-foreground">
            Submitted on{" "}
            {i.created_at ? format(new Date(i.created_at), "dd MMM yyyy, HH:mm") : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
