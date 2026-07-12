# c12-marks-server.py — serves render/ + persists the owner's checkbox marks (2026-07-10).
# Generic (v2): GET/POST /marks/<name> <-> scripts/c12-session/<name>-checks.json
# Back-compat:  /ladder-marks == /marks/ladder
# Plain stdlib; localhost judging-page helper, not product code.
import json
import os
import re
from http.server import SimpleHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))          # .../scripts/c12-session
REPO = os.path.dirname(os.path.dirname(HERE))               # repo root
PORT = 8324


def marks_path(name):
    if not re.fullmatch(r'[a-z0-9-]{1,40}', name):
        return None
    return os.path.join(HERE, f'{name}-checks.json')


def route(path):
    p = path.split('?')[0]
    if p == '/ladder-marks':
        return marks_path('ladder')
    m = re.fullmatch(r'/marks/([a-z0-9-]{1,40})', p)
    return marks_path(m.group(1)) if m else None


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=os.path.join(REPO, 'render'), **kw)

    # CORS: judging pages may be SERVED from another localhost port (8321/8323) while
    # saving here — absolute fetch + these headers make saves port-agnostic.
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        target = route(self.path)
        if target:
            body = b'{}'
            if os.path.exists(target):
                with open(target, 'rb') as f:
                    body = f.read()
            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        target = route(self.path)
        if target:
            n = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(n)
            try:
                json.loads(raw)  # validate only
            except Exception:
                self.send_response(400)
                self._cors()
                self.end_headers()
                return
            with open(target, 'wb') as f:
                f.write(raw)
            self.send_response(204)
            self._cors()
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()


if __name__ == '__main__':
    HTTPServer(('127.0.0.1', PORT), H).serve_forever()
