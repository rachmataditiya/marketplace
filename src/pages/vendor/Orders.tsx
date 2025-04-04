import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, XCircle, Loader2, Search, X, ChevronRight, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface ExtendedOrder extends Order {
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  order_items: {
    id: string;
    product: {
      name: string;
      price: number;
    };
    quantity: number;
    price_at_time: number;
  }[];
}

export function Orders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const [showTodayOnly, setShowTodayOnly] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchOrders();
      setupRealtimeSubscription();
    }
  }, [profile]);

  // Tambahan useEffect untuk refetch orders saat halaman kembali aktif
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && profile) {
        fetchOrders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile]);

  const setupRealtimeSubscription = () => {
    if (!profile) return;

    console.log('Setting up Supabase realtime subscription for orders');

    // Buat channel yang unik per vendor
    const channel = supabase.channel(`orders-${profile.id}`);
    
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${profile.id}`,
        },
        async (payload: RealtimePostgresChangesPayload<Order>) => {
          console.log('Received Supabase realtime event:', {
            eventType: payload.eventType,
            orderId: payload.new?.id || payload.old?.id,
            oldStatus: payload.old?.status,
            newStatus: payload.new?.status,
            fullPayload: payload
          });

          if (payload.eventType === 'INSERT' && payload.new) {
            try {
              // Fetch order baru dengan semua relasinya
              const { data: newOrder, error } = await supabase
                .from('orders')
                .select(`
                  *,
                  customer:customer_id (
                    name,
                    phone,
                    address
                  ),
                  order_items (
                    id,
                    quantity,
                    price_at_time,
                    product:product_id (
                      name,
                      price
                    )
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (error) throw error;
              if (!newOrder) {
                console.error('No order data received for new order');
                return;
              }

              console.log('Adding new order to state:', newOrder);
              setOrders(prevOrders => {
                // Pastikan order belum ada di state
                if (prevOrders.some(order => order.id === newOrder.id)) {
                  console.log('Order already exists in state, skipping');
                  return prevOrders;
                }
                return [newOrder, ...prevOrders];
              });
            } catch (error) {
              console.error('Error fetching new order:', error);
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            try {
              // Fetch order yang diupdate dengan semua relasinya
              const { data: updatedOrder, error } = await supabase
                .from('orders')
                .select(`
                  *,
                  customer:customer_id (
                    name,
                    phone,
                    address
                  ),
                  order_items (
                    id,
                    quantity,
                    price_at_time,
                    product:product_id (
                      name,
                      price
                    )
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (error) throw error;
              if (!updatedOrder) {
                console.error('No order data received for update');
                return;
              }

              console.log('Updating order in state:', {
                orderId: updatedOrder.id,
                oldStatus: payload.old?.status,
                newStatus: updatedOrder.status,
                fullOrder: updatedOrder,
                payloadStatus: payload.new.status
              });

              setOrders(prevOrders => {
                // Cari order yang akan diupdate
                const orderToUpdate = prevOrders.find(order => order.id === updatedOrder.id);
                if (!orderToUpdate) {
                  console.log('Order not found in state, skipping update');
                  return prevOrders;
                }

                // Gunakan status dari payload untuk update
                const newStatus = payload.new.status;
                if (!newStatus) {
                  console.log('No status in payload, skipping update');
                  return prevOrders;
                }

                // Pastikan status benar-benar berubah
                if (orderToUpdate.status === newStatus) {
                  console.log('Order status unchanged, skipping update');
                  return prevOrders;
                }

                console.log('Updating order:', {
                  id: orderToUpdate.id,
                  oldStatus: orderToUpdate.status,
                  newStatus: newStatus
                });

                // Update order dengan status dari payload
                const updatedOrderWithNewStatus = {
                  ...updatedOrder,
                  status: newStatus
                };

                // Update hanya order yang sesuai
                const newOrders = prevOrders.map(order => 
                  order.id === updatedOrder.id ? updatedOrderWithNewStatus : order
                );

                // Verifikasi perubahan
                const verifyUpdate = newOrders.find(order => order.id === updatedOrder.id);
                console.log('Verifying update:', {
                  orderId: verifyUpdate?.id,
                  status: verifyUpdate?.status,
                  expectedStatus: newStatus
                });

                return newOrders;
              });
            } catch (error) {
              console.error('Error fetching updated order:', error);
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            console.log('Removing order from state:', payload.old.id);
            setOrders(prevOrders => 
              prevOrders.filter(order => order.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for vendor ${profile.id}:`, status);
      });

    return () => {
      console.log(`Unsubscribing from Supabase realtime channel for vendor ${profile.id}`);
      channel.unsubscribe();
    };
  };

  const fetchOrders = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customer_id (
            name,
            phone,
            address
          ),
          order_items (
            id,
            quantity,
            price_at_time,
            product:product_id (
              name,
              price
            )
          )
        `)
        .eq('vendor_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    setProcessingOrder(orderId);
    try {
      console.log(`Updating order ${orderId} status to ${status}`);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      console.log(`Order ${orderId} status updated to ${status} successfully`);
      
      // Tidak perlu memanggil fetchOrders() karena kita akan menerima update melalui subscription
      setSelectedOrder(null); // Close modal after successful update
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Gagal mengupdate status pesanan');
    } finally {
      setProcessingOrder(null);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipping: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    };
    return badges[status];
  };

  const getStatusIcon = (status: Order['status']) => {
    const icons = {
      pending: Package,
      processing: Package,
      shipping: Truck,
      delivered: CheckCircle,
      cancelled: XCircle,
      completed: CheckCircle,
    };
    return icons[status];
  };

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    const today = new Date();
    const isToday = orderDate.toDateString() === today.toDateString();
    
    const matchesSearch = searchQuery
      ? order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return (showTodayOnly ? isToday : true) && matchesSearch;
  });

  const isOfflineOrder = (order: ExtendedOrder) => {
    return order.customer_id === profile?.id;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-4">
      {/* Main Container */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex-none bg-white border-b">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Pesanan</h1>
            <button
              onClick={() => setShowTodayOnly(!showTodayOnly)}
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showTodayOnly
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              {showTodayOnly ? 'Hari Ini' : 'Semua'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex-none p-4 bg-white border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari pesanan berdasarkan ID atau nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 px-4 pl-11 rounded-xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-0 text-sm bg-gray-50 transition-colors"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada pesanan</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? 'Tidak ada pesanan yang sesuai dengan pencarian Anda'
                  : showTodayOnly
                  ? 'Belum ada pesanan hari ini'
                  : 'Belum ada pesanan masuk'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);
                return (
                  <div 
                    key={order.id} 
                    className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => setSelectedOrder(order)}
                  >
                    {/* Order Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isOfflineOrder(order) ? (
                            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Offline Order
                            </div>
                          ) : (
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                              <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </div>
                          )}
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="px-4 py-3">
                      <div className="space-y-2">
                        {!isOfflineOrder(order) && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Customer</span>
                            <span className="text-sm font-medium text-gray-900">{order.customer.name}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Total</span>
                          <span className="text-sm font-bold text-indigo-600">
                            Rp {order.total_amount.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Detail Pesanan #{selectedOrder.id.slice(0, 8)}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                aria-label="Tutup Modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Customer Info */}
                {!isOfflineOrder(selectedOrder) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Informasi Pelanggan</h4>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900">{selectedOrder.customer.name}</p>
                      <p className="text-sm text-gray-600">{selectedOrder.customer.phone}</p>
                      <p className="text-sm text-gray-600">{selectedOrder.customer.address}</p>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Detail Pesanan</h4>
                  <div className="space-y-2">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">{item.quantity}x</span>
                          <span className="text-gray-900">{item.product.name}</span>
                        </div>
                        <span className="text-gray-900">
                          Rp {(item.quantity * item.price_at_time).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-base font-medium">
                        <span>Total</span>
                        <span className="text-indigo-600">
                          Rp {selectedOrder.total_amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Actions */}
                {selectedOrder.status === 'pending' && (
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                      disabled={processingOrder === selectedOrder.id}
                      className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingOrder === selectedOrder.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Tolak Pesanan
                    </button>
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                      disabled={processingOrder === selectedOrder.id}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingOrder === selectedOrder.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Terima Pesanan
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'processing' && (
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                      disabled={processingOrder === selectedOrder.id}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingOrder === selectedOrder.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Selesai Dikirim
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
