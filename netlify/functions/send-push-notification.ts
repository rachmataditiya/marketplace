import { Handler } from '@netlify/functions';
import webpush from 'web-push';

const handler: Handler = async (event) => {
  // Hanya terima POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Received request:', event.body);
    const { subscription, notification } = JSON.parse(event.body || '{}');

    if (!subscription || !notification) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Missing subscription or notification data' }),
      };
    }

    // Gunakan VAPID keys dari environment variables
    const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VITE_VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not found:', {
        hasPublicKey: !!vapidPublicKey,
        hasPrivateKey: !!vapidPrivateKey,
        env: process.env
      });
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'VAPID keys not configured' }),
      };
    }

    console.log('VAPID keys configured:', {
      hasPublicKey: !!vapidPublicKey,
      hasPrivateKey: !!vapidPrivateKey
    });

    // Set VAPID keys
    webpush.setVapidDetails(
      'mailto:raditiya@me.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    console.log('Sending push notification to:', subscription.endpoint);
    console.log('Notification data:', notification);

    // Format data notifikasi
    const pushData = {
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      data: notification.data || {},
      actions: notification.actions || [],
      requireInteraction: true,
      tag: notification.tag || 'default-tag'
    };

    console.log('Formatted push data:', pushData);

    // Kirim push notification
    await webpush.sendNotification(subscription, JSON.stringify(pushData));

    console.log('Push notification sent successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Push notification sent successfully' }),
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Failed to send push notification', details: error.message }),
    };
  }
};

export { handler }; 