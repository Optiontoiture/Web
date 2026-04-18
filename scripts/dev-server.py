#!/usr/bin/env python3
"""Local dev server that mimics Cloudflare Pages clean-URL behavior.
Tries: /path -> /path.html -> /path/index.html
"""
import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        # Strip leading slash for filesystem
        rel = path.lstrip("/")
        if not rel:
            return super().do_GET()
        abs_path = ROOT / rel
        # If exact file exists, serve it
        if abs_path.is_file():
            return super().do_GET()
        # If dir with index.html exists, serve that
        if abs_path.is_dir() and (abs_path / "index.html").is_file():
            return super().do_GET()
        # Try adding .html
        html_path = ROOT / (rel + ".html")
        if html_path.is_file():
            self.path = "/" + rel + ".html" + (
                "?" + self.path.split("?", 1)[1] if "?" in self.path else ""
            )
            return super().do_GET()
        # Try as dir (trailing slash)
        if not rel.endswith("/"):
            dir_index = ROOT / rel / "index.html"
            if dir_index.is_file():
                self.path = "/" + rel + "/index.html"
                return super().do_GET()
        return super().do_GET()  # Will return 404

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

with socketserver.TCPServer(("", PORT), CleanURLHandler) as httpd:
    print(f"Dev server (clean URLs) on http://localhost:{PORT}/")
    httpd.serve_forever()
