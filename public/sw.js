// Service Worker untuk menangani push notifications
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push event received:', event);
  
  if (event.data) {
    try {
      console.log('[Service Worker] Push event data:', event.data);
      const data = event.data.json();
      console.log('[Service Worker] Parsed push data:', data);
      
      const options = {
        body: data.body,
        icon: '/android-chrome-192x192.png',
        badge: '/android-chrome-192x192.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: data.actions || [],
        requireInteraction: true,
        tag: data.tag || 'default-tag'
      };

      console.log('[Service Worker] Showing notification with options:', options);
      event.waitUntil(
        self.registration.showNotification(data.title, options)
          .then(() => console.log('[Service Worker] Notification shown successfully'))
          .catch(error => console.error('[Service Worker] Error showing notification:', error))
      );
    } catch (error) {
      console.error('[Service Worker] Error processing push event:', error);
    }
  } else {
    console.log('[Service Worker] Push event received but no data');
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click event:', event);
  event.notification.close();
  
  if (event.action === 'view') {
    console.log('[Service Worker] Opening URL:', event.notification.data.url);
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
}); 