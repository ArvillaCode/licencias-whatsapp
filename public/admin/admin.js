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

  function setStatus(el, msg, kind) { if (!el) return; el.className = "status " + (kind || "info"); el.style.display = "block"; el.textContent = msg; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }



  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function addDays(dateStr, days) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

  var editLicId = null;

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
        actions = '<button class="copyKeyBtn copy-btn" data-key="' + esc(e.licenseKey || "") + '">Copiar</button> ';
        actions += '<button class="editBtn copy-btn" data-id="' + e.id + '" data-email="' + esc(e.email) + '" data-start="' + (e.startDate || "").slice(0, 10) + '" data-end="' + (e.endDate || "").slice(0, 10) + '">Editar</button> ';
        if (e.revoked) actions += '<button class="restoreBtn copy-btn" data-id="' + e.id + '">Restaurar</button>';
        else actions += '<button class="revokeBtn copy-btn danger" data-id="' + e.id + '">Revocar</button>';
        actions += '<button class="deleteBtn copy-btn danger" data-id="' + e.id + '" data-email="' + esc(e.email) + '">Eliminar</button>';
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
    document.querySelectorAll(".copyKeyBtn").forEach(function (b) {
      b.addEventListener("click", function () {
        copyText(b.dataset.key);
        setStatus($("logStatus"), "Clave copiada al portapapeles.", "ok");
      });
    });
    document.querySelectorAll(".deleteBtn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("¿Eliminar permanentemente la licencia de " + b.dataset.email + "?")) return;
        __CEAuth.fetch("/admin/license/" + b.dataset.id, { method: "DELETE" }).then(function () { refreshLog(); setStatus($("logStatus"), "Licencia eliminada.", "ok"); }).catch(function (e) { setStatus($("logStatus"), "Error: " + e.message, "err"); });
      });
    });
    document.querySelectorAll(".editBtn").forEach(function (b) {
      b.addEventListener("click", function () {
        editLicId = b.dataset.id;
        $("editLicInfo").textContent = "Editando: " + b.dataset.email;
        $("editStart").value = b.dataset.start;
        $("editEnd").value = b.dataset.end;
        setStatus($("editStatus"), "Ajusta las fechas y guarda.", "info");
        $("editModal").style.display = "flex";
      });
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
    try { await __CEAuth.fetch("/admin/license/" + id + "/revoke", { method: "POST" }); refreshLog(); setStatus($("logStatus"), "Licencia revocada.", "ok"); }
    catch (e) { setStatus($("logStatus"), "Error: " + e.message, "err"); }
  }
  async function restoreBackend(id) {
    try { await __CEAuth.fetch("/admin/license/" + id + "/restore", { method: "POST" }); refreshLog(); setStatus($("logStatus"), "Licencia restaurada.", "ok"); }
    catch (e) { setStatus($("logStatus"), "Error: " + e.message, "err"); }
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
    try {
      const data = await fetch(window.location.origin + "/api/license/activate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license: txt })
      }).then(function (r) { return r.json(); });
      if (data && data.ok) {
        setStatus($("verifyResult"), "VÁLIDA. " + data.payload.email + " / " + data.payload.whatsapp + ". Días restantes: " + data.daysLeft + ".", "ok");
      } else {
        setStatus($("verifyResult"), "INVÁLIDA: " + (data && data.error || "desconocido"), "err");
      }
    } catch (e) {
      setStatus($("verifyResult"), "Error: " + (e && e.message || e), "err");
    }
  });

  $("editCancelBtn").addEventListener("click", function () { $("editModal").style.display = "none"; });
  $("editModal").addEventListener("click", function (e) { if (e.target === $("editModal")) $("editModal").style.display = "none"; });

  $("editSaveBtn").addEventListener("click", async function () {
    if (!editLicId) return;
    const startStr = $("editStart").value;
    const endStr = $("editEnd").value;
    if (!startStr || !endStr) { setStatus($("editStatus"), "Completa ambas fechas.", "err"); return; }
    setStatus($("editStatus"), "Re-emitiendo...", "info");
    try {
      const data = await __CEAuth.fetch("/admin/license/" + editLicId + "/reissue", {
        method: "POST",
        body: JSON.stringify({ startDate: startStr, endDate: endStr })
      });
      $("licenseOut").value = data.license || "";
      $("editModal").style.display = "none";
      refreshLog();
      setStatus($("issueStatus"), "Licencia re-emitida con nuevas fechas. Copia y envía al cliente.", "ok");
    } catch (e) { setStatus($("editStatus"), "Error: " + e.message, "err"); }
  });

  $("licStart").value = todayISO();
  $("licEnd").value = addDays(todayISO(), 30);
  refreshLog();
})();
