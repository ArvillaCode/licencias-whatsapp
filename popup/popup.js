(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  let waTabId = null;
  let rows = [];
  let lastGroupName = "";
  let connected = false;

  chrome.storage.local.get({ includeAbout: true, format: "csv" }, function (cfg) {
    $("aboutCheck").checked = !!cfg.includeAbout;
    $("formatSelect").value = cfg.format || "csv";
  });

  function showLicenseGate(reasonMsg) {
    $("licenseGate").classList.remove("hidden");
    $("mainApp").classList.add("hidden");
    const el = $("licenseStatus");
    if (reasonMsg) {
      el.className = "status error";
      el.innerHTML = reasonMsg;
    } else {
      el.className = "status";
      el.innerHTML = "";
    }
    $("licenseHint").classList.remove("hidden");
    refreshLicenseInfo();
  }
  function showMainApp() {
    $("licenseGate").classList.add("hidden");
    $("mainApp").classList.remove("hidden");
  }

  async function refreshLicenseInfo() {
    const el = $("licenseActive");
    if (!window.__CELicense || !window.__CELicense.hasPubKey()) {
      el.classList.add("hidden");
      return;
    }
    const stored = await new Promise(function (r) { chrome.storage.local.get("ce_active_license", function (o) { r(o && o.ce_active_license); }); });
    if (stored && stored.payload) {
      $("licEmail").textContent = stored.payload.email || "—";
      $("licWa").textContent = stored.payload.whatsapp || "—";
      $("licEnd").textContent = (stored.payload.endDate || "").slice(0, 10);
      $("licDays").textContent = stored.daysLeft != null ? stored.daysLeft : "—";
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  }

  async function checkLicenseAtStart() {
    if (!window.__CELicense) { showLicenseGate("Módulo de licencia no cargado."); return; }
    if (!window.__CELicense.hasPubKey()) {
      showLicenseGate("No hay clave pública configurada. El administrador debe generar un par de claves en admin/admin.html y pegar la clave pública en popup/public-key.js.");
      return;
    }
    const res = await window.__CELicense.checkStored(true);
    if (res.valid) { showMainApp(); return; }
    if (res.expired) showLicenseGate("Tu licencia expiró el " + (res.payload && res.payload.endDate ? res.payload.endDate.slice(0, 10) : "?") + ". Contacta al administrador para renovarla.");
    else showLicenseGate("No hay licencia activa. Introduce tu clave para activar la extensión.");
  }

  $("activateBtn").addEventListener("click", async function () {
    const key = $("licenseInput").value.trim();
    if (!key) { const el = $("licenseStatus"); el.className = "status error"; el.textContent = "Pega la clave de licencia."; return; }
    const el = $("licenseStatus");
    el.className = "status"; el.textContent = "Verificando...";
    const res = await window.__CELicense.activate(key);
    if (res.ok) {
      el.className = "status"; el.textContent = "";
      showMainApp();
      init();
    } else {
      el.className = "status error";
      el.textContent = res.error || "Licencia inválida";
    }
  });

  $("deactivateBtn").addEventListener("click", async function () {
    if (!confirm("¿Desactivar la licencia en este navegador?")) return;
    await window.__CELicense.clear();
    showLicenseGate("Licencia desactivada. Introduce una nueva clave para continuar.");
  });

  function setStatus(msg, isError) {
    const el = $("status");
    el.textContent = msg || "";
    el.className = "status" + (isError ? " error" : "");
  }

  function getWaTab() {
    return new Promise(function (resolve) {
      chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, function (tabs) {
        if (chrome.runtime.lastError || !tabs || !tabs.length) return resolve(null);
        const t = tabs.find(function (x) { return x.active; }) || tabs[0];
        resolve(t);
      });
    });
  }

  function sendCmd(cmd, payload, cb) {
    if (!waTabId) { if (cb) cb({ error: "Sin pestaña de WhatsApp Web" }); return; }
    const msg = Object.assign({ cmd: cmd }, payload || {});
    try {
      chrome.tabs.sendMessage(waTabId, msg, function (res) {
        if (chrome.runtime.lastError) { if (cb) cb({ error: chrome.runtime.lastError.message }); return; }
        if (cb) cb(res);
      });
    } catch (e) { if (cb) cb({ error: String(e && e.message || e) }); }
  }

  function applyState(state) {
    if (!state) return;
    rows = state.rows || [];
    if (state.groupName) lastGroupName = state.groupName;
    if (state.status === "extracting") {
      setBusy(true);
      setProgress(state.done || 0, state.total || 0, state.current || "");
    } else if (state.status === "paused") {
      setBusy(true);
      setPaused(true);
      setProgress(state.done || 0, state.total || 0, state.current || "");
      setStatus("Pausado en " + (state.done || 0) + " de " + (state.total || 0));
    } else if (state.status === "done") {
      renderResults(state.rows || []);
      setStatus((state.rows || []).length + " contactos extraídos.");
    } else if (state.status === "error") {
      setStatus(state.error || "Error en la extracción", true);
      setBusy(false);
    } else if (state.status === "idle") {
      rows = [];
      const tbody = $("tbody");
      if (tbody) tbody.innerHTML = "";
      $("results").classList.add("hidden");
      $("progress").classList.add("hidden");
      $("controls").classList.add("hidden");
      $("extractBtn").disabled = false;
    }
  }

  function injectScripts(tabId) {
    return new Promise(function (resolve) {
      try {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["content/content.js"]
        }, function () {
          if (chrome.runtime.lastError) { resolve(false); return; }
          chrome.scripting.executeScript({
            target: { tabId: tabId, world: "MAIN" },
            files: ["content/inject.js"]
          }, function () {
            resolve(!chrome.runtime.lastError);
          });
        });
      } catch (e) { resolve(false); }
    });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function connectAsync() {
    if (!waTabId) return { ok: false, error: "Sin pestaña" };
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await new Promise(function (resolve) {
        sendCmd("ping", {}, function (r) { resolve(r); });
      });
      if (res && !res.error) {
        connected = true;
        if (res.ready) {
          sendCmd("getState", {}, function (sr) {
            if (sr && sr.state) applyState(sr.state);
            if (!sr || !(sr.state && (sr.state.status === "extracting" || sr.state.status === "paused"))) {
              loadGroups();
            }
          });
          return { ok: true };
        }
      }
      if (attempt === 0 && (!res || res.error)) {
        setStatus("Inyectando scripts en WhatsApp Web...");
        const ok = await injectScripts(waTabId);
        if (ok) { await sleep(500); continue; }
      }
      if (res && !res.error && !res.ready) { await sleep(1000); continue; }
      await sleep(500);
    }
    return { ok: false, error: "no conectado" };
  }

  async function init() {
    const tab = await getWaTab();
    if (!tab) {
      setStatus("Abre web.whatsapp.com en una pestaña e inicia sesión.", true);
      $("groupSelect").innerHTML = '<option value="">Abre WhatsApp Web primero</option>';
      return;
    }
    waTabId = tab.id;
    setStatus("Conectando con WhatsApp Web...");
    const result = await connectAsync();
    if (!result.ok) {
      setStatus("No se pudo conectar. Recarga la pestaña de WhatsApp Web (Ctrl+R) e inténtalo de nuevo.", true);
      $("groupSelect").innerHTML = '<option value="">Sin conexión — recarga WhatsApp Web</option>';
    }
  }

  function loadGroups() {
    setStatus("Cargando lista de grupos...");
    $("groupSelect").disabled = true;
    $("extractBtn").disabled = true;
    sendCmd("listGroups", {}, function (res) {
      if (!res) return;
      if (res.error) { setStatus(res.error, true); return; }
      renderGroups(res.groups || []);
    });
  }

  function loadStats(groupId) {
    $("statsPanel").classList.add("hidden");
    if (!groupId) { return; }
    $("statsLoading").classList.remove("hidden");
    sendCmd("getStats", { groupId: groupId }, function (res) {
      $("statsLoading").classList.add("hidden");
      if (!res || res.error || !res.stats) {
        $("statTotal").textContent = "—";
        $("statAdmins").textContent = "—";
        $("statMembers").textContent = "—";
        $("statPhone").textContent = "—";
        $("statLid").textContent = "—";
        $("statsPanel").classList.remove("hidden");
        return;
      }
      const s = res.stats;
      $("statTotal").textContent = s.total;
      $("statAdmins").textContent = s.admins + (s.superAdmins ? "+" + s.superAdmins : "");
      $("statMembers").textContent = s.members;
      $("statPhone").textContent = s.phoneCount;
      $("statLid").textContent = s.lidCount;
      $("statsPanel").classList.remove("hidden");
    });
  }

  function renderGroups(groups) {
    const sel = $("groupSelect");
    if (!groups.length) {
      sel.innerHTML = '<option value="">No se encontraron grupos</option>';
      setStatus("No se encontraron grupos. Únete a un grupo e intenta de nuevo.", true);
      return;
    }
    sel.innerHTML = "";
    groups.forEach(function (g) {
      const o = document.createElement("option");
      o.value = g.id;
      o.textContent = g.name;
      sel.appendChild(o);
    });
    sel.disabled = false;
    $("extractBtn").disabled = false;
    setStatus(groups.length + " grupos encontrados. Selecciona uno.");
    loadStats(sel.value);
  }

  function setBusy(busy) {
    $("extractBtn").disabled = busy;
    $("groupSelect").disabled = busy;
    $("refreshBtn").disabled = busy;
    if (busy) {
      $("progress").classList.remove("hidden");
      $("controls").classList.remove("hidden");
      setPaused(false);
    } else {
      $("progress").classList.add("hidden");
      $("controls").classList.add("hidden");
      setPaused(false);
    }
  }

  function setPaused(isPaused) {
    if (isPaused) {
      $("pauseBtn").classList.add("hidden");
      $("resumeBtn").classList.remove("hidden");
    } else {
      $("pauseBtn").classList.remove("hidden");
      $("resumeBtn").classList.add("hidden");
    }
  }

  function setProgress(done, total, current) {
    $("progress").classList.remove("hidden");
    const pct = total ? Math.round((done / total) * 100) : 0;
    $("barFill").style.width = pct + "%";
    $("progressText").textContent = done + " / " + total + (current ? " — " + current : "");
    setStatus("Extrayendo " + done + " de " + total + "...");
  }

  function renderResults(r) {
    setBusy(false);
    $("progress").classList.add("hidden");
    rows = r || [];
    const tbody = $("tbody");
    tbody.innerHTML = "";
    rows.forEach(function (row, i) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (i + 1) + "</td>" +
        "<td>" + esc(row.name) + "</td>" +
        "<td>" + esc(row.pushname) + "</td>" +
        "<td>" + esc(row.phone) + "</td>" +
        "<td class='lid'>" + esc(row.lid) + "</td>" +
        "<td class='" + (row.role === "admin" || row.role === "superadmin" ? "role-admin" : "") + "'>" + esc(row.role) + "</td>" +
        "<td>" + esc(row.about) + "</td>";
      tbody.appendChild(tr);
    });
    $("resultsCount").textContent = rows.length + " contactos";
    $("results").classList.remove("hidden");
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sanitizeFilename(s) {
    return String(s || "contactos").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60);
  }

  function dateStamp() {
    const d = new Date();
    const p = function (n) { return n < 10 ? "0" + n : n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function download(filename, blob) {
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url: url, filename: filename, saveAs: true }, function () {
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    });
  }

  function downloadExport() {
    const fmt = $("formatSelect").value || "csv";
    chrome.storage.local.set({ format: fmt });
    if (rows.length === 0) { setStatus("No hay contactos para descargar.", true); return; }
    if (fmt === "csv") exportCSV();
    else if (fmt === "json") exportJSON();
    else if (fmt === "xlsx") exportXLSX();
    resetAfterDownload();
  }

  function resetAfterDownload() {
    rows = [];
    const tbody = $("tbody");
    if (tbody) tbody.innerHTML = "";
    $("results").classList.add("hidden");
    $("resultsCount").textContent = "0 contactos";
    $("progress").classList.add("hidden");
    $("controls").classList.add("hidden");
    $("extractBtn").disabled = false;
    sendCmd("reset", {}, function () {});
    setStatus("Descarga completa. Listo para una nueva extracción.");
  }

  function exportCSV() {
    const header = ["Nombre", "Pushname", "Telefono", "LID", "Rol", "Acerca de"];
    const lines = [header.map(csvCell).join(",")];
    rows.forEach(function (r) {
      lines.push([r.name, r.pushname, r.phone, r.lid, r.role, r.about].map(csvCell).join(","));
    });
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    download("contactos_" + sanitizeFilename(lastGroupName) + "_" + dateStamp() + ".csv", blob);
  }

  function csvCell(v) {
    const s = String(v == null ? "" : v);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function exportJSON() {
    const data = rows.map(function (r) {
      return { name: r.name, pushname: r.pushname, phone: r.phone, lid: r.lid, role: r.role, about: r.about };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    download("contactos_" + sanitizeFilename(lastGroupName) + "_" + dateStamp() + ".json", blob);
  }

  function exportXLSX() {
    if (typeof XLSX === "undefined") { setStatus("Librería XLSX no disponible.", true); return; }
    const data = rows.map(function (r, i) {
      return { "#": i + 1, Nombre: r.name, Pushname: r.pushname, Telefono: r.phone, LID: r.lid, Rol: r.role, "Acerca de": r.about };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contactos");
    const arr = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    download("contactos_" + sanitizeFilename(lastGroupName) + "_" + dateStamp() + ".xlsx", blob);
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    if (!changes.extractState) return;
    applyState(changes.extractState.newValue);
  });

  $("extractBtn").addEventListener("click", function () {
    const groupId = $("groupSelect").value;
    if (!groupId) { setStatus("Selecciona un grupo.", true); return; }
    lastGroupName = $("groupSelect").options[$("groupSelect").selectedIndex].textContent;
    const includeAbout = $("aboutCheck").checked;
    chrome.storage.local.set({ includeAbout: includeAbout });
    rows = [];
    $("results").classList.add("hidden");
    setBusy(true);
    setStatus("Iniciando extracción...");
    sendCmd("start", { groupId: groupId, groupName: lastGroupName, includeAbout: includeAbout }, function (res) {
      if (!res || res.error) { setStatus((res && res.error) || "No se pudo iniciar", true); setBusy(false); }
      else if (!res.ok) { setStatus(res.error || "No se pudo iniciar", true); setBusy(false); }
    });
  });

  $("refreshBtn").addEventListener("click", function () {
    if (!connected) return init();
    loadGroups();
  });

  $("groupSelect").addEventListener("change", function () {
    loadStats($("groupSelect").value);
  });

  $("reconnectBtn").addEventListener("click", function () {
    const btn = $("reconnectBtn");
    btn.disabled = true;
    btn.classList.add("spinning");
    connected = false;
    $("groupSelect").innerHTML = '<option value="">Reconectando...</option>';
    $("groupSelect").disabled = true;
    $("extractBtn").disabled = true;
    $("statsPanel").classList.add("hidden");
    setStatus("Reconectando con WhatsApp Web...");
    init().finally(function () {
      btn.disabled = false;
      btn.classList.remove("spinning");
    });
  });

  $("pauseBtn").addEventListener("click", function () {
    sendCmd("pause", {}, function () {});
    setStatus("Pausando...");
  });

  $("resumeBtn").addEventListener("click", function () {
    sendCmd("resume", {}, function () {});
    setStatus("Reanudando...");
  });

  $("cancelBtn").addEventListener("click", function () {
    sendCmd("cancel", {}, function () {});
    setStatus("Cancelando...");
  });

  $("downloadBtn").addEventListener("click", downloadExport);

  checkLicenseAtStart().then(function () {
    if (!$("licenseGate") || $("licenseGate").classList.contains("hidden")) init();
  }).catch(function () { showLicenseGate("Error al verificar la licencia."); });
})();
