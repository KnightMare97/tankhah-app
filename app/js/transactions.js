// لیست تراکنش‌ها: بارگذاری، گروه‌بندی بر اساس روز، فیلتر و جستجو
(function () {
  const $ = (id) => document.getElementById(id);
  let ALL = [];
  let filter = "all";
  let query = "";

  load();

  async function load() {
    try {
      const { data, error } = await sb
        .from("transactions")
        .select("*, contacts(name)")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      ALL = data || [];
      render();
    } catch (e) {
      console.error(e);
      $("tx-groups").innerHTML =
        `<p class="text-center text-on-surface-variant py-8">خطا در بارگذاری تراکنش‌ها</p>`;
    }
  }

  // فیلترها
  document.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      document.querySelectorAll(".filter-chip").forEach((b) => {
        b.classList.remove("bg-primary", "text-on-primary");
        b.classList.add("bg-surface-container-highest", "text-on-surface-variant");
      });
      btn.classList.add("bg-primary", "text-on-primary");
      btn.classList.remove("bg-surface-container-highest", "text-on-surface-variant");
      render();
    });
  });

  $("search").addEventListener("input", (e) => {
    query = toEn(e.target.value).trim().toLowerCase();
    render();
  });

  function matches(t) {
    if (filter === "expense" && t.type !== "expense") return false;
    if (filter === "income" && t.type !== "income") return false;
    if (filter === "debt" && !(t.type === "expense" && t.paid_by === "contact")) return false;
    if (query) {
      const hay = `${t.title || ""} ${categoryMeta(t.category).label} ${t.contacts?.name || ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  }

  function render() {
    const items = ALL.filter(matches);
    const box = $("tx-groups");
    if (!items.length) {
      box.innerHTML = `<div class="text-center text-on-surface-variant py-12 font-body-md">
        <span class="material-symbols-outlined text-5xl text-outline-variant block mb-2">receipt_long</span>
        تراکنشی برای نمایش وجود ندارد</div>`;
      return;
    }

    // گروه‌بندی بر اساس تاریخ
    const groups = {};
    for (const t of items) {
      (groups[t.transaction_date] ||= []).push(t);
    }

    box.innerHTML = Object.keys(groups)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => {
        const list = groups[date];
        const sum = list.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
        return `
      <div class="space-y-3">
        <div class="flex justify-between items-center border-b border-outline-variant pb-2">
          <span class="font-label-bold text-label-bold text-on-surface-variant">${dayLabel(date)}</span>
          <span class="font-label-bold text-label-bold text-outline">مجموع: ${formatSigned(sum)}</span>
        </div>
        <div class="space-y-2">${list.map(itemHtml).join("")}</div>
      </div>`;
      })
      .join("");
  }

  function itemHtml(t) {
    const c = categoryMeta(t.category);
    const isIncome = t.type === "income";
    const isDebt = t.type === "expense" && t.paid_by === "contact";
    const stripColor = isIncome ? "bg-[#1b5e20]" : isDebt ? "bg-secondary-container" : "bg-error";
    const iconBg = isIncome ? "bg-tertiary-fixed" : isDebt ? "bg-secondary-fixed" : "bg-error-container";
    const iconFg = isIncome ? "text-on-tertiary-fixed" : isDebt ? "text-on-secondary-container" : "text-error";
    const amountColor = isIncome ? "" : isDebt ? "text-secondary" : "text-error";
    const amountStyle = isIncome ? 'style="color:#1b5e20"' : "";
    const sign = isIncome ? "+" : "−";
    const subtitle = [c.label, t.contacts?.name].filter(Boolean).join(" • ") + " • " + timeOf(t.created_at);

    return `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-row-reverse items-center gap-4 hover:bg-surface-container-low transition-colors cursor-pointer relative overflow-hidden">
      <div class="absolute right-0 top-0 bottom-0 w-1 ${stripColor}"></div>
      <div class="w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0">
        <span class="material-symbols-outlined ${iconFg}">${isIncome ? "payments" : c.icon}</span>
      </div>
      <div class="flex-grow text-right">
        <h3 class="font-headline-sm text-sm text-on-surface">${escapeHtml(t.title || c.label)}</h3>
        <p class="text-xs text-on-surface-variant">${escapeHtml(subtitle)}</p>
      </div>
      <div class="text-left">
        <p class="font-data-display text-lg ${amountColor} currency-font" ${amountStyle}>${sign}${formatToman(t.amount)}</p>
        <p class="text-[10px] text-outline">تومان</p>
      </div>
    </div>`;
  }

  function dayLabel(date) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(date + "T00:00:00");
    const diff = Math.round((today - d) / 86400000);
    if (diff === 0) return "امروز - " + formatJalaliShort(date);
    if (diff === 1) return "دیروز - " + formatJalaliShort(date);
    return formatJalali(date);
  }
})();
