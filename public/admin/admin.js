(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };

  // ── Auth guard ────────────────────────────────────────────────────
  (async function authGuard() {
    const token = window.__CEAuth.getToken();
    if (!token) { window.location.href = "login.html"; return; }
    try {
      const data = await window.__CEAuth.fetch("/admin/auth/me", { method: "GET" });
      $("userInfo").textContent = data.user ? data.user.username : "—";
      $("loadingScreen").style.display = "none";
      $("sidebar").style.display = "flex";
      $("adminContent").style.display = "block";
    } catch (e) {
      console.error("Auth guard error:", e);
      window.__CEAuth.clearToken();
      window.location.href = "login.html";
    }
  })();

  function setStatus(el, msg, kind) { if (!el) return; el.className = "status " + (kind || "info"); el.style.display = "block"; el.textContent = msg; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function addDays(dateStr, days) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

  var editLicId = null;
  var allLicenses = [];

  // ── Navigation ──────────────────────────────────────────────────
  document.querySelectorAll(".nav-item").forEach(function (item) {
    item.addEventListener("click", function () {
      document.querySelectorAll(".nav-item").forEach(function (n) { n.classList.remove("active"); });
      item.classList.add("active");
      document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active"); });
      var page = $("page-" + item.dataset.page);
      if (page) page.classList.add("active");
      if (item.dataset.page === "dashboard") refreshDashboard();
    });
  });

  // ── Dashboard ───────────────────────────────────────────────────
  function animateValue(el, start, end, duration) {
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * (end - start) + start);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderStatusChart(licenses) {
    var total = licenses.length;
    var active = licenses.filter(function (l) { return !l.revoked && !l.expired && new Date(l.endDate) > new Date(); }).length;
    var revoked = licenses.filter(function (l) { return l.revoked; }).length;
    var expired = licenses.filter(function (l) { return !l.revoked && (l.expired || new Date(l.endDate) < new Date()); }).length;

    var max = Math.max(total, 1);
    var chart = $("statusChart");
    chart.innerHTML = "";

    var rows = [
      { label: "Total", value: total, color: "blue", pct: 100 },
      { label: "Activas", value: active, color: "green", pct: Math.round(active / max * 100) },
      { label: "Revocadas", value: revoked, color: "red", pct: Math.round(revoked / max * 100) },
      { label: "Expiradas", value: expired, color: "yellow", pct: Math.round(expired / max * 100) }
    ];

    rows.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = '<div class="bar-label">' + r.label + '</div><div class="bar-track"><div class="bar-fill ' + r.color + '" style="width:0%"></div></div><div style="width:40px;font-size:13px;font-weight:600;text-align:right">' + r.value + '</div>';
      chart.appendChild(row);
      setTimeout(function () {
        row.querySelector(".bar-fill").style.width = r.pct + "%";
      }, 100);
    });
  }

  function renderRecentList(licenses) {
    var list = $("recentList");
    list.innerHTML = "";
    var sorted = licenses.slice().sort(function (a, b) { return (b.lastActivatedAt || "").localeCompare(a.lastActivatedAt || ""); });
    var recent = sorted.filter(function (l) { return l.lastActivatedAt; }).slice(0, 5);
    if (!recent.length) {
      list.innerHTML = '<p style="color:var(--text-secondary);font-size:13px">Sin activaciones recientes</p>';
      return;
    }
    recent.forEach(function (l) {
      var item = document.createElement("div");
      item.className = "recent-item";
      var date = l.lastActivatedAt ? new Date(l.lastActivatedAt).toLocaleDateString("es") : "—";
      item.innerHTML = '<div class="ri-icon">' + (l.revoked ? "🚫" : "✅") + '</div><div class="ri-info"><div class="ri-email">' + esc(l.email) + '</div><div class="ri-date">' + date + '</div></div>';
      list.appendChild(item);
    });
  }

  async function refreshDashboard() {
    try {
      var data = await __CEAuth.fetch("/admin/licenses", { method: "GET" });
      allLicenses = data.licenses || [];
      var total = allLicenses.length;
      var active = allLicenses.filter(function (l) { return !l.revoked && !l.expired && new Date(l.endDate) > new Date(); }).length;
      var revoked = allLicenses.filter(function (l) { return l.revoked; }).length;
      var expired = allLicenses.filter(function (l) { return !l.revoked && (l.expired || new Date(l.endDate) < new Date()); }).length;

      animateValue($("dTotal"), 0, total, 800);
      animateValue($("dActive"), 0, active, 800);
      animateValue($("dRevoked"), 0, revoked, 800);
      animateValue($("dExpired"), 0, expired, 800);

      renderStatusChart(allLicenses);
      renderRecentList(allLicenses);
    } catch (e) {
      console.error("Dashboard error:", e);
    }
  }

  // ── Licenses ────────────────────────────────────────────────────
  function renderLog(items) {
    const tb = $("logBody");
    if (!tb) return;
    tb.innerHTML = "";
    if (!items.length) { tb.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-secondary)">Sin licencias</td></tr>'; return; }
    items.forEach(function (e, i) {
      const days = e.daysLeft != null ? e.daysLeft : Math.round((new Date(e.endDate) - new Date(e.startDate)) / 86400000);
      let statusHtml;
      if (e.revoked) statusHtml = '<span style="color:var(--error-text);font-weight:600">REVOCADA</span>';
      else if (e.expired || (new Date(e.endDate) < new Date())) statusHtml = '<span style="color:var(--text-secondary)">expirada</span>';
      else statusHtml = '<span style="color:var(--ok-text)">activa</span>';
      let actions = "";
      if (e.id) {
        actions = '<button class="copyKeyBtn copy-btn" data-key="' + esc(e.licenseKey || "") + '" title="Copiar clave">📋</button> ';
        actions += '<button class="editBtn copy-btn" data-id="' + e.id + '" data-email="' + esc(e.email) + '" data-start="' + (e.startDate || "").slice(0, 10) + '" data-end="' + (e.endDate || "").slice(0, 10) + '" title="Re-emitir">🔄</button> ';
        actions += '<button class="renewBtn copy-btn" data-id="' + e.id + '" data-email="' + esc(e.email) + '" data-wa="' + esc(e.whatsapp) + '" data-start="' + (e.startDate || "").slice(0, 10) + '" data-end="' + (e.endDate || "").slice(0, 10) + '" title="Renovar">📅</button> ';
        if (e.revoked) actions += '<button class="restoreBtn copy-btn" data-id="' + e.id + '" title="Restaurar">♻️</button>';
        else actions += '<button class="revokeBtn copy-btn danger" data-id="' + e.id + '" title="Revocar">🚫</button>';
        actions += '<button class="resetDeviceBtn copy-btn" data-id="' + e.id + '" data-email="' + esc(e.email) + '" title="Resetear dispositivo">🔓</button>';
        actions += '<button class="deleteBtn copy-btn danger" data-id="' + e.id + '" data-email="' + esc(e.email) + '" title="Eliminar">🗑️</button>';
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
        "<td>" + (e.activations != null ? e.activations : "—") + (e.deviceId ? " <span title='Vinculado: " + esc(e.deviceId) + "'>🔒</span>" : "") + "</td>" +
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
        setStatus($("logStatus"), "Clave copiada.", "ok");
      });
    });
    document.querySelectorAll(".deleteBtn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("¿Eliminar permanentemente la licencia de " + b.dataset.email + "?")) return;
        __CEAuth.fetch("/admin/license/" + b.dataset.id, { method: "DELETE" }).then(function () { refreshLog(); }).catch(function (e) { setStatus($("logStatus"), "Error: " + e.message, "err"); });
      });
    });
    document.querySelectorAll(".resetDeviceBtn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("¿Resetear el dispositivo vinculado de " + b.dataset.email + "?")) return;
        __CEAuth.fetch("/admin/license/" + b.dataset.id + "/reset-device", { method: "POST" }).then(function () { refreshLog(); setStatus($("logStatus"), "Dispositivo reseteado.", "ok"); }).catch(function (e) { setStatus($("logStatus"), "Error: " + e.message, "err"); });
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
    document.querySelectorAll(".renewBtn").forEach(function (b) {
      b.addEventListener("click", function () {
        editLicId = b.dataset.id;
        $("renewLicInfo").textContent = "Renovando: " + b.dataset.email + " (" + b.dataset.wa + ")";
        $("renewEnd").value = addDays(todayISO(), 30);
        setStatus($("renewStatus"), "Selecciona la nueva fecha de expiración.", "info");
        $("renewModal").style.display = "flex";
      });
    });
  }

  async function refreshLog() {
    try {
      const data = await __CEAuth.fetch("/admin/licenses", { method: "GET" });
      allLicenses = data.licenses || [];
      renderLog(allLicenses);
    } catch (e) {
      console.error("Refresh error:", e);
    }
  }

  async function revokeBackend(id) {
    if (!confirm("¿Revocar esta licencia?")) return;
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
      setStatus($("issueStatus"), "Licencia emitida. Copia y envíala al cliente.", "ok");
    } catch (e) { setStatus($("issueStatus"), "Error: " + e.message, "err"); }
  }

  // ── Init ──────────────────────────────────────────────────────────
  __CEAuth.initThemeBtn("themeBtn");

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

  $("renewCancelBtn").addEventListener("click", function () { $("renewModal").style.display = "none"; });
  $("renewModal").addEventListener("click", function (e) { if (e.target === $("renewModal")) $("renewModal").style.display = "none"; });
  document.querySelectorAll(".renew-preset").forEach(function (b) {
    b.addEventListener("click", function () {
      const days = parseInt(b.dataset.days, 10);
      $("renewEnd").value = addDays(todayISO(), days);
    });
  });

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
      setStatus($("issueStatus"), "Licencia re-emitida.", "ok");
    } catch (e) { setStatus($("editStatus"), "Error: " + e.message, "err"); }
  });

  $("renewSaveBtn").addEventListener("click", async function () {
    if (!editLicId) return;
    const endStr = $("renewEnd").value;
    if (!endStr) { setStatus($("renewStatus"), "Selecciona una fecha de fin.", "err"); return; }
    setStatus($("renewStatus"), "Renovando...", "info");
    try {
      await __CEAuth.fetch("/admin/license/" + editLicId + "/renew", {
        method: "POST",
        body: JSON.stringify({ endDate: endStr })
      });
      $("renewModal").style.display = "none";
      refreshLog();
      setStatus($("issueStatus"), "Licencia renovada hasta " + endStr + ".", "ok");
    } catch (e) { setStatus($("renewStatus"), "Error: " + e.message, "err"); }
  });

  $("licStart").value = todayISO();
  $("licEnd").value = addDays(todayISO(), 30);
  refreshLog();
  refreshDashboard();
})();
