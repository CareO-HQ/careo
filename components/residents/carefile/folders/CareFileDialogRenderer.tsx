import { Id } from "@/convex/_generated/dataModel";
import { CareFileFormKey } from "@/types/care-files";
import AdmissionDialog from "@/components/residents/carefile/dialogs/AdmissionDialog";
import BladderBowelDialog from "@/components/residents/carefile/dialogs/ContinenceDialog";
import CarePlanDialog from "@/components/residents/carefile/dialogs/CarePlanDialog";
import DependencyDialog from "@/components/residents/carefile/dialogs/DependencyDialog";
import DnacprDialog from "@/components/residents/carefile/dialogs/DnarcpDialog";
import InfectionPreventionDialog from "@/components/residents/carefile/dialogs/InfectionPreventionDialog";
import LongTermFallRiskDialog from "@/components/residents/carefile/dialogs/LongTermFallRiskDialog";
import MovingHandlingDialog from "@/components/residents/carefile/dialogs/MovingHandlingDialog";
import PainAssessmentDialog from "@/components/residents/carefile/dialogs/PainAssessmentDialog";
import PeepDialog from "@/components/residents/carefile/dialogs/PeepDialog";
import PhotographyConsentDialog from "@/components/residents/carefile/dialogs/PhotographyConsentDialog";
import PreAdmissionDialog from "@/components/residents/carefile/dialogs/PreAdmissionDialog";
import ResidentValuablesDialog from "@/components/residents/carefile/dialogs/ResidentValuables";
import SkinIntegrityDialog from "@/components/residents/carefile/dialogs/SkinIntegrityDialog";
import TimlDialog from "@/components/residents/carefile/dialogs/TimlDialog";
import ResidentHandlingProfileDialog from "@/components/residents/carefile/dialogs/ResidentHandlingProfileDialog";

interface BaseDialogProps {
  residentId: Id<"residents">;
  teamId: string | undefined;
  organizationId: string;
  userId: string;
  userName?: string;
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
  resident,
  careHomeName,
  folderKey,
  formDataForEdit,
  isReviewMode,
  onClose
}: CareFileDialogRendererProps) {
  const editData = isReviewMode ? formDataForEdit : null;

  // If we're in review mode and still loading data, show loading state
  if (isReviewMode && formDataForEdit === undefined) {
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
    isEditMode: isReviewMode,
    onClose
  };

  switch (formKey) {
    case "preAdmission-form":
      return (
        <PreAdmissionDialog
          {...commonProps}
          careHomeName={careHomeName ?? ""}
          initialData={editData}
        />
      );

    case "admission-form":
      return <AdmissionDialog {...commonProps} initialData={editData} />;

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
          initialData={editData}
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
      return <PeepDialog {...commonProps} userName={userName ?? ""} initialData={editData} />;

    case "dependency-assessment":
      return <DependencyDialog {...commonProps} userName={userName ?? ""} initialData={editData} />;

    case "timl":
      return <TimlDialog {...commonProps} userName={userName ?? ""} initialData={editData} />;

    case "skin-integrity-form":
      return <SkinIntegrityDialog {...commonProps} userName={userName ?? ""} initialData={editData} />;

    case "resident-valuables-form":
      return (
        <ResidentValuablesDialog {...commonProps} userName={userName ?? ""} initialData={editData} />
      );

    case "resident-handling-profile-form":
      return (
        <ResidentHandlingProfileDialog {...commonProps} userName={userName ?? ""} initialData={editData} />
      );

    case "pain-assessment-form":
      return (
        <PainAssessmentDialog
          {...commonProps}
          userName={userName ?? ""}
          careHomeName={careHomeName ?? ""}
          initialData={editData}
        />
      );

    default:
      return null;
  }
}
