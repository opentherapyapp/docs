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
| Brand | `0.34 0.048 178` | `#174038` | Headings, links, text on pastel |
| Ink | `0.29 0.045 178` | `#0C332B` | Body text, callout copy |
| Ink muted | `0.48 0.028 178` | `#4D635D` | Secondary table columns |
| Mint | `0.87 0.083 152` | `#ACE5BA` | Tiles, table headers, positive callouts |
| Butter | `0.955 0.065 108` | `#F4F4C2` | Tiles, warning callouts |
| Blush | `0.872 0.055 40` | `#F6CABA` | Tiles, danger callouts |
| Sky | `0.905 0.04 235` | `#C7E5F7` | Tiles, note callouts |
| Sunken surface | `0.972 0.016 165` | `#ECF9F3` | Accordion headers, info callouts, quotes |

The pastels are used as **solid fills**, never tinted down against white, on
borderless blocks at `1.5rem` radius — the app's tile treatment. Cards cycle
mint, butter, blush, sky offset by four (`nth-child(4n+k)`), which gives a
diagonal so no tone repeats beside or below itself in a two- or three-column
grid. Mintlify's default blue/green/yellow/red callouts are remapped onto the
same four tones.

The sidebar has no fill, matching the app's portal nav, so colour on a page
comes from its content rather than its chrome.

Two deliberate divergences from the app:

- Tile body copy is set at `brand/70` in the app, but that is decorative
  subtext. Card bodies here carry real prose, and 70% falls under 4.5:1 on mint
  and blush, so `--ot-brand-body` holds it at 85%.
- Tables use a real `border` rather than the app's `ring-1`. Mintlify wraps
  every table in a scroll container with `overflow` hidden, and a ring is drawn
  with `box-shadow`, which paints outside the border box and gets clipped.

Headings are Instrument Serif at weight 400; body is Inter Tight. Both are set
in `docs.json` and loaded from Google Fonts. Colour and shape live in
`style.css`.

The site is locked to light mode (`appearance.strict` in `docs.json`), which
hides the theme toggle, so `style.css` carries no dark variants. Removing
`strict` brings the toggle back but leaves dark mode unstyled.

### Regenerating the logo

`logo/light.svg`, `logo/dark.svg` and `favicon.svg` are the words "Open Therapy"
set in Instrument Serif and converted to outlines, so they render without the
font being available. To change the wordmark, re-run the generation with
`fonttools` and `uharfbuzz` against `InstrumentSerif-Regular.ttf` rather than
editing the paths by hand.

## Development

```sh
npm i -g mint
mint dev
```

The preview runs at `http://localhost:3000`.

Useful checks before opening a pull request:

```sh
mint validate       # config and frontmatter
mint broken-links   # internal links
mint a11y           # accessibility
```

## Writing

Read `AGENTS.md` before making changes. It covers terminology, style, and the
two categories of content — money and cancellation terms — that must be verified
against the app source rather than written from memory.

## Publishing

Changes on the default branch deploy automatically through the Mintlify GitHub
app.
