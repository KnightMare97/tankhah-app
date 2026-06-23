// بدهی‌ها/همکاران: لیست + افزودن/ویرایش/حذف + تسویه
// بدهی هر همکار از روی تراکنش‌های «طلب» تسویه‌نشده محاسبه می‌شود (تک‌منبع حقیقت).
(function () {
  const $ = (id) => document.getElementById(id);
  load();

  async function load() {
    try {
      const [{ data: contacts, error: e1 }, { data: txns, error: e2 }] = await Promise.all([
        sb.from("contacts").select("*").order("name"),
        sb.from("transactions").select("amount,contact_id,status").eq("paid_by", "contact").eq("type", "expense"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const debtMap = {};
      (txns || []).forEach((t) => {
        if (t.contact_id && t.status !== "settled" && t.status !== "reimbursed") {
          debtMap[t.contact_id] = (debtMap[t.contact_id] || 0) + t.amount;
        }
      });
      const list = (contacts || []).map((c) => ({ ...c, _debt: debtMap[c.id] || 0 }))
        .sort((a, b) => b._debt - a._debt);
      render(list);
    } catch (e) {
      console.error(e);
      $("contacts-list").innerHTML = `<p class="text-center text-on-surface-variant py-8">خطا در بارگذاری همکاران</p>`;
    }
  }

  function render(list) {
    $("total-debt").textContent = formatToman(list.reduce((s, c) => s + c._debt, 0));

    if (!list.length) {
      $("contacts-list").innerHTML = `<div class="text-center text-on-surface-variant py-12 font-body-md">
        <span class="material-symbols-outlined text-5xl text-outline-variant block mb-2">group</span>
        هنوز همکاری ثبت نشده است<br/><span class="text-xs">از دکمه‌ی + بالا اضافه کنید</span></div>`;
      return;
    }

    $("contacts-list").innerHTML = list.map(cardHtml).join("");
    list.forEach((c) => {
      const settleBtn = document.getElementById(`settle-${c.id}`);
      if (settleBtn) settleBtn.addEventListener("click", () => settle(c));
      document.getElementById(`menu-${c.id}`).addEventListener("click", () => openMenu(c));
    });
  }

  function cardHtml(c) {
    const hasDebt = c._debt > 0;
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
          <p class="font-data-display text-lg currency-font ${hasDebt ? "text-error" : "text-on-surface-variant"}">${formatToman(c._debt)}</p>
          <p class="text-[10px] text-outline">تومان بدهی</p>
        </div>
        <button id="menu-${c.id}" class="w-9 h-9 rounded-full hover:bg-surface-container-low flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-on-surface-variant">more_vert</span>
        </button>
      </div>
      ${hasDebt ? `<button id="settle-${c.id}" class="w-full h-10 bg-secondary-container text-on-secondary-container rounded-lg font-label-bold text-label-bold active:scale-95 transition-transform flex items-center justify-center gap-1">
        <span class="material-symbols-outlined text-[18px]">check_circle</span> تسویه بدهی</button>` : ""}
    </div>`;
  }

  async function openMenu(c) {
    const items = [];
    if (c._debt > 0) items.push({ label: "تسویه بدهی", icon: "check_circle", value: "settle" });
    items.push({ label: "ویرایش همکار", icon: "edit", value: "edit" });
    items.push({ label: "حذف همکار", icon: "delete", value: "delete", danger: true });
    const choice = await Modal.actions({ title: c.name, items });
    if (choice === "settle") settle(c);
    else if (choice === "edit") editContact(c);
    else if (choice === "delete") deleteContact(c);
  }

  async function settle(c) {
    const ok = await Modal.confirm({
      title: "تسویه بدهی",
      message: `بدهی «${c.name}» به مبلغ ${formatToman(c._debt)} تومان تسویه شود؟`,
      confirmText: "تسویه",
    });
    if (!ok) return;
    try {
      const { error } = await sb.from("transactions")
        .update({ status: "settled" })
        .eq("contact_id", c.id).eq("paid_by", "contact").neq("status", "settled");
      if (error) throw error;
      toast("بدهی تسویه شد ✅");
      load();
    } catch (e) { console.error(e); toast("خطا در تسویه بدهی", "error"); }
  }

  async function editContact(c) {
    const vals = await Modal.form({
      title: "ویرایش همکار",
      fields: [
        { id: "name", label: "نام همکار", value: c.name, required: true },
        { id: "unit", label: "واحد / دپارتمان", value: c.unit || "", placeholder: "اختیاری" },
      ],
      submitText: "ذخیره",
    });
    if (!vals) return;
    try {
      const { error } = await sb.from("contacts").update({ name: vals.name, unit: vals.unit || null }).eq("id", c.id);
      if (error) throw error;
      toast("ویرایش شد ✅");
      load();
    } catch (e) { console.error(e); toast("خطا در ویرایش", "error"); }
  }

  async function deleteContact(c) {
    const msg = c._debt > 0
      ? `«${c.name}» ${formatToman(c._debt)} تومان بدهی باز دارد. با حذف، تراکنش‌های مرتبط بدون همکار می‌مانند. حذف شود؟`
      : `«${c.name}» حذف شود؟`;
    const ok = await Modal.confirm({ title: "حذف همکار", message: msg, confirmText: "حذف", danger: true });
    if (!ok) return;
    try {
      const { error } = await sb.from("contacts").delete().eq("id", c.id);
      if (error) throw error;
      toast("همکار حذف شد");
      load();
    } catch (e) { console.error(e); toast("خطا در حذف", "error"); }
  }

  // افزودن همکار
  $("add-contact-btn").addEventListener("click", async () => {
    const vals = await Modal.form({
      title: "افزودن همکار",
      fields: [
        { id: "name", label: "نام همکار", required: true, placeholder: "مثلاً: علی محمدی" },
        { id: "unit", label: "واحد / دپارتمان", placeholder: "اختیاری" },
      ],
      submitText: "افزودن",
    });
    if (!vals) return;
    try {
      const { error } = await sb.from("contacts").insert({ name: vals.name, unit: vals.unit || null, debt_amount: 0 });
      if (error) throw error;
      toast("همکار اضافه شد ✅");
      load();
    } catch (e) { console.error(e); toast("خطا در افزودن همکار", "error"); }
  });
})();
