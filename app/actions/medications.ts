"use server";

import { createClient } from "@supabase/supabase-js";
import { evaluateMedicationLowStock } from "@/lib/medication-low-stock-cron";

export async function checkMedicationLowStockAction(medicationId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceRoleKey) {
    console.error("Missing Supabase environment variables for Server Action");
    return;
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  await evaluateMedicationLowStock(supabase, medicationId);
}
