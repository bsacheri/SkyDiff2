import { test, expect } from "@playwright/test";

test("SkyDiff2 loads core PWA shell", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");

  await expect(page).toHaveTitle("SkyDiff2");
  await expect(page.getByRole("heading", { name: "SkyDiff2" })).toBeVisible();
  await expect(page.locator("#provider-toggles")).toBeVisible();
  await expect(page.locator("#combined-chart")).toBeVisible();
  await expect(page.locator("#version-label")).not.toBeEmpty();
  expect(pageErrors).toEqual([]);
});
