import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, Minus, Plus, ShoppingCart, Loader2, ArrowLeft, X } from 'lucide-react';
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

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profile: {
    name: string;
  };
}

interface ReviewFormData {
  rating: number;
  comment: string;
}

export function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<ExtendedProduct | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFormData, setReviewFormData] = useState<ReviewFormData>({
    rating: 5,
    comment: '',
  });
  const [userCanReview, setUserCanReview] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const { addItem } = useCartStore();

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  useEffect(() => {
    if (profile && id) {
      checkUserCanReview();
    }
  }, [profile, id]);

  const fetchProductDetails = async () => {
    if (!id) return;

    try {
      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          vendor:vendor_id (
            store_name,
            is_verified
          )
        `)
        .eq('id', id)
        .single();

      if (productError) throw productError;
      if (!productData) throw new Error('Product not found');

      setProduct(productData);

      // Fetch product reviews
      await fetchReviews();
    } catch (error) {
      console.error('Error fetching product details:', error);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!id) return;

    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          profile:profile_id (
            name
          )
        `)
        .eq('product_id', id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      setReviews(reviewsData || []);

      // If user is logged in, find their review
      if (profile) {
        const userReview = reviewsData?.find(
          review => review.profile.name === profile.name
        );
        if (userReview) {
          setUserReview(userReview);
          setReviewFormData({
            rating: userReview.rating,
            comment: userReview.comment,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkUserCanReview = async () => {
    if (!profile || !id) return;

    try {
      // Check if user has purchased and received the product
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_items!inner (
            product_id
          )
        `)
        .eq('customer_id', profile.id)
        .eq('status', 'delivered')
        .eq('order_items.product_id', id);

      if (ordersError) throw ordersError;

      setUserCanReview(orders && orders.length > 0);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && (!product || newQuantity <= product.stock)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (!product || !profile) return;

    addItem({
      product_id: product.id,
      quantity,
      product: {
        ...product,
        vendor: product.vendor
      },
    });

    alert('Product added to cart!');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;

    setSubmittingReview(true);
    try {
      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            rating: reviewFormData.rating,
            comment: reviewFormData.comment,
          })
          .eq('id', userReview.id);

        if (error) throw error;
      } else {
        // Create new review
        const { error } = await supabase
          .from('reviews')
          .insert([
            {
              product_id: id,
              profile_id: profile.id,
              rating: reviewFormData.rating,
              comment: reviewFormData.comment,
            },
          ]);

        if (error) throw error;
      }

      // Refresh reviews
      await fetchReviews();
      setShowReviewModal(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview || !confirm('Are you sure you want to delete your review?')) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', userReview.id);

      if (error) throw error;

      setUserReview(null);
      await fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review');
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Product not found'}</p>
            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  const averageRating = calculateAverageRating();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-indigo-600 hover:text-indigo-500 mb-8"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          {/* Product Image */}
          <div className="lg:max-w-lg">
            <div className="aspect-w-1 aspect-h-1 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-center object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              {product.name}
            </h1>
            
            <div className="mt-3">
              <h2 className="sr-only">Product information</h2>
              <p className="text-3xl text-gray-900">
                Rp {product.price.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="mt-3">
              <div className="flex items-center">
                <div className="flex items-center">
                  {[0, 1, 2, 3, 4].map((rating) => (
                    <Star
                      key={rating}
                      className={`h-5 w-5 flex-shrink-0 ${
                        averageRating > rating
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                    />
                  ))}
                </div>
                <p className="ml-3 text-sm text-gray-500">
                  {averageRating.toFixed(1)} ({reviews.length} reviews)
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="sr-only">Description</h3>
              <p className="text-base text-gray-700">{product.description}</p>
            </div>

            {profile ? (
              <>
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm text-gray-600">Quantity</h3>
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        className="p-2 rounded-lg hover:bg-gray-100"
                        title="Kurangi jumlah"
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <span className="px-4 py-2 text-gray-900">{quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(1)}
                        className="p-2 rounded-lg hover:bg-gray-100"
                        title="Tambah jumlah"
                        disabled={quantity >= product.stock}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Stock: {product.stock} items
                  </p>
                </div>

                <div className="mt-10">
                  <button
                    onClick={handleAddToCart}
                    disabled={!profile || product.stock === 0}
                    className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Tambah ke keranjang"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Tambah ke Keranjang
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-10">
                <Link
                  to="/login"
                  className="w-full bg-indigo-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Login untuk Membeli
                </Link>
              </div>
            )}

            {/* Vendor Info */}
            <div className="mt-10 border-t border-gray-200 pt-10">
              <h3 className="text-sm font-medium text-gray-900">Vendor</h3>
              <div className="mt-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Link 
                    to={`/seller/${product.vendor_id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {product.vendor.store_name}
                  </Link>
                  {product.vendor.is_verified && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="mt-10 border-t border-gray-200 pt-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Reviews</h3>
                {profile && userCanReview && !userReview && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Write a Review
                  </button>
                )}
              </div>
              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <p className="text-gray-500">No reviews yet</p>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="flex items-center">
                            {[0, 1, 2, 3, 4].map((rating) => (
                              <Star
                                key={rating}
                                className={`h-4 w-4 flex-shrink-0 ${
                                  review.rating > rating
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                                fill="currentColor"
                              />
                            ))}
                          </div>
                          <p className="ml-3 text-sm text-gray-500">{review.profile.name}</p>
                        </div>
                        {profile && review.profile.name === profile.name && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setShowReviewModal(true)}
                              className="text-sm text-indigo-600 hover:text-indigo-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={handleDeleteReview}
                              className="text-sm text-red-600 hover:text-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                      <p className="mt-2 text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {userReview ? 'Edit Review' : 'Write a Review'}
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100"
                title="Batal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rating
                  </label>
                  <div className="mt-1 flex items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewFormData(prev => ({ ...prev, rating }))}
                        className="p-1"
                        title={`Beri rating ${rating} bintang`}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            reviewFormData.rating >= rating
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                    Review
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    rows={4}
                    required
                    value={reviewFormData.comment}
                    onChange={(e) => setReviewFormData(prev => ({ ...prev, comment: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Share your thoughts about this product..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={userReview ? "Perbarui Review" : "Kirim Review"}
                >
                  {submittingReview ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    userReview ? 'Perbarui Review' : 'Kirim Review'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}