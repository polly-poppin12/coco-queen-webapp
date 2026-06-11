import React from 'react';
import { ShoppingBag, Heart, User as UserIcon, Shield, Sparkles, BookOpen, Layers, LogOut } from 'lucide-react';
import { User, CartItem } from '../types';

interface NavbarProps {
  user: User | null;
  cart: CartItem[];
  wishlist: string[];
  currentView: string;
  setView: (view: string) => void;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export default function Navbar({
  user,
  cart,
  wishlist,
  currentView,
  setView,
  onOpenCart,
  onOpenAuth,
  onLogout
}: NavbarProps) {
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FDFCFB]/95 backdrop-blur-md border-b border-[#E5E5E5] transition-all">
      {/* Top Notification Announcement Bar */}
      <div className="w-full bg-[#1A1A1A] text-[#FDFCFB] text-[10px] tracking-[0.2em] py-2 px-4 text-center font-sans uppercase">
        Coco Queens gift with orders above TZS 70,000 - use <span className="font-semibold text-orange-400">QUEEN20</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo & Slogan */}
          <div className="flex flex-col cursor-pointer animate-fade-in" onClick={() => setView('home')}>
            <span className="font-serif text-[19px] tracking-[0.18em] font-light text-[#1A1A1A] hover:opacity-85 transition-opacity uppercase">
              COCO QUEENS
            </span>
            <span className="text-[9.5px] tracking-[0.15em] text-[#6B705C] uppercase -mt-0.5 font-bold font-sans italic">
              Total Beauty &amp; Wellness
            </span>
          </div>

          {/* Core Navigation Links */}
          <nav className="hidden md:flex space-x-10">
            <button
               id="nav-shop"
              onClick={() => setView('shop')}
              className={`text-[11px] tracking-[0.2em] uppercase font-semibold transition-colors ${
                currentView === 'shop' ? 'text-[#1A1A1A] border-b border-[#1A1A1A] pb-1' : 'text-[#4A4A4A] hover:text-[#1A1A1A]'
              }`}
            >
              Shop
            </button>
            
            <button
              id="nav-blog"
              onClick={() => setView('blog')}
              className={`text-[11px] tracking-[0.2em] uppercase font-semibold transition-colors ${
                currentView === 'blog' ? 'text-[#1A1A1A] border-b border-[#1A1A1A] pb-1' : 'text-[#4A4A4A] hover:text-[#1A1A1A]'
              }`}
            >
              Collections
            </button>

            <button
              id="nav-compare"
              onClick={() => setView('comparison')}
              className={`text-[11px] tracking-[0.2em] uppercase font-semibold transition-colors ${
                currentView === 'comparison' ? 'text-[#1A1A1A] border-b border-[#1A1A1A] pb-1' : 'text-[#4A4A4A] hover:text-[#1A1A1A]'
              }`}
            >
              Rituals
            </button>

            <button
              id="nav-careers"
              onClick={() => setView('careers')}
              className={`text-[11px] tracking-[0.2em] uppercase font-semibold transition-colors ${
                currentView === 'careers' ? 'text-[#1A1A1A] border-b border-[#1A1A1A] pb-1' : 'text-[#4A4A4A] hover:text-[#1A1A1A]'
              }`}
            >
              Careers
            </button>
          </nav>

          {/* Action Icons Panel */}
          <div className="flex items-center space-x-6">
            
            {/* Loyalty/Points Status for Authenticated user */}
            {user && (
              <div 
                onClick={() => setView('profile')}
                className="hidden lg:flex items-center space-x-1.5 cursor-pointer bg-amber-50 hover:bg-amber-100/80 border border-amber-200/50 rounded-full px-3.5 py-1 text-xs text-amber-800 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span className="font-medium tracking-wide">{user.loyaltyPoints} Coco Points</span>
              </div>
            )}

            {/* Profile / Login */}
            {user ? (
              <div className="flex items-center space-x-4">
                <button
                  id="user-profile-btn"
                  onClick={() => setView('profile')}
                  className={`flex items-center space-x-1 text-xs tracking-wider transition-colors ${
                    currentView === 'profile' ? 'text-[#1c1917]' : 'text-[#78716c] hover:text-[#1c1917]'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">My Rituals</span>
                </button>

                {(user.role === 'admin' || user.role === 'owner') && (
                  <button
                    id="admin-dashboard-btn"
                    onClick={() => setView('admin')}
                    className={`flex items-center space-x-1 text-xs tracking-wider text-emerald-800 transition-colors bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 font-medium ${
                      currentView === 'admin' ? 'bg-emerald-100 text-emerald-950' : 'hover:bg-emerald-100/75'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                )}

                <button
                  id="navbar-logout-btn"
                  onClick={onLogout}
                  className="text-[#78716c] hover:text-red-700 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="login-trigger"
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 text-xs uppercase tracking-[0.15em] font-medium text-[#78716c] hover:text-[#1c1917] transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                <span>Join / Sign In</span>
              </button>
            )}

            {/* Wishlist Indicator */}
            <button
              onClick={() => setView('shop')}
              className="relative text-[#78716c] hover:text-[#1c1917] transition-colors"
              title="View Wishlist"
            >
              <Heart className="w-[19px] h-[19px]" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              id="navbar-cart-btn"
              onClick={onOpenCart}
              className="relative text-[#1c1917] hover:opacity-85 transition-opacity p-1 focus:outline-none"
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-700 text-[#faf9f6] text-[8px] font-semibold tracking-tighter rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}


