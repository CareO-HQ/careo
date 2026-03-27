"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Eye, Archive, FileText, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { config } from "@/config";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import { Dialog } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export default function ArchivedRiskAssessmentsPage() {
  const router = useRouter();
  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[3];
  const searchParams = useSearchParams();
  const version = searchParams.get("v");

  const { profile } = useProfile();
  const { activeTeamId } = useActiveTeam();

  const [viewingAssessment, setViewingAssessment] = useState<{
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    category: string;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewFormData, setViewFormData] = useState<any>(null);
  const [isFetchingForm, setIsFetchingForm] = useState(false);
  const [activeOrganization, setActiveOrganization] = useState<any>(null);
  const [resident, setResident] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);

  // State for all assessment types
  const [archivedPreAdmission, setArchivedPreAdmission] = useState<any[]>([]);
  const [archivedAdmission, setArchivedAdmission] = useState<any[]>([]);
  const [archivedPhotographyConsent, setArchivedPhotographyConsent] = useState<any[]>([]);
  const [archivedDnacpr, setArchivedDnacpr] = useState<any[]>([]);
  const [archivedPeep, setArchivedPeep] = useState<any[]>([]);
  const [archivedDependency, setArchivedDependency] = useState<any[]>([]);
  const [archivedTiml, setArchivedTiml] = useState<any[]>([]);

  const [archivedResidentValuables, setArchivedResidentValuables] = useState<any[]>([]);
  const [archivedHandlingProfile, setArchivedHandlingProfile] = useState<any[]>([]);
  const [archivedPainAssessment, setArchivedPainAssessment] = useState<any[]>([]);
  const [archivedNutritionalAssessment, setArchivedNutritionalAssessment] = useState<any[]>([]);
  const [archivedOralAssessment, setArchivedOralAssessment] = useState<any[]>([]);
  const [archivedDietNotification, setArchivedDietNotification] = useState<any[]>([]);
  const [archivedChokingRiskAssessment, setArchivedChokingRiskAssessment] = useState<any[]>([]);
  const [archivedCornellDepressionScale, setArchivedCornellDepressionScale] = useState<any[]>([]);
  const [archivedBestInterestDecision, setArchivedBestInterestDecision] = useState<any[]>([]);
  const [archivedInfectionPrevention, setArchivedInfectionPrevention] = useState<any[]>([]);
  const [archivedBladderBowel, setArchivedBladderBowel] = useState<any[]>([]);
  const [archivedMovingHandling, setArchivedMovingHandling] = useState<any[]>([]);
  const [archivedBedrailConsent, setArchivedBedrailConsent] = useState<any[]>([]);
  const [archivedBedRailsRiskAssessment, setArchivedBedRailsRiskAssessment] = useState<any[]>([]);
  const [archivedLongTermFalls, setArchivedLongTermFalls] = useState<any[]>([]);
  const [archivedRestraints, setArchivedRestraints] = useState<any[]>([]);
  const [archivedFallRisk, setArchivedFallRisk] = useState<any[]>([]);
  const [archivedSmokingRisk, setArchivedSmokingRisk] = useState<any[]>([]);
  const [archivedSpecimenLog, setArchivedSpecimenLog] = useState<any[]>([]);
  const [archivedCapacityConsent, setArchivedCapacityConsent] = useState<any[]>([]);
  const [archivedNightObservation, setArchivedNightObservation] = useState<any[]>([]);
  const [archivedGeneralRisk, setArchivedGeneralRisk] = useState<any[]>([]);
  const [archivedPersonalProfile, setArchivedPersonalProfile] = useState<any[]>([]);
  const [archivedAbbeyPain, setArchivedAbbeyPain] = useState<any[]>([]);

  const TABLE_MAP: Record<string, string> = {
    "preAdmission-form": "pre_admission_care_files",
    "infection-prevention": "infection_prevention_assessments",
    "blader-bowel-form": "bladder_bowel_assessments",
    "moving-handling-form": "moving_handling_assessments",
    "bedrail-consent-form": "bedrail_consents",
    "bed-rails-risk-assessment-form": "bedrails_risk_assessments",
    "long-term-fall-risk-form": "long_term_falls_risk_assessments",
    "admission-form": "admission_assessments",
    "photography-consent": "photography_consents",
    "dnacpr": "dnacprs",
    "peep": "peeps",
    "dependency-assessment": "dependency_assessments",
    "timl": "timl_assessments",

    "resident-valuables-form": "resident_valuables_assessments",
    "resident-handling-profile-form": "handling_profiles",
    "pain-assessment-form": "pain_assessments",
    "nutritional-assessment-form": "nutritional_assessments",
    "oral-assessment-form": "oral_assessments",
    "diet-notification-form": "diet_notifications",
    "choking-risk-assessment-form": "choking_risk_assessments",
    "cornell-depression-scale-form": "cornell_depression_scales",
    "best-interest-decision-form": "best_interest_decisions",
    "v2-restraints-risk": "restraints_consents",
    "fall-risk-assessment": "fall_risk_assessments",
    "smoking-risk-assessment": "smoking_risk_assessments",
    "v2-specimen-log": "specimen_records",
    "v2-capacity-consent": "capacity_consents",
    "v2-night-obs-consent": "night_observation_consents",
    "v2-general-risk": "general_risk_assessments",
    "v2-personal-profile": "personal_profiles",
    "v2-abbey-pain": "abbey_pain_assessments"
  };

  useEffect(() => {
    async function fetchData() {
      if (!residentId) return;

      try {
        // Fetch resident
        const { data: residentData } = await supabase
          .from('residents')
          .select('*')
          .eq('id', residentId)
          .single();
        setResident(residentData);

        // Fetch archived assessments for all types
        const promises = Object.entries(TABLE_MAP).map(async ([formKey, tableName]) => {
          const { data } = await supabase
            .from(tableName)
            .select('*')
            .eq('resident_id', residentId)
            .eq('status', 'archived')
            .order('created_at', { ascending: false });

          const mappedData = (data || []).map(item => ({
            ...item,
            _id: item.id,
            _creationTime: new Date(item.created_at).getTime()
          }));

          // Set state based on form key
          switch (formKey) {
            case "preAdmission-form":
              setArchivedPreAdmission(mappedData);
              break;
            case "admission-form":
              setArchivedAdmission(mappedData);
              break;
            case "photography-consent":
              setArchivedPhotographyConsent(mappedData);
              break;
            case "dnacpr":
              setArchivedDnacpr(mappedData);
              break;
            case "peep":
              setArchivedPeep(mappedData);
              break;
            case "dependency-assessment":
              setArchivedDependency(mappedData);
              break;
            case "timl":
              setArchivedTiml(mappedData);
              break;

            case "resident-valuables-form":
              setArchivedResidentValuables(mappedData);
              break;
            case "resident-handling-profile-form":
              setArchivedHandlingProfile(mappedData);
              break;
            case "pain-assessment-form":
              setArchivedPainAssessment(mappedData);
              break;
            case "nutritional-assessment-form":
              setArchivedNutritionalAssessment(mappedData);
              break;
            case "oral-assessment-form":
              setArchivedOralAssessment(mappedData);
              break;
            case "diet-notification-form":
              setArchivedDietNotification(mappedData);
              break;
            case "choking-risk-assessment-form":
              setArchivedChokingRiskAssessment(mappedData);
              break;
            case "cornell-depression-scale-form":
              setArchivedCornellDepressionScale(mappedData);
              break;
            case "best-interest-decision-form":
              setArchivedBestInterestDecision(mappedData);
              break;
            case "infection-prevention":
              setArchivedInfectionPrevention(mappedData);
              break;
            case "blader-bowel-form":
              setArchivedBladderBowel(mappedData);
              break;
            case "moving-handling-form":
              setArchivedMovingHandling(mappedData);
              break;
            case "bedrail-consent-form":
              setArchivedBedrailConsent(mappedData);
              break;
            case "bed-rails-risk-assessment-form":
              setArchivedBedRailsRiskAssessment(mappedData);
              break;
            case "long-term-fall-risk-form":
              setArchivedLongTermFalls(mappedData);
              break;
            case "v2-restraints-risk":
              setArchivedRestraints(mappedData);
              break;
            case "fall-risk-assessment":
              setArchivedFallRisk(mappedData);
              break;
            case "smoking-risk-assessment":
              setArchivedSmokingRisk(mappedData);
              break;
            case "v2-specimen-log":
              setArchivedSpecimenLog(mappedData);
              break;
            case "v2-capacity-consent":
              setArchivedCapacityConsent(mappedData);
              break;
            case "v2-night-obs-consent":
              setArchivedNightObservation(mappedData);
              break;
            case "v2-general-risk":
              setArchivedGeneralRisk(mappedData);
              break;
            case "v2-personal-profile":
              setArchivedPersonalProfile(mappedData);
              break;
            case "v2-abbey-pain":
              setArchivedAbbeyPain(mappedData);
              break;
          }
        });

        await Promise.all(promises);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [residentId]);

  useEffect(() => {
    if (profile?.active_organization_id) {
      supabase.from("organizations").select("*").eq("id", profile.active_organization_id).single()
        .then(({ data }) => { if (data) setActiveOrganization(data); });
    }
  }, [profile?.active_organization_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading archived assessments...</p>
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
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

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();

  const getFolderName = (formKey: string, defaultFolder: string) => {
    if (version !== "v2") return defaultFolder;

    // Find the folder in config.careFilesV2 that contains this formKey
    const folder = config.careFilesV2.find(f =>
      f.forms.some(form => form.key === formKey)
    );

    return folder ? folder.value : defaultFolder;
  };

  // Collect all archived assessments from all 23 assessment types
  const archivedAssessments = [
    ...(archivedPreAdmission?.map(form => ({
      _id: form._id,
      key: "preAdmission-form",
      name: "Pre-Admission Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("preAdmission-form", "Pre-Admission"),
      category: "Pre-Admission"
    })) || []),
    ...(archivedAdmission?.map(form => ({
      _id: form._id,
      key: "admission-form",
      name: "Admission Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("admission-form", "Admission"),
      category: "Admission"
    })) || []),
    ...(archivedPhotographyConsent?.map(form => ({
      _id: form._id,
      key: "photography-consent",
      name: "Photography Consent",
      completedAt: form._creationTime,
      folderName: getFolderName("photography-consent", "Admission"),
      category: "Consent"
    })) || []),
    ...(archivedDnacpr?.map(form => ({
      _id: form._id,
      key: "dnacpr",
      name: "DNACPR",
      completedAt: form._creationTime,
      folderName: getFolderName("dnacpr", "DNACPR"),
      category: "Medical"
    })) || []),
    ...(archivedPeep?.map(form => ({
      _id: form._id,
      key: "peep",
      name: "PEEP Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("peep", "PEEP"),
      category: "Emergency"
    })) || []),
    ...(archivedDependency?.map(form => ({
      _id: form._id,
      key: "dependency-assessment",
      name: "Dependency Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("dependency-assessment", "Dependency"),
      category: "Care Assessment"
    })) || []),
    ...(archivedTiml?.map(form => ({
      _id: form._id,
      key: "timl",
      name: "This Is My Life",
      completedAt: form._creationTime,
      folderName: getFolderName("timl", "My Life"),
      category: "Personal"
    })) || []),

    ...(archivedResidentValuables?.map(form => ({
      _id: form._id,
      key: "resident-valuables-form",
      name: "Resident Valuables",
      completedAt: form._creationTime,
      folderName: getFolderName("resident-valuables-form", "Resident Valuables"),
      category: "Property"
    })) || []),
    ...(archivedHandlingProfile?.map(form => ({
      _id: form._id,
      key: "resident-handling-profile-form",
      name: "Resident Handling Profile",
      completedAt: form._creationTime,
      folderName: getFolderName("resident-handling-profile-form", "Mobility & Fall"),
      category: "Handling"
    })) || []),
    ...(archivedPainAssessment?.map(form => ({
      _id: form._id,
      key: "pain-assessment-form",
      name: "Pain Assessment and Evaluation",
      completedAt: form._creationTime,
      folderName: getFolderName("pain-assessment-form", "Medication"),
      category: "Medication"
    })) || []),
    ...(archivedNutritionalAssessment?.map(form => ({
      _id: form._id,
      key: "nutritional-assessment-form",
      name: "Nutritional Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("nutritional-assessment-form", "Nutrition & Hydration"),
      category: "Nutrition"
    })) || []),
    ...(archivedOralAssessment?.map(form => ({
      _id: form._id,
      key: "oral-assessment-form",
      name: "Oral Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("oral-assessment-form", "Nutrition & Hydration"),
      category: "Nutrition"
    })) || []),
    ...(archivedDietNotification?.map(form => ({
      _id: form._id,
      key: "diet-notification-form",
      name: "Diet Notification",
      completedAt: form._creationTime,
      folderName: getFolderName("diet-notification-form", "Nutrition & Hydration"),
      category: "Nutrition"
    })) || []),
    ...(archivedChokingRiskAssessment?.map(form => ({
      _id: form._id,
      key: "choking-risk-assessment-form",
      name: "Choking Risk Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("choking-risk-assessment-form", "Nutrition & Hydration"),
      category: "Nutrition"
    })) || []),
    ...(archivedCornellDepressionScale?.map(form => ({
      _id: form._id,
      key: "cornell-depression-scale-form",
      name: "Cornell Scale for Depression in Dementia",
      completedAt: form._creationTime,
      folderName: getFolderName("cornell-depression-scale-form", "Psychological & Emotional Needs"),
      category: "Psychological"
    })) || []),
    ...(archivedBestInterestDecision?.map(form => ({
      _id: form._id,
      key: "best-interest-decision-form",
      name: "Best Interest Decision",
      completedAt: form._creationTime,
      folderName: getFolderName("best-interest-decision-form", "Capacity & Consent"),
      category: "Capacity"
    })) || []),
    ...(archivedInfectionPrevention?.map(form => ({
      _id: form._id,
      key: "infection-prevention",
      name: "Infection Prevention Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("infection-prevention", "Pre-Admission"),
      category: "Infection Control"
    })) || []),
    ...(archivedBladderBowel?.map(form => ({
      _id: form._id,
      key: "blader-bowel-form",
      name: "Continence Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("blader-bowel-form", "Continence"),
      category: "Continence"
    })) || []),
    ...(archivedMovingHandling?.map(form => ({
      _id: form._id,
      key: "moving-handling-form",
      name: "Moving & Handling Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("moving-handling-form", "Mobility & Fall"),
      category: "Moving & Handling"
    })) || []),
    ...(archivedBedrailConsent?.map(form => ({
      _id: form._id,
      key: "bedrail-consent-form",
      name: "Bedrails Consent / Agreement",
      completedAt: form._creationTime,
      folderName: getFolderName("bedrail-consent-form", "Mobility & Fall"),
      category: "Consent"
    })) || []),
    ...(archivedBedRailsRiskAssessment?.map(form => ({
      _id: form._id,
      key: "bed-rails-risk-assessment-form",
      name: "Risk Assessment for Use of Bed Rails",
      completedAt: form._creationTime,
      folderName: getFolderName("bed-rails-risk-assessment-form", "Mobility & Fall"),
      category: "Risk Assessment"
    })) || []),
    ...(archivedLongTermFalls?.map(form => ({
      _id: form._id,
      key: "long-term-fall-risk-form",
      name: "Fall Risk Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("long-term-fall-risk-form", "Mobility & Fall"),
      category: "Fall Risk"
    })) || []),
    ...(archivedRestraints?.map(form => ({
      _id: form._id,
      key: "v2-restraints-risk",
      name: "Consent and Risk Assessment for Restraints",
      completedAt: form._creationTime,
      folderName: getFolderName("v2-restraints-risk", "Safe Environment"),
      category: "Consent"
    })) || []),
    ...(archivedFallRisk?.map(form => ({
      _id: form._id,
      key: "fall-risk-assessment",
      name: "Fall Risk Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("fall-risk-assessment", "Mobility"),
      category: "Handling"
    })) || []),
    ...(archivedSmokingRisk?.map(form => ({
      _id: form._id,
      key: "smoking-risk-assessment",
      name: "Smoking Risk Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("smoking-risk-assessment", "Additional"),
      category: "Handling"
    })) || []),
    ...(archivedSpecimenLog?.map(form => ({
      _id: form._id,
      key: "v2-specimen-log",
      name: "Specimen Record Log",
      completedAt: form._creationTime,
      folderName: getFolderName("v2-specimen-log", "Daily Care"),
      category: "Clinical"
    })) || []),
    ...(archivedCapacityConsent?.map(form => ({
      _id: form._id,
      key: "v2-capacity-consent",
      name: "Capacity & Consent Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("v2-capacity-consent", "Admission"),
      category: "Capacity"
    })) || []),
    ...(archivedNightObservation?.map(form => ({
      _id: form._id,
      key: "v2-night-obs-consent",
      name: "Night Observation Consent",
      completedAt: form._creationTime,
      folderName: getFolderName("v2-night-obs-consent", "Admission"),
      category: "Consent"
    })) || []),
    ...(archivedGeneralRisk?.map(form => ({
      _id: form._id,
      key: "v2-general-risk",
      name: "General Risk Assessment",
      completedAt: form._creationTime,
      folderName: getFolderName("v2-general-risk", "Safe Environment"),
      category: "Handling"
    })) || []),
    ...(archivedPersonalProfile?.map(form => ({
      _id: form._id,
      key: "v2-personal-profile",
      name: "Personal Profile",
      completedAt: form._creationTime,
      folderName: getFolderName("v2-personal-profile", "My Life"),
      category: "Personal"
    })) || []),
    ...(archivedAbbeyPain?.map(form => ({
      _id: form._id,
      key: "v2-abbey-pain",
      name: "Abbey Pain Tool",
      completedAt: form._creationTime,
      folderName: getFolderName("v2-abbey-pain", "Medication"),
      category: "Clinical"
    })) || []),
  ];

  // Sort by completion date (most recent first)
  const sortedAssessments = archivedAssessments.sort((a, b) => {
    const aDate = a.completedAt || 0;
    const bDate = b.completedAt || 0;
    return bDate - aDate;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Pre-Admission":
        return "bg-blue-50 text-blue-700";
      case "Admission":
        return "bg-green-50 text-green-700";
      case "Consent":
        return "bg-purple-50 text-purple-700";
      case "Medical":
        return "bg-red-50 text-red-700";
      case "Emergency":
        return "bg-orange-50 text-orange-700";
      case "Care Assessment":
        return "bg-cyan-50 text-cyan-700";
      case "Personal":
        return "bg-pink-50 text-pink-700";
      case "Clinical":
        return "bg-indigo-50 text-indigo-700";
      case "Property":
        return "bg-amber-50 text-amber-700";
      case "Handling":
        return "bg-teal-50 text-teal-700";
      case "Medication":
        return "bg-rose-50 text-rose-700";
      case "Nutrition":
        return "bg-lime-50 text-lime-700";
      case "Psychological":
        return "bg-violet-50 text-violet-700";
      case "Capacity":
        return "bg-fuchsia-50 text-fuchsia-700";
      case "Infection Control":
        return "bg-sky-50 text-sky-700";
      case "Continence":
        return "bg-emerald-50 text-emerald-700";
      case "Moving & Handling":
        return "bg-teal-50 text-teal-700";
      case "Risk Assessment":
        return "bg-red-50 text-red-700";
      case "Fall Risk":
        return "bg-orange-50 text-orange-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const handleViewAssessment = async (assessment: typeof sortedAssessments[0]) => {
    setViewingAssessment({
      formKey: assessment.key,
      formId: assessment._id,
      name: assessment.name,
      completedAt: assessment.completedAt,
      category: assessment.category
    });
    setViewFormData(null);
    setIsDialogOpen(true);
    setIsFetchingForm(true);
    try {
      const tableName = TABLE_MAP[assessment.key];
      if (tableName) {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .eq("id", assessment._id)
          .single();
        if (!error && data) setViewFormData(data);
      }
    } catch (err) {
      console.error("Error fetching form data:", err);
    } finally {
      setIsFetchingForm(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${residentId}/${version === 'v2' ? 'care-file-v2' : 'care-file'}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={resident.imageUrl} alt={fullName} className="border" />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-red-600" />
            <h1 className="text-xl sm:text-2xl font-bold">Archived Assessments</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            View previous versions of assessments for {resident.first_name} {resident.last_name}
          </p>
        </div>
      </div>

      {/* Archived Assessments Table */}
      <div className="rounded-lg border bg-card">
        {sortedAssessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Archive className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No Archived Assessments</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No archived assessments found. When an assessment is updated, the previous version will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Folder</TableHead>
                <TableHead>Completed At</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssessments.map((assessment) => (
                <TableRow key={assessment._id} className="bg-muted/20">
                  <TableCell className="font-medium">
                    {assessment.name}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(assessment.category)}`}>
                      {assessment.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                      {assessment.folderName}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(assessment.completedAt), "dd MMM yyyy, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                      Archived
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewAssessment(assessment)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Form View Overlay */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogPrimitive.Content asChild>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm p-4 sm:p-8">
            <VisuallyHidden><DialogPrimitive.Title>{viewingAssessment?.name ?? "Form"}</DialogPrimitive.Title></VisuallyHidden>
            <div className="max-w-4xl mx-auto bg-background rounded-xl border shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold leading-none">{viewingAssessment?.name}</h2>
                    {viewingAssessment && <p className="text-xs text-muted-foreground mt-1">Completed on {format(new Date(viewingAssessment.completedAt), "dd MMM yyyy, HH:mm")}</p>}
                  </div>
                </div>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-full p-2 hover:bg-muted transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="p-6 sm:p-10">
                {isFetchingForm ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground">Loading form...</p>
                  </div>
                ) : viewingAssessment ? (
                  <CareFileDialogRenderer
                    formKey={viewingAssessment.formKey as any}
                    residentId={residentId}
                    teamId={activeTeamId ?? ""}
                    organizationId={profile?.active_organization_id ?? ""}
                    userId={profile?.id ?? ""}
                    userName={profile?.name || profile?.email || "User"}
                    userRole={profile?.role ?? ""}
                    resident={resident}
                    careHomeName={profile?.care_home_name ?? ""}
                    folderKey=""
                    formDataForEdit={viewFormData}
                    isReviewMode={false}
                    onClose={() => setIsDialogOpen(false)}
                    isInline={true}
                    viewOnly={true}
                    orgLogoUrl={activeOrganization?.logo_url}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </Dialog>
    </div>
  );
}
