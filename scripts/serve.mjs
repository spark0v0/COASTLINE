import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, relative, extname, isAbsolute } from "node:path";
import { spawn } from "node:child_process";

const project = fileURLToPath(new URL("../", import.meta.url));
const root = resolve(project, "dist");
const port = Number(
  process.argv.find((a) => a.startsWith("--port="))?.slice(7) || 8765,
);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid local port.");
try {
  await stat(resolve(root, "index.html"));
} catch {
  console.error(
    "No production build found. Run npm install, then npm run build.",
  );
  process.exit(1);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};
const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
    const filename = resolve(
      root,
      "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
    );
    const rel = relative(root, filename);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const body = await readFile(filename);
    res.writeHead(200, {
      "Content-Type": types[extname(filename)] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Port ${port} is already in use. Close the previous game server or run: node scripts/serve.mjs --port=8766`
      : error.message,
  );
  process.exit(1);
});
server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(
    `\nCOASTLINE / 海风疾驰\n${url}\n\nKeep this window open while playing. Press Ctrl+C to stop.\n`,
  );
  if (process.argv.includes("--open")) {
    const command =
      process.platform === "win32"
        ? "cmd"
        : process.platform === "darwin"
          ? "open"
          : "xdg-open";
    const args =
      process.platform === "win32" ? ["/c", "start", "", url] : [url];
    const child = spawn(command, args, { windowsHide: true, stdio: "ignore" });
    child.on("error", () => console.log(`Open ${url} in your browser.`));
  }
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
