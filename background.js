// Service worker: mantiene viva la campaña de envío masivo en segundo plano.
//
// El bucle de envío vive en el content script (necesita el contexto de la página de
// WhatsApp Web), pero una pestaña en segundo plano puede ser descartada por Chrome o
// recargada, matando el bucle. Este worker:
//   1. Marca la pestaña de WhatsApp como NO descartable mientras haya campaña activa.
//   2. Programa un latido (chrome.alarms) que "pincha" al content script cada 30s
//      para reanudarlo si quedó a medias y para detectar cuándo terminó.
"use strict";

const ALARM = "bulkHeartbeat";
let waTabId = null;

// Al instalar/actualizar/recargar la extensión, recargar las pestañas de WhatsApp
// Web para que carguen el content.js / inject.js nuevos. Sin esto, el script
// inyectado en el MAIN world persiste con la versión vieja hasta recargar a mano
// (causa del recurrente "this.findImpl..." / "Tipo desconocido: sendText").
chrome.runtime.onInstalled.addListener(function () {
  chrome.tabs.query({ url: "https://web.whatsapp.com/*" }).then(function (tabs) {
    (tabs || []).forEach(function (t) {
      if (t.id != null) { try { chrome.tabs.reload(t.id); } catch (e) {} }
    });
  }).catch(function () {});
});

function findWaTab() {
  return chrome.tabs.query({ url: "https://web.whatsapp.com/*" })
    .then(function (tabs) { return tabs && tabs.length ? tabs[0].id : null; })
    .catch(function () { return null; });
}

function setDiscardable(tabId, discardable) {
  if (tabId == null) return;
  try { chrome.tabs.update(tabId, { autoDiscardable: discardable }).catch(function () {}); } catch (e) {}
}

function startKeepAlive() {
  chrome.alarms.create(ALARM, { periodInMinutes: 0.5 });
  setDiscardable(waTabId, false);
}

function stopKeepAlive() {
  chrome.alarms.clear(ALARM);
  setDiscardable(waTabId, true);
  waTabId = null;
}

chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (!msg || !msg.bg) return;
  if (msg.bg === "bulkStarted") {
    if (sender && sender.tab && sender.tab.id != null) waTabId = sender.tab.id;
    startKeepAlive();
  } else if (msg.bg === "bulkEnded") {
    stopKeepAlive();
  }
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name !== ALARM) return;
  // El worker pudo haberse reiniciado (perdiendo waTabId): re-localizar la pestaña.
  var resolveTab = waTabId != null ? Promise.resolve(waTabId) : findWaTab();
  resolveTab.then(function (tabId) {
    if (tabId == null) { chrome.alarms.clear(ALARM); return; }
    waTabId = tabId;
    setDiscardable(tabId, false);
    chrome.tabs.sendMessage(tabId, { cmd: "bulkHeartbeat" }, function (res) {
      if (chrome.runtime.lastError) return; // pestaña sin content script todavía
      if (res && res.active === false) stopKeepAlive();
    });
  });
});
