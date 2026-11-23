import { createReadStream, existsSync, statSync, watch } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const publicDirectory = join(process.cwd(), "public");
const liveReloadClients = new Set();
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function notifyLiveReload() {
  for (const client of liveReloadClients) {
    client.write("event: reload\ndata: changed\n\n");
  }
}

function watchForChanges(target, options) {
  let debounceTimer;
  const watcher = watch(target, options, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(notifyLiveReload, 80);
  });

  // OneDrive/antivírus podem invalidar o watcher; não deixe isso derrubar o servidor.
  watcher.on("error", () => {});
}

// public/styles.css is rewritten by `npm run watch:css`, which reloads the page.
watchForChanges(publicDirectory, { recursive: true });

const server = createServer((request, response) => {
  const [requestPath] = request.url.split("?");

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }

  const filePathRequest = decodedPath === "/" ? "/index.html" : decodedPath;

  if (filePathRequest === "/live-reload") {
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    });
    response.write("retry: 1000\n\n");
    liveReloadClients.add(response);
    request.on("close", () => liveReloadClients.delete(response));
    return;
  }

  const filePath = normalize(join(publicDirectory, filePathRequest));

  if (!filePath.startsWith(publicDirectory + sep) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream" });
  createReadStream(filePath).pipe(response);
});

const port = Number(process.env.PORT) || 3100;
server.listen(port, () => {
  console.log(`Pega Plantão — Modern rodando em http://localhost:${port}`);
});
