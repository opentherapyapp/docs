/**
 * Put each screenshot's real pixel dimensions on its tag in the MDX.
 *
 * This is only about layout shift: an image with no dimensions has no size until
 * it has downloaded, so every shot on the page shoves the text below it downwards
 * as it arrives. With the dimensions on the tag the browser reserves the box up
 * front.
 *
 * The numbers written here are the file's own pixel dimensions, not the size the
 * shot is drawn at — `style.css` halves every screenshot, because they're all
 * captured at `deviceScaleFactor: 2`. So the reserved box and the final box come
 * out identical, and nothing moves.
 *
 * Idempotent — it rewrites whatever width and height are already there, so run it
 * after `npm run screenshots` and after wiring a new image into a page:
 *
 *     npm run size-images
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");

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

    // Drop any existing width and height, then put ours back in a fixed place:
    // after `src`, before `alt`, so the long descriptive attribute stays last
    // and the tags read the same way on every page.
    const rest = attributes
      .replace(/\s(?:width|height)="[^"]*"/g, "")
      .replace(/^\s+|\s+$/g, "")
      .replace(/^src="[^"]*"\s*/, "");

    return `<img src="/images/${src![1]}" width="${size.width}" height="${size.height}" ${rest} />`;
  });

  if (updated !== source) {
    writeFileSync(page, updated);
    changed += 1;
    console.log(`sized ${page.slice(ROOT.length + 1)}`);
  }
}

console.log(changed === 0 ? "every image already carries its size." : `${changed} pages updated.`);
