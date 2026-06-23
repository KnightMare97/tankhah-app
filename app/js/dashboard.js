// داشبورد: محاسبه‌ی موجودی، کل هزینه‌ها، مجموع بدهی و اقدامات لازم
(async function () {
  const $ = (id) => document.getElementById(id);

  try {
    const { data: txns, error } = await sb
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = txns || [];

    // موجودی فعلی = درآمدها − هزینه‌هایی که از خود صندوق پرداخت شده
    let income = 0, expenseFromFund = 0, expenseTotal = 0, debt = 0;
    for (const t of rows) {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expenseTotal += t.amount;
        if (t.paid_by === "contact") {
          // طلب همکار: از موجودی صندوق کم نمی‌شود، بدهی محسوب می‌شود
          if (t.status !== "settled" && t.status !== "reimbursed") debt += t.amount;
        } else {
          expenseFromFund += t.amount;
        }
      }
    }
    const balance = income - expenseFromFund;

    $("balance").textContent = formatToman(balance);
    $("total-expenses").textContent = formatToman(expenseTotal);
    $("total-debt").textContent = formatToman(debt);
    $("updated-at").textContent = "به‌روزرسانی شده: " + timeOf(new Date().toISOString());

    // تحلیل ساده: پرهزینه‌ترین دسته
    const byCat = {};
    rows.filter((t) => t.type === "expense").forEach((t) => {
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    $("analysis-text").textContent = top
      ? `بیشترین هزینه مربوط به «${categoryMeta(top[0]).label}» بوده است.`
      : "هنوز هزینه‌ای ثبت نشده است.";

    // اقدامات لازم: تراکنش‌های در انتظار
    renderActions(rows.filter((t) => t.status === "pending"));

    // موجودی هر کارت
    await renderCards(rows);
  } catch (e) {
    console.error(e);
    toast("خطا در بارگذاری داشبورد", "error");
    $("actions-list").innerHTML =
      `<p class="text-on-surface-variant text-body-md text-center py-4">خطا در اتصال به سرور</p>`;
  }

  function renderActions(items) {
    const box = $("actions-list");
    if (!items.length) {
      box.innerHTML =
        `<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md text-center text-on-surface-variant font-body-md">اقدام معوقه‌ای وجود ندارد ✅</div>`;
      return;
    }
    box.innerHTML = items
      .map((t) => {
        const c = categoryMeta(t.category);
        return `
      <a href="./transactions.html" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex items-center justify-between group hover:border-secondary transition-colors relative hover:shadow-md">
        <div class="absolute right-0 top-0 bottom-0 w-1 bg-secondary-container rounded-r-lg"></div>
        <div class="flex items-center gap-md">
          <div class="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center">
            <span class="material-symbols-outlined text-on-surface-variant">${c.icon}</span>
          </div>
          <div>
            <h3 class="font-body-lg text-body-lg text-on-surface font-semibold">${escapeHtml(t.title || c.label)}</h3>
            <p class="text-xs font-body-md text-on-surface-variant">مبلغ: ${formatToman(t.amount)} تومان • در انتظار تأیید</p>
          </div>
        </div>
        <span class="bg-primary text-white px-4 py-2 rounded-lg text-label-bold font-label-bold">بررسی</span>
      </a>`;
      })
      .join("");
  }

  async function renderCards(rows) {
    const section = $("cards-section");
    const { data: cards } = await sb.from("cards").select("id,name").order("name");
    if (!cards || !cards.length) { section.classList.add("hidden"); return; }
    const bal = cardBalances(rows);
    const cardRow = (name, b, icon) => `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex items-center justify-between relative overflow-hidden hover:shadow-md">
        <div class="absolute right-0 top-0 bottom-0 w-1 ${b < 0 ? "bg-error" : "bg-secondary-container"}"></div>
        <div class="flex items-center gap-3 flex-row-reverse">
          <div class="w-10 h-10 bg-secondary-fixed rounded-lg flex items-center justify-center">
            <span class="material-symbols-outlined text-on-secondary-container">${icon}</span>
          </div>
          <span class="font-body-lg text-on-surface">${escapeHtml(name)}</span>
        </div>
        <div class="text-left">
          <span class="font-headline-sm text-headline-sm currency-font ${b < 0 ? "text-error" : "text-on-surface"}">${b < 0 ? "−" : ""}${formatToman(b)}</span>
          <span class="text-[10px] text-on-surface-variant">تومان</span>
        </div>
      </div>`;
    let html = cards.map((c) => cardRow(c.name, bal[c.id] || 0, "credit_card")).join("");
    if (bal[CARD_NONE]) html += cardRow("بدون کارت", bal[CARD_NONE], "wallet");
    $("cards-list").innerHTML = html;
    section.classList.remove("hidden");
  }
})();
