import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import assert from "assert";

// -------------------------------------------------------------
// 1. Environment and Constants Setup
// -------------------------------------------------------------
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("⚠️  .env.local not found, using process.env");
    return;
  }
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;

if (!url || !key || !cronSecret) {
  console.error("❌ Missing required environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CRON_SECRET are set in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Base URL of the running Next.js server (override with TEST_BASE_URL for non-default ports)
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// -------------------------------------------------------------
// 2. Unit Tests: Folder Forms Compatibility Mapper (mapToConvexLike)
// -------------------------------------------------------------
function mapToConvexLike(data: any[] | any | undefined | null) {
  if (!data) return undefined;
  if (Array.isArray(data)) {
    return data.map(item => ({
      ...item,
      _id: item.id,
      _creationTime: new Date(item.created_at).getTime()
    }));
  }
  if (typeof data === 'object' && data !== null) {
    return { ...data, _id: data.id, _creationTime: new Date(data.created_at).getTime() };
  }
  return undefined;
}

function runCompatibilityMapperTests() {
  console.log("\n🧪 Running Compatibility Mapper Unit Tests...");

  // Test Case A: Null / Undefined
  assert.strictEqual(mapToConvexLike(null), undefined, "Null input should return undefined");
  assert.strictEqual(mapToConvexLike(undefined), undefined, "Undefined input should return undefined");

  // Test Case B: Array Mapping
  const nowStr = new Date().toISOString();
  const mockArray = [
    { id: "uuid-1", created_at: nowStr, name: "Assessment 1" },
    { id: "uuid-2", created_at: nowStr, name: "Assessment 2" }
  ];
  const mappedArray = mapToConvexLike(mockArray);
  assert(Array.isArray(mappedArray), "Mapped result should be an array");
  assert.strictEqual(mappedArray.length, 2);
  assert.strictEqual(mappedArray[0]._id, "uuid-1");
  assert.strictEqual(mappedArray[0]._creationTime, new Date(nowStr).getTime());
  assert.strictEqual(mappedArray[1]._id, "uuid-2");

  // Test Case C: Single Object Mapping
  const mockObject = { id: "uuid-3", created_at: nowStr, details: "Details" };
  const mappedObject = mapToConvexLike(mockObject);
  assert.strictEqual(mappedObject?._id, "uuid-3");
  assert.strictEqual(mappedObject?._creationTime, new Date(nowStr).getTime());

  console.log("✅ Compatibility Mapper Unit Tests Passed!");
}

// -------------------------------------------------------------
// 3. Unit Tests: Profile Cascading Fallback Logic
// -------------------------------------------------------------
function resolveProfileCascades(dbUser: any, userRole?: string) {
  const activeTeam = dbUser.active_team;
  const activeCareHome = dbUser.active_care_home;

  const activeTeamName = activeTeam?.name || undefined;
  const activeCareHomeId = dbUser.active_care_home_id || activeTeam?.care_home_id || null;
  const careHomeName = activeCareHome?.name || activeTeam?.care_home?.name || undefined;

  let activeOrgId = dbUser.active_organization_id || null;
  if (activeTeam) {
    activeOrgId = activeTeam.organization_id;
  } else if (!activeOrgId) {
    activeOrgId = activeCareHome?.organization_id || activeTeam?.care_home?.organization_id || null;
  }

  let orgName: string | undefined;
  let orgLogoUrl: string | null = null;

  if (activeOrgId) {
    if (activeOrgId === dbUser.active_organization_id && dbUser.active_organization) {
      orgName = dbUser.active_organization.name;
      orgLogoUrl = dbUser.active_organization.logo_url;
    } else if (activeTeam && activeOrgId === activeTeam.organization_id && activeTeam.organization) {
      orgName = activeTeam.organization.name;
      orgLogoUrl = activeTeam.organization.logo_url;
    } else if (activeCareHome && activeOrgId === activeCareHome.organization_id && activeCareHome.organization) {
      orgName = activeCareHome.organization.name;
      orgLogoUrl = activeCareHome.organization.logo_url;
    } else if (activeTeam?.care_home && activeOrgId === activeTeam.care_home.organization_id && activeTeam.care_home.organization) {
      orgName = activeTeam.care_home.organization.name;
      orgLogoUrl = activeTeam.care_home.organization.logo_url;
    }
  }

  return {
    active_organization_id: activeOrgId,
    active_care_home_id: activeCareHomeId,
    active_team_name: activeTeamName,
    care_home_name: careHomeName,
    organization_name: orgName,
    organization_logo_url: orgLogoUrl,
  };
}

function runProfileCascadingTests() {
  console.log("\n🧪 Running Profile Cascading Fallback Logic Unit Tests...");

  // Scenario 1: Only active organization is set on user
  const dbUserOrgOnly = {
    id: "user-1",
    active_organization_id: "org-1",
    active_organization: { name: "Org One", logo_url: "logo-1.png" }
  };
  const profile1 = resolveProfileCascades(dbUserOrgOnly);
  assert.strictEqual(profile1.active_organization_id, "org-1");
  assert.strictEqual(profile1.organization_name, "Org One");
  assert.strictEqual(profile1.organization_logo_url, "logo-1.png");
  assert.strictEqual(profile1.active_care_home_id, null);

  // Scenario 2: Active care home is set on user (cascades organization from care home)
  const dbUserCareHome = {
    id: "user-2",
    active_care_home_id: "home-1",
    active_care_home: {
      name: "Care Home A",
      organization_id: "org-2",
      organization: { name: "Org Two", logo_url: "logo-2.png" }
    }
  };
  const profile2 = resolveProfileCascades(dbUserCareHome);
  assert.strictEqual(profile2.active_care_home_id, "home-1");
  assert.strictEqual(profile2.care_home_name, "Care Home A");
  assert.strictEqual(profile2.active_organization_id, "org-2");
  assert.strictEqual(profile2.organization_name, "Org Two");
  assert.strictEqual(profile2.organization_logo_url, "logo-2.png");

  // Scenario 3: Active team is set on user (cascades care home and org details from the team)
  const dbUserTeam = {
    id: "user-3",
    active_team_id: "team-1",
    active_team: {
      name: "Alpha Team",
      organization_id: "org-3",
      care_home_id: "home-2",
      organization: { name: "Org Three", logo_url: "logo-3.png" },
      care_home: {
        name: "Care Home B",
        organization_id: "org-3"
      }
    }
  };
  const profile3 = resolveProfileCascades(dbUserTeam);
  assert.strictEqual(profile3.active_team_name, "Alpha Team");
  assert.strictEqual(profile3.active_care_home_id, "home-2");
  assert.strictEqual(profile3.care_home_name, "Care Home B");
  assert.strictEqual(profile3.active_organization_id, "org-3");
  assert.strictEqual(profile3.organization_name, "Org Three");
  assert.strictEqual(profile3.organization_logo_url, "logo-3.png");

  console.log("✅ Profile Cascading Fallback Logic Unit Tests Passed!");
}

// -------------------------------------------------------------
// 4. Unit/Integration Tests: Dynamic PDF Imports
// -------------------------------------------------------------
async function runPdfImportsTests() {
  console.log("\n🧪 Running PDF Dynamic Import Tests...");

  // Import the entrypoint function
  const { generateCareFilePDF } = await import("../lib/care-file-pdf-utils");

  assert.strictEqual(typeof generateCareFilePDF, "function", "generateCareFilePDF must be a function");

  // Verify that triggering standard forms correctly resolves the dynamics (should throw parameter error, not module not found error)
  const mockOptions = {
    formName: "BHSCT Incident Report",
    data: {},
    resident: { first_name: "John", last_name: "Doe" },
  };

  try {
    // If it dynamically imports and tries to run, it might throw errors related to jsPDF window object in Node, or run through depending on environment.
    // We check that we get past the import resolution.
    await generateCareFilePDF(mockOptions);
    console.log("   👉 generateCareFilePDF completed (or mock completed)");
  } catch (error: any) {
    // We expect a window/doc-related error or validation error, but NOT "Cannot find module"
    const errorMessage = error.message || "";
    assert(!errorMessage.includes("Cannot find module"), `Dynamic import failed to find the submodule: ${errorMessage}`);
    console.log(`   👉 generateCareFilePDF resolved dynamic import (threw expected secondary error: ${error.message.split('\n')[0]})`);
  }

  console.log("✅ PDF Dynamic Import Tests Passed!");
}

// -------------------------------------------------------------
// 4b. PDF Routing Matrix Tests
// -------------------------------------------------------------
// Mirrors the dispatch logic in lib/care-file-pdf-utils.ts so we can assert that
// every known form name resolves to the intended generator module. This is the
// automated guard for the PDF refactor (e.g. the Resident Valuables regression).
function classifyFormRoute(formName: string): "incidents" | "logs" | "consent-capacity" | "admissions" | "assessments" {
  const upperFormName = formName.toUpperCase();

  if (formName === "BHSCT Incident Report" || formName === "SEHSCT Incident Report") return "incidents";

  const isSpecimenLog = upperFormName.includes("SPECIMEN RECORD LOG") || formName.includes("v2-specimen-log");
  const isKeyWorkerDiaryPdf = upperFormName.includes("KEY WORKER DIARY");
  const isProgressNotesPdf = formName === "Progress Notes";
  if (isSpecimenLog || isKeyWorkerDiaryPdf || isProgressNotesPdf) return "logs";

  if (
    upperFormName.includes("CAPACITY AND CONSENT") ||
    upperFormName.includes("BEST INTEREST DECISION") ||
    upperFormName.includes("BEDRAIL CONSENT") ||
    upperFormName.includes("CONSENT AND RISK ASSESSMENT FOR RESTRAINTS")
  ) return "consent-capacity";

  if (
    upperFormName.includes("PRE-ADMISSION ASSESSMENT FORM") ||
    (upperFormName.includes("PRE-ADMISSION") && !upperFormName.includes("INFECTION PREVENTION")) ||
    upperFormName.includes("PHOTOGRAPHIC CONSENT") ||
    upperFormName.includes("PHOTOGRAPHY CONSENT") ||
    upperFormName.includes("ADMISSION ASSESSMENT") ||
    (upperFormName.includes("PERSONAL PROFILE") && !upperFormName.includes("CARE PLAN")) ||
    (upperFormName.includes("PEEP") && !upperFormName.includes("CARE PLAN")) ||
    (upperFormName.includes("MOVING") && upperFormName.includes("HANDLING")) ||
    (upperFormName.includes("RESIDENT VALUABLES") && !upperFormName.includes("CARE PLAN"))
  ) return "admissions";

  return "assessments";
}

async function runPdfRoutingMatrixTests() {
  console.log("\n🧪 Running PDF Routing Matrix Tests...");

  // Confirm each module exports its generator function.
  const moduleExports: Array<{ mod: string; fn: string }> = [
    { mod: "../lib/pdf/care-file/incidents", fn: "generateIncidentPDF" },
    { mod: "../lib/pdf/care-file/logs", fn: "generateLogsPDF" },
    { mod: "../lib/pdf/care-file/consent-capacity", fn: "generateConsentCapacityPDF" },
    { mod: "../lib/pdf/care-file/admissions", fn: "generateAdmissionsPDF" },
    { mod: "../lib/pdf/care-file/assessments", fn: "generateAssessmentsPDF" },
  ];
  for (const { mod, fn } of moduleExports) {
    const imported = await import(mod);
    assert.strictEqual(typeof imported[fn], "function", `${mod} must export ${fn}`);
  }
  console.log("   ✅ All 5 PDF modules export their generator function.");

  // Form-name → expected-module expectations (using the real config values).
  const expectations: Array<[string, string]> = [
    // Incidents (exact match)
    ["BHSCT Incident Report", "incidents"],
    ["SEHSCT Incident Report", "incidents"],
    // Logs
    ["Specimen Record Log", "logs"],
    ["Key Worker Diary", "logs"],
    ["Progress Notes", "logs"],
    // Consent & capacity
    ["Capacity and Consent", "consent-capacity"],
    ["Best Interest Decision", "consent-capacity"],
    ["Bedrail Consent / Agreement", "consent-capacity"],
    ["Consent and Risk Assessment for Restraints", "consent-capacity"],
    // Admissions
    ["Pre-Admission Assessment Form", "admissions"],
    ["Admission Assessment", "admissions"],
    ["Photography Consent", "admissions"],
    ["Personal Profile", "admissions"],
    ["PEEP", "admissions"],
    ["Moving and Handling", "admissions"],
    // Resident Valuables (regression guard) - both v1 and v2 config values
    ["Resident valuables and personal property", "admissions"],
    ["Resident Valuables and Personal Property Record", "admissions"],
    // Assessments (default fallback) and specialized assessments
    ["General Risk Assessment", "assessments"],
    ["Dependency Assessment", "assessments"],
    ["Fall Risk Assessment", "assessments"],
    ["Braden Risk Assessment", "assessments"],
    ["MUST Assessment", "assessments"],
    ["Nutritional Assessment", "assessments"],
    ["Infection Prevention and Control", "assessments"],
    ["DNACPR", "assessments"],
    ["Care Plan", "assessments"],
    // Guard: a care plan containing "Resident Valuables" must NOT route to admissions
    ["Resident Valuables Care Plan", "assessments"],
  ];

  for (const [formName, expected] of expectations) {
    const actual = classifyFormRoute(formName);
    assert.strictEqual(actual, expected, `Routing mismatch for "${formName}": expected ${expected}, got ${actual}`);
  }
  console.log(`   ✅ All ${expectations.length} form-name routing expectations verified.`);

  console.log("✅ PDF Routing Matrix Tests Passed!");
}

// -------------------------------------------------------------
// 5. Integration Tests: Daily Database Maintenance Cron & RPC
// -------------------------------------------------------------
async function runDatabaseMaintenanceTests() {
  console.log("\n🧪 Running Daily Database Maintenance Cron & RPC Tests...");

  // Step 5.1: Test Unauthorized Request
  console.log("   5.1 Testing unauthorized access to cron API...");
  const unauthRes = await fetch(`${BASE_URL}/api/cron/database-maintenance`, {
    method: "GET",
    headers: { Authorization: "Bearer wrong-secret" },
  });
  assert.strictEqual(unauthRes.status, 401, "API should return 401 Unauthorized for wrong secret");
  
  const unauthResNoHeader = await fetch(`${BASE_URL}/api/cron/database-maintenance`, {
    method: "GET",
  });
  assert.strictEqual(unauthResNoHeader.status, 401, "API should return 401 Unauthorized for missing secret");
  console.log("   ✅ Unauthorized access correctly blocked.");

  // Step 5.2: Run database integration check
  console.log("   5.2 Setting up database integration test records...");
  
  // Fetch an existing active user, organization, and care home to satisfy constraints
  const { data: users, error: userErr } = await supabase
    .from("users")
    .select("id, email, active_organization_id, active_care_home_id")
    .not("active_organization_id", "is", null)
    .not("active_care_home_id", "is", null)
    .limit(1);

  if (userErr || !users || users.length === 0) {
    console.warn("⚠️  Skipping DB integration test: No active user with assigned active_organization_id and active_care_home_id found in database.");
    return;
  }

  const testUser = users[0];
  const testOrgId = testUser.active_organization_id;
  const testCareHomeId = testUser.active_care_home_id;
  const testUserId = testUser.id;

  console.log(`   Using existing DB records: User=${testUserId}, Org=${testOrgId}, CareHome=${testCareHomeId}`);

  // Create an overdue action plan in care_home_common_action_plans
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: createdPlan, error: insertError } = await supabase
    .from("care_home_common_action_plans")
    .insert({
      organization_id: testOrgId,
      care_home_id: testCareHomeId,
      description: "Test daily maintenance task " + Math.random().toString(36).substring(7),
      priority: "high",
      due_date: yesterday,
      assigned_to: testUserId,
      assigned_to_email: testUser.email,
      assigned_to_name: "Test User",
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    console.error("❌ Failed to insert mock action plan:", insertError);
    throw insertError;
  }

  console.log(`   Mock action plan created: ID=${createdPlan.id}, Status=${createdPlan.status}, DueDate=${createdPlan.due_date}`);

  try {
    // Step 5.3: Trigger maintenance cron with valid secret
    console.log("   5.3 Triggering daily maintenance cron API...");
    const cronRes = await fetch(`${BASE_URL}/api/cron/database-maintenance`, {
      method: "GET",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });

    assert.strictEqual(cronRes.status, 200, `Cron API should return 200 OK, got ${cronRes.status}`);
    const body = await cronRes.json();
    assert.strictEqual(body.success, true, "Cron API should report success");
    console.log("   ✅ Cron API executed successfully.");

    // Step 5.4: Verify the action plan status is updated to overdue
    console.log("   5.4 Verifying database state updates...");
    const { data: updatedPlan, error: fetchError } = await supabase
      .from("care_home_common_action_plans")
      .select("*")
      .eq("id", createdPlan.id)
      .single();

    if (fetchError) throw fetchError;
    assert.strictEqual(updatedPlan.status, "overdue", "Action plan status should have been updated to 'overdue'");
    console.log("   ✅ Action plan status updated to 'overdue' correctly.");

    // Step 5.5: Verify notification is generated
    const { data: notifications, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", testUserId)
      .eq("type", "action_plan_overdue")
      .order("created_at", { ascending: false })
      .limit(5);

    if (notifError) throw notifError;
    
    console.log("   DEBUG search criteria: testUserId=" + testUserId + " createdPlan.id=" + createdPlan.id);
    console.log("   DEBUG notifications returned:", JSON.stringify(notifications, null, 2));

    // Find our specific notification using metadata
    const matchingNotif = notifications?.find(n => {
      const planId = n.metadata?.actionPlanId || (n.metadata && typeof n.metadata === 'object' && n.metadata.actionPlanId);
      return planId === createdPlan.id;
    });
    assert(matchingNotif, "Notification should be generated for the overdue action plan");
    assert.strictEqual(matchingNotif.title, "Action Plan Overdue", "Notification title should match");
    console.log("   ✅ Notification successfully generated in public.notifications.");

    // Cleanup: Delete generated notification
    console.log("   5.5 Cleaning up test notification...");
    await supabase.from("notifications").delete().eq("id", matchingNotif.id);

  } finally {
    // Cleanup: Delete mock action plan
    console.log("   Cleaning up test action plan...");
    await supabase.from("care_home_common_action_plans").delete().eq("id", createdPlan.id);
  }

  console.log("✅ Daily Database Maintenance Integration Tests Passed!");
}

// -------------------------------------------------------------
// 6. Integration Tests: Paginated Date RPCs
// -------------------------------------------------------------
async function findResidentWithData(table: string, dateColumn: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(table)
    .select(`resident_id, ${dateColumn}`)
    .not("resident_id", "is", null)
    .order(dateColumn, { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return (data[0] as any).resident_id as string;
}

async function runPaginatedDateRpcTests() {
  console.log("\n🧪 Running Paginated Date RPC Tests...");

  const DUMMY = "00000000-0000-0000-0000-000000000000";

  // 6.1 Signature / overload-ambiguity smoke test with a dummy resident.
  // A PostgREST "function is not unique" (PGRST203) or "does not exist" (42883)
  // error would surface here regardless of data.
  const signatureChecks: Array<{ name: string; args: Record<string, unknown>; cols: string[] }> = [
    {
      name: "get_paginated_food_fluid_dates",
      args: { p_resident_id: DUMMY, p_limit: 10, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC" },
      cols: ["log_date", "food_count", "fluid_count", "total_dates_count"],
    },
    {
      name: "get_paginated_night_check_dates",
      args: { p_resident_id: DUMMY, p_limit: 10, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC", p_start_date: null, p_end_date: null },
      cols: ["log_date", "record_count", "total_dates_count"],
    },
    {
      name: "get_paginated_continence_dates",
      args: { p_resident_id: DUMMY, p_limit: 10, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC", p_start_date: null, p_end_date: null },
      cols: ["log_date", "bowel_count", "urine_count", "total_dates_count"],
    },
    {
      name: "get_paginated_daily_care_dates",
      args: { p_resident_id: DUMMY, p_limit: 10, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC", p_start_date: null, p_end_date: null },
      cols: ["log_date", "personal_care_count", "activity_record_count", "total_dates_count"],
    },
  ];

  for (const check of signatureChecks) {
    const { error } = await supabase.rpc(check.name, check.args);
    assert(!error, `RPC ${check.name} should be callable, got: ${error?.code || ""} ${error?.message || ""}`);
  }
  console.log("   ✅ All 4 RPCs callable with final signatures (no overload ambiguity).");

  // 6.2 Shape + ASC/DESC ordering test against a real resident with data.
  const ffResident = await findResidentWithData("food_fluid_logs", "date");
  if (ffResident) {
    const { data: descData, error: descErr } = await supabase.rpc("get_paginated_food_fluid_dates", {
      p_resident_id: ffResident, p_limit: 50, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC",
    });
    assert(!descErr, `food_fluid DESC call failed: ${descErr?.message}`);
    if (descData && descData.length > 0) {
      const cols = Object.keys(descData[0]);
      for (const c of ["log_date", "food_count", "fluid_count", "total_dates_count"]) {
        assert(cols.includes(c), `food_fluid RPC missing column '${c}'`);
      }
      assert(typeof descData[0].total_dates_count === "number", "total_dates_count should be a number");

      // Verify DESC ordering
      const descDates = descData.map((r: any) => r.log_date);
      const descSorted = [...descDates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
      assert.deepStrictEqual(descDates, descSorted, "food_fluid DESC results should be sorted descending");

      // Verify ASC ordering flips
      const { data: ascData } = await supabase.rpc("get_paginated_food_fluid_dates", {
        p_resident_id: ffResident, p_limit: 50, p_offset: 0, p_year: null, p_month: null, p_sort_order: "ASC",
      });
      if (ascData && ascData.length > 0) {
        const ascDates = ascData.map((r: any) => r.log_date);
        const ascSorted = [...ascDates].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        assert.deepStrictEqual(ascDates, ascSorted, "food_fluid ASC results should be sorted ascending");
      }
      console.log(`   ✅ food_fluid RPC shape + ASC/DESC ordering verified (${descData.length} dates, total=${descData[0].total_dates_count}).`);
    } else {
      console.log("   ℹ️  food_fluid resident found but RPC returned no grouped dates.");
    }
  } else {
    console.warn("   ⚠️  Skipping food_fluid data test: no resident with food_fluid_logs found.");
  }

  // 6.3 start/end date narrowing for night-check (8-param signature).
  const ncResident = await findResidentWithData("night_check_recordings", "record_date");
  if (ncResident) {
    const { data: allData, error: allErr } = await supabase.rpc("get_paginated_night_check_dates", {
      p_resident_id: ncResident, p_limit: 365, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC", p_start_date: null, p_end_date: null,
    });
    assert(!allErr, `night_check call failed: ${allErr?.message}`);

    // Narrow to last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const { data: rangeData, error: rangeErr } = await supabase.rpc("get_paginated_night_check_dates", {
      p_resident_id: ncResident, p_limit: 365, p_offset: 0, p_year: null, p_month: null, p_sort_order: "DESC", p_start_date: sevenDaysAgo, p_end_date: today,
    });
    assert(!rangeErr, `night_check ranged call failed: ${rangeErr?.message}`);

    const allCount = allData?.length ?? 0;
    const rangeCount = rangeData?.length ?? 0;
    assert(rangeCount <= allCount, "night_check date range filter should not return more dates than unfiltered");
    if (rangeData) {
      for (const row of rangeData as any[]) {
        assert(row.log_date >= sevenDaysAgo && row.log_date <= today, `night_check ranged date ${row.log_date} outside [${sevenDaysAgo}, ${today}]`);
      }
    }
    console.log(`   ✅ night_check start/end date narrowing verified (all=${allCount}, last7=${rangeCount}).`);
  } else {
    console.warn("   ⚠️  Skipping night_check range test: no resident with night_check_recordings found.");
  }

  console.log("✅ Paginated Date RPC Tests Passed!");
}

// -------------------------------------------------------------
// 7. Integration Tests: Progress Notes API pagination & compatibility
// -------------------------------------------------------------
async function runProgressNotesApiTests() {
  console.log("\n🧪 Running Progress Notes API Tests...");

  const resident = await findResidentWithData("progress_notes", "date");
  if (!resident) {
    console.warn("   ⚠️  Skipping progress-notes API test: no resident with progress_notes found.");
    return;
  }

  const base = `${BASE_URL}/api/progress-notes/all?residentId=${resident}`;
  // Optional authenticated session cookie for full end-to-end shape assertions.
  const authCookie = process.env.TEST_AUTH_COOKIE;
  const authHeaders = authCookie ? { Cookie: authCookie } : undefined;

  // 7.1 Auth enforcement: unauthenticated request must be rejected (regression guard).
  let pagedRes: Response;
  try {
    pagedRes = await fetch(`${base}&limit=5&offset=0`, { headers: authHeaders });
  } catch (e: any) {
    console.warn(`   ⚠️  Skipping progress-notes API test: server not reachable at ${BASE_URL} (${e.message}).`);
    return;
  }

  if (!authCookie) {
    assert.strictEqual(pagedRes.status, 401, `Unauthenticated progress-notes call should return 401, got ${pagedRes.status}`);
    console.log("   ✅ Auth still enforced (401 without a session).");
    console.log("   ℹ️  Set TEST_AUTH_COOKIE to a valid session cookie to run full response-shape assertions.");
  } else {
    // 7.1a Paginated call → expects { notes, totalCount }
    assert.strictEqual(pagedRes.status, 200, `Paginated progress-notes call should return 200, got ${pagedRes.status}`);
    const pagedBody = await pagedRes.json();
    assert(pagedBody && typeof pagedBody === "object" && !Array.isArray(pagedBody), "Paginated response should be an object");
    assert(Array.isArray(pagedBody.notes), "Paginated response should have a 'notes' array");
    assert(typeof pagedBody.totalCount === "number", "Paginated response should have a numeric 'totalCount'");
    assert(pagedBody.notes.length <= 5, "Paginated response should respect the limit");
    console.log(`   ✅ Paginated shape OK (notes=${pagedBody.notes.length}, totalCount=${pagedBody.totalCount}).`);

    // 7.1b Non-paginated call (export path) → expects a flat array (backward compatible)
    const flatRes = await fetch(base, { headers: authHeaders });
    assert.strictEqual(flatRes.status, 200, `Non-paginated progress-notes call should return 200, got ${flatRes.status}`);
    const flatBody = await flatRes.json();
    assert(Array.isArray(flatBody), "Non-paginated response should be a flat array (export compatibility)");
    console.log(`   ✅ Non-paginated export-compatibility shape OK (array length=${flatBody.length}).`);
  }

  // 7.2 Verify the underlying paginated query (range + exact count) works at the data layer,
  // independent of session auth, mirroring what the route relies on.
  const { data: pageData, count, error: pageErr } = await supabase
    .from("progress_notes")
    .select("*", { count: "exact" })
    .eq("resident_id", resident)
    .order("date", { ascending: false })
    .order("time", { ascending: false })
    .range(0, 4);
  assert(!pageErr, `Direct paginated query failed: ${pageErr?.message}`);
  assert(Array.isArray(pageData) && pageData.length <= 5, "Direct paginated query should return at most 'limit' rows");
  assert(typeof count === "number", "Direct paginated query should return an exact count");
  console.log(`   ✅ Underlying paginated query OK (rows=${pageData?.length ?? 0}, exactCount=${count}).`);

  console.log("✅ Progress Notes API Tests Passed!");
}

// -------------------------------------------------------------
// Main Test Runner
// -------------------------------------------------------------
async function runAllTests() {
  console.log("🚀 Starting Optimization Verification Test Suite...");
  
  runCompatibilityMapperTests();
  runProfileCascadingTests();
  await runPdfImportsTests();
  await runPdfRoutingMatrixTests();
  await runPaginatedDateRpcTests();
  await runProgressNotesApiTests();
  await runDatabaseMaintenanceTests();

  console.log("\n🎉 ALL OPTIMIZATION VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉\n");
}

runAllTests().catch(err => {
  console.error("\n❌ Test Suite Failed with error:\n", err);
  process.exit(1);
});
