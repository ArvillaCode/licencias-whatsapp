const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(sql, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}

// ── Users ──────────────────────────────────────────────────────────
async function findUserByUsername(username) {
  const res = await query("SELECT * FROM users WHERE username = $1", [username]);
  return res.rows[0] || null;
}

async function createUser(id, username, passwordHash) {
  await query(
    "INSERT INTO users (id, username, password_hash, created_at) VALUES ($1, $2, $3, NOW())",
    [id, username, passwordHash]
  );
}

async function countUsers() {
  const res = await query("SELECT COUNT(*)::int AS count FROM users");
  return res.rows[0].count;
}

// ── Licenses ───────────────────────────────────────────────────────
async function findRevokedByEmail(email) {
  const res = await query("SELECT * FROM licenses WHERE email = $1 AND revoked = TRUE LIMIT 1", [email]);
  return res.rows[0] || null;
}

async function findLicenseByPayload(email, whatsapp, startDate, endDate) {
  const res = await query(
    "SELECT * FROM licenses WHERE email = $1 AND whatsapp = $2 AND start_date = $3 AND end_date = $4 LIMIT 1",
    [email, whatsapp, startDate, endDate]
  );
  return res.rows[0] || null;
}

async function findLicenseById(id) {
  const res = await query("SELECT * FROM licenses WHERE id = $1 LIMIT 1", [id]);
  return res.rows[0] || null;
}

async function createLicense(id, email, whatsapp, startDate, endDate, fullKey, ip) {
  await query(
    `INSERT INTO licenses (id, email, whatsapp, start_date, end_date, issued_at, revoked, activations, last_ip, license_prefix, license_key)
     VALUES ($1, $2, $3, $4, $5, NOW(), FALSE, 0, $6, $7, $8)`,
    [id, email, whatsapp, startDate, endDate, ip, String(fullKey).slice(0, 16), fullKey]
  );
}

async function getAllLicenses() {
  const res = await query("SELECT * FROM licenses ORDER BY issued_at DESC");
  return res.rows;
}

async function updateLicenseActivation(id, ip) {
  await query(
    "UPDATE licenses SET activations = activations + 1, last_activated_at = NOW(), last_ip = $2 WHERE id = $1",
    [id, ip]
  );
}

async function setLicenseRevoked(id, revoked) {
  await query("UPDATE licenses SET revoked = $2 WHERE id = $1", [id, revoked]);
}

async function reissueLicense(id, startDate, endDate, fullKey) {
  await query(
    "UPDATE licenses SET start_date = $2, end_date = $3, issued_at = NOW(), license_prefix = $4, license_key = $5, revoked = FALSE WHERE id = $1",
    [id, startDate, endDate, String(fullKey).slice(0, 16), fullKey]
  );
}

async function deleteLicense(id) {
  await query("DELETE FROM licenses WHERE id = $1", [id]);
}

// ── App config (RSA keys, etc.) ────────────────────────────────────
async function getConfig(key) {
  const res = await query("SELECT value FROM app_config WHERE key = $1 LIMIT 1", [key]);
  return res.rows[0] ? res.rows[0].value : null;
}

async function setConfig(key, value) {
  await query(
    "INSERT INTO app_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
    [key, value]
  );
}

module.exports = {
  query,
  findUserByUsername,
  createUser,
  countUsers,
  findRevokedByEmail,
  findLicenseByPayload,
  findLicenseById,
  createLicense,
  getAllLicenses,
  updateLicenseActivation,
  setLicenseRevoked,
  reissueLicense,
  deleteLicense,
  getConfig,
  setConfig,
};
