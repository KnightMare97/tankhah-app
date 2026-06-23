// داشبورد (بازطراحی جهت ۳): موجودی، کارت‌ها، اقدامات، نمودار میله‌ای با ۳ بازه‌ی زمانی
(async function () {
  const $ = (id) => document.getElementById(id);

  let rows = [], cards = [];
  try {
    const [txRes, cardRes] = await Promise.all([
      sb.from("transactions").select("*, contacts(name)").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
      sb.from("cards").select("id,name").order("name"),
    ]);
    if (txRes.error) throw txRes.error;
    if (cardRes.error) throw cardRes.error;
    rows = txRes.data || [];
    cards = cardRes.data || [];
  } catch (e) {
    console.error(e);
    toast("خطا در بارگذاری داشبورد", "error");
    return;
  }

  // ---- محاسبات ----
  let income = 0, expenseFromFund = 0, expenseTotal = 0, settlements = 0, debtCharges = 0;
  const perDebt = {};
  for (const t of rows) {
    if (t.type === "income") income += t.amount;
    else if (t.type === "settlement") {
      settlements += t.amount;
      if (t.contact_id) perDebt[t.contact_id] = (perDebt[t.contact_id] || 0) - t.amount;
    } else {
      expenseTotal += t.amount;
      if (t.paid_by === "contact") { debtCharges += t.amount; if (t.contact_id) perDebt[t.contact_id] = (perDebt[t.contact_id] || 0) + t.amount; }
      else expenseFromFund += t.amount;
    }
  }
  const debt = Math.max(0, debtCharges - settlements);
  const balance = income - expenseFromFund - settlements;
  const bal = cardBalances(rows);

  // ---- هیرو ----
  const neg = balance < 0;
  const balEl = $("balance");
  balEl.textContent = (neg ? "−" : "") + formatToman(balance);
  balEl.style.color = neg ? "#ff8f8f" : "#ffffff";
  const accountCount = cards.length + (bal[CARD_NONE] ? 1 : 0);
  $("card-count").textContent = `مجموع ${toFa(accountCount)} کارت و صندوق`;

  // ---- کارت‌های آماری ----
  $("total-debt").textContent = formatToman(debt);
  const openDebtors = Object.values(perDebt).filter((v) => v > 0).length;
  $("debt-sub").textContent = openDebtors ? `${toFa(openDebtors)} طلب همکار باز` : "بدهی بازی نیست";
  $("total-expenses").textContent = formatToman(expenseTotal);

  // ---- کارت‌ها و صندوق ----
  (function renderAccounts() {
    const list = cards.map((c) => ({ name: c.name, bal: bal[c.id] || 0, cash: false }));
    if (bal[CARD_NONE]) list.push({ name: "بدون کارت", bal: bal[CARD_NONE], cash: true });
    if (!list.length) { $("accounts-section").style.display = "none"; return; }
    $("accounts-section").style.display = "block";
    $("accounts-strip").innerHTML = list.map((a) => {
      const n = a.bal < 0;
      const icon = a.cash
        ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8" fill="#fea619"/></svg>`
        : `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="2.5" y="5" width="19" height="14" rx="3"/><rect x="2.5" y="8.2" width="19" height="2.6" fill="#fea619"/></svg>`;
      return `<div style="position:relative;flex:none;width:200px;background:#fff;border:1px solid #dbe3ee;border-radius:10px;box-shadow:0 1px 2px rgba(19,27,46,.06);padding:15px 15px 15px 17px;overflow:hidden;">
        <div style="position:absolute;top:0;bottom:0;right:0;width:5px;background:#fea619;"></div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="width:40px;height:40px;border-radius:9px;background:#e9f0f8;color:#131b2e;display:flex;align-items:center;justify-content:center;flex:none;">${icon}</span>
          <div style="min-width:0;"><div style="font-size:14px;font-weight:800;color:#131b2e;white-space:nowrap;">${escapeHtml(a.name)}</div><div style="font-size:11.5px;color:#8a93a6;">${a.cash ? "وجه نقد" : "کارت"}</div></div>
        </div>
        <div style="margin-top:14px;display:flex;align-items:baseline;gap:5px;"><span class="currency-font" style="font-size:18px;font-weight:800;color:${n ? "#ba1a1a" : "#131b2e"};">${n ? "−" : ""}${formatToman(a.bal)}</span><span style="font-size:11.5px;color:#8a93a6;">تومان</span></div>
      </div>`;
    }).join("");
  })();

  // ---- اقدامات لازم ----
  (function renderActions() {
    const items = rows.filter((t) => t.status === "pending" && t.paid_by === "contact" && (perDebt[t.contact_id] || 0) > 0);
    const box = $("actions-list");
    if (!items.length) {
      box.innerHTML = `<div style="background:#fff;border:1px solid #dbe3ee;border-radius:10px;box-shadow:0 1px 2px rgba(19,27,46,.06);padding:22px 18px;display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;">
        <span style="width:50px;height:50px;border-radius:50%;background:#e7f6ee;color:#1f9d57;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="27" height="27" fill="currentColor"><path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20.4 7.8 19 6.4z"/></svg></span>
        <span style="font-size:14.5px;font-weight:800;color:#131b2e;">اقدام معوقه‌ای وجود ندارد</span>
        <span style="font-size:12.5px;color:#5b647a;">همه‌ی تراکنش‌ها بررسی و تأیید شده‌اند.</span></div>`;
      return;
    }
    box.innerHTML = items.map((t) => {
      const heading = t.contacts?.name ? `طلب ${t.contacts.name}` : (t.title || "طلب همکار");
      return `<a href="./contacts.html" style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:1px solid #dbe3ee;border-radius:10px;box-shadow:0 1px 2px rgba(19,27,46,.06);padding:14px;text-decoration:none;position:relative;overflow:hidden;">
        <span style="position:absolute;top:0;bottom:0;right:0;width:4px;background:#fea619;"></span>
        <div style="display:flex;align-items:center;gap:11px;">
          <span style="width:40px;height:40px;border-radius:9px;background:#e9f0f8;color:#131b2e;display:flex;align-items:center;justify-content:center;flex:none;"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="9" cy="8" r="3.4"/><path d="M2.6 19.2c0-3.2 2.86-5.4 6.4-5.4s6.4 2.2 6.4 5.4v.8H2.6z"/></svg></span>
          <div><div style="font-size:14px;font-weight:800;color:#131b2e;">${escapeHtml(heading)}</div><div style="font-size:11.5px;color:#8a93a6;">طلب باز • ${formatToman(t.amount)} تومان</div></div>
        </div>
        <span style="background:#131b2e;color:#fff;font-size:12px;font-weight:700;padding:7px 14px;border-radius:8px;flex:none;">بررسی</span>
      </a>`;
    }).join("");
  })();

  // ---- نمودار خرج‌کرد (میله‌ای، ۳ بازه‌ی زمانی) ----
  const expByDate = {};
  for (const t of rows) if (t.type === "expense") expByDate[t.transaction_date] = (expByDate[t.transaction_date] || 0) + t.amount;

  const FA_WD = ["ی", "د", "س", "چ", "پ", "ج", "ش"]; // getDay 0..6
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isoOf = (d) => localDateStr(d);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const sumRange = (start, days) => { let s = 0; for (let i = 0; i < days; i++) s += expByDate[isoOf(addDays(start, i))] || 0; return s; };

  function build7d() {
    const out = [];
    for (let i = 6; i >= 0; i--) { const d = addDays(today, -i); out.push({ v: expByDate[isoOf(d)] || 0, label: FA_WD[d.getDay()] }); }
    return out;
  }
  function build1m() {
    const out = [];
    for (let b = 0; b < 6; b++) {
      const start = addDays(today, -29 + b * 5);
      const end = addDays(start, 4);
      const j = JDate.isoToJalaali(isoOf(end > today ? today : end));
      out.push({ v: sumRange(start, 5), label: toFa(j.jd) });
    }
    return out;
  }
  function build3m() {
    const tj = JDate.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const byMonth = {};
    for (const iso in expByDate) { const j = JDate.isoToJalaali(iso); byMonth[j.jy + "-" + j.jm] = (byMonth[j.jy + "-" + j.jm] || 0) + expByDate[iso]; }
    const out = [];
    for (let k = 2; k >= 0; k--) {
      let jm = tj.jm - k, jy = tj.jy;
      while (jm < 1) { jm += 12; jy -= 1; }
      out.push({ v: byMonth[jy + "-" + jm] || 0, label: JDate.monthNames[jm - 1] });
    }
    return out;
  }

  const RANGES = { "7d": { label: "۷ روز اخیر", build: build7d }, "1m": { label: "ماه اخیر", build: build1m }, "3m": { label: "۳ ماه اخیر", build: build3m } };
  let curRange = "7d";

  function renderChart() {
    const { label, build } = RANGES[curRange];
    const bars = build();
    const max = Math.max(1, ...bars.map((b) => b.v));
    const total = bars.reduce((s, b) => s + b.v, 0);
    $("chart-total").innerHTML = `${label} • <span style="color:#fea619;font-weight:800;">${formatToman(total)} تومان</span>`;
    $("chart-bars").innerHTML = bars.map((b, i) => {
      const cur = i === bars.length - 1; // جدیدترین = کهربایی
      const h = Math.max(4, Math.round(b.v / max * 100));
      return `<div style="flex:1;display:flex;align-items:flex-end;height:100%;"><div style="height:${h}%;width:100%;border-radius:2px 2px 1px 1px;background:${cur ? "#fea619" : "rgba(255,255,255,.12)"};transition:height .3s;"></div></div>`;
    }).join("");
    $("chart-labels").innerHTML = bars.map((b) => `<span style="flex:1;text-align:center;font-size:10.5px;color:#8a93a6;">${escapeHtml(String(b.label))}</span>`).join("");
    document.querySelectorAll("#chart-tabs [data-range]").forEach((btn) => {
      const on = btn.dataset.range === curRange;
      btn.style.background = on ? "#fea619" : "transparent";
      btn.style.color = on ? "#131b2e" : "#8a93a6";
    });
  }

  document.querySelectorAll("#chart-tabs [data-range]").forEach((btn) =>
    btn.addEventListener("click", () => { curRange = btn.dataset.range; renderChart(); }));
  renderChart();
})();
