"""Regenerate components/ui/rail-icon.tsx from public/assets/icons/*.svg.

Run from the repository root:  python scripts/gen-rail-icons.py

Only the inner shapes of each SVG are kept; the wrapper (size, stroke,
currentColor) is supplied by the RailIcon component so icons match the UI.
"""

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "assets" / "icons"
OUT = ROOT / "components" / "ui" / "rail-icon.tsx"

icons = {}
for f in sorted(SRC.glob("*.svg")):
    svg = f.read_text(encoding="utf8").strip()
    m = re.match(r"<svg[^>]*>(.*)</svg>\s*$", svg, re.S)
    if not m:
        raise SystemExit(f"Not a single <svg> element: {f.name}")
    icons[f.stem] = re.sub(r"\s+", " ", m.group(1)).strip()

current = OUT.read_text(encoding="utf8")
start = current.index("const ICONS = {")
end = current.index("} as const;", start)
body = ",\n".join(f'  "{k}": {json.dumps(v)}' for k, v in icons.items())
OUT.write_text(current[:start] + "const ICONS = {\n" + body + ",\n" + current[end:], encoding="utf8")
print(f"{len(icons)} icons written to {OUT.relative_to(ROOT)}")
