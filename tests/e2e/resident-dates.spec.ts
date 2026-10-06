import { expect, test } from "@playwright/test";
import { format } from "date-fns";
import { login } from "./helpers";

/**
 * Add Resident: the date of birth and admission date pickers must keep the calendar day
 * that was picked. A device ahead of UTC (or the UK during BST) used to store the day before.
 */

test.use({ timezoneId: "Asia/Kolkata", locale: "en-GB" });

test("BUG: picked date of birth and admission date are kept, not shifted a day early", async ({ page }) => {
  await login(page, "A1.manager");
  await page.goto("/dashboard/residents");
  await page.getByRole("button", { name: "Add Resident" }).first().click();
  const dialog = page.getByRole("dialog");

  const first = new Date();
  first.setDate(1);
  const dayButton = () => page.getByRole("button", { name: new RegExp(format(first, "MMMM do, yyyy")) });
  const shown = format(first, "dd/MM/yyyy");

  const dob = dialog.getByRole("button", { name: "Select date" }).first();
  await dob.click();
  await dayButton().click();
  await expect(dialog.getByRole("button", { name: shown })).toHaveCount(1);

  await dialog.getByRole("button", { name: "Select date" }).first().click();
  await dayButton().click();
  await expect(dialog.getByRole("button", { name: shown })).toHaveCount(2);
});
