import React, { useState } from 'react';
import { X, Star, Sparkles, Check, ShoppingBag, ShieldAlert, Award } from 'lucide-react';
import { Product, User } from '../types';
import { formatTZS } from '../utils/money';

interface ProductDetailsProps {
  product: Product;
  user: User | null;
  onClose: () => void;
  onAddToCart: (isRecurring: boolean) => void;
  onReviewSubmitted: (updatedProduct: Product) => void;
}

export default function ProductDetails({
  product,
  user,
  onClose,
  onAddToCart,
  onReviewSubmitted
}: ProductDetailsProps) {
  const [tab, setTab] = useState<'details' | 'ingredients' | 'benefits' | 'usage'>('details');
  const [isRecurring, setIsRecurring] = useState(false);
  
  // Review form states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must sign in in order to post botanical reviews.');
      return;
    }
    setError('');
    setSuccess('');
    setReviewLoading(true);

    try {
      const token = localStorage.getItem('aura_token');
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('Review posted beautifully. 20 Loyalty points credited!');
      setComment('');
      onReviewSubmitted(data.product);
    } catch (err: any) {
      setError(err.message || 'Error publishing review.');
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#FDFCFB] border border-[#E5E5E5] shadow-2xl rounded-none flex flex-col md:flex-row my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-[#4A4A4A] hover:text-[#1A1A1A] bg-[#FDFCFB]/80 backdrop-blur hover:rotate-90 transition-all rounded-none border border-[#E5E5E5]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Aspect: Large Graphic Banner */}
        <div className="w-full md:w-1/2 aspect-square md:aspect-auto md:h-full min-h-[350px] relative bg-[#F5F2ED] overflow-hidden border-r border-[#E5E5E5]">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover grayscale-[10%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>

        {/* Right Aspect: Editorial content panel */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[85vh] sm:max-h-none bg-[#FDFCFB]">
          <div className="space-y-5">
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 bg-[#F5F2ED] text-[#1A1A1A] border border-[#E5E5E5]">
                {product.category}
              </span>
              {product.skinType && (
                <span className="text-[9px] uppercase tracking-widest font-bold text-[#6B705C] bg-[#FDFCFB] px-3 py-1 border border-[#6B705C]/35 italic">
                  {product.skinType}
                </span>
              )}
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-light tracking-wide text-[#1A1A1A] leading-tight">
              {product.name}
            </h2>

            {/* Average Rating Display */}
            <div className="flex items-center space-x-2">
              <div className="flex text-orange-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-orange-400 text-orange-400' : 'text-stone-200'}`}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-[#1A1A1A] font-mono">{product.rating} / 5.0</span>
              <span className="text-xs text-[#999] font-sans">({product.reviews?.length || 0} reviews)</span>
            </div>

            {/* Prices */}
            <p className="font-serif text-xl font-bold text-[#1A1A1A]">
              {formatTZS(product.price)}
            </p>

            {/* Tabs selection */}
            <div className="flex border-b border-[#E5E5E5] text-xs">
              {(['details', 'ingredients', 'benefits', 'usage'] as const).map((tabId) => (
                <button
                  key={tabId}
                  onClick={() => setTab(tabId)}
                  className={`py-2 px-3 tracking-widest uppercase font-semibold border-b transition-colors ${
                    tab === tabId ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold' : 'border-transparent text-[#6B705C] hover:text-[#1A1A1A]'
                  }`}
                >
                  {tabId === 'details' ? 'Profile' : tabId}
                </button>
              ))}
            </div>

            {/* Tab Copy */}
            <div className="text-[13.5px] text-[#4A4A4A] leading-relaxed py-2 min-h-[90px] font-sans">
              {tab === 'details' && product.description}
              {tab === 'ingredients' && (
                <div className="space-y-1">
                  <p className="font-semibold text-stone-900 uppercase text-[10px] tracking-wider mb-1">RAW REVELATIONS:</p>
                  <p className="italic">{product.ingredients}</p>
                </div>
              )}
              {tab === 'benefits' && product.benefits}
              {tab === 'usage' && (
                <div className="space-y-1">
                  <p className="font-semibold text-stone-900 uppercase text-[10px] tracking-wider mb-1">RITUAL INSTRUCTIONS:</p>
                  <p>{product.usage}</p>
                </div>
              )}
            </div>

            {/* Stripe Subscription Select option */}
            {product.isRecurring && (
              <div className="p-3.5 bg-[#F5F2ED] border border-[#E5E5E5] rounded-none flex items-start gap-2.5 font-sans">
                <input
                  type="checkbox"
                  id="subscription-tier"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                />
                <div className="text-xs">
                  <label htmlFor="subscription-tier" className="font-bold text-[#1A1A1A] block cursor-pointer">
                    Auto-Replenish Subscription (Save 10% &amp; Earn Double points)
                  </label>
                  <span className="text-[#6B705C] block mt-0.5 font-medium">
                    Fresh natural stocks auto-delivered to your address every 30 days. Cancel with 1-click inside dashboard.
                  </span>
                </div>
              </div>
            )}

            {/* Add to Bag CTA */}
            <button
              id="details-add-to-bag"
              onClick={() => onAddToCart(isRecurring)}
              disabled={product.stock === 0}
              className="w-full py-4 bg-[#1A1A1A] text-white hover:bg-[#2D2D2D] transition text-xs font-semibold tracking-[0.25em] uppercase flex items-center justify-center space-x-2 rounded-none disabled:opacity-40"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{product.stock === 0 ? 'Expelled (Sold Out)' : isRecurring ? 'Initiate Monthly Subscription' : 'Add to Routine'}</span>
            </button>

          </div>

          {/* Reviews Section */}
          <div className="mt-8 pt-6 border-t border-[#E5E5E5] space-y-6">
            <h3 className="font-serif text-[16px] font-semibold text-[#1A1A1A] tracking-wider flex items-center gap-1.5 uppercase">
              <Award className="w-4 h-4 text-[#6B705C]" />
              Seeker Testimonials
            </h3>

            {/* Form for writing reviews */}
            {user ? (
              <form onSubmit={submitReview} className="space-y-3 bg-[#F5F2ED]/60 border border-[#E5E5E5] p-4 font-sans rounded-none">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-850 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  Leave review (Get 20 Royalty points)
                </p>

                {error && <p className="text-xs text-red-700 font-semibold">{error}</p>}
                {success && <p className="text-xs text-emerald-800 font-semibold">{success}</p>}

                <div className="flex gap-2.5 items-center">
                  <span className="text-xs text-stone-700 uppercase tracking-widest">Your Rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setRating(val)}
                        className="text-orange-400 hover:scale-110 transition cursor-pointer"
                      >
                        <Star className={`w-4 h-4 ${val <= rating ? 'fill-orange-400 text-orange-400' : 'text-stone-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  required
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your botanical experiences, skin hydration results, or aromatic rituals..."
                  className="w-full p-3.5 text-xs bg-[#FDFCFB] border border-[#E5E5E5] rounded-none focus:outline-none focus:border-stone-800"
                />

                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="px-5 py-2.5 bg-[#1A1A1A] text-white hover:bg-stone-900 transition text-[10px] uppercase tracking-widest font-semibold rounded-none disabled:opacity-50"
                >
                  {reviewLoading ? 'Submitting...' : 'Post Testimonial'}
                </button>
              </form>
            ) : (
              <div className="p-3 bg-red-50/50 rounded-none border border-red-100 flex items-center gap-2 text-xs text-red-950 font-sans">
                <ShieldAlert className="w-4 h-4 text-red-700 flex-shrink-0" />
                <span>You must sign in with a verified account in order to share skin reviews.</span>
              </div>
            )}

            {/* List Reviews */}
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 border-b border-[#E5E5E5] space-y-1 bg-white relative rounded-none">
                    <div className="flex justify-between items-center">
                      <span className="font-serif text-[14px] font-medium text-[#1A1A1A]">{rev.userName}</span>
                      <span className="text-[9px] font-mono text-[#999]">{new Date(rev.date).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex text-orange-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < rev.rating ? 'fill-orange-400 text-orange-400' : 'text-stone-200'}`}
                        />
                      ))}
                    </div>

                    <p className="text-xs text-[#4A4A4A] italic leading-relaxed pt-1">
                      "{rev.comment}"
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#6B705C] italic">No testimonials written for this product variant yet. Be the first to share your aura path!</p>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
