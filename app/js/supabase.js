// ساخت کلاینت Supabase (از روی UMD لود شده در <head>)
// خروجی به صورت window.sb در دسترس کل اپ قرار می‌گیرد.
(function () {
  const cfg = window.TANKHAH_CONFIG;
  if (!window.supabase || !window.supabase.createClient) {
    console.error("کتابخانه supabase-js لود نشده است.");
    return;
  }
  window.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
})();
