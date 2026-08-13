# Open Therapy documentation

The help documentation for [Open Therapy](https://opentherapy.app), published to
`docs.opentherapy.app`. Built with [Mintlify](https://mintlify.com).

## Structure

| Tab | Directory | Audience |
| --- | --- | --- |
| Overview | root | How the platform works, fees, safety and privacy, support |
| For clients | `clients/` | People looking for and booking a therapist |
| For therapists | `therapists/` | Practitioners listing their practice and taking bookings |

Navigation is defined in `docs.json`. A new page won't appear in the sidebar
until it's added there.

## Brand

Taken from the app's design system in `src/styles.css`.

`style.css` uses the app's `oklch` values verbatim rather than hex conversions,
so the two stay in step. Hex below is for reference only.

| Token | oklch | Approx. | Use |
| --- | --- | --- | --- |
| Brand | `0.34 0.048 178` | `#174038` | Links, focus rings, the mint family |
| Ink | `0.17 0 0` | `#1C1C1C` | Headings, bold, buttons |
| Ink muted | `0.47 0 0` | `#6F6F6F` | Body copy |
| Ink subtle | `0.62 0 0` | `#9B9B9B` | Labels, table captions |
| Mint | `0.87 0.083 152` | `#ACE5BA` | Tiles, table headers, positive callouts |
| Butter | `0.955 0.065 108` | `#F4F4C2` | Tiles, warning callouts |
| Blush | `0.872 0.055 40` | `#F6CABA` | Tiles, danger callouts |
| Sky | `0.905 0.04 235` | `#C7E5F7` | Tiles, note callouts |
| Lavender | `0.89 0.048 295` | `#DCD3F2` | Tiles, the fifth in a row of five |
| Sunken surface | `0.965 0 0` | `#F2F2F2` | Accordion headers, info callouts, quotes |

Three things carry the brand after the redesign: one sans face set tight and
heavy for headlines, near-black ink for anything that is an action, and the
pastels as solid fills on generously rounded blocks. Teal became an accent — it
went from being the colour of every heading to the colour of things you can
click.

The pastels are used as **solid fills**, never tinted down against white and
never a gradient, on borderless blocks at `1.75rem` radius. Cards cycle mint,
butter, blush, sky offset by four (`nth-child(4n+k)`), which gives a diagonal so
no tone repeats beside or below itself in a two- or three-column grid. Mintlify's
default blue/green/yellow/red callouts are remapped onto the same tones.

The sidebar has no fill, matching the app's workspace nav, and marks the current
page with a solid ink pill exactly as the app does.

Two deliberate divergences from the app:

- The sunken surface is neutral grey here and mint-tinted in a few places in the
  app. Against a page that already carries five pastels, a tinted "absence of
  colour" reads as a sixth one.
- Tables use a real `border` rather than the app's `ring-1`. Mintlify wraps
  every table in a scroll container with `overflow` hidden, and a ring is drawn
  with `box-shadow`, which paints outside the border box and gets clipped.

Type is Switzer throughout, self-hosted from `fonts/` — the same two variable
files the app ships. Headings run at 650 rather than 700, because Switzer's bold
closes up at display sizes. `docs.json` names the faces, which is what gets them
preloaded; `style.css` declares them again over the full 100–900 range, because
the `docs.json` font block takes a single weight and without a variable face on
record a heading asking for 650 gets a synthesised smear of the 400.

The Fontshare licence in `fonts/FFL.txt` forbids altering or subsetting the
files, so they ship unmodified.

The site is locked to light mode (`appearance.strict` in `docs.json`), which
hides the theme toggle, so `style.css` carries no dark variants. Removing
`strict` brings the toggle back but leaves dark mode unstyled. `logo/dark.svg` is
generated anyway, so the mark is ready if that changes.

### Regenerating the logo

`logo/light.svg` and `logo/dark.svg` are the words "Open Therapy" set in Switzer
and converted to outlines, so they render before any font has loaded. They are
generated, not drawn:

```sh
python3 scripts/wordmark.py    # needs fonttools and uharfbuzz
```

That script bakes in the three values the app's own wordmark uses — weight 650,
tracking `-0.03em`, ink — reading them from the same font file in `fonts/`. Edit
the script and re-run it rather than touching the path data.

### The favicon

`favicon.png` is the app's own icon rather than anything made here, so a tab from
the docs and a tab from the app carry the same mark. Mintlify wants a file in the
repo and resizes it itself, so the largest source is the one to take:

```sh
curl -sfo favicon.png https://static.opentherapy.app/favicon/android-chrome-512x512.png
```

Re-run that if the app's icon changes. The rest of the set in that bucket —
`favicon.ico`, the 16 and 32 PNGs, `apple-touch-icon.png`, `site.webmanifest` —
is for the app to serve; Mintlify generates its own equivalents from this one
file.

## Development

```sh
npm i -g mint
mint dev
```

The preview runs at `http://localhost:3000`.

Before opening a pull request:

```sh
npm run check       # validate, broken links, and the image check below
mint a11y           # accessibility, run separately as it needs a build
```

`npm run check:images` on its own holds `images/` and the MDX in step: it fails on
a page pointing at an image that doesn't exist, and on an image no page
references. Mintlify's broken-link check reads links rather than `src`
attributes, so a broken image would otherwise ship silently.

## Screenshots

Every image in `images/` is generated by `scripts/screenshots.ts` against a
locally running Open Therapy, so a redesign is one command rather than an
afternoon in a screenshot tool. Never crop one by hand — it will be overwritten
on the next run, and an image nobody can reproduce is an image nobody can trust.

The app side needs to be up, migrated and seeded first, from the app repository:

```sh
bun run db:migrate:local     # do not skip — see below
bun run db:seed:local
bun run dev                  # serves on :8080
```

Then, here:

```sh
npm run screenshots                       # all of them
npm run screenshots -- -g "client-"       # one group
```

Set `DOCS_APP_ORIGIN` if the app isn't on `http://localhost:8080`.

Two accounts are assumed, both created by the app's seed scripts: a therapist
with a few months of practice behind them, and one of their clients. The shots
sign in once each and reuse the session, which is why they run single-file rather
than in parallel.

**Migrate before you shoot.** A screenshot of a page that failed to load is still
a valid PNG, and a run against a database a migration or two behind will publish
error pages as documentation without failing. `shot()` now refuses to photograph
the app's error boundary for exactly this reason, but the guard catches the
symptom — running the migrations avoids it.

Five things about the images themselves:

- They're taken at 1440×900 with `deviceScaleFactor: 2`, so they stay sharp
  rendered at half size on the page.
- Every tag states that half size as an inline width, plus the file's real pixel
  dimensions so the browser can reserve the box before the image lands. That's what
  keeps a narrow clip — a 224px workspace rail, a phone at 390 — at its own size
  rather than stretched across the article, while a full-page shot is clamped back
  to the column by `max-width`. `npm run screenshots` writes all of it, and
  `npm run size-images` puts it back if you wire in an image by hand.
- The drawn size has to be a real layout width. On the published site Mintlify
  serves images through its CDN at a size chosen from the element's layout box, so
  halving with `zoom` or a transform feeds a smaller box back to the CDN and every
  shot arrives at half the resolution it needs. `mint dev` serves the file
  untouched, so that particular mistake looks perfect locally — check a change to
  image sizing against the deployed site, not just the preview.
- They're written as WebP at quality 90. Playwright can only emit PNG, and as
  PNG this set came to 32MB with single images over 2MB — a cost the reader pays.
  Quality 90 is a seventh of the weight and the difference is invisible on UI
  text, which is what WebP handles worst and therefore what's worth checking.
- Fonts and animations are settled before the shutter, and the announcement
  banner is hidden, so a scheduled promotion can't date an image.
- A clipped shot hides anything `fixed` or `sticky` outside the clip, because an
  element screenshot is a crop of the page and the site header would otherwise
  land across the top of it.

## Writing

Read `AGENTS.md` before making changes. It covers terminology, style, and the
two categories of content — money and cancellation terms — that must be verified
against the app source rather than written from memory.

## Publishing

Changes on the default branch deploy automatically through the Mintlify GitHub
app.
