import { CareFileFormKey } from "@/types/care-files";
import { cn } from "@/lib/utils";
import AdmissionDialog from "@/components/residents/carefile/dialogs/AdmissionDialog";
import BedrailConsentDialog from "@/components/residents/carefile/dialogs/BedrailConsentDialog";
import BedRailsRiskAssessmentDialog from "@/components/residents/carefile/dialogs/BedRailsRiskAssessmentDialog";
import BladderBowelDialog from "@/components/residents/carefile/dialogs/ContinenceDialog";
import CarePlanDialog from "@/components/residents/carefile/dialogs/CarePlanDialog";
import DependencyAssessmentDialog from "@/components/residents/carefile/dialogs/DependencyAssessmentDialog";
import DnacprDialog from "@/components/residents/carefile/dialogs/DnarcpDialog";
import InfectionPreventionDialog from "@/components/residents/carefile/dialogs/InfectionPreventionDialog";
import LongTermFallRiskDialog from "@/components/residents/carefile/dialogs/LongTermFallRiskDialog";
import MovingHandlingDialog from "@/components/residents/carefile/dialogs/MovingHandlingDialog";
import PainAssessmentV2Dialog from "@/components/residents/carefile/dialogs/PainAssessmentV2Dialog";
import PeepDialog from "@/components/residents/carefile/dialogs/PeepDialog";
import PhotographyConsentDialog from "@/components/residents/carefile/dialogs/PhotographyConsentDialog";
import PreAdmissionDialog from "@/components/residents/carefile/dialogs/PreAdmissionDialog";
import ResidentValuablesDialog from "@/components/residents/carefile/dialogs/ResidentValuables";
import TimlDialog from "@/components/residents/carefile/dialogs/TimlDialog";
import PersonalProfileDialog from "@/components/residents/carefile/dialogs/PersonalProfileDialog";
import ResidentHandlingProfileDialog from "@/components/residents/carefile/dialogs/ResidentHandlingProfileDialog";
import NutritionalAssessmentDialog from "@/components/residents/carefile/dialogs/NutritionalAssessmentDialog";
import OralAssessmentDialog from "@/components/residents/carefile/dialogs/OralAssessmentDialog";
import DietNotificationDialog from "@/components/residents/carefile/dialogs/DietNotificationDialog";
import ChokingRiskAssessmentDialog from "@/components/residents/carefile/dialogs/ChokingRiskAssessmentDialog";
import CornellDepressionScaleDialog from "@/components/residents/carefile/dialogs/CornellDepressionScaleDialog";
import BestInterestDecisionDialog from "@/components/residents/carefile/dialogs/BestInterestDecisionDialog";
import BradenRiskAssessmentDialog from "@/components/residents/carefile/dialogs/BradenRiskAssessmentDialog";
import RestraintsConsentDialog from "@/components/residents/carefile/dialogs/RestraintsConsentDialog";
import SmokingRiskAssessmentDialog from "@/components/residents/carefile/dialogs/SmokingRiskAssessmentDialog";
import FallRiskAssessmentDialog from "@/components/residents/carefile/dialogs/FallRiskAssessmentDialog";
import SpecimenRecordLogDialog from "@/components/residents/carefile/dialogs/SpecimenRecordLogDialog";
import { ProgressNoteForm } from "@/components/residents/carefile/folders/ProgressNoteForm";
import { KeyWorkerDiaryForm } from "@/components/residents/carefile/folders/KeyWorkerDiaryForm";
import CapacityConsentDialog from "@/components/residents/carefile/dialogs/CapacityConsentDialog";
import NightObservationDialog from "@/components/residents/carefile/dialogs/NightObservationDialog";
import GeneralRiskAssessmentDialog from "@/components/residents/carefile/dialogs/GeneralRiskAssessmentDialog";
import AbbeyPainDialog from "@/components/residents/carefile/dialogs/AbbeyPainDialog";
import MustAssessmentDialog from "@/components/residents/carefile/dialogs/MustAssessmentDialog";
import { WeightChart } from "@/components/residents/carefile/WeightChart";


interface BaseDialogProps {
  residentId: string;
  teamId: string | undefined;
  organizationId: string;
  userId: string;
  userName?: string;
  userRole?: string;
  resident: any;
  initialData?: any;
  isEditMode?: boolean;
  onClose: () => void;
}

interface CareFileDialogRendererProps extends BaseDialogProps {
  formKey: CareFileFormKey | null;
  careHomeName?: string;
  folderKey?: string;
  formDataForEdit: any;
  isReviewMode: boolean;
  isInline?: boolean;
  newCarePlanName?: string;
  viewOnly?: boolean;
  refreshForms?: () => void;
  onSaveSuccess?: (data: any) => void;
  onClose: () => void;
  orgLogoUrl?: string;
  woundFolderId?: string;
  teamName?: string;
}

/**
 * Centralized component for rendering care file dialogs based on form key
 */
export function CareFileDialogRenderer({
  formKey,
  residentId,
  teamId,
  organizationId,
  userId,
  userName,
  userRole,
  resident,
  careHomeName,
  folderKey,
  formDataForEdit,
  isReviewMode,
  isInline,
  newCarePlanName,
  viewOnly = false,
  refreshForms,
  onSaveSuccess,
  onClose,
  orgLogoUrl,
  woundFolderId,
  teamName,
}: CareFileDialogRendererProps) {
  const editData = (isReviewMode || viewOnly) ? formDataForEdit : null;
  // For care plan new creation, pass the pre-selected name as a synthetic initialData
  const carePlanInitialData = editData ?? (newCarePlanName ? { nameOfCarePlan: newCarePlanName } : null);

  // If we're in review/view mode and still loading data, show loading state
  if ((isReviewMode || viewOnly) && formDataForEdit === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading form data...</p>
        </div>
      </div>
    );
  }

  // Common props that many dialogs share
  const commonProps = {
    resident,
    teamId: teamId ?? "",
    residentId,
    organizationId,
    userId,
    userName,
    userRole: userRole ?? "",
    isEditMode: isReviewMode,
    isInline,
    viewOnly,
    onClose
  };

  const renderForm = () => {
    switch (formKey) {
      case "preAdmission-form":
        return (
          <PreAdmissionDialog
            {...commonProps}
            userName={userName ?? ""}
            userRole={userRole ?? ""}
            careHomeName={careHomeName ?? ""}
            initialData={editData}
          />
        );

      case "admission-form":
        return (
          <AdmissionDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
          />
        );

      case "infection-prevention":
        return (
          <InfectionPreventionDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
          />
        );

      case "blader-bowel-form":
        return (
          <BladderBowelDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
          />
        );

      case "moving-handling-form":
        return (
          <MovingHandlingDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
          />
        );

      case "long-term-fall-risk-form":
        return (
          <LongTermFallRiskDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
            isEditMode={!!editData}
          />
        );

      case "care-plan-form":
        return (
          <CarePlanDialog
            {...commonProps}
            userName={userName ?? ""}
            folderKey={folderKey ?? ""}
            initialData={carePlanInitialData}
            woundFolderId={woundFolderId}
          />
        );

      case "photography-consent":
        return (
          <PhotographyConsentDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
          />
        );

      case "dnacpr":
        return <DnacprDialog {...commonProps} initialData={editData} />;

      case "peep":
        return (
          <PeepDialog 
            {...commonProps} 
            userName={userName ?? ""} 
            careHomeName={careHomeName ?? ""}
            teamName={teamName ?? ""}
            initialData={editData} 
          />
        );

      case "dependency-assessment":
        return <DependencyAssessmentDialog {...commonProps} userName={userName ?? ""} initialData={editData} onSaveSuccess={onSaveSuccess} />;

      case "fall-risk-assessment":
        return <FallRiskAssessmentDialog {...commonProps} userName={userName ?? ""} initialData={editData} onSaveSuccess={onSaveSuccess} />;

      case "timl":
        return <TimlDialog {...commonProps} userName={userName ?? ""} initialData={editData} />;

      case "v2-personal-profile":
        return <PersonalProfileDialog {...commonProps} resident={resident} userName={userName ?? ""} initialData={editData} />;



      case "resident-valuables-form":
        return (
          <ResidentValuablesDialog {...commonProps} userName={userName ?? ""} initialData={editData} />
        );

      case "resident-handling-profile-form":
        return (
          <ResidentHandlingProfileDialog {...commonProps} userName={userName ?? ""} initialData={editData} />
        );

      case "bedrail-consent-form":
        return (
          <BedrailConsentDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
          />
        );

      case "bed-rails-risk-assessment-form":
        return (
          <BedRailsRiskAssessmentDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
          />
        );

      case "best-interest-decision-form":
        return (
          <BestInterestDecisionDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
            refreshForms={refreshForms}
          />
        );

      case "pain-assessment-form":
        return (
          <PainAssessmentV2Dialog
            {...commonProps}
            userName={userName ?? ""}
            careHomeName={careHomeName ?? ""}
            initialData={editData}
          />
        );

      case "nutritional-assessment-form":
        return (
          <NutritionalAssessmentDialog
            {...commonProps}
            userName={userName ?? ""}
            careHomeName={careHomeName ?? ""}
            initialData={editData}
          />
        );

      case "oral-assessment-form":
        return (
          <OralAssessmentDialog
            {...commonProps}
            userName={userName ?? ""}
            careHomeName={careHomeName ?? ""}
            initialData={editData}
          />
        );

      case "diet-notification-form":
        return (
          <DietNotificationDialog
            {...commonProps}
            initialData={editData}
          />
        );

      case "choking-risk-assessment-form":
        return (
          <ChokingRiskAssessmentDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
          />
        );

      case "cornell-depression-scale-form":
        return (
          <CornellDepressionScaleDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
          />
        );

      case "braden-risk-assessment-form":
        return (
          <BradenRiskAssessmentDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
            onSaveSuccess={onSaveSuccess}
          />
        );

      case "v2-restraints-risk":
        return (
          <RestraintsConsentDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
            refreshForms={refreshForms}
          />
        );

      case "smoking-risk-assessment":
        return (
          <SmokingRiskAssessmentDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
            refreshForms={refreshForms}
            onSaveSuccess={onSaveSuccess}
          />
        );

      case "v2-specimen-log":
        return (
          <SpecimenRecordLogDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
            orgLogoUrl={orgLogoUrl}
            careHomeName={careHomeName}
            refreshForms={refreshForms}
          />
        );

      case "progress-note-form":
        return (
          <ProgressNoteForm
            residentId={residentId}
            resident={resident!}
          />
        );

      case "key-worker-diary-form":
        return (
          <KeyWorkerDiaryForm
            residentId={residentId}
            resident={resident!}
          />
        );

      case "v2-capacity-consent":
        return (
          <CapacityConsentDialog
            teamId={teamId ?? ""}
            residentId={residentId}
            organizationId={organizationId}
            userId={userId}
            userName={userName ?? ""}
            resident={resident}
            onClose={onClose}
            initialData={editData}
            isEditMode={isReviewMode}
            isInline={isInline}
            viewOnly={viewOnly}
            refreshForms={refreshForms}
            careHomeName={careHomeName}
          />
        );
      case "v2-night-obs-consent":
        return (
          <NightObservationDialog
            teamId={teamId ?? ""}
            residentId={residentId}
            organizationId={organizationId}
            userId={userId}
            userName={userName ?? ""}
            resident={resident}
            onClose={onClose}
            initialData={editData}
            isEditMode={isReviewMode}
            isInline={isInline}
            viewOnly={viewOnly}
            refreshForms={refreshForms}
          />
        );


      case "v2-general-risk":
        return (
          <GeneralRiskAssessmentDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
            refreshForms={refreshForms}
          />
        );

      case "v2-must-assessment":
        return (
          <MustAssessmentDialog
            {...commonProps}
            userName={userName ?? ""}
            refreshForms={refreshForms}
          />
        );

      case "v2-abbey-pain":
        return (
          <AbbeyPainDialog
            {...commonProps}
            userName={userName ?? ""}
            initialData={editData}
            refreshForms={refreshForms}
          />
        );

      case "v2-weight-chart":
        return (
          <WeightChart
            residentId={residentId}
            residentName={`${resident?.first_name} ${resident?.last_name}`}
            hideHeader={true}
            onSaveSuccess={onSaveSuccess}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn(viewOnly && "form-view-mode")}>
      {renderForm()}
    </div>
  );
}
