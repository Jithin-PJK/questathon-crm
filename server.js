require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const MCP_URL = "https://questathon.aihackerscollective.com/api/public/mcp";
const EXPORT_URL = "https://questathon.aihackerscollective.com/api/public/v1/export";

const DATA_DIR = path.join(__dirname, "data");
const EXPORT_PATH = path.join(DATA_DIR, "questathon_export.json");
const SIGNALS_PATH = path.join(DATA_DIR, "signals.json");
const NOTES_PATH = path.join(DATA_DIR, "notes.json");
const FILES_DIR = path.join(DATA_DIR, "files");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });

let snapshot = null;
let lastMcpCall = 0;
let signals = [];
let notes = [];

// Load persisted signals and notes
try {
  if (fs.existsSync(SIGNALS_PATH)) {
    signals = JSON.parse(fs.readFileSync(SIGNALS_PATH, "utf8"));
  }
} catch (e) {
  console.warn("Could not read signals.json:", e.message);
}

try {
  if (fs.existsSync(NOTES_PATH)) {
    notes = JSON.parse(fs.readFileSync(NOTES_PATH, "utf8"));
  }
} catch (e) {
  console.warn("Could not read notes.json:", e.message);
}

function token() {
  const t = process.env.AQ_TOKEN;
  if (!t || t.includes("replace_with")) {
    throw new Error("AQ_TOKEN is not configured in server environment. Set AQ_TOKEN in .env");
  }
  return t;
}

function getMcpCooldown() {
  const elapsed = Date.now() - lastMcpCall;
  const remaining = 60000 - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

async function getExport() {
  if (snapshot) return snapshot;

  // 1. Check local file store first
  if (fs.existsSync(EXPORT_PATH)) {
    try {
      snapshot = JSON.parse(fs.readFileSync(EXPORT_PATH, "utf8"));
      return snapshot;
    } catch (e) {
      console.warn("Corrupt local export, refetching...", e.message);
    }
  }

  // 2. Fetch from remote server
  const r = await fetch(EXPORT_URL, {
    headers: { Authorization: `Bearer ${token()}` }
  });
  if (!r.ok) {
    throw new Error(`Export request failed (${r.status}). Check server token.`);
  }
  snapshot = await r.json();
  fs.writeFileSync(EXPORT_PATH, JSON.stringify(snapshot, null, 2), "utf8");
  return snapshot;
}

async function callTool(name, args = {}) {
  const wait = getMcpCooldown();
  if (wait > 0) {
    const e = new Error(`Questathon allows one MCP call per minute. Try again in ${wait}s.`);
    e.status = 429;
    e.retryAfter = wait;
    throw e;
  }

  lastMcpCall = Date.now();
  const r = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json, text/event-stream",
      "authorization": `Bearer ${token()}`
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name, arguments: args }
    })
  });

  const raw = await r.text();
  if (!r.ok) {
    throw new Error(`MCP request failed (${r.status}): ${raw.slice(0, 250)}`);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    const line = raw.split("\n").find(x => x.startsWith("data:"));
    if (!line) throw new Error("MCP returned an unreadable response.");
    payload = JSON.parse(line.slice(5).trim());
  }

  const result = payload.result;
  if (payload.error || result?.isError) {
    const errorText = payload.error?.message || result?.content?.[0]?.text || "MCP tool failed";
    // Parse retry_after if available
    let retryAfter = 60;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.retry_after_seconds) {
        retryAfter = parsed.retry_after_seconds;
        lastMcpCall = Date.now() - (60000 - (retryAfter * 1000));
      }
    } catch {}
    const err = new Error(errorText);
    err.status = 429;
    err.retryAfter = retryAfter;
    throw err;
  }

  const txt = result?.content?.find(x => x.type === "text")?.text;
  if (!txt) return result ?? payload;
  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

// API Routes
app.get("/api/dashboard", async (req, res) => {
  try {
    const data = await getExport();
    res.json({
      data,
      signals,
      notes,
      liveReady: true,
      worldClosed: !!data.world_closed,
      mcpCooldownRemaining: getMcpCooldown()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    mcpCooldownRemaining: getMcpCooldown(),
    totalSignals: signals.length,
    totalNotes: notes.length,
    tokenConfigured: !!process.env.AQ_TOKEN
  });
});

app.post("/api/refresh", async (req, res) => {
  try {
    const result = await callTool("get_signals", {});
    const incoming = Array.isArray(result) ? result : (result.signals || result.events || [result]);
    
    // Merge new signals without duplicates
    const existingIds = new Set(signals.map(s => s.id || JSON.stringify(s)));
    for (const item of incoming) {
      if (item && !existingIds.has(item.id || JSON.stringify(item))) {
        signals.unshift({ ...item, receivedAt: new Date().toISOString() });
      }
    }
    fs.writeFileSync(SIGNALS_PATH, JSON.stringify(signals, null, 2), "utf8");
    res.json({ ok: true, signals, lastSignalPoll: Date.now() });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, retryAfter: e.retryAfter });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const { text, account, kind = "note", title = "" } = req.body || {};
    if (!text || !account) {
      return res.status(400).json({ error: "Note text and account ('A' or 'B') are required." });
    }
    const result = await callTool("write_note", { text, account, kind, title });
    const noteEntry = {
      id: "note_" + Date.now(),
      text,
      account,
      kind,
      title,
      result,
      createdAt: new Date().toISOString()
    };
    notes.unshift(noteEntry);
    fs.writeFileSync(NOTES_PATH, JSON.stringify(notes, null, 2), "utf8");
    res.json({ ok: true, note: noteEntry, notes });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, retryAfter: e.retryAfter });
  }
});

app.get("/api/file/:id", async (req, res) => {
  const { id } = req.params;
  const filePath = path.join(FILES_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    return res.json({ ok: true, cached: true, content: JSON.parse(fs.readFileSync(filePath, "utf8")) });
  }
  try {
    const result = await callTool("get_file", { id });
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf8");
    res.json({ ok: true, cached: false, content: result });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, retryAfter: e.retryAfter });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { accessId, accessKey } = req.body || {};
  const cleanId = String(accessId || "").trim().toUpperCase();
  const cleanKey = String(accessKey || "").trim().toUpperCase().replace(/\s+/g, "");

  // Authorized credentials
  const validId = "CSM-0168";
  const validKey = "XYPW-B67B-393G";

  const keyMatch = cleanKey === validKey || cleanKey.replace(/-/g, "") === validKey.replace(/-/g, "");

  if (cleanId === validId && keyMatch) {
    return res.json({
      ok: true,
      accessId: validId,
      role: "Lead Customer Success Manager",
      authenticated: true,
      sessionToken: "csm_session_" + Date.now()
    });
  }

  res.status(401).json({
    ok: false,
    error: "Invalid Access ID or Access Key. Please check the credentials provided."
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    tokenConfigured: !!process.env.AQ_TOKEN,
    nodeEnv: process.env.NODE_ENV || "development"
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Questathon Customer Success CRM running on http://localhost:${port}`));
