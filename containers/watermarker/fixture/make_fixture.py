import subprocess
from pathlib import Path

import pikepdf
from pikepdf import Array, Dictionary, Name

LABEL_SIZE = 24


def content(box, label, extra=b"", shade=0.85):
    llx, lly, urx, ury = box
    ink = 1 if shade < 0.5 else 0
    return (
        b"q %.2f g %d %d %d %d re f Q\n" % (shade, llx, lly, urx - llx, ury - lly)
        + b"q 2 w 1 0 0 RG %d %d %d %d re S Q\n" % (llx + 4, lly + 4, urx - llx - 8, ury - lly - 8)
        + b"BT %d g /F1 %d Tf %d %d Td (%s) Tj ET\n" % (ink, LABEL_SIZE, llx + 60, (lly + ury) // 2, label.encode())
        + extra
    )


def make_jpeg(workdir):
    source = pikepdf.new()
    bands = b"".join(b"%.1f 0.3 %.1f rg %d 0 20 150 re f\n" % (i / 10, 1 - i / 10, i * 20) for i in range(10))
    source.pages.append(
        pikepdf.Page(Dictionary(Type=Name.Page, MediaBox=Array([0, 0, 200, 150]), Contents=source.make_stream(bands)))
    )
    source.save(workdir / "bands.pdf")
    subprocess.run(
        ["pdftoppm", "-jpeg", "-r", "72", "-singlefile", workdir / "bands.pdf", workdir / "bands"], check=True
    )
    return (workdir / "bands.jpg").read_bytes(), 200, 150


def build(path, workdir):
    workdir = Path(workdir)
    jpeg, width, height = make_jpeg(workdir)
    pdf = pikepdf.new()
    font = pdf.make_indirect(Dictionary(Type=Name.Font, Subtype=Name.Type1, BaseFont=Name("/Helvetica-Bold")))
    image = pdf.make_stream(
        jpeg,
        Type=Name.XObject,
        Subtype=Name.Image,
        Width=width,
        Height=height,
        ColorSpace=Name.DeviceRGB,
        BitsPerComponent=8,
        Filter=Name.DCTDecode,
    )

    def add(box, label, extra=b"", shade=0.85, **attrs):
        page = Dictionary(
            Type=Name.Page,
            MediaBox=Array(box),
            Resources=Dictionary(Font=Dictionary(F1=font), XObject=Dictionary(Im0=image)),
            Contents=pdf.make_stream(content(box, label, extra, shade)),
            **attrs,
        )
        pdf.pages.append(pikepdf.Page(page))

    add([0, 0, 612, 792], "Letter + JPEG", b"q 400 0 0 300 100 300 cm /Im0 Do Q\n")
    add([0, 0, 396, 612], "Comic 5.5x8.5")
    add([0, 0, 1224, 792], "Tabloid landscape")
    add([100, 200, 695, 1042], "A4 offset box")
    add([0, 0, 612, 792], "Rotate 90", Rotate=90)
    add([0, 0, 612, 792], "Rotate 180", Rotate=180)
    add([0, 0, 612, 792], "Rotate 270", Rotate=270)
    add([0, 0, 612, 792], "CropBox", CropBox=Array([50, 80, 562, 742]))
    # Leaves the CTM scaled and two q's open, like some broken producers do.
    add([0, 0, 612, 792], "Unbalanced q", b"q 2 0 0 2 0 0 cm q 0.5 0 0 0.5 10 10 cm\n")
    add([0, 0, 200, 300], "Tiny")
    add([0, 0, 612, 792], "Rotate -90", Rotate=-90)
    # Letter at UserUnit 2: every unit is 2 points, so a footer drawn in raw units would come out twice the size.
    add([0, 0, 306, 396], "UserUnit 2", UserUnit=2)
    # A 9 pt bleed around a Letter trim: the reader keeps the TrimBox, so the footer belongs above the bleed.
    add([0, 0, 630, 810], "TrimBox bleed", TrimBox=Array([9, 9, 621, 801]))
    add([0, 0, 612, 792], "Dark full bleed", shade=0)
    # Annotations are drawn above the page content, so an opaque one over the bottom edge would hide a footer drawn as content.
    cover = pdf.make_stream(
        b"1 g 0 0 612 80 re f", Type=Name.XObject, Subtype=Name.Form, BBox=Array([0, 0, 612, 80])
    )
    annotation = Dictionary(Type=Name.Annot, Subtype=Name.Square, Rect=Array([0, 0, 612, 80]), F=4, AP=Dictionary(N=cover))
    add([0, 0, 612, 792], "Opaque annotation", Annots=Array([pdf.make_indirect(annotation)]))
    # Readers clip the CropBox to the MediaBox, so the visible page is the MediaBox here.
    add([0, 0, 612, 792], "Oversized CropBox", CropBox=Array([-100, -100, 712, 892]))
    # One Q more than the page opened, then a transform and a clip, like a producer that closes a state it never saved.
    add([0, 0, 612, 792], "Extra Q", b"Q 0.02 0 0 0.02 0 0 cm 0 0 1 1 re W n\n")
    pdf.save(workdir / "flat.pdf")

    with pikepdf.open(workdir / "flat.pdf") as raw:
        root_pages = raw.Root.Pages
        inherited_box = [0, 0, 500, 700]
        leaf = raw.make_indirect(
            Dictionary(Type=Name.Page, Contents=raw.make_stream(content(inherited_box, "Inherited Rotate 90")))
        )
        node = raw.make_indirect(
            Dictionary(
                Type=Name.Pages,
                Parent=root_pages,
                Kids=Array([leaf]),
                Count=1,
                MediaBox=Array(inherited_box),
                Rotate=90,
                Resources=Dictionary(Font=Dictionary(F1=raw.copy_foreign(font))),
            )
        )
        leaf.Parent = node
        root_pages.Kids.append(node)
        root_pages.Count = int(root_pages.Count) + 1
        raw.save(path)
