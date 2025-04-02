import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Users, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SalesData {
  total_sales: number;
  total_orders: number;
  average_order_value: number;
  total_customers: number;
  sales_trend: number;
  orders_trend: number;
}

interface DailySales {
  date: string;
  sales: number;
  orders: number;
}

export function Reports() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    if (profile) {
      fetchReportData();
    }
  }, [profile, dateRange]);

  const fetchReportData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Hitung tanggal awal berdasarkan range yang dipilih
      const now = new Date();
      let startDate = new Date();
      switch (dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch data penjualan
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', profile.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Hitung metrics
      const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      const uniqueCustomers = new Set(orders.map(order => order.customer_id)).size;

      // Hitung trend (perbandingan dengan periode sebelumnya)
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - (dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365));
      
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', profile.id)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      const previousTotalSales = previousOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const previousTotalOrders = previousOrders?.length || 0;

      const salesTrend = previousTotalSales > 0 
        ? ((totalSales - previousTotalSales) / previousTotalSales) * 100 
        : 0;
      const ordersTrend = previousTotalOrders > 0
        ? ((totalOrders - previousTotalOrders) / previousTotalOrders) * 100
        : 0;

      // Set data penjualan harian
      const dailyData = orders.reduce((acc: DailySales[], order) => {
        const date = new Date(order.created_at).toLocaleDateString('id-ID', { 
          day: 'numeric',
          month: 'short'
        });
        const existingDay = acc.find(d => d.date === date);
        if (existingDay) {
          existingDay.sales += order.total_amount;
          existingDay.orders += 1;
        } else {
          acc.push({
            date,
            sales: order.total_amount,
            orders: 1
          });
        }
        return acc;
      }, []);

      setSalesData({
        total_sales: totalSales,
        total_orders: totalOrders,
        average_order_value: averageOrderValue,
        total_customers: uniqueCustomers,
        sales_trend: salesTrend,
        orders_trend: ordersTrend
      });
      setDailySales(dailyData);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gray-50 p-4">
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex-none bg-white border-b">
            <div className="px-4 py-3">
              <h1 className="text-lg font-bold text-gray-900">Laporan Penjualan</h1>
            </div>
          </div>
          <div className="flex-1 p-4">
            <div className="h-full flex items-center justify-center">
              <div className="text-gray-500">Memuat data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 p-4">
      {/* Main Container */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex-none bg-white border-b">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Laporan Penjualan</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {/* Implementasi export PDF */}}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex-none p-4 bg-white border-b">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDateRange('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === 'week'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => setDateRange('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === 'year'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1 Tahun
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Sales */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Total Penjualan</span>
                <DollarSign className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesData?.total_sales || 0)}
                </h3>
                <div className={`flex items-center text-sm ${
                  (salesData?.sales_trend ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(salesData?.sales_trend ?? 0) >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(salesData?.sales_trend ?? 0).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Total Pesanan</span>
                <Package className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  {salesData?.total_orders || 0}
                </h3>
                <div className={`flex items-center text-sm ${
                  (salesData?.orders_trend ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(salesData?.orders_trend ?? 0) >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(salesData?.orders_trend ?? 0).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Average Order Value */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Rata-rata Pesanan</span>
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesData?.average_order_value || 0)}
                </h3>
              </div>
            </div>

            {/* Total Customers */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Total Pelanggan</span>
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  {salesData?.total_customers || 0}
                </h3>
              </div>
            </div>
          </div>

          {/* Sales Chart */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Penjualan Harian</h3>
            <div className="h-64 flex items-end justify-between space-x-1">
              {dailySales.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-indigo-600 rounded-t-lg"
                    style={{ 
                      height: `${(day.sales / Math.max(...dailySales.map(d => d.sales))) * 100}%`
                    }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{day.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Aktivitas Terbaru</h3>
            <div className="space-y-4">
              {dailySales.slice(-5).reverse().map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{day.date}</p>
                      <p className="text-xs text-gray-500">{day.orders} pesanan</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-indigo-600">
                    {formatCurrency(day.sales)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 