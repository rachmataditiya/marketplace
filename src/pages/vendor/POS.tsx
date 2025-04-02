import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Loader2, ShoppingCart, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types';

interface CartItem {
  product: Product;
  quantity: number;
}

interface Category {
  name: string;
  count: number;
}

export function POS() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchProducts();
    }
  }, [profile]);

  const fetchProducts = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', profile.id)
        .gt('stock', 0)
        .order('name');

      if (error) throw error;

      setProducts(data || []);

      const categoryGroups = (data || []).reduce((acc: Record<string, number>, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      }, {});

      setCategories(
        Object.entries(categoryGroups).map(([name, count]) => ({ name, count }))
      );
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery
      ? product.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory
      ? product.category === selectedCategory
      : true;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
    // Show cart on mobile when adding items
    setShowCart(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 && newQuantity <= item.product.stock
            ? { ...item, quantity: newQuantity }
            : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const handlePayment = async () => {
    if (!profile || cart.length === 0) return;

    setProcessingPayment(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: profile.id,
          vendor_id: profile.id,
          status: 'completed',
          payment_method: 'cash',
          total_amount: calculateTotal(),
          shipping_address: 'Offline Sale',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({
            stock: item.product.stock - item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.product.id);

        if (stockError) throw stockError;
      }

      setCart([]);
      fetchProducts();
      setShowCart(false);
      alert('Payment successful!');
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-none bg-white border-b">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">Penjualan</h1>
          </div>
        </div>

        {/* Loading State */}
        <div className="flex-1 flex items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
            <h1 className="text-lg font-bold text-gray-900">Penjualan</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 lg:hidden transition-colors"
                aria-label="Toggle Cart"
              >
                <ShoppingCart className="h-6 w-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Product List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-none p-4 space-y-4 bg-white border-b">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 px-4 pl-11 rounded-xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-0 text-sm bg-gray-50 transition-colors"
                />
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    !selectedCategory
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100'
                  }`}
                >
                  Semua
                </button>
                {categories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      category.name === selectedCategory
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100"
                  >
                    <div className="relative">
                      <div
                        className="h-28 bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                        style={{ backgroundImage: `url(${product.image_url})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                          Stok: {product.stock}
                        </p>
                        <p className="text-base font-bold text-indigo-600">
                          Rp {product.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cart Panel */}
          <div
            className={`
              fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden
              ${showCart ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            onClick={() => setShowCart(false)}
          />

          <div
            className={`
              fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
              ${showCart ? 'translate-x-0' : 'translate-x-full'}
            `}
          >
            {/* Cart Header */}
            <div className="flex-none p-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-medium text-gray-900">Keranjang</h2>
                <span className="bg-indigo-100 text-indigo-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {cart.length}
                </span>
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close Cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">Keranjang masih kosong</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Pilih produk untuk memulai transaksi
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <div className="ml-4 flex-1">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                          {item.product.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Rp {item.product.price.toLocaleString('id-ID')}
                        </p>
                        <div className="flex items-center mt-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                            aria-label="Kurangi Jumlah"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="mx-3 min-w-[1.5rem] text-center font-medium text-sm bg-gray-50 px-2 py-1 rounded-lg">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={item.quantity >= item.product.stock}
                            aria-label="Tambah Jumlah"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="ml-auto text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            aria-label="Hapus Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            <div className="flex-none p-4 border-t bg-white">
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>Rp {calculateTotal().toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>Rp {calculateTotal().toLocaleString('id-ID')}</span>
                </div>
              </div>
              <button
                onClick={handlePayment}
                disabled={cart.length === 0 || processingPayment}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
              >
                {processingPayment ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Proses Pembayaran
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}