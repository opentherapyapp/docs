"""
Draw the Open Therapy wordmark as outlines.

The app sets its wordmark as live text — Switzer at weight 650, tracking
-0.03em, in ink. A docs site can't do that: `docs.json` points at SVG files that
have to render before any stylesheet or font has loaded, in a header that also
appears in Mintlify's own chrome. So the same three values are baked into paths
here, from the same font file the app ships, and the two marks match because
they came from one source rather than because someone eyeballed them.

Re-run this rather than editing the paths:

    python3 scripts/wordmark.py

Needs `fonttools` and `uharfbuzz`. The Fontshare licence in `fonts/FFL.txt`
forbids shipping an altered or subsetted Switzer, which is why the instance
built here stays in memory and only outlines are written to disk.
"""

from io import BytesIO
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "fonts" / "Switzer-Variable.woff2"

TEXT = "Open Therapy"
WEIGHT = 650
# The app's tracking, as a fraction of the type size.
TRACKING = -0.03

# Ink for the light logo, mint for the dark one, matching the app's own use of
# near-black type with the pastels reserved for fills.
INK = "#1C1C1E"
MINT = "#ACE5BA"

# The rendered height of the mark in the docs header, and the padding the
# favicon's tile leaves around it.
LOGO_HEIGHT = 26
FAVICON_SIZE = 64
FAVICON_RADIUS = 14


def instance() -> tuple[TTFont, bytes]:
    """
    Switzer at 650, as a static font plus its raw sfnt bytes.

    The bytes are needed because HarfBuzz has no woff2 decompressor — pointed at
    the file on disk it builds a face with no usable character map and shapes
    every letter to `.notdef`, which produces a valid, empty SVG. Handing it the
    already-decompressed instance also means shaping and outlines come from the
    same weight rather than two.
    """
    font = instantiateVariableFont(TTFont(FONT), {"wght": WEIGHT}, inplace=True)

    # `flavor` survives the load, so saving without clearing it hands back woff2
    # again and HarfBuzz is no better off than it was with the file.
    font.flavor = None
    sfnt = BytesIO()
    font.save(sfnt)
    return font, sfnt.getvalue()


def outlines(font: TTFont, sfnt: bytes) -> tuple[str, int, int, int]:
    """
    The wordmark as one path per letter, plus the box they occupy.

    Shaping goes through HarfBuzz rather than a naive cmap lookup so that
    kerning is the font's own, then tracking is added per glyph the way a
    browser applies `letter-spacing`.
    """
    upem = font["head"].unitsPerEm
    glyph_set = font.getGlyphSet()
    order = font.getGlyphOrder()

    face = hb.Face(sfnt)
    hb_font = hb.Font(face)

    buf = hb.Buffer()
    buf.add_str(TEXT)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf)

    tracking = TRACKING * upem
    paths = []
    x = 0.0

    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        if name == ".notdef":
            raise SystemExit(f"{TEXT!r} shaped to .notdef — the face has no character map")

        pen = SVGPathPen(glyph_set, ntos=lambda v: f"{v:g}")
        glyph_set[name].draw(pen)
        commands = pen.getCommands()
        if commands:
            # y is flipped by the transform on the group, so glyphs are drawn on
            # a baseline at 0 and the box below extends into positive y.
            paths.append(f'<path transform="translate({x + pos.x_offset:g} 0)" d="{commands}"/>')
        x += pos.x_advance + tracking

    # Trailing tracking is space after the last letter, not part of the mark.
    width = round(x - tracking)
    ascent = font["hhea"].ascent
    descent = font["hhea"].descent

    return "\n    ".join(paths), width, ascent, descent


def write(path: Path, svg: str) -> None:
    path.write_text(svg, encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}")


def main() -> None:
    font, sfnt = instance()
    paths, width, ascent, descent = outlines(font, sfnt)
    height = ascent - descent

    # Flip the y axis so font coordinates read as SVG ones, and drop the
    # baseline at the ascent.
    group = f'<g transform="matrix(1 0 0 -1 0 {ascent})" fill="{{fill}}">\n    {paths}\n  </g>'
    scale = LOGO_HEIGHT / height

    logo = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width * scale:.1f}" '
        f'height="{LOGO_HEIGHT}" viewBox="0 0 {width} {height}" '
        f'role="img" aria-label="{TEXT}">\n  {group}\n</svg>\n'
    )

    write(ROOT / "logo" / "light.svg", logo.format(fill=INK))
    write(ROOT / "logo" / "dark.svg", logo.format(fill=MINT))

    # The favicon is the mark on a mint tile, sized to leave an even margin.
    inset = FAVICON_SIZE * 0.12
    tile_scale = (FAVICON_SIZE - inset * 2) / width
    write(
        ROOT / "favicon.svg",
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{FAVICON_SIZE}" '
        f'height="{FAVICON_SIZE}" viewBox="0 0 {FAVICON_SIZE} {FAVICON_SIZE}" '
        f'role="img" aria-label="{TEXT}">\n'
        f'  <rect width="{FAVICON_SIZE}" height="{FAVICON_SIZE}" '
        f'rx="{FAVICON_RADIUS}" fill="{MINT}"/>\n'
        f'  <g transform="translate({inset:g} '
        f'{(FAVICON_SIZE - height * tile_scale) / 2:.2f}) scale({tile_scale:.5f})">\n'
        f"    {group.format(fill=INK)}\n"
        f"  </g>\n</svg>\n",
    )


if __name__ == "__main__":
    main()
