// کامپوننت مودال/شیت مشترک — جایگزین prompt/confirm با تجربه‌ی کاربری حرفه‌ای
(function () {
  let root = null;

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "modal-root";
    root.className = "fixed inset-0 z-[300] hidden";
    root.innerHTML = `
      <div data-backdrop class="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200"></div>
      <div data-sheet class="absolute bottom-0 left-0 right-0 bg-surface-container-lowest rounded-t-2xl p-5 pb-8 max-w-md mx-auto translate-y-full transition-transform duration-250 shadow-soft" dir="rtl"></div>`;
    document.body.appendChild(root);
    // بستن با ضربه به پس‌زمینه — ولی نه بلافاصله بعد از باز شدن (جلوگیری از بستهٔ ناخواسته با همان لمس)
    root.querySelector("[data-backdrop]").addEventListener("click", () => {
      if (Date.now() - shownAt < 350) return;
      close(null);
    });
    return root;
  }

  let resolver = null;
  let hideTimer = null;   // تایمر بستن؛ هنگام باز شدن مودال بعدی پاک می‌شود
  let shownAt = 0;
  function show(sheetHtml) {
    ensureRoot();
    clearTimeout(hideTimer);            // اگر مودال قبلی در حال بسته‌شدن بود، لغو کن
    shownAt = Date.now();
    const sheet = root.querySelector("[data-sheet]");
    sheet.innerHTML = sheetHtml;
    root.classList.remove("hidden");
    requestAnimationFrame(() => {
      root.querySelector("[data-backdrop]").classList.remove("opacity-0");
      sheet.classList.remove("translate-y-full");
    });
    return sheet;
  }

  function close(value) {
    if (!root) return;
    const sheet = root.querySelector("[data-sheet]");
    root.querySelector("[data-backdrop]").classList.add("opacity-0");
    sheet.classList.add("translate-y-full");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => root.classList.add("hidden"), 250);
    if (resolver) { const r = resolver; resolver = null; r(value); }
  }

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // تأیید (بله/خیر)
  function confirm({ title, message = "", confirmText = "تأیید", cancelText = "انصراف", danger = false }) {
    return new Promise((resolve) => {
      resolver = resolve;
      const sheet = show(`
        <div class="text-right">
          <h3 class="font-headline-sm text-headline-sm text-on-surface mb-2">${esc(title)}</h3>
          ${message ? `<p class="font-body-md text-on-surface-variant mb-5">${esc(message)}</p>` : '<div class="mb-3"></div>'}
          <div class="flex gap-3">
            <button data-cancel class="flex-1 h-12 rounded-xl border border-outline-variant text-on-surface font-label-bold active:scale-95 transition-transform">${esc(cancelText)}</button>
            <button data-ok class="flex-1 h-12 rounded-xl font-label-bold active:scale-95 transition-transform ${danger ? "bg-error text-on-error" : "bg-secondary-container text-on-secondary-container"}">${esc(confirmText)}</button>
          </div>
        </div>`);
      sheet.querySelector("[data-cancel]").onclick = () => close(false);
      sheet.querySelector("[data-ok]").onclick = () => close(true);
    });
  }

  // فرم (ورودی‌های دلخواه) — خروجی: شیء مقادیر یا null
  function form({ title, fields = [], submitText = "ذخیره", cancelText = "انصراف" }) {
    return new Promise((resolve) => {
      resolver = resolve;
      const fieldsHtml = fields.map((f) => {
        const control = f.type === "select"
          ? `<div class="relative">
               <select data-field="${esc(f.id)}" ${f.required ? "required" : ""}
                 class="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 appearance-none font-body-md text-body-md text-on-surface text-right">
                 ${(f.options || []).map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(f.value ?? "") ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
               </select>
               <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"><span class="material-symbols-outlined text-on-surface-variant">expand_more</span></div>
             </div>`
          : `<input data-field="${esc(f.id)}" type="${f.type || "text"}" value="${esc(f.value ?? "")}"
               placeholder="${esc(f.placeholder || "")}" ${f.required ? "required" : ""} ${f.inputmode ? `inputmode="${esc(f.inputmode)}"` : ""}
               class="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 font-body-md text-body-md text-on-surface text-right"/>`;
        return `<div class="flex flex-col gap-xs text-right mb-4">
          <label class="font-label-bold text-label-bold text-on-surface-variant px-1">${esc(f.label)}</label>
          ${control}
          ${f.hint ? `<p class="text-xs text-on-surface-variant px-1">${esc(f.hint)}</p>` : ""}
        </div>`;
      }).join("");
      const sheet = show(`
        <form data-form class="text-right">
          <h3 class="font-headline-sm text-headline-sm text-on-surface mb-4">${esc(title)}</h3>
          ${fieldsHtml}
          <div class="flex gap-3 mt-2">
            <button type="button" data-cancel class="flex-1 h-12 rounded-xl border border-outline-variant text-on-surface font-label-bold active:scale-95 transition-transform">${esc(cancelText)}</button>
            <button type="submit" class="flex-1 h-12 rounded-xl bg-secondary-container text-on-secondary-container font-label-bold active:scale-95 transition-transform">${esc(submitText)}</button>
          </div>
        </form>`);
      const firstInput = sheet.querySelector("input");
      if (firstInput) setTimeout(() => firstInput.focus(), 280);
      sheet.querySelector("[data-cancel]").onclick = () => close(null);
      sheet.querySelector("[data-form]").onsubmit = (e) => {
        e.preventDefault();
        const out = {};
        let ok = true;
        sheet.querySelectorAll("[data-field]").forEach((inp) => {
          const val = inp.value.trim();
          if (inp.hasAttribute("required") && !val) { ok = false; inp.classList.add("border-error"); }
          out[inp.dataset.field] = val;
        });
        if (ok) close(out);
      };
    });
  }

  // منوی اقدام (شیت اکشن) — خروجی: value انتخاب‌شده یا null
  function actions({ title, items = [] }) {
    return new Promise((resolve) => {
      resolver = resolve;
      const itemsHtml = items.map((it, i) => `
        <button data-i="${i}" class="w-full h-14 rounded-xl flex items-center gap-3 px-4 mb-2 active:scale-[0.98] transition-transform
          ${it.danger ? "bg-error-container text-error" : "bg-surface-container-low text-on-surface"}">
          ${it.icon ? `<span class="material-symbols-outlined">${esc(it.icon)}</span>` : ""}
          <span class="font-label-bold text-body-md">${esc(it.label)}</span>
        </button>`).join("");
      const sheet = show(`
        <div class="text-right">
          ${title ? `<h3 class="font-headline-sm text-headline-sm text-on-surface mb-4">${esc(title)}</h3>` : ""}
          ${itemsHtml}
          <button data-cancel class="w-full h-12 rounded-xl border border-outline-variant text-on-surface-variant font-label-bold mt-1">انصراف</button>
        </div>`);
      sheet.querySelector("[data-cancel]").onclick = () => close(null);
      sheet.querySelectorAll("[data-i]").forEach((b) =>
        (b.onclick = () => close(items[+b.dataset.i].value))
      );
    });
  }

  window.Modal = { confirm, form, actions, close };
})();
