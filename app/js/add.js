// فرم ثبت/ویرایش تراکنش: نوع (هزینه/شارژ)، مسئول پرداخت، آپلود عکس، ذخیره در دیتابیس
(function () {
  const $ = (id) => document.getElementById(id);
  const cfg = window.TANKHAH_CONFIG;
  const params = new URLSearchParams(location.search);
  const editId = params.get("id");

  let type = "expense";   // expense | income(شارژ)
  let paidBy = "self";    // self | contact
  let selectedFile = null;
  let original = null;    // رکورد اصلی در حالت ویرایش

  // تقویم شمسی روی فیلد تاریخ
  JalaliPicker.attach($("date"), { iso: localDateStr() });

  // ---- مبلغ: جداکننده هزارگان + ارقام فارسی ----
  const amountEl = $("amount");
  amountEl.addEventListener("input", () => {
    const raw = toEn(amountEl.value).replace(/[^0-9]/g, "");
    amountEl.value = raw ? toFa(Number(raw).toLocaleString("en-US")) : "";
  });
  const setAmount = (n) => (amountEl.value = n ? toFa(Number(n).toLocaleString("en-US")) : "");
  const amountValue = () => Number(toEn(amountEl.value).replace(/[^0-9]/g, "")) || 0;

  // ---- سوییچ‌ها ----
  document.querySelectorAll(".type-item").forEach((b) =>
    b.addEventListener("click", () => setType(b.dataset.type)));
  document.querySelectorAll(".paid-item").forEach((b) =>
    b.addEventListener("click", () => setPaid(b.dataset.paid)));

  function setType(t) {
    type = t;
    document.querySelectorAll(".type-item").forEach((b) => {
      const on = b.dataset.type === t;
      b.classList.toggle("active", on);
      b.classList.toggle("text-on-surface", on);
      b.classList.toggle("text-on-surface-variant", !on);
    });
    // در حالت شارژ (درآمد) فیلدهای نامربوط مخفی می‌شوند
    const income = t === "income";
    $("payer-block").classList.toggle("hidden", income);
    $("category-block").classList.toggle("hidden", income);
    if (income) { setPaid("self"); $("contact-wrapper").classList.add("hidden"); }
    updateLabels();
  }

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

  function updateLabels() {
    const income = type === "income";
    $("page-title").textContent = editId ? "ویرایش تراکنش" : income ? "شارژ تنخواه" : "ثبت تراکنش";
    $("title-label").textContent = income ? "بابت (اختیاری)" : "شرح یا فروشنده";
    $("title").placeholder = income ? "مثلاً: واریز از حساب مرکزی" : "مثلاً: خرید ملزومات اداری";
    const submitText = editId ? "ذخیره تغییرات" : income ? "ثبت شارژ" : "ثبت تراکنش";
    $("submit-btn").innerHTML = `${submitText} <span class="material-symbols-outlined">check_circle</span>`;
  }

  // ---- بارگذاری همکاران ----
  const contactsReady = (async () => {
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
    showPreview(URL.createObjectURL(file), "تصویر انتخاب شد — برای تغییر کلیک کنید");
  }
  function showPreview(url, label) {
    const img = $("preview");
    img.src = url;
    img.classList.remove("hidden");
    $("upload-icon").classList.add("hidden");
    $("upload-label").textContent = label;
  }

  // ---- مقداردهی اولیه (حالت جدید یا ویرایش) ----
  (async () => {
    if (editId) {
      const { data, error } = await sb.from("transactions").select("*").eq("id", editId).single();
      if (error || !data) { toast("تراکنش یافت نشد", "error"); return; }
      original = data;
      setType(data.type);
      setAmount(data.amount);
      $("title").value = data.title || "";
      if (data.category) $("category").value = data.category;
      if (data.transaction_date) {
        $("date").dataset.iso = data.transaction_date;
        $("date").value = JalaliPicker.shamsiText(data.transaction_date);
      }
      if (data.type === "expense") {
        setPaid(data.paid_by);
        if (data.paid_by === "contact" && data.contact_id) {
          await contactsReady;
          $("contact-select").value = data.contact_id;
        }
      }
      if (data.image_url) showPreview(data.image_url, "تصویر فعلی — برای تغییر کلیک کنید");
    } else {
      $("date").dataset.iso = localDateStr();
      $("date").value = JalaliPicker.shamsiText(localDateStr());
      if (params.get("type") === "income") setType("income");
      else setType("expense");
    }
    updateLabels();
  })();

  // ---- ثبت / ذخیره ----
  $("tx-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = amountValue();
    if (amount <= 0) return toast("لطفاً مبلغ معتبر وارد کنید", "error");
    if (type === "expense" && !$("category").value) return toast("لطفاً دسته‌بندی را انتخاب کنید", "error");
    if (type === "expense" && paidBy === "contact" && !$("contact-select").value)
      return toast("لطفاً همکار طلبکار را انتخاب کنید", "error");

    const btn = $("submit-btn");
    btn.disabled = true;
    btn.classList.add("opacity-70");
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">autorenew</span> در حال ذخیره...`;

    try {
      // آپلود عکس جدید (در صورت انتخاب)
      let image_url = original ? original.image_url : null;
      if (selectedFile) {
        const ext = (selectedFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage.from(cfg.BUCKET)
          .upload(path, selectedFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        image_url = sb.storage.from(cfg.BUCKET).getPublicUrl(path).data.publicUrl;
      }

      const isContactDebt = type === "expense" && paidBy === "contact";
      const row = {
        title: $("title").value.trim() || null,
        amount,
        category: type === "expense" ? $("category").value : null,
        type,
        paid_by: type === "expense" ? paidBy : "self",
        status: !isContactDebt ? "confirmed" : (original ? original.status : "pending"),
        contact_id: isContactDebt ? $("contact-select").value : null,
        transaction_date: $("date").dataset.iso || localDateStr(),
        image_url,
      };

      if (editId) {
        const { error } = await sb.from("transactions").update(row).eq("id", editId);
        if (error) throw error;
        toast("تغییرات ذخیره شد ✅");
      } else {
        const { error } = await sb.from("transactions").insert(row);
        if (error) throw error;
        toast(type === "income" ? "شارژ ثبت شد ✅" : "تراکنش ثبت شد ✅");
      }
      setTimeout(() => (location.href = "./transactions.html"), 800);
    } catch (err) {
      console.error(err);
      toast("خطا در ذخیره: " + (err.message || ""), "error");
      btn.disabled = false;
      btn.classList.remove("opacity-70");
      updateLabels();
    }
  });
})();
