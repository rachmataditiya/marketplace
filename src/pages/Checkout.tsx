import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cart';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MapPin, CreditCard, Truck, Loader2 } from 'lucide-react';

interface CheckoutFormData {
  name: string;
  phone: string;
  address: string;
  paymentMethod: 'cash' | 'bank_transfer';
  notes: string;
}

export function Checkout() {
  const { items, total, clearCart } = useCartStore();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CheckoutFormData>({
    name: profile?.name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    paymentMethod: 'cash',
    notes: '',
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setError(null);

    try {
      // Group items by vendor
      const itemsByVendor = items.reduce((acc, item) => {
        if (!acc[item.product.vendor_id]) {
          acc[item.product.vendor_id] = [];
        }
        acc[item.product.vendor_id].push(item);
        return acc;
      }, {} as Record<string, typeof items>);

      // Create an order for each vendor
      for (const [vendorId, vendorItems] of Object.entries(itemsByVendor)) {
        const vendorTotal = vendorItems.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: profile.id,
            vendor_id: vendorId,
            status: 'pending',
            payment_method: formData.paymentMethod,
            total_amount: vendorTotal,
            shipping_address: formData.address,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = vendorItems.map(item => ({
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price_at_time: item.product.price,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Update product stock
        for (const item of vendorItems) {
          const { error: stockError } = await supabase
            .from('products')
            .update({
              stock: item.product.stock - item.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.product.id);

          if (stockError) throw stockError;
        }
      }

      // Clear cart and redirect to success page
      clearCart();
      navigate('/checkout/success');
    } catch (err) {
      console.error('Error creating order:', err);
      setError('Terjadi kesalahan saat membuat pesanan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
          <div className="lg:col-span-7">
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Delivery Information */}
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Informasi Pengiriman</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nama Penerima
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Nomor Telepon
                    </label>
                    <div className="mt-1">
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Alamat Lengkap
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="address"
                        name="address"
                        rows={3}
                        required
                        value={formData.address}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Metode Pembayaran</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      id="cash"
                      name="paymentMethod"
                      type="radio"
                      value="cash"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="cash" className="ml-3 block text-sm font-medium text-gray-700">
                      Bayar di Tempat (COD)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="bank_transfer"
                      name="paymentMethod"
                      type="radio"
                      value="bank_transfer"
                      checked={formData.paymentMethod === 'bank_transfer'}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="bank_transfer" className="ml-3 block text-sm font-medium text-gray-700">
                      Transfer Bank
                    </label>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Catatan Tambahan</h2>
                
                <div>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Tambahkan catatan untuk penjual (opsional)"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Memproses...
                    </div>
                  ) : (
                    'Konfirmasi Pesanan'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="mt-8 lg:mt-0 lg:col-span-5">
            <div className="bg-white shadow-sm rounded-lg p-6 sticky top-8">
              <h2 className="text-lg font-medium text-gray-900">Ringkasan Pesanan</h2>

              <ul className="mt-6 divide-y divide-gray-200">
                {items.map((item) => (
                  <li key={item.product_id} className="py-4 flex">
                    <div className="flex-shrink-0 w-16 h-16">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full rounded-md object-center object-cover"
                      />
                    </div>
                    <div className="ml-4 flex-1 flex flex-col">
                      <div>
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <h3>{item.product.name}</h3>
                          <p className="ml-4">
                            Rp {(item.product.price * item.quantity).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-gray-600">Subtotal</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    Rp {total.toLocaleString('id-ID')}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="text-base font-medium text-gray-900">Total</dt>
                  <dd className="text-base font-medium text-gray-900">
                    Rp {total.toLocaleString('id-ID')}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 hidden lg:block">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={loading}
                  className="w-full bg-indigo-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Memproses...
                    </div>
                  ) : (
                    'Konfirmasi Pesanan'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}