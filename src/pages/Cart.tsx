import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cart';
import { useAuth } from '../contexts/AuthContext';

export function Cart() {
  const { items, removeItem, updateQuantity, total } = useCartStore();
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-2 text-lg font-medium text-gray-900">Please login to view your cart</h2>
            <div className="mt-6">
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-2 text-lg font-medium text-gray-900">Keranjang belanja kosong</h2>
            <p className="mt-1 text-sm text-gray-500">
              Mulai belanja dan tambahkan produk ke keranjang Anda
            </p>
            <div className="mt-6">
              <Link
                to="/products"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Lihat Produk
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleQuantityChange = (productId: string, delta: number, currentQty: number, maxStock: number) => {
    const newQuantity = currentQty + delta;
    if (newQuantity >= 1 && newQuantity <= maxStock) {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleCheckout = (sellerId: string) => {
    const sellerItems = items.filter(item => item.product.vendor_id === sellerId);
    navigate('/checkout', { state: { items: sellerItems } });
  };

  // Group items by seller
  const itemsBySeller = items.reduce((acc, item) => {
    const sellerId = item.product.vendor_id;
    if (!acc[sellerId]) {
      acc[sellerId] = {
        sellerId,
        sellerName: item.product.vendor?.store_name || 'Unknown Seller',
        items: [],
        total: 0
      };
    }
    acc[sellerId].items.push(item);
    acc[sellerId].total += item.product.price * item.quantity;
    return acc;
  }, {} as Record<string, { sellerId: string; sellerName: string; items: typeof items; total: number }>);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Keranjang Belanja</h1>

        <div className="space-y-8">
          {Object.values(itemsBySeller).map((sellerGroup) => (
            <div key={sellerGroup.sellerId} className="bg-white shadow-sm rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <h2 className="text-lg font-medium text-gray-900">{sellerGroup.sellerName}</h2>
                    {sellerGroup.items[0].product.vendor?.is_verified && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Verified
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleCheckout(sellerGroup.sellerId)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    title="Checkout dari penjual ini"
                  >
                    Checkout
                  </button>
                </div>
              </div>

              <ul className="divide-y divide-gray-200">
                {sellerGroup.items.map((item) => (
                  <li key={item.product_id} className="p-6 flex">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>

                    <div className="ml-4 flex flex-1 flex-col">
                      <div>
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <h3>
                            <Link to={`/products/${item.product_id}`}>
                              {item.product.name}
                            </Link>
                          </h3>
                          <p className="ml-4">
                            Rp {(item.product.price * item.quantity).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{item.product.category}</p>
                      </div>
                      <div className="flex flex-1 items-end justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(item.product_id, -1, item.quantity, item.product.stock)}
                            className="p-1 rounded-md hover:bg-gray-100"
                            disabled={item.quantity <= 1}
                            title="Kurangi jumlah"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-gray-500">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.product_id, 1, item.quantity, item.product.stock)}
                            className="p-1 rounded-md hover:bg-gray-100"
                            disabled={item.quantity >= item.product.stock}
                            title="Tambah jumlah"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.product_id)}
                          className="font-medium text-red-600 hover:text-red-500"
                          title="Hapus item"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      {item.quantity >= item.product.stock && (
                        <p className="mt-2 text-sm text-yellow-600">
                          Maximum stock reached
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="p-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Subtotal untuk {sellerGroup.sellerName}</span>
                  <span className="text-lg font-medium text-gray-900">
                    Rp {sellerGroup.total.toLocaleString('id-ID')}
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