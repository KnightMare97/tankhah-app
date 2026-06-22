// گارد احراز هویت — در صفحات محافظت‌شده قبل از اسکریپت صفحه لود می‌شود.
// اگر کاربر وارد نشده باشد، به صفحه‌ی ورود هدایت می‌شود.
(async function () {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      location.replace("./login.html");
      return;
    }
    // خروج خودکار هنگام باطل‌شدن نشست
    sb.auth.onAuthStateChange((event, sess) => {
      if (!sess) location.replace("./login.html");
    });
  } catch (e) {
    console.error("auth guard:", e);
    location.replace("./login.html");
  }
})();
