import { test, expect } from "@playwright/test";

/**
 * Minimal auth smoke: ensure the storage state generated in global-setup keeps us on '/'
 * instead of redirecting to '/login'.
 */
test("authenticated storage state allows direct access to kudos board", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveURL(/\/?$/);
  await expect(page.getByRole("heading", { name: "KudoSpace" })).toBeVisible();
  await expect(page.getByTestId("kudos-feed")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
});
