import { defineConfig, devices } from "@playwright/test";

/**
 * Screenshots for the documentation, taken against a local Open Therapy.
 *
 * Every image in this site is generated, never cropped by hand, so a redesign
 * is one command rather than an afternoon in a screenshot tool. See
 * `scripts/screenshots.ts` for the shot list and `README.md` for the setup the
 * app side needs first.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "screenshots.ts",
  // The shots share one signed-in browser each, so they cannot run in parallel.
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    // Spread first. Desktop Chrome carries its own viewport and scale factor, so
    // anything set above it here is silently overwritten — which is how half the
    // shots came out 1280 wide and none of them came out retina.
    ...devices["Desktop Chrome"],
    baseURL: process.env["DOCS_APP_ORIGIN"] ?? "http://localhost:8080",
    // Retina, so a 1440px-wide shot is still sharp on the page at half size.
    deviceScaleFactor: 2,
    viewport: { width: 1440, height: 900 },
    // Seed sessions and therapist hours are Australia/Sydney. A UTC browser
    // labels Wednesday 11:00 as 1:00 AM and photographs the wrong "today".
    timezoneId: "Australia/Sydney",
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
});
