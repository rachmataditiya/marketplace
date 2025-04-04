import { Handler } from '@netlify/functions';
import webpush from 'web-push';

const handler: Handler = async (event) => {
  // Hanya terima POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { subscription, notification } = JSON.parse(event.body || '{}');

    if (!subscription || !notification) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing subscription or notification data' }),
      };
    }

    // Gunakan VAPID keys dari environment variables
    const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VITE_VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'VAPID keys not configured' }),
      };
    }

    // Set VAPID keys
    webpush.setVapidDetails(
      'mailto:your-email@example.com', // Ganti dengan email Anda
      vapidPublicKey,
      vapidPrivateKey
    );

    // Kirim push notification
    await webpush.sendNotification(subscription, JSON.stringify(notification));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Push notification sent successfully' }),
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send push notification' }),
    };
  }
};

export { handler }; 