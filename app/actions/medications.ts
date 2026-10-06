"use server";

import { evaluateMedicationLowStock } from "@/lib/medication-low-stock-cron";
import { getServiceClient, requireSessionActor } from "@/lib/server-auth";

export async function checkMedicationLowStockAction(medicationId: string) {
  let supabase;
  try {
    const actor = await requireSessionActor();
    supabase = getServiceClient();
    const { data: medication } = await supabase
      .from("medications")
      .select("organization_id")
      .eq("id", medicationId)
      .single();
    if (!medication || (!actor.is_saas_admin && medication.organization_id !== actor.active_organization_id)) {
      return;
    }
  } catch (error) {
    console.error("checkMedicationLowStockAction rejected:", error);
    return;
  }

  await evaluateMedicationLowStock(supabase, medicationId);
}
