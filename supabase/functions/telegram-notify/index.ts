// Edge Function: telegram-notify
// تراکنش‌ها را به گروه تلگرام «تنخواه فراز» می‌فرستد/به‌روزرسانی/حذف می‌کند.
//
// امنیت:
//   - این تابع با verify_jwt=true دیپلوی می‌شود؛ فقط کاربر لاگین‌کرده می‌تواند صدا بزند.
//   - توکن ربات و chat_id در جدول خصوصی public.app_secrets نگه‌داری می‌شوند (RLS بدون policy
//     = anon/authenticated نمی‌توانند بخوانند). این تابع با Service Role می‌خواندشان.
//   - عکس فاکتور با Service Role از Storage دانلود و به‌صورت multipart فرستاده می‌شود،
//     پس حتی اگر باکت private شود هم کار می‌کند.
//
// ورودی (POST JSON): { action: "send" | "update" | "delete", id: "<uuid تراکنش>" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const toFa = (s: unknown) => String(s).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);

const CATEGORY_LABELS: Record<string, string> = {
  office: "امور اداری",
  food: "خوراک و رستوران",
  transport: "حمل و نقل",
  utilities: "قبوض و خدمات",
  others: "سایر موارد",
};

function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

function jalaliLong(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch {
    return dateStr;
  }
}

// نوع تراکنش → برچسب + ایموجی
function kindMeta(t: any): { label: string; emoji: string } {
  if (t.type === "income") return { label: "شارژ تنخواه", emoji: "🟢" };
  if (t.type === "settlement") return { label: "تسویه طلب همکار", emoji: "🤝" };
  if (t.type === "expense" && t.paid_by === "contact") return { label: "طلب همکار", emoji: "🟠" };
  return { label: "هزینه", emoji: "🔴" };
}

function buildCaption(t: any): string {
  const k = kindMeta(t);
  const lines: string[] = [];
  lines.push(`${k.emoji} <b>${escapeHtml(k.label)}</b>`);
  lines.push("———————————");
  lines.push(`💰 مبلغ: <b>${toFa(Number(t.amount || 0).toLocaleString("en-US"))}</b> تومان`);
  if (t.type !== "income" && t.type !== "settlement" && t.category) {
    lines.push(`🏷 دسته: ${escapeHtml(CATEGORY_LABELS[t.category] || t.category)}`);
  }
  if (t.cards?.name) lines.push(`💳 کارت: ${escapeHtml(t.cards.name)}`);
  if (t.contacts?.name) lines.push(`👤 همکار: ${escapeHtml(t.contacts.name)}`);
  if (t.title) lines.push(`📝 شرح: ${escapeHtml(t.title)}`);
  lines.push(`📅 تاریخ: ${toFa(jalaliLong(t.transaction_date))}`);
  return lines.join("\n");
}

const isPdf = (url: string) => /\.pdf($|\?)/i.test(url || "");

// مسیر فایل داخل باکت را از روی URL عمومی یا امضاشده درمی‌آورد
function storagePath(url: string, bucket: string): string | null {
  if (!url) return null;
  for (const marker of [`/object/public/${bucket}/`, `/object/sign/${bucket}/`, `/${bucket}/`]) {
    const i = url.indexOf(marker);
    if (i !== -1) return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  try {
    const { action, id } = await req.json();
    if (!["send", "update", "delete"].includes(action) || !id) {
      return json({ ok: false, error: "ورودی نامعتبر" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // احراز هویت واقعیِ کاربر: کلید publishable (که در فرانت عمومی است) نباید کافی باشد.
    // فقط یک JWT معتبرِ کاربرِ لاگین‌کرده پذیرفته می‌شود (getUser کلید publishable را رد می‌کند).
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ ok: false, error: "نیاز به ورود" }, 401);
    const { data: authData, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !authData?.user) return json({ ok: false, error: "دسترسی غیرمجاز" }, 401);

    // سکرت‌ها از جدول خصوصی
    const { data: secrets, error: secErr } = await admin
      .from("app_secrets").select("key,value").in("key", ["telegram_bot_token", "telegram_chat_id"]);
    if (secErr) throw secErr;
    const secretMap = Object.fromEntries((secrets || []).map((s: any) => [s.key, s.value]));
    const token = secretMap["telegram_bot_token"];
    const chatId = secretMap["telegram_chat_id"];
    if (!token) return json({ ok: false, error: "توکن ربات تنظیم نشده" }, 500);
    if (!chatId) return json({ ok: false, error: "شناسه‌ی گروه (chat_id) تنظیم نشده" }, 500);

    const api = (method: string) => `https://api.telegram.org/bot${token}/${method}`;
    const BUCKET = "invoices";

    // تراکنش به‌همراه نام همکار و کارت
    const { data: tx, error: txErr } = await admin
      .from("transactions").select("*, contacts(name), cards(name)").eq("id", id).single();
    if (txErr || !tx) return json({ ok: false, error: "تراکنش یافت نشد" }, 404);

    // ---- حذف پیام ----
    if (action === "delete") {
      if (!tx.telegram_message_id) return json({ ok: true, skipped: "پیامی در تلگرام نبود" });
      const r = await fetch(api("deleteMessage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: tx.telegram_message_id }),
      }).then((x) => x.json());
      // اگر پیام قبلاً حذف شده باشد هم موفق تلقی می‌کنیم
      await admin.from("transactions").update({ telegram_message_id: null, telegram_synced: false, telegram_has_photo: false }).eq("id", id);
      return json({ ok: true, telegram: r });
    }

    const caption = buildCaption(tx);

    // دانلود فایل فاکتور (در صورت وجود) با Service Role
    let fileBlob: Blob | null = null;
    let fileName = "invoice";
    let asDocument = false;
    if (tx.image_url) {
      const path = storagePath(tx.image_url, BUCKET);
      if (path) {
        const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(path);
        if (!dlErr && blob) {
          fileBlob = blob;
          asDocument = isPdf(path);
          fileName = path.split("/").pop() || (asDocument ? "invoice.pdf" : "invoice.jpg");
        }
      }
    }
    const newHasMedia = !!fileBlob;

    // تابع کمکی برای ارسال یک پیام تازه (عکس/سند/متن)
    async function sendFresh() {
      if (fileBlob) {
        const form = new FormData();
        form.append("chat_id", chatId);
        form.append("caption", caption);
        form.append("parse_mode", "HTML");
        form.append(asDocument ? "document" : "photo", fileBlob, fileName);
        const r = await fetch(api(asDocument ? "sendDocument" : "sendPhoto"), { method: "POST", body: form }).then((x) => x.json());
        return r;
      }
      const r = await fetch(api("sendMessage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: caption, parse_mode: "HTML" }),
      }).then((x) => x.json());
      return r;
    }

    let result: any;
    let messageId: number | null = null;
    let hasPhoto = newHasMedia;

    const oldHasMedia = !!tx.telegram_has_photo;
    const existing = action === "update" && tx.telegram_message_id;

    if (!existing) {
      // ارسال تازه
      result = await sendFresh();
      if (!result.ok) throw new Error("Telegram: " + (result.description || "send failed"));
      messageId = result.result.message_id;
    } else if (oldHasMedia === newHasMedia && newHasMedia) {
      // هر دو دارای فایل → ویرایش درجا با editMessageMedia (عکس جدید + کپشن)
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("message_id", String(tx.telegram_message_id));
      form.append("media", JSON.stringify({ type: asDocument ? "document" : "photo", media: "attach://media_file", caption, parse_mode: "HTML" }));
      form.append("media_file", fileBlob!, fileName);
      result = await fetch(api("editMessageMedia"), { method: "POST", body: form }).then((x) => x.json());
      if (!result.ok) throw new Error("Telegram: " + (result.description || "edit media failed"));
      messageId = tx.telegram_message_id;
    } else if (oldHasMedia === newHasMedia && !newHasMedia) {
      // هر دو بدون فایل → ویرایش متن
      result = await fetch(api("editMessageText"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: tx.telegram_message_id, text: caption, parse_mode: "HTML" }),
      }).then((x) => x.json());
      if (!result.ok) throw new Error("Telegram: " + (result.description || "edit text failed"));
      messageId = tx.telegram_message_id;
    } else {
      // نوع پیام عوض شده (فایل اضافه/حذف شده) → حذف و ارسال دوباره
      await fetch(api("deleteMessage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: tx.telegram_message_id }),
      }).catch(() => {});
      result = await sendFresh();
      if (!result.ok) throw new Error("Telegram: " + (result.description || "resend failed"));
      messageId = result.result.message_id;
    }

    await admin.from("transactions").update({
      telegram_message_id: messageId,
      telegram_synced: true,
      telegram_has_photo: hasPhoto,
    }).eq("id", id);

    return json({ ok: true, message_id: messageId });
  } catch (err) {
    return json({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
});
