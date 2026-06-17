import { createClient } from '@supabase/supabase-js';
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
    const rawValue = line.slice(idx + 1).trim();
    const value = rawValue.replace(/^"(.*)"$/, "$1");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  // Let's query one of the action plans to see the exact field types and values
  const { data: plans, error } = await supabase
    .from("care_home_common_action_plans")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error querying action plans:", error);
    return;
  }

  console.log("Existing Plan:", JSON.stringify(plans, null, 2));

  // Let's test the regular expressions in javascript to see if they match the UUIDs of the first plan
  if (plans && plans.length > 0) {
    const plan = plans[0];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    
    console.log("JavaScript Regex matching checks:");
    console.log("assigned_to:", plan.assigned_to, "Matches:", uuidRegex.test(plan.assigned_to));
    console.log("organization_id:", plan.organization_id, "Matches:", uuidRegex.test(plan.organization_id));
  }
}

main();
