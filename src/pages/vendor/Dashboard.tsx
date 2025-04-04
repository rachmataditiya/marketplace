import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Store, Package, ShoppingBag, BarChart2, Menu, X, User, LogOut, Bell } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Products } from './Products';
import { Orders } from './Orders';
import { POS } from './POS';
import { Profile } from './Profile';
import { Reports } from './Reports';

// Helper function to convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  // Remove any whitespace
  base64String = base64String.trim();
  
  // Add padding if needed
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  // Convert to binary
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function VendorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [showSidebar, setShowSidebar] = React.useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const sendPushNotification = async (subscription: PushSubscription) => {
    try {
      console.log('Attempting to send push notification...');
      console.log('Subscription details:', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey('p256dh'),
          auth: subscription.getKey('auth')
        }
      });

      const response = await fetch('/api/send-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          notification: {
            title: 'Pesanan Baru!',
            body: 'Ada pesanan baru yang membutuhkan perhatian Anda',
            icon: '/android-chrome-192x192.png',
            badge: '/android-chrome-192x192.png',
            data: {
              url: '/vendor/orders'
            },
            actions: [
              {
                action: 'view',
                title: 'Lihat Pesanan'
              }
            ]
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to send push notification: ${errorData.message || response.statusText}`);
      }

      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  };

  // Request notification permission and setup push notifications
  useEffect(() => {
    if (!profile) return;

    const setupPushNotifications = async () => {
      try {
        // Request permission
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
          console.log('Push notification permission denied');
          return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered:', registration);

        // Get VAPID public key
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) {
          throw new Error('VAPID public key not found');
        }

        // Convert VAPID key to Uint8Array
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });

        console.log('Push notification setup completed:', {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.getKey('p256dh'),
            auth: subscription.getKey('auth')
          }
        });

        // Setup visibility change handler
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible') {
            console.log('Tab became visible, checking service worker...');
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            console.log('Current subscription:', subscription);
          }
        });

        // Periodically check service worker status
        setInterval(async () => {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          console.log('Service worker status check:', {
            active: registration.active,
            subscription: subscription ? 'exists' : 'none'
          });
        }, 30000); // Check every 30 seconds

      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };

    setupPushNotifications();
  }, [profile]);

  // Hide sidebar when location changes
  useEffect(() => {
    setShowSidebar(false);
  }, [location]);

  // Subscribe to new orders
  useEffect(() => {
    if (!profile) return;

    // Setup keep-alive interval untuk Supabase realtime
    const keepAliveInterval = setInterval(() => {
      supabase.channel('keep-alive').subscribe();
    }, 30000); // setiap 30 detik

    // Subscribe to new orders
    const orderSubscription = supabase
      .channel('new_orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${profile.id}`,
        },
        async (payload) => {
          // Only count if it's an online order (customer_id !== vendor_id)
          if (payload.new.customer_id !== profile.id) {
            console.log('New order detected:', payload.new);
            setNewOrdersCount(prev => prev + 1);
            
            // Show toast notification
            toast.custom((t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <ShoppingBag className="h-10 w-10 text-indigo-600" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Pesanan Baru
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Ada pesanan baru yang membutuhkan perhatian Anda
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      navigate('/vendor/orders');
                    }}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                  >
                    Lihat
                  </button>
                </div>
              </div>
            ));

            // Send push notification
            try {
              console.log('Attempting to send push notification for new order...');
              const registration = await navigator.serviceWorker.ready;
              console.log('Service worker ready:', registration);
              
              const subscription = await registration.pushManager.getSubscription();
              console.log('Current subscription:', subscription);
              
              if (subscription) {
                await sendPushNotification(subscription);
              } else {
                console.log('No active subscription found');
              }
            } catch (error) {
              console.error('Error sending push notification:', error);
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      clearInterval(keepAliveInterval);
      orderSubscription.unsubscribe();
    };
  }, [profile, navigate]);

  // Reset new orders count when visiting orders page
  useEffect(() => {
    if (location.pathname === '/vendor/orders') {
      setNewOrdersCount(0);
    }
  }, [location.pathname]);

  const menuItems = [
    { icon: Store, label: 'Penjualan', path: '' },
    { icon: Package, label: 'Produk', path: 'products' },
    { icon: ShoppingBag, label: 'Pesanan', path: 'orders' },
    { icon: BarChart2, label: 'Laporan', path: 'reports' },
  ];

  const currentPath = location.pathname.split('/').pop() || '';
  const currentMenuItem = menuItems.find(item => item.path === currentPath);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50">
      <Toaster position="top-right" />
      {/* Header */}
      <div className="flex-none bg-white border-b shadow-sm">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 md:hidden"
              aria-label="Toggle Menu"
            >
              {showSidebar ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <div className="ml-4">
              <h1 className="text-lg font-semibold text-gray-900">
                {currentMenuItem?.label || 'Dashboard'}
              </h1>
              <p className="text-sm text-gray-500">{profile?.store_name || 'Toko'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/vendor/profile')}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              aria-label="Profile"
            >
              <User className="h-6 w-6" />
            </button>
            <button
              onClick={signOut}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              aria-label="Logout"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out
            ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0
          `}
        >
          <div className="h-full flex flex-col">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center">
                  <Store className="h-8 w-8 text-indigo-600" />
                  <span className="ml-2 text-xl font-bold">Seller Dashboard</span>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 md:hidden"
                  aria-label="Hide Sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-8 flex-1 px-2 space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(`/vendor/${item.path}`);
                      setShowSidebar(false);
                    }}
                    className={`
                      group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg w-full transition-colors relative
                      ${item.path === currentPath
                        ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                      }
                    `}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                    {item.path === 'orders' && newOrdersCount > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                        {newOrdersCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-medium">
                      {profile?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{profile?.name}</p>
                  <p className="text-xs text-gray-500">{profile?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <main className="p-4">
            <Routes>
              <Route index element={<POS />} />
              <Route path="products" element={<Products />} />
              <Route path="orders" element={<Orders />} />
              <Route path="reports" element={<Reports />} />
              <Route path="profile" element={<Profile />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}