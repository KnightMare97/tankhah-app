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
      let q = sb.from("transactions").select("*, contacts(name)").order("transaction_date", { ascending: true });
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
        "همکار": t.contacts?.name || "",
        "وضعیت": ({ pending: "در انتظار", confirmed: "تأیید شده", settled: "تسویه شده", reimbursed: "بازپرداخت" }[t.status] || t.status),
        "لینک فاکتور": t.image_url || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 40 }];
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
})();
