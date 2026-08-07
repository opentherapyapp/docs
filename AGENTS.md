# Documentation project instructions

## About this project

- This is the Open Therapy documentation site, built on [Mintlify](https://mintlify.com)
- It publishes to `docs.opentherapy.app`
- The product it documents lives in the `Open Therapy` app repository (TanStack Start, React, Supabase, Stripe Connect, Cloudflare Workers)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Brand styling lives in `style.css`; the logo and favicon are generated from Instrument Serif
- Use the Mintlify MCP server, `https://mcp.mintlify.com`, to edit content and settings via MCP
- Use the Mintlify docs MCP server, `https://www.mintlify.com/docs/mcp`, to query information about using Mintlify via MCP

## Structure

Three tabs, defined in `docs.json`:

| Tab | Directory | Audience |
| --- | --- | --- |
| Overview | root | Shared: how the platform works, fees, safety, support |
| For clients | `clients/` | People looking for and booking a therapist |
| For therapists | `therapists/` | Practitioners listing and taking bookings |

Anything true for both audiences belongs in the Overview tab and gets linked from both sides. Do not duplicate it. `fees.mdx` is the canonical fee page — the client and therapist fee pages cover their own angle and link to it.

## Terminology

- **Client** — the person seeking care. Not "patient", not "user"
- **Therapist** — any listed practitioner, across all disciplines. "Practitioner" is acceptable in formal contexts
- **Session** — a single appointment. Not "consult" or "appointment slot"
- **Session mode** — one of Online, In person, Home visit
- **Matching** — the questionnaire and shortlist. Not "the algorithm"
- **Lived experience** vs **worked with** — a load-bearing distinction in matching; never collapse them
- **Introduction fee** — the one-off per new client-therapist pair. Not "referral fee"
- **Platform fee** — the 2.5% per session. Not "commission" or "take rate"
- **Open Therapy+** — the client membership. Always with the plus, never "Plus" alone
- Australian English throughout: "specialise", "recognised", "counsellor"

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references
- No emoji
- Money as `$180.00` when exact, `$180` when illustrative. Percentages as `2.5%`
- Escape dollar signs as `\$`, or Mintlify parses the pair as LaTeX and eats them
- For a two-column key/value table with nothing to head the columns, write the
  header row as `| | |`. The mint header band hides itself when every heading
  cell is empty, so don't invent column names just to fill it

## Accuracy rules

This product handles health information and money, so two categories of content must be verified against the app source rather than written from memory:

1. **Money.** Fee percentages, introduction fees by discipline, GST treatment, and every worked example. Check `src/lib/fees.ts`, `src/lib/stripe/README.md`, and the `introduction_fees` migrations. Recompute worked examples with the real algorithm before publishing them.
2. **Cancellation terms.** Windows and percentages for all four presets. Check `src/lib/cancellation-policy.ts` and the `cancellation_policy_terms` seed.

If a number appears in the docs, it should be traceable to a line of code.

## Content boundaries

- Do not document features that are not yet live without marking them. Use an `<Info>` callout saying the feature is being rolled out
- Do not state or imply that Open Therapy provides clinical care, supervision, or crisis support. It is a directory and booking platform
- Do not give tax advice. Explain how invoicing works and refer people to their accountant
- Do not give clinical advice, or suggest what treatment a client should seek
- Every page touching distress, crisis or safety should carry the crisis line details or link to `/getting-help`
- Reviews content must reflect s133 of the Health Practitioner Regulation National Law. Never suggest a client can review clinical outcomes
- Do not document internal admin tooling (fee invoice issuing, payout thawing, the moderation queue)
