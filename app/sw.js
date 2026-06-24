// سرویس‌ورکر ساده برای PWA — کش پوسته‌ی اپ (offline shell)
const CACHE = "tankhah-v15";
const SHELL = [
  "./",
  "./index.html",
  "./login.html",
  "./transactions.html",
  "./add.html",
  "./contacts.html",
  "./settings.html",
  "./config.js",
  "./css/tw.css",
  "./css/app.css",
  "./js/common.js",
  "./js/modal.js",
  "./js/jdate.js",
  "./js/jalali-picker.js",
  "./js/auth.js",
  "./js/login.js",
  "./js/supabase.js",
  "./js/dashboard.js",
  "./js/transactions.js",
  "./js/add.js",
  "./js/contacts.js",
  "./js/settings.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // درخواست‌های Supabase و خارجی: همیشه از شبکه (کش نشود)
  if (url.origin !== location.origin) return;

  // منابع هم‌مبدأ: stale-while-revalidate
  // فوراً از کش سرو می‌شود (سریع) و نسخه‌ی تازه در پس‌زمینه به‌روزرسانی می‌شود.
  // تازگیِ پس از انتشار با bump نسخه‌ی CACHE تضمین می‌شود (کش قدیمی در activate پاک می‌شود).
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || (req.mode === "navigate" ? caches.match("./index.html") : undefined));
      return cached || network;
    })
  );
});
