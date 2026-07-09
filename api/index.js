"use strict";

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const db = require("./db");

const app = express();

// ── Config from env ─────────────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "cambia-esto-por-un-token-largo";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const JWT_EXPIRES = "30d";

// ── RSA key pair (persisted in DB) ─────────────────────────────────
let keyPair = null;

async function loadKeyPair() {
  if (keyPair) return keyPair;
  // Try to load from DB first
  try {
    const stored = await db.getConfig("rsa_keypair");
    if (stored) {
      const raw = JSON.parse(stored);
      keyPair = {
        privateKey: await crypto.webcrypto.subtle.importKey("jwk", raw.privateJwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]),
        publicKey: await crypto.webcrypto.subtle.importKey("jwk", raw.publicJwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["verify"]),
        publicJwk: raw.publicJwk, privateJwk: raw.privateJwk,
      };
      return keyPair;
    }
  } catch (e) { /* table may not exist yet */ }
  // Generate new pair and persist
  const kp = await crypto.webcrypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"]
  );
  const privateJwk = await crypto.webcrypto.subtle.exportKey("jwk", kp.privateKey);
  const publicJwk = await crypto.webcrypto.subtle.exportKey("jwk", kp.publicKey);
  const jwks = JSON.stringify({ privateJwk, publicJwk });
  try { await db.setConfig("rsa_keypair", jwks); } catch (e) { /* persist best-effort */ }
  keyPair = {
    privateKey: await crypto.webcrypto.subtle.importKey("jwk", privateJwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]),
    publicKey: await crypto.webcrypto.subtle.importKey("jwk", publicJwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["verify"]),
    publicJwk, privateJwk,
  };
  return keyPair;
}

// ── Password hashing ────────────────────────────────────────────────
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

// ── Crypto helpers ──────────────────────────────────────────────────
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
  const sig = await crypto.webcrypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, keyPair.privateKey, data);
  const licenseObj = { p: payload, s: bytesToB64url(sig) };
  return Buffer.from(new TextEncoder().encode(JSON.stringify(licenseObj))).toString("base64url");
}

async function verifyLicenseRaw(licenseKey) {
  try {
    if (!licenseKey) return { ok: false, error: "Clave vacía" };
    await loadKeyPair();
    const bin = Buffer.from(licenseKey.trim(), "base64url").toString("binary");
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    if (!json.p || !json.s) return { ok: false, error: "Formato inválido" };
    const sig = b64urlToBytes(json.s);
    const valid = await crypto.webcrypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, keyPair.publicKey, sig, new TextEncoder().encode(JSON.stringify(json.p)));
    if (!valid) return { ok: false, error: "Firma inválida" };
    const now = new Date(), start = new Date(json.p.startDate), end = new Date(json.p.endDate);
    if (now < start) return { ok: false, error: "Aún no vigente (inicio " + start.toISOString().slice(0, 10) + ")", payload: json.p };
    if (now > end) return { ok: false, error: "Expirada el " + end.toISOString().slice(0, 10), payload: json.p, expired: true };
    return { ok: true, payload: json.p, daysLeft: Math.ceil((end - now) / 86400000) };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}

// ── Auth middleware ─────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "No autorizado" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (e) {}
  if (token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: "Token inválido" });
}

// ── Middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map(s => s.trim()) }));

// Serve admin static files
const adminDir = path.join(__dirname, "..", "public", "admin");
app.use("/admin", express.static(adminDir));
app.get("/admin", function (req, res) { res.redirect("/admin/admin.html"); });

// ── Public endpoints ────────────────────────────────────────────────
app.get("/api/health", function (req, res) { res.json({ ok: true, t: Date.now() }); });

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
    let license = await db.findLicenseByPayload(payload.email, payload.whatsapp, payload.startDate, payload.endDate);
    if (!license) license = await db.findRevokedByEmail(payload.email);
    if (!license) return res.status(404).json({ ok: false, error: "Esta clave no fue emitida por el administrador. Solicita una en wa.me/573218101385" });
    if (license.revoked) return res.status(403).json({ ok: false, error: "Licencia revocada por el administrador" });
    await db.updateLicenseActivation(license.id, req.headers["x-forwarded-for"] || req.socket.remoteAddress || null);
    res.json({ ok: true, payload, daysLeft: verifyRes.daysLeft, licenseId: license.id, revoked: false });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.post("/api/license/check", async function (req, res) {
  try {
    const licenseKey = (req.body && req.body.license) || "";
    const payload = req.body && req.body.payload;
    const licenseId = req.body && req.body.licenseId;
    const verifyRes = await verifyLicenseRaw(licenseKey);
    if (!verifyRes.ok) return res.status(400).json({ ok: false, error: verifyRes.error, expired: !!verifyRes.expired });
    let license = null;
    if (licenseId) license = await db.findLicenseById(licenseId);
    if (!license) {
      const p = payload || verifyRes.payload;
      license = await db.findLicenseByPayload(p.email, p.whatsapp, p.startDate, p.endDate);
    }
    if (!license) license = await db.findRevokedByEmail(verifyRes.payload.email);
    if (!license) return res.status(404).json({ ok: false, error: "Licencia no registrada en el servidor" });
    if (license.revoked) { console.log("[CHECK] License " + license.id + " is REVOKED"); return res.status(403).json({ ok: false, error: "Licencia revocada", revoked: true }); }
    console.log("[CHECK] License " + license.id + " is active, expired=" + (new Date() > license.end_date));
    res.json({ ok: true, payload: verifyRes.payload, daysLeft: verifyRes.daysLeft, licenseId: license.id, revoked: false });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

// ── Auth endpoints ──────────────────────────────────────────────────
app.post("/admin/auth/signup", async function (req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, error: "Usuario y contraseña requeridos" });
    if (username.length < 3) return res.status(400).json({ ok: false, error: "Usuario mínimo 3 caracteres" });
    if (password.length < 6) return res.status(400).json({ ok: false, error: "Contraseña mínimo 6 caracteres" });
    const existing = await db.findUserByUsername(username.trim());
    if (existing) return res.status(409).json({ ok: false, error: "Ese usuario ya existe" });
    const user = { id: nanoid(12), username: username.trim(), passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
    await db.createUser(user.id, user.username, user.passwordHash);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ ok: true, token, user: { id: user.id, username: user.username } });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.post("/admin/auth/login", async function (req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, error: "Usuario y contraseña requeridos" });
    const user = await db.findUserByUsername(username.trim());
    if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ ok: false, error: "Usuario o contraseña incorrectos" });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ ok: true, token, user: { id: user.id, username: user.username } });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.get("/admin/auth/me", adminAuth, async function (req, res) {
  res.json({ ok: true, user: req.user });
});

app.get("/admin/auth/has-users", async function (req, res) {
  const count = await db.countUsers();
  res.json({ hasUsers: count > 0 });
});

// ── Admin endpoints ─────────────────────────────────────────────────
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
    const existing = await db.findLicenseByPayload(email, wa, startDateIso, endDateIso);
    if (existing) {
      await db.reissueLicense(existing.id, startDateIso, endDateIso, licenseKey);
      return res.json({ ok: true, license: licenseKey, licenseId: existing.id, payload: { email, whatsapp: wa, startDate: startDateIso, endDate: endDateIso } });
    }
    const id = nanoid(12);
    await db.createLicense(id, email, wa, startDateIso, endDateIso, licenseKey, null);
    res.json({ ok: true, license: licenseKey, licenseId: id, payload: { email, whatsapp: wa, startDate: startDateIso, endDate: endDateIso } });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.get("/admin/licenses", adminAuth, async function (req, res) {
  try {
    const list = await db.getAllLicenses();
    const mapped = list.map(function (l) {
      const end = new Date(l.end_date);
      return {
        id: l.id, email: l.email, whatsapp: l.whatsapp,
        startDate: l.start_date, endDate: l.end_date,
        issuedAt: l.issued_at, revoked: l.revoked,
        activations: l.activations, lastActivatedAt: l.last_activated_at,
        lastIp: l.last_ip, licenseKey: l.license_key || l.license_prefix,
        expired: new Date() > end, daysLeft: Math.ceil((end - new Date()) / 86400000),
      };
    });
    res.json({ ok: true, licenses: mapped });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.post("/admin/license/:id/revoke", adminAuth, async function (req, res) {
  try {
    const lic = await db.findLicenseById(req.params.id);
    if (!lic) return res.status(404).json({ ok: false, error: "Licencia no encontrada" });
    await db.setLicenseRevoked(req.params.id, true);
    res.json({ ok: true, licenseId: req.params.id, revoked: true });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.post("/admin/license/:id/restore", adminAuth, async function (req, res) {
  try {
    const lic = await db.findLicenseById(req.params.id);
    if (!lic) return res.status(404).json({ ok: false, error: "Licencia no encontrada" });
    await db.setLicenseRevoked(req.params.id, false);
    res.json({ ok: true, licenseId: req.params.id, revoked: false });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.post("/admin/license/:id/reissue", adminAuth, async function (req, res) {
  try {
    const lic = await db.findLicenseById(req.params.id);
    if (!lic) return res.status(404).json({ ok: false, error: "Licencia no encontrada" });
    const { startDate, endDate } = req.body || {};
    if (!startDate || !endDate) return res.status(400).json({ ok: false, error: "Faltan startDate o endDate" });
    const startDateIso = new Date(startDate + "T00:00:00.000Z").toISOString();
    const endDateIso = new Date(endDate + "T23:59:59.999Z").toISOString();
    if (new Date(endDateIso) < new Date(startDateIso)) return res.status(400).json({ ok: false, error: "endDate debe ser posterior a startDate" });
    await loadKeyPair();
    const licenseKey = await buildSignedLicense(lic.email, lic.whatsapp, startDateIso, endDateIso);
    await db.reissueLicense(req.params.id, startDateIso, endDateIso, licenseKey);
    res.json({ ok: true, license: licenseKey, licenseId: req.params.id, payload: { email: lic.email, whatsapp: lic.whatsapp, startDate: startDateIso, endDate: endDateIso } });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

app.delete("/admin/license/:id", adminAuth, async function (req, res) {
  try {
    await db.deleteLicense(req.params.id);
    res.json({ ok: true, deleted: 1 });
  } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
});

// ── Startup migration ────────────────────────────────────────────────
(async function () {
  try { await db.query("ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_key TEXT"); } catch (e) { /* table may not exist yet */ }
})();

// ── 404 handler ──────────────────────────────────────────────────────
app.use(function (req, res) { res.status(404).json({ error: "Endpoint no encontrado: " + req.method + " " + req.path }); });
app.use(function (err, req, res, next) { console.error("[ERR]", err); res.status(500).json({ error: "Error interno del servidor" }); });

// ── Warm up key pair on first request ───────────────────────────────
app.use(async function (req, res, next) {
  if (!keyPair) { try { await loadKeyPair(); } catch (e) { console.error("[WARM]", e); } }
  next();
});

module.exports = app;
