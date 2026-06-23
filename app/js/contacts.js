// بدهی‌ها/همکاران: لیست + افزودن/ویرایش/حذف + تسویه
// بدهی هر همکار از روی تراکنش‌های «طلب» تسویه‌نشده محاسبه می‌شود (تک‌منبع حقیقت).
(function () {
  const $ = (id) => document.getElementById(id);
  load();

  async function load() {
    try {
      const [{ data: contacts, error: e1 }, { data: txns, error: e2 }] = await Promise.all([
        sb.from("contacts").select("*").order("name"),
        sb.from("transactions").select("amount,contact_id,type,paid_by").not("contact_id", "is", null),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      // بدهی هر همکار = مجموع طلب‌ها − مجموع تسویه‌ها
      const debtMap = {};
      (txns || []).forEach((t) => {
        if (!t.contact_id) return;
        if (t.type === "settlement") debtMap[t.contact_id] = (debtMap[t.contact_id] || 0) - t.amount;
        else if (t.paid_by === "contact") debtMap[t.contact_id] = (debtMap[t.contact_id] || 0) + t.amount;
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
      $("contacts-list").innerHTML = `<div style="background:#fff;border:1px solid #dbe3ee;border-radius:10px;box-shadow:0 1px 2px rgba(19,27,46,.06);padding:26px 18px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;">
        <span style="width:50px;height:50px;border-radius:50%;background:#e9f0f8;color:#131b2e;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><circle cx="9" cy="8" r="3.4"/><path d="M2.6 19.2c0-3.2 2.86-5.4 6.4-5.4s6.4 2.2 6.4 5.4v.8H2.6z"/><circle cx="17.6" cy="9" r="2.7"/><path d="M16 14.1c3 .1 5.4 2 5.4 4.9v.8h-4.2v-.6c0-2-.86-3.8-2.2-5.1z"/></svg></span>
        <span style="font-size:14.5px;font-weight:800;color:#131b2e;">هنوز همکاری ثبت نشده</span>
        <span style="font-size:12.5px;color:#5b647a;">از دکمه‌ی + بالا یک همکار اضافه کنید.</span></div>`;
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
    <div style="position:relative;background:#fff;border:1px solid #dbe3ee;border-radius:10px;box-shadow:0 1px 2px rgba(19,27,46,.06);padding:15px;overflow:hidden;">
      <div style="position:absolute;top:0;bottom:0;right:0;width:5px;background:${hasDebt ? "#ba1a1a" : "#1f9d57"};"></div>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:46px;height:46px;border-radius:50%;background:#e9f0f8;display:flex;align-items:center;justify-content:center;flex:none;font-size:18px;font-weight:800;color:#131b2e;">${escapeHtml(initials)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:800;color:#131b2e;">${escapeHtml(c.name)}</div>
          <div style="font-size:11.5px;color:#8a93a6;">${escapeHtml(c.unit || "—")}</div>
        </div>
        <div style="text-align:left;">
          <div class="currency-font" style="font-size:17px;font-weight:800;color:${hasDebt ? "#ba1a1a" : "#8a93a6"};">${formatToman(c._debt)}</div>
          <div style="font-size:10px;color:#8a93a6;">تومان بدهی</div>
        </div>
        <button id="menu-${c.id}" style="width:36px;height:36px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer;color:#8a93a6;"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
      </div>
      ${hasDebt ? `<button id="settle-${c.id}" style="margin-top:12px;width:100%;height:42px;background:#fea619;color:#131b2e;border:none;border-radius:9px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;"><svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20.4 7.8 19 6.4z"/></svg>ثبت تسویه</button>` : ""}
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
    if (c._debt <= 0) return;
    // کارت‌ها برای انتخاب منبع پرداخت تسویه
    const { data: cards } = await sb.from("cards").select("id,name").order("name");
    const cardOpts = [{ value: "", label: "بدون کارت" }].concat((cards || []).map((x) => ({ value: x.id, label: x.name })));

    const vals = await Modal.form({
      title: `تسویه با ${c.name}`,
      fields: [
        { id: "amount", label: "مبلغ تسویه (تومان)", inputmode: "numeric", value: String(c._debt), required: true, hint: `بدهی فعلی: ${formatToman(c._debt)} تومان — برای تسویه‌ی جزئی مبلغ کمتری بزن.` },
        { id: "card", label: "از کدام کارت پرداخت شد؟", type: "select", options: cardOpts, value: "" },
      ],
      submitText: "ثبت تسویه",
    });
    if (!vals) return;
    const amount = Number(toEn(vals.amount).replace(/[^0-9]/g, "")) || 0;
    if (amount <= 0) return toast("مبلغ تسویه نامعتبر است", "error");
    if (amount > c._debt) return toast("مبلغ تسویه نباید بیشتر از بدهی باشد", "error");
    try {
      const { error } = await sb.from("transactions").insert({
        type: "settlement",
        amount,
        contact_id: c.id,
        card_id: vals.card || null,
        paid_by: "self",
        status: "confirmed",
        title: `تسویه طلب ${c.name}`,
        transaction_date: localDateStr(),
      });
      if (error) throw error;
      toast(amount >= c._debt ? "بدهی کامل تسویه شد ✅" : "تسویه‌ی جزئی ثبت شد ✅");
      load();
    } catch (e) { console.error(e); toast("خطا در ثبت تسویه", "error"); }
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
      const { error } = await sb.from("contacts").insert({ name: vals.name, unit: vals.unit || null });
      if (error) throw error;
      toast("همکار اضافه شد ✅");
      load();
    } catch (e) { console.error(e); toast("خطا در افزودن همکار", "error"); }
  });
})();
