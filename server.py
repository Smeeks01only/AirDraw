import http.server
import socketserver

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".wasm": "application/wasm",
    }

PORT = 8001
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving on http://localhost:{PORT}")
    httpd.serve_forever()