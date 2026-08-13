/**
 * Write the size of every screenshot onto its tag in the MDX.
 *
 * Each tag gets three things: the file's real pixel `width` and `height`, so the
 * browser can reserve the box before the image arrives rather than reflowing the
 * page as each one lands, and an inline width of half that, which is the size the
 * shot is meant to be drawn at — every capture is at `deviceScaleFactor: 2`.
 *
 * Two reasons the drawn size has to be stated rather than derived. Mintlify's own
 * stylesheet sizes an image from its intrinsic pixels, so a narrow clip — a 224px
 * workspace rail, a phone at 390 — is otherwise stretched to the width of the
 * article as a wall of soft pixels. And on the published site every image is served
 * through Mintlify's CDN at a size chosen from the element's layout box, so this
 * has to be a real layout width: halving with `zoom` or a transform shrinks the box,
 * the CDN then serves an image to match the smaller box, and the shot arrives at
 * half the resolution it needs. That failure is invisible in `mint dev`, which
 * serves the file untouched.
 *
 * A wide shot ends up with an inline width larger than the column, and `style.css`
 * clamps it back with `max-width: 100%`. Stating it anyway keeps every tag the same
 * shape, and keeps the rendering correct at any column width.
 *
 * Idempotent — it rewrites whatever sizes are already there, so run it after
 * `npm run screenshots` and after wiring a new image into a page:
 *
 *     npm run size-images
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");

/** Captures are 2x, so a shot is drawn at half its pixel size. */
const SCALE = 2;

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(path);
    return entry.name.endsWith(".mdx") ? [path] : [];
  });
}

const sizes = new Map<string, { width: number; height: number }>();

for (const file of readdirSync(join(ROOT, "images"))) {
  const { width = 0, height = 0 } = await sharp(join(ROOT, "images", file)).metadata();
  sizes.set(file, { width, height });
}

let changed = 0;

for (const page of pages(ROOT)) {
  const source = readFileSync(page, "utf8");

  const updated = source.replace(/<img\s([^>]*?)\/>/g, (tag, attributes: string) => {
    const src = /src="\/images\/([^"]+)"/.exec(attributes);
    const size = src ? sizes.get(src[1]!) : undefined;
    if (!size) return tag;

    // Drop whatever sizing is already there, then put ours back in a fixed order:
    // after `src`, before `alt`, so the long descriptive attribute stays last and
    // the tags read the same way on every page.
    const rest = attributes
      .replace(/\s(?:width|height)="[^"]*"/g, "")
      .replace(/\sstyle=\{\{[^}]*\}\}/g, "")
      .replace(/^\s+|\s+$/g, "")
      .replace(/^src="[^"]*"\s*/, "");

    const drawn = Math.round(size.width / SCALE);

    return (
      `<img src="/images/${src![1]}" width="${size.width}" height="${size.height}"` +
      ` style={{ width: ${drawn} }} ${rest} />`
    );
  });

  if (updated !== source) {
    writeFileSync(page, updated);
    changed += 1;
    console.log(`sized ${page.slice(ROOT.length + 1)}`);
  }
}

console.log(changed === 0 ? "every image already carries its size." : `${changed} pages updated.`);
