const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

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

async function run() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!url || !key || !cronSecret) {
    throw new Error("Missing env vars for e2e test");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: residents, error: residentError } = await supabase
    .from("residents")
    .select("id, first_name, last_name, photo_updated_at")
    .eq("is_active", true)
    .limit(1);

  if (residentError) throw residentError;
  if (!residents || residents.length === 0) {
    throw new Error("No active resident found for e2e test");
  }

  const resident = residents[0];
  const oldPhotoUpdatedAt = resident.photo_updated_at;
  const overdueIso = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 7).toISOString();

  const { error: setDueError } = await supabase
    .from("residents")
    .update({ photo_updated_at: overdueIso })
    .eq("id", resident.id);
  if (setDueError) throw setDueError;

  const cronResponse = await fetch("http://localhost:3000/api/cron/resident-photo-refresh-alerts", {
    method: "GET",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const cronText = await cronResponse.text();
  let cronBody = cronText;
  try {
    cronBody = JSON.parse(cronText);
  } catch {
    // keep raw text
  }

  const { data: alerts, error: alertError } = await supabase
    .from("alerts")
    .select("id, type, severity, title, is_resolved, created_at")
    .eq("resident_id", resident.id)
    .eq("type", "resident_photo_refresh_required")
    .eq("is_resolved", false)
    .order("created_at", { ascending: false })
    .limit(1);
  if (alertError) throw alertError;

  const createdAlert = alerts && alerts[0] ? alerts[0] : null;

  const restorePayload = oldPhotoUpdatedAt
    ? { photo_updated_at: oldPhotoUpdatedAt }
    : { photo_updated_at: null };
  const { error: restoreError } = await supabase
    .from("residents")
    .update(restorePayload)
    .eq("id", resident.id);
  if (restoreError) throw restoreError;

  if (createdAlert) {
    const { error: resolveError } = await supabase
      .from("alerts")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", createdAlert.id);
    if (resolveError) throw resolveError;
  }

  console.log(
    JSON.stringify(
      {
        testedResident: {
          id: resident.id,
          name: [resident.first_name, resident.last_name].filter(Boolean).join(" ") || "Unknown",
        },
        cronHttpStatus: cronResponse.status,
        cronBody,
        alertCreated: Boolean(createdAlert),
        alert: createdAlert,
        cleanup: {
          restoredPhotoUpdatedAt: true,
          resolvedTestAlert: Boolean(createdAlert),
        },
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
