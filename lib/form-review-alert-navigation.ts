import { config } from "@/config";
import type { CareFileFormKey } from "@/types/care-files";

interface FormReviewAlertMetadata {
  form_table?: string;
  form_record_id?: string;
}

const TABLE_TO_FORM_KEY: Record<string, CareFileFormKey> = {
  abbey_pain_assessments: "v2-abbey-pain",
  bedrail_consents: "bedrail-consent-form",
  bedrails_risk_assessments: "bed-rails-risk-assessment-form",
  bladder_bowel_assessments: "blader-bowel-form",
  braden_risk_assessments: "braden-risk-assessment-form",
  capacity_consents: "v2-capacity-consent",
  choking_risk_assessments: "choking-risk-assessment-form",
  cornell_depression_scales: "cornell-depression-scale-form",
  dependency_assessments: "dependency-assessment",
  diet_notifications: "diet-notification-form",
  fall_risk_assessments: "fall-risk-assessment",
  general_risk_assessments: "v2-general-risk",
  moving_handling_assessments: "moving-handling-form",
  must_assessments: "v2-must-assessment",
  nutritional_assessments: "nutritional-assessment-form",
  oral_assessments: "oral-assessment-form",
  pain_assessments: "pain-assessment-form",
  peeps: "peep",
  personal_profiles: "v2-personal-profile",
  resident_valuables_assessments: "resident-valuables-form",
  restraints_consents: "v2-restraints-risk",
  smoking_risk_assessments: "smoking-risk-assessment",
  specimen_records: "v2-specimen-log",
  key_worker_diary: "key-worker-diary-form",
};

function findFolderKeyForForm(formKey: CareFileFormKey): string | null {
  const folder = config.careFilesV2.find((careFolder) =>
    careFolder.forms.some((form) => form.key === formKey)
  );
  return folder?.key ?? null;
}

export function formReviewAlertCareFileHref(
  residentId: string,
  metadata: FormReviewAlertMetadata | null | undefined
): string | null {
  const table = metadata?.form_table;
  const formRecordId = metadata?.form_record_id;
  if (!table || !formRecordId) {
    return null;
  }

  const formKey = TABLE_TO_FORM_KEY[table];
  if (!formKey) {
    return null;
  }

  const folderKey = findFolderKeyForForm(formKey);
  if (!folderKey) {
    return null;
  }

  const params = new URLSearchParams({
    formKey,
    formRecordId,
  });
  return `/dashboard/residents/${residentId}/care-file-v2/${folderKey}?${params.toString()}`;
}
