"use strict";

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { JSONFilePreset } = require("lowdb/node");
const { nanoid } = require("nanoid");

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "cambia-esto-por-un-token-largo-y-aleatorio";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const JWT_EXPIRES = "30d";

// ── Data dir ────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const KEY_FILE = path.join(DATA_DIR, "private-key.json");

let db;
let keyPair = null;

// ── RSA key pair (auto-generated on first run) ──────────────────────────────
async function loadKeyPair() {
  if (keyPair) return keyPair;
  if (fs.existsSync(KEY_FILE)) {
    const raw = JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
    keyPair = {
      privateKey: await crypto.subtle.importKey("jwk", raw.privateJwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]),
      publicKey: await crypto.subtle.importKey("jwk", raw.publicJwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["verify"]),
      publicJwk: raw.publicJwk, privateJwk: raw.privateJwk
    };
    return keyPair;
  }
  const kp = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"]
  );
  const privateJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  fs.writeFileSync(KEY_FILE, JSON.stringify({ privateJwk, publicJwk }, null, 2));
  console.log("[KEY] Nuevo par RSA-2048 generado en", KEY_FILE);
  keyPair = {
    privateKey: await crypto.subtle.importKey("jwk", privateJwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]),
    publicKey: await crypto.subtle.importKey("jwk", publicJwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["verify"]),
    publicJwk, privateJwk
  };
  return keyPair;
}

// ── DB init ─────────────────────────────────────────────────────────────────
async function initDb() {
  const file = path.join(DATA_DIR, "db.json");
  db = await JSONFilePreset(file, { licenses: [], users: [] });
  db.data ||= { licenses: [], users: [] };
  await db.write();
}

// ── Password hashing (scrypt) ────────────────────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verify, "hex"));
}

// ── Crypto helpers (RSA license signing) ────────────────────────────────────
function bytesToB64url(arr) {
  let bin = "";
  const bytes = new Uint8Array(arr);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return Buffer.from(bin, "binary").toString("base64url");
}
function b64urlToBytes(s) {
  const bin = Buffer.from(s, "base64url").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function buildSignedLicense(email, wa, startDateIso, endDateIso) {
  const payload = { email: (email || "").trim(), whatsapp: (wa || "").trim(), startDate: startDateIso, endDate: endDateIso, issued: new Date().toISOString() };
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, keyPair.privateKey, data);
  const licenseObj = { p: payload, s: bytesToB64url(sig) };
  return Buffer.from(new TextEncoder().encode(JSON.stringify(licenseObj))).toString("base64url");
}

async function verifyLicenseRaw(licenseKey) {
  try {
    if (!licenseKey) return { ok: false, error: "Clave vacía" };
    const bin = Buffer.from(licenseKey.trim(), "base64url").toString("binary");
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    if (!json.p || !json.s) return { ok: false, error: "Formato inválido" };
    const sig = b64urlToBytes(json.s);
    const valid = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, keyPair.publicKey, sig, new TextEncoder().encode(JSON.stringify(json.p)));
    if (!valid) return { ok: false, error: "Firma inválida" };
    const now = new Date(), start = new Date(json.p.startDate), end = new Date(json.p.endDate);
    if (now < start) return { ok: false, error: "Aún no vigente (inicio " + start.toISOString().slice(0, 10) + ")", payload: json.p };
    if (now > end) return { ok: false, error: "Expirada el " + end.toISOString().slice(0, 10), payload: json.p, expired: true };
    return { ok: true, payload: json.p, daysLeft: Math.ceil((end - now) / 86400000) };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}

async function findLicenseByPayload(payload) {
  return (db.data.licenses || []).find(function (l) {
    return l.email === payload.email && l.whatsapp === payload.whatsapp &&
      l.startDate === payload.startDate && l.endDate === payload.endDate;
  });
}

// ── Auth: middleware that accepts JWT OR static ADMIN_TOKEN ─────────────────
function adminAuth(req, res, next) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "No autorizado" });
  // Try JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (e) {}
  // Fall back to static ADMIN_TOKEN
  if (token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: "Token inválido" });
}

// ── App ─────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map(function (s) { return s.trim(); }) }));

// Serve admin panel as static files
const adminDir = path.join(__dirname, "..", "admin");
app.use("/admin", express.static(adminDir));
app.get("/admin", function (req, res) { res.redirect("/admin/admin.html"); });

// ── Public endpoints (extension) ─────────────────────────────────────────────
app.get("/health", function (req, res) { res.json({ ok: true, t: Date.now() }); });

app.get("/api/pubkey", async function (req, res) {
  try { await loadKeyPair(); res.json({ jwk: keyPair.publicJwk }); }
  catch (e) { res.status(500).json({ error: "No se pudo cargar la clave pública" }); }
});

app.post("/api/license/activate", async function (req, res) {
  try {
    const licenseKey = (req.body && req.body.license) || "";
    const verifyRes = await verifyLicenseRaw(licenseKey);
    if (!verifyRes.ok) return res.status(400).json({ ok: false, error: verifyRes.error, expired: !!verifyRes.expired });
    const payload = verifyRes.payload;
    let license = await findLicenseByPayload(payload);
    if (!license) {
      license = {
        id: nanoid(12), email: payload.email, whatsapp: payload.whatsapp,
        startDate: payload.startDate, endDate: payload.endDate, issuedAt: new Date().toISOString(),
        revoked: false, activations: 0, lastActivatedAt: null,
        lastIp: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
        licensePrefix: String(licenseKey).slice(0, 16)
      };
      db.data.licenses.push(license);
    }
    if (license.revoked) return res.status(403).json({ ok: false, error: "Licencia revocada por el administrador" });
    license.activations = (license.activations || 0) + 1;
    license.lastActivatedAt = new Date().toISOString();
    license.lastIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
    await db.write();
    res.json({ ok: true, payload: payload, daysLeft: verifyRes.daysLeft, licenseId: license.id, revoked: false });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.post("/api/license/check", async function (req, res) {
  try {
    const licenseKey = (req.body && req.body.license) || "";
    const payload = req.body && req.body.payload;
    const verifyRes = await verifyLicenseRaw(licenseKey);
    if (!verifyRes.ok) return res.status(400).json({ ok: false, error: verifyRes.error, expired: !!verifyRes.expired });
    const license = await findLicenseByPayload(payload || verifyRes.payload);
    if (!license) return res.status(404).json({ ok: false, error: "Licencia no registrada en el servidor" });
    if (license.revoked) return res.status(403).json({ ok: false, error: "Licencia revocada", revoked: true });
    res.json({ ok: true, payload: verifyRes.payload, daysLeft: verifyRes.daysLeft, licenseId: license.id, revoked: false });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

// ── Auth endpoints (signup / login / me) ─────────────────────────────────────
app.post("/admin/auth/signup", async function (req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, error: "Usuario y contraseña requeridos" });
    if (username.length < 3) return res.status(400).json({ ok: false, error: "Usuario mínimo 3 caracteres" });
    if (password.length < 6) return res.status(400).json({ ok: false, error: "Contraseña mínimo 6 caracteres" });
    // Optional: restrict signup to first user only (uncomment below to enable)
    // if ((db.data.users || []).length > 0) return res.status(403).json({ ok: false, error: "Registro cerrado. Contacta al administrador." });
    const existing = (db.data.users || []).find(function (u) { return u.username === username.trim(); });
    if (existing) return res.status(409).json({ ok: false, error: "Ese usuario ya existe" });
    const user = { id: nanoid(12), username: username.trim(), passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
    db.data.users = db.data.users || [];
    db.data.users.push(user);
    await db.write();
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ ok: true, token: token, user: { id: user.id, username: user.username } });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.post("/admin/auth/login", async function (req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, error: "Usuario y contraseña requeridos" });
    const user = (db.data.users || []).find(function (u) { return u.username === username.trim(); });
    if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ ok: false, error: "Usuario o contraseña incorrectos" });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ ok: true, token: token, user: { id: user.id, username: user.username } });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.get("/admin/auth/me", adminAuth, async function (req, res) {
  res.json({ ok: true, user: req.user });
});

app.get("/admin/auth/has-users", async function (req, res) {
  res.json({ hasUsers: (db.data.users || []).length > 0 });
});

// ── Admin endpoints (license management) ─────────────────────────────────────
app.post("/admin/license/issue", adminAuth, async function (req, res) {
  try {
    const email = (req.body && req.body.email) || "";
    const wa = (req.body && req.body.whatsapp) || "";
    const startStr = (req.body && req.body.startDate) || new Date().toISOString().slice(0, 10);
    const endStr = (req.body && req.body.endDate) || "";
    if (!email || !wa || !endStr) return res.status(400).json({ ok: false, error: "Faltan email, whatsapp o endDate" });
    const startDateIso = new Date(startStr + "T00:00:00.000Z").toISOString();
    const endDateIso = new Date(endStr + "T23:59:59.999Z").toISOString();
    if (new Date(endDateIso) < new Date(startDateIso)) return res.status(400).json({ ok: false, error: "endDate debe ser posterior a startDate" });
    await loadKeyPair();
    const licenseKey = await buildSignedLicense(email, wa, startDateIso, endDateIso);
    const existing = await findLicenseByPayload({ email: email, whatsapp: wa, startDate: startDateIso, endDate: endDateIso });
    if (existing) {
      existing.revoked = false; existing.issuedAt = new Date().toISOString();
      await db.write();
      return res.json({ ok: true, license: licenseKey, licenseId: existing.id, payload: { email: email, whatsapp: wa, startDate: startDateIso, endDate: endDateIso } });
    }
    const record = {
      id: nanoid(12), email: email, whatsapp: wa,
      startDate: startDateIso, endDate: endDateIso, issuedAt: new Date().toISOString(),
      revoked: false, activations: 0, lastActivatedAt: null, licensePrefix: String(licenseKey).slice(0, 16)
    };
    db.data.licenses.push(record);
    await db.write();
    res.json({ ok: true, license: licenseKey, licenseId: record.id, payload: { email: email, whatsapp: wa, startDate: startDateIso, endDate: endDateIso } });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.get("/admin/licenses", adminAuth, async function (req, res) {
  try {
    const list = (db.data.licenses || []).map(function (l) {
      const end = new Date(l.endDate);
      return Object.assign({}, l, { expired: new Date() > end, daysLeft: Math.ceil((end - new Date()) / 86400000) });
    });
    list.sort(function (a, b) { return new Date(b.issuedAt) - new Date(a.issuedAt); });
    res.json({ ok: true, licenses: list });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.post("/admin/license/:id/revoke", adminAuth, async function (req, res) {
  try {
    const lic = (db.data.licenses || []).find(function (l) { return l.id === req.params.id; });
    if (!lic) return res.status(404).json({ ok: false, error: "Licencia no encontrada" });
    lic.revoked = true; await db.write();
    res.json({ ok: true, licenseId: req.params.id, revoked: true });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.post("/admin/license/:id/restore", adminAuth, async function (req, res) {
  try {
    const lic = (db.data.licenses || []).find(function (l) { return l.id === req.params.id; });
    if (!lic) return res.status(404).json({ ok: false, error: "Licencia no encontrada" });
    lic.revoked = false; await db.write();
    res.json({ ok: true, licenseId: req.params.id, revoked: false });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.delete("/admin/license/:id", adminAuth, async function (req, res) {
  try {
    const before = db.data.licenses.length;
    db.data.licenses = db.data.licenses.filter(function (l) { return l.id !== req.params.id; });
    await db.write();
    res.json({ ok: true, deleted: before - db.data.licenses.length });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.post("/admin/license/:id/reissue", adminAuth, async function (req, res) {
  try {
    const lic = (db.data.licenses || []).find(function (l) { return l.id === req.params.id; });
    if (!lic) return res.status(404).json({ ok: false, error: "Licencia no encontrada" });
    const { startDate, endDate } = req.body || {};
    if (!startDate || !endDate) return res.status(400).json({ ok: false, error: "Faltan startDate o endDate" });
    const startDateIso = new Date(startDate + "T00:00:00.000Z").toISOString();
    const endDateIso = new Date(endDate + "T23:59:59.999Z").toISOString();
    if (new Date(endDateIso) < new Date(startDateIso)) return res.status(400).json({ ok: false, error: "endDate debe ser posterior a startDate" });
    await loadKeyPair();
    const licenseKey = await buildSignedLicense(lic.email, lic.whatsapp, startDateIso, endDateIso);
    lic.startDate = startDateIso;
    lic.endDate = endDateIso;
    lic.issuedAt = new Date().toISOString();
    lic.licensePrefix = String(licenseKey).slice(0, 16);
    lic.revoked = false;
    await db.write();
    res.json({ ok: true, license: licenseKey, licenseId: lic.id, payload: { email: lic.email, whatsapp: lic.whatsapp, startDate: startDateIso, endDate: endDateIso } });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

// ── 404 + error handler ──────────────────────────────────────────────────────
app.use(function (req, res) { res.status(404).json({ error: "Endpoint no encontrado: " + req.method + " " + req.path }); });
app.use(function (err, req, res, next) { console.error("[ERR]", err); res.status(500).json({ error: "Error interno del servidor" }); });

// ── Start ───────────────────────────────────────────────────────────────────
(async function () {
  await loadKeyPair();
  await initDb();
  app.listen(PORT, function () {
    console.log("============================================================");
    console.log("  Upfunnel Contact Extract — Backend de licencias");
    console.log("  Escuchando en http://localhost:" + PORT);
    console.log("  Panel admin: http://localhost:" + PORT + "/admin");
    console.log("  Admin token: " + (ADMIN_TOKEN.startsWith("cambia-esto") ? "[NO CONFIGURADO]" : "[OK]"));
    console.log("  JWT secret: " + (JWT_SECRET.length > 10 ? "[OK]" : "[GENERADO]"));
    console.log("  Usuarios registrados: " + (db.data.users || []).length);
    console.log("============================================================");
  });
})();