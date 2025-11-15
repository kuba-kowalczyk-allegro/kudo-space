import { test, expect } from "@playwright/test";
import { requireEnv } from "./utils/env";

const recipientDisplayName = requireEnv("SUPABASE_E2E_RECIPIENT_DISPLAY_NAME");

test("authenticated user can create and delete kudos", async ({ page }) => {
  const message = `Playwright kudos ${Date.now()}`;

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "KudoSpace" })).toBeVisible();
  await expect(page.getByTestId("kudos-feed")).toBeVisible();

  await page.getByRole("button", { name: "Give Kudos" }).click();

  const createDialog = page.getByRole("dialog", { name: "Give Kudos" });
  await expect(createDialog).toBeVisible();

  const recipientCombobox = createDialog.getByRole("combobox", { name: "Select recipient" });
  await recipientCombobox.waitFor();
  await recipientCombobox.click();

  await page.getByRole("option", { name: new RegExp(recipientDisplayName, "i") }).click();

  await createDialog.getByLabel("Message *").fill(message);
  await createDialog.getByRole("button", { name: "Give Kudos" }).click();

  await expect(createDialog).toBeHidden();

  const createdCard = page.locator("article", { hasText: message });
  await expect(createdCard).toHaveCount(1, { timeout: 15_000 });

  await createdCard.getByRole("button", { name: /Delete kudo/i }).click();

  const deleteDialog = page.getByRole("alertdialog", { name: "Delete Kudo" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete" }).click();

  await expect(deleteDialog).toBeHidden();
  await expect(createdCard).toHaveCount(0, { timeout: 15_000 });
});
