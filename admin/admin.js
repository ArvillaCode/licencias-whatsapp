(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };

  // ── Auth guard ────────────────────────────────────────────────────
  (async function authGuard() {
    const token = window.__CEAuth.getToken();
    if (!token) { window.location.href = "login.html"; return; }
    try {
      const res = await fetch("/admin/auth/me", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
      $("userInfo").textContent = data.user ? data.user.username : "—";
      $("loadingScreen").style.display = "none";
      $("adminContent").style.display = "block";
    } catch (e) {
      window.__CEAuth.clearToken();
      window.location.href = "login.html";
    }
  })();

  function setStatus(el, msg, kind) { if (!el) return; el.className = "status " + (kind || "info"); el.textContent = msg; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function b64urlToB64(s) { return s.replace(/-/g, "+").replace(/_/g, "/"); }
  function bytesToB64url(arr) {
    let bin = "";
    const bytes = new Uint8Array(arr);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlToBytes(s) {
    s = b64urlToB64(s);
    while (s.length % 4) s += "=";
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  var cachedPubJwk = null;
  async function getPubJwk() {
    if (cachedPubJwk) return cachedPubJwk;
    const res = await fetch("/api/pubkey", { method: "GET", headers: { "Content-Type": "application/json" } });
    const data = await res.json().catch(function () { return {}; });
    if (data && data.jwk && data.jwk.n) { cachedPubJwk = data.jwk; return data.jwk; }
    throw new Error("No se pudo obtener la clave pública del servidor");
  }

  async function verifyLicenseLocally(licenseKey) {
    try {
      const jwk = await getPubJwk();
      let b64 = licenseKey.trim().replace(/\s+/g, "");
      b64 = b64urlToB64(b64);
      while (b64.length % 4) b64 += "=";
      const bin = atob(b64);
      const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, function (c) { return c.charCodeAt(0); })));
      if (!json.p || !json.s) return { ok: false, error: "Formato inválido" };
      const pub = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
      const valid = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, pub, b64urlToBytes(json.s), new TextEncoder().encode(JSON.stringify(json.p)));
      if (!valid) return { ok: false, error: "Firma inválida" };
      const now = new Date(), start = new Date(json.p.startDate), end = new Date(json.p.endDate);
      if (now < start) return { ok: false, error: "Aún no vigente (inicio " + start.toISOString().slice(0, 10) + ")", payload: json.p };
      if (now > end) return { ok: false, error: "Expirada el " + end.toISOString().slice(0, 10), payload: json.p, expired: true };
      return { ok: true, payload: json.p, daysLeft: Math.ceil((end - now) / 86400000) };
    } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function addDays(dateStr, days) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

  function renderLog(items) {
    const tb = $("logBody");
    if (!tb) return;
    tb.innerHTML = "";
    if (!items.length) { tb.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999">Sin licencias</td></tr>'; return; }
    items.forEach(function (e, i) {
      const days = e.daysLeft != null ? e.daysLeft : Math.round((new Date(e.endDate) - new Date(e.startDate)) / 86400000);
      let statusHtml;
      if (e.revoked) statusHtml = '<span style="color:#c62828;font-weight:600">REVOCADA</span>';
      else if (e.expired || (new Date(e.endDate) < new Date())) statusHtml = '<span style="color:#999">expirada</span>';
      else statusHtml = '<span style="color:#1b5e20">activa</span>';
      let actions = "";
      if (e.id) {
        if (e.revoked) actions = '<button class="restoreBtn copy-btn" data-id="' + e.id + '">Restaurar</button>';
        else actions = '<button class="revokeBtn copy-btn danger" data-id="' + e.id + '">Revocar</button>';
      }
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (i + 1) + "</td>" +
        "<td>" + esc(e.email) + "</td>" +
        "<td>" + esc(e.whatsapp) + "</td>" +
        "<td>" + (e.startDate || "").slice(0, 10) + "</td>" +
        "<td>" + (e.endDate || "").slice(0, 10) + "</td>" +
        "<td>" + days + "</td>" +
        "<td>" + statusHtml + "</td>" +
        "<td>" + (e.activations != null ? e.activations : "—") + "</td>" +
        "<td>" + actions + "</td>";
      tb.appendChild(tr);
    });
    document.querySelectorAll(".revokeBtn").forEach(function (b) {
      b.addEventListener("click", function () { revokeBackend(b.dataset.id); });
    });
    document.querySelectorAll(".restoreBtn").forEach(function (b) {
      b.addEventListener("click", function () { restoreBackend(b.dataset.id); });
    });
  }

  async function refreshLog() {
    try {
      const data = await __CEAuth.fetch("/admin/licenses", { method: "GET" });
      renderLog(data.licenses || []);
    } catch (e) {
      if ($("listHint")) $("listHint").textContent = "Error: " + e.message;
    }
  }

  async function revokeBackend(id) {
    if (!confirm("¿Revocar esta licencia? La extensión la rechazará al re-validar.")) return;
    try { await __CEAuth.fetch("/admin/license/" + id + "/revoke", { method: "POST" }); refreshLog(); }
    catch (e) { alert("Error: " + e.message); }
  }
  async function restoreBackend(id) {
    try { await __CEAuth.fetch("/admin/license/" + id + "/restore", { method: "POST" }); refreshLog(); }
    catch (e) { alert("Error: " + e.message); }
  }

  function copyText(txt) {
    navigator.clipboard.writeText(txt).then(function () {}, function () {
      const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    });
  }

  async function issueLicense() {
    const email = $("licEmail").value;
    const wa = $("licWa").value;
    const startStr = $("licStart").value || todayISO();
    const endStr = $("licEnd").value || addDays(startStr, 30);
    if (!email || !wa) { setStatus($("issueStatus"), "Completa email y WhatsApp.", "err"); return; }
    setStatus($("issueStatus"), "Emitiendo...", "info");
    try {
      const data = await __CEAuth.fetch("/admin/license/issue", {
        method: "POST",
        body: JSON.stringify({ email: email, whatsapp: wa, startDate: startStr, endDate: endStr })
      });
      $("licenseOut").value = data.license || "";
      refreshLog();
      setStatus($("issueStatus"), "Licencia emitida" + (data.licenseId ? " (ID: " + data.licenseId + ")" : "") + ". Copia y envíala al cliente.", "ok");
    } catch (e) { setStatus($("issueStatus"), "Error: " + e.message, "err"); }
  }

  // ── Init ──────────────────────────────────────────────────────────
  __CEAuth.initThemeBtn("themeBtn");

  $("backendUrlDisplay").textContent = window.location.origin;

  $("logoutBtn").addEventListener("click", function () {
    window.__CEAuth.clearToken();
    window.location.href = "login.html";
  });

  $("issueBtn").addEventListener("click", issueLicense);

  $("preset30Btn").addEventListener("click", function () { $("licEnd").value = addDays(todayISO(), 30); });
  $("preset90Btn").addEventListener("click", function () { $("licEnd").value = addDays(todayISO(), 90); });
  $("preset365Btn").addEventListener("click", function () { $("licEnd").value = addDays(todayISO(), 365); });

  $("copyLicBtn").addEventListener("click", function () {
    const txt = $("licenseOut").value;
    if (!txt) return;
    copyText(txt);
    setStatus($("issueStatus"), "Licencia copiada.", "ok");
  });

  $("refreshListBtn").addEventListener("click", refreshLog);

  $("exportCsvBtn").addEventListener("click", function () {
    const rows = document.querySelectorAll("#logBody tr");
    const items = Array.from(rows).map(function (tr) {
      const tds = tr.querySelectorAll("td");
      return Array.from(tds).map(function (td) { return td.textContent.trim(); });
    });
    if (!items.length) return;
    const header = ["#", "Email", "WhatsApp", "Inicio", "Fin", "Dias", "Estado", "Activ", "Acciones"];
    const lines = [header.join(",")];
    items.forEach(function (row) {
      lines.push(row.map(function (v) { return /[",]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v; }).join(","));
    });
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "licencias_admin.csv"; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  });

  $("verifyBtn").addEventListener("click", async function () {
    const txt = $("verifyInput").value.trim();
    if (!txt) { setStatus($("verifyResult"), "Pega una licencia.", "err"); return; }
    setStatus($("verifyResult"), "Verificando...", "info");
    const res = await verifyLicenseLocally(txt);
    if (res.ok) {
      setStatus($("verifyResult"), "VÁLIDA. " + res.payload.email + " / " + res.payload.whatsapp + ". Días restantes: " + res.daysLeft + ".", "ok");
    } else {
      setStatus($("verifyResult"), "INVÁLIDA: " + res.error + (res.payload ? " (" + res.payload.email + ")" : ""), "err");
    }
  });

  $("licStart").value = todayISO();
  $("licEnd").value = addDays(todayISO(), 30);
  refreshLog();
})();
