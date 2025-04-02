import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Users, Store, ShoppingBag, BarChart2, Settings, LogOut } from 'lucide-react';
import { Vendors } from './Vendors';
import { Products } from './Products';
import { Orders } from './Orders';
import { Reports } from './Reports';

export function AdminDashboard() {
  const navigate = useNavigate();

  const menuItems = [
    { icon: Store, label: 'Vendors', path: 'vendors' },
    { icon: ShoppingBag, label: 'Products', path: 'products' },
    { icon: Users, label: 'Orders', path: 'orders' },
    { icon: BarChart2, label: 'Reports', path: 'reports' },
    { icon: Settings, label: 'Settings', path: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={`/admin/${item.path}`}
                  className="inline-flex items-center px-4 border-b-2 border-transparent hover:border-indigo-500 text-gray-500 hover:text-gray-700"
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  {item.label}
                </Link>
              ))}
            </div>
            <button
              onClick={() => navigate('/logout')}
              className="inline-flex items-center px-4 text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route index element={<AdminHome />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="reports" element={<Reports />} />
        </Routes>
      </div>
    </div>
  );
}

function AdminHome() {
  const stats = [
    { label: 'Total Vendors', value: '156' },
    { label: 'Active Products', value: '2,451' },
    { label: 'Total Orders', value: '1,245' },
    { label: 'Monthly Revenue', value: 'Rp 45.240.000' },
  ];

  const recentVendors = [
    {
      id: '1',
      name: 'Warung Bu Siti',
      owner: 'Siti Aminah',
      status: 'pending',
      products: 12,
      joinDate: '2024-03-15',
    },
    // Add more vendors...
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Vendors */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Vendor Applications</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentVendors.map((vendor) => (
            <div key={vendor.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{vendor.name}</p>
                  <p className="text-sm text-gray-500">{vendor.owner}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending Approval
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}