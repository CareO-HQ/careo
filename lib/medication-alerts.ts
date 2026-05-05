import type { SupabaseClient } from "@supabase/supabase-js";

export const PRN_PROTOCOL_PENDING_12H_ALERT_TYPE = "prn_protocol_pending_12h";
export const PRN_PROTOCOL_ALERT_WINDOW_HOURS = 12;
export const PRN_PROTOCOL_ALERT_WINDOW_MS = PRN_PROTOCOL_ALERT_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * Marks unresolved PRN protocol pending alerts for this medication as resolved
 * after a PRN protocol form is submitted (client-side, user session).
 */
export async function resolvePrnProtocolPendingAlertsForMedication(
  supabase: SupabaseClient,
  params: {
    residentId: string;
    medicationId: string;
    resolvedByUserId?: string;
  }
): Promise<void> {
  const { data: rows, error: selectError } = await supabase
    .from("alerts")
    .select("id")
    .eq("resident_id", params.residentId)
    .eq("type", PRN_PROTOCOL_PENDING_12H_ALERT_TYPE)
    .eq("is_resolved", false)
    .filter("metadata->>medication_id", "eq", params.medicationId);

  if (selectError) {
    console.warn("resolvePrnProtocolPendingAlertsForMedication select:", selectError);
    return;
  }

  const ids = (rows ?? []).map((row) => row.id).filter(Boolean);
  if (ids.length === 0) {
    return;
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("alerts")
    .update({
      is_resolved: true,
      resolved_at: now,
      resolved_by: params.resolvedByUserId ?? null,
      resolution_note: "Auto-resolved: PRN protocol form completed",
    })
    .in("id", ids)
    .eq("is_resolved", false);

  if (updateError) {
    console.warn("resolvePrnProtocolPendingAlertsForMedication update:", updateError);
  }
}
