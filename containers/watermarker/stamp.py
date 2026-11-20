import sys
import unicodedata

import pikepdf
from pikepdf import Dictionary, Name

FONT_SIZE = 7.0
MIN_FONT_SIZE = 5.0
MARGIN = 10.0
LEADING = 1.2
OUTLINE = 0.2
SEPARATOR = " · "
FONT_NAME = Name("/GarageStamp")

# Helvetica advance widths in 1/1000 em for WinAnsi codes 32 to 126, from Adobe's standard AFM.
ASCII_WIDTHS = (
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
    278, 278, 584, 584, 584, 556, 1015,
    667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
    722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
    278, 278, 278, 469, 556, 333,
    556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833,
    556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
    334, 260, 334, 584,
)
NON_ASCII_WIDTHS = {"·": 278}
# No WinAnsi glyph of Helvetica is wider, so a character missing above can only shrink the footer, never push it off the page.
WIDEST = 1000


class StampError(ValueError):
    pass


def char_width(char):
    if char in NON_ASCII_WIDTHS:
        return NON_ASCII_WIDTHS[char]
    # Accented Latin letters are as wide as their base letter in Helvetica.
    base = ord(unicodedata.normalize("NFD", char)[0])
    return ASCII_WIDTHS[base - 32] if 32 <= base <= 126 else WIDEST


def text_width(text, size):
    return sum(char_width(char) for char in text) * size / 1000


def break_line(text, room, size):
    lines, line = [], ""
    for char in text:
        if line and text_width(line + char, size) > room:
            lines.append(line)
            line = ""
        line += char
    return [*lines, line]


def layout(text, width):
    room = width - 2 * MARGIN
    if text_width(text, FONT_SIZE) <= room:
        return [text], FONT_SIZE
    parts = text.split(SEPARATOR)
    size = min(FONT_SIZE, room / max(text_width(part, 1) for part in parts))
    if size >= MIN_FONT_SIZE:
        return parts, size
    return [line for part in parts for line in break_line(part, room, MIN_FONT_SIZE)], MIN_FONT_SIZE


def normalized(box):
    a, b, c, d = (float(v) for v in box)
    return [min(a, c), min(b, d), max(a, c), max(b, d)]


def visible_box(page):
    """The part of the page a reader sees and keeps: the MediaBox clipped to the CropBox, as readers do, then to the TrimBox.

    A box that does not overlap what is left is ignored.
    """
    box = normalized(page.mediabox)
    for other in (page.cropbox, page.trimbox):
        o = normalized(other)
        clipped = [max(box[0], o[0]), max(box[1], o[1]), min(box[2], o[2]), min(box[3], o[3])]
        if clipped[0] < clipped[2] and clipped[1] < clipped[3]:
            box = clipped
    return box


def footer_matrix(box, rotation):
    """Maps "reader space" (origin at the bottom-left corner the reader sees, x to the right, y up) to page space.

    Returns the cm matrix and the width of the page as the reader sees it.
    """
    llx, lly, urx, ury = box
    width, height = urx - llx, ury - lly
    rotation = rotation % 360
    if rotation == 90:
        return (0, 1, -1, 0, urx, lly), height
    if rotation == 180:
        return (-1, 0, 0, -1, urx, ury), width
    if rotation == 270:
        return (0, -1, 1, 0, llx, ury), height
    return (1, 0, 0, 1, llx, lly), width


def pdf_string(text):
    """The text as a PDF string in WinAnsi, the encoding of the base-14 font. Refuses what WinAnsi cannot show."""
    try:
        raw = text.encode("cp1252")
    except UnicodeEncodeError as error:
        raise StampError(f"Cannot stamp {text[error.start:error.end]!r}: Helvetica has no glyph for it.") from error
    return b"(" + raw.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)") + b")"


def footer_ops(text, box, rotation, user_unit):
    matrix, reader_width = footer_matrix(box, rotation)
    width = reader_width * user_unit
    lines, size = layout(text, width)
    # Reader space in points: a /UserUnit page scales every unit, so undo it to keep the footer the same physical size.
    cm = b" ".join(b"%.4f" % v for v in matrix) + b" cm %.6f 0 0 %.6f 0 0 cm" % (1 / user_unit, 1 / user_unit)
    placed = [
        b"1 0 0 1 %.2f %.2f Tm %s Tj"
        % ((width - text_width(line, size)) / 2, MARGIN + row * size * LEADING, pdf_string(line))
        for row, line in enumerate(reversed(lines))
    ]
    return (
        b"q %s\n" % cm
        + b"BT /GarageStamp %.2f Tf 1 1 1 RG %.2f w 1 Tr %s ET\n" % (size, OUTLINE * size, b" ".join(placed))
        + b"BT /GarageStamp %.2f Tf 0.15 g 0 Tr %s ET\n" % (size, b" ".join(placed))
        + b"Q\n"
    )


def save_depths(page):
    depth = lowest = 0
    for instruction in pikepdf.parse_content_stream(page, "q Q"):
        depth += 1 if str(instruction.operator) == "q" else -1
        lowest = min(lowest, depth)
    return -lowest, depth


def stamp(source, destination, text):
    pdf_string(text)
    with pikepdf.open(source) as pdf:
        font = pdf.make_indirect(
            Dictionary(
                Type=Name.Font,
                Subtype=Name.Type1,
                BaseFont=Name.Helvetica,
                Encoding=Name.WinAnsiEncoding,
            )
        )
        # Annotations are drawn above the page content: burnt into it first, none can cover the footer drawn after.
        pdf.flatten_annotations()
        for page in pdf.pages:
            page.add_resource(font, Name.Font, FONT_NAME)
            # One q more than the page ever pops, so a stray Q cannot undo the isolation, and a Q after it for every q still
            # open, so the footer always starts from the default graphics state.
            extra_closes, left_open = save_depths(page)
            opened = 1 + extra_closes
            user_unit = float(page.obj.get(Name.UserUnit, 1))
            page.contents_add(b"q\n" * opened, prepend=True)
            page.contents_add(
                b"Q\n" * (opened + left_open) + footer_ops(text, visible_box(page), page.rotation, user_unit), prepend=False
            )
        pdf.save(
            destination,
            stream_decode_level=pikepdf.StreamDecodeLevel.none,
            recompress_flate=False,
            object_stream_mode=pikepdf.ObjectStreamMode.preserve,
        )


def self_check():
    def apply(m, x, y):
        a, b, c, d, e, f = m
        return (a * x + c * y + e, b * x + d * y + f)

    box = (100, 200, 712, 992)
    expected = {
        0: ((406, 200), (0, 1)),
        90: ((712, 596), (-1, 0)),
        180: ((406, 992), (0, -1)),
        270: ((100, 596), (1, 0)),
    }
    for rotation, (bottom_middle, up) in expected.items():
        matrix, reader_width = footer_matrix(box, rotation)
        assert apply(matrix, reader_width / 2, 0) == bottom_middle, (rotation, apply(matrix, reader_width / 2, 0))
        origin = apply(matrix, 0, 0)
        tip = apply(matrix, 0, 1)
        assert (tip[0] - origin[0], tip[1] - origin[1]) == up, rotation
    assert footer_matrix(box, -90) == footer_matrix(box, 270)

    short = "Compra GRG-1042 · ana@example.com"
    assert layout(short, 612) == ([short], FONT_SIZE), "a short footer is one 7 pt line on Letter"
    lines, size = layout(short, 140)
    assert lines == ["Compra GRG-1042", "ana@example.com"] and MIN_FONT_SIZE <= size <= FONT_SIZE, (lines, size)

    email = "a" * 64 + "@" + ".".join(["b" * 63, "c" * 63, "d" * 61])
    assert len(email) == 254
    lines, size = layout(f"Compra GRG-1042 · {email}", 200)
    assert size == MIN_FONT_SIZE, "a long email breaks at 5 pt instead of shrinking further"
    assert "".join(lines) == "Compra GRG-1042" + email, "no character is dropped"
    assert all(text_width(line, size) <= 200 - 2 * MARGIN for line in lines), "every line fits"

    assert pdf_string("a(b)\\c") == b"(a\\(b\\)\\\\c)"
    assert pdf_string("José · ñ") == b"(Jos\xe9 \xb7 \xf1)"
    try:
        pdf_string("ana@例え.jp")
    except StampError:
        pass
    else:
        raise AssertionError("text outside WinAnsi must fail, never be replaced")
    print("stamp self-check passed")


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-check"]:
        self_check()
    else:
        stamp(sys.argv[1], sys.argv[2], sys.argv[3])
