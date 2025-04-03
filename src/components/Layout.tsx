import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export function Layout() {
  const location = useLocation();
  const isVendorPage = location.pathname.startsWith('/vendor');
  const isAdminPage = location.pathname.startsWith('/admin');

  if (isVendorPage || isAdminPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <PWAInstallPrompt />
    </div>
  );
}