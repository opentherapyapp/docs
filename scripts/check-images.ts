/**
 * Hold `images/` and the MDX that references it in step.
 *
 * Two failures this catches, both silent otherwise. A page pointing at an image
 * that was renamed or never captured renders a broken image — Mintlify's
 * broken-link check reads links, not `src` attributes, so nothing else notices.
 * And a shot nobody references is weight in the repository and a minute of every
 * screenshot run spent on an image no reader will see.
 *
 *     npm run check:images
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const IMAGES = join(ROOT, "images");

/** Every `.mdx` in the site, at any depth. */
function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(path);
    return entry.name.endsWith(".mdx") ? [path] : [];
  });
}

const referenced = new Map<string, string[]>();

for (const page of pages(ROOT)) {
  const source = readFileSync(page, "utf8");
  for (const [, name] of source.matchAll(/src="\/images\/([^"]+)"/g)) {
    referenced.set(name, [...(referenced.get(name) ?? []), page.slice(ROOT.length + 1)]);
  }
}

const present = new Set(readdirSync(IMAGES));

const missing = [...referenced].filter(([name]) => !present.has(name));
const unused = [...present].filter((name) => !referenced.has(name));

for (const [name, where] of missing) {
  console.error(`missing  images/${name}  referenced by ${where.join(", ")}`);
}
for (const name of unused) {
  console.error(`unused   images/${name}  no page references it`);
}

if (missing.length > 0 || unused.length > 0) {
  console.error(
    `\n${missing.length} missing, ${unused.length} unused. ` +
      "Capture what's missing with `npm run screenshots`, and either use or delete the rest.",
  );
  process.exit(1);
}

console.log(`${present.size} images, all referenced, all present.`);
