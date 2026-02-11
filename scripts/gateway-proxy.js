#!/usr/bin/env node
/**
 * Gateway Proxy — Unified reverse proxy for OpenClaw
 *
 * Listens on port 18789 (the public-facing port) and routes:
 *   /mc-sidecar/*  →  http://localhost:18791/*   (MC sidecar API)
 *   everything else →  http://localhost:18788/*   (OpenClaw gateway)
 *
 * This allows the sidecar (files, agents, chat) to be accessible
 * through the same public URL as the gateway, solving the Coolify
 * network isolation issue where mission-control and openclaw are
 * on separate Docker networks.
 *
 * Supports SSE streaming (critical for chat completions).
 */

const http = require("http");

const PROXY_PORT = parseInt(process.env.GATEWAY_PROXY_PORT || "18789", 10);
const GATEWAY_PORT = parseInt(process.env.OPENCLAW_INTERNAL_GATEWAY_PORT || "18788", 10);
const SIDECAR_PORT = parseInt(process.env.MC_SIDECAR_PORT || "18791", 10);

function proxyRequest(req, res, targetPort, targetPath) {
  const options = {
    hostname: "127.0.0.1",
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // Copy all headers, add CORS
    const headers = { ...proxyRes.headers };
    headers["access-control-allow-origin"] = "*";
    headers["access-control-allow-methods"] = "GET, POST, PUT, DELETE, OPTIONS";
    headers["access-control-allow-headers"] = "Content-Type, Authorization, X-OpenClaw-Agent-Id";

    res.writeHead(proxyRes.statusCode, headers);
    // Stream the response (important for SSE)
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error(`[gateway-proxy] Upstream error (port ${targetPort}):`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: `Upstream unavailable: ${err.message}` }));
    }
  });

  // Pipe request body (for POST requests)
  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-OpenClaw-Agent-Id",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return;
  }

  // Route /mc-sidecar/* to sidecar (strip prefix)
  if (req.url.startsWith("/mc-sidecar/")) {
    const sidecarPath = req.url.replace("/mc-sidecar", "");
    proxyRequest(req, res, SIDECAR_PORT, sidecarPath);
    return;
  }

  if (req.url === "/mc-sidecar") {
    proxyRequest(req, res, SIDECAR_PORT, "/");
    return;
  }

  // Everything else goes to the gateway
  proxyRequest(req, res, GATEWAY_PORT, req.url);
});

// Disable connection timeout for SSE streaming
server.timeout = 0;
server.keepAliveTimeout = 0;

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`[gateway-proxy] Listening on port ${PROXY_PORT}`);
  console.log(`[gateway-proxy]   /mc-sidecar/* → localhost:${SIDECAR_PORT}`);
  console.log(`[gateway-proxy]   /*            → localhost:${GATEWAY_PORT}`);
});
