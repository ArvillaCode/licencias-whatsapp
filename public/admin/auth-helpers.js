// auth-helpers.js — utilidades compartidas para login, signup y admin
window.__CEAuth = {
  JWT_KEY: "ce_admin_jwt",
  BK_URL_KEY: "ce_admin_bk_url",
  getToken: function () { return localStorage.getItem(window.__CEAuth.JWT_KEY); },
  setToken: function (t) { localStorage.setItem(window.__CEAuth.JWT_KEY, t); },
  clearToken: function () { localStorage.removeItem(window.__CEAuth.JWT_KEY); },
  getBkUrl: function () {
    return (localStorage.getItem(window.__CEAuth.BK_URL_KEY) || "").replace(/\/$/, "") || "";
  },
  setBkUrl: function (url) { localStorage.setItem(window.__CEAuth.BK_URL_KEY, url); },

  // Pre-fill backend URL field and save on change
  initBkField: function (inputEl) {
    inputEl.value = window.__CEAuth.getBkUrl();
    inputEl.addEventListener("change", function () {
      window.__CEAuth.setBkUrl(inputEl.value.trim().replace(/\/$/, "").replace(/\/admin$/, ""));
    });
  },

  // Fetch wrapper that adds JWT auth header automatically
  fetch: async function (path, opts) {
    const url = window.__CEAuth.getBkUrl() + path;
    const token = window.__CEAuth.getToken();
    const headers = Object.assign({ "Content-Type": "application/json" }, (opts && opts.headers) || {});
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(url, Object.assign({}, opts, { headers: headers }));
    const data = await res.json().catch(function () { return {}; });
    if (res.status === 401) {
      window.__CEAuth.clearToken();
      window.location.href = "login.html";
      throw new Error("No autorizado");
    }
    if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
    return data;
  },

  showStatus: function (el, msg, kind) {
    el.className = "status show " + (kind || "");
    el.textContent = msg;
  },

  initThemeBtn: function (btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    function update() { btn.textContent = window.__CETheme.current() === "dark" ? "☀️" : "🌙"; }
    update();
    window.__CETheme.onToggle = update;
    btn.addEventListener("click", function () { window.__CETheme.toggle(); });
  }
};