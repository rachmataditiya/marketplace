import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

interface Category {
  name: string;
  icon: string;
  count: number;
}

interface FeaturedProduct extends Product {
  vendor: {
    store_name: string;
  };
}

export function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch featured products (products with highest orders)
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          vendor:vendor_id (
            store_name
          )
        `)
        .gt('stock', 0) // Changed from eq('stock', '>', 0) to gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(6);

      if (productsError) throw productsError;

      setFeaturedProducts(products || []);

      // Fetch categories with product counts
      const { data: categoryCounts, error: categoryError } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);

      if (categoryError) throw categoryError;

      const counts = categoryCounts.reduce((acc: Record<string, number>, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + 1;
        return acc;
      }, {});

      const categoryData: Category[] = [
        { name: 'Makanan Berat', icon: '🍚', count: counts['Makanan Berat'] || 0 },
        { name: 'Makanan Ringan', icon: '🍪', count: counts['Makanan Ringan'] || 0 },
        { name: 'Minuman', icon: '🥤', count: counts['Minuman'] || 0 },
        { name: 'Dessert', icon: '🍰', count: counts['Dessert'] || 0 },
      ];

      setCategories(categoryData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div 
        className="relative bg-cover bg-center h-[500px]"
        style={{ 
          backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200)',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Temukan Makanan & Minuman <br />
            dari UMKM Terbaik
          </h1>
          <div className="max-w-xl">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari makanan atau minuman..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              </div>
            </form>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Kategori</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={`/products?category=${encodeURIComponent(category.name)}`}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-2">{category.icon}</div>
              <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
              <p className="text-sm text-gray-500">{category.count} Produk</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Produk Terbaru</h2>
          <Link 
            to="/products" 
            className="text-indigo-600 hover:text-indigo-500 flex items-center"
          >
            Lihat Semua
            <ChevronRight className="h-5 w-5 ml-1" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">Belum ada produk tersedia</p>
            </div>
          ) : (
            featuredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
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
                  </Link>
                  <Link 
                    to={`/seller/${product.vendor_id}`}
                    className="text-gray-500 hover:text-indigo-600 hover:underline block mt-1"
                  >
                    {product.vendor.store_name}
                  </Link>
                  <p className="mt-2 text-lg font-bold text-indigo-600">
                    Rp {product.price.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Join as Vendor CTA */}
      <div className="bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Punya Usaha Makanan atau Minuman?
            </h2>
            <p className="text-xl text-indigo-100 mb-8">
              Bergabunglah dengan kami dan jangkau lebih banyak pelanggan
            </p>
            <Link
              to="/register"
              className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
            >
              Daftar Sebagai Penjual
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}