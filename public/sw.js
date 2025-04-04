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
        icon: data.icon || '/android-chrome-192x192.png',
        badge: data.badge || '/android-chrome-192x192.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: data.actions || [],
        requireInteraction: true,
        tag: data.tag || 'default-tag'
      };

      console.log('[Service Worker] Showing notification with options:', options);
      
      // Pastikan event.waitUntil digunakan dengan benar
      event.waitUntil(
        Promise.resolve()
          .then(() => {
            console.log('[Service Worker] About to show notification');
            return self.registration.showNotification(data.title, options);
          })
          .then(() => {
            console.log('[Service Worker] Notification shown successfully');
            return self.registration.getNotifications();
          })
          .then(notifications => {
            console.log('[Service Worker] Current notifications:', notifications);
          })
          .catch(error => {
            console.error('[Service Worker] Error showing notification:', error);
            console.error('[Service Worker] Error details:', error.message);
            console.error('[Service Worker] Error stack:', error.stack);
          })
      );
    } catch (error) {
      console.error('[Service Worker] Error processing push event:', error);
      console.error('[Service Worker] Error details:', error.message);
      console.error('[Service Worker] Error stack:', error.stack);
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