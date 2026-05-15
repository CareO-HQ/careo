/**
 * CareO resident care file audit URLs (distinct from manager-audit history routes).
 */

export function careFileAuditHubPath(residentId: string): string {
  return `/dashboard/careo-audit/${residentId}/carefileaudit`;
}

/** Completed audits list for one template. */
export function careFileAuditTemplateHistoryPath(
  residentId: string,
  templateId: string
): string {
  return `${careFileAuditHubPath(residentId)}/template/${templateId}/history`;
}

/** Single completed care file audit (completion / response id). */
export function careFileAuditCompletionPath(
  residentId: string,
  completionId: string
): string {
  return `${careFileAuditHubPath(residentId)}/completion/${completionId}`;
}
