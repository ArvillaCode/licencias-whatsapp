(function () {
  "use strict";

  const NS = "__waextract";
  const STATE_KEY = "extractState";
  const LOG = function () { try { console.log.apply(console, ["[WAExtract-CS]"].concat(Array.from(arguments))); } catch (e) {} };
  let pending = new Map();
  let msgCounter = 0;
  let readyState = false;
  let extracting = false;
  let paused = false;
  let livePort = null;
  let injected = false;

  function injectMainWorldScript() {
    if (injected) return;
    injected = true;
    LOG("Inyectando inject.js en MAIN world...");
    try {
      const s = document.createElement("script");
      s.src = chrome.runtime.getURL("content/inject.js") + "?v=" + Date.now();
      s.onload = function () { LOG("inject.js cargado OK"); s.remove(); };
      s.onerror = function () { LOG("ERROR: inject.js no cargó"); s.remove(); injected = false; };
      (document.head || document.documentElement).appendChild(s);
    } catch (e) { LOG("Error inyectando:", e.message); }
  }
  LOG("content.js iniciado");
  injectMainWorldScript();

  let state = {
    status: "idle",
    done: 0,
    total: 0,
    current: "",
    rows: [],
    error: "",
    groupName: "",
    groupId: "",
    includeAbout: true,
    startedAt: 0,
    finishedAt: 0,
    preScanTotal: 0,
    preScanDone: 0,
    phoneCount: 0
  };

  const BULK_KEY = "ce_bulk_state";
  const JOB_KEY = "ce_bulk_job";
  let bulkExtracting = false;
  let bulkPaused = false;
  let bulkState = {
    status: "idle",
    total: 0,
    sent: 0,
    failed: 0,
    current: "",
    errors: [],
    startedAt: 0,
    finishedAt: 0
  };
  // Trabajo persistido (cola completa) para poder reanudar en segundo plano tras
  // recargas de la pestaña o descarte por parte de Chrome.
  let bulkJob = null; // { contacts, text, options, index, total }

  function saveBulkState() {
    try { chrome.storage.local.set({ [BULK_KEY]: Object.assign({}, bulkState) }, function () {}); } catch (e) {}
    if (livePort) {
      try { livePort.postMessage({ type: "bulkState", state: Object.assign({}, bulkState) }); } catch (e) {}
    }
  }

  function saveJob() { try { chrome.storage.local.set({ [JOB_KEY]: bulkJob }, function () {}); } catch (e) {} }
  function clearJob() { bulkJob = null; try { chrome.storage.local.remove(JOB_KEY, function () {}); } catch (e) {} }

  // Avisar al service worker para que mantenga viva la pestaña y programe el latido.
  function notifyBg(cmd) { try { chrome.runtime.sendMessage({ bg: cmd }, function () { void chrome.runtime.lastError; }); } catch (e) {} }

  function loadState(cb) {
    chrome.storage.local.get(STATE_KEY, function (obj) {
      if (obj && obj[STATE_KEY]) state = Object.assign(state, obj[STATE_KEY]);
      cb();
    });
  }

  function saveState() {
    const snapshot = Object.assign({}, state, { rows: state.rows || [] });
    try { chrome.storage.local.set({ [STATE_KEY]: snapshot }, function () {}); } catch (e) {}
    if (livePort) {
      try { livePort.postMessage({ type: "state", state: snapshot }); } catch (e) { livePort = null; }
    }
  }

  function sendToInject(type, payload, timeoutMs) {
    return new Promise(function (resolve, reject) {
      const id = "r" + (++msgCounter);
      const to = setTimeout(function () {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error("Timeout esperando respuesta del inyector (" + type + ")"));
        }
      }, timeoutMs || 60000);
      pending.set(id, function (result) {
        clearTimeout(to);
        if (result && result.__error) reject(new Error(result.__error));
        else resolve(result);
      });
      window.postMessage(Object.assign({ ns: NS, id: id, from: "content", type: type }, payload || {}), "*");
    });
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.ns !== NS || data.from !== "inject" || !data.id) return;
    const cb = pending.get(data.id);
    if (!cb) return;
    pending.delete(data.id);
    cb(data.result);
  });

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  async function waitWhilePaused() {
    while (paused && extracting) { await sleep(200); }
  }

  async function waitForReady() {
    const start = Date.now();
    while (Date.now() - start < 90000) {
      try {
        const res = await sendToInject("ping", {}, 5000);
        if (res && res.ready) { readyState = true; LOG("Inject reporta ready"); return true; }
        if (res && res.moduleRequireReady) {
          LOG("Inject tiene moduleRequire, esperando ready...");
          await sendToInject("waitReady", {}, 60000);
          readyState = true;
          return true;
        }
        LOG("Ping a inject:", res ? JSON.stringify(res) : "null");
      } catch (e) { LOG("Error en ping a inject:", e.message); }
      await sleep(500);
    }
    throw new Error("WhatsApp Web no está listo. Abre web.whatsapp.com, inicia sesión e intenta de nuevo.");
  }

  function roleLabel(p) {
    if (p.isSuperAdmin) return "superadmin";
    if (p.isAdmin) return "admin";
    return "miembro";
  }

  async function runExtract(groupId, groupName, includeAbout) {
    if (extracting) return;
    extracting = true;
    state.status = "prescanning";
    state.groupId = groupId;
    state.groupName = groupName;
    state.includeAbout = includeAbout;
    state.done = 0;
    state.total = 0;
    state.current = "";
    state.rows = [];
    state.error = "";
    state.startedAt = Date.now();
    state.finishedAt = 0;
    state.preScanTotal = 0;
    state.preScanDone = 0;
    state.phoneCount = 0;
    saveState();
    try {
      if (!readyState) await waitForReady();
      // ── Pre-scan: identify contacts with phones ──
      state.current = "Pre-escaneando contactos...";
      saveState();
      const scanRes = await sendToInject("preScan", { groupId: groupId }, 120000);
      const scan = scanRes && scanRes.scan ? scanRes.scan : null;
      if (!scan) throw new Error("No se pudo pre-escanear el grupo.");
      const phoneParticipants = scan.phoneParticipants || [];
      state.preScanTotal = scan.total;
      state.preScanDone = scan.total;
      state.phoneCount = phoneParticipants.length;
      saveState();
      // ── Extract only contacts with phones ──
      const total = phoneParticipants.length;
      state.total = total;
      state.status = "extracting";
      saveState();
      if (total === 0) {
        state.status = "done";
        state.finishedAt = Date.now();
        saveState();
        extracting = false;
        return;
      }
      const rows = [];
      for (let i = 0; i < total; i++) {
        if (!extracting) return;
        await waitWhilePaused();
        if (!extracting) return;
        const p = phoneParticipants[i];
        const idStr = p.id;
        let phone = null, name = "", pushname = "", about = null;
        try {
          const phoneRes = await sendToInject("toPhone", { participantId: idStr }, 10000);
          phone = phoneRes ? phoneRes.phone : null;
        } catch (e) {}
        try {
          const c = await sendToInject("resolveContact", { participantId: idStr }, 30000);
          if (c) { name = c.name || c.formattedName || ""; pushname = c.pushname || ""; }
        } catch (e) {}
        if (includeAbout) {
          try {
            const a = await sendToInject("getAbout", { participantId: idStr }, 30000);
            about = a ? a.about : null;
          } catch (e) {}
          await sleep(rand(400, 700));
        } else {
          await sleep(rand(80, 160));
        }
        if (!extracting) return;
        await waitWhilePaused();
        if (i > 0 && i % 5 === 0 && includeAbout) await sleep(rand(300, 600));
        rows.push({
          name: name,
          pushname: pushname,
          phone: phone || "",
          lid: (idStr && idStr.indexOf("@lid") !== -1) ? idStr : "",
          role: roleLabel(p),
          about: about || ""
        });
        state.done = i + 1;
        state.current = name || idStr;
        state.rows = rows;
        saveState();
      }
      state.status = "done";
      state.finishedAt = Date.now();
      saveState();
    } catch (e) {
      state.status = "error";
      state.error = String(e && e.message || e);
      saveState();
    } finally {
      extracting = false;
    }
  }

  function cancelExtract() {
    extracting = false;
    paused = false;
    state.status = "idle";
    state.error = "cancelado";
    saveState();
  }

  function pauseExtract() {
    if (!extracting) return false;
    paused = true;
    state.status = "paused";
    saveState();
    return true;
  }

  function resumeExtract() {
    if (!extracting) return false;
    paused = false;
    state.status = "extracting";
    saveState();
    return true;
  }

  function waitWhileBulkPaused() {
    return new Promise(function (resolve) {
      (function check() { if (!bulkPaused || !bulkExtracting) resolve(); else setTimeout(check, 200); })();
    });
  }

  function fmtSecs(s) {
    if (s >= 60) { var m = Math.floor(s / 60); var r = s % 60; return m + "m" + (r ? " " + r + "s" : ""); }
    return s + "s";
  }

  // Espera interrumpible: se corta al instante si se cancela (Detener), se congela
  // mientras esté en pausa, y va publicando una cuenta regresiva para que el popup
  // muestre en todo momento qué está haciendo.
  async function bulkWait(ms, label) {
    var remaining = ms;
    while (remaining > 0) {
      if (!bulkExtracting) return;                       // cancelado → salir ya
      if (bulkPaused) { await sleep(200); continue; }    // congelar cuenta regresiva en pausa
      if (label) {
        bulkState.current = label + " — " + fmtSecs(Math.ceil(remaining / 1000));
        saveBulkState();
      }
      var tick = remaining < 1000 ? remaining : 1000;
      await sleep(tick);
      remaining -= tick;
    }
  }

  // Arranca una campaña nueva: persiste la cola completa y lanza el bucle.
  function runBulkSend(contacts, text, options) {
    if (bulkExtracting) return;
    const list = (contacts || []).slice();
    const maxPerSession = (options && options.maxPerSession) || 50;
    bulkJob = {
      contacts: list,
      text: text,
      options: options || {},
      index: 0,
      total: Math.min(list.length, maxPerSession)
    };
    saveJob();
    bulkState = {
      status: "sending", total: bulkJob.total, sent: 0, failed: 0,
      current: "", errors: [], startedAt: Date.now(), finishedAt: 0
    };
    saveBulkState();
    notifyBg("bulkStarted");
    bulkLoop();
  }

  // Reanuda una campaña persistida si quedó a medias (tras recarga de la pestaña,
  // descarte de Chrome o latido del service worker).
  function resumeBulkIfNeeded() {
    if (bulkExtracting) return false;
    if (!bulkJob || !bulkJob.contacts) return false;
    if (bulkState.status !== "sending" && bulkState.status !== "paused") return false;
    if (bulkJob.index >= bulkJob.total) return false;
    LOG("Reanudando campaña de envío desde índice " + bulkJob.index + "/" + bulkJob.total);
    bulkPaused = (bulkState.status === "paused");
    notifyBg("bulkStarted");
    bulkLoop();
    return true;
  }

  async function bulkLoop() {
    if (bulkExtracting || !bulkJob) return;
    bulkExtracting = true;
    const job = bulkJob;
    const options = job.options || {};
    const batchSize = options.batchSize || 5;
    const batchPause = (options.batchPause || 120) * 1000;
    const baseDelay = (options.delay || 5) * 1000;
    const total = job.total;
    const contacts = job.contacts;
    if (bulkState.status !== "paused") { bulkState.status = "sending"; saveBulkState(); }
    try {
      if (!readyState) await waitForReady();
      // El script inyectado en la página persiste hasta recargarla. Si es una versión
      // vieja (sin envío), avisar de forma accionable en vez de fallar contacto a contacto.
      try {
        const png = await sendToInject("ping", {}, 8000);
        const caps = (png && png.caps) || [];
        if (caps.indexOf("sendText") === -1) {
          throw new Error("La pestaña de WhatsApp Web está desactualizada. Recárgala (F5) y vuelve a intentar.");
        }
      } catch (e) {
        if (String(e && e.message).indexOf("desactualizada") !== -1) throw e;
      }
      for (let i = job.index; i < total && i < contacts.length; i++) {
        job.index = i; saveJob();
        if (!bulkExtracting) { bulkState.status = "cancelled"; saveBulkState(); return; }
        await waitWhileBulkPaused();
        if (!bulkExtracting) { bulkState.status = "cancelled"; saveBulkState(); return; }
        const contact = contacts[i];
        const chatId = (contact.phone || contact).replace(/[^0-9]/g, "") + "@c.us";
        let msg = job.text.replace(/{name}/g, contact.name || "").replace(/{phone}/g, contact.phone || "").replace(/{pushname}/g, contact.pushname || "");
        const who = contact.name || contact.phone || chatId;
        bulkState.current = "Enviando a " + who + "…";
        saveBulkState();
        try {
          const res = await sendToInject("sendText", { chatId: chatId, text: msg }, 60000);
          if (res && res.ok) { bulkState.sent++; bulkState.current = "Enviado a " + who; }
          else { bulkState.failed++; bulkState.current = "Falló: " + who; bulkState.errors.push({ contact: who, error: (res && res.__error) || "Error de envío" }); }
        } catch (e) { bulkState.failed++; bulkState.current = "Falló: " + who; bulkState.errors.push({ contact: who, error: e.message }); }
        job.index = i + 1; saveJob();
        saveBulkState();
        if (i < total - 1) {
          await bulkWait(rand(Math.floor(baseDelay * 0.7), Math.floor(baseDelay * 1.3)), "Esperando antes del siguiente");
          if (!bulkExtracting) { bulkState.status = "cancelled"; saveBulkState(); return; }
          if (options.randomPauses !== false && (i + 1) % 10 === 0) {
            await bulkWait(rand(15000, 45000), "Pausa de seguridad");
          }
          if ((i + 1) % batchSize === 0 && i < total - 1) {
            await bulkWait(rand(Math.floor(batchPause * 0.5), Math.floor(batchPause * 1.5)), "Pausa entre lotes");
          }
          if (!bulkExtracting) { bulkState.status = "cancelled"; saveBulkState(); return; }
        }
      }
      bulkState.status = "done";
      bulkState.finishedAt = Date.now();
      saveBulkState();
      clearJob();
    } catch (e) {
      bulkState.status = "error";
      bulkState.errors.push({ error: e.message });
      saveBulkState();
    } finally {
      bulkExtracting = false;
      if (bulkState.status !== "sending" && bulkState.status !== "paused") notifyBg("bulkEnded");
    }
  }

  function cancelBulkSend() { bulkExtracting = false; bulkPaused = false; bulkState.status = "cancelled"; saveBulkState(); clearJob(); notifyBg("bulkEnded"); }
  function pauseBulkSend() { if (!bulkExtracting) return false; bulkPaused = true; bulkState.status = "paused"; saveBulkState(); return true; }
  function resumeBulkSend() {
    if (bulkExtracting) { bulkPaused = false; bulkState.status = "sending"; saveBulkState(); return true; }
    // El bucle no está corriendo (p. ej. tras recargar la pestaña): reanudar desde el job.
    if (bulkJob && bulkJob.index < bulkJob.total) {
      bulkPaused = false; bulkState.status = "sending"; saveBulkState();
      return resumeBulkIfNeeded();
    }
    return false;
  }

  function reply(sendResponse, payload) {
    try { sendResponse(payload); } catch (e) {}
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || !msg.cmd) return;
    const cmd = msg.cmd;
    LOG("Comando recibido:", cmd);
    if (cmd === "ping") {
      reply(sendResponse, { ready: readyState, extracting: extracting, paused: paused });
      return false;
    }
    if (cmd === "getState") {
      sendResponse({ state: state, ready: readyState, extracting: extracting, paused: paused });
      return false;
    }
    if (cmd === "listGroups") {
      Promise.resolve().then(async function () {
        try {
          if (!readyState) await waitForReady();
          const res = await sendToInject("listGroups", {}, 60000);
          reply(sendResponse, { groups: (res && res.groups) || [] });
        } catch (e) {
          reply(sendResponse, { groups: [], error: String(e && e.message || e) });
        }
      });
      return true;
    }
    if (cmd === "getStats") {
      Promise.resolve().then(async function () {
        try {
          if (!readyState) await waitForReady();
          const res = await sendToInject("getStats", { groupId: msg.groupId }, 60000);
          reply(sendResponse, { stats: (res && res.stats) || null });
        } catch (e) {
          reply(sendResponse, { stats: null, error: String(e && e.message || e) });
        }
      });
      return true;
    }
    if (cmd === "start") {
      if (extracting) { reply(sendResponse, { ok: false, error: "Ya hay una extracciÃ³n en curso" }); return false; }
      runExtract(msg.groupId, msg.groupName, !!msg.includeAbout);
      reply(sendResponse, { ok: true });
      return false;
    }
    if (cmd === "cancel") {
      LOG("Cancelando extracción. extracting=" + extracting);
      cancelExtract();
      reply(sendResponse, { ok: true });
      return false;
    }
    if (cmd === "pause") {
      LOG("Pausando. extracting=" + extracting);
      reply(sendResponse, { ok: pauseExtract() });
      return false;
    }
    if (cmd === "resume") {
      LOG("Reanudando. extracting=" + extracting + " paused=" + paused);
      reply(sendResponse, { ok: resumeExtract() });
      return false;
    }
    if (cmd === "getMyPhone") {
      Promise.resolve().then(async function () {
        try {
          if (!readyState) await waitForReady();
          const res = await sendToInject("getMyPhone", {}, 10000);
          let phone = (res && res.phone) || null;
          if (!phone) {
            try {
              const res2 = await sendToInject("getMyPhoneAsync", {}, 10000);
              phone = (res2 && res2.phone) || null;
            } catch (e) {}
          }
          reply(sendResponse, { phone: phone });
        } catch (e) { reply(sendResponse, { phone: null, error: String(e && e.message || e) }); }
      });
      return true;
    }
    if (cmd === "reset") {
      extracting = false;
      paused = false;
      state = {
        status: "idle",
        done: 0,
        total: 0,
        current: "",
        rows: [],
        error: "",
        groupName: "",
        groupId: "",
        includeAbout: true,
        startedAt: 0,
        finishedAt: 0,
        preScanTotal: 0,
        preScanDone: 0,
        phoneCount: 0
      };
      saveState();
      reply(sendResponse, { ok: true });
      return false;
    }
    if (cmd === "getBulkState") {
      reply(sendResponse, { state: Object.assign({}, bulkState), extracting: bulkExtracting, paused: bulkPaused });
      return false;
    }
    if (cmd === "sendBulk") {
      if (bulkExtracting) { reply(sendResponse, { ok: false, error: "Ya hay un envío en curso" }); return false; }
      runBulkSend(msg.contacts, msg.text, msg.options || {});
      reply(sendResponse, { ok: true });
      return false;
    }
    if (cmd === "cancelBulk") { cancelBulkSend(); reply(sendResponse, { ok: true }); return false; }
    if (cmd === "pauseBulk") { reply(sendResponse, { ok: pauseBulkSend() }); return false; }
    if (cmd === "resumeBulk") { reply(sendResponse, { ok: resumeBulkSend() }); return false; }
    if (cmd === "bulkHeartbeat") {
      // El service worker nos "pincha" periódicamente: reanudar si quedó a medias
      // y reportar si la campaña sigue activa (para que apague el latido si terminó).
      resumeBulkIfNeeded();
      var active = bulkExtracting || bulkState.status === "sending" || bulkState.status === "paused";
      reply(sendResponse, { active: active, state: Object.assign({}, bulkState) });
      return false;
    }
    return false;
  });

  chrome.runtime.onConnect.addListener(function (port) {
    if (port.name !== "waextract-live") return;
    livePort = port;
    try { port.postMessage({ type: "state", state: state }); } catch (e) {}
    port.onDisconnect.addListener(function () { livePort = null; });
  });

  function loadBulkState(cb) {
    chrome.storage.local.get([BULK_KEY, JOB_KEY], function (obj) {
      if (obj && obj[BULK_KEY]) bulkState = Object.assign(bulkState, obj[BULK_KEY]);
      if (obj && obj[JOB_KEY]) bulkJob = obj[JOB_KEY];
      if (cb) cb();
    });
  }

  loadState(function () {});
  // Al (re)cargar el content script, reanudar una campaña que hubiera quedado activa.
  loadBulkState(function () { resumeBulkIfNeeded(); });
})();
