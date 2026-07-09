// theme.js — lógica de tema light/dark compartida entre login, signup y admin
(function () {
  const THEME_KEY = "ce_admin_theme";
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = saved || (prefersDark ? "dark" : "light");
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