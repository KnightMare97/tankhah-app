// لیست تراکنش‌ها: بارگذاری، گروه‌بندی بر اساس روز، فیلتر و جستجو
(function () {
  const $ = (id) => document.getElementById(id);
  let ALL = [];
  let filter = "all";
  let query = "";

  const TG_PLANE = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M21.9 4.3 18.7 19.4c-.24 1.07-.88 1.33-1.78.83l-4.92-3.63-2.37 2.28c-.26.26-.48.48-.99.48l.35-5 9.1-8.22c.4-.35-.09-.55-.61-.2L4.62 13.1.78 11.9c-1.04-.33-1.06-1.04.22-1.54L20.6 2.84c.86-.32 1.62.2 1.3 1.46z"/></svg>`;
  const TG_SYNC = `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 6V3L8 7l4 4V8a4 4 0 0 1 4 4h2a6 6 0 0 0-6-6zm0 12a4 4 0 0 1-4-4H6a6 6 0 0 0 6 6v3l4-4-4-4v3z"/></svg>`;

  // نشانگر وضعیت تلگرام برای هر تراکنش
  function tgChip(t) {
    if (t.telegram_message_id && t.telegram_synced)
      return `<span title="ارسال‌شده به تلگرام" style="flex:none;color:#229ED9;display:inline-flex;align-items:center;">${TG_PLANE}</span>`;
    if (t.telegram_message_id && !t.telegram_synced)
      return `<span title="تغییر کرده — در تلگرام به‌روز نشده" style="flex:none;display:inline-flex;align-items:center;gap:3px;background:#fff6e7;color:#8a5300;border-radius:5px;padding:1px 5px;font-size:9px;font-weight:800;">${TG_SYNC}تغییر کرده</span>`;
    return "";
  }

  load();

  async function load() {
    try {
      const { data, error } = await sb
        .from("transactions")
        .select("*, contacts(name), cards(name)")
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
    if (filter === "debt" && !((t.type === "expense" && t.paid_by === "contact") || t.type === "settlement")) return false;
    if (query) {
      const hay = `${t.title || ""} ${categoryMeta(t.category).label} ${t.contacts?.name || ""} ${t.cards?.name || ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  }

  function render() {
    const items = ALL.filter(matches);
    const box = $("tx-groups");
    if (!items.length) {
      box.innerHTML = `<div style="background:#fff;border:1px solid #dbe3ee;border-radius:10px;box-shadow:0 1px 2px rgba(19,27,46,.06);padding:30px 18px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;">
        <span style="width:52px;height:52px;border-radius:50%;background:#e9f0f8;color:#131b2e;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="27" height="27" fill="currentColor"><rect x="3" y="5" width="18" height="2.6" rx="1.3"/><rect x="3" y="10.7" width="18" height="2.6" rx="1.3"/><rect x="3" y="16.4" width="12" height="2.6" rx="1.3"/></svg></span>
        <span style="font-size:14.5px;font-weight:800;color:#131b2e;">تراکنشی برای نمایش نیست</span></div>`;
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

    // لمس هر تراکنش → منوی ویرایش/حذف
    box.querySelectorAll("[data-tx]").forEach((el) =>
      el.addEventListener("click", () => openTxMenu(el.dataset.tx)));
  }

  async function openTxMenu(id) {
    const t = ALL.find((x) => x.id === id);
    if (!t) return;
    const isSettlement = t.type === "settlement";
    const label = t.title || (isSettlement ? "تسویه" : categoryMeta(t.category).label);

    // اقدام‌های تلگرام بسته به وضعیت
    const tgItems = [];
    if (!t.telegram_message_id) tgItems.push({ label: "الان بفرست به تلگرام", icon: "send", value: "tg_send" });
    else if (!t.telegram_synced) tgItems.push({ label: "به‌روزرسانی در تلگرام", icon: "sync", value: "tg_update" });

    // تسویه از طریق فرم ثبت ویرایش نمی‌شود؛ فقط حذف
    const items = isSettlement
      ? [...tgItems, { label: "حذف تسویه", icon: "delete", value: "delete", danger: true }]
      : [{ label: "ویرایش", icon: "edit", value: "edit" }, ...tgItems, { label: "حذف", icon: "delete", value: "delete", danger: true }];
    const choice = await Modal.actions({ title: escapeHtml(label), items });
    if (choice === "edit") {
      location.href = "./add.html?id=" + encodeURIComponent(id);
    } else if (choice === "tg_send" || choice === "tg_update") {
      toast(choice === "tg_send" ? "در حال ارسال به تلگرام…" : "در حال به‌روزرسانی…");
      const res = await telegramNotify(choice === "tg_send" ? "send" : "update", id);
      if (!res.ok) return toast("تلگرام ناموفق: " + (res.error || ""), "error");
      t.telegram_message_id = res.message_id ?? t.telegram_message_id;
      t.telegram_synced = true;
      render();
      toast(choice === "tg_send" ? "به تلگرام ارسال شد ✈️" : "در تلگرام به‌روزرسانی شد ✈️");
    } else if (choice === "delete") {
      const ok = await Modal.confirm({
        title: isSettlement ? "حذف تسویه" : "حذف تراکنش",
        message: `«${label}» به مبلغ ${formatToman(t.amount)} تومان حذف شود؟`,
        confirmText: "حذف", danger: true,
      });
      if (!ok) return;
      // اگر این تراکنش به تلگرام رفته، هر بار بپرس پیام تلگرام هم حذف شود یا نه
      if (t.telegram_message_id) {
        const alsoTg = await Modal.confirm({
          title: "پیام تلگرام",
          message: "پیام این تراکنش در گروه «تنخواه فراز» هم حذف شود؟",
          confirmText: "بله، حذف شود", cancelText: "نه، بماند", danger: true,
        });
        if (alsoTg) {
          const r = await telegramNotify("delete", id);
          if (!r.ok) toast("حذف پیام تلگرام ناموفق بود: " + (r.error || ""), "error");
        }
      }
      const { error } = await sb.from("transactions").delete().eq("id", id);
      if (error) { console.error(error); return toast("خطا در حذف", "error"); }
      // حذف فایل فاکتور از Storage (جلوگیری از فایل بی‌استفاده)
      const bucket = window.TANKHAH_CONFIG.BUCKET;
      const marker = "/" + bucket + "/";
      const at = (t.image_url || "").indexOf(marker);
      if (at !== -1) sb.storage.from(bucket).remove([decodeURIComponent(t.image_url.slice(at + marker.length))]);
      toast("تراکنش حذف شد");
      ALL = ALL.filter((x) => x.id !== id);
      render();
    }
  }

  function itemHtml(t) {
    const c = categoryMeta(t.category);
    const isIncome = t.type === "income";
    const isSettlement = t.type === "settlement";
    const isDebt = t.type === "expense" && t.paid_by === "contact";
    const strip = isIncome ? "#1f9d57" : isSettlement ? "#00695c" : isDebt ? "#fea619" : "#ba1a1a";
    const amtColor = isIncome ? "#1f9d57" : isSettlement ? "#00695c" : isDebt ? "#c47a00" : "#ba1a1a";
    const sign = isIncome ? "+" : "−";
    const icon = isIncome ? "payments" : isSettlement ? "handshake" : c.icon;
    const heading = t.title || (isSettlement ? "تسویه" : c.label);
    const parts = [];
    if (!isIncome && !isSettlement) parts.push(c.label);
    if (t.cards?.name) parts.push(t.cards.name);
    if (t.contacts?.name) parts.push(t.contacts.name);
    const subtitle = (parts.length ? parts.join(" • ") + " • " : "") + timeOf(t.created_at);

    return `
    <div data-tx="${t.id}" style="position:relative;background:#fff;border:1px solid #dbe3ee;border-radius:10px;box-shadow:0 1px 2px rgba(19,27,46,.06);padding:13px;display:flex;flex-direction:row-reverse;align-items:center;gap:13px;cursor:pointer;overflow:hidden;">
      <div style="position:absolute;top:0;bottom:0;right:0;width:5px;background:${strip};"></div>
      <div style="width:44px;height:44px;border-radius:9px;background:#e9f0f8;display:flex;align-items:center;justify-content:center;flex:none;"><span class="material-symbols-outlined" style="color:#131b2e;">${icon}</span></div>
      <div style="flex:1;min-width:0;text-align:right;">
        <div style="font-size:14px;font-weight:800;color:#131b2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(heading)}</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#8a93a6;margin-top:2px;">${tgChip(t)}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">${escapeHtml(subtitle)}</span></div>
      </div>
      <div style="text-align:left;flex:none;">
        <div class="currency-font" style="font-size:16px;font-weight:800;color:${amtColor};">${sign}${formatToman(t.amount)}</div>
        <div style="font-size:10px;color:#8a93a6;">تومان</div>
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
