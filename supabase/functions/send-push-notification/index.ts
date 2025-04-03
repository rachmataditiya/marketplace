import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'https://esm.sh/web-push@3.6.7'

serve(async (req) => {
  try {
    const { subscription, notification } = await req.json()

    // Get VAPID keys from environment variables
    const VAPID_PUBLIC_KEY = Deno.env.get('VITE_VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VITE_VAPID_PRIVATE_KEY')

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured')
    }

    // Send push notification
    await webpush.sendNotification(
      subscription,
      JSON.stringify(notification),
      {
        vapidDetails: {
          subject: 'mailto:raditiya@me.com',
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: VAPID_PRIVATE_KEY,
        },
      }
    )

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 