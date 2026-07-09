(function () {
  "use strict";
  __CEAuth.initThemeBtn("themeBtn");
  __CEAuth.setBkUrl(window.location.origin);

  document.getElementById("signupBtn").addEventListener("click", async function () {
    const status = document.getElementById("status");
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const password2 = document.getElementById("password2").value;

    if (!username || !password) { __CEAuth.showStatus(status, "Completa todos los campos.", "error"); return; }
    if (username.length < 3) { __CEAuth.showStatus(status, "Usuario mínimo 3 caracteres.", "error"); return; }
    if (password.length < 6) { __CEAuth.showStatus(status, "Contraseña mínimo 6 caracteres.", "error"); return; }
    if (password !== password2) { __CEAuth.showStatus(status, "Las contraseñas no coinciden.", "error"); return; }

    const btn = document.getElementById("signupBtn");
    btn.disabled = true;
    __CEAuth.showStatus(status, "Creando cuenta...", "");

    try {
      const res = await fetch(window.location.origin + "/admin/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Error al crear cuenta");
      __CEAuth.setToken(data.token);
      __CEAuth.showStatus(status, "Cuenta creada. Redirigiendo al panel...", "ok");
      setTimeout(function () { window.location.href = "admin.html"; }, 500);
    } catch (e) {
      __CEAuth.showStatus(status, e.message, "error");
      btn.disabled = false;
    }
  });
})();