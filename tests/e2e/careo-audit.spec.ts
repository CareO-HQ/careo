import { expect, test } from "@playwright/test";
import { login, world } from "./helpers";
import { db, expectToast, pickOption, waitForRows } from "./resident-helpers";

/**
 * CareO Audit -> Governance: create a template, add a question, answer it (autosaved),
 * resume the same audit after leaving, and complete it.
 */

test.use({ timezoneId: "Europe/London" });

interface CompletionRow {
  id: string;
  status: string;
  organization_id: string;
  items: { itemId: string; itemName: string; status: string; notes: string | null }[] | null;
}

test("manager creates, answers, resumes and completes a governance audit", async ({ page }) => {
  const w = world();
  const name = `Complaints governance ${Date.now()}`;
  const question = "Are all complaints logged within 48 hours?";
  await login(page, "A1.manager");
  await page.goto("/dashboard/careo-audit?tab=governance");
  await page.getByRole("button", { name: "New Audit" }).click();
  const dialog = page.getByRole("dialog", { name: "Create New Audit" });
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await pickOption(page, dialog.getByRole("combobox"), "Quarterly");
  await dialog.getByRole("button", { name: "Create Audit" }).click();
  await expectToast(page, "Governance audit created successfully!");
  await page.waitForURL(/careo-audit\/governance\/[0-9a-f-]{36}/);

  const [template] = await waitForRows<{ id: string; organization_id: string; frequency: string }>(() =>
    db().from("audit_governance_templates").select("*").eq("name", name)
  );
  expect(template).toMatchObject({ organization_id: w.homes.A1.orgId, frequency: "quarterly" });
  // Opening the template starts a draft response.
  const [draft] = await waitForRows<CompletionRow>(() =>
    db().from("audit_governance_completions").select("*").eq("template_id", template.id)
  );

  await page.getByRole("button", { name: /Add Question|Add Item/ }).click();
  const add = page.getByRole("dialog", { name: "Add New Question" });
  await add.getByPlaceholder("e.g., Are all complaints properly documented?").fill(question);
  await add.getByRole("button", { name: "Add Question" }).click();
  await expectToast(page, "Question added");

  const row = page.getByRole("row").filter({ hasText: question });
  await pickOption(page, row.getByRole("combobox"), "Non-Compliant");
  await row.getByPlaceholder("Add note...").fill("Two complaints logged late in March.");
  await expect
    .poll(async () => {
      const { data } = await db().from("audit_governance_completions").select("items").eq("id", draft.id).single();
      return (data?.items as CompletionRow["items"])?.find((i) => i.itemName === question)?.notes ?? null;
    }, { timeout: 15_000 })
    .toBe("Two complaints logged late in March.");

  // Leaving and reopening the template resumes the same response with the answer.
  await page.goto("/dashboard/careo-audit?tab=governance");
  await page.goto(`/dashboard/careo-audit/governance/${template.id}`);
  await expect(page.getByRole("row").filter({ hasText: question }).getByPlaceholder("Add note...")).toHaveValue(
    "Two complaints logged late in March."
  );
  const { data: responses } = await db().from("audit_governance_completions").select("id").eq("template_id", template.id);
  expect(responses).toHaveLength(1);

  await page.getByRole("button", { name: "Complete Audit" }).click();
  await expectToast(page, "Audit completed!");
  await expect
    .poll(async () => (await db().from("audit_governance_completions").select("status").eq("id", draft.id).single()).data?.status)
    .toBe("completed");
});

test("care assistant cannot open CareO Audit", async ({ page }) => {
  await login(page, "A1.care_assistant");
  await page.goto("/dashboard/careo-audit");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "New Audit" })).toHaveCount(0);
});
