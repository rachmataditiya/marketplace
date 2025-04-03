import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'https://esm.sh/web-push@3.6.7'

serve(async (req) => {
  try {
    console.log('Edge function started');
    const { subscription, notification } = await req.json()
    console.log('Received request data:', { subscription, notification })

    // Get VAPID keys from environment variables
    const VAPID_PUBLIC_KEY = Deno.env.get('VITE_VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VITE_VAPID_PRIVATE_KEY')

    console.log('VAPID keys configured:', {
      hasPublicKey: !!VAPID_PUBLIC_KEY,
      hasPrivateKey: !!VAPID_PRIVATE_KEY
    })

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured')
    }

    // Send push notification
    console.log('Sending push notification...')
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
    console.log('Push notification sent successfully')

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in edge function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 