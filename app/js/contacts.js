// بدهی‌ها/همکاران: لیست همکاران، مجموع طلب، افزودن همکار و تسویه بدهی
(function () {
  const $ = (id) => document.getElementById(id);
  load();

  async function load() {
    try {
      const { data, error } = await sb.from("contacts").select("*").order("debt_amount", { ascending: false });
      if (error) throw error;
      render(data || []);
    } catch (e) {
      console.error(e);
      $("contacts-list").innerHTML = `<p class="text-center text-on-surface-variant py-8">خطا در بارگذاری همکاران</p>`;
    }
  }

  function render(list) {
    const total = list.reduce((s, c) => s + (c.debt_amount || 0), 0);
    $("total-debt").textContent = formatToman(total);

    if (!list.length) {
      $("contacts-list").innerHTML = `<div class="text-center text-on-surface-variant py-12 font-body-md">
        <span class="material-symbols-outlined text-5xl text-outline-variant block mb-2">group</span>
        هنوز همکاری ثبت نشده است</div>`;
      return;
    }

    $("contacts-list").innerHTML = list.map(cardHtml).join("");

    // دکمه‌های تسویه
    list.forEach((c) => {
      const btn = document.getElementById(`settle-${c.id}`);
      if (btn) btn.addEventListener("click", () => settle(c));
    });
  }

  function cardHtml(c) {
    const hasDebt = (c.debt_amount || 0) > 0;
    const initials = (c.name || "?").trim().charAt(0);
    return `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col gap-3 relative overflow-hidden hover:shadow-md transition-shadow">
      <div class="absolute right-0 top-0 bottom-0 w-1 ${hasDebt ? "bg-error" : "bg-[#1b5e20]"}"></div>
      <div class="flex flex-row-reverse items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0 font-headline-sm text-on-secondary-container">${escapeHtml(initials)}</div>
        <div class="flex-grow text-right">
          <h3 class="font-headline-sm text-base text-on-surface">${escapeHtml(c.name)}</h3>
          <p class="text-xs text-on-surface-variant">${escapeHtml(c.unit || "—")}</p>
        </div>
        <div class="text-left">
          <p class="font-data-display text-lg currency-font ${hasDebt ? "text-error" : "text-on-surface-variant"}">${formatToman(c.debt_amount || 0)}</p>
          <p class="text-[10px] text-outline">تومان بدهی</p>
        </div>
      </div>
      ${hasDebt ? `<button id="settle-${c.id}" class="w-full h-10 bg-secondary-container text-on-secondary-container rounded-lg font-label-bold text-label-bold active:scale-95 transition-transform flex items-center justify-center gap-1">
        <span class="material-symbols-outlined text-[18px]">check_circle</span> تسویه بدهی</button>` : ""}
    </div>`;
  }

  async function settle(c) {
    if (!confirm(`بدهی ${c.name} به مبلغ ${formatToman(c.debt_amount)} تومان تسویه شود؟`)) return;
    try {
      // علامت‌گذاری تراکنش‌های طلب این همکار به‌عنوان تسویه‌شده
      await sb.from("transactions")
        .update({ status: "settled" })
        .eq("contact_id", c.id)
        .eq("paid_by", "contact")
        .neq("status", "settled");
      await sb.from("contacts").update({ debt_amount: 0 }).eq("id", c.id);
      toast("بدهی تسویه شد ✅");
      load();
    } catch (e) {
      console.error(e);
      toast("خطا در تسویه بدهی", "error");
    }
  }

  // افزودن همکار جدید (با prompt ساده — بعداً می‌توان به فرم تبدیل کرد)
  $("add-contact-btn").addEventListener("click", async () => {
    const name = prompt("نام همکار:");
    if (!name || !name.trim()) return;
    const unit = prompt("واحد / دپارتمان (اختیاری):") || null;
    try {
      const { error } = await sb.from("contacts").insert({ name: name.trim(), unit, debt_amount: 0 });
      if (error) throw error;
      toast("همکار اضافه شد ✅");
      load();
    } catch (e) {
      console.error(e);
      toast("خطا در افزودن همکار", "error");
    }
  });
})();
