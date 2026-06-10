// Service Worker for Web Push notifications with analytics tracking.

const SUPABASE_URL = "https://yyendbkedzfnsmjiclhg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZW5kYmtlZHpmbnNtamljbGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Njk5MjksImV4cCI6MjA5MzA0NTkyOX0.wub6Nyhf6L5XAAMPQSqY8mKt5r3hUVh9vZGJ0eLydlc";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function trackEvent(eventType, notificationId, url) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/push_events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        notification_id: notificationId || null,
        event_type: eventType,
        url: url || null,
        user_agent: (self.navigator && self.navigator.userAgent) ? self.navigator.userAgent.slice(0, 300) : null,
      }),
    });
  } catch (_) { /* no-op */ }
}

self.addEventListener("push", (event) => {
  let data = { title: "TOUT DE SUITE", body: "Nouvelle notification", url: "/", type: "info", id: "" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }

  const isPremium = data.type === "new_premium_listing";
  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    image: data.image,
    tag: data.id || data.url,
    data: { url: data.url || "/", notification_id: data.id || null },
    vibrate: isPremium ? [200, 100, 200, 100, 300] : [100, 50, 100],
    requireInteraction: isPremium,
    actions: [{ action: "open", title: "Voir l'annonce" }],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      trackEvent("delivered", data.id || null, data.url || null),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  const nid = event.notification.data && event.notification.data.notification_id;
  event.waitUntil(
    Promise.all([
      trackEvent("click", nid, url),
      (async () => {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })(),
    ])
  );
});

self.addEventListener("notificationclose", (event) => {
  const nid = event.notification.data && event.notification.data.notification_id;
  const url = (event.notification.data && event.notification.data.url) || null;
  event.waitUntil(trackEvent("dismiss", nid, url));
});
