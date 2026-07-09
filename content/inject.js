(function () {
  "use strict";

  const CHUNK_NAME = "webpackChunkwhatsapp_web_client";
  const NS = "__waextract";
  // Generación de esta instancia. Si el content script inyecta inject.js más de una
  // vez (p. ej. tras recargar la extensión sin recargar la página), pueden coexistir
  // varios listeners; solo el más reciente debe responder para no servir código viejo.
  const MY_GEN = (window.__waextractGen = (window.__waextractGen || 0) + 1);
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

  const ZERO_WIDTH_CHARS = ['\u200B', '\u200C', '\u200D', '\uFEFF', '\u2060', '\u2061', '\u2062', '\u2063'];

  function injectInvisibleText(text) {
    const len = Math.floor(Math.random() * 6) + 3;
    let payload = '';
    for (let i = 0; i < len; i++) payload += ZERO_WIDTH_CHARS[Math.floor(Math.random() * ZERO_WIDTH_CHARS.length)];
    const mode = Math.floor(Math.random() * 3);
    if (mode === 0) return text + payload;
    if (mode === 1) {
      const words = text.split(' ');
      const pos = Math.floor(Math.random() * words.length);
      words[pos] += payload;
      return words.join(' ');
    }
    const parts = text.split('');
    for (let i = 0; i < payload.length; i++) parts.splice(Math.floor(Math.random() * parts.length), 0, payload[i]);
    return parts.join('');
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
    if (!ready) await readyPromise;
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
    if (!ready) await readyPromise;
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
        if (me && me.id) {
          const ph = toPhoneFromWid(me.id);
          if (ph) return ph;
        }
      }
      if (User && User.getActiveWid) {
        const wid = User.getActiveWid();
        if (wid) {
          const ph = toPhoneFromWid(wid);
          if (ph) return ph;
        }
      }
      const wf = getWidFactory();
      if (wf && wf.getMeWid) {
        const myWid = safeCall(function () { return wf.getMeWid(); }, null);
        if (myWid) {
          const ph = toPhoneFromWid(myWid);
          if (ph) return ph;
        }
      }
      if (wf && wf.getDidWid) {
        const myWid2 = safeCall(function () { return wf.getDidWid(); }, null);
        if (myWid2) {
          const ph = toPhoneFromWid(myWid2);
          if (ph) return ph;
        }
      }
      const cols2 = getCollections();
      const Contact = cols2.Contact;
      if (Contact && Contact.getMe) {
        const me = Contact.getMe();
        if (me && me.id) {
          const ph = toPhoneFromWid(me.id);
          if (ph) return ph;
        }
      }
      if (Contact && Contact.getModelsArray) {
        const all = Contact.getModelsArray();
        const myContact = all.find(function (c) { return c.isMe && c.isMe(); });
        if (myContact && myContact.id) {
          const ph = toPhoneFromWid(myContact.id);
          if (ph) return ph;
        }
      }
      const chat = safeCall(function () {
        const c = cols.Chat;
        if (!c || !c.getModelsArray) return null;
        return c.getModelsArray().find(function (ch) { return ch.isUser && ch.isUser(); });
      }, null);
      if (chat && chat.id) {
        const ph = toPhoneFromWid(chat.id);
        if (ph) return ph;
      }
      const myWidFromStore = safeCall(function () {
        const Store = tryRequire("WAWebStore");
        if (Store && Store.ConnectedPayload && Store.ConnectedPayload.getMe) {
          return Store.ConnectedPayload.getMe();
        }
        return null;
      }, null);
      if (myWidFromStore && myWidFromStore.id) {
        const ph = toPhoneFromWid(myWidFromStore.id);
        if (ph) return ph;
      }
      const myPhoneFromDOM = safeCall(function () {
        const meta = document.querySelector('meta[name="description"]');
        if (meta && meta.content) {
          const m = meta.content.match(/(\d{10,15})/);
          if (m) return m[1];
        }
        const title = document.title || "";
        const tm = title.match(/(\d{10,15})/);
        if (tm) return tm[1];
        return null;
      }, null);
      if (myPhoneFromDOM) return myPhoneFromDOM;
      return null;
    } catch (e) { LOG("getMyPhone error:", e.message); return null; }
  }

  function isReady() { return ready; }

  async function getMyPhoneFromIDB() {
    try {
      const dbs = await indexedDB.databases();
      for (const dbInfo of dbs) {
        if (!dbInfo || !dbInfo.name) continue;
        try {
          const db = await new Promise(function (resolve, reject) {
            const req = indexedDB.open(dbInfo.name, dbInfo.version);
            req.onerror = function () { reject(req.error); };
            req.onsuccess = function () { resolve(req.result); };
          });
          const storeNames = Array.from(db.objectStoreNames);
          for (const storeName of storeNames) {
            try {
              const allKeys = await new Promise(function (resolve) {
                const tx = db.transaction(storeName, "readonly");
                const store = tx.objectStore(storeName);
                const req = store.getAllKeys();
                req.onsuccess = function () { resolve(req.result || []); };
                req.onerror = function () { resolve([]); };
              });
              for (const key of allKeys) {
                const keyStr = String(key);
                if (keyStr.indexOf("@s.whatsapp.net") !== -1) {
                  const phone = keyStr.split("@")[0];
                  if (phone && phone.length >= 10 && /^\d+$/.test(phone)) {
                    db.close();
                    return phone;
                  }
                }
              }
            } catch (e) {}
          }
          db.close();
        } catch (e) {}
      }
      return null;
    } catch (e) { LOG("getMyPhoneFromIDB error:", e.message); return null; }
  }

  async function preScanPhones(groupId) {
    const participants = await getParticipants(groupId);
    const total = participants.length;
    let withPhone = 0;
    let withoutPhone = 0;
    const phoneParticipants = [];
    const noPhoneIds = [];
    for (let i = 0; i < total; i++) {
      const p = participants[i];
      const phone = toPhoneFromWid(p.id);
      if (phone) {
        withPhone++;
        phoneParticipants.push({ id: p.id, isAdmin: p.isAdmin, isSuperAdmin: p.isSuperAdmin });
      } else {
        withoutPhone++;
        noPhoneIds.push(p.id);
      }
    }
    return {
      total: total,
      withPhone: withPhone,
      withoutPhone: withoutPhone,
      phoneParticipants: phoneParticipants,
      noPhoneIds: noPhoneIds
    };
  }

  async function getStats(groupId) {
    if (!ready) await readyPromise;
    const partsRes = { participants: await getParticipants(groupId) };
    const participants = (partsRes && partsRes.participants) || [];
    const total = participants.length;
    let admins = 0, superAdmins = 0, phoneCount = 0;
    for (const p of participants) {
      if (p.isSuperAdmin) superAdmins++;
      else if (p.isAdmin) admins++;
      const phone = toPhoneFromWid(p.id);
      if (phone) phoneCount++;
    }
    return {
      total: total,
      admins: admins,
      superAdmins: superAdmins,
      members: total - admins - superAdmins,
      lidCount: total - phoneCount,
      phoneCount: phoneCount
    };
  }

  // Descubrimiento memoizado de los módulos de envío (findModuleByShape recorre
  // todos los módulos, así que se hace una sola vez).
  let _sendActionMod = undefined;   // { sendTextMsgToChat }
  let _addSendMod = undefined;      // { addAndSendMsgToChat }
  function getSendAction() {
    if (_sendActionMod === undefined) _sendActionMod = findModuleByShape(["sendTextMsgToChat"]) || null;
    return _sendActionMod;
  }
  function getAddSend() {
    if (_addSendMod === undefined) _addSendMod = findModuleByShape(["addAndSendMsgToChat"]) || null;
    return _addSendMod;
  }

  function getMsgKey() {
    const m = tryRequire("WAWebMsgKey");
    if (m && m.createMsgKey) return m;
    const m2 = findModuleByShape(["createMsgKey", "create"]);
    return m2 || null;
  }

  // Último recurso: construir el mensaje a mano con un MsgKey válido y usar
  // addAndSendMsgToChat. Es lo más frágil (depende de la forma interna del msg),
  // por eso solo se usa si las APIs de alto nivel no están disponibles.
  async function sendViaAddAndSend(chat, wid, textWithInvisible) {
    const mod = getAddSend();
    if (!mod || !mod.addAndSendMsgToChat) throw new Error("addAndSendMsgToChat no disponible");
    let msgId = null;
    try {
      const km = getMsgKey();
      if (km) {
        const newId = (km.newId && km.newId()) ||
                      (km.MsgKey && km.MsgKey.newId && km.MsgKey.newId()) || null;
        const createKey = km.createMsgKey || (km.MsgKey && km.MsgKey.create) || km.create;
        if (newId && createKey) msgId = createKey({ fromMe: true, remote: wid, id: newId, self: "out" });
      }
    } catch (e) { msgId = null; }
    const msg = {
      body: textWithInvisible, type: "chat", subtype: null,
      t: Math.floor(Date.now() / 1000), from: chat.id, to: wid,
      self: "out", isNewMsg: true, local: true, ack: 0
    };
    if (msgId) msg.id = msgId;
    const result = await mod.addAndSendMsgToChat(chat, msg);
    if (result && result[0] && typeof result[0].then === "function") await result[0];
    return { ok: true, msgId: (msgId && msgId.toString) ? msgId.toString() : null };
  }

  async function sendTextMessage(chatId, text) {
    if (!ready) await readyPromise;
    const wf = getWidFactory();
    if (!wf) throw new Error("WidFactory no disponible");
    const wid = wf.createWid(chatId);
    const cols = getCollections();
    const Chat = cols.Chat;
    if (!Chat) throw new Error("Chat collection no disponible");
    let chat = Chat.get ? Chat.get(wid) : null;
    if (!chat && Chat.find) chat = await Chat.find(wid);
    if (!chat) throw new Error("Chat no encontrado: " + chatId);
    const textWithInvisible = injectInvisibleText(text);

    // Se prueban varias estrategias de envío en orden de robustez. Las de alto nivel
    // construyen el modelo del mensaje (y su MsgKey) internamente, evitando los
    // errores del tipo "this.findImpl is not a function" al manipular objetos crudos.
    const strategies = [];
    // 1) Método del propio modelo Chat, si existe (el más estable entre versiones).
    if (chat && typeof chat.sendMessage === "function") {
      strategies.push(["chat.sendMessage", async function () {
        const r = await chat.sendMessage(textWithInvisible);
        return { ok: true, msgId: r && r.id ? String(r.id) : null };
      }]);
    }
    // 2) Acción de alto nivel sendTextMsgToChat(chat, text): arma todo internamente.
    const action = getSendAction();
    if (action && typeof action.sendTextMsgToChat === "function") {
      strategies.push(["sendTextMsgToChat", async function () {
        await action.sendTextMsgToChat(chat, textWithInvisible, {});
        return { ok: true };
      }]);
    }
    // 3) Último recurso: construcción manual + addAndSendMsgToChat.
    if (getAddSend()) {
      strategies.push(["addAndSendMsgToChat", function () {
        return sendViaAddAndSend(chat, wid, textWithInvisible);
      }]);
    }

    if (!strategies.length) throw new Error("No hay API de envío disponible en esta versión de WhatsApp Web");

    let lastErr = null;
    for (let s = 0; s < strategies.length; s++) {
      const name = strategies[s][0], fn = strategies[s][1];
      try {
        const out = await fn();
        LOG("Enviado vía " + name);
        return out;
      } catch (e) {
        lastErr = e;
        LOG("Estrategia '" + name + "' falló: " + String(e && e.message || e));
      }
    }
    throw new Error("Envío falló (" + strategies.length + " estrategias): " + String(lastErr && lastErr.message || lastErr));
  }

  async function handleRequest(msg) {
    try {
      switch (msg.type) {
        case "ping": return { ready: isReady(), moduleRequireReady: !!moduleRequire, caps: ["sendText", "preScan", "getStats"] };
        case "waitReady": await readyPromise; return { ready: true };
        case "listGroups": return { groups: await listGroups() };
        case "getParticipants": return { participants: await getParticipants(msg.groupId) };
        case "preScan": return { scan: await preScanPhones(msg.groupId) };
        case "getStats": return { stats: await getStats(msg.groupId) };
        case "resolveContact": return await resolveContact(msg.participantId);
        case "getAbout": return { about: await getAbout(msg.participantId) };
        case "toPhone": return { phone: toPhoneFromWid(msg.participantId) };
        case "getMyPhone": return { phone: getMyPhone() };
        case "getMyPhoneAsync": return { phone: await getMyPhoneFromIDB() };
        case "sendText": return await sendTextMessage(msg.chatId, msg.text);
        default: throw new Error("Tipo desconocido: " + msg.type);
      }
    } catch (e) {
      return { __error: String(e && e.message || e) };
    }
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    if (window.__waextractGen !== MY_GEN) return; // una instancia más nueva tomó el control
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
