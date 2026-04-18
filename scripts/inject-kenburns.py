#!/usr/bin/env python3
"""Inject Ken Burns effect into all HTML pages (excludes root index.html which already has it)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOME = ROOT / "index.html"

KENBURNS_STYLE = """<style id="kenburns-style">
.hero-bg,.hero-banner-bg{overflow:hidden}
.hero-bg img,.hero-banner-bg img{animation:kenburns 22s ease-out infinite alternate;will-change:transform}
@keyframes kenburns{0%{transform:scale(1.05) translate(0,0)}100%{transform:scale(1.18) translate(-2%,-1%)}}
@media(prefers-reduced-motion:reduce){.hero-bg img,.hero-banner-bg img{animation:none}}
</style>
</head>"""

MARKER = 'id="kenburns-style"'

def process(path: Path) -> str:
    html = path.read_text(encoding="utf-8")
    if MARKER in html:
        return "skip-already"
    if 'class="hero-bg"' not in html and 'class="hero-banner-bg"' not in html:
        return "skip-no-hero"
    new = html.replace("</head>", KENBURNS_STYLE, 1)
    if new == html:
        return "skip-no-head"
    path.write_text(new, encoding="utf-8")
    return "injected"

def main():
    counts = {"injected": 0, "skip-already": 0, "skip-no-hero": 0, "skip-no-head": 0}
    for html_file in ROOT.rglob("*.html"):
        # Skip root home page (already has kenburns inline)
        if html_file == HOME:
            counts["skip-already"] += 1
            continue
        # Skip node_modules / brochure-assets
        parts = html_file.relative_to(ROOT).parts
        if parts and parts[0] in {"node_modules", "brochure-assets", "seo-reports"}:
            continue
        status = process(html_file)
        counts[status] = counts.get(status, 0) + 1
        if status == "injected":
            print(f"  + {html_file.relative_to(ROOT)}")
    print()
    for k, v in counts.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    main()
