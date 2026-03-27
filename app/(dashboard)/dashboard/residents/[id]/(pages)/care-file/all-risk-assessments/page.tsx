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
import { ArrowLeft, Eye, FileText, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { useFolderForms } from "@/hooks/use-folder-forms";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { config } from "@/config";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import { Dialog } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

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
  "v2-abbey-pain": "abbey_pain_assessments",
  "braden-risk-assessment-form": "braden_risk_assessments"
};

export default function AllRiskAssessmentsPage() {
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

  useEffect(() => {
    async function fetchData() {
      if (!residentId) return;

      try {
        const { data: residentData } = await supabase
          .from('residents')
          .select('*')
          .eq('id', residentId)
          .single();
        setResident(residentData);
      } catch (error) {
        console.error("Error fetching resident:", error);
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

  // Fetch all assessment forms (excluding risk assessments and care plans)
  // Fetch all assessment forms (excluding risk assessments and care plans)
  const {
    allPreAdmissionForms,
    allAdmissionForms,
    allPhotographyConsentForms,
    allDnacprForms,
    allPeepForms,
    allDependencyAssessmentForms,
    allTimlAssessmentForms,

    allResidentValuablesForms,
    allHandlingProfileForms,
    allInfectionPreventionForms,
    allBladderBowelForms,
    allMovingHandlingForms,
    allBedrailConsentForms,
    allBedRailsRiskAssessmentForms,
    allLongTermFallsForms,
    allPainAssessmentForms,
    allNutritionalAssessmentForms,
    allOralAssessmentForms,
    allDietNotificationForms,
    allChokingRiskAssessmentForms,
    allCornellDepressionScaleForms,
    allBestInterestDecisionForms,
    allRestraintsRiskForms,
    allFallRiskAssessmentForms,
    allSmokingRiskAssessmentForms,
    allSpecimenLogForms,
    allCapacityConsentsForms,
    allNightObservationForms,
    allGeneralRiskForms,
    allPersonalProfileForms,
    allAbbeyPainForms,
    allBradenRiskAssessmentForms
  } = useFolderForms({
    residentId,
    folderFormKeys: [
      "preAdmission-form",
      "admission-form",
      "photography-consent",
      "dnacpr",
      "peep",
      "dependency-assessment",
      "timl",

      "resident-valuables-form",
      "resident-handling-profile-form",
      "infection-prevention",
      "blader-bowel-form",
      "moving-handling-form",
      "bedrail-consent-form",
      "bed-rails-risk-assessment-form",
      "long-term-fall-risk-form",
      "pain-assessment-form",
      "nutritional-assessment-form",
      "oral-assessment-form",
      "diet-notification-form",
      "choking-risk-assessment-form",
      "cornell-depression-scale-form",
      "best-interest-decision-form",
      "v2-restraints-risk",
      "fall-risk-assessment",
      "smoking-risk-assessment",
      "v2-specimen-log",
      "v2-capacity-consent",
      "v2-night-obs-consent",
      "v2-general-risk",
      "v2-personal-profile",
      "v2-abbey-pain",
      "braden-risk-assessment-form"
    ],
    organizationId: resident?.active_organization_id
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading assessments...</p>
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

  // Helper function to get only the latest form from an array
  const getLatestForm = (forms: any[] | undefined | null) => {
    if (!forms || forms.length === 0) return null;
    // Forms are already sorted by creation time (newest first) from the hook
    return forms[0];
  };

  const getFolderName = (formKey: string, defaultFolder: string) => {
    if (version !== "v2") return defaultFolder;

    // Find the folder in config.careFilesV2 that contains this formKey
    const folder = config.careFilesV2.find(f =>
      f.forms.some(form => form.key === formKey)
    );

    return folder ? folder.value : defaultFolder;
  };

  // Collect all assessments
  const assessments = [
    // Pre-Admission Form
    ...(allPreAdmissionForms && allPreAdmissionForms.length > 0 ? [{
      _id: getLatestForm(allPreAdmissionForms)?._id,
      key: "preAdmission-form",
      name: "Pre-Admission Assessment",
      completedAt: getLatestForm(allPreAdmissionForms)?._creationTime,
      folderName: getFolderName("preAdmission-form", "Pre-Admission"),
      category: "Pre-Admission"
    }] : []),

    // Infection Prevention
    ...(allInfectionPreventionForms && allInfectionPreventionForms.length > 0 ? [{
      _id: getLatestForm(allInfectionPreventionForms)?._id,
      key: "infection-prevention",
      name: "Infection Prevention Assessment",
      completedAt: getLatestForm(allInfectionPreventionForms)?._creationTime,
      folderName: getFolderName("infection-prevention", "Pre-Admission"),
      category: "Pre-Admission"
    }] : []),

    // Admission Form
    ...(allAdmissionForms && allAdmissionForms.length > 0 ? [{
      _id: getLatestForm(allAdmissionForms)?._id,
      key: "admission-form",
      name: "Admission Assessment",
      completedAt: getLatestForm(allAdmissionForms)?._creationTime,
      folderName: getFolderName("admission-form", "Admission"),
      category: "Admission"
    }] : []),

    // Photography Consent
    ...(allPhotographyConsentForms && allPhotographyConsentForms.length > 0 ? [{
      _id: getLatestForm(allPhotographyConsentForms)?._id,
      key: "photography-consent",
      name: "Photography Consent",
      completedAt: getLatestForm(allPhotographyConsentForms)?._creationTime,
      folderName: getFolderName("photography-consent", "Admission"),
      category: "Consent"
    }] : []),

    // Best Interest Decision
    ...(allBestInterestDecisionForms && allBestInterestDecisionForms.length > 0 ? [{
      _id: getLatestForm(allBestInterestDecisionForms)?._id,
      key: "best-interest-decision-form",
      name: "Best Interest Decision",
      completedAt: getLatestForm(allBestInterestDecisionForms)?._creationTime,
      folderName: getFolderName("best-interest-decision-form", "Admission"),
      category: "Consent"
    }] : []),

    // DNACPR
    ...(allDnacprForms && allDnacprForms.length > 0 ? [{
      _id: getLatestForm(allDnacprForms)?._id,
      key: "dnacpr",
      name: "DNACPR",
      completedAt: getLatestForm(allDnacprForms)?._creationTime,
      folderName: getFolderName("dnacpr", "DNACPR"),
      category: "Medical"
    }] : []),

    // PEEP
    ...(allPeepForms && allPeepForms.length > 0 ? [{
      _id: getLatestForm(allPeepForms)?._id,
      key: "peep",
      name: "PEEP Assessment",
      completedAt: getLatestForm(allPeepForms)?._creationTime,
      folderName: getFolderName("peep", "PEEP"),
      category: "Emergency"
    }] : []),

    // Dependency Assessment
    ...(allDependencyAssessmentForms && allDependencyAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allDependencyAssessmentForms)?._id,
      key: "dependency-assessment",
      name: "Dependency Assessment",
      completedAt: getLatestForm(allDependencyAssessmentForms)?._creationTime,
      folderName: getFolderName("dependency-assessment", "Dependency"),
      category: "Care Assessment"
    }] : []),

    // This Is My Life
    ...(allTimlAssessmentForms && allTimlAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allTimlAssessmentForms)?._id,
      key: "timl",
      name: "This Is My Life",
      completedAt: getLatestForm(allTimlAssessmentForms)?._creationTime,
      folderName: getFolderName("timl", "My Life"),
      category: "Personal"
    }] : []),

    // Pain Assessment
    ...(allPainAssessmentForms && allPainAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allPainAssessmentForms)?._id,
      key: "pain-assessment-form",
      name: "Pain Assessment and Evaluation",
      completedAt: getLatestForm(allPainAssessmentForms)?._creationTime,
      folderName: getFolderName("pain-assessment-form", "Medication"),
      category: "Clinical"
    }] : []),

    // Moving & Handling
    ...(allMovingHandlingForms && allMovingHandlingForms.length > 0 ? [{
      _id: getLatestForm(allMovingHandlingForms)?._id,
      key: "moving-handling-form",
      name: "Moving & Handling Risk Assessment",
      completedAt: getLatestForm(allMovingHandlingForms)?._creationTime,
      folderName: getFolderName("moving-handling-form", "Mobility & Fall"),
      category: "Handling"
    }] : []),

    // Long Term Fall Risk
    ...(allLongTermFallsForms && allLongTermFallsForms.length > 0 ? [{
      _id: getLatestForm(allLongTermFallsForms)?._id,
      key: "long-term-fall-risk-form",
      name: "Long Term Fall Risk Assessment",
      completedAt: getLatestForm(allLongTermFallsForms)?._creationTime,
      folderName: getFolderName("long-term-fall-risk-form", "Mobility & Fall"),
      category: "Handling"
    }] : []),

    // Resident Handling Profile
    ...(allHandlingProfileForms && allHandlingProfileForms.length > 0 ? [{
      _id: getLatestForm(allHandlingProfileForms)?._id,
      key: "resident-handling-profile-form",
      name: "Resident Handling Profile",
      completedAt: getLatestForm(allHandlingProfileForms)?._creationTime,
      folderName: getFolderName("resident-handling-profile-form", "Mobility & Fall"),
      category: "Handling"
    }] : []),

    // Bedrail Consent
    ...(allBedrailConsentForms && allBedrailConsentForms.length > 0 ? [{
      _id: getLatestForm(allBedrailConsentForms)?._id,
      key: "bedrail-consent-form",
      name: "Bedrails Consent / Agreement",
      completedAt: getLatestForm(allBedrailConsentForms)?._creationTime,
      folderName: getFolderName("bedrail-consent-form", "Mobility & Fall"),
      category: "Handling"
    }] : []),

    // Bed Rails Risk Assessment
    ...(allBedRailsRiskAssessmentForms && allBedRailsRiskAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allBedRailsRiskAssessmentForms)?._id,
      key: "bed-rails-risk-assessment-form",
      name: "Risk Assessment for Use of Bed Rails",
      completedAt: getLatestForm(allBedRailsRiskAssessmentForms)?._creationTime,
      folderName: getFolderName("bed-rails-risk-assessment-form", "Mobility & Fall"),
      category: "Handling"
    }] : []),

    // Nutritional Assessment
    ...(allNutritionalAssessmentForms && allNutritionalAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allNutritionalAssessmentForms)?._id,
      key: "nutritional-assessment-form",
      name: "Nutritional Assessment",
      completedAt: getLatestForm(allNutritionalAssessmentForms)?._creationTime,
      folderName: getFolderName("nutritional-assessment-form", "Nutrition & Hydration"),
      category: "Clinical"
    }] : []),

    // Oral Assessment
    ...(allOralAssessmentForms && allOralAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allOralAssessmentForms)?._id,
      key: "oral-assessment-form",
      name: "Oral Assessment",
      completedAt: getLatestForm(allOralAssessmentForms)?._creationTime,
      folderName: getFolderName("oral-assessment-form", "Nutrition & Hydration"),
      category: "Clinical"
    }] : []),

    // Diet Notification
    ...(allDietNotificationForms && allDietNotificationForms.length > 0 ? [{
      _id: getLatestForm(allDietNotificationForms)?._id,
      key: "diet-notification-form",
      name: "Diet Notification",
      completedAt: getLatestForm(allDietNotificationForms)?._creationTime,
      folderName: getFolderName("diet-notification-form", "Nutrition & Hydration"),
      category: "Property"
    }] : []),

    // Choking Risk Assessment
    ...(allChokingRiskAssessmentForms && allChokingRiskAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allChokingRiskAssessmentForms)?._id,
      key: "choking-risk-assessment-form",
      name: "Choking Risk Assessment",
      completedAt: getLatestForm(allChokingRiskAssessmentForms)?._creationTime,
      folderName: getFolderName("choking-risk-assessment-form", "Nutrition & Hydration"),
      category: "Emergency"
    }] : []),

    // Bladder & Bowel Continence
    ...(allBladderBowelForms && allBladderBowelForms.length > 0 ? [{
      _id: getLatestForm(allBladderBowelForms)?._id,
      key: "blader-bowel-form",
      name: "Bladder & Bowel Continence Assessment",
      completedAt: getLatestForm(allBladderBowelForms)?._creationTime,
      folderName: getFolderName("blader-bowel-form", "Continence"),
      category: "Clinical"
    }] : []),



    // Cornell Depression Scale
    ...(allCornellDepressionScaleForms && allCornellDepressionScaleForms.length > 0 ? [{
      _id: getLatestForm(allCornellDepressionScaleForms)?._id,
      key: "cornell-depression-scale-form",
      name: "Cornell Scale for Depression in Dementia",
      completedAt: getLatestForm(allCornellDepressionScaleForms)?._creationTime,
      folderName: getFolderName("cornell-depression-scale-form", "Psychological & Emotional"),
      category: "Personal"
    }] : []),

    // Resident Valuables
    ...(allResidentValuablesForms && allResidentValuablesForms.length > 0 ? [{
      _id: getLatestForm(allResidentValuablesForms)?._id,
      key: "resident-valuables-form",
      name: "Resident Valuables",
      completedAt: getLatestForm(allResidentValuablesForms)?._creationTime,
      folderName: getFolderName("resident-valuables-form", "Resident Valuables"),
      category: "Property"
    }] : []),
    // Restraints Risk
    ...(allRestraintsRiskForms && allRestraintsRiskForms.length > 0 ? [{
      _id: getLatestForm(allRestraintsRiskForms)?._id,
      key: "v2-restraints-risk",
      name: "Consent and Risk Assessment for Restraints",
      completedAt: getLatestForm(allRestraintsRiskForms)?._creationTime,
      folderName: getFolderName("v2-restraints-risk", "Safe Environment"),
      category: "Consent"
    }] : []),
    // Fall Risk Assessment
    ...(allFallRiskAssessmentForms && allFallRiskAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allFallRiskAssessmentForms)?._id,
      key: "fall-risk-assessment",
      name: "Fall Risk Assessment",
      completedAt: getLatestForm(allFallRiskAssessmentForms)?._creationTime,
      folderName: getFolderName("fall-risk-assessment", "Mobility"),
      category: "Handling"
    }] : []),
    // Smoking Risk Assessment
    ...(allSmokingRiskAssessmentForms && allSmokingRiskAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allSmokingRiskAssessmentForms)?._id,
      key: "smoking-risk-assessment",
      name: "Smoking Risk Assessment",
      completedAt: getLatestForm(allSmokingRiskAssessmentForms)?._creationTime,
      folderName: getFolderName("smoking-risk-assessment", "Additional"),
      category: "Handling"
    }] : []),
    // Specimen Log
    ...(allSpecimenLogForms && allSpecimenLogForms.length > 0 ? [{
      _id: getLatestForm(allSpecimenLogForms)?._id,
      key: "v2-specimen-log",
      name: "Specimen Record Log",
      completedAt: getLatestForm(allSpecimenLogForms)?._creationTime,
      folderName: getFolderName("v2-specimen-log", "Daily Care"),
      category: "Clinical"
    }] : []),
    // Capacity & Consent
    ...(allCapacityConsentsForms && allCapacityConsentsForms.length > 0 ? [{
      _id: getLatestForm(allCapacityConsentsForms)?._id,
      key: "v2-capacity-consent",
      name: "Capacity & Consent Assessment",
      completedAt: getLatestForm(allCapacityConsentsForms)?._creationTime,
      folderName: getFolderName("v2-capacity-consent", "Admission"),
      category: "Consent"
    }] : []),
    // Night Observation Consent
    ...(allNightObservationForms && allNightObservationForms.length > 0 ? [{
      _id: getLatestForm(allNightObservationForms)?._id,
      key: "v2-night-obs-consent",
      name: "Night Observation Consent",
      completedAt: getLatestForm(allNightObservationForms)?._creationTime,
      folderName: getFolderName("v2-night-obs-consent", "Admission"),
      category: "Consent"
    }] : []),
    // General Risk Assessment
    ...(allGeneralRiskForms && allGeneralRiskForms.length > 0 ? [{
      _id: getLatestForm(allGeneralRiskForms)?._id,
      key: "v2-general-risk",
      name: "General Risk Assessment",
      completedAt: getLatestForm(allGeneralRiskForms)?._creationTime,
      folderName: getFolderName("v2-general-risk", "Safe Environment"),
      category: "Handling"
    }] : []),
    // Personal Profile
    ...(allPersonalProfileForms && allPersonalProfileForms.length > 0 ? [{
      _id: getLatestForm(allPersonalProfileForms)?._id,
      key: "v2-personal-profile",
      name: "Personal Profile",
      completedAt: getLatestForm(allPersonalProfileForms)?._creationTime,
      folderName: getFolderName("v2-personal-profile", "My Life"),
      category: "Personal"
    }] : []),
    // Braden Risk Assessment
    ...(allBradenRiskAssessmentForms && allBradenRiskAssessmentForms.length > 0 ? [{
      _id: getLatestForm(allBradenRiskAssessmentForms)?._id,
      key: "braden-risk-assessment-form",
      name: "Braden Risk Assessment",
      completedAt: getLatestForm(allBradenRiskAssessmentForms)?._creationTime,
      folderName: getFolderName("braden-risk-assessment-form", "Skin Integrity"),
      category: "Clinical"
    }] : []),

    // Abbey Pain Tool
    ...(allAbbeyPainForms && allAbbeyPainForms.length > 0 ? [{
      _id: getLatestForm(allAbbeyPainForms)?._id,
      key: "v2-abbey-pain",
      name: "Abbey Pain Tool",
      completedAt: getLatestForm(allAbbeyPainForms)?._creationTime,
      folderName: getFolderName("v2-abbey-pain", "Medication"),
      category: "Clinical"
    }] : []),
  ].filter(assessment => assessment._id); // Remove any null entries
  // Remove any null entries

  // Sort by completion date (most recent first)
  const sortedAssessments = assessments.sort((a, b) => {
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
          <h1 className="text-xl sm:text-2xl font-bold">All Assessments</h1>
          <p className="text-muted-foreground text-sm">
            View all assessments for {resident.first_name} {resident.last_name}
          </p>
        </div>
      </div>

      {/* Assessments Table */}
      <div className="rounded-lg border bg-card">
        {sortedAssessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No Assessments Found</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No assessments have been completed for this resident yet. Assessments will appear here once they are created from the care file folders.
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssessments.map((assessment) => (
                <TableRow key={assessment._id}>
                  <TableCell className="font-medium">
                    {assessment.name}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(assessment.category)}`}>
                      {assessment.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                      {assessment.folderName}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(assessment.completedAt), "dd MMM yyyy, HH:mm")}
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
