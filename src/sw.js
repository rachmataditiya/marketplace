console.log('[SW] Service Worker v1.0.1 loaded');

// Instalasi awal
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(self.skipWaiting());
});

// Aktivasi SW
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// Terima push dari server (jika pakai push real)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW] Push data:', data);

      const options = {
        body: data.body,
        icon: data.icon || '/android-chrome-192x192.png',
        badge: data.badge || '/android-chrome-192x192.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: data.actions || [],
        requireInteraction: true,
        tag: data.tag || 'default-tag',
      };

      event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (err) {
      console.error('[SW] Error parsing push data:', err);
    }
  }
});

// Klik notifikasi
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  event.notification.close();

  const targetUrl = event.notification.data?.url;
  if (targetUrl) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        for (const client of windowClients) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
    );
  }
});

// Terima pesan dari halaman
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    showNotificationFromMessage(title, options);
  }

  // Support SKIP_WAITING untuk reload paksa SW
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function showNotificationFromMessage(title, options) {
  try {
    await self.registration.showNotification(title, options);
    console.log('[SW] Notification shown from message');
  } catch (error) {
    console.error('[SW] Error showing notification:', error);
  }
}
