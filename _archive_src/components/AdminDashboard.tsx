import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, FolderPlus, ListOrdered, Calendar, Users, BarChart3, Receipt, Eye, CheckCircle2, ChevronRight, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Product, Order, User } from '../types';
import { formatTZS } from '../utils/money';

interface AdminDashboardProps {
  user: User | null;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [tab, setTab] = useState<'analytics' | 'products' | 'orders' | 'users' | 'audit'>('analytics');
  
  // Analytics State
  const [stats, setStats] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Form states to Add/Edit Products
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(10);
  const [category, setCategory] = useState('Skincare');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [benefits, setBenefits] = useState('');
  const [usage, setUsage] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Published'>('Published');
  const [skinType, setSkinType] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch critical server registers
  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('aura_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resStats, resProds, resOrders, resUsers, resAudit] = await Promise.all([
        fetch('/api/admin/analytics', { headers }),
        fetch('/api/products', { headers }),
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/audit-logs', { headers })
      ]);

      if (resStats.ok) setStats(await resStats.json());
      if (resProds.ok) setAllProducts(await resProds.json());
      if (resOrders.ok) setAllOrders(await resOrders.json());
      if (resUsers.ok) setAllUsers(await resUsers.json());
      if (resAudit.ok) setAuditLogs(await resAudit.json());
    } catch (err) {
      console.error('Error gathering admin systems data:', err);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'owner')) {
      fetchAllData();
    }
  }, [user, tab]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const token = localStorage.getItem('aura_token');
    const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
    const method = editingProduct ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name, price, stock, category, description, ingredients, benefits, usage, status, skinType, isRecurring
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFormSuccess(data.message);
      // Clear product edit form
      setEditingProduct(null);
      resetFields();
      fetchAllData();
    } catch (err: any) {
      setFormError(err.message || 'Error processing product database save.');
    }
  };

  const resetFields = () => {
    setName('');
    setPrice(0);
    setStock(10);
    setCategory('Skincare');
    setDescription('');
    setIngredients('');
    setBenefits('');
    setUsage('');
    setStatus('Published');
    setSkinType('');
    setIsRecurring(false);
  };

  const populateEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setPrice(p.price);
    setStock(p.stock);
    setCategory(p.category);
    setDescription(p.description);
    setIngredients(p.ingredients || '');
    setBenefits(p.benefits || '');
    setUsage(p.usage || '');
    setStatus(p.status);
    setSkinType(p.skinType || '');
    setIsRecurring(!!p.isRecurring);
    setTab('products');
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you absolutely certain you wish to wipe this product description record from catalogs?')) return;
    try {
      const token = localStorage.getItem('aura_token');
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const advanceShippingState = async (orderId: string, current: string) => {
    const nextState = current === 'Pending' ? 'Shipped' : 'Delivered';
    try {
      const token = localStorage.getItem('aura_token');
      await fetch(`/api/admin/orders/${orderId}/shipping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shippingStatus: nextState })
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProductStatus = async (p: Product) => {
    const nextStatus = p.status === 'Published' ? 'Draft' : 'Published';
    try {
      const token = localStorage.getItem('aura_token');
      await fetch(`/api/admin/products/${p.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromoteRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'customer' ? 'admin' : 'customer';
    if (!confirm(`Are you certain you wish to elevate this user role from ${currentRole} to ${nextRole}?`)) return;

    try {
      const token = localStorage.getItem('aura_token');
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: nextRole })
      });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-stone-200 pb-5 mb-8">
        <div>
          <div className="flex items-center gap-2 text-emerald-800">
            <Shield className="w-5.5 h-5.5" />
            <span className="text-[11px] uppercase tracking-widest font-bold">Coco Queens Administrator Command Base</span>
          </div>
          <h1 className="font-serif text-3xl font-light text-stone-900 mt-1 uppercase tracking-wide">
            HQ Command Suite
          </h1>
        </div>

        {/* Tab Selection Row */}
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0 font-sans text-xs">
          {(['analytics', 'products', 'orders', 'users', 'audit'] as const).map((viewId) => (
            <button
              key={viewId}
              onClick={() => { setTab(viewId); setEditingProduct(null); }}
              className={`px-4.5 py-2 hover:bg-stone-100 transition rounded-none font-semibold uppercase tracking-wider ${
                tab === viewId ? 'bg-stone-850 text-white hover:bg-stone-900' : 'text-stone-600 border border-stone-200'
              }`}
            >
              {viewId}
            </button>
          ))}
        </div>
      </div>

      {/* --- RENDER ACTIVE SUB PANEL CONTENT --- */}

      {/* 1. ANALYTICS STATS */}
      {tab === 'analytics' && stats && (
        <div className="space-y-8 font-sans">
          
          {/* Top Numeric Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 bg-white border border-stone-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Gross Ledger Revenue</span>
                <p className="font-serif text-2xl font-bold text-stone-900">{formatTZS(stats.totalRev)}</p>
              </div>
              <Receipt className="w-9 h-9 text-emerald-700 opacity-20" />
            </div>

            <div className="p-5 bg-white border border-stone-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Total Dispatches</span>
                <p className="font-serif text-2xl font-bold text-stone-900">{stats.salesCount} Orders</p>
              </div>
              <ListOrdered className="w-9 h-9 text-blue-700 opacity-20" />
            </div>

            <div className="p-5 bg-white border border-stone-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Active Client Circle</span>
                <p className="font-serif text-2xl font-bold text-stone-900">{stats.totalUsers} Members</p>
              </div>
              <Users className="w-9 h-9 text-amber-700 opacity-20" />
            </div>

            <div className="p-5 bg-white border border-stone-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Units Transacted</span>
                <p className="font-serif text-2xl font-bold text-stone-900">{stats.totalItemsSold} Items</p>
              </div>
              <BarChart3 className="w-9 h-9 text-stone-700 opacity-20" />
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category split */}
            <div className="p-6 bg-white border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-serif text-[16px] font-semibold tracking-wide text-stone-950 uppercase">Category Abundance</h3>
              <div className="space-y-3 pt-2">
                {Object.entries(stats.categoryPopularity).map(([cat, count]: any) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{cat}</span>
                      <span>{count} Variations</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-[#f5f5f4] h-2">
                      <div 
                        className="bg-stone-800 h-full transition-all" 
                        style={{ width: `${Math.min(100, (count / 10) * 100)}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Growth Module: Simulated Abandoned Cart Candidates */}
            <div className="p-6 bg-white border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5 text-amber-800">
                <Sparkles className="w-4.5 h-4.5 text-amber-600 animate-pulse" />
                <h3 className="font-serif text-[16px] font-semibold tracking-wide text-stone-950 uppercase">
                  Abandoned Basket Leads (Growth)
                </h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                The core tracking engine monitors registered wellness seekers who have initiated a profile but haven't placed an order within 48 hours. Launch newsletter follow-ups with COCO10 coupons:
              </p>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pt-1">
                {stats.abandonedCartCandidates && stats.abandonedCartCandidates.length > 0 ? (
                  stats.abandonedCartCandidates.map((cand: any) => (
                    <div key={cand.id} className="p-3 bg-amber-50/40 border border-amber-200/50 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-stone-900">{cand.name}</p>
                        <p className="font-mono text-[10.5px] text-stone-500">{cand.email}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-amber-800 bg-amber-100/50 px-2.5 py-0.5 border border-amber-200/30">
                        Incomplete Checkout
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-500 italic">No idle checkouts found. Excellent conversion metrics recorded!</p>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 2. PRODUCT CATALOG MANAGEMENT */}
      {tab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
          
          {/* Left Form: Add/Edit products */}
          <div className="lg:col-span-5 bg-white border border-stone-200 p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-[17px] font-semibold uppercase tracking-wider text-stone-950">
              {editingProduct ? 'Refine Botanical Profile' : 'Incorporate New botanical'}
            </h3>

            {formSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-950 border-l-2 border-emerald-700 text-xs font-semibold rounded">
                {formSuccess}
              </div>
            )}
            {formError && (
              <div className="p-3 bg-red-50 text-red-950 border-l-2 border-red-700 text-xs font-semibold rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-250 text-xs focus:outline-none"
                  placeholder="e.g. Royal Jasmine Dew"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">Price (TZS)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-stone-250 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">Unit Stock</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-stone-250 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#78716c] mb-1">Category Segment</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-250 text-xs focus:outline-none"
                >
                  <option value="Skincare">Skincare</option>
                  <option value="Aromatherapy">Aromatherapy</option>
                  <option value="Haircare">Haircare</option>
                  <option value="Herbal Teas">Herbal Teas</option>
                  <option value="Wellness Devices">Wellness Devices</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">Product Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-250 focus:outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#78716c] mb-1">Natural Ingredients List</label>
                <input
                  type="text"
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-250"
                  placeholder="Comma-separated ingredients"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">Skin/Hair Match</label>
                  <input
                    type="text"
                    value={skinType}
                    onChange={(e) => setSkinType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-250 text-xs"
                    placeholder="e.g. Sensitive Skin"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">Status Policy</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-stone-250 text-xs focus:outline-none"
                  >
                    <option value="Published">Published (Public)</option>
                    <option value="Draft">Draft (Incognito)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rec_sub"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="rec_sub" className="text-[11px] font-bold text-stone-700 cursor-pointer">
                  Activate auto-replenish option at checkout
                </label>
              </div>

              <div className="flex gap-2">
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => { setEditingProduct(null); resetFields(); }}
                    className="w-1/3 py-2 border border-stone-200 text-[#1c1917] font-semibold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-grow py-3 bg-[#292524] text-white hover:bg-[#1c1917] tracking-widest font-semibold uppercase"
                >
                  {editingProduct ? 'Update Product Profile' : 'Publish Product Variation'}
                </button>
              </div>

            </form>
          </div>

          {/* Right Area: Catalog variations list */}
          <div className="lg:col-span-7 bg-white border border-stone-200 p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-[17px] font-semibold text-stone-900 uppercase">Existing Collection Catalog</h3>
            
            <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
              {allProducts.map((p) => (
                <div key={p.id} className="p-3 bg-stone-50/50 border border-stone-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.images[0]}
                      className="w-11 h-11 object-cover border border-stone-250"
                      alt=""
                    />
                    <div>
                      <h4 className="font-bold text-stone-900 truncate max-w-[200px]">{p.name}</h4>
                      <p className="font-mono text-[10.5px] text-stone-500">{formatTZS(p.price)} â€¢ {p.stock} in stock</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Toggle publication status */}
                    <button
                      onClick={() => handleToggleProductStatus(p)}
                      className="flex items-center gap-1 hover:opacity-80 transition"
                      title="Toggle Visibility"
                    >
                      {p.status === 'Published' ? (
                        <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-100 flex items-center gap-1">
                           Published
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-500 font-bold bg-stone-100 px-2 py-0.5 border border-stone-250 flex items-center gap-1">
                           Draft (Incognito)
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => populateEdit(p)}
                      className="text-stone-600 hover:text-stone-900 text-xs font-semibold"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="text-red-700 hover:text-red-900"
                      title="Wipe record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 3. ORDER DISPATCH LOGISTICS */}
      {tab === 'orders' && (
        <div className="bg-white border border-stone-200 p-6 shadow-sm font-sans space-y-4">
          <h3 className="font-serif text-[17px] font-semibold text-stone-950 uppercase">Active Order Operations</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 uppercase tracking-wider text-[10px] text-[#78716c]">
                  <th className="p-3">Order Signature</th>
                  <th className="p-3">Purchaser</th>
                  <th className="p-3">Receipt Items</th>
                  <th className="p-3">Shipping Coordinates</th>
                  <th className="p-3">Receipt Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {allOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50/40 text-[12px]">
                    <td className="p-3 font-mono font-bold text-stone-900">{ord.id}</td>
                    <td className="p-3 font-semibold">{ord.userEmail}</td>
                    <td className="p-3 max-w-[150px] truncate">
                      {ord.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                    </td>
                    <td className="p-3 text-[11.5px] leading-relaxed">
                      {ord.shippingAddress?.street}, {ord.shippingAddress?.city}, {ord.shippingAddress?.state}
                    </td>
                    <td className="p-3 font-bold text-[#1c1917]">{formatTZS(ord.total)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        ord.shippingStatus === 'Delivered' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                        ord.shippingStatus === 'Shipped' ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' :
                        'bg-amber-50 text-amber-800 border border-amber-100'
                      }`}>
                        {ord.shippingStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      {ord.shippingStatus !== 'Delivered' ? (
                        <button
                          onClick={() => advanceShippingState(ord.id, ord.shippingStatus)}
                          className="px-2.5 py-1 text-[10.5px] bg-[#292524] text-white hover:bg-[#1c1917] font-semibold uppercase tracking-wider rounded"
                        >
                          {ord.shippingStatus === 'Pending' ? 'Ship Packet' : 'Deliver'}
                        </button>
                      ) : (
                        <span className="text-stone-500 font-bold uppercase text-[10px]">Settled Safe</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ACTIVE MEMBERS SYSTEM */}
      {tab === 'users' && (
        <div className="bg-white border border-stone-200 p-6 shadow-sm font-sans space-y-4">
          <h3 className="font-serif text-[17px] font-semibold text-stone-950 uppercase text-left">Active Member Base</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 uppercase tracking-wider text-[10px] text-[#78716c]">
                  <th className="p-3">Member Signatures</th>
                  <th className="p-3">Email Coordinates</th>
                  <th className="p-3">Role Authority</th>
                  <th className="p-3">Coco Points</th>
                  <th className="p-3">Unique Referral Code</th>
                  <th className="p-3">Enroll Date</th>
                  <th className="p-3">Authority Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-[12px]">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/40">
                    <td className="p-3 font-semibold">{u.name}</td>
                    <td className="p-3 font-mono text-[11px] font-medium">{u.email}</td>
                    <td className="p-3 font-bold">
                      <span className={`uppercase text-[10px] tracking-wider px-2 py-0.5 rounded ${
                        u.role === 'owner' ? 'bg-purple-100 text-purple-900' :
                        u.role === 'admin' ? 'bg-emerald-100 text-emerald-950' :
                        'bg-stone-100 text-stone-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-stone-800">{u.loyaltyPoints} pts</td>
                    <td className="p-3 font-mono font-bold">{u.referralCode}</td>
                    <td className="p-3 text-[#78716c]">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      {/* Owner cannot adjust their own role */}
                      {user?.id !== u.id && u.role !== 'owner' ? (
                        <button
                          onClick={() => handlePromoteRole(u.id, u.role)}
                          className="text-stone-700 hover:text-[#1c1917] font-bold select-none cursor-pointer text-xs"
                        >
                          {u.role === 'admin' ? 'Demote to Customer' : 'Elevate to Admin'}
                        </button>
                      ) : (
                        <span className="text-gray-400 font-bold italic text-[11px]">Unmodifiable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. AUDIT LOG MANAGEMENT */}
      {tab === 'audit' && (
        <div className="bg-white border border-stone-200 p-6 shadow-sm font-sans space-y-4">
          <h3 className="font-serif text-[17px] font-semibold text-stone-950 uppercase">Audit Trail Ledger</h3>
          <p className="text-xs text-stone-500 italic">This ledger tracks administrative operations on catalog, system access configurations, and permissions states in real-time.</p>

          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pt-1 pr-1">
            {auditLogs && auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 bg-neutral-50 border border-stone-200 flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10.5px] uppercase font-bold tracking-widest bg-[#292524] text-white px-2 py-0.5">
                        {log.action}
                      </span>
                      <span className="font-semibold text-stone-900">{log.userEmail}</span>
                    </div>
                    <p className="text-stone-600 block">{log.details}</p>
                  </div>
                  <span className="font-mono text-[10px] text-stone-400 text-right">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-500 italic">No admin actions recorded yet in session vault. All catalog states stable.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}



