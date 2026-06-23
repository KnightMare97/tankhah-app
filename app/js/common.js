// ---------------------------------------------------------------------------
//  توابع کمکی مشترک کل اپ
// ---------------------------------------------------------------------------
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

// تبدیل ارقام انگلیسی به فارسی
function toFa(input) {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}
// تبدیل ارقام فارسی/عربی به انگلیسی (برای ورودی فرم)
function toEn(input) {
  return String(input)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}
// قالب‌بندی مبلغ با جداکننده هزارگان + ارقام فارسی
function formatToman(n) {
  const num = Number(n) || 0;
  return toFa(Math.abs(num).toLocaleString("en-US"));
}
// قالب‌بندی مبلغ همراه با علامت + / -
function formatSigned(n) {
  const num = Number(n) || 0;
  const sign = num < 0 ? "−" : "+";
  return sign + formatToman(num);
}

// متادیتای دسته‌بندی‌ها (مطابق گزینه‌های فرم ثبت تراکنش)
const CATEGORIES = {
  office:    { label: "امور اداری",       icon: "description",   bg: "bg-error-container",      fg: "text-error" },
  food:      { label: "خوراک و رستوران",  icon: "restaurant",    bg: "bg-error-container",      fg: "text-error" },
  transport: { label: "حمل و نقل",        icon: "directions_car",bg: "bg-secondary-fixed",      fg: "text-on-secondary-container" },
  utilities: { label: "قبوض و خدمات",     icon: "bolt",          bg: "bg-tertiary-fixed",       fg: "text-on-tertiary-fixed" },
  others:    { label: "سایر موارد",       icon: "more_horiz",    bg: "bg-surface-container-high", fg: "text-on-surface-variant" },
};
function categoryMeta(key) {
  return CATEGORIES[key] || { label: key || "بدون دسته", icon: "receipt_long", bg: "bg-surface-container-high", fg: "text-on-surface-variant" };
}

// محاسبه‌ی موجودی هر کارت از روی تراکنش‌ها
//   شارژ (+) ، هزینه‌ی پرداخت‌شده از صندوق (−) ؛ طلب همکار روی موجودی کارت اثر ندارد.
//   خروجی: { [card_id|"__none__"]: balance }
const CARD_NONE = "__none__";
function cardBalances(txns) {
  const m = {};
  for (const t of txns || []) {
    const key = t.card_id || CARD_NONE;
    if (t.type === "income") m[key] = (m[key] || 0) + t.amount;            // شارژ (+)
    else if (t.type === "settlement") m[key] = (m[key] || 0) - t.amount;   // تسویه‌ی طلب همکار (−)
    else if (t.paid_by !== "contact") m[key] = (m[key] || 0) - t.amount;   // هزینه از صندوق (−)
  }
  return m;
}

const STATUS_LABEL = {
  pending:    "در انتظار",
  confirmed:  "تأیید شده",
  settled:    "تسویه شده",
  reimbursed: "بازپرداخت شده",
};

// نام ماه‌های میلادی برای نمایش تاریخ (ساده و بدون وابستگی)
// نمایش تاریخ به‌صورت تقویم شمسی با Intl
function formatJalali(dateStr) {
  try {
    const d = new Date(dateStr);
    return toFa(
      new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" }).format(d)
    );
  } catch {
    return dateStr;
  }
}
function formatJalaliShort(dateStr) {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long" }).format(d);
  } catch {
    return dateStr;
  }
}
function timeOf(ts) {
  try {
    return toFa(new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ts)));
  } catch {
    return "";
  }
}

// تاریخ محلی به‌صورت YYYY-MM-DD (بدون باگ منطقه‌زمانی toISOString)
function localDateStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// جلوگیری از تزریق HTML
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// نوار پیام (Toast) ساده
function toast(message, kind = "success") {
  let el = document.getElementById("app-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "app-toast";
    el.className =
      "fixed z-[100] left-1/2 -translate-x-1/2 bottom-28 px-5 py-3 rounded-xl shadow-lg font-label-bold text-label-bold transition-all duration-300 opacity-0 pointer-events-none";
    document.body.appendChild(el);
  }
  const palette = kind === "error"
    ? "bg-error text-on-error"
    : "bg-primary-container text-on-primary";
  el.className = el.className.replace(/bg-\S+|text-\S+/g, "");
  el.classList.add(...palette.split(" "));
  el.textContent = message;
  requestAnimationFrame(() => {
    el.classList.remove("opacity-0");
    el.classList.add("opacity-100");
  });
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.classList.add("opacity-0");
    el.classList.remove("opacity-100");
  }, 2600);
}

// ثبت سرویس‌ورکر برای PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("SW:", e));
  });
}
