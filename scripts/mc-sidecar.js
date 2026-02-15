#!/usr/bin/env node
/**
 * Mission Control Sidecar API
 *
 * Lightweight HTTP server running inside the openclaw container.
 * Handles agent management operations that require direct file system access
 * (creating workspaces, updating openclaw.json, seeding SOUL.md files).
 *
 * Endpoints:
 *   GET  /config          — Returns mc-config.json data
 *   GET  /agents          — Lists all agents from openclaw.json
 *   POST /agents/create   — Creates a new agent (workspace + config + SOUL.md)
 *   GET  /files/roots     — Lists available filesystem roots
 *   GET  /files/list      — Lists directory content (query: root, path)
 *   GET  /files/read      — Reads file preview (query: root, path, maxBytes)
 *   GET  /files/download  — Downloads a file (query: root, path)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PORT = 18790;
const MC_SHARED_DIR = process.env.MC_SHARED_DIR || "/mc-shared";
const CONFIG_FILE =
  process.env.OPENCLAW_CONFIG_FILE || "/data/.openclaw/openclaw.json";
const STATE_DIR = process.env.OPENCLAW_STATE_DIR || "/data/.openclaw";
const CONVEX_URL = process.env.CONVEX_URL || "";

const DEFAULT_FILE_ROOTS = [
  { id: "data", name: "OpenClaw Data", path: "/data" },
  { id: "workspace", name: "OpenClaw Workspace", path: "/data/openclaw-workspace" },
  { id: "shared", name: "Mission Control Shared", path: MC_SHARED_DIR },
];

const FILE_ROOTS = DEFAULT_FILE_ROOTS.filter((root) => fs.existsSync(root.path));
const SHOW_HIDDEN_FILES = process.env.MC_SHOW_HIDDEN_FILES === "1";

// --- Helpers ---

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    // Strip comments for JSON5 compatibility
    const cleaned = raw.replace(/\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to read config:", e.message);
    return null;
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

function updateMcConfig(agents) {
  const mcConfigPath = path.join(MC_SHARED_DIR, "mc-config.json");
  try {
    const existing = JSON.parse(fs.readFileSync(mcConfigPath, "utf-8"));
    existing.agents = agents;
    fs.writeFileSync(mcConfigPath, JSON.stringify(existing, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to update mc-config.json:", e.message);
  }
}

function generateSoulMd(name, role, description) {
  return `# SOUL.md — ${name}

**Name:** ${name}
**Role:** ${role}

## Who You Are
${description}

## Mission Control Integration
You are part of an AI agent squad managed through Mission Control.
- Check your assigned tasks on each heartbeat
- Post progress updates to task threads
- Use @mentions to communicate with other agents
- Move tasks through the pipeline: assigned → in_progress → review

## Communication
- Use \`@jarvis\` to report to the coordinator
- Use \`@<agentId>\` to communicate with other specialists
- Post decisions and findings as task comments

## Heartbeat Protocol
Every 15 minutes, check for:
1. Notifications and @mentions
2. Newly assigned tasks
3. In-progress work to resume
If nothing needs attention, reply HEARTBEAT_OK.
`;
}

function generateHeartbeatMd(agentId) {
  return `# HEARTBEAT Checklist — ${agentId}

## On Wake (every 15 minutes)

### 1. Update Status
\`\`\`bash
source /app/scripts/agent-convex-helpers.sh
mc_agent_heartbeat "${agentId}" "online"
\`\`\`

### 2. Check Notifications
\`\`\`bash
mc_get_notifications "${agentId}"
\`\`\`
- If @mentions found: read context and respond

### 3. Check Assigned Tasks
\`\`\`bash
mc_get_my_tasks "${agentId}" "assigned"
\`\`\`
- If tasks found: pick one, move to in_progress, begin work

### 4. Resume In-Progress Work
- Check memory/WORKING.md for ongoing tasks
- Continue where you left off

### 5. Stand Down
- If nothing needs attention: reply HEARTBEAT_OK
`;
}

function generateAgentsMd(name) {
  return `# AGENTS.md — ${name} Workspace

## Every Session
1. Read SOUL.md — this is who you are
2. Read HEARTBEAT.md — this is your checklist
3. Check memory/WORKING.md for current task state

## Memory
- **Working state**: memory/WORKING.md — update constantly
- **Daily notes**: memory/YYYY-MM-DD.md — raw logs
- Write it down. Mental notes don't survive restarts.

## Tools
Helper script: \`/app/scripts/agent-convex-helpers.sh\`
- \`mc_agent_heartbeat <agentId> <status>\`
- \`mc_get_notifications <agentId>\`
- \`mc_get_my_tasks <agentId> [status]\`
- \`mc_move_task <taskId> <status>\`
- \`mc_post_message <from> <content> [taskId] [type]\`
`;
}

function toAgentId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function getFileRoot(rootId) {
  if (!FILE_ROOTS.length) return null;
  if (!rootId) return FILE_ROOTS[0];
  return FILE_ROOTS.find((root) => root.id === rootId) || null;
}

function normalizeRelativePath(inputPath) {
  const raw = (inputPath || ".").trim();
  return raw === "" ? "." : raw;
}

function hasHiddenSegment(relativePath) {
  return normalizeRelativePath(relativePath)
    .split(/[\\/]/)
    .filter(Boolean)
    .some((segment) => segment.startsWith("."));
}

function toUnixPath(inputPath) {
  return inputPath.split(path.sep).join("/");
}

function toRelativePath(rootPath, absolutePath) {
  const relative = path.relative(rootPath, absolutePath);
  if (!relative) return ".";
  return toUnixPath(relative);
}

function resolveSafePath(rootPath, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const absolutePath = path.resolve(rootPath, normalized);
  const safePrefix = rootPath.endsWith(path.sep) ? rootPath : `${rootPath}${path.sep}`;
  if (absolutePath !== rootPath && !absolutePath.startsWith(safePrefix)) {
    throw new Error("Path escapes allowed root");
  }
  return absolutePath;
}

function isProbablyBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  if (!sample.length) return false;
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 7 || (byte > 14 && byte < 32)) suspicious++;
  }
  return suspicious / sample.length > 0.12;
}

function readFileChunk(filePath, maxBytes) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

// --- Route Handlers ---

function handleGetConfig(req, res) {
  const mcConfigPath = path.join(MC_SHARED_DIR, "mc-config.json");
  try {
    const data = fs.readFileSync(mcConfigPath, "utf-8");
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(data);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Config not found" }));
  }
}

function handleGetAgents(req, res) {
  const config = readConfig();
  if (!config) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to read config" }));
    return;
  }

  const agents = (config.agents?.list || []).map((a) => ({
    id: a.id,
    name: a.name || a.id,
    workspace: a.workspace,
    heartbeat: a.heartbeat,
    isDefault: a.default || false,
  }));

  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify({ agents }));
}

function handleCreateAgent(req, res) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    try {
      const { name, role, description, avatar } = JSON.parse(body);

      if (!name || !role) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "name and role are required" }));
        return;
      }

      const agentId = toAgentId(name);
      const workspaceDir = `/data/openclaw-${agentId}`;

      // 1. Read current config
      const config = readConfig();
      if (!config) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to read config" }));
        return;
      }

      // 2. Check if agent already exists
      const existing = config.agents?.list?.find((a) => a.id === agentId);
      if (existing) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: `Agent '${agentId}' already exists` })
        );
        return;
      }

      // 3. Add agent to config
      if (!config.agents) config.agents = { list: [] };
      if (!config.agents.list) config.agents.list = [];

      config.agents.list.push({
        id: agentId,
        name: name,
        workspace: workspaceDir,
        heartbeat: { every: "15m" },
      });

      // 4. Write updated config (triggers OpenClaw hot-reload)
      writeConfig(config);

      // 5. Create workspace directory
      fs.mkdirSync(workspaceDir, { recursive: true });
      fs.mkdirSync(path.join(workspaceDir, "memory"), { recursive: true });

      // 6. Generate SOUL.md, HEARTBEAT.md, AGENTS.md
      const desc = description || `You are ${name}, a specialist in ${role}.`;
      fs.writeFileSync(
        path.join(workspaceDir, "SOUL.md"),
        generateSoulMd(name, role, desc)
      );
      fs.writeFileSync(
        path.join(workspaceDir, "HEARTBEAT.md"),
        generateHeartbeatMd(agentId)
      );
      fs.writeFileSync(
        path.join(workspaceDir, "AGENTS.md"),
        generateAgentsMd(name)
      );

      // 7. Create session directory
      const sessionDir = path.join(STATE_DIR, "agents", agentId, "sessions");
      fs.mkdirSync(sessionDir, { recursive: true });

      // 8. Update mc-config.json
      const agentIds = config.agents.list.map((a) => a.id);
      updateMcConfig(agentIds);

      // 9. Register in Convex (if available)
      if (CONVEX_URL) {
        try {
          const args = JSON.stringify({
            agentId,
            name,
            role,
            description: desc,
            heartbeatInterval: 900000,
            avatar: avatar || undefined,
          });
          execSync(
            `npx convex run agents:register --args '${args}' 2>/dev/null`,
            { timeout: 15000 }
          );
        } catch (e) {
          console.warn("Convex registration failed (non-fatal):", e.message);
        }
      }

      console.log(`Agent created: ${agentId} (${name})`);

      res.writeHead(201, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(
        JSON.stringify({
          success: true,
          agentId,
          name,
          role,
          workspace: workspaceDir,
        })
      );
    } catch (e) {
      console.error("Create agent error:", e);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

function handleFilesRoots(_req, res) {
  const roots = FILE_ROOTS.map((root) => ({
    id: root.id,
    name: root.name,
    path: root.path,
    readOnly: true,
  }));
  sendJson(res, 200, { roots });
}

function handleFilesList(req, res, url) {
  try {
    const root = getFileRoot(url.searchParams.get("root"));
    if (!root) {
      return sendJson(res, 404, { error: "No file roots available" });
    }

    const requestedPath = normalizeRelativePath(url.searchParams.get("path") || ".");
    if (!SHOW_HIDDEN_FILES && requestedPath !== "." && hasHiddenSegment(requestedPath)) {
      return sendJson(res, 403, { error: "Access to hidden paths is disabled" });
    }
    const absolutePath = resolveSafePath(root.path, requestedPath);
    const stat = fs.statSync(absolutePath);

    if (!stat.isDirectory()) {
      return sendJson(res, 400, { error: "Target path is not a directory" });
    }

    const entries = fs
      .readdirSync(absolutePath, { withFileTypes: true })
      .filter((entry) => SHOW_HIDDEN_FILES || !entry.name.startsWith("."))
      .map((entry) => {
        const entryPath = path.join(absolutePath, entry.name);
        let entryStat = null;
        try {
          entryStat = fs.statSync(entryPath);
        } catch (_e) {
          // Ignore broken symlinks or permission-denied entries.
        }
        const kind = entry.isDirectory()
          ? "directory"
          : entry.isFile()
          ? "file"
          : "other";
        return {
          name: entry.name,
          kind,
          path: toRelativePath(root.path, entryPath),
          size: entryStat?.size ?? 0,
          modifiedAt: entryStat?.mtimeMs ?? 0,
        };
      })
      .sort((a, b) => {
        if (a.kind !== b.kind) {
          if (a.kind === "directory") return -1;
          if (b.kind === "directory") return 1;
        }
        return a.name.localeCompare(b.name);
      });

    const currentPath = toRelativePath(root.path, absolutePath);
    const parentPath =
      currentPath === "."
        ? null
        : toRelativePath(root.path, path.resolve(absolutePath, ".."));

    sendJson(res, 200, {
      root: { id: root.id, name: root.name },
      currentPath,
      parentPath,
      entries,
    });
  } catch (e) {
    sendJson(res, 400, { error: e.message || "Failed to list directory" });
  }
}

function handleFilesRead(req, res, url) {
  try {
    const root = getFileRoot(url.searchParams.get("root"));
    if (!root) {
      return sendJson(res, 404, { error: "No file roots available" });
    }

    const requestedPath = normalizeRelativePath(url.searchParams.get("path") || ".");
    if (!SHOW_HIDDEN_FILES && hasHiddenSegment(requestedPath)) {
      return sendJson(res, 403, { error: "Access to hidden paths is disabled" });
    }
    const absolutePath = resolveSafePath(root.path, requestedPath);
    const stat = fs.statSync(absolutePath);

    if (!stat.isFile()) {
      return sendJson(res, 400, { error: "Target path is not a file" });
    }

    const requestedMaxBytes = Number.parseInt(
      url.searchParams.get("maxBytes") || "262144",
      10
    );
    const maxBytes = Number.isFinite(requestedMaxBytes)
      ? Math.min(Math.max(requestedMaxBytes, 1024), 2 * 1024 * 1024)
      : 262144;

    const chunk = readFileChunk(absolutePath, Math.min(maxBytes, stat.size || maxBytes));
    const binary = isProbablyBinary(chunk);

    if (binary) {
      return sendJson(res, 200, {
        root: { id: root.id, name: root.name },
        path: toRelativePath(root.path, absolutePath),
        size: stat.size,
        modifiedAt: stat.mtimeMs,
        binary: true,
        truncated: stat.size > chunk.length,
      });
    }

    return sendJson(res, 200, {
      root: { id: root.id, name: root.name },
      path: toRelativePath(root.path, absolutePath),
      size: stat.size,
      modifiedAt: stat.mtimeMs,
      binary: false,
      truncated: stat.size > chunk.length,
      content: chunk.toString("utf-8"),
    });
  } catch (e) {
    sendJson(res, 400, { error: e.message || "Failed to read file" });
  }
}

function handleFilesDownload(req, res, url) {
  try {
    const root = getFileRoot(url.searchParams.get("root"));
    if (!root) {
      return sendJson(res, 404, { error: "No file roots available" });
    }

    const requestedPath = normalizeRelativePath(url.searchParams.get("path") || ".");
    if (!SHOW_HIDDEN_FILES && hasHiddenSegment(requestedPath)) {
      return sendJson(res, 403, { error: "Access to hidden paths is disabled" });
    }
    const absolutePath = resolveSafePath(root.path, requestedPath);
    const stat = fs.statSync(absolutePath);

    if (!stat.isFile()) {
      return sendJson(res, 400, { error: "Target path is not a file" });
    }

    const filename = path.basename(absolutePath);
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/octet-stream",
      "Content-Length": stat.size,
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    });

    fs.createReadStream(absolutePath).pipe(res);
  } catch (e) {
    sendJson(res, 400, { error: e.message || "Failed to download file" });
  }
}

// --- Server ---

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/config") {
    return handleGetConfig(req, res);
  }

  if (req.method === "GET" && url.pathname === "/agents") {
    return handleGetAgents(req, res);
  }

  if (req.method === "POST" && url.pathname === "/agents/create") {
    return handleCreateAgent(req, res);
  }

  if (req.method === "GET" && url.pathname === "/files/roots") {
    return handleFilesRoots(req, res);
  }

  if (req.method === "GET" && url.pathname === "/files/list") {
    return handleFilesList(req, res, url);
  }

  if (req.method === "GET" && url.pathname === "/files/read") {
    return handleFilesRead(req, res, url);
  }

  if (req.method === "GET" && url.pathname === "/files/download") {
    return handleFilesDownload(req, res, url);
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Mission Control sidecar API listening on port ${PORT}`);
});
