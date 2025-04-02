import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Store, Package, ShoppingBag, BarChart2, Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Products } from './Products';
import { Orders } from './Orders';
import { POS } from './POS';
import { Profile } from './Profile';
import { Reports } from './Reports';

export function VendorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [showSidebar, setShowSidebar] = React.useState(false);

  // Hide sidebar when location changes
  useEffect(() => {
    setShowSidebar(false);
  }, [location]);

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
                      group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg w-full transition-colors
                      ${item.path === currentPath
                        ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                      }
                    `}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
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