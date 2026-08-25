// Static server for the fixture harnesses.
//
//   node extension/serve-fixtures.js
//   → http://localhost:8791/fixture.html            timeline DOM (eyeball)
//     http://localhost:8791/fixture-compose.html    compose meter (asserts)
//     http://localhost:8791/test.html               engine self-test
//     http://localhost:8791/a/status/123            reply detection, conversation
//     http://localhost:8791/a/with_replies          reply detection, with_replies
//     http://localhost:8791/home                    reply detection, timeline
//
// The last three exist because reply detection depends on WHICH SURFACE you
// are on — X renders no "Replying to" label inside a conversation — and the
// content script reads location.pathname to decide. Opening the file directly
// would always look like a timeline, so the surface cases have to be served at
// x.com-shaped paths to be exercised at all.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8791;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png"
};

function send(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"    // always serve the file on disk, not a stale copy
    });
    res.end(data);
  });
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);

  // x.com-shaped paths → the reply-detection harness, which picks its scenario
  // from the path it was served at.
  if (/^\/[^\/]+\/status\/\d+/.test(urlPath) ||
      /^\/[^\/]+\/with_replies$/.test(urlPath) ||
      urlPath === "/home") {
    send(res, path.join(ROOT, "fixture-thread.html"));
    return;
  }

  const rel = urlPath === "/" ? "fixture.html" : urlPath.replace(/^\//, "");
  const file = path.join(ROOT, rel);
  // Never serve outside the extension directory.
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }
  send(res, file);
}).listen(PORT, () => {
  console.log("fixtures on http://localhost:" + PORT);
  console.log("  reply detection: /a/status/123 · /a/with_replies · /home");
});
