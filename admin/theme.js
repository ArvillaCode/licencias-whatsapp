// theme.js — Upfunnel: dark by default
(function () {
  const THEME_KEY = "ce_admin_theme";
  const saved = localStorage.getItem(THEME_KEY);
  const initial = saved || "dark";
  document.documentElement.setAttribute("data-theme", initial);

  window.__CETheme = {
    current: function () { return document.documentElement.getAttribute("data-theme"); },
    toggle: function () {
      const next = window.__CETheme.current() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      window.__CETheme.onToggle && window.__CETheme.onToggle(next);
      return next;
    },
    set: function (t) {
      document.documentElement.setAttribute("data-theme", t);
      localStorage.setItem(THEME_KEY, t);
      window.__CETheme.onToggle && window.__CETheme.onToggle(t);
    },
    onToggle: null
  };
})();