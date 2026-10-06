"""
Reads the change marks of an EASA "AMC and GM — Amendment" PDF.

  python3 scripts/ingest/pdf_changes.py sources/amendments/<file>.pdf > sources/amendments/<file>.changes.txt

EASA presents amendments as marked-up text: deleted text is struck through (and red),
new text is highlighted. A plain text extraction loses both, so this script recovers
them from the PDF itself — the colour of each character and the highlight rectangles
drawn behind it — and writes one paragraph per line, wrapping deleted text in {-…-}
and new text in {+…+}. Requires PyMuPDF (pip install pymupdf). The output is committed
next to the PDF and is what `npm run ingest` verifies the amended text against.
"""
import sys
import pymupdf

RED = 0xFF0000


def is_highlight(fill):
    return fill is not None and len(fill) == 3 and fill[0] < 0.2 and fill[1] > 0.8 and fill[2] > 0.8


def main(path):
    doc = pymupdf.open(path)
    out = []
    for page in doc:
        marks = [d["rect"] for d in page.get_drawings() if is_highlight(d.get("fill"))]
        h = page.rect.height
        for block in page.get_text("rawdict")["blocks"]:
            if block["type"] != 0:
                continue
            x0, y0, x1, y1 = block["bbox"]
            if y1 < h * 0.09 or y0 > h * 0.93:  # running header / footer
                continue
            segs = []  # (kind, text)
            for line in block["lines"]:
                for span in line["spans"]:
                    for ch in span["chars"]:
                        cx = (ch["bbox"][0] + ch["bbox"][2]) / 2
                        cy = (ch["bbox"][1] + ch["bbox"][3]) / 2
                        new = any(r.x0 <= cx <= r.x1 and r.y0 <= cy <= r.y1 for r in marks)
                        kind = "-" if span["color"] == RED else "+" if new else "="
                        c = ch["c"]
                        if c.isspace() and segs:
                            kind = segs[-1][0]  # a space belongs to the run it follows
                        if segs and segs[-1][0] == kind:
                            segs[-1][1] += c
                        else:
                            segs.append([kind, c])
                if segs and not segs[-1][1].endswith(" "):
                    segs[-1][1] += " "
            text = "".join(t if k == "=" else "{%s%s%s}" % (k, t, k) for k, t in segs)
            text = " ".join(text.split())
            if text:
                out.append(text)
    print("\n".join(out))


if __name__ == "__main__":
    main(sys.argv[1])
