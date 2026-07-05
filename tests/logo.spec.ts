/**
 * Visual regression + accessibility guards for the Logo across pages.
 *
 * Runs under Playwright (`bunx playwright test tests/logo.spec.ts`), NOT vitest.
 * The vitest test config includes only `src/**`, so this file is not picked up
 * by the unit suite. Use this in CI/deploy scripts to capture desktop + mobile
 * screenshots of the header and footer on every deploy.
 *
 * Prereqs (installed on demand in CI):
 *   bun add -d @playwright/test && bunx playwright install --with-deps chromium
 *
 * The dev server must be reachable at PLAYWRIGHT_BASE_URL (default http://localhost:8080).
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 375, height: 812 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`Logo @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("renders, has alt text, and does not overflow", async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: "networkidle" });

      // Header logo (first anchor to /) — image with descriptive alt
      const headerLogo = page.locator('header a[href="/"] img').first();
      await expect(headerLogo).toBeVisible();
      await expect(headerLogo).toHaveAttribute(
        "alt",
        /TOUT DE SUITE ANNONCES/i
      );

      // No horizontal overflow on the whole page
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1
      );
      expect(overflow).toBe(false);

      // Actually loaded (not a broken image icon)
      const naturalWidth = await headerLogo.evaluate(
        (el) => (el as HTMLImageElement).naturalWidth
      );
      expect(naturalWidth).toBeGreaterThan(0);

      // Header screenshot
      await page.locator("header").first().screenshot({
        path: `tests/__screenshots__/logo_${vp.name}_header.png`,
      });

      // Footer screenshot
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      await page.locator("footer").first().screenshot({
        path: `tests/__screenshots__/logo_${vp.name}_footer.png`,
      });
    });
  });
}
