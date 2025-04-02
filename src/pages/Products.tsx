import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronDown, Loader2, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cart';
import { useAuth } from '../contexts/AuthContext';
import type { Product } from '../types';

interface ExtendedProduct extends Product {
  vendor: {
    store_name: string;
    is_verified: boolean;
  };
}

const categories = [
  'Semua',
  'Makanan Berat',
  'Makanan Ringan',
  'Minuman',
  'Dessert',
];

const sortOptions = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price-low', label: 'Harga Terendah' },
  { value: 'price-high', label: 'Harga Tertinggi' },
];

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCartStore();
  const { profile } = useAuth();
  const [addedToCart, setAddedToCart] = useState<string | null>(null);

  const selectedCategory = searchParams.get('category') || 'Semua';
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sort') || 'newest';

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchQuery, sortBy]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          vendor:vendor_id (
            store_name,
            is_verified
          )
        `)
        .gt('stock', 0);

      // Apply category filter
      if (selectedCategory !== 'Semua') {
        query = query.eq('category', selectedCategory);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case 'price-low':
          query = query.order('price', { ascending: true });
          break;
        case 'price-high':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSearchParams(prev => {
      if (category === 'Semua') {
        prev.delete('category');
      } else {
        prev.set('category', category);
      }
      return prev;
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams(prev => {
      prev.set('sort', e.target.value);
      return prev;
    });
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    
    setSearchParams(prev => {
      if (search) {
        prev.set('search', search);
      } else {
        prev.delete('search');
      }
      return prev;
    });
  };

  const handleAddToCart = (product: ExtendedProduct) => {
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search and Filter Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <form onSubmit={handleSearch} className="relative flex-1">
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Cari produk..."
              className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </form>
          <div className="flex gap-4">
            <div className="relative">
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="appearance-none bg-white px-4 py-2 pr-8 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Urutkan berdasarkan"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                category === selectedCategory
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada produk</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery
                ? 'Tidak ada produk yang sesuai dengan pencarian Anda'
                : 'Belum ada produk tersedia untuk kategori ini'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
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
                    <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>
                  </Link>
                  <Link 
                    to={`/seller/${product.vendor_id}`}
                    className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {product.vendor.store_name}
                  </Link>
                  <div className="mt-2 flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-900">
                      Rp {product.price.toLocaleString('id-ID')}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
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
                      className={`mt-4 w-full py-2 rounded-lg flex items-center justify-center transition-colors ${
                        addedToCart === product.id
                          ? 'bg-green-600 text-white'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      {addedToCart === product.id ? 'Ditambahkan!' : 'Tambah ke Keranjang'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}