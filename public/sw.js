// Service Worker untuk menangani push notifications
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (event.data) {
    console.log('Push event data:', event.data);
    const data = event.data.json();
    console.log('Parsed push data:', data);
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url
      },
      actions: [
        {
          action: 'view',
          title: 'Lihat Pesanan'
        }
      ]
    };

    console.log('Showing notification with options:', options);
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } else {
    console.log('Push event received but no data');
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click event:', event);
  event.notification.close();
  
  if (event.action === 'view') {
    console.log('Opening URL:', event.notification.data.url);
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
}); 