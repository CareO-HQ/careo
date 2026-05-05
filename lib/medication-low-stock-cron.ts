import type { SupabaseClient } from "@supabase/supabase-js";

const LOW_STOCK_ALERT_TARGET_ROLES = ["nurse", "manager", "owner"] as const;
const LOW_STOCK_THRESHOLD_DAYS = 10;

interface MedicationRow {
  id: string;
  resident_id: string;
  name: string;
  schedule_type: string;
  times: string[] | null;
  time_quantities: Record<string, number> | null;
  total_count: number | null;
  organization_id: string;
  care_home_id: string | null;
  status: string;
}

interface AlertMetadataRow {
  id: string;
  metadata: { medication_id?: string; alert_subtype?: string } | null;
}

function getDailyDose(med: MedicationRow): number {
  if (med.schedule_type === "PRN (As Needed)") return 1;

  if (med.time_quantities && typeof med.time_quantities === "object") {
    const quantities = Object.values(med.time_quantities);
    const sum = quantities.reduce((acc, val) => acc + (Number(val) || 0), 0);
    if (sum > 0) return sum;
  }

  if (med.times && Array.isArray(med.times)) {
    return med.times.length > 0 ? med.times.length : 1;
  }

  return 1;
}

async function findUnresolvedLowStockAlert(
  supabase: SupabaseClient,
  residentId: string,
  medicationId: string
): Promise<AlertMetadataRow | null> {
  const { data: allAlerts, error } = await supabase
    .from("alerts")
    .select("id, metadata")
    .eq("type", "medication")
    .eq("resident_id", residentId)
    .eq("is_resolved", false);

  if (error) {
    console.error("[medication-low-stock] find alert error:", error);
    return null;
  }

  const found = (allAlerts as AlertMetadataRow[] | null)?.find(
    (a) =>
      a.metadata?.medication_id === medicationId &&
      a.metadata?.alert_subtype === "low_stock"
  );
  return found ?? null;
}

async function resolveLowStockAlert(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("alerts")
    .update({
      is_resolved: true,
      resolved_at: nowIso,
      resolution_note: "Auto-resolved: Stock is no longer low.",
    })
    .eq("id", alertId);

  if (error) {
    console.error("[medication-low-stock] resolve alert error:", error);
  }
}

async function upsertLowStockAlert(
  supabase: SupabaseClient,
  med: MedicationRow,
  remainingDays: number
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const existing = await findUnresolvedLowStockAlert(
    supabase,
    med.resident_id,
    med.id
  );

  const alertData = {
    resident_id: med.resident_id,
    type: "medication" as const,
    severity: "warning" as const,
    title: "Low Medication Stock",
    message: `${med.name} will only last ${remainingDays} days. Please restock.`,
    organization_id: med.organization_id,
    care_home_id: med.care_home_id,
    target_roles: [...LOW_STOCK_ALERT_TARGET_ROLES],
    metadata: { medication_id: med.id, alert_subtype: "low_stock" },
    updated_at: nowIso,
  };

  if (existing) {
    const { error } = await supabase
      .from("alerts")
      .update(alertData)
      .eq("id", existing.id);

    if (error) {
      console.error("[medication-low-stock] update alert error:", error);
      return false;
    }
    return true;
  }

  const { error } = await supabase.from("alerts").insert(alertData);
  if (error) {
    console.error("[medication-low-stock] insert alert error:", error);
    return false;
  }
  return true;
}

/**
 * Evaluates a single medication for low stock.
 * Calculates remaining days based on daily dose and total_count.
 * Updates or resolves alerts accordingly.
 */
export async function evaluateMedicationLowStock(
  supabase: SupabaseClient,
  medicationId: string
): Promise<void> {
  const { data: med, error } = await supabase
    .from("medications")
    .select("*")
    .eq("id", medicationId)
    .single();

  if (error || !med) {
    console.error("[medication-low-stock] failed to fetch med:", error);
    return;
  }

  // PRN logic: fallbacks to 1 daily dose. If stock is 0, it will still trigger.
  const currentStock = med.total_count ?? 0;
  
  if (med.status !== "active") {
    // If not active, resolve any existing alert
    const existing = await findUnresolvedLowStockAlert(supabase, med.resident_id, med.id);
    if (existing) {
      await resolveLowStockAlert(supabase, existing.id);
    }
    return;
  }

  const dailyDose = getDailyDose(med as MedicationRow);
  const remainingDays = Math.floor(currentStock / dailyDose);

  if (remainingDays <= LOW_STOCK_THRESHOLD_DAYS) {
    await upsertLowStockAlert(supabase, med as MedicationRow, remainingDays);
  } else {
    // If stock is sufficient, resolve any existing alert
    const existing = await findUnresolvedLowStockAlert(supabase, med.resident_id, med.id);
    if (existing) {
      await resolveLowStockAlert(supabase, existing.id);
    }
  }
}

/**
 * Cron function to evaluate all active medications for low stock.
 */
export async function runMedicationLowStockCron(
  supabase: SupabaseClient
): Promise<{ evaluated: number; updated: number }> {
  // Fetch all active medications that have some tracking (total_count is not null)
  // Even if total_count is 0, we want to evaluate it.
  const { data: medications, error } = await supabase
    .from("medications")
    .select("*")
    .eq("status", "active")
    .not("total_count", "is", null);

  if (error) {
    throw new Error(`medications query error: ${error.message}`);
  }

  let updatedCount = 0;

  for (const raw of medications ?? []) {
    const med = raw as MedicationRow;
    const currentStock = med.total_count ?? 0;
    const dailyDose = getDailyDose(med);
    const remainingDays = Math.floor(currentStock / dailyDose);

    if (remainingDays <= LOW_STOCK_THRESHOLD_DAYS) {
      const ok = await upsertLowStockAlert(supabase, med, remainingDays);
      if (ok) updatedCount++;
    } else {
      const existing = await findUnresolvedLowStockAlert(supabase, med.resident_id, med.id);
      if (existing) {
        await resolveLowStockAlert(supabase, existing.id);
        updatedCount++;
      }
    }
  }

  return { evaluated: medications?.length ?? 0, updated: updatedCount };
}
