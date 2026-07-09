(function () {
  "use strict";
  __CEAuth.initThemeBtn("themeBtn");
  __CEAuth.setBkUrl(window.location.origin);

  document.getElementById("loginBtn").addEventListener("click", async function () {
    const status = document.getElementById("status");
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) { __CEAuth.showStatus(status, "Introduce usuario y contraseña.", "error"); return; }

    const btn = document.getElementById("loginBtn");
    btn.disabled = true;
    __CEAuth.showStatus(status, "Iniciando sesión...", "");

    try {
      const res = await fetch(window.location.origin + "/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Error al iniciar sesión");
      __CEAuth.setToken(data.token);
      __CEAuth.showStatus(status, "Sesión iniciada. Redirigiendo...", "ok");
      setTimeout(function () { window.location.href = "admin.html"; }, 500);
    } catch (e) {
      __CEAuth.showStatus(status, e.message, "error");
      btn.disabled = false;
    }
  });

  document.getElementById("password").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("loginBtn").click();
  });
})();
