// فرم ثبت/ویرایش تراکنش (بازطراحی جهت ۳)
// سه حالت: هزینه (expense/self) | شارژ (income) | طلب همکار (expense/contact)
(function () {
  const $ = (id) => document.getElementById(id);
  const cfg = window.TANKHAH_CONFIG;
  const params = new URLSearchParams(location.search);
  const editId = params.get("id");

  let kind = "expense";   // expense | income | debt
  let selectedFile = null;
  let original = null;
  let selectedCard = "";  // شناسه‌ی کارت انتخاب‌شده ("" = بدون کارت)
  let cardList = [];

  const CHECK = `<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20.4 7.8 19 6.4z"/></svg>`;
  const CHECK_SM = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20.4 7.8 19 6.4z"/></svg>`;
  const PLUS_SM = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M10.7 4h2.6v6.7H20v2.6h-6.7V20h-2.6v-6.7H4v-2.6h6.7z"/></svg>`;
  const CARD_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="2.5" y="5" width="19" height="14" rx="3"/><rect x="2.5" y="8.2" width="19" height="2.6" fill="#fea619"/></svg>`;
  const CASH_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8" fill="#fea619"/></svg>`;

  const typeOf = (k) => (k === "income" ? "income" : "expense");
  const paidOf = (k) => (k === "debt" ? "contact" : "self");

  JalaliPicker.attach($("date"), { iso: localDateStr() });

  // ---- مبلغ ----
  const amountEl = $("amount");
  amountEl.addEventListener("input", () => {
    const raw = toEn(amountEl.value).replace(/[^0-9]/g, "");
    amountEl.value = raw ? toFa(Number(raw).toLocaleString("en-US")) : "";
    renderQuickActive(raw);
  });
  const setAmount = (n) => (amountEl.value = n ? toFa(Number(n).toLocaleString("en-US")) : "");
  const amountValue = () => Number(toEn(amountEl.value).replace(/[^0-9]/g, "")) || 0;

  // چیپ‌های مبلغ سریع
  document.querySelectorAll(".quick").forEach((b) =>
    b.addEventListener("click", () => { setAmount(b.dataset.amount); renderQuickActive(b.dataset.amount); }));
  function renderQuickActive(val) {
    document.querySelectorAll(".quick").forEach((b) => {
      const on = String(b.dataset.amount) === String(val);
      b.style.border = on ? "1.5px solid #fea619" : "1.5px solid #dbe3ee";
      b.style.background = on ? "#fff6e7" : "#fff";
      b.style.color = on ? "#8a5300" : "#46506a";
    });
  }

  // ---- انتخاب سه‌حالته ----
  document.querySelectorAll(".kind-item").forEach((b) =>
    b.addEventListener("click", () => setKind(b.dataset.kind)));

  function setKind(k) {
    kind = k;
    document.querySelectorAll(".kind-item").forEach((b) => {
      const on = b.dataset.kind === k;
      b.style.background = on ? "#131b2e" : "transparent";
      b.style.color = on ? "#fff" : "#6b7488";
      b.style.fontWeight = on ? "800" : "600";
      b.style.boxShadow = on ? "0 2px 7px rgba(19,27,46,.18)" : "none";
    });
    $("category-block").style.display = k === "income" ? "none" : "block";
    $("card-block").style.display = k === "debt" ? "none" : "block";
    $("contact-wrapper").style.display = k === "debt" ? "block" : "none";
    updateLabels();
  }

  function updateLabels() {
    $("kind-hint").textContent = {
      expense: "پرداخت از صندوق/کارت خودت.",
      income: "واریز پول به صندوق/کارت تنخواه.",
      debt: "همکار از جیب خودش پرداخت کرده و طلبکار است.",
    }[kind];
    $("page-title").textContent = editId ? "ویرایش تراکنش"
      : kind === "income" ? "شارژ تنخواه" : kind === "debt" ? "ثبت طلب همکار" : "ثبت هزینه";
    $("card-label").textContent = kind === "income" ? "واریز به کدام کارت؟" : "از کدام کارت؟";
    $("title-label").textContent = kind === "income" ? "بابت (اختیاری)" : "شرح یا فروشنده";
    $("title").placeholder = kind === "income" ? "مثلاً: واریز از حساب مرکزی"
      : kind === "debt" ? "مثلاً: خرید ناهار تیمی" : "مثلاً: خرید ملزومات اداری";
    const submitText = editId ? "ذخیره تغییرات"
      : kind === "income" ? "ثبت و تأیید شارژ" : kind === "debt" ? "ثبت طلب همکار" : "ثبت و تأیید هزینه";
    $("submit-btn").innerHTML = `${submitText} ${CHECK}`;
  }

  // ---- همکاران (select با افزودن درون‌خطی) ----
  const contactsReady = (async () => {
    const { data } = await sb.from("contacts").select("id,name,unit").order("name");
    const sel = $("contact-select");
    (data || []).forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.unit ? `${c.name} — ${c.unit}` : c.name;
      sel.appendChild(o);
    });
    const o = document.createElement("option");
    o.value = "__new__"; o.textContent = "+ همکار جدید…";
    sel.appendChild(o);
  })();

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

  // ---- کارت‌ها (انتخابگر افقی) ----
  const cardsReady = (async () => {
    const { data } = await sb.from("cards").select("id,name").order("name");
    cardList = data || [];
    if (!editId && cardList.length === 1) selectedCard = cardList[0].id;
    renderCardPicker();
  })();

  function cardChip(c) {
    const sel = c.id === selectedCard;
    return `<button type="button" data-card="${c.id}" style="position:relative;flex:none;min-width:120px;text-align:right;padding:12px 13px;border-radius:9px;cursor:pointer;font-family:inherit;border:${sel ? "2px solid #fea619" : "1.5px solid #dbe3ee"};background:${sel ? "rgba(254,166,25,.10)" : "#f2f6fc"};">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="width:32px;height:32px;border-radius:9px;background:#e9f0f8;color:#131b2e;display:flex;align-items:center;justify-content:center;flex:none;">${c.cash ? CASH_SVG : CARD_SVG}</span>
        <div style="min-width:0;flex:1;"><div style="font-size:13px;font-weight:800;color:#131b2e;white-space:nowrap;">${escapeHtml(c.name)}</div><div style="font-size:10.5px;color:#8a93a6;">${c.cash ? "بدون کارت" : "کارت"}</div></div>
        ${sel ? `<span style="flex:none;color:#fea619;display:flex;">${CHECK_SM}</span>` : ""}
      </div>
    </button>`;
  }

  function renderCardPicker() {
    const picker = $("card-picker");
    const chips = [{ id: "", name: "بدون کارت", cash: true }].concat(cardList.map((c) => ({ id: c.id, name: c.name, cash: false })));
    picker.innerHTML = chips.map(cardChip).join("") +
      `<button type="button" data-card="__new__" style="flex:none;min-width:110px;border-radius:9px;cursor:pointer;font-family:inherit;border:1.5px dashed #ccd6e3;background:#fff;color:#46506a;padding:12px 13px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:700;">${PLUS_SM} کارت جدید</button>`;
    picker.querySelectorAll("[data-card]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.card === "__new__") return addNewCard();
      selectedCard = b.dataset.card;
      renderCardPicker();
    }));
  }

  async function addNewCard() {
    const vals = await Modal.form({
      title: "افزودن کارت",
      fields: [{ id: "name", label: "نام کارت / کیف‌پول", required: true, placeholder: "مثلاً: کارت ملت یا کیف‌پول اسنپ" }],
      submitText: "افزودن",
    });
    if (!vals) return;
    const { data, error } = await sb.from("cards").insert({ name: vals.name }).select().single();
    if (error) return toast("خطا در افزودن کارت", "error");
    cardList.push({ id: data.id, name: data.name });
    cardList.sort((a, b) => String(a.name).localeCompare(String(b.name), "fa"));
    selectedCard = data.id;
    renderCardPicker();
    toast("کارت اضافه شد ✅");
  }

  // ---- انتخاب و پیش‌نمایش عکس/فایل ----
  const dropZone = $("drop-zone");
  const fileInput = $("file-upload");
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.style.background = "rgba(254,166,25,.16)"; });
  dropZone.addEventListener("dragleave", () => { dropZone.style.background = "rgba(254,166,25,.07)"; });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.background = "rgba(254,166,25,.07)";
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
    img.src = url; img.classList.remove("hidden");
    $("upload-icon").classList.add("hidden");
    $("upload-label").textContent = label;
  }
  function showFileChosen(label) {
    $("preview").classList.add("hidden");
    const icon = $("upload-icon");
    icon.classList.remove("hidden");
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5z"/></svg>`;
    $("upload-label").textContent = label;
  }

  function storagePath(url) {
    if (!url) return null;
    const marker = "/" + cfg.BUCKET + "/";
    const i = url.indexOf(marker);
    return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
  }

  // ---- مقداردهی اولیه ----
  (async () => {
    if (editId) {
      const { data, error } = await sb.from("transactions").select("*").eq("id", editId).single();
      if (error || !data) { toast("تراکنش یافت نشد", "error"); return; }
      original = data;
      setKind(data.type === "income" ? "income" : (data.paid_by === "contact" ? "debt" : "expense"));
      setAmount(data.amount);
      $("title").value = data.title || "";
      if (data.category) $("category").value = data.category;
      if (data.transaction_date) {
        $("date").dataset.iso = data.transaction_date;
        $("date").value = JalaliPicker.shamsiText(data.transaction_date);
      }
      if (kind === "debt" && data.contact_id) { await contactsReady; $("contact-select").value = data.contact_id; }
      if (data.card_id) { await cardsReady; selectedCard = data.card_id; renderCardPicker(); }
      if (data.image_url) {
        if (/\.pdf($|\?)/i.test(data.image_url)) showFileChosen("فایل فعلی — برای تغییر بزنید");
        else showPreview(data.image_url, "تصویر فعلی — برای تغییر بزنید");
      }
    } else {
      $("date").dataset.iso = localDateStr();
      $("date").value = JalaliPicker.shamsiText(localDateStr());
      setKind(params.get("type") === "income" ? "income" : "expense");
      setTimeout(() => amountEl.focus(), 350);
    }
  })();

  // ---- ثبت / ذخیره ----
  $("tx-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = amountValue();
    if (amount <= 0) return toast("لطفاً مبلغ معتبر وارد کنید", "error");
    if (kind !== "income" && !$("category").value) return toast("لطفاً دسته‌بندی را انتخاب کنید", "error");
    if (kind === "debt" && !$("contact-select").value) return toast("لطفاً همکار طلبکار را انتخاب کنید", "error");

    const btn = $("submit-btn");
    btn.disabled = true;
    btn.style.opacity = "0.7";
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">autorenew</span> در حال ذخیره…`;

    try {
      let image_url = original ? original.image_url : null;
      if (selectedFile) {
        const ext = (selectedFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage.from(cfg.BUCKET).upload(path, selectedFile, { cacheControl: "3600", upsert: false });
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
        card_id: isDebt ? null : (selectedCard || null),
        transaction_date: $("date").dataset.iso || localDateStr(),
        image_url,
      };

      if (editId) {
        const { error } = await sb.from("transactions").update(row).eq("id", editId);
        if (error) throw error;
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
      btn.style.opacity = "1";
      updateLabels();
    }
  });
})();
