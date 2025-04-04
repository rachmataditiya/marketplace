importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const { clients } = self;

// Handle push events
self.addEventListener('push', async (event) => {
  console.log('Push event received:', event);
  
  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/android-chrome-192x192.png',
      badge: data.badge || '/android-chrome-192x192.png',
      data: data.data || {},
      requireInteraction: true,
      tag: data.tag || 'notification-' + Date.now()
    };

    console.log('Showing notification with options:', options);
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'New Notification', options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view' && event.notification.data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
    );
  }
});

// Handle messages from the client
self.addEventListener('message', async (event) => {
  console.log('Message received from client:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    try {
      console.log('Attempting to show notification:', event.data);
      const notification = await self.registration.showNotification(event.data.title, {
        body: event.data.options.body,
        icon: event.data.options.icon || '/android-chrome-192x192.png',
        badge: event.data.options.badge || '/android-chrome-192x192.png',
        data: event.data.options.data || {},
        requireInteraction: true,
        tag: event.data.options.tag || 'notification-' + Date.now()
      });
      console.log('Notification shown successfully:', notification);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
}); 