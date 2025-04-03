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
  Download,
  Star,
  CreditCard,
  MapPin,
  ShoppingBag,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface OrderWithRelations {
  id: string;
  vendor_id: string;
  customer_id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  shipping_address: string;
  created_at: string;
  order_items?: OrderItem[];
}

interface CategoryCount {
  category: string;
  count: number;
}

interface PaymentMethodCount {
  method: string;
  count: number;
}

interface OrderStatusCount {
  status: string;
  count: number;
}

interface LocationCount {
  address: string;
  count: number;
}

interface OrderItem {
  products: {
    id: string;
    name: string;
    category: string;
    image_url: string;
    stock: number;
  } | null;
  quantity: number;
  price_at_time: number;
}

interface Review {
  id: string;
  product_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface SalesData {
  total_sales: number;
  total_orders: number;
  average_order_value: number;
  total_customers: number;
  sales_trend: number;
  orders_trend: number;
  average_rating: number;
  top_categories: CategoryCount[];
  payment_methods: PaymentMethodCount[];
  order_statuses: OrderStatusCount[];
  shipping_locations: LocationCount[];
}

interface DailySales {
  date: string;
  sales: number;
  orders: number;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  total_sales: number;
  image_url: string;
  stock: number;
  rating: number;
  review_count: number;
}

export function Reports() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchReportData();
    }
  }, [profile, dateRange]);

  const fetchReportData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      let previousStartDate = new Date();
      
      // Calculate current and previous period dates
      switch (dateRange) {
        case 'today':
          // Set to start of today
          startDate.setHours(0, 0, 0, 0);
          // Set to start of yesterday
          previousStartDate.setDate(now.getDate() - 1);
          previousStartDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          previousStartDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          previousStartDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          previousStartDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Fetch orders with order items and products
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price_at_time,
            products (
              id,
              name,
              category,
              image_url,
              stock
            )
          )
        `)
        .eq('vendor_id', profile.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      const typedOrders = orders as OrderWithRelations[];

      // Get all product IDs from orders
      const productIds = new Set<string>();
      typedOrders.forEach(order => {
        order.order_items?.forEach(item => {
          if (item.products?.id) {
            productIds.add(item.products.id);
          }
        });
      });

      // Fetch reviews for these products
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .in('product_id', Array.from(productIds))
        .gte('created_at', startDate.toISOString());

      if (reviewsError) throw reviewsError;

      // Calculate metrics
      const totalSales = typedOrders.reduce((sum, order) => sum + order.total_amount, 0);
      const totalOrders = typedOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      const uniqueCustomers = new Set(typedOrders.map(order => order.customer_id)).size;

      // Group reviews by product
      const reviewsByProduct = reviews.reduce((acc: Record<string, Review[]>, review: Review) => {
        if (!acc[review.product_id]) {
          acc[review.product_id] = [];
        }
        acc[review.product_id].push(review);
        return acc;
      }, {});

      // Calculate average rating from reviews
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / reviews.length 
        : 0;

      // Calculate top categories
      const categoryCount = typedOrders.reduce((acc, order) => {
        order.order_items?.forEach((item: OrderItem) => {
          const category = item.products?.category;
          if (category) {
            acc[category] = (acc[category] || 0) + 1;
          }
        });
        return acc;
      }, {} as Record<string, number>);

      const topCategories: CategoryCount[] = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate payment methods distribution
      const paymentCount = typedOrders.reduce((acc, order) => {
        acc[order.payment_method] = (acc[order.payment_method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const paymentMethods: PaymentMethodCount[] = Object.entries(paymentCount)
        .map(([method, count]) => ({ method, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate order statuses
      const statusCount = typedOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const orderStatuses: OrderStatusCount[] = Object.entries(statusCount)
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate shipping locations
      const locationCount = typedOrders.reduce((acc, order) => {
        const city = order.shipping_address.split(',')[1]?.trim() || order.shipping_address;
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const shippingLocations: LocationCount[] = Object.entries(locationCount)
        .map(([address, count]) => ({ address, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate top products with their reviews
      const productSales = typedOrders.reduce((acc, order) => {
        order.order_items?.forEach((item: OrderItem) => {
          const product = item.products;
          if (product) {
            if (!acc[product.id]) {
              acc[product.id] = {
                id: product.id,
                name: product.name,
                category: product.category,
                image_url: product.image_url,
                stock: product.stock,
                total_sales: 0,
                rating: 0,
                review_count: 0
              };
            }
            acc[product.id].total_sales += item.quantity * item.price_at_time;
            
            const productReviews = reviewsByProduct[product.id] || [];
            if (productReviews.length > 0) {
              const totalRating = productReviews.reduce((sum: number, review: Review): number => {
                return sum + review.rating;
              }, 0);
              acc[product.id].rating = totalRating / productReviews.length;
              acc[product.id].review_count = productReviews.length;
            }
          }
        });
        return acc;
      }, {} as Record<string, TopProduct>);

      const topProductsList: TopProduct[] = Object.values(productSales)
        .sort((a, b) => b.total_sales - a.total_sales)
        .slice(0, 5);

      setTopProducts(topProductsList);

      setSalesData({
        total_sales: totalSales,
        total_orders: totalOrders,
        average_order_value: averageOrderValue,
        total_customers: uniqueCustomers,
        sales_trend: 0, // Calculate trend
        orders_trend: 0, // Calculate trend
        average_rating: averageRating,
        top_categories: topCategories,
        payment_methods: paymentMethods,
        order_statuses: orderStatuses,
        shipping_locations: shippingLocations
      });

      // Set daily sales data
      const dailyData = typedOrders.reduce((acc: DailySales[], order) => {
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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getDateRangeTitle = () => {
    switch (dateRange) {
      case 'today':
        return 'Hari Ini';
      case 'week':
        return '7 Hari Terakhir';
      case 'month':
        return '30 Hari Terakhir';
      case 'year':
        return '1 Tahun Terakhir';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">
            Laporan Penjualan
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDateRange('today')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === 'today'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setDateRange('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === 'week'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => setDateRange('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === 'year'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              1 Tahun
            </button>
            <button
              onClick={() => {/* Implementasi export */}}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Penjualan</span>
            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-indigo-600" />
            </div>
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

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Pesanan</span>
            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
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

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Rating Rata-rata</span>
            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
              <Star className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <div className="flex items-baseline">
            <h3 className="text-2xl font-bold text-gray-900">
              {salesData?.average_rating.toFixed(1) || '0.0'}
            </h3>
            <span className="text-sm text-gray-500 ml-2">/ 5.0</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Pelanggan</span>
            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {salesData?.total_customers || 0}
          </h3>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Tren Penjualan - {getDateRangeTitle()}
            </h3>
            <button
              onClick={() => toggleSection('sales')}
              className="text-gray-400 hover:text-gray-600"
              aria-label={`Toggle ${getDateRangeTitle().toLowerCase()} section`}
              title={`Toggle ${getDateRangeTitle().toLowerCase()} section`}
            >
              <ChevronDown className={`h-5 w-5 transform transition-transform ${
                expandedSection === 'sales' ? 'rotate-180' : ''
              }`} />
            </button>
          </div>
          {(expandedSection === 'sales' || !expandedSection) && (
            <div className="h-64">
              <div className="h-full flex items-end justify-between space-x-2">
                {dailySales.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div 
                        className="w-full bg-indigo-600 rounded-t-lg transition-all group-hover:bg-indigo-500"
                        style={{ 
                          height: `${(day.sales / Math.max(...dailySales.map(d => d.sales))) * 100}%`
                        }}
                      >
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-1 px-2">
                            {formatCurrency(day.sales)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">{day.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Produk Terlaris</h3>
            <button
              onClick={() => toggleSection('products')}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Toggle produk terlaris section"
              title="Toggle produk terlaris section"
            >
              <ChevronDown className={`h-5 w-5 transform transition-transform ${
                expandedSection === 'products' ? 'rotate-180' : ''
              }`} />
            </button>
          </div>
          {(expandedSection === 'products' || !expandedSection) && (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center space-x-4">
                  <div className="flex-none w-12 h-12">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {product.category} • Stok: {product.stock}
                    </p>
                  </div>
                  <div className="flex-none text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(product.total_sales)}
                    </p>
                    <div className="flex items-center justify-end">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-gray-500">
                        {product.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Metode Pembayaran</h3>
            <CreditCard className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {salesData?.payment_methods.map((method, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {method.method.replace('_', ' ')}
                </span>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">
                    {method.count}
                  </span>
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${(method.count / salesData.total_orders) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Status Pesanan</h3>
            <Package className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {salesData?.order_statuses.map((status, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {status.status.replace('_', ' ')}
                </span>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">
                    {status.count}
                  </span>
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${(status.count / salesData.total_orders) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Locations */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Lokasi Pengiriman</h3>
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {salesData?.shipping_locations.map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate max-w-[150px]">
                  {location.address}
                </span>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">
                    {location.count}
                  </span>
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${(location.count / salesData.total_orders) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dateRange === 'today' && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Hari Ini</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Pesanan Baru</p>
              <p className="text-xl font-semibold text-gray-900">{salesData?.total_orders || 0}</p>
              <div className={`flex items-center text-sm ${
                (salesData?.orders_trend ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(salesData?.orders_trend ?? 0) >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                {Math.abs(salesData?.orders_trend ?? 0).toFixed(1)}% dibanding kemarin
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Pendapatan</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(salesData?.total_sales || 0)}
              </p>
              <div className={`flex items-center text-sm ${
                (salesData?.sales_trend ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(salesData?.sales_trend ?? 0) >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                {Math.abs(salesData?.sales_trend ?? 0).toFixed(1)}% dibanding kemarin
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Rata-rata Pesanan</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(salesData?.average_order_value || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Pelanggan Unik</p>
              <p className="text-xl font-semibold text-gray-900">
                {salesData?.total_customers || 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 