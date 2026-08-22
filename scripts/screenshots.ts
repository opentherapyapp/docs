/**
 * Every screenshot in the documentation, generated from a local Open Therapy.
 *
 * One test per image, so a selector that rots takes its own shot down and
 * reports which one rather than failing the run. Images land in `images/` as
 * WebP under the name the MDX references, so re-running this is how the docs are
 * brought back in step with the app after a design change.
 *
 * The app side needs a seeded database first — see `README.md`. Two accounts
 * are assumed, both created by the app's seed scripts: a therapist with four
 * months of practice behind them, and one of their clients.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";

const IMAGES = join(import.meta.dirname, "..", "images");
const AUTH = join(import.meta.dirname, ".auth");

const THERAPIST = { email: "nick@opentherapy.app", password: "opentherapy" };
const CLIENT = { email: "maya.okonkwo@example.com", password: "opentherapy" };

const CLIENT_STATE = join(AUTH, "client.json");
const THERAPIST_STATE = join(AUTH, "therapist.json");

/* -------------------------------------------------------------------------- */
/* Taking the shot                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Wait for the page to stop moving. Fonts first, because Switzer arriving after
 * the shot is the difference between a headline at 650 and one faux-bolded by
 * the fallback, then animations off so a card mid-hover or a carousel mid-slide
 * can't land in the image.
 */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
      /* The announcement bar is scheduled content and dates the image. */
      [data-announcement], [data-testid="announcement"] { display: none !important; }
      /*
       * The dev server's error overlay. It appears on a transient HMR hiccup
       * with nothing wrong with the page underneath, and being a shadow host it
       * covers whatever was about to be photographed.
       */
      vite-error-overlay { display: none !important; }
    `,
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  // The live banner is a butter strip immediately above the sticky nav and
  // has never carried a data attribute, so the stylesheet rule above misses it.
  await page.evaluate(() => {
    for (const nav of document.querySelectorAll("nav")) {
      const previous = nav.previousElementSibling;
      if (previous instanceof HTMLElement && previous.classList.contains("bg-butter")) {
        previous.style.display = "none";
      }
    }
  });
  await page.waitForTimeout(400);
}

type ShotOptions = {
  /** Screenshot this element rather than the viewport. */
  clip?: string;
  /** Taller viewport, for a screen that needs more than 900px to make sense. */
  height?: number;
  /** The whole scroll height. Use sparingly — a tall image reads as a wall. */
  fullPage?: boolean;
};

/**
 * Refuse to photograph the error boundary.
 *
 * A viewport screenshot succeeds against any page at all, including the one the
 * app renders when a loader throws — so without this check a broken route is
 * silently published as documentation and the run still reports green. It has
 * already happened once: a migration behind the local database took the
 * therapist profile down, and the shot of it passed.
 */
async function assertRendered(page: Page) {
  await expect(
    page.getByRole("heading", { name: /didn't load|Page not found/ }),
    `${page.url()} rendered an error page instead of the screen being captured`,
  ).toHaveCount(0);
}

/**
 * Get the site chrome out of the way of a clipped shot.
 *
 * An element screenshot is a crop of the rendered page, not a re-render of the
 * element alone, so anything pinned over the top of it lands in the crop —
 * which is how a shot of the booking panel came back with the site header
 * across its title and a floating **Book a session** over its footer. Position
 * is read from the computed style rather than matched by selector, because the
 * thing in the way is a different component on each page.
 */
async function hideOverlays(page: Page, keep: Locator) {
  const element = await keep.elementHandle();
  await page.evaluate((kept) => {
    for (const node of document.querySelectorAll<HTMLElement>("body *")) {
      if (kept?.contains(node) || node.contains(kept as Node)) continue;
      const { position } = getComputedStyle(node);
      if (position === "fixed" || position === "sticky") node.style.visibility = "hidden";
    }
  }, element);
  await page.waitForTimeout(150);
}

/**
 * Write the capture out as WebP.
 *
 * These are retina shots of pages carrying photographs, and as PNG the set came
 * to 32MB — with single images over 2MB sitting inside a help page. At quality
 * 90 the same set is about a seventh of that and the difference is invisible on
 * UI text, which is the thing WebP is worst at and therefore the thing worth
 * checking. Playwright can only write PNG, so the encode happens here.
 */
async function encode(buffer: Buffer, name: string) {
  const path = join(IMAGES, `${name}.webp`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, await sharp(buffer).webp({ quality: 90 }).toBuffer());
}

async function shot(page: Page, name: string, options: ShotOptions = {}) {
  await assertRendered(page);

  if (options.height) {
    await page.setViewportSize({ width: 1440, height: options.height });
    await page.waitForTimeout(300);
  }

  if (options.clip) {
    const element: Locator = page.locator(options.clip).first();
    await expect(element).toBeVisible();
    await hideOverlays(page, element);
    await encode(await element.screenshot(), name);
    return;
  }

  await encode(await page.screenshot({ fullPage: options.fullPage ?? false }), name);
}

/** A public page, captured signed out. */
function publicShot(name: string, url: string, options: ShotOptions = {}) {
  test(name, async ({ page }) => {
    await page.goto(url);
    await settle(page);
    await shot(page, name, options);
  });
}

/* -------------------------------------------------------------------------- */
/* Signing in                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Sign in and keep the cookies, so the workspace shots don't each pay for a
 * round trip through the login form.
 *
 * The filling is a retry loop rather than two straight `fill` calls because the
 * form is server-rendered before React attaches to it. Typing into it in that
 * window puts the text in the DOM and nothing in the component's state, and
 * hydration then renders the empty state over the top — the fields look
 * untouched, the submit button stays disabled, and the only symptom is a click
 * that waits for `enabled` until the test times out. Filling until the button
 * agrees that the form is complete is the condition actually being waited for.
 */
async function signIn(page: Page, who: { email: string; password: string }, state: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle").catch(() => {});

  const submit = page.getByRole("button", { name: "Sign in" });

  await expect(async () => {
    // The password field is labelled by a div rather than a `label`, so
    // `getByLabel` finds nothing at all here.
    await page.getByRole("textbox", { name: "Email" }).fill(who.email);
    await page.getByRole("textbox", { name: "Password" }).fill(who.password);
    await expect(submit).toBeEnabled({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  await submit.click();
  await page.waitForURL(/\/workspace/, { timeout: 30_000 });

  mkdirSync(AUTH, { recursive: true });
  await page.context().storageState({ path: state });
}

test.describe("sign in", () => {
  test("as the client", async ({ page }) => {
    await signIn(page, CLIENT, CLIENT_STATE);
  });

  test("as the therapist", async ({ page }) => {
    await signIn(page, THERAPIST, THERAPIST_STATE);
  });
});

/* -------------------------------------------------------------------------- */
/* Public pages                                                              */
/* -------------------------------------------------------------------------- */

test.describe("public", () => {
  publicShot("home", "/", { height: 1000 });
  publicShot("home-care-types", "/", { clip: "section:has-text('What kind of care?')" });
  publicShot("browse", "/browse");
  publicShot("match", "/match");
  publicShot("therapist-profile", "/therapists/nicholas-carlton");
  publicShot("care-category", "/care/psychology");
  publicShot("services", "/services");
  publicShot("service-detail", "/services/adhd-assessment");
  // groups / ask / gift-cards are PostHog-gated at 0% rollout. Shooting them
  // would publish the 404. Keep the existing images until the flags are on.
  publicShot("blog", "/blog");
  // Not `therapist-posts` — that name belongs to the workspace screen below, and
  // when both used it this shot was silently overwritten by whichever ran last.
  publicShot("therapist-profile-posts", "/therapists/nicholas-carlton/posts");
  // No shots of /fees or /how-it-works. Those pages make the same argument these
  // docs make, and a screenshot of marketing prose beside documentation prose is
  // two copies of one thing, either of which can go stale on its own.
  publicShot("for-therapists", "/for-therapists");
  publicShot("crisis-support", "/crisis-support");
  publicShot("refer", "/refer");
  publicShot("login", "/login");
  publicShot("signup", "/signup");

  test("browse-map", async ({ page }) => {
    await page.goto("/browse");
    await settle(page);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await page.waitForTimeout(2500);
    await shot(page, "browse-map");
  });

  test("profile-booking-panel", async ({ page }) => {
    await page.goto("/therapists/nicholas-carlton");
    await settle(page);
    // The booking card, not the whole `aside` — the column also carries the
    // waitlist prompt and a trust list, and runs to 3,600px.
    await shot(page, "profile-booking-panel", { clip: "aside > div > div" });
  });

  test("match-question", async ({ page }) => {
    await page.goto("/match");
    await settle(page);
    // Answer "who is this for" to get off the first step and into a question
    // that shows the shape of the rest.
    await page.getByRole("button", { name: /^Individual/ }).click();
    await settle(page);
    await shot(page, "match-question");
  });
});

/* -------------------------------------------------------------------------- */
/* Phone                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Two phone shots, not a phone tour.
 *
 * The docs only make a mobile-specific claim twice — that the navigation is a
 * floating bar with your face in the last slot, and that it gets out of the way
 * of the booking bar on a profile. A narrow copy of a page whose desktop shot
 * already appears above it says nothing the reader can't see.
 */
test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  publicShot("phone-profile", "/therapists/nicholas-carlton");

  test.describe("signed in", () => {
    test.use({ storageState: CLIENT_STATE });

    publicShot("phone-workspace", "/workspace");
  });
});

/* -------------------------------------------------------------------------- */
/* The client workspace                                                       */
/* -------------------------------------------------------------------------- */

test.describe("client workspace", () => {
  test.use({ storageState: CLIENT_STATE });

  publicShot("client-overview", "/workspace");
  publicShot("client-sessions", "/workspace/sessions");
  publicShot("client-calendar", "/workspace/calendar");
  publicShot("client-messages", "/workspace/messages");
  publicShot("client-about", "/workspace/about");
  publicShot("client-documents", "/workspace/documents");
  publicShot("client-forms", "/workspace/forms");
  publicShot("client-journal", "/workspace/journal");
  publicShot("client-prompts", "/workspace/prompts");
  publicShot("client-library", "/workspace/library");
  publicShot("client-shortlist", "/workspace/shortlist");
  publicShot("client-preferences", "/workspace/preferences");
  publicShot("client-billing", "/workspace/billing");
  publicShot("client-settings", "/workspace/settings");
});

/* -------------------------------------------------------------------------- */
/* The therapist workspace                                                    */
/* -------------------------------------------------------------------------- */

test.describe("therapist workspace", () => {
  test.use({ storageState: THERAPIST_STATE });

  publicShot("therapist-overview", "/workspace");
  publicShot("therapist-schedule", "/workspace/schedule");
  publicShot("therapist-availability", "/workspace/availability", { height: 1200 });
  publicShot("therapist-clients", "/workspace/clients");
  publicShot("therapist-client-file", "/workspace/clients/demo-client-maya");
  publicShot("therapist-client-notes", "/workspace/clients/demo-client-maya/notes");
  publicShot("therapist-client-documents", "/workspace/clients/demo-client-maya/documents");
  publicShot("therapist-client-measures", "/workspace/clients/demo-client-maya/measures");
  publicShot("therapist-messages", "/workspace/messages");
  publicShot("therapist-forms", "/workspace/forms");
  publicShot("therapist-feedback", "/workspace/feedback");
  publicShot("therapist-earnings", "/workspace/earnings", { height: 1200 });
  publicShot("therapist-payouts", "/workspace/payouts");
  publicShot("therapist-posts", "/workspace/posts");
  publicShot("therapist-waitlist", "/workspace/waitlist");
  publicShot("therapist-settings", "/workspace/settings", { height: 1200 });

  test("therapist-cancellation-policy", async ({ page }) => {
    await page.goto("/workspace/availability");
    await settle(page);
    await shot(page, "therapist-cancellation-policy", {
      clip: "section:has-text('Cancellation')",
    });
  });
});
