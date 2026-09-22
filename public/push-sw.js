self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "TIControl", {
    body: data.body || "Há uma atualização no monitoramento.",
    icon: "/favicon.ico",
    data: { url: data.url || "/infra/monitoring" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});