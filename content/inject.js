(function () {
  "use strict";

  const CHUNK_NAME = "webpackChunkwhatsapp_web_client";
  const NS = "__waextract";
  const LOG = function () { try { console.log.apply(console, ["[WAExtract]"].concat(Array.from(arguments))); } catch (e) {} };
  let moduleRequire = null;
  let moduleCache = {};
  let ready = false;
  let hooked = false;
  const readyResolvers = [];
  const readyPromise = new Promise(function (r) { readyResolvers.push(r); });

  function settleReady() {
    if (ready) return;
    ready = true;
    LOG("Listo: módulo require capturado.");
    readyResolvers.forEach(function (fn) { fn(); });
    try { window.dispatchEvent(new CustomEvent(NS + "-ready")); } catch (e) {}
  }

  function captureModuleRequire(req) {
    if (moduleRequire) return;
    if (typeof req !== "function") return;
    moduleRequire = req;
    LOG("moduleRequire capturado:", typeof req, "m:", typeof req.m, "u:", typeof req.u);
    settleReady();
  }

  function hookChunkArray(arr) {
    if (hooked) return;
    if (!Array.isArray(arr)) { LOG("hookChunkArray: no es array", typeof arr); return; }
    hooked = true;
    LOG("Hookeando webpack chunk array (length=" + arr.length + ")");
    try {
      arr.push([[Date.now()], {}, function (req) {
        LOG("Fake module ejecutado, req recibido:", typeof req);
        captureModuleRequire(req);
      }]);
    } catch (e) { LOG("Error en push al chunk array:", e.message); }
  }

  function setupHook() {
    try {
      const existing = window[CHUNK_NAME];
      if (existing) {
        LOG("webpackChunk ya existe, hookeando directamente (length=" + (existing.length || 0) + ")");
        hookChunkArray(existing);
        return;
      }
      let pending;
      try {
        Object.defineProperty(window, CHUNK_NAME, {
          configurable: true,
          enumerable: true,
          get: function () { return pending; },
          set: function (v) {
            LOG("Setter: webpack asignó el chunk array");
            pending = v;
            hookChunkArray(v);
          }
        });
        LOG("Setter trap instalado para " + CHUNK_NAME);
      } catch (e) {
        LOG("No se pudo instalar setter trap:", e.message);
      }
    } catch (e) { LOG("Error en setupHook:", e.message); }
  }

  function trapRequireShortcut() {
    try {
      if (window.require && window.__d) {
        LOG("window.require ya disponible (shortcut)");
        captureModuleRequire(window.require);
        return;
      }
      ["require", "__d"].forEach(function (key) {
        let cur = window[key];
        try {
          Object.defineProperty(window, key, {
            configurable: true,
            enumerable: true,
            get: function () { return cur; },
            set: function (v) { cur = v; if (window.require && window.__d) captureModuleRequire(window.require); }
          });
        } catch (e) {}
      });
    } catch (e) {}
  }

  async function preloadEssentialChunks() {
    const req = moduleRequire;
    if (!req || typeof req.e !== "function" || typeof req.u !== "function") return;
    for (let id = 0; id < 200; id++) {
      let url;
      try { url = req.u(id); } catch (e) { continue; }
      if (!url || url.indexOf("undefined") !== -1) continue;
      if (url.indexOf("locales") !== -1) continue;
      try { await req.e(id); } catch (e) {}
    }
  }

  function tryRequire(name) {
    if (moduleCache[name]) return moduleCache[name];
    if (!moduleRequire) return undefined;
    let mod;
    try { mod = moduleRequire(name); } catch (e) { mod = undefined; }
    if (mod) moduleCache[name] = mod;
    return mod;
  }

  function findModuleByShape(names) {
    if (!moduleRequire || !moduleRequire.m) return undefined;
    const keys = Object.keys(moduleRequire.m);
    for (const k of keys) {
      let mod;
      try { mod = moduleRequire(k); } catch (e) { continue; }
      if (!mod) continue;
      let ok = true;
      for (const n of names) { if (mod[n] === undefined) { ok = false; break; } }
      if (ok) return mod;
    }
    return undefined;
  }

  function getCollections() {
    let c = tryRequire("WAWebCollections");
    if (c && (c.Chat || c.Contact)) return c;
    c = findModuleByShape(["Chat", "Contact"]);
    if (c) return c;
    return {};
  }

  function getWidFactory() {
    let w = tryRequire("WAWebWidFactory");
    if (w && w.createWid) return w;
    w = findModuleByShape(["createWid", "createWidFromWidLike"]);
    return w || null;
  }

  function getContactGetters() {
    let g = tryRequire("WAWebContactGetters");
    if (g && g.getName) return g;
    g = findModuleByShape(["getName", "getPushname"]);
    return g || null;
  }

  function getLidMigration() {
    let m = tryRequire("WAWebLidMigrationUtils");
    if (m && m.toPn) return m;
    m = findModuleByShape(["toPn"]);
    if (m) return m;
    const api = tryRequire("WAWebApiContact");
    if (api && api.getPhoneNumber) return { toPn: function (wid) { return api.getPhoneNumber(wid); } };
    const api2 = findModuleByShape(["getPhoneNumber"]);
    if (api2) return { toPn: function (wid) { return api2.getPhoneNumber(wid); } };
    return null;
  }

  function safeCall(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  function serializeWid(wid) {
    if (!wid) return null;
    if (typeof wid === "string") return wid;
    if (wid._serialized) return wid._serialized;
    if (wid.user) {
      const u = String(wid.user);
      if (wid.isLid && wid.isLid()) return u + "@lid";
      return u + "@s.whatsapp.net";
    }
    try { return String(wid); } catch (e) { return null; }
  }

  function toPhoneFromWid(wid) {
    if (!wid) return null;
    if (typeof wid === "string") {
      if (wid.indexOf("@s.whatsapp.net") !== -1) return wid.split("@")[0];
      if (wid.indexOf("@lid") !== -1) {
        const lm = getLidMigration();
        if (lm) {
          const wf = getWidFactory();
          const w = wf ? wf.createWid(wid) : null;
          if (w) { const pn = safeCall(function () { return lm.toPn(w); }, null); if (pn) return serializeWid(pn).split("@")[0]; }
        }
        return null;
      }
      return wid;
    }
    if (wid.isLid && wid.isLid()) {
      const lm = getLidMigration();
      if (lm) { const pn = safeCall(function () { return lm.toPn(wid); }, null); if (pn) return serializeWid(pn).split("@")[0]; }
      return null;
    }
    if (wid.user) return String(wid.user);
    return null;
  }

  async function listGroups() {
    const cols = getCollections();
    const Chat = cols.Chat;
    if (!Chat) throw new Error("No se pudo acceder a la lista de chats (WAWebCollections.Chat).");
    const chats = Chat.getModelsArray ? Chat.getModelsArray() : [];
    const groups = [];
    for (const chat of chats) {
      const isGroup = chat.groupMetadata ? true : (chat.id && typeof chat.id.isGroup === "function" ? chat.id.isGroup() : false);
      if (!isGroup) continue;
      let name = "";
      name = safeCall(function () { return chat.formattedTitle; }, "") || "";
      if (!name) name = safeCall(function () { chat.name; }, "") || "";
      if (!name) name = safeCall(function () { return chat.contact && chat.contact.name; }, "") || "";
      if (!name && chat.id) name = safeCall(function () { return chat.id.user || chat.id._serialized; }, "");
      const id = serializeWid(chat.id) || "";
      if (!id) continue;
      groups.push({ id: id, name: String(name || "Sin nombre") });
    }
    return groups;
  }

  async function getParticipants(groupId) {
    const wf = getWidFactory();
    if (!wf) throw new Error("No se pudo crear el Wid (WAWebWidFactory).");
    const wid = wf.createWid(groupId);
    const cols = getCollections();
    let GroupMetaCol = cols.GroupMetadata || cols.WAWebGroupMetadataCollection;
    if (GroupMetaCol && GroupMetaCol.update) { await safeCall(async function () { await GroupMetaCol.update(wid); }, null); }
    const chat = cols.Chat && cols.Chat.get ? cols.Chat.get(wid) : null;
    let meta = chat && chat.groupMetadata ? chat.groupMetadata : (GroupMetaCol && GroupMetaCol.get ? GroupMetaCol.get(wid) : null);
    if (!meta && GroupMetaCol && GroupMetaCol.find) { meta = await safeCall(async function () { return await GroupMetaCol.find(wid); }, null); }
    if (!meta) throw new Error("No se encontró la metadata del grupo. Abre el grupo en WhatsApp Web e intenta de nuevo.");
    let parts = [];
    if (meta.participants && meta.participants.getModelsArray) parts = meta.participants.getModelsArray();
    else if (meta.participants && Array.isArray(meta.participants)) parts = meta.participants;
    else if (meta.serialize) { const s = meta.serialize(); parts = s.participants || []; }
    const out = [];
    for (const p of parts) {
      let pid = p.id ? p.id : p;
      const serialized = serializeWid(pid);
      let isAdmin = false, isSuperAdmin = false;
      if (p.isAdmin) { isAdmin = typeof p.isAdmin === "function" ? p.isAdmin() : !!p.isAdmin; }
      if (p.isSuperAdmin) { isSuperAdmin = typeof p.isSuperAdmin === "function" ? p.isSuperAdmin() : !!p.isSuperAdmin; }
      if (p.admin) { isAdmin = isAdmin || p.admin === "true" || p.admin === true; }
      out.push({ id: String(serialized || ""), isAdmin: !!isAdmin, isSuperAdmin: !!isSuperAdmin });
    }
    return out;
  }

  async function resolveContact(participantId) {
    const wf = getWidFactory();
    const cols = getCollections();
    const Contact = cols.Contact;
    if (!wf || !Contact) return { name: "", pushname: "", formattedName: "" };
    const wid = wf.createWid(participantId);
    let contact = null;
    contact = safeCall(function () { return Contact.get(wid); }, null);
    if (!contact && Contact.find) { contact = await safeCall(async function () { return await Contact.find(wid); }, null); }
    if (!contact) return { name: "", pushname: "", formattedName: "" };
    const getters = getContactGetters();
    let name = "", pushname = "", formattedName = "";
    if (getters) {
      name = safeCall(function () { return getters.getName(contact); }, "") || "";
      pushname = safeCall(function () { return getters.getPushname(contact); }, "") || "";
    }
    if (!formattedName) formattedName = safeCall(function () { return contact.formattedName; }, "") || "";
    if (!name) name = safeCall(function () { return contact.name; }, "") || formattedName;
    if (!name) name = safeCall(function () { return contact.shortName; }, "") || "";
    if (!pushname) pushname = safeCall(function () { return contact.pushname; }, "") || "";
    return { name: String(name || ""), pushname: String(pushname || ""), formattedName: String(formattedName || "") };
  }

  async function getAbout(participantId) {
    try {
      const wf = getWidFactory();
      const cols = getCollections();
      const Contact = cols.Contact;
      if (!wf || !Contact) return null;
      const wid = wf.createWid(participantId);
      let contact = safeCall(function () { return Contact.get(wid); }, null);
      if (!contact && Contact.find) { contact = await safeCall(async function () { return await Contact.find(wid); }, null); }
      if (!contact) return null;
      let about = "";
      about = safeCall(function () { return contact.about; }, "") || "";
      if (!about) about = safeCall(function () { return contact.status; }, "") || "";
      if (!about) about = safeCall(function () { return contact.statusText; }, "") || "";
      if (!about) {
        const getters = getContactGetters();
        if (getters && getters.getTextStatusString) about = safeCall(function () { return getters.getTextStatusString(contact); }, "") || "";
      }
      if (!about) {
        const Status = cols.Status || cols.TextStatus || cols.TextStatusCollection;
        if (Status && Status.get) {
          const s = safeCall(function () { return Status.get(wid); }, null);
          if (s) about = safeCall(function () { return s.status || s.text || s.statusText; }, "") || "";
        }
      }
      if (!about) {
        const Status = cols.Status || cols.TextStatus;
        if (Status && Status.find) {
          const s = await safeCall(async function () { return await Status.find(wid); }, null);
          if (s) about = safeCall(function () { return s.status || s.text || s.statusText; }, "") || "";
        }
      }
      return about ? String(about) : null;
    } catch (e) { return null; }
  }

  function getMyPhone() {
    try {
      const cols = getCollections();
      const User = tryRequire("WAWebUser");
      if (User && User.getMe) {
        const me = User.getMe();
        if (me && me.id) return toPhoneFromWid(me.id);
      }
      if (User && User.getActiveWid) {
        const wid = User.getActiveWid();
        if (wid) return toPhoneFromWid(wid);
      }
      const wf = getWidFactory();
      const cols2 = getCollections();
      const Contact = cols2.Contact;
      if (Contact && Contact.getMe) {
        const me = Contact.getMe();
        if (me && me.id) return toPhoneFromWid(me.id);
      }
      const chat = safeCall(function () {
        const c = cols.Chat;
        if (!c || !c.getModelsArray) return null;
        return c.getModelsArray().find(function (ch) { return ch.isUser && ch.isUser(); });
      }, null);
      if (chat && chat.id) return toPhoneFromWid(chat.id);
      return null;
    } catch (e) { LOG("getMyPhone error:", e.message); return null; }
  }

  function isReady() { return ready; }

  async function getStats(groupId) {
    const partsRes = { participants: await getParticipants(groupId) };
    const participants = (partsRes && partsRes.participants) || [];
    const total = participants.length;
    let admins = 0, superAdmins = 0, lidCount = 0;
    for (const p of participants) {
      if (p.isSuperAdmin) superAdmins++;
      else if (p.isAdmin) admins++;
      if (p.id && p.id.indexOf("@lid") !== -1) lidCount++;
    }
    return {
      total: total,
      admins: admins,
      superAdmins: superAdmins,
      members: total - admins - superAdmins,
      lidCount: lidCount,
      phoneCount: total - lidCount
    };
  }

  async function handleRequest(msg) {
    try {
      switch (msg.type) {
        case "ping": return { ready: isReady(), moduleRequireReady: !!moduleRequire };
        case "waitReady": await readyPromise; return { ready: true };
        case "listGroups": return { groups: await listGroups() };
        case "getParticipants": return { participants: await getParticipants(msg.groupId) };
        case "getStats": return { stats: await getStats(msg.groupId) };
        case "resolveContact": return await resolveContact(msg.participantId);
        case "getAbout": return { about: await getAbout(msg.participantId) };
        case "toPhone": return { phone: toPhoneFromWid(msg.participantId) };
        case "getMyPhone": return { phone: getMyPhone() };
        default: throw new Error("Tipo desconocido: " + msg.type);
      }
    } catch (e) {
      return { __error: String(e && e.message || e) };
    }
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.ns !== NS || !data.id) return;
    if (data.from !== "content") return;
    Promise.resolve(handleRequest(data)).then(function (result) {
      window.postMessage({ ns: NS, id: data.id, from: "inject", result: result }, "*");
    });
  });

  LOG("inject.js cargado en MAIN world");
  setupHook();
  trapRequireShortcut();
  let pollCount = 0;
  const poll = setInterval(function () {
    pollCount++;
    if (moduleRequire) { clearInterval(poll); return; }
    if (pollCount % 4 === 0) LOG("Poll #" + pollCount + ": moduleRequire=" + !!moduleRequire + " hooked=" + hooked + " chunkExists=" + !!window[CHUNK_NAME]);
    if (window[CHUNK_NAME] && !hooked) { hookChunkArray(window[CHUNK_NAME]); }
  }, 250);
  setTimeout(function () {
    clearInterval(poll);
    if (!moduleRequire) LOG("TIMEOUT: moduleRequire nunca capturado tras 120s. hook=" + hooked + " chunk=" + !!window[CHUNK_NAME]);
  }, 120000);
  readyPromise.then(function () { preloadEssentialChunks(); }).catch(function () {});

  window.__WAExtractor = { ready: readyPromise, isReady: isReady };
})();
