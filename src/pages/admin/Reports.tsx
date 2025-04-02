import React from 'react';
import { BarChart2, TrendingUp, Users, ShoppingBag } from 'lucide-react';

export function Reports() {
  const stats = [
    {
      name: 'Total Pendapatan',
      value: 'Rp 45.240.000',
      change: '+12.5%',
      changeType: 'increase',
    },
    {
      name: 'Total Pesanan',
      value: '1,245',
      change: '+8.2%',
      changeType: 'increase',
    },
    {
      name: 'Pelanggan Aktif',
      value: '2,341',
      change: '+5.4%',
      changeType: 'increase',
    },
    {
      name: 'Penjual Baru',
      value: '15',
      change: '+2.3%',
      changeType: 'increase',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Laporan</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {stat.name === 'Total Pendapatan' ? (
                  <BarChart2 className="h-6 w-6 text-indigo-600" />
                ) : stat.name === 'Total Pesanan' ? (
                  <ShoppingBag className="h-6 w-6 text-indigo-600" />
                ) : stat.name === 'Pelanggan Aktif' ? (
                  <Users className="h-6 w-6 text-indigo-600" />
                ) : (
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                )}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">{stat.value}</p>
                <p className={`mt-1 text-sm ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts would go here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Pendapatan Bulanan</h2>
          <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">Grafik Pendapatan</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Pesanan per Kategori</h2>
          <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">Grafik Kategori</p>
          </div>
        </div>
      </div>
    </div>
  );
}