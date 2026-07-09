(function () {
  "use strict";

  const LIC_KEY = "ce_active_license";
  const PUBKEY_CACHE_KEY = "ce_pubkey_cache";
  const LAST_CHECK_KEY = "ce_last_backend_check";
  const CHECK_INTERVAL_MS = 60 * 60 * 1000;

  function cfg() {
    return (typeof window !== "undefined" && window.__CE_CONFIG) ? window.__CE_CONFIG : { BACKEND_URL: "" };
  }
  function backendUrl() { return (cfg().BACKEND_URL || "https://dashboard-licence.upfunnel.click").replace(/\/$/, ""); }
  function backendEnabled() { return !!backendUrl(); }

  function b64urlToBytes(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function getPubKeyJwk() {
    if (window.__CE_PUB_KEY_JWK && window.__CE_PUB_KEY_JWK.n) return window.__CE_PUB_KEY_JWK;
    return await new Promise(function (resolve) {
      chrome.storage.local.get(PUBKEY_CACHE_KEY, function (o) {
        resolve(o && o[PUBKEY_CACHE_KEY] ? o[PUBKEY_CACHE_KEY] : null);
      });
    });
  }

  async function importPubKey() {
    const jwk = await getPubKeyJwk();
    if (!jwk || !jwk.n) return null;
    try {
      return await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    } catch (e) { return null; }
  }

  async function fetchAndCachePubKey() {
    if (!backendEnabled()) return null;
    try {
      const res = await fetch(backendUrl() + "/api/pubkey", { method: "GET" });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.jwk || !data.jwk.n) return null;
      await new Promise(function (r) { chrome.storage.local.set({ [PUBKEY_CACHE_KEY]: data.jwk }, r); });
      return data.jwk;
    } catch (e) { return null; }
  }

  async function verifyLicenseRaw(licenseKey) {
    try {
      let pubJwk = await getPubKeyJwk();
      if ((!pubJwk || !pubJwk.n) && backendEnabled()) pubJwk = await fetchAndCachePubKey();
      if (!pubJwk || !pubJwk.n) return { ok: false, error: "No hay clave pública. Configura el backend en popup/config.js o pega la clave pública en popup/public-key.js." };
      if (!licenseKey || !licenseKey.trim()) return { ok: false, error: "Clave vacía" };
      let b64 = licenseKey.trim().replace(/\s+/g, "");
      b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const bin = atob(b64);
      const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
      if (!json.p || !json.s) return { ok: false, error: "Formato inválido" };
      const payloadStr = JSON.stringify(json.p);
      const data = new TextEncoder().encode(payloadStr);
      const sig = b64urlToBytes(json.s);
      const pub = await crypto.subtle.importKey("jwk", pubJwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
      const valid = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, pub, sig, data);
      if (!valid) return { ok: false, error: "Firma inválida. <a href='https://wa.me/573218101385?text=Hola%20Gabriel%20mi%20clave%20no%20funciona' target='_blank'>Solicita una nueva clave aquí</a>" };
      const now = new Date();
      const start = new Date(json.p.startDate);
      const end = new Date(json.p.endDate);
      if (now < start) return { ok: false, error: "Aún no vigente (inicio " + start.toISOString().slice(0, 10) + ")", payload: json.p };
      if (now > end) return { ok: false, error: "Expirada el " + end.toISOString().slice(0, 10), payload: json.p, expired: true };
      const daysLeft = Math.ceil((end - now) / 86400000);
      return { ok: true, payload: json.p, daysLeft: daysLeft };
    } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  }

  function getStoredLicense() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(LIC_KEY, function (obj) { resolve(obj && obj[LIC_KEY] ? obj[LIC_KEY] : null); });
    });
  }
  function setStoredLicense(lic) {
    return new Promise(function (resolve) {
      chrome.storage.local.set({ [LIC_KEY]: lic }, function () { resolve(); });
    });
  }
  function clearStoredLicense() {
    return new Promise(function (resolve) { chrome.storage.local.remove(LIC_KEY, function () { resolve(); }); });
  }
  function getLastCheck() {
    return new Promise(function (resolve) { chrome.storage.local.get(LAST_CHECK_KEY, function (o) { resolve(o && o[LAST_CHECK_KEY] ? o[LAST_CHECK_KEY] : 0); }); });
  }
  function setLastCheck(ts) {
    return new Promise(function (r) { chrome.storage.local.set({ [LAST_CHECK_KEY]: ts }, r); });
  }

  async function activateLicenseBackend(licenseKey) {
    if (!backendEnabled()) return null;
    try {
      const res = await fetch(backendUrl() + "/api/license/activate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license: licenseKey })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || ("HTTP " + res.status), revoked: !!data.revoked, expired: !!data.expired };
      return { ok: true, payload: data.payload, daysLeft: data.daysLeft, licenseId: data.licenseId };
    } catch (e) { return { ok: false, error: "No se pudo conectar al backend: " + (e.message || e) }; }
  }

  async function checkLicenseBackend(licenseKey, payload, licenseId) {
    if (!backendEnabled()) return null;
    try {
      const res = await fetch(backendUrl() + "/api/license/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license: licenseKey, payload: payload, licenseId: licenseId || null })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || ("HTTP " + res.status), revoked: !!data.revoked, expired: !!data.expired };
      return { ok: true, payload: data.payload, daysLeft: data.daysLeft, licenseId: data.licenseId };
    } catch (e) { return { ok: false, error: "No se pudo conectar al backend: " + (e.message || e) }; }
  }

  async function checkStoredLicense(forceBackend) {
    const stored = await getStoredLicense();
    if (!stored || !stored.license) return { valid: false, reason: "sin licencia" };
    const localRes = await verifyLicenseRaw(stored.license);
    if (!localRes.ok) return { valid: false, reason: localRes.error, expired: localRes.expired, payload: localRes.payload };
    const lastCheck = await getLastCheck();
    if (backendEnabled() && (forceBackend || Date.now() - lastCheck > CHECK_INTERVAL_MS)) {
      setLastCheck(Date.now());
      const backendRes = await checkLicenseBackend(stored.license, localRes.payload, stored.licenseId);
      if (backendRes) {
        if (!backendRes.ok) {
          await clearStoredLicense();
          if (backendRes.revoked) return { valid: false, reason: "Licencia revocada por el administrador", revoked: true, payload: localRes.payload };
          if (backendRes.expired) return { valid: false, reason: backendRes.error, expired: true, payload: localRes.payload };
          return { valid: false, reason: backendRes.error || "Licencia no válida en el servidor", payload: localRes.payload };
        } else {
          await setStoredLicense({ license: stored.license, payload: backendRes.payload || localRes.payload, daysLeft: backendRes.daysLeft, checkedAt: Date.now() });
          return { valid: true, payload: backendRes.payload || localRes.payload, daysLeft: backendRes.daysLeft };
        }
      }
    }
    return { valid: true, payload: localRes.payload, daysLeft: localRes.daysLeft };
  }

  async function activateLicense(licenseKey) {
    const key = licenseKey.trim();
    const localRes = await verifyLicenseRaw(key);
    if (!localRes.ok && !localRes.expired) return { ok: false, error: localRes.error, expired: localRes.expired };
    let licenseId = null, daysLeft = localRes.daysLeft;
    let payload = localRes.payload;
    if (backendEnabled()) {
      const backendRes = await activateLicenseBackend(key);
      if (backendRes && backendRes.ok) { licenseId = backendRes.licenseId; daysLeft = backendRes.daysLeft; payload = backendRes.payload || payload; }
      else if (backendRes) {
        return { ok: false, error: backendRes.error || "Licencia rechazada por el servidor", revoked: backendRes.revoked, expired: backendRes.expired };
      }
    }
    await setStoredLicense({ license: key, payload: payload, daysLeft: daysLeft, licenseId: licenseId, checkedAt: Date.now() });
    if (backendEnabled()) await fetchAndCachePubKey();
    return { ok: true, payload: payload, daysLeft: daysLeft, licenseId: licenseId };
  }

  window.__CELicense = {
    verify: verifyLicenseRaw,
    checkStored: function (force) { return checkStoredLicense(force); },
    activate: activateLicense,
    clear: clearStoredLicense,
    fetchPubKey: fetchAndCachePubKey,
    isBackendEnabled: backendEnabled,
    hasPubKey: async function () {
      const jwk = await getPubKeyJwk();
      return !!(jwk && jwk.n);
    }
  };
})();