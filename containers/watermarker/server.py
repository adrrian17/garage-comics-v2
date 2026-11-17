"""The Watermarker container's HTTP face. Only its Durable Object reaches it, through ctx.container.getTcpPort.

GET  /health             -> 200 once listening
POST /stamp?text=<footer> body: the original PDF, with its Content-Length
                          -> 200 with the stamped PDF and its Content-Length
                          -> 422 when the body is not a PDF or the footer has a character Helvetica cannot show
"""

import json
import os
import shutil
import tempfile
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import pikepdf

from stamp import StampError, stamp

PORT = 8080
CHUNK = 1 << 20


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self._reply(200, b"ok")
        else:
            self._reply(404, b"not found")

    def do_POST(self):
        url = urlparse(self.path)
        text = parse_qs(url.query).get("text", [""])[0]
        length = int(self.headers.get("content-length", "0"))
        if url.path != "/stamp" or not text or length <= 0:
            self._reply(400, b"POST /stamp?text=... with a PDF body and its Content-Length")
            return

        # A directory per request: a request left running by a restarted Durable Object cannot collide with its retry.
        with tempfile.TemporaryDirectory() as work:
            source, copy = os.path.join(work, "in.pdf"), os.path.join(work, "out.pdf")
            started = time.monotonic()

            with open(source, "wb") as file:
                remaining = length
                while remaining > 0:
                    chunk = self.rfile.read(min(CHUNK, remaining))
                    if not chunk:
                        raise ConnectionError("The PDF ended early.")
                    file.write(chunk)
                    remaining -= len(chunk)

            try:
                stamp(source, copy, text)
            except (pikepdf.PdfError, StampError) as error:
                self._reply(422, str(error).encode())
                return

            size = os.path.getsize(copy)
            self.send_response(200)
            self.send_header("content-type", "application/pdf")
            self.send_header("content-length", str(size))
            self.end_headers()
            with open(copy, "rb") as file:
                shutil.copyfileobj(file, self.wfile, CHUNK)

            # One line per job: the measurement the spec asks for (a 500 MB PDF on standard-1) comes from these.
            print(
                json.dumps(
                    {
                        "event": "stamped",
                        "bytesIn": length,
                        "bytesOut": size,
                        "seconds": round(time.monotonic() - started, 1),
                    }
                ),
                flush=True,
            )

    def _reply(self, status, body):
        self.send_response(status)
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # the JSON line above replaces the access log


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
