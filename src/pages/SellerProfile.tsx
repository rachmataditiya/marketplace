import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Store, Package, Star, MapPin, Phone, Mail, ShoppingCart } from 'lucide-react';
import { useCartStore } from '../store/cart';
import { useAuth } from '../contexts/AuthContext';
import type { Product } from '../types';

interface SellerProfile {
  id: string;
  store_name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  total_sales: number;
}

export function SellerProfile() {
  const { id } = useParams<{ id: string }>();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const { addItem } = useCartStore();
  const { profile } = useAuth();
  const [addedToCart, setAddedToCart] = useState<string | null>(null);

  useEffect(() => {
    fetchSellerProfile();
    fetchProducts();
  }, [id, selectedCategory, sortBy]);

  const fetchSellerProfile = async () => {
    try {
      // Fetch seller profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      // Fetch total sales from orders
      const { count: totalSales, error: salesError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', id)
        .eq('status', 'delivered');

      if (salesError) throw salesError;

      // Fetch average rating from product reviews
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('vendor_id', id);

      if (productsError) throw productsError;

      if (products && products.length > 0) {
        const productIds = products.map(p => p.id);
        const { data: ratings, error: ratingsError } = await supabase
          .from('reviews')
          .select('rating')
          .in('product_id', productIds);

        if (ratingsError) throw ratingsError;

        const averageRating = ratings && ratings.length > 0
          ? ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length
          : 0;

        setSeller({
          ...profileData,
          total_sales: totalSales || 0,
          rating: averageRating
        });
      } else {
        setSeller({
          ...profileData,
          total_sales: totalSales || 0,
          rating: 0
        });
      }
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      setError('Gagal memuat profil penjual');
    }
  };

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('vendor_id', id);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (!profile) return;

    addItem({
      product_id: product.id,
      quantity: 1,
      product: product,
    });
    
    // Show feedback
    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Toko tidak ditemukan</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Seller Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center">
                <Store className="h-12 w-12 text-indigo-600" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{seller.store_name}</h1>
              <p className="mt-2 text-gray-600">{seller.description}</p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="flex items-center text-yellow-400">
                  <Star className="h-5 w-5" />
                  <span className="ml-1 text-sm text-gray-600">
                    {(seller.rating || 0).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Package className="h-5 w-5" />
                  <span className="ml-1 text-sm">
                    {seller.total_sales || 0} Penjualan
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5" />
                  <span className="ml-2">{seller.address}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="h-5 w-5" />
                  <span className="ml-2">{seller.phone}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Mail className="h-5 w-5" />
                  <span className="ml-2">{seller.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Produk</h2>
            <div className="flex space-x-4">
              <div>
                <label htmlFor="category-filter" className="sr-only">
                  Filter Kategori
                </label>
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="food">Makanan</option>
                  <option value="drink">Minuman</option>
                  <option value="snack">Snack</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div>
                <label htmlFor="sort-filter" className="sr-only">
                  Urutkan Produk
                </label>
                <select
                  id="sort-filter"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="newest">Terbaru</option>
                  <option value="price_asc">Harga Terendah</option>
                  <option value="price_desc">Harga Tertinggi</option>
                </select>
              </div>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada produk</h3>
              <p className="mt-1 text-sm text-gray-500">
                Belum ada produk tersedia untuk kategori ini
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <Link to={`/products/${product.id}`}>
                    <div
                      className="h-48 bg-cover bg-center"
                      style={{ backgroundImage: `url(${product.image_url})` }}
                    />
                  </Link>
                  <div className="p-4">
                    <Link to={`/products/${product.id}`}>
                      <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                      <p className="mt-2 text-lg font-bold text-indigo-600">
                        Rp {product.price.toLocaleString('id-ID')}
                      </p>
                    </Link>
                    <div className="mt-2">
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        product.stock > 0 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock > 0 ? 'Tersedia' : 'Habis'}
                      </span>
                    </div>
                    {product.stock > 0 && (
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                          addedToCart === product.id
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {addedToCart === product.id ? 'Ditambahkan' : 'Tambah ke Keranjang'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}