// Service Worker untuk menangani push notifications
self.addEventListener('install', function (event) {
  console.log('[SW] Installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// Tangani event push dari server
self.addEventListener('push', function (event) {
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

      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (err) {
      console.error('[SW] Error parsing push event:', err);
    }
  }
});

// Tangani klik notifikasi
self.addEventListener('notificationclick', function (event) {
  console.log('[SW] Notification click:', event);
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
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  }
});

// Tangani pesan dari halaman (test manual notifikasi)
self.addEventListener('message', function (event) {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;

    showNotificationFromMessage(title, options);
  }
});

async function showNotificationFromMessage(title, options) {
  try {
    await self.registration.showNotification(title, options);
    console.log('[SW] Notification shown from message');
  } catch (error) {
    console.error('[SW] Error showing notification from message:', error);
  }
}
