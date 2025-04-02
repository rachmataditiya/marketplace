import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  User, 
  ShoppingCart, 
  Home, 
  Package, 
  Store, 
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCartStore } from '../store/cart';

export function Navbar() {
  const { profile, signOut } = useAuth();
  const { items } = useCartStore();
  const [showMenu, setShowMenu] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">UMKM Market</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="flex items-center text-gray-600 hover:text-indigo-600">
              <Home className="h-5 w-5 mr-1" />
              Beranda
            </Link>
            <Link to="/products" className="flex items-center text-gray-600 hover:text-indigo-600">
              <Package className="h-5 w-5 mr-1" />
              Produk
            </Link>
            <Link to="/cart" className="relative flex items-center text-gray-600 hover:text-indigo-600">
              <ShoppingCart className="h-5 w-5 mr-1" />
              Keranjang
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            {profile ? (
              <div className="relative user-menu">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center text-gray-600 hover:text-indigo-600"
                >
                  <User className="h-5 w-5 mr-1" />
                  {profile.name}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link 
                      to="/profile" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Profil
                    </Link>
                    <Link 
                      to="/orders" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Pesanan
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="flex items-center text-gray-600 hover:text-indigo-600">
                <User className="h-5 w-5 mr-1" />
                Masuk
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-600 hover:text-indigo-600"
            >
              {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMenu && (
          <div className="md:hidden py-2">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className="flex items-center px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                onClick={() => setShowMenu(false)}
              >
                <Home className="h-5 w-5 mr-2" />
                Beranda
              </Link>
              <Link
                to="/products"
                className="flex items-center px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                onClick={() => setShowMenu(false)}
              >
                <Package className="h-5 w-5 mr-2" />
                Produk
              </Link>
              <Link
                to="/vendors"
                className="flex items-center px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                onClick={() => setShowMenu(false)}
              >
                <Store className="h-5 w-5 mr-2" />
                UMKM
              </Link>
              <Link
                to="/cart"
                className="flex items-center px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                onClick={() => setShowMenu(false)}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Keranjang
                {totalItems > 0 && (
                  <span className="ml-2 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
              {profile ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                    onClick={() => setShowMenu(false)}
                  >
                    <User className="h-5 w-5 mr-2" />
                    Profil
                  </Link>
                  <Link
                    to="/orders"
                    className="flex items-center px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                    onClick={() => setShowMenu(false)}
                  >
                    <Package className="h-5 w-5 mr-2" />
                    Pesanan
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Keluar
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                  onClick={() => setShowMenu(false)}
                >
                  <User className="h-5 w-5 mr-2" />
                  Masuk
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}