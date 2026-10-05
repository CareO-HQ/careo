import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { bugs, phases } from "./bugs.mjs";

const require = createRequire("C:/SlashLLM/careo/package.json");
const { chromium } = require("@playwright/test");

const here = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const results = JSON.parse(fs.readFileSync(path.join(here, "results.json"), "utf8"));
const out = process.argv[2];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const code = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
const sevOrder = ["Critical", "High", "Medium", "Low"];
const count = (f) => bugs.filter(f).length;

const sevBadge = (s) => `<span class="sev sev-${s.toLowerCase()}">${s}</span>`;

const summaryRows = phases
  .map((p) => {
    const cells = sevOrder.map((s) => `<td class="num">${count((b) => b.phase === p.id && b.sev === s) || "–"}</td>`).join("");
    return `<tr><td><b>${p.id}</b> · ${esc(p.title)}</td>${cells}<td class="num"><b>${count((b) => b.phase === p.id)}</b></td></tr>`;
  })
  .join("");
const totalCells = sevOrder.map((s) => `<td class="num"><b>${count((b) => b.sev === s)}</b></td>`).join("");

const register = phases
  .map(
    (p) => `
  <tr class="group"><td colspan="4">${p.id} · ${esc(p.title)}</td></tr>
  ${bugs
    .filter((b) => b.phase === p.id)
    .map((b) => `<tr><td class="id">${b.id}</td><td>${sevBadge(b.sev)}</td><td>${esc(b.area)}</td><td>${esc(b.title)}${b.status ? ` <i>(${esc(b.status)})</i>` : ""}</td></tr>`)
    .join("")}`
  )
  .join("");

const details = phases
  .map(
    (p) => `
  <section class="phase">
    <h2>${p.id} · ${esc(p.title)}</h2>
    <p class="intro">${esc(p.intro)}</p>
    ${bugs
      .filter((b) => b.phase === p.id)
      .map(
        (b) => `
      <article class="bug">
        <header><span class="id">${b.id}</span>${sevBadge(b.sev)}<span class="area">${esc(b.area)}</span><span class="status${b.status === "Open" ? " open" : b.status ? " nofix" : ""}">${esc(b.status ?? "Fixed")}</span></header>
        <h3>${esc(b.title)}</h3>
        <dl>
          <dt>How it was caught</dt><dd>${esc(b.caught)}</dd>
          <dt>Fix</dt><dd>${esc(b.fix)}</dd>
          <dt>Manual check</dt><dd><ul class="steps">${b.manual.map((m) => m.startsWith("Expected") ? `<li class="exp">${esc(m.replace(/^Expected:\s*/, ""))}</li>` : `<li class="do">${esc(m)}</li>`).join("")}</ul></dd>
        </dl>
      </article>`
      )
      .join("")}
  </section>`
  )
  .join("");

const resultRows = results.suites
  .map((r) => `<tr><td>${esc(r.name)}</td><td><code>${esc(r.command)}</code></td><td class="num">${r.passed}</td><td class="num">${r.failed}</td><td>${esc(r.note ?? "")}</td></tr>`)
  .join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>CareO tests branch – bug report</title>
<style>
  @page { size: A4; margin: 16mm 14mm 18mm; }
  :root { --ink:#1b2430; --muted:#5d6b7a; --line:#dfe4ea; --accent:#0f6e6e; --bg:#f6f8fa; }
  * { box-sizing: border-box; }
  body { font: 10pt/1.45 "Segoe UI", Arial, sans-serif; color: var(--ink); margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 4px; color: var(--accent); }
  h2 { font-size: 14pt; margin: 22px 0 6px; color: var(--accent); border-bottom: 2px solid var(--accent); padding-bottom: 3px; }
  h3 { font-size: 10.5pt; margin: 4px 0 6px; }
  p { margin: 4px 0 8px; }
  code { font-family: Consolas, monospace; font-size: 8.6pt; background: var(--bg); padding: 0 3px; border-radius: 3px; }
  .cover { border-left: 6px solid var(--accent); padding: 4px 0 4px 14px; margin-bottom: 14px; }
  .meta { color: var(--muted); }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 9pt; }
  th, td { border-bottom: 1px solid var(--line); padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: var(--bg); font-weight: 600; }
  td.num, th.num { text-align: center; width: 52px; }
  td.id { font-weight: 700; width: 34px; }
  tr.group td { background: #e9f3f3; font-weight: 600; color: var(--accent); }
  tr { page-break-inside: avoid; }
  .sev { display: inline-block; font-size: 7.6pt; font-weight: 700; padding: 1px 6px; border-radius: 9px; color: #fff; white-space: nowrap; }
  .sev-critical { background: #a4262c; } .sev-high { background: #d9601a; } .sev-medium { background: #b58a00; } .sev-low { background: #607080; }
  .bug { border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; margin: 8px 0; page-break-inside: avoid; }
  .bug header { display: flex; gap: 8px; align-items: center; font-size: 8.6pt; }
  .bug header .id { font-weight: 800; font-size: 10pt; }
  .bug header .area { color: var(--muted); }
  .bug header .status { margin-left: auto; color: #1f7a3a; font-weight: 700; }
  .bug header .status.nofix { color: var(--muted); }
  .bug header .status.open { color: #b4540a; }
  dl { display: grid; grid-template-columns: 112px 1fr; gap: 3px 10px; margin: 0; }
  dt { color: var(--muted); font-weight: 600; }
  dd { margin: 0; }
  ol { margin: 0; padding-left: 16px; }
  ul.steps { list-style: none; padding: 0; margin: 0; }
  ul.steps li { padding-left: 18px; position: relative; }
  ul.steps li.do::before { content: "▸"; position: absolute; left: 2px; color: var(--muted); }
  ul.steps li.exp { color: #1f6a35; }
  ul.steps li.exp::before { content: "✓"; position: absolute; left: 2px; font-weight: 700; }
  .intro { color: var(--muted); }
  .box { background: var(--bg); border-radius: 6px; padding: 8px 12px; margin: 8px 0; }
  .phase { page-break-before: always; }
  ul { margin: 4px 0 8px; padding-left: 18px; }
</style></head><body>
<div class="cover">
  <h1>Bug report – “tests” branch</h1>
  <div class="meta">CareO care home management · ${esc(results.date)} · ${bugs.length} issues found by automated tests · ${bugs.filter((b) => !b.status).length} fixed on this branch · ${bugs.filter((b) => b.status === "Open").length} open</div>
</div>

<h2>Summary</h2>
<p>Testing on this branch ran in four passes: database security tests, application/unit tests, a Playwright suite covering every feature of the resident profile, and a last pass over the remaining features (full medication, incident and hospital passport forms, handover, action plans, CareO audit, staff, settings, and a sweep that opens every main page as each staff role). Each fixed bug has an automated test that failed before the fix and passes now. The tests are kept as regression tests and are still named <code>BUG: …</code> after the defect they guard against. Open items (${bugs.filter((b) => b.status === "Open").map((b) => b.id).join(", ")}) are kept as expected-failure tests.</p>
<table><thead><tr><th>Pass</th>${sevOrder.map((s) => `<th class="num">${s}</th>`).join("")}<th class="num">Total</th></tr></thead>
<tbody>${summaryRows}<tr><td><b>All</b></td>${totalCells}<td class="num"><b>${bugs.length}</b></td></tr></tbody></table>

<h3>Automated test results after the fixes</h3>
<table><thead><tr><th>Suite</th><th>Command</th><th class="num">Passed</th><th class="num">Failed</th><th>Notes</th></tr></thead><tbody>${resultRows}</tbody></table>

<h2>Setting up for manual testing</h2>
<div class="box"><ol>
  <li>Start the local stack: <code>npx supabase start</code>, then apply migrations with <code>npx supabase db reset</code> (or <code>npx supabase migration up</code>). Four migrations are new on this branch: <code>20261005120000_security_hardening.sql</code>, <code>20261005150000_resident_record_integrity.sql</code>, <code>20261005170000_handover_delete_policies.sql</code> and <code>20261005180000_staff_trainings.sql</code>.</li>
  <li>Run the app against local Supabase: <code>npm run dev</code> with the values from <code>.env.test</code> (the Playwright config does this automatically on port 3100).</li>
  <li>Test accounts: running any e2e spec (e.g. <code>npx playwright test tests/e2e/journeys.spec.ts</code>) creates two organisations, three care homes, a resident per home and one user per role. Their emails are written to <code>tests/e2e/.auth/world.json</code>; the password for all of them is <code>Test-Password-123!</code>.</li>
  <li>For the time-zone bugs (C9, C13, C14, D2–D4, D6) change the computer's time zone to one ahead of the UK (e.g. India) before testing, or test between March and October; everything should still show UK time and the dates you picked.</li>
</ol></div>
<h3>Running the automated tests</h3>
<ul>
  <li>Unit: <code>npm run test:unit</code> · Database security: <code>npm run test:db</code> (needs local Supabase)</li>
  <li>End-to-end: <code>npm run test:e2e</code>; only the resident profile: <code>npx playwright test tests/e2e/resident-</code></li>
  <li>HTML report with traces and screenshots of any failure: <code>npx playwright show-report</code></li>
</ul>

<h2>Manual vs automated testing</h2>
<p>The Playwright tests do what a tester does (open pages, click, type, submit) in a real Chrome browser against the real app and local database. They also check the saved data directly in the database, which a manual tester can't easily see. They don't replace a person, because they only check what someone wrote them to check.</p>
<table><thead><tr><th style="width:50%">Playwright covers well</th><th>Still needs a person</th></tr></thead><tbody>
<tr><td>Same steps every time, ${results.e2eSummary}</td><td>Does the page look right and make sense to care staff?</td></tr>
<tr><td>Checks what was saved in the database, not only what is shown</td><td>Real devices: tablets and phones, touch, slow Wi-Fi</td></tr>
<tr><td>Role and organisation boundaries (8 roles, 2 organisations)</td><td>PDF/print output, real emails arriving, real NHS data</td></tr>
<tr><td>Time-zone and edge cases that are hard to set up by hand</td><td>Things nobody thought to test: exploratory use</td></tr>
<tr><td>Catches regressions on every change</td><td>Final acceptance before release</td></tr>
</tbody></table>
<p>Suggested use: run the automated suites on every change, and use the manual checks in this report for release sign-off and anything visual.</p>

<h2>Bug register</h2>
<table><thead><tr><th>ID</th><th>Severity</th><th>Area</th><th>Bug</th></tr></thead><tbody>${register}</tbody></table>

<h2>Follow-ups and decisions for the team</h2>
<ul>
  ${results.followUps.map((f) => `<li>${code(f)}</li>`).join("")}
</ul>

${details}
</body></html>`;

fs.writeFileSync(path.join(here, "report.html"), html);
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
    '<div style="font-size:7pt;color:#8a96a3;width:100%;text-align:center;">CareO · tests branch bug report · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
});
await browser.close();
console.log("wrote", out);
