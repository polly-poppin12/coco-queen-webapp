/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, SlidersHorizontal, Search, Star, Layers, ShieldAlert, 
  MapPin, Clock, ArrowRight, BookOpen, Heart, RefreshCw, Eye, 
  Gift, Trash, Download, Moon, ShieldAlert as AlertIcon, Calendar
} from 'lucide-react';
import { User, Product, CartItem, Order, Address } from './types';

// Import Modular Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import ProductDetails from './components/ProductDetails';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import LoyaltyProgram from './components/LoyaltyProgram';
import ProductComparison from './components/ProductComparison';
import AdminDashboard from './components/AdminDashboard';
import BlogSection from './components/BlogSection';
import CareersPage from './components/CareersPage';
import { formatTZS } from './utils/money';

export default function App() {
  // Navigation & Modal Views
  const [currentView, setView] = useState<string>('home'); // 'home' | 'shop' | 'blog' | 'careers' | 'comparison' | 'profile' | 'admin'
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Global Core State
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Filtering & Sorting State (for Apothecary Catalog view)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [skinTypeFilter, setSkinTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('featured'); // 'price-low-high' | 'price-high-low' | 'rating'

  // Profile Form States
  const [profileName, setProfileName] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPostal, setNewPostal] = useState('');
  const [newCountry, setNewCountry] = useState('Tanzania');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Initial State Synchronizers
  useEffect(() => {
    // 1. Recover Session Token
    const storedToken = localStorage.getItem('aura_token');
    if (storedToken) {
      fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Expired');
        return res.json();
      })
      .then(userData => {
        setUser(userData);
        setProfileName(userData.name);
      })
      .catch(() => {
        localStorage.removeItem('aura_token');
        setUser(null);
      });
    }

    // 2. Load Cart from Cache
    const cachedCart = localStorage.getItem('aura_cart');
    if (cachedCart) {
      try {
        setCart(JSON.parse(cachedCart));
      } catch (err) {
        setCart([]);
      }
    }

    // 3. Load Wishlist Cache
    const cachedWish = localStorage.getItem('aura_wishlist');
    if (cachedWish) {
      try {
        setWishlist(JSON.parse(cachedWish));
      } catch (err) {
        setWishlist([]);
      }
    }

    // 4. Fetch Products List
    fetchProducts();
  }, [currentView]);

  // Synchronize orders whenever profile view activates
  useEffect(() => {
    if (currentView === 'profile' && user) {
      fetchOrderHistory();
    }
  }, [currentView, user]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('aura_token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/products', { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching botanical elixirs:', err);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      const token = localStorage.getItem('aura_token');
      const res = await fetch('/api/orders/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- SEED CACHES ---
  const saveCartToCache = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    localStorage.setItem('aura_cart', JSON.stringify(updatedCart));
  };

  const handleLoginSuccess = (userData: any, token: string) => {
    localStorage.setItem('aura_token', token);
    setUser(userData);
    setProfileName(userData.name);
  };

  const handleLogout = () => {
    localStorage.removeItem('aura_token');
    setUser(null);
    setOrders([]);
    setView('home');
  };

  // --- CART CONTROLLER MODIFIERS ---
  const handleAddToCart = (product: Product, isRecurring = false) => {
    const backup = [...cart];
    const index = backup.findIndex(item => item.product.id === product.id);

    if (index > -1) {
      backup[index].quantity += 1;
      backup[index].isRecurring = isRecurring || backup[index].isRecurring;
    } else {
      backup.push({ product, quantity: 1, isRecurring });
    }
    saveCartToCache(backup);
    setIsCartOpen(true);
  };

  const handleUpdateQty = (productId: string, diff: number) => {
    const backup = [...cart];
    const index = backup.findIndex(item => item.product.id === productId);
    if (index === -1) return;

    backup[index].quantity += diff;
    if (backup[index].quantity <= 0) {
      backup.splice(index, 1);
    }
    saveCartToCache(backup);
  };

  const handleRemoveFromCart = (productId: string) => {
    const updated = cart.filter(item => item.product.id !== productId);
    saveCartToCache(updated);
  };

  // --- WISHLIST ---
  const handleToggleWishlist = (productId: string) => {
    let updated;
    if (wishlist.includes(productId)) {
      updated = wishlist.filter(id => id !== productId);
    } else {
      updated = [...wishlist, productId];
    }
    setWishlist(updated);
    localStorage.setItem('aura_wishlist', JSON.stringify(updated));
  };

  // --- COMPARE ---
  const handleToggleCompare = (product: Product) => {
    const index = compareList.findIndex(p => p.id === product.id);
    if (index > -1) {
      setCompareList(compareList.filter(p => p.id !== product.id));
    } else {
      if (compareList.length >= 3) {
        alert('You may only review up to three Coco Queens rituals side-by-side.');
        return;
      }
      setCompareList([...compareList, product]);
    }
  };

  // --- PROFILE UPDATE HANDLERS ---
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!newStreet || !newCity || !newPostal) {
      setProfileError('All standard address fields are mandatory.');
      return;
    }

    const newAddress: Address = {
      id: 'addr-' + Date.now(),
      label: 'Home Address',
      street: newStreet,
      city: newCity,
      state: newState,
      postalCode: newPostal,
      country: newCountry
    };

    const token = localStorage.getItem('aura_token');
    const updatedAddresses = [...(user?.addresses || []), newAddress];

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: profileName, addresses: updatedAddresses })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUser(data.user);
      setProfileSuccess('Delivery address catalog updated successfully.');
      setNewStreet('');
      setNewCity('');
      setNewState('');
      setNewPostal('');
    } catch (err: any) {
      setProfileError(err.message || 'Error updating addresses.');
    }
  };

  const handleGDPRDownload = async () => {
    try {
      const token = localStorage.getItem('aura_token');
      const res = await fetch('/api/profile/gdpr-export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const element = document.createElement('a');
      element.href = URL.createObjectURL(file);
      element.download = `aura-secur-backup-${user?.name.replace(/\s+/g, '-')}.json`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGDPRDelete = async () => {
    if (!confirm('This action is IRREVERSIBLE. Under GDPR protocols, your profile and order entries will be permanently wiped. Are you absolutely certain?')) return;
    
    try {
      const token = localStorage.getItem('aura_token');
      const res = await fetch('/api/profile/gdpr-delete', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.message);
      handleLogout();
    } catch (err) {
      console.error(err);
    }
  };

  // --- FILTERED CATALOG DATA COMPUTATIONS ---
  const filteredProducts = products.filter(prod => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prod.ingredients.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || prod.category === categoryFilter;
    const matchesSkin = skinTypeFilter === 'All' || 
                        (prod.skinType && prod.skinType.toLowerCase().includes(skinTypeFilter.toLowerCase())) ||
                        (prod.hairType && prod.hairType.toLowerCase().includes(skinTypeFilter.toLowerCase()));
                        
    return matchesSearch && matchesCategory && matchesSkin;
  }).sort((a, b) => {
    if (sortBy === 'price-low-high') return a.price - b.price;
    if (sortBy === 'price-high-low') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // Default featured order
  });

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] flex flex-col justify-between">
      
      {/* 1. Global Navigation Bar */}
      <Navbar
        user={user}
        cart={cart}
        wishlist={wishlist}
        currentView={currentView}
        setView={setView}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. MAIN WORKSPACE ROUTER */}
      <main className="flex-grow">
        
        {/* VIEW 1: HOME */}
        {currentView === 'home' && (
          <div className="space-y-16">
            <Hero 
              onShopClick={() => setView('shop')}
              onBlogClick={() => setView('blog')}
            />

            {/* Quick Promo Codes Display */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h3 className="font-serif text-xl font-light uppercase tracking-[0.2em] text-[#1A1A1A] text-center mb-8">
                Coco Queens Gifts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-[#FDFCFB] border border-[#E5E5E5] text-center space-y-2.5 rounded-none relative overflow-hidden transition-shadow hover:shadow-md animate-fade-in">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-[#F5F2ED] rounded-bl-full pointer-events-none" />
                  <Gift className="w-5 h-5 text-[#6B705C] mx-auto" />
                  <h4 className="font-serif tracking-wide font-medium text-[15px] text-[#1A1A1A]">10% Queen Gift</h4>
                  <p className="text-xs text-[#6B705C] font-semibold">Enjoy 10% off your Coco Queens ritual.</p>
                  <span className="inline-block font-mono text-[11px] font-bold bg-[#F5F2ED] px-4 py-1.5 border border-[#E5E5E5] rounded-none uppercase mt-2.5 text-[#1A1A1A] tracking-wider">COCO10</span>
                </div>

                <div className="p-6 bg-[#FDFCFB] border border-[#E5E5E5] text-center space-y-2.5 rounded-none relative overflow-hidden transition-shadow hover:shadow-md animate-fade-in">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-[#F5F2ED] rounded-bl-full pointer-events-none" />
                  <Sparkles className="w-5 h-5 text-[#6B705C] mx-auto" />
                  <h4 className="font-serif tracking-wide font-medium text-[15px] text-[#1A1A1A]">20% Royal Cart Reward</h4>
                  <p className="text-xs text-[#6B705C] font-semibold">20% off orders above TZS 70,000.</p>
                  <span className="inline-block font-mono text-[11px] font-bold bg-[#F5F2ED] px-4 py-1.5 border border-[#E5E5E5] rounded-none uppercase mt-2.5 text-[#1A1A1A] tracking-wider">QUEEN20</span>
                </div>

                <div className="p-6 bg-[#FDFCFB] border border-[#E5E5E5] text-center space-y-2.5 rounded-none relative overflow-hidden transition-shadow hover:shadow-md animate-fade-in">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-[#F5F2ED] rounded-bl-full pointer-events-none" />
                  <Clock className="w-5 h-5 text-[#6B705C] mx-auto" />
                  <h4 className="font-serif tracking-wide font-medium text-[15px] text-[#1A1A1A]">Coco Points Unlocked</h4>
                  <p className="text-xs text-[#6B705C] font-semibold">Earn points on every Coco Queens order.</p>
                  <span className="inline-block font-mono text-[10.5px] font-bold text-[#6B705C] uppercase mt-2.5 tracking-wider">Auto-Credited</span>
                </div>
              </div>
            </section>

            {/* Showcase 3 Bestsellers */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-4 border-b border-[#E5E5E5]">
                <div className="text-center md:text-left space-y-1">
                  <h3 className="font-serif text-2xl uppercase tracking-[0.12em] text-stone-900 font-light">Coco Queens Collection</h3>
                  <p className="text-[11px] text-[#6B705C] uppercase tracking-[0.2em] font-bold">Oil, scrub, honey and essential oils</p>
                </div>
                <button
                  id="browse-all-elixirs-btn"
                  onClick={() => setView('shop')}
                  className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-[0.25em] text-[#1A1A1A] mt-4 md:mt-0 group hover:opacity-75 transition-opacity"
                >
                  <span>Browse Full Collection</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.slice(0, 3).map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    isWishlisted={wishlist.includes(prod.id)}
                    onToggleWishlist={() => handleToggleWishlist(prod.id)}
                    onViewDetails={() => setSelectedProduct(prod)}
                    onAddToCart={() => handleAddToCart(prod)}
                    onCompareToggle={() => handleToggleCompare(prod)}
                    isCompareChecked={compareList.some(p => p.id === prod.id)}
                  />
                ))}
              </div>
            </section>

            {/* Elegant Trust Seal Testimonials Section */}
            <section className="bg-[#FDFCFB] border-y border-[#E5E5E5] py-20 text-center">
              <div className="max-w-4xl mx-auto px-4 space-y-6">
                <div className="flex justify-center text-orange-400">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-5 h-5 fill-orange-400" />)}
                </div>
                <blockquote className="font-serif text-lg sm:text-xl md:text-2xl font-light italic tracking-wide text-[#1A1A1A] leading-relaxed">
                  "The coconut oil gives my hair a clean shine without feeling heavy, and the scrub makes the whole routine feel premium."
                </blockquote>
                <div className="space-y-1.5">
                  <cite className="font-serif text-sm font-medium not-italic text-stone-900">Neema Mushi - Dar es Salaam</cite>
                  <span className="text-[9px] text-[#6B705C] uppercase tracking-[0.2em] block font-bold">Verified Coco Queens Customer</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: SHOP (THE APOTHECARY) */}
        {currentView === 'shop' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                     {/* Catalog Banner */}
            <div className="text-center space-y-2 max-w-xl mx-auto pb-4">
              <span className="text-[10px] uppercase font-bold text-[#6B705C] tracking-[0.25em]">COCONUT BEAUTY FOR SKIN, HAIR AND WELLNESS</span>
              <h1 className="font-serif text-3xl uppercase tracking-[0.12em] font-light text-stone-950">The Coco Queens Collection</h1>
              <p className="text-xs text-[#6B705C] font-semibold italic leading-relaxed">
                Scroll through each product as it reveals its ritual, benefits and price in Tanzanian shillings.
              </p>
            </div>

            {/* Filtering Utilities Panel */}
            <div className="p-4.5 bg-white border border-[#E5E5E5] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-sans rounded-none">
              
              {/* Category Segment buttons */}
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Oil', 'Scrub', 'Honey', 'Essential Oils'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 hover:bg-stone-50 transition border font-bold uppercase tracking-widest text-[9.5px] rounded-none ${
                      categoryFilter === cat ? 'bg-[#1A1A1A] text-white font-bold border-[#1A1A1A]' : 'text-stone-600 bg-white border-[#E5E5E5]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Advanced search Query */}
              <div className="relative w-full md:max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Insert name or ingredient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#FDFCFB] border border-[#E5E5E5] focus:outline-none focus:border-[#1A1A1A] rounded-none"
                />
              </div>

              {/* Sorting trigger */}
              <div className="flex items-center space-x-2.5">
                <span className="text-stone-500 flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5" /> Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-none font-bold uppercase tracking-widest text-[9.5px] focus:outline-none text-[#1A1A1A]"
                >
                  <option value="featured">Featured Collection</option>
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                  <option value="rating">Top Testimonial Units</option>
                </select>
              </div>

            </div>

            {/* Compare prompt drawer if items are checked */}
            {compareList.length > 0 && (
              <div className="p-3 bg-teal-50 border border-teal-200 flex items-center justify-between text-xs font-sans rounded">
                <span className="font-semibold text-teal-980">
                  You added {compareList.length} Coco Queens ritual candidate. Review side-by-side specs:
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCompareList([])}
                    className="px-3 py-1 text-stone-600 hover:text-stone-900 border border-stone-200 bg-white"
                  >
                    Wipe Selections
                  </button>
                  <button
                    onClick={() => setView('comparison')}
                    className="px-4 py-1 bg-teal-800 font-bold hover:bg-teal-900 text-white rounded shadow-sm"
                  >
                    Activate Side-by-Side Compare
                  </button>
                </div>
              </div>
            )}

            {/* Products grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white border border-stone-200">
                <ShieldAlert className="w-12 h-12 text-[#a8a29e] mx-auto stroke-1 mb-3 animate-pulse" />
                <p className="font-serif italic text-base text-[#78716c]">No Coco Queens products correspond to your query.</p>
                <p className="text-xs text-[#a8a29e] mt-1">Refining search keywords or cleaning active segment blocks coordinates.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setCategoryFilter('All'); }}
                  className="mt-4 text-xs font-bold uppercase tracking-wider text-[#1c1917] underline hover:text-stone-700"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    isWishlisted={wishlist.includes(prod.id)}
                    onToggleWishlist={() => handleToggleWishlist(prod.id)}
                    onViewDetails={() => setSelectedProduct(prod)}
                    onAddToCart={() => handleAddToCart(prod)}
                    onCompareToggle={() => handleToggleCompare(prod)}
                    isCompareChecked={compareList.some(p => p.id === prod.id)}
                  />
                ))}
              </div>
            )}

          </div>
        )}

        {/* VIEW 3: WELLNESS STORIES STORIES */}
        {currentView === 'blog' && <BlogSection />}

        {/* VIEW 4: CAREERS STORY */}
        {currentView === 'careers' && <CareersPage />}

        {/* VIEW 5: RITUAL COMPARISON */}
        {currentView === 'comparison' && (
          <ProductComparison
            productsToCompare={compareList}
            onRemoveFromCompare={(id) => setCompareList(compareList.filter(p => p.id !== id))}
            onAddToCart={(prod) => handleAddToCart(prod)}
            onClose={() => setView('shop')}
          />
        )}

        {/* VIEW 6: MEMBERS DASHBOARD & PROFILE DATA */}
        {currentView === 'profile' && user && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 font-sans">
            
            {/* Welcome banner card */}
            <div className="bg-[#FDFCFB] border border-[#E5E5E5] p-6.5 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm rounded-none">
              <div className="text-center md:text-left space-y-1">
                <span className="text-[9px] uppercase tracking-[0.2em] bg-[#F5F2ED] px-3 py-1 border border-[#E5E5E5] text-[#1A1A1A] font-bold rounded-none">
                  Circle Member
                </span>
                <h2 className="font-serif text-2xl font-light text-stone-900 uppercase tracking-wide">
                  Welcome to Your Coco Queens Account, {user.name}
                </h2>
                <p className="text-xs text-[#6B705C] font-semibold italic mt-1.5">Verified Member Since June 2026</p>
              </div>

              {/* Loyalty summary button */}
              <div className="px-5 py-4 bg-[#F5F2ED] rounded-none border border-[#E5E5E5] text-center space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]">Your Wallet Loyalty Balance</span>
                <p className="font-serif text-2xl font-bold text-[#6B705C]">{user.loyaltyPoints} points</p>
                <p className="text-[10px] text-stone-500 italic font-medium">Valid value: {formatTZS(((user.loyaltyPoints || 0)/100*5000))} off next order</p>
              </div>
            </div>

            {/* Profile Inner Grid columns: Shipping, Orders, GDPR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left column: Addresses list & GDPR files */}
              <div className="lg:col-span-5 space-y-8">
                
                {/* 1. Address lists */}
                <div className="bg-[#FDFCFB] border border-[#E5E5E5] p-6 shadow-sm space-y-4 rounded-none">
                  <h3 className="font-serif text-base uppercase tracking-widest pb-2 border-b border-[#E5E5E5] font-semibold flex items-center gap-1.5 text-[#1A1A1A]">
                    <MapPin className="w-4 h-4 text-[#6B705C]" />
                    Delivery Addresses
                  </h3>

                  {profileSuccess && <p className="p-3 bg-emerald-50 text-emerald-950 text-xs font-semibold rounded-none border border-emerald-100">{profileSuccess}</p>}
                  {profileError && <p className="p-3 bg-red-50 text-red-950 text-xs font-semibold rounded-none border border-red-100">{profileError}</p>}

                  {/* List current addresses */}
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {user.addresses && user.addresses.length > 0 ? (
                      user.addresses.map((addr) => (
                        <div key={addr.id} className="p-3 bg-[#F5F2ED]/50 border border-[#E5E5E5] text-xs relative space-y-0.5 rounded-none">
                          <span className="font-bold text-stone-900 block">{addr.label}</span>
                          <p className="text-stone-700">{addr.street}</p>
                          <p className="text-stone-700">{addr.city}, {addr.state} {addr.postalCode}</p>
                          <p className="text-[#6B705C] font-semibold">{addr.country}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#6B705C] italic">No addresses saved yet under your secure profile logs.</p>
                    )}
                  </div>

                  {/* Add New address Form */}
                  <form onSubmit={handleAddressSubmit} className="space-y-3.5 pt-3 border-t border-[#E5E5E5] text-xs">
                    <h4 className="font-bold uppercase text-[9.5px] tracking-widest text-[#1A1A1A]">Refine / Add Address Details:</h4>
                    
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#6B705C] mb-1 font-bold">Street coordinates</label>
                      <input
                        type="text"
                        required
                        value={newStreet}
                        onChange={(e) => setNewStreet(e.target.value)}
                        placeholder="e.g. 15 Wellness Boulevard, Suite 50"
                        className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-none text-xs focus:outline-none focus:border-[#1A1A1A]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="City"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-none text-xs focus:outline-none focus:border-[#1A1A1A]"
                      />
                      <input
                        type="text"
                        required
                        placeholder="State"
                        value={newState}
                        onChange={(e) => setNewState(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-none text-xs focus:outline-none focus:border-[#1A1A1A]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="ZIP/Postal"
                        value={newPostal}
                        onChange={(e) => setNewPostal(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-none text-xs focus:outline-none focus:border-[#1A1A1A]"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Country"
                        value={newCountry}
                        onChange={(e) => setNewCountry(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-none text-xs focus:outline-none focus:border-[#1A1A1A]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#2D2D2D] text-white text-[10px] uppercase font-bold tracking-widest transition rounded-none"
                    >
                      Authenticate and Store Address
                    </button>
                  </form>
                </div>

                {/* 2. GDPR Compliance features */}
                <div className="bg-[#FDFCFB] border border-[#E5E5E5] p-6 shadow-sm space-y-4 rounded-none">
                  <h3 className="font-serif text-base uppercase tracking-widest pb-2 border-b border-[#E5E5E5] font-semibold flex items-center gap-1.5 text-[#1A1A1A]">
                    <Clock className="w-4 h-4 text-[#6B705C]" />
                    GDPR Privacy Sovereignty
                  </h3>
                  <p className="text-xs text-[#4A4A4A] leading-relaxed">
                    Under standard General Data Protection Regulation protocols, your sovereignty is preserved. Download your personal transaction datasets directly, or permanently wipe your account logs instantly:
                  </p>

                  <div className="grid grid-cols-2 gap-3 font-semibold text-xs text-center">
                    <button
                      onClick={handleGDPRDownload}
                      className="flex items-center justify-center gap-1.5 py-3 border border-[#E5E5E5] hover:border-black text-[10px] uppercase tracking-wider font-bold text-stone-800 transition rounded-none"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Data JSON
                    </button>
                    <button
                      onClick={handleGDPRDelete}
                      className="flex items-center justify-center gap-1.5 py-3 bg-red-50 text-red-900 border border-red-200 hover:bg-red-100 text-[10px] uppercase tracking-wider font-bold transition rounded-none"
                    >
                      <Trash className="w-3.5 h-3.5" /> Erase Me Forever
                    </button>
                  </div>
                </div>

              </div>

              {/* Right column: Orders list history */}
              <div className="lg:col-span-7 bg-[#FDFCFB] border border-[#E5E5E5] p-6 shadow-sm space-y-4 rounded-none">
                <h3 className="font-serif text-base uppercase tracking-widest pb-2 border-b border-[#E5E5E5] font-semibold flex items-center gap-1.5 text-[#1A1A1A]">
                  <Calendar className="w-4 h-4 text-[#6B705C]" />
                  Your Order Dispensations History
                </h3>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {orders.length === 0 ? (
                    <p className="text-xs text-[#6B705C] italic">No Coco Queens orders completed yet. Browse the collection to complete your first ritual.</p>
                  ) : (
                    orders.map((ord) => (
                      <div key={ord.id} className="p-4.5 bg-[#FDFCFB] border border-[#E5E5E5] relative text-xs space-y-3 shadow-sm rounded-none">
                        
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-stone-900">ID: {ord.id}</span>
                          <span className="text-[10px] text-stone-400 font-mono font-bold">{new Date(ord.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* List items bought */}
                        <div className="border-y border-[#E5E5E5] py-2.5 space-y-1.5">
                          {ord.items.map((item, id) => (
                            <div key={id} className="flex justify-between font-medium">
                              <span className="text-stone-800">{item.name} <span className="text-[#6B705C] font-mono font-bold">x{item.quantity}</span></span>
                              <span className="font-serif font-semibold text-[#1A1A1A]">{formatTZS(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Totals */}
                        <div className="flex justify-between text-[11px] font-mono text-[#6B705C] font-bold">
                          <span>Point earned: +{ord.pointsEarned} pts</span>
                          {ord.pointsRedeemed > 0 && <span>Points redeemed: -{ord.pointsRedeemed} pts</span>}
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className={`text-[9px] uppercase font-bold tracking-widest border px-2.5 py-0.5 rounded-none ${
                            ord.shippingStatus === 'Delivered' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {ord.shippingStatus}
                          </span>
                          <span className="font-serif font-bold text-base text-[#1A1A1A]">
                            Total Charged: {formatTZS(ord.total)}
                          </span>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Loyalty rules display bottom drawer */}
            <LoyaltyProgram user={user} onOpenAuth={() => setIsAuthOpen(true)} />

          </div>
        )}

        {/* VIEW 7: FULL COMMAND HQ ADMIN */}
        {currentView === 'admin' && (user?.role === 'admin' || user?.role === 'owner') && (
          <AdminDashboard user={user} />
        )}

      </main>

      {/* 4. FOOTER */}
      <footer className="bg-[#1A1A1A] text-[#999999] pt-16 pb-10 border-t border-[#D4CFC9]/25 font-sans text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
          
          <div className="space-y-4">
            <h4 className="font-serif text-[#FDFCFB] uppercase tracking-[0.25em] font-medium text-sm">COCO QUEENS</h4>
            <p className="leading-relaxed text-[#999999]/90 font-light text-[12.5px]">
              Premium coconut oil, scrub, raw honey and essential oils for skin, hair and total wellness.
            </p>
            <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#6B705C] bg-[#F5F2ED] px-3.5 py-1.5 border border-[#E5E5E5] inline-block">
              Total Beauty and Wellness
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-serif text-[#FDFCFB] uppercase tracking-[0.2em] font-medium">Shop Segments</h4>
            <ul className="space-y-2.5 text-[#999999]/85 font-medium">
              <li><button onClick={() => { setView('shop'); setCategoryFilter('Oil'); }} className="hover:text-[#FDFCFB] transition-colors cursor-pointer">Extra Virgin Coconut Oil</button></li>
              <li><button onClick={() => { setView('shop'); setCategoryFilter('Scrub'); }} className="hover:text-[#FDFCFB] transition-colors cursor-pointer">Exfoliating Coconut Scrub</button></li>
              <li><button onClick={() => { setView('shop'); setCategoryFilter('Honey'); }} className="hover:text-[#FDFCFB] transition-colors cursor-pointer">Pure Raw Honey</button></li>
              <li><button onClick={() => { setView('shop'); setCategoryFilter('Essential Oils'); }} className="hover:text-[#FDFCFB] transition-colors cursor-pointer">Essential Oils</button></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-serif text-[#FDFCFB] uppercase tracking-[0.2em] font-medium">Customer Space</h4>
            <ul className="space-y-2.5 text-[#999999]/85 font-medium">
              <li><button onClick={() => setView('blog')} className="hover:text-[#FDFCFB] transition-colors cursor-pointer">Wellness Journal Articles</button></li>
              <li><button onClick={() => setView('careers')} className="hover:text-[#FDFCFB] transition-colors cursor-pointer">Brand Joining (Careers)</button></li>
              <li><button onClick={() => setView('comparison')} className="hover:text-[#FDFCFB] transition-colors cursor-pointer">Constituent Compare Grid</button></li>
              <li><button onClick={() => { if(user) setView('profile'); else setIsAuthOpen(true); }} className="hover:text-[#FDFCFB] transition-colors cursor-pointer">Coco Queens Account</button></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-serif text-[#FDFCFB] uppercase tracking-[0.2em] font-medium">Headquarters Contacts</h4>
            <p className="text-[#999999]/85 leading-relaxed font-medium">
              Dar es Salaam, Tanzania<br />
              Mobile Money: Vodacom M-Pesa / Airtel Money<br />
              Email: support@cocoqueens.co.tz
            </p>
            <div className="flex space-x-4 pt-1 text-[11px] font-bold uppercase tracking-widest">
              <span className="text-[#6B705C] hover:text-[#FDFCFB] transition-colors cursor-pointer">Instagram</span>
              <span className="text-[#6B705C] hover:text-[#FDFCFB] transition-colors cursor-pointer">TikTok</span>
              <span className="text-[#6B705C] hover:text-[#FDFCFB] transition-colors cursor-pointer">Pinterest</span>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row justify-between items-center text-[10px] text-[#999999]/70 font-semibold tracking-[0.1em] uppercase">
          <p>© 2026 Coco Queens. Secure checkout enabled. All Rights Reserved.</p>
          <div className="flex space-x-4 mt-4 sm:mt-0 font-bold">
            <span className="hover:underline hover:text-[#FDFCFB] transition-colors cursor-pointer">Privacy Charter</span>
            <span className="hover:underline hover:text-[#FDFCFB] transition-colors cursor-pointer">Terms of Amity</span>
            <span className="hover:underline hover:text-[#FDFCFB] transition-colors cursor-pointer">GDPR Disclosures</span>
          </div>
        </div>
      </footer>

      {/* --- DRAWERS AND OVERLAY INTERRUPTS --- */}

      {/* Cart Drawer */}
      {isCartOpen && (
        <CartDrawer
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          user={user}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemoveFromCart}
          onOpenAuth={() => { setIsCartOpen(false); setIsAuthOpen(true); }}
          onCheckoutComplete={(orderData) => {
            setIsCartOpen(false);
            setCart([]);
            localStorage.removeItem('aura_cart');
            setView('profile');
            alert(`Purchase submitted! Order ID: ${orderData.id}. Saved to your Coco Queens account pending mobile money verification.`);
          }}
        />
      )}

      {/* Auth Modal Selection */}
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Details Profile Sheet */}
      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          user={user}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(isRecurring) => {
            handleAddToCart(selectedProduct, isRecurring);
            setSelectedProduct(null);
          }}
          onReviewSubmitted={(updatedProd) => {
            setSelectedProduct(updatedProd);
            fetchProducts(); // refresh list to secure new scores
          }}
        />
      )}

    </div>
  );
}

