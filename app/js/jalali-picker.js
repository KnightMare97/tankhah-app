// تقویم شمسی سبک و بدون وابستگی — هماهنگ با دیزاین‌سیستم اپ
// استفاده: JalaliPicker.attach(inputEl, { iso, onSelect })
(function () {
  let pop = null, activeInput = null, viewY = 0, viewM = 0, onSelectCb = null;

  function todayJ() {
    const d = new Date();
    return JDate.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function shamsiText(iso) {
    const j = JDate.isoToJalaali(iso);
    return `${toFa(j.jd)} ${JDate.monthNames[j.jm - 1]} ${toFa(j.jy)}`;
  }

  function ensurePop() {
    if (pop) return;
    pop = document.createElement("div");
    pop.className =
      "absolute z-[200] hidden bg-surface-container-lowest border border-outline-variant rounded-xl shadow-soft p-3 w-72 text-on-surface";
    pop.dir = "rtl";
    pop.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <button type="button" data-nav="prev" class="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center">
          <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span></button>
        <span data-title class="font-headline-sm text-sm"></span>
        <button type="button" data-nav="next" class="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center">
          <span class="material-symbols-outlined text-on-surface-variant">chevron_left</span></button>
      </div>
      <div data-weekdays class="grid grid-cols-7 gap-1 mb-1 text-center text-[11px] text-on-surface-variant font-label-bold"></div>
      <div data-grid class="grid grid-cols-7 gap-1 text-center"></div>
      <div class="flex justify-center mt-2 pt-2 border-t border-outline-variant">
        <button type="button" data-today class="text-secondary font-label-bold text-label-bold px-3 py-1 rounded-lg hover:bg-surface-container-low">امروز</button>
      </div>`;
    document.body.appendChild(pop);

    pop.querySelector("[data-weekdays]").innerHTML =
      JDate.weekDays.map((w) => `<div>${w}</div>`).join("");

    pop.querySelector('[data-nav="prev"]').onclick = () => { shiftMonth(-1); };
    pop.querySelector('[data-nav="next"]').onclick = () => { shiftMonth(1); };
    pop.querySelector("[data-today]").onclick = () => {
      const t = todayJ(); pick(t.jy, t.jm, t.jd);
    };
    pop.addEventListener("mousedown", (e) => e.preventDefault()); // جلوگیری از blur زودهنگام

    document.addEventListener("click", (e) => {
      if (pop && !pop.contains(e.target) && e.target !== activeInput) hide();
    });
  }

  function shiftMonth(delta) {
    viewM += delta;
    if (viewM < 1) { viewM = 12; viewY -= 1; }
    if (viewM > 12) { viewM = 1; viewY += 1; }
    render();
  }

  function render() {
    pop.querySelector("[data-title]").textContent =
      `${JDate.monthNames[viewM - 1]} ${toFa(viewY)}`;
    const len = JDate.monthLength(viewY, viewM);
    // محاسبه‌ی روز هفته‌ی اولین روز ماه (شنبه=۰)
    const firstIso = JDate.jalaaliToIso(viewY, viewM, 1);
    const fp = firstIso.split("-").map(Number);
    const dow = new Date(fp[0], fp[1] - 1, fp[2]).getDay(); // 0=یکشنبه..6=شنبه
    const startCol = (dow + 1) % 7; // شنبه→۰

    const sel = activeInput.dataset.iso ? JDate.isoToJalaali(activeInput.dataset.iso) : null;
    const t = todayJ();

    let cells = "";
    for (let i = 0; i < startCol; i++) cells += `<div></div>`;
    for (let d = 1; d <= len; d++) {
      const isSel = sel && sel.jy === viewY && sel.jm === viewM && sel.jd === d;
      const isToday = t.jy === viewY && t.jm === viewM && t.jd === d;
      const cls = isSel
        ? "bg-secondary-container text-on-secondary-container font-bold"
        : isToday
          ? "border border-secondary-container text-secondary"
          : "hover:bg-surface-container-low";
      cells += `<button type="button" data-day="${d}" class="h-9 rounded-lg text-sm ${cls}">${toFa(d)}</button>`;
    }
    const grid = pop.querySelector("[data-grid]");
    grid.innerHTML = cells;
    grid.querySelectorAll("[data-day]").forEach((b) =>
      (b.onclick = () => pick(viewY, viewM, +b.dataset.day))
    );
  }

  function pick(jy, jm, jd) {
    const iso = JDate.jalaaliToIso(jy, jm, jd);
    activeInput.dataset.iso = iso;
    activeInput.value = shamsiText(iso);
    hide();
    if (onSelectCb) onSelectCb(iso);
  }

  function open(input, cb) {
    ensurePop();
    activeInput = input;
    onSelectCb = cb;
    const base = input.dataset.iso ? JDate.isoToJalaali(input.dataset.iso) : todayJ();
    viewY = base.jy; viewM = base.jm;
    render();
    const r = input.getBoundingClientRect();
    pop.style.top = (r.bottom + window.scrollY + 6) + "px";
    pop.style.left = (r.left + window.scrollX) + "px";
    pop.classList.remove("hidden");
  }

  function hide() { if (pop) pop.classList.add("hidden"); }

  window.JalaliPicker = {
    attach(input, opts = {}) {
      input.readOnly = true;
      input.classList.add("cursor-pointer");
      if (opts.iso) {
        input.dataset.iso = opts.iso;
        input.value = shamsiText(opts.iso);
      }
      input.addEventListener("click", () => open(input, opts.onSelect));
      input.addEventListener("focus", () => open(input, opts.onSelect));
    },
    shamsiText,
  };
})();
