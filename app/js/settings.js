// تنظیمات: خروجی اکسل (xlsx) و پاکسازی تاریخچه
(function () {
  const $ = (id) => document.getElementById(id);

  // نمایش ایمیل کاربر + خروج + تغییر رمز
  (async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (user) $("user-email").textContent = user.email;
  })();

  $("logout-btn").addEventListener("click", async () => {
    await sb.auth.signOut();
    location.replace("./login.html");
  });

  $("change-pw-btn").addEventListener("click", async () => {
    const vals = await Modal.form({
      title: "تغییر رمز عبور",
      fields: [{ id: "pw", label: "رمز عبور جدید (حداقل ۶ کاراکتر)", type: "password", required: true, placeholder: "••••••••" }],
      submitText: "تغییر رمز",
    });
    if (!vals) return;
    if (vals.pw.length < 6) return toast("رمز باید حداقل ۶ کاراکتر باشد", "error");
    const { error } = await sb.auth.updateUser({ password: vals.pw });
    if (error) return toast("خطا در تغییر رمز: " + error.message, "error");
    toast("رمز عبور تغییر کرد ✅");
  });

  // پیش‌فرض بازه: ابتدای ماه شمسی جاری تا امروز (تقویم شمسی)
  const today = new Date();
  const jt = JDate.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  JalaliPicker.attach($("to-date"), { iso: localDateStr(today) });
  JalaliPicker.attach($("from-date"), { iso: JDate.jalaaliToIso(jt.jy, jt.jm, 1) });

  // ---- خروجی اکسل ----
  $("export-btn").addEventListener("click", async () => {
    const btn = $("export-btn");
    const icon = $("export-icon");
    const text = $("export-text");
    btn.disabled = true;
    icon.textContent = "autorenew";
    icon.classList.add("animate-spin");
    text.textContent = "در حال پردازش...";

    try {
      let q = sb.from("transactions").select("*, contacts(name), cards(name)").order("transaction_date", { ascending: true });
      const fromIso = $("from-date").dataset.iso;
      const toIso = $("to-date").dataset.iso;
      if (fromIso) q = q.gte("transaction_date", fromIso);
      if (toIso) q = q.lte("transaction_date", toIso);
      const { data, error } = await q;
      if (error) throw error;

      if (!data || !data.length) {
        toast("تراکنشی در این بازه یافت نشد", "error");
        return;
      }

      const rows = data.map((t) => ({
        "تاریخ": t.transaction_date,
        "شرح / فروشنده": t.title || "",
        "دسته‌بندی": categoryMeta(t.category).label,
        "نوع": t.type === "income" ? "شارژ" : "هزینه",
        "مبلغ (تومان)": t.amount,
        "مسئول پرداخت": t.paid_by === "contact" ? "همکار (طلب)" : "صندوق",
        "کارت": t.cards?.name || "",
        "همکار": t.contacts?.name || "",
        "وضعیت": ({ pending: "در انتظار", confirmed: "تأیید شده", settled: "تسویه شده", reimbursed: "بازپرداخت" }[t.status] || t.status),
        "لینک فاکتور": t.image_url || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 40 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "تنخواه");
      XLSX.writeFile(wb, `tankhah-${fromIso || "all"}_${toIso || "all"}.xlsx`);

      icon.classList.remove("animate-spin");
      icon.textContent = "check";
      text.textContent = "آماده شد!";
      toast("فایل اکسل ساخته شد ✅");
    } catch (e) {
      console.error(e);
      toast("خطا در ساخت فایل اکسل", "error");
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        icon.classList.remove("animate-spin");
        icon.textContent = "download";
        text.textContent = "ساخت فایل اکسل";
      }, 1800);
    }
  });

  // ---- پاکسازی تاریخچه ----
  $("reset-btn").addEventListener("click", async () => {
    const ok = await Modal.confirm({
      title: "پاکسازی تاریخچه",
      message: "تمام تراکنش‌ها برای همیشه پاک می‌شوند. این عمل قابل بازگشت نیست. مطمئنید؟",
      confirmText: "پاک کن", danger: true,
    });
    if (!ok) return;
    try {
      const { error } = await sb.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast("تاریخچه پاک شد ✅");
    } catch (e) {
      console.error(e);
      toast("خطا در پاکسازی", "error");
    }
  });

  // ---- مدیریت کارت‌ها / کیف‌پول‌ها ----
  loadCards();

  async function loadCards() {
    try {
      const [{ data: cards, error: e1 }, { data: txns, error: e2 }] = await Promise.all([
        sb.from("cards").select("*").order("name"),
        sb.from("transactions").select("amount,type,paid_by,card_id"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const bal = cardBalances(txns);
      renderCards((cards || []).map((c) => ({ ...c, _bal: bal[c.id] || 0 })));
    } catch (e) {
      console.error(e);
      $("cards-list").innerHTML = `<p class="text-center text-on-surface-variant py-4 text-sm">خطا در بارگذاری کارت‌ها</p>`;
    }
  }

  function renderCards(list) {
    if (!list.length) {
      $("cards-list").innerHTML = `<div class="text-center text-on-surface-variant py-6 text-sm border border-dashed border-outline-variant rounded-lg">هنوز کارتی تعریف نشده — با دکمه‌ی «افزودن» شروع کنید</div>`;
      return;
    }
    $("cards-list").innerHTML = list.map((c) => `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center justify-between">
        <div class="flex items-center gap-3 flex-row-reverse">
          <div class="w-10 h-10 bg-secondary-fixed rounded-lg flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-on-secondary-container">credit_card</span>
          </div>
          <div class="text-right">
            <div class="font-body-lg text-on-surface">${escapeHtml(c.name)}</div>
            <div class="text-xs currency-font ${c._bal < 0 ? "text-error" : "text-on-surface-variant"}">موجودی: ${c._bal < 0 ? "−" : ""}${formatToman(c._bal)} تومان</div>
          </div>
        </div>
        <button data-card="${c.id}" class="w-9 h-9 rounded-full hover:bg-surface-container-low flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-on-surface-variant">more_vert</span>
        </button>
      </div>`).join("");
    $("cards-list").querySelectorAll("[data-card]").forEach((b) =>
      b.addEventListener("click", () => openCardMenu(list.find((x) => x.id === b.dataset.card))));
  }

  async function openCardMenu(c) {
    const choice = await Modal.actions({
      title: c.name,
      items: [
        { label: "ویرایش نام", icon: "edit", value: "edit" },
        { label: "حذف کارت", icon: "delete", value: "delete", danger: true },
      ],
    });
    if (choice === "edit") editCard(c);
    else if (choice === "delete") deleteCard(c);
  }

  async function editCard(c) {
    const vals = await Modal.form({
      title: "ویرایش کارت",
      fields: [{ id: "name", label: "نام کارت / کیف‌پول", value: c.name, required: true }],
      submitText: "ذخیره",
    });
    if (!vals) return;
    const { error } = await sb.from("cards").update({ name: vals.name }).eq("id", c.id);
    if (error) { console.error(error); return toast("خطا در ویرایش", "error"); }
    toast("ویرایش شد ✅");
    loadCards();
  }

  async function deleteCard(c) {
    const msg = c._bal !== 0
      ? `«${c.name}» موجودی ${c._bal < 0 ? "−" : ""}${formatToman(c._bal)} تومان دارد. با حذف، تراکنش‌هایش بدون کارت می‌مانند (پاک نمی‌شوند). حذف شود؟`
      : `«${c.name}» حذف شود؟`;
    const ok = await Modal.confirm({ title: "حذف کارت", message: msg, confirmText: "حذف", danger: true });
    if (!ok) return;
    const { error } = await sb.from("cards").delete().eq("id", c.id);
    if (error) { console.error(error); return toast("خطا در حذف", "error"); }
    toast("کارت حذف شد");
    loadCards();
  }

  $("add-card-btn").addEventListener("click", async () => {
    const vals = await Modal.form({
      title: "افزودن کارت",
      fields: [{ id: "name", label: "نام کارت / کیف‌پول", required: true, placeholder: "مثلاً: کارت ملت یا کیف‌پول اسنپ" }],
      submitText: "افزودن",
    });
    if (!vals) return;
    const { error } = await sb.from("cards").insert({ name: vals.name });
    if (error) { console.error(error); return toast("خطا در افزودن کارت", "error"); }
    toast("کارت اضافه شد ✅");
    loadCards();
  });
})();
