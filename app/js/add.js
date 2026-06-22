// فرم ثبت تراکنش: مدیریت نوع/مسئول پرداخت، آپلود عکس فاکتور و ذخیره در دیتابیس
(function () {
  const $ = (id) => document.getElementById(id);
  const cfg = window.TANKHAH_CONFIG;

  let type = "expense";   // expense | income
  let paidBy = "self";    // self | contact
  let selectedFile = null;

  // تقویم شمسی روی فیلد تاریخ (پیش‌فرض = امروز)
  JalaliPicker.attach($("date"), { iso: localDateStr() });

  // اگر از داشبورد با ?type=income آمده باشد
  const params = new URLSearchParams(location.search);
  if (params.get("type") === "income") setType("income");

  // ---- مبلغ: نمایش با جداکننده هزارگان و ارقام فارسی ----
  const amountEl = $("amount");
  amountEl.addEventListener("input", () => {
    const raw = toEn(amountEl.value).replace(/[^0-9]/g, "");
    amountEl.value = raw ? toFa(Number(raw).toLocaleString("en-US")) : "";
  });
  const amountValue = () => Number(toEn(amountEl.value).replace(/[^0-9]/g, "")) || 0;

  // ---- سوییچ نوع تراکنش ----
  document.querySelectorAll(".type-item").forEach((b) =>
    b.addEventListener("click", () => setType(b.dataset.type))
  );
  function setType(t) {
    type = t;
    document.querySelectorAll(".type-item").forEach((b) => {
      const on = b.dataset.type === t;
      b.classList.toggle("active", on);
      b.classList.toggle("text-on-surface", on);
      b.classList.toggle("text-on-surface-variant", !on);
    });
  }

  // ---- سوییچ مسئول پرداخت ----
  document.querySelectorAll(".paid-item").forEach((b) =>
    b.addEventListener("click", () => setPaid(b.dataset.paid))
  );
  function setPaid(p) {
    paidBy = p;
    document.querySelectorAll(".paid-item").forEach((b) => {
      const on = b.dataset.paid === p;
      b.classList.toggle("active", on);
      b.classList.toggle("text-on-surface", on);
      b.classList.toggle("text-on-surface-variant", !on);
    });
    $("contact-wrapper").classList.toggle("hidden", p !== "contact");
  }

  // ---- بارگذاری همکاران برای حالت طلب ----
  (async () => {
    const { data } = await sb.from("contacts").select("id,name,unit").order("name");
    const sel = $("contact-select");
    (data || []).forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.unit ? `${c.name} — ${c.unit}` : c.name;
      sel.appendChild(o);
    });
  })();

  // ---- انتخاب و پیش‌نمایش عکس ----
  const dropZone = $("drop-zone");
  const fileInput = $("file-upload");
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("bg-surface-container"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("bg-surface-container"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("bg-surface-container");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    selectedFile = file;
    const url = URL.createObjectURL(file);
    const img = $("preview");
    img.src = url;
    img.classList.remove("hidden");
    $("upload-icon").classList.add("hidden");
    $("upload-label").textContent = "تصویر انتخاب شد — برای تغییر کلیک کنید";
  }

  // ---- ثبت تراکنش ----
  $("tx-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = amountValue();
    if (amount <= 0) return toast("لطفاً مبلغ معتبر وارد کنید", "error");
    if (type === "expense" && !$("category").value) return toast("لطفاً دسته‌بندی را انتخاب کنید", "error");
    if (paidBy === "contact" && !$("contact-select").value)
      return toast("لطفاً همکار طلبکار را انتخاب کنید", "error");

    const btn = $("submit-btn");
    btn.disabled = true;
    btn.classList.add("opacity-70");
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">autorenew</span> در حال ثبت...`;

    try {
      // ۱) آپلود عکس (در صورت وجود)
      let image_url = null;
      if (selectedFile) {
        const ext = (selectedFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage
          .from(cfg.BUCKET)
          .upload(path, selectedFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        image_url = sb.storage.from(cfg.BUCKET).getPublicUrl(path).data.publicUrl;
      }

      // ۲) درج تراکنش
      const contact_id = paidBy === "contact" ? $("contact-select").value : null;
      const row = {
        title: $("title").value.trim() || null,
        amount,
        category: type === "income" ? ($("category").value || "utilities") : $("category").value,
        type,
        paid_by: type === "expense" ? paidBy : "self",
        status: type === "expense" && paidBy === "contact" ? "pending" : "confirmed",
        contact_id: type === "expense" ? contact_id : null,
        transaction_date: $("date").dataset.iso || localDateStr(),
        image_url,
      };
      const { error: insErr } = await sb.from("transactions").insert(row);
      if (insErr) throw insErr;

      // ۳) به‌روزرسانی بدهی همکار (در صورت طلب)
      if (row.contact_id) {
        const { data: c } = await sb.from("contacts").select("debt_amount").eq("id", row.contact_id).single();
        if (c) {
          await sb.from("contacts")
            .update({ debt_amount: (c.debt_amount || 0) + amount })
            .eq("id", row.contact_id);
        }
      }

      toast("تراکنش با موفقیت ثبت شد ✅");
      setTimeout(() => (location.href = "./transactions.html"), 900);
    } catch (err) {
      console.error(err);
      toast("خطا در ثبت تراکنش: " + (err.message || ""), "error");
      btn.disabled = false;
      btn.classList.remove("opacity-70");
      btn.innerHTML = `ثبت تراکنش <span class="material-symbols-outlined">check_circle</span>`;
    }
  });
})();
