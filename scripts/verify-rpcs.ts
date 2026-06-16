import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"(.*)"$/, "$1");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DUMMY = "00000000-0000-0000-0000-000000000000";

async function check(
  name: string,
  args: Record<string, unknown>,
  expectedColumns: string[]
) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    // PGRST203 = ambiguous overload; 42883 = function does not exist
    throw new Error(
      `RPC ${name} FAILED: ${error.code || ""} ${error.message} ${error.hint || ""}`
    );
  }
  // With a dummy resident we expect an empty array, but a real resident would have rows.
  // Either way the call resolved with the right signature.
  if (Array.isArray(data) && data.length > 0) {
    const cols = Object.keys(data[0]);
    for (const c of expectedColumns) {
      if (!cols.includes(c)) {
        throw new Error(`RPC ${name} missing expected column '${c}'. Got: ${cols.join(", ")}`);
      }
    }
  }
  console.log(`  OK  ${name} (rows: ${Array.isArray(data) ? data.length : "n/a"})`);
}

async function main() {
  console.log("Verifying paginated-date RPCs against live DB (final signatures, no overload ambiguity)...");

  // food-fluid: 6 params (no start/end date)
  await check(
    "get_paginated_food_fluid_dates",
    { p_resident_id: DUMMY, p_limit: 10, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC" },
    ["log_date", "food_count", "fluid_count", "total_dates_count"]
  );

  // night-check: 8 params (incl. start/end date)
  await check(
    "get_paginated_night_check_dates",
    { p_resident_id: DUMMY, p_limit: 10, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC", p_start_date: null, p_end_date: null },
    ["log_date", "record_count", "total_dates_count"]
  );

  // continence: 8 params
  await check(
    "get_paginated_continence_dates",
    { p_resident_id: DUMMY, p_limit: 10, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC", p_start_date: null, p_end_date: null },
    ["log_date", "bowel_count", "urine_count", "total_dates_count"]
  );

  // daily-care: 8 params
  await check(
    "get_paginated_daily_care_dates",
    { p_resident_id: DUMMY, p_limit: 10, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC", p_start_date: null, p_end_date: null },
    ["log_date", "personal_care_count", "activity_record_count", "total_dates_count"]
  );

  console.log("All paginated-date RPCs are callable with their final signatures (no ambiguity).");
}

main().catch((err) => {
  console.error("RPC verification FAILED:\n", err.message || err);
  process.exit(1);
});
