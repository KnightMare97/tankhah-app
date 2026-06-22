// صفحه‌ی ورود
(async function () {
  const $ = (id) => document.getElementById(id);

  // اگر از قبل وارد شده، مستقیم به داشبورد
  const { data: { session } } = await sb.auth.getSession();
  if (session) { location.replace("./index.html"); return; }

  // نمایش/مخفی رمز
  $("toggle-pw").addEventListener("click", () => {
    const p = $("password");
    p.type = p.type === "password" ? "text" : "password";
    $("toggle-pw").querySelector("span").textContent = p.type === "password" ? "visibility" : "visibility_off";
  });

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("login-btn");
    const err = $("error");
    err.classList.add("hidden");
    btn.disabled = true;
    btn.classList.add("opacity-70");
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">autorenew</span> در حال ورود...`;

    const { error } = await sb.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value,
    });

    if (error) {
      err.textContent = "ایمیل یا رمز عبور اشتباه است";
      err.classList.remove("hidden");
      btn.disabled = false;
      btn.classList.remove("opacity-70");
      btn.innerHTML = `ورود <span class="material-symbols-outlined">login</span>`;
      return;
    }
    location.replace("./index.html");
  });
})();
