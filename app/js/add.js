// فرم ثبت/ویرایش تراکنش
// سه حالت: هزینه (expense/self) | شارژ (income) | طلب همکار (expense/contact)
(function () {
  const $ = (id) => document.getElementById(id);
  const cfg = window.TANKHAH_CONFIG;
  const params = new URLSearchParams(location.search);
  const editId = params.get("id");

  let kind = "expense";   // expense | income | debt
  let selectedFile = null;
  let original = null;    // رکورد اصلی در حالت ویرایش

  // نگاشت حالت سه‌گانه به ستون‌های دیتابیس
  const typeOf = (k) => (k === "income" ? "income" : "expense");
  const paidOf = (k) => (k === "debt" ? "contact" : "self");

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

  // ---- انتخاب سه‌حالته ----
  document.querySelectorAll(".kind-item").forEach((b) =>
    b.addEventListener("click", () => setKind(b.dataset.kind)));

  function setKind(k) {
    kind = k;
    document.querySelectorAll(".kind-item").forEach((b) => {
      const on = b.dataset.kind === k;
      b.classList.toggle("active", on);
      b.classList.toggle("text-on-surface", on);
      b.classList.toggle("text-on-surface-variant", !on);
    });
    // نمایش فیلدها بر اساس حالت
    $("category-block").classList.toggle("hidden", k === "income"); // دسته فقط برای هزینه/طلب
    $("card-block").classList.toggle("hidden", k === "debt");       // کارت برای هزینه/شارژ
    $("contact-wrapper").classList.toggle("hidden", k !== "debt");  // همکار فقط برای طلب
    updateLabels();
  }

  function updateLabels() {
    const hint = {
      expense: "پرداخت از صندوق/کارت خودت.",
      income: "واریز پول به صندوق/کارت تنخواه.",
      debt: "همکار از جیب خودش پرداخت کرده و طلبکار است.",
    }[kind];
    $("kind-hint").textContent = hint;

    $("page-title").textContent = editId ? "ویرایش تراکنش"
      : kind === "income" ? "شارژ تنخواه" : kind === "debt" ? "ثبت طلب همکار" : "ثبت هزینه";

    $("card-label").textContent = kind === "income" ? "واریز به کدام کارت؟" : "از کدام کارت؟";

    $("title-label").textContent = kind === "income" ? "بابت (اختیاری)" : "شرح یا فروشنده";
    $("title").placeholder = kind === "income"
      ? "مثلاً: واریز از حساب مرکزی"
      : kind === "debt" ? "مثلاً: خرید ناهار تیمی" : "مثلاً: خرید ملزومات اداری";

    const submitText = editId ? "ذخیره تغییرات"
      : kind === "income" ? "ثبت شارژ" : kind === "debt" ? "ثبت طلب" : "ثبت هزینه";
    $("submit-btn").innerHTML = `${submitText} <span class="material-symbols-outlined">check_circle</span>`;
  }

  // افزودن گزینه‌ی «+ جدید» به انتهای یک select
  function appendNewOption(sel, label) {
    const o = document.createElement("option");
    o.value = "__new__";
    o.textContent = label;
    sel.appendChild(o);
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
    appendNewOption(sel, "+ همکار جدید…");
  })();

  // ---- بارگذاری کارت‌ها (+ پیش‌انتخاب وقتی فقط یک کارت هست) ----
  const cardsReady = (async () => {
    const { data } = await sb.from("cards").select("id,name").order("name");
    const sel = $("card-select");
    (data || []).forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      sel.appendChild(o);
    });
    appendNewOption(sel, "+ کارت جدید…");
    if (!editId && (data || []).length === 1) sel.value = data[0].id;
  })();

  // افزودن همکار/کارت بدون ترک فرم
  $("contact-select").addEventListener("change", async (e) => {
    if (e.target.value !== "__new__") return;
    e.target.value = "";
    const vals = await Modal.form({
      title: "افزودن همکار",
      fields: [
        { id: "name", label: "نام همکار", required: true, placeholder: "مثلاً: علی محمدی" },
        { id: "unit", label: "واحد / دپارتمان", placeholder: "اختیاری" },
      ],
      submitText: "افزودن",
    });
    if (!vals) return;
    const { data, error } = await sb.from("contacts").insert({ name: vals.name, unit: vals.unit || null }).select().single();
    if (error) return toast("خطا در افزودن همکار", "error");
    const o = document.createElement("option");
    o.value = data.id;
    o.textContent = data.unit ? `${data.name} — ${data.unit}` : data.name;
    e.target.insertBefore(o, e.target.querySelector('option[value="__new__"]'));
    e.target.value = data.id;
    toast("همکار اضافه شد ✅");
  });

  $("card-select").addEventListener("change", async (e) => {
    if (e.target.value !== "__new__") return;
    e.target.value = "";
    const vals = await Modal.form({
      title: "افزودن کارت",
      fields: [{ id: "name", label: "نام کارت / کیف‌پول", required: true, placeholder: "مثلاً: کارت ملت یا کیف‌پول اسنپ" }],
      submitText: "افزودن",
    });
    if (!vals) return;
    const { data, error } = await sb.from("cards").insert({ name: vals.name }).select().single();
    if (error) return toast("خطا در افزودن کارت", "error");
    const o = document.createElement("option");
    o.value = data.id;
    o.textContent = data.name;
    e.target.insertBefore(o, e.target.querySelector('option[value="__new__"]'));
    e.target.value = data.id;
    toast("کارت اضافه شد ✅");
  });

  // ---- انتخاب و پیش‌نمایش عکس/فایل ----
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
    if (!file) return;
    const isImg = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImg && !isPdf) return toast("فقط عکس یا فایل PDF مجاز است", "error");
    selectedFile = file;
    if (isImg) showPreview(URL.createObjectURL(file), "تصویر انتخاب شد — برای تغییر بزنید");
    else showFileChosen("فایل PDF انتخاب شد — برای تغییر بزنید");
  }
  function showPreview(url, label) {
    const img = $("preview");
    img.src = url;
    img.classList.remove("hidden");
    $("upload-icon").classList.add("hidden");
    $("upload-label").textContent = label;
  }
  function showFileChosen(label) {
    $("preview").classList.add("hidden");
    const icon = $("upload-icon");
    icon.classList.remove("hidden");
    icon.textContent = "picture_as_pdf";
    $("upload-label").textContent = label;
  }

  // مسیر فایل داخل باکت از روی لینک عمومی (برای حذف فایل قدیمی)
  function storagePath(url) {
    if (!url) return null;
    const marker = "/" + cfg.BUCKET + "/";
    const i = url.indexOf(marker);
    return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
  }

  // ---- مقداردهی اولیه (حالت جدید یا ویرایش) ----
  (async () => {
    if (editId) {
      const { data, error } = await sb.from("transactions").select("*").eq("id", editId).single();
      if (error || !data) { toast("تراکنش یافت نشد", "error"); return; }
      original = data;
      const k = data.type === "income" ? "income" : (data.paid_by === "contact" ? "debt" : "expense");
      setKind(k);
      setAmount(data.amount);
      $("title").value = data.title || "";
      if (data.category) $("category").value = data.category;
      if (data.transaction_date) {
        $("date").dataset.iso = data.transaction_date;
        $("date").value = JalaliPicker.shamsiText(data.transaction_date);
      }
      if (k === "debt" && data.contact_id) {
        await contactsReady;
        $("contact-select").value = data.contact_id;
      }
      if (data.card_id) { await cardsReady; $("card-select").value = data.card_id; }
      if (data.image_url) {
        if (/\.pdf($|\?)/i.test(data.image_url)) showFileChosen("فایل فعلی — برای تغییر بزنید");
        else showPreview(data.image_url, "تصویر فعلی — برای تغییر بزنید");
      }
    } else {
      $("date").dataset.iso = localDateStr();
      $("date").value = JalaliPicker.shamsiText(localDateStr());
      setKind(params.get("type") === "income" ? "income" : "expense");
      // باز شدن سریع کیبورد روی مبلغ
      setTimeout(() => amountEl.focus(), 350);
    }
  })();

  // ---- ثبت / ذخیره ----
  $("tx-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = amountValue();
    if (amount <= 0) return toast("لطفاً مبلغ معتبر وارد کنید", "error");
    if (kind !== "income" && !$("category").value) return toast("لطفاً دسته‌بندی را انتخاب کنید", "error");
    if (kind === "debt" && !$("contact-select").value)
      return toast("لطفاً همکار طلبکار را انتخاب کنید", "error");

    const btn = $("submit-btn");
    btn.disabled = true;
    btn.classList.add("opacity-70");
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">autorenew</span> در حال ذخیره...`;

    try {
      // آپلود فایل جدید (در صورت انتخاب)
      let image_url = original ? original.image_url : null;
      if (selectedFile) {
        const ext = (selectedFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage.from(cfg.BUCKET)
          .upload(path, selectedFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        image_url = sb.storage.from(cfg.BUCKET).getPublicUrl(path).data.publicUrl;
      }

      const isDebt = kind === "debt";
      const row = {
        title: $("title").value.trim() || null,
        amount,
        category: kind === "income" ? null : $("category").value,
        type: typeOf(kind),
        paid_by: paidOf(kind),
        status: !isDebt ? "confirmed" : (original ? original.status : "pending"),
        contact_id: isDebt ? $("contact-select").value : null,
        card_id: isDebt ? null : ($("card-select").value || null),
        transaction_date: $("date").dataset.iso || localDateStr(),
        image_url,
      };

      if (editId) {
        const { error } = await sb.from("transactions").update(row).eq("id", editId);
        if (error) throw error;
        // حذف فایل قدیمی پس از جایگزینی موفق (جلوگیری از انباشت فایل بی‌استفاده)
        if (selectedFile && original && original.image_url && original.image_url !== image_url) {
          const old = storagePath(original.image_url);
          if (old) sb.storage.from(cfg.BUCKET).remove([old]);
        }
        toast("تغییرات ذخیره شد ✅");
      } else {
        const { error } = await sb.from("transactions").insert(row);
        if (error) throw error;
        toast(kind === "income" ? "شارژ ثبت شد ✅" : "تراکنش ثبت شد ✅");
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
