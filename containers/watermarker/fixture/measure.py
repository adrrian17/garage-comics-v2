"""Stamps the hazard fixture with stamp.py and checks, page by page, where the footer lands as a reader sees it.

Run from anywhere, with pikepdf and poppler (pdftotext, pdftoppm) installed:

    python3 containers/watermarker/fixture/measure.py [output directory]

Exits 1 when any page fails. A page passes when its footer is complete (every character, in order), inside the box the
reader keeps, within 20 pt of that box's bottom edge, centred within 2 pt, at least 5 pt tall, and, rendered, shows both
light and dark pixels, so it stays readable over light and dark artwork alike, and changes the render of the unstamped page
where its text is, so nothing the page draws (an annotation, a clip, a leftover transform) hides or moves it.
"""

import hashlib
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import pikepdf

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE), str(HERE.parent)]

from make_fixture import LABEL_SIZE, build
from stamp import StampError, stamp

EMAIL_254 = "a" * 64 + "@" + ".".join(["b" * 63, "c" * 63, "d" * 61])
TEXTS = {
    "short email": "Compra GRG-1042 · ana@example.com",
    "254-char email": f"Compra GRG-1042 · {EMAIL_254}",
}
MAX_GAP = 20
MAX_CENTRE_OFFSET = 2
# poppler's word box for Helvetica is about 0.92 of the font size tall, so this is a 5 pt footer with a little slack.
MIN_HEIGHT = 4.5
# A 5 pt glyph stem is under half a point, so it needs this many dots to show solid ink.
RENDER_DPI = 432
LIGHT, DARK = 200, 60
MIN_SHARE = 0.02
# How far a pixel's grey level must move from the unstamped render to count as the footer's ink.
INK = 64

WORD = re.compile(r'<word xMin="([-\d.]+)" yMin="([-\d.]+)" xMax="([-\d.]+)" yMax="([-\d.]+)">([^<]*)</word>')


def words_by_page(path):
    html = subprocess.run(
        ["pdftotext", "-cropbox", "-bbox", path, "-"], capture_output=True, text=True, check=True
    ).stdout
    for page in re.findall(r"<page (.*?)</page>", html, re.S):
        size = tuple(float(v) for v in re.search(r'width="([\d.]+)" height="([\d.]+)"', page).groups())
        yield size, [(*(float(v) for v in m.groups()[:4]), m.group(5)) for m in WORD.finditer(page)]


def normalized(box):
    a, b, c, d = (float(v) for v in box)
    return min(a, c), min(b, d), max(a, c), max(b, d)


def reader_box(page, width, height):
    """The box the reader keeps, in pdftotext's coordinates (origin top-left of the CropBox as the reader sees it)."""
    trim, crop = normalized(page.trimbox), normalized(page.cropbox)
    if trim == crop:
        return 0, 0, width, height
    assert page.rotation % 360 == 0, "the fixture only offsets a TrimBox on an unrotated page"
    return trim[0] - crop[0], crop[3] - trim[3], trim[2] - crop[0], crop[3] - trim[1]


def rendered(path, number, region, width):
    """The grey levels inside `region` of the rendered page."""
    with tempfile.TemporaryDirectory() as work:
        stem = Path(work) / "page"
        subprocess.run(
            ["pdftoppm", "-cropbox", "-gray", "-r", str(RENDER_DPI), "-f", str(number), "-l", str(number), "-singlefile", path, stem],
            check=True,
            stderr=subprocess.DEVNULL,
        )
        data = (stem.with_suffix(".pgm")).read_bytes()
    _, columns, rows, _, pixels = re.match(rb"(P5)\s+(\d+)\s+(\d+)\s+(\d+)\s(.*)", data, re.S).groups()
    columns, rows = int(columns), int(rows)
    scale = columns / width
    x0, y0, x1, y1 = (round(v * scale) for v in region)
    return [
        pixels[y * columns + x] for y in range(max(y0, 0), min(y1, rows)) for x in range(max(x0, 0), min(x1, columns))
    ]


def measure(path, original, text):
    failures = 0
    with pikepdf.open(path) as pdf:
        pages = list(pdf.pages)
        for number, ((width, height), words) in enumerate(words_by_page(path), start=1):
            page = pages[number - 1]
            if page.rotation % 180 == 90:
                width, height = height, width
            unit = float(page.obj.get(pikepdf.Name.UserUnit, 1))
            label = " ".join(w[4] for w in words if w[3] - w[1] >= LABEL_SIZE / 2)
            footer = sorted((w for w in words if w[3] - w[1] < LABEL_SIZE / 2), key=lambda w: (round(w[1], 1), w[0]))
            if not footer:
                print(f"page {number:2} {label:20} NO FOOTER FOUND  FAIL")
                failures += 1
                continue
            left, top, right, bottom = reader_box(page, width, height)
            x0, y0 = min(w[0] for w in footer), min(w[1] for w in footer)
            x1, y1 = max(w[2] for w in footer), max(w[3] for w in footer)
            gap = (bottom - y1) * unit
            offset = ((x0 + x1) / 2 - (left + right) / 2) * unit
            tallest = max(w[3] - w[1] for w in footer) * unit
            lines = len({round(w[1], 1) for w in footer})
            region = (x0 - 1, y0 - 1, x1 + 1, y1 + 1)
            inside, before = rendered(path, number, region, width), rendered(original, number, region, width)
            light, dark = (sum(p >= LIGHT for p in inside) / len(inside), sum(p <= DARK for p in inside) / len(inside))
            ink = sum(abs(a - b) >= INK for a, b in zip(inside, before)) / len(inside)
            checks = {
                # A footer on several lines drops the " · " between its parts; every other character must be there, in order.
                "complete": "".join(w[4] for w in footer).replace("·", "") == text.replace(" ", "").replace("·", ""),
                "inside": x0 >= left and x1 <= right and y1 <= bottom,
                "bottom": 0 <= gap <= MAX_GAP,
                "centred": abs(offset) <= MAX_CENTRE_OFFSET,
                "size": min(w[3] - w[1] for w in footer) * unit >= MIN_HEIGHT,
                "readable": light >= MIN_SHARE and dark >= MIN_SHARE,
                "visible": ink >= MIN_SHARE,
            }
            failed = [name for name, ok in checks.items() if not ok]
            failures += bool(failed)
            print(
                f"page {number:2} {label:20} {lines} line(s) {tallest:4.1f} pt tall  gap {gap:5.1f}  centre {offset:+5.1f}"
                f"  light {light:4.0%} dark {dark:4.0%} ink {ink:4.0%}  {'FAIL ' + ','.join(failed) if failed else 'PASS'}"
            )
    return failures


def image_hashes(path):
    with pikepdf.open(path) as pdf:
        return sorted(
            hashlib.sha256(obj.read_raw_bytes()).hexdigest()
            for obj in pdf.objects
            if isinstance(obj, pikepdf.Stream) and obj.get(pikepdf.Name.Subtype) == pikepdf.Name.Image
        )


def main(out):
    fixture = out / "fixture.pdf"
    build(fixture, out)
    failures = 0
    for name, text in TEXTS.items():
        stamped = out / f"stamped-{name.replace(' ', '-')}.pdf"
        stamp(fixture, stamped, text)
        print(f"\n{name}: {stamped}")
        failures += measure(stamped, fixture, text)
        if image_hashes(stamped) != image_hashes(fixture):
            print("image bytes changed  FAIL")
            failures += 1
        with pikepdf.open(stamped) as pdf:
            problems = pdf.check_pdf_syntax()
        if problems:
            print(f"structure: {problems}  FAIL")
            failures += 1

    refused = out / "refused.pdf"
    try:
        stamp(fixture, refused, "Compra GRG-1042 · ana@例え.jp")
    except StampError as error:
        print(f"\nnon-WinAnsi email refused: {error}")
    if refused.exists():
        print("a copy was written for text the font cannot show  FAIL")
        failures += 1

    print(f"\n{'FAILED: ' + str(failures) if failures else 'ALL PASS'}")
    return failures


if __name__ == "__main__":
    if len(sys.argv) > 1:
        directory = Path(sys.argv[1])
        directory.mkdir(parents=True, exist_ok=True)
        sys.exit(1 if main(directory) else 0)
    with tempfile.TemporaryDirectory() as directory:
        sys.exit(1 if main(Path(directory)) else 0)
