// Generates docs/roles-and-permissions.pdf: what each CareO role can access and do.
// Usage (from this folder): node render.mjs ../roles-and-permissions.pdf
// Facts come from lib/permissions.ts, lib/route-guards.ts, middleware.ts, app/(dashboard)/layout.tsx,
// components/navigation/AppSidebar.tsx and the Supabase RLS policies (checked 5 October 2026).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("C:/SlashLLM/careo/package.json");
const { chromium } = require("@playwright/test");
const here = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const out = process.argv[2] ?? path.join(here, "..", "roles-and-permissions.pdf");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const code = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

// Column order used by every matrix.
const COLS = [
  ["O", "Owner"],
  ["M", "Manager"],
  ["N", "Nurse"],
  ["CA", "Care assistant"],
  ["AN", "Agency nurse"],
  ["ACA", "Agency care asst."],
  ["RQ", "RQIA"],
  ["MDT", "MDT"],
  ["K", "Kitchen"],
];
const STAFF6 = "O M N CA AN ACA";
const NURSING = "O M N AN";

/** Cell markers: Y = allowed, U = only by typing the URL (not in the menu), V = view only, P = partial (see note), "" = no. */
function matrix(rows, { noteCol = true } = {}) {
  const head = `<tr><th class="feat">Feature</th>${COLS.map(([k, n]) => `<th class="r" title="${n}">${k}</th>`).join("")}${noteCol ? "<th>Notes</th>" : ""}</tr>`;
  const body = rows
    .map((r) => {
      if (r.group) return `<tr class="group"><td colspan="${COLS.length + 2}">${esc(r.group)}</td></tr>`;
      const marks = parse(r.who);
      const cells = COLS.map(([k]) => {
        const m = marks[k];
        if (!m) return `<td class="r no">–</td>`;
        return `<td class="r ${m}">${{ Y: "✓", U: "URL", V: "view", P: "part" }[m]}</td>`;
      }).join("");
      return `<tr><td class="feat">${code(r.f)}</td>${cells}${noteCol ? `<td class="note">${code(r.note ?? "")}</td>` : ""}</tr>`;
    })
    .join("");
  return `<table class="mx"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
/** "O M N:U RQ:V" -> { O: "Y", M: "Y", N: "U", RQ: "V" } */
function parse(who) {
  const out = {};
  for (const tok of who.split(/\s+/).filter(Boolean)) {
    const [k, m = "Y"] = tok.split(":");
    out[k] = m;
  }
  return out;
}
const list = (items) => `<ul>${items.map((i) => `<li>${code(i)}</li>`).join("")}</ul>`;

// ---------------------------------------------------------------- data

const roles = [
  ["Owner", "`owner`", "Organisation owner", "Every care home in the organisation (can switch care home)", "Platform admin", "Home dashboard"],
  ["Manager", "`manager`", "Care home manager", "One care home (all units in it)", "Owner", "Home dashboard"],
  ["Nurse", "`nurse`", "Registered nurse", "One care home; lists default to their unit", "Manager", "Home dashboard"],
  ["Care assistant", "`care_assistant`", "Care / support worker", "One care home; lists default to their unit", "Manager", "Home dashboard"],
  ["Agency nurse", "`agency_nurse`", "Agency nurse on shift", "The care home that took them on", "Agency onboarding (link code / request)", "Home dashboard"],
  ["Agency care assistant", "`agency_care_assistant`", "Agency carer on shift", "The care home that took them on", "Agency onboarding (link code / request)", "Home dashboard"],
  ["RQIA inspector", "`rqia`", "External regulator (read-only)", "One care home, during an inspection session", "Manager", "RQIA session form, then RQIA Portal"],
  ["MDT visitor", "`mdt`", "External professional (GP, physio, SALT…)", "One resident per visit session", "Manager", "MDT session form, then that resident's MDT notes"],
  ["Kitchen staff", "`kitchen_staff`", "Chef / kitchen team", "One care home, diet data only", "Manager", "Kitchen Portal"],
  ["Platform admin", "`saas_admin`", "CareO staff", "All organisations", "Another platform admin", "Platform Admin (/admin)"],
];

const navRows = [
  { group: "Main sidebar (care staff)" },
  { f: "Home dashboard", who: STAFF6 },
  { f: "Residents list", who: STAFF6, note: "Owner: all homes; others: own home." },
  { f: "Add Resident button", who: "O M N" },
  { f: "Staff", who: "O M N", note: "Nurse sees only the External section (RQIA/MDT accounts)." },
  { f: "Agency", who: "O M N" },
  { f: "Staff Rota", who: "O M N CA", note: "Management tabs: owner, manager, approved nurse only." },
  { f: "Handover", who: STAFF6 },
  { f: "Appointment", who: "O M N AN" },
  { f: "Incidents", who: "O M N AN" },
  { f: "Action Plans", who: STAFF6 },
  { f: "Notification", who: STAFF6 },
  { f: "Wounds", who: "O M N AN" },
  { f: "Medications (overview)", who: "O M N AN" },
  { f: "Quick Info: weight / bowel / fluid checks", who: STAFF6 },
  { f: "Audits: Care File Audit, Manager Audit", who: "O M", note: "Route guard: owner, manager." },
  { f: "CareO Audit (no menu link)", who: "O:U M:U N:U", note: "Opens by URL or from audit pages." },
  { f: "Help and Support", who: STAFF6 },
  { group: "Dedicated portals" },
  { f: "RQIA Portal (residents, forms, incidents, wounds, weight, care, care plans, medication, audits)", who: "RQ" },
  { f: "MDT visit: one resident's Multidisciplinary Notes", who: "MDT" },
  { f: "Kitchen Portal: diet information, kitchen action plans, diet bell", who: "K" },
  { group: "Settings (/settings)" },
  { f: "Profile, Security (own account)", who: STAFF6, note: "RQIA, MDT and kitchen staff are sent back to their portal." },
  { f: "Members list", who: STAFF6, note: "Invite / remove: owner, manager." },
  { f: "Care home, Organisation pages", who: `${STAFF6}`, note: "Edit buttons work for the owner only (UI)." },
];

const residentRows = [
  { group: "Resident profile sections (view)" },
  { f: "Overview", who: STAFF6, note: "Edit: owner, manager, nurse (agency nurse sees edit but the save is refused, see Gaps)." },
  { f: "Care File (assessments, care plans, risk assessments)", who: `${NURSING} CA:V ACA:V`, note: "Same roles fill in the forms. Care assistants can browse folders read-only (no card on the profile; reached from Overview tasks)." },
  { f: "Medication", who: NURSING },
  { f: "Topical Medication (creams)", who: `${NURSING} CA ACA`, note: "The profile shows this card to care assistants." },
  { f: "Food & Fluid", who: STAFF6, note: "Diet / menu changes: owner, manager, nurse, agency nurse." },
  { f: "Daily Care", who: STAFF6, note: "Quick care notes: owner, manager, nurse, agency nurse." },
  { f: "Continence", who: STAFF6 },
  { f: "Lifestyle & Social", who: STAFF6 },
  { f: "Progress Notes", who: NURSING },
  { f: "Documents", who: NURSING },
  { f: "Checks (night checks etc.)", who: `${STAFF6} RQ:V`, note: "Add / delete night checks: owner, manager, nurse, agency nurse." },
  { f: "Appointments", who: NURSING },
  { f: "Incidents & Falls", who: `${NURSING} RQ:V` },
  { f: "Health & Monitoring (vitals, weight)", who: NURSING },
  { f: "Weight monitoring", who: `${NURSING} CA ACA`, note: "Care assistants reach it from Quick Info > Weight Check." },
  { f: "Clinical, Wounds", who: `${NURSING} RQ:V` },
  { f: "Hospital Transfer (passport, transfer log)", who: NURSING },
  { f: "Multidisciplinary Notes", who: `${NURSING} MDT:P`, note: "MDT: only the resident chosen for the visit." },
];

const actionRows = [
  { group: "Residents" },
  { f: "Create a resident", who: "O M N" },
  { f: "Edit / delete a resident", who: "O M N", note: "Enforced in the database." },
  { f: "Switch care home", who: "O", note: "Everyone else is fixed to their care home." },
  { f: "Switch unit (team) inside own care home", who: `${STAFF6}` },
  { group: "Medication" },
  { f: "Add a medication", who: NURSING, note: "Needs a 'Checked by' colleague: any organisation account except yourself (owner included)." },
  { f: "Prepare / administer / record outcome (round, PRN, topical, eMAR)", who: NURSING },
  { f: "Be chosen as a witness", who: "M N CA AN ACA RQ:P MDT:P K:P", note: "List = every account in the organisation except you and the owner, so RQIA, MDT, kitchen and other care homes' staff also appear (see Gaps)." },
  { f: "Complete a medication round", who: NURSING },
  { group: "Care records" },
  { f: "Log food & fluid, daily care, continence, activities", who: STAFF6 },
  { f: "Write progress notes", who: NURSING, note: "Always saved under your own name." },
  { f: "Record vitals and weight", who: NURSING },
  { f: "Create wounds, incidents, hospital passports, appointments", who: NURSING },
  { f: "Write MDT notes", who: `${NURSING} MDT:P`, note: "MDT: their session's resident only." },
  { f: "Upload resident documents", who: NURSING },
  { group: "Handover and action plans" },
  { f: "Write handover notes, Save Handover", who: STAFF6 },
  { f: "Create a care home action plan", who: STAFF6, note: "Assignee must be in the same care home; never the owner." },
  { f: "Update an action plan's status", who: `${STAFF6} K:P`, note: "Assignee or creator; managers see all in their home, owner all in the organisation. Kitchen: kitchen plans." },
  { f: "Create and complete CareO / Manager audits", who: "O M N:P", note: "Manager Audit: owner, manager. CareO Audit: owner, manager, nurse." },
  { group: "Staff and workforce" },
  { f: "Invite staff", who: "O M", note: "Owner → manager. Manager → nurse, care assistant, MDT, RQIA, kitchen staff." },
  { f: "Remove a member", who: "O M", note: "Only lower-ranked members; not yourself; never the owner." },
  { f: "Change a member's role", who: "O M", note: "Only to a role below your own." },
  { f: "Open a staff profile / trainings", who: "O M" },
  { f: "Add staff training records", who: "O M", note: "Staff can read their own records." },
  { f: "Set contracted hours, approve 'manager approved nurse'", who: "O M" },
  { f: "Turn RQIA / MDT logins on or off", who: "O M N" },
  { f: "Build / publish rotas, shift templates, staffing rules, leave", who: "O M N:P", note: "Nurse only when approved by a manager, for their own unit." },
  { f: "Request leave, request / answer shift swaps", who: "O M N CA" },
  { f: "Generate agency link code, approve agency requests", who: "O M N" },
  { group: "Organisation settings" },
  { f: "Rename care home", who: "O M:P", note: "UI: owner only. Database also lets managers (open item D13)." },
  { f: "Edit organisation details", who: "O M:P", note: "UI: owner only. Database also lets managers." },
  { f: "Create / edit units (teams)", who: "O M" },
  { f: "Create / edit labels", who: STAFF6, note: "No UI restriction." },
];

const perRole = [
  {
    name: "Owner (`owner`)",
    can: [
      "Everything a manager can do, in every care home of the organisation (switch care home from the sidebar).",
      "Invite managers; remove managers and lower roles.",
      "Edit organisation and care home details (Settings).",
      "See all action plans in the organisation; open Manager Audit and Care File Audit.",
      "Manage rotas for any unit in the organisation.",
    ],
    cannot: [
      "Be chosen as a medication witness or assigned a care home action plan.",
      "Be removed or demoted by anyone in the organisation.",
    ],
  },
  {
    name: "Manager (`manager`)",
    can: [
      "Full clinical access to every resident in their care home (all sections, all actions in the matrices).",
      "Create / edit residents; manage units (teams).",
      "Invite nurses, care assistants, MDT, RQIA and kitchen staff; remove lower-ranked members; change their roles.",
      "Staff page: contracted hours, approve nurses for rota management, turn RQIA/MDT logins on/off, staff profiles and training records.",
      "Rota Builder, Shift Templates, Staffing Requirements, Leave Management, Audit Trail.",
      "Manager Audit, Care File Audit, CareO Audit; all action plans of the care home.",
      "Agency page: link code, agency requests.",
    ],
    cannot: [
      "See or change another care home's data (even in the same organisation).",
      "Invite or promote anyone to manager or owner; remove the owner.",
      "Edit organisation / care home settings in the UI (database allows it, see Gaps).",
    ],
  },
  {
    name: "Nurse (`nurse`)",
    can: [
      "All resident sections; create and edit residents.",
      "Medication: add (with a second checker), prepare, administer, witness for others, complete rounds.",
      "Care file forms, progress notes, vitals, wounds, incidents, hospital passports, appointments, documents, MDT notes.",
      "Handover, action plans, Quick Info checks.",
      "Staff page (External section only): turn RQIA/MDT logins on/off.",
      "Agency page; Rota (view own shifts, leave, swaps). Manage the rota of their unit if a manager approved them.",
      "CareO Audit by URL.",
    ],
    cannot: [
      "Invite or remove members; see permanent staff on the Staff page; open staff profiles / trainings.",
      "Open Manager Audit or Care File Audit.",
      "Switch care home; witness their own medication dose.",
    ],
  },
  {
    name: "Care assistant (`care_assistant`)",
    can: [
      "View residents of their care home: Overview, Food & Fluid, Daily Care, Continence, Lifestyle & Social, Checks, Topical Medication, Weight monitoring; browse Care File folders read-only.",
      "Log food & fluid, daily care, continence, activities.",
      "Handover notes, action plans (create / update own), notifications, Quick Info checks.",
      "Rota: view own shifts, request leave and swaps.",
      "Be chosen as a medication witness.",
    ],
    cannot: [
      "Open Medication, Care File, Progress Notes, Documents, Appointments, Incidents, Health & Monitoring, Clinical, Wounds, Hospital Transfer or MDT notes in the resident profile.",
      "Create or edit residents.",
      "Open Staff, Audits, staff profiles; invite or remove anyone.",
      "Open Medications, Incidents, Appointment, Agency or Wounds, even by URL (redirected to Home).",
    ],
  },
  {
    name: "Agency nurse (`agency_nurse`)",
    can: [
      "Same resident and clinical access as a nurse (all sections, medication, incidents, care file…).",
      "Handover, Appointment, Incidents, Action Plans, Notification, Wounds, Medications, Quick Info.",
    ],
    cannot: [
      "Create or edit residents (UI shows edit on Overview, but the save is refused).",
      "Staff, Agency, Rota, Audits, Add Resident (redirected to Home, even by URL).",
      "Invite, remove or manage anyone.",
    ],
  },
  {
    name: "Agency care assistant (`agency_care_assistant`)",
    can: [
      "Same as a care assistant: daily care, food & fluid, continence, activities, handover, action plans, Quick Info.",
    ],
    cannot: ["Everything a care assistant cannot do, plus the Rota (not in their menu)."],
  },
  {
    name: "RQIA inspector (`rqia`)",
    can: [
      "Start an inspection session (inspector name) and use the RQIA Portal for their care home.",
      "Read residents, forms, incidents and falls, wounds, weight, care records, care plans, medication and audits; download stored files.",
      "Open resident pages under `/dashboard/residents/…`.",
    ],
    cannot: [
      "Create or change any record (database: read-only; only their own login log is written).",
      "Open any other dashboard page or /settings (redirected to the RQIA Portal).",
      "Use the app at all once a manager or nurse turns their login off.",
    ],
  },
  {
    name: "MDT visitor (`mdt`)",
    can: [
      "Start a visit session for one resident and write that resident's Multidisciplinary Notes (care team, attached files).",
      "Change resident by starting a new session.",
    ],
    cannot: [
      "Open any other page or /settings (redirected to the chosen resident's MDT notes).",
      "Change any record except MDT notes, the MDT care team, and their files / folders.",
      "Use the app once their login is turned off.",
    ],
  },
  {
    name: "Kitchen staff (`kitchen_staff`)",
    can: [
      "Kitchen Portal: resident diet information, diet-change bell (mark read), kitchen action plans (create, update status).",
    ],
    cannot: [
      "Open any other `/dashboard` page or `/settings` (blocked on the server, including via Back).",
      "Read clinical records (medication, notes, DNACPR, incidents…), enforced in the database.",
    ],
  },
  {
    name: "Platform admin (`saas_admin`)",
    can: [
      "Platform Admin: owners (create, list), care homes per organisation, agencies, other platform admins, analytics.",
      "Invite owners and managers; bypasses organisation and care home scoping in the database.",
    ],
    cannot: ["Use the care-home dashboard (redirected to /admin). Route guards that list `admin` do not match `saas_admin`."],
  },
];

const dbRules = [
  "**Care home scope.** Every data table is limited to the user's active care home; owners reach every home in their organisation; platform admins reach everything.",
  "**Care staff** (owner, manager, nurse, care assistant, agency nurse, agency care assistant) may write care records in their home. The database does **not** separate nurses from care assistants: that split is only in the UI.",
  "**RQIA** read everything in their care home and write nothing (except their own login log). **MDT** read in their care home and write only MDT notes, the MDT care team, files and folders. Both lose all access when their login is turned off.",
  "**Kitchen staff** read and write only diet data, menus, food & fluid logs, notifications and audit action plans. Clinical tables are hidden.",
  "**Residents:** create / edit / delete by owner, manager, nurse. Everyone in scope can read.",
  "**Users:** nobody can change their own role, organisation, care home, approved-nurse flag or workforce fields. Owners / managers can change other staff only to a role below their own and cannot move them to another organisation.",
  "**Rota:** managed by owner (organisation), manager (care home), approved nurse (own unit). Everyone else sees rotas of their unit and their own shifts.",
  "**Invitations:** owner → manager, nurse, care assistant, MDT, RQIA, kitchen; manager → nurse, care assistant, MDT, RQIA, kitchen (own care home); platform admin → owner, manager.",
  "**Staff training records:** read by the staff member and by owners / managers of their care home; written by owners / managers only.",
];

const gaps = [
  "**Agency nurse resident edit:** the Overview shows edit controls (`canEditOverview`), but the database refuses the update (0 rows, no error shown).",
  "**UI vs database:** managers can rename the care home, edit the organisation and create care homes in the database although the UI is owner-only (D13). Labels and teams have no UI restriction; teams are refused by the database for non-managers.",
  "**RQIA / MDT session lock is browser-side** (session cookie in the dashboard layout): the server guard limits them to their sections, but which resident an MDT visitor may open is only checked in the browser. The database still limits them to read-only / MDT-only.",
  "**Invite UI is narrower than the database:** the owner's invite dialog offers only `manager`; the database would also accept nurse, care assistant, MDT, RQIA and kitchen.",
  "**Medication witness and 'Checked by' lists** are built from every account whose active organisation matches: they include RQIA, MDT and kitchen accounts and staff of other care homes in the organisation. Only you (both lists) and the owner (witness list) are excluded.",
];

const testAccounts = [
  "Run any Playwright spec (e.g. `npx playwright test tests/e2e/journeys.spec.ts`) to create fixture organisations A and B, care homes A1, A2, B1 and one user per role in A1 (owner, manager, nurse, care_assistant, agency_nurse, mdt, rqia, kitchen_staff), plus A2 nurse/manager and B1 owner/nurse/mdt/rqia.",
  "Emails are in `tests/e2e/.auth/world.json`; password for all: `Test-Password-123!`.",
  "RQIA and MDT accounts must complete their session form (inspector name / resident) before any other page opens.",
  "Role checks with automated coverage: `tests/e2e/journeys.spec.ts` (navigation), `tests/e2e/page-sweep.spec.ts` (every page per role), `tests/db/role-scope.test.ts`, `tests/db/tenant-isolation.test.ts`, `tests/db/privilege-escalation.test.ts`.",
];

// ---------------------------------------------------------------- html

const bold = (s) => code(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
const legend = `<p class="legend"><span class="r Y">✓</span> allowed &nbsp; <span class="r U">URL</span> not in the menu, but the page opens by URL &nbsp; <span class="r V">view</span> read only &nbsp; <span class="r P">part</span> partly (see note) &nbsp; <span class="r no">–</span> no access</p>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><title>CareO – roles and permissions</title>
<style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  :root { --ink:#1b2430; --muted:#5d6b7a; --line:#dfe4ea; --accent:#0f6e6e; --bg:#f6f8fa; }
  * { box-sizing: border-box; }
  body { font: 9.6pt/1.42 "Segoe UI", Arial, sans-serif; color: var(--ink); margin: 0; }
  h1 { font-size: 21pt; margin: 0 0 4px; color: var(--accent); }
  h2 { font-size: 13.5pt; margin: 20px 0 6px; color: var(--accent); border-bottom: 2px solid var(--accent); padding-bottom: 3px; page-break-after: avoid; }
  h3 { font-size: 10.5pt; margin: 0 0 4px; }
  p { margin: 4px 0 8px; }
  code { font-family: Consolas, monospace; font-size: 8.4pt; background: var(--bg); padding: 0 3px; border-radius: 3px; }
  .cover { border-left: 6px solid var(--accent); padding: 4px 0 4px 14px; margin-bottom: 12px; }
  .meta { color: var(--muted); }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 8.6pt; }
  th, td { border-bottom: 1px solid var(--line); padding: 3px 5px; text-align: left; vertical-align: top; }
  th { background: var(--bg); font-weight: 600; }
  tr { page-break-inside: avoid; }
  tr.group td { background: #e9f3f3; font-weight: 600; color: var(--accent); }
  .mx td.feat { width: 34%; } .mx td.note { color: var(--muted); font-size: 8pt; }
  .r { text-align: center; width: 34px; white-space: nowrap; font-weight: 700; }
  td.Y, span.Y { color: #1f7a3a; } td.U, span.U { color: #b4540a; font-size: 7.4pt; } td.V, span.V { color: #2457a6; font-size: 7.4pt; }
  td.P, span.P { color: #8a6d00; font-size: 7.4pt; } td.no, span.no { color: #c3cbd4; font-weight: 400; }
  .legend { font-size: 8.4pt; color: var(--muted); }
  .legend span { display: inline-block; width: auto; padding: 0 2px; }
  .role { border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; margin: 8px 0; page-break-inside: avoid; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .cols h4 { margin: 0 0 2px; font-size: 8.8pt; } .can h4 { color: #1f7a3a; } .cannot h4 { color: #a4262c; }
  ul { margin: 2px 0 6px; padding-left: 16px; } li { margin: 1px 0; }
  .box { background: var(--bg); border-radius: 6px; padding: 8px 12px; margin: 8px 0; }
  .break { page-break-before: always; }
</style></head><body>
<div class="cover">
  <h1>Roles and permissions</h1>
  <div class="meta">CareO care home management · checked against the code on 5 October 2026 (branch <code>tests</code>)</div>
</div>

<div class="box">
<b>How access is enforced (three layers)</b>
<ol>
  <li><b>Server route guard</b> (<code>middleware.ts</code> + <code>lib/route-access.ts</code>): signed-out users go to /login. Every menu page and resident section is checked against the role before it renders; a page the role may not open redirects to its home (resident sections: back to the resident). Kitchen, RQIA and MDT cannot open /settings.</li>
  <li><b>Browser checks</b>: menu items (<code>lib/permissions.ts</code>), page guards (<code>lib/route-guards.ts</code>), the RQIA / MDT session lock (<code>app/(dashboard)/layout.tsx</code>) and buttons hidden per role. "URL" in the tables marks a page that is allowed but has no menu link.</li>
  <li><b>Database rules</b> (Supabase RLS): the final word on what each role can read and change. A blocked write usually fails silently (0 rows), so test by checking the saved data.</li>
</ol>
Where the layers disagree, the database wins for data; the gaps are listed at the end.
</div>

<h2>1. Roles at a glance</h2>
<table><thead><tr><th>Role</th><th>Key</th><th>Who</th><th>Scope</th><th>Created by</th><th>Lands on</th></tr></thead>
<tbody>${roles.map((r) => `<tr>${r.map((c, i) => `<td>${i === 0 ? `<b>${esc(c)}</b>` : code(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
<p class="legend">Rank used for role changes and removals: platform admin 4 · owner 3 · manager 2 · every other role 1. You can only act on members ranked below you.</p>

<h2>2. Navigation and pages</h2>
${legend}
${matrix(navRows)}

<h2 class="break">3. Resident profile sections</h2>
<p>Which resident sections each role sees in the resident menu. RQIA open them from the RQIA Portal; MDT only for the visit's resident.</p>
${legend}
${matrix(residentRows)}

<h2>4. Actions</h2>
${legend}
${matrix(actionRows)}

<h2 class="break">5. Each role: can / cannot</h2>
${perRole
  .map(
    (r) => `<div class="role"><h3>${code(r.name)}</h3><div class="cols">
  <div class="can"><h4>Can</h4>${list(r.can)}</div>
  <div class="cannot"><h4>Cannot</h4>${list(r.cannot)}</div></div></div>`
  )
  .join("")}

<h2 class="break">6. Database rules (apply whatever the UI shows)</h2>
<ul>${dbRules.map((d) => `<li>${bold(d)}</li>`).join("")}</ul>

<h2>7. Known gaps and inconsistencies (to test or fix)</h2>
<ul>${gaps.map((d) => `<li>${bold(d)}</li>`).join("")}</ul>

<h2>8. Testing the roles</h2>
<ul>${testAccounts.map((d) => `<li>${bold(d)}</li>`).join("")}</ul>
<p class="legend">Source files: <code>lib/permissions.ts</code>, <code>lib/route-guards.ts</code>, <code>middleware.ts</code>, <code>app/(dashboard)/layout.tsx</code>, <code>components/navigation/AppSidebar.tsx</code>, <code>supabase/migrations/20261005120000_security_hardening.sql</code> and later migrations. Regenerate with <code>node docs/roles/render.mjs</code> after permission changes.</p>
</body></html>`;

fs.writeFileSync(path.join(here, "roles.html"), html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="font-size:7pt;color:#8a96a3;width:100%;text-align:center;">CareO · roles and permissions · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
});
await browser.close();
console.log("wrote", out);
