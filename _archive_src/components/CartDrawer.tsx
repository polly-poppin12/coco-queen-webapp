import React, { useState } from 'react';
import { X, Minus, Plus, Trash2, Tag, Gift, CreditCard, Lock, Sparkles, AlertCircle, ArrowRight, Smartphone, CheckCircle2, Wallet } from 'lucide-react';
import { CartItem, User, Promotion } from '../types';
import { formatTZS } from '../utils/money';

interface CartDrawerProps {
  onClose: () => void;
  cart: CartItem[];
  user: User | null;
  onUpdateQty: (productId: string, diff: number) => void;
  onRemove: (productId: string) => void;
  onCheckoutComplete: (orderData: any) => void;
  onOpenAuth: () => void;
}

export default function CartDrawer({
  onClose,
  cart,
  user,
  onUpdateQty,
  onRemove,
  onCheckoutComplete,
  onOpenAuth
}: CartDrawerProps) {
  // Coupon Code States
  const [promoCode, setPromoCode] = useState('');
  const [activePromo, setActivePromo] = useState<Promotion | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  // Loyaltypoints redemption
  const [redeemPoints, setRedeemPoints] = useState(false);

  // Address
  const [street, setStreet] = useState(user?.addresses?.[0]?.street || '');
  const [city, setCity] = useState(user?.addresses?.[0]?.city || '');
  const [state, setState] = useState(user?.addresses?.[0]?.state || '');
  const [postalCode, setPostalCode] = useState(user?.addresses?.[0]?.postalCode || '');
  const [country, setCountry] = useState(user?.addresses?.[0]?.country || 'Tanzania');

  // Checkout overlay states
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'mobile_money'>('cart');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Mobile Money States
  const [mobileOperator, setMobileOperator] = useState<'vodacom' | 'airtel'>('vodacom');
  const [countryCode, setCountryCode] = useState('+255');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pushSent, setPushSent] = useState(false);
  const [simulatedPin, setSimulatedPin] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Mathematical Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  
  let discountAmount = 0;
  if (activePromo) {
    if (!activePromo.minSpend || subtotal >= activePromo.minSpend) {
      discountAmount = Number((subtotal * (activePromo.discountPercent / 100)).toFixed(2));
    }
  }

  // Redeem 100 points = TZS 5,000. Max 50% discount value.
  let pointsToRedeem = 0;
  let pointsDiscountValue = 0;
  if (redeemPoints && user) {
    const pointsUserHas = user.loyaltyPoints || 0;
    const remainingToPay = subtotal - discountAmount;
    const maxDiscountAllowed = remainingToPay * 0.5; // up to 50% of basket
    const maxRedeemablePoints = Math.floor(maxDiscountAllowed / 5000) * 100;
    pointsToRedeem = Math.min(pointsUserHas, maxRedeemablePoints);
    pointsDiscountValue = (pointsToRedeem / 100) * 5000;
  }

  const finalTotal = Math.max(0, subtotal - discountAmount - pointsDiscountValue);

  const checkPromoCode = async () => {
    setPromoError('');
    setPromoSuccess('');
    if (!promoCode) return;

    try {
      const res = await fetch(`/api/promotions/check/${promoCode}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.minSpend && subtotal < data.minSpend) {
        throw new Error(`Minimum spend of ${formatTZS(data.minSpend)} required to use this coupon.`);
      }

      setActivePromo(data);
      setPromoSuccess(`Benefit Applied: ${data.description}`);
    } catch (err: any) {
      setPromoError(err.message || 'Coupon verification failed.');
      setActivePromo(null);
    }
  };

  const executeCheckout = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setCheckoutError('');
    setCheckoutLoading(true);

    try {
      const token = localStorage.getItem('aura_token');
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            isRecurring: item.isRecurring
          })),
          discountCode: activePromo?.code,
          redeemPoints,
          mobileMoney: {
            operator: mobileOperator,
            phone: `${countryCode}${phoneNumber}`
          },
          shippingAddress: {
            id: 'addr-ord',
            label: 'Order Shipping',
            street,
            city,
            state,
            postalCode,
            country
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onCheckoutComplete(data.order);
      setCheckoutStep('cart');
    } catch (err: any) {
      setCheckoutError(err.message || 'Checkout operation faulted.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#FDFCFB] border-l border-[#E5E5E5] shadow-2xl flex flex-col justify-between">
      
      {/* Header Block */}
      <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between bg-[#FDFCFB]">
        <div className="flex items-center space-x-2.5">
          <Gift className="w-5 h-5 text-[#6B705C]" />
          <h2 className="font-serif text-[15px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A]">
            {checkoutStep === 'cart' && 'Your Coco Queens Bag'}
            {checkoutStep === 'shipping' && 'Delivery Details'}
            {checkoutStep === 'mobile_money' && 'Mobile Money Gateway'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-[#999] hover:text-[#1A1A1A] hover:rotate-90 transition-all p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {checkoutError && (
        <div className="p-3.5 bg-red-50 text-red-950 border-l-2 border-red-700 text-xs font-semibold m-4 rounded-none flex items-center gap-1.5 font-sans">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* Main Drawer Body Area */}
      <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-[#FDFCFB]">

        {/* STEP 1: REVIEW THE SHOPPING BAG */}
        {checkoutStep === 'cart' && (
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-5">
                <Trash2 className="w-12 h-12 mx-auto text-[#A1A1A1] stroke-1" />
                <p className="font-serif italic text-sm text-[#4A4A4A]">Your organic shopping bag is entirely clear.</p>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-[0.25em] font-semibold hover:bg-[#2D2D2D] transition rounded-none"
                >
                  Discover Boutique Solutions
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div 
                    key={item.product.id}
                    className="p-3.5 bg-white border border-[#E5E5E5] flex items-center gap-4 transition hover:shadow-sm rounded-none font-sans"
                  >
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover border border-[#E5E5E5] rounded-none grayscale-[10%]"
                    />

                    <div className="flex-grow space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-serif text-sm font-medium text-[#1A1A1A] truncate max-w-[200px]">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemove(item.product.id)}
                          className="text-[#999] hover:text-red-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[10px] text-stone-500 flex flex-wrap gap-2 uppercase tracking-widest font-semibold">
                        <span>{item.product.category}</span>
                        {item.isRecurring && <span className="text-[#6B705C] font-bold bg-[#F5F2ED] px-1.5 py-0.5 border border-[#E5E5E5] rounded-none">Re-fill Plan</span>}
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        {/* Adjust qty */}
                        <div className="flex items-center border border-[#E5E5E5] bg-[#FDFCFB] px-1.5 py-0.5 rounded-none">
                          <button
                            onClick={() => onUpdateQty(item.product.id, -1)}
                            className="p-1 text-stone-500 hover:text-stone-900"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-mono font-bold text-[#1A1A1A]">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQty(item.product.id, 1)}
                            className="p-1 text-stone-500 hover:text-stone-900"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-serif text-xs font-bold text-[#1A1A1A]">
                          {formatTZS(item.product.price * item.quantity)}
                        </span>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SHIPPING PROTOCOLS */}
        {checkoutStep === 'shipping' && (
          <div className="space-y-4 font-sans">
            <h3 className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#1A1A1A] border-b border-[#E5E5E5] pb-2">
              Shipping Destination
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#6B705C] mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. Mikocheni Street"
                  className="w-full px-3 py-2.5 bg-white border border-[#E5E5E5] text-xs focus:outline-none focus:border-[#1A1A1A] rounded-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#6B705C] mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Dar es Salaam"
                    className="w-full px-3 py-2.5 bg-white border border-[#E5E5E5] text-xs focus:outline-none focus:border-[#1A1A1A] rounded-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#6B705C] mb-1">State / Province</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="CA"
                    className="w-full px-3 py-2.5 bg-white border border-[#E5E5E5] text-xs focus:outline-none focus:border-[#1A1A1A] rounded-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#6B705C] mb-1">Postal / ZIP Code</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="90210"
                    className="w-full px-3 py-2.5 bg-white border border-[#E5E5E5] text-xs focus:outline-none focus:border-[#1A1A1A] rounded-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#6B705C] mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Tanzania"
                    className="w-full px-3 py-2.5 bg-white border border-[#E5E5E5] text-xs focus:outline-none focus:border-[#1A1A1A] rounded-none font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-[#F5F2ED] rounded-none border border-[#E5E5E5] flex items-start gap-1.5 text-[11px] leading-relaxed text-[#4A4A4A] mt-5">
              <span className="font-bold text-[#1A1A1A] block">Dispatch Note:</span>
              <span>All luxury items are secured in organic handpicked linen bags during dispatch to prevent climate shocks on botanicals.</span>
            </div>
          </div>
        )}

        {/* STEP 3: SECURE MOBILE MONEY SPECIFICATIONS */}
        {checkoutStep === 'mobile_money' && (
          <div className="space-y-5 font-sans">
            <div className="p-4 bg-amber-50/50 rounded-none border border-amber-200/60 flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-[#6B705C] flex-shrink-0" />
              <div className="text-xs space-y-1 text-amber-950">
                <p className="font-bold uppercase tracking-[0.1em]">Instant Mobile Money Verification</p>
                <p className="leading-relaxed text-stone-700">Provide your mobile subscriber number. A secure STK Push request will register instantly on your device via [Vodacom M-Pesa] or [Airtel Money] servers.</p>
              </div>
            </div>

            {!pushSent ? (
              <div className="space-y-4">
                {/* Operator Selector */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-stone-600 mb-2">Select Operator</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileOperator('vodacom')}
                      className={`py-3.5 px-4 text-left border flex flex-col justify-between transition cursor-pointer rounded-none relative overflow-hidden ${
                        mobileOperator === 'vodacom'
                          ? 'border-red-600 bg-red-50/40 text-[#DC2626]'
                          : 'border-[#E5E5E5] bg-[#FDFCFB] text-stone-650 hover:border-stone-400'
                      }`}
                    >
                      <span className="font-bold text-xs uppercase tracking-wider">Vodacom</span>
                      <span className="text-[10px] uppercase tracking-normal opacity-75 font-mono">M-Pesa Gateway</span>
                      {mobileOperator === 'vodacom' && (
                        <div className="absolute right-2 top-2 bg-red-600 w-2 h-2 rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileOperator('airtel')}
                      className={`py-3.5 px-4 text-left border flex flex-col justify-between transition cursor-pointer rounded-none relative overflow-hidden ${
                        mobileOperator === 'airtel'
                          ? 'border-red-600 bg-red-50/40 text-red-700'
                          : 'border-[#E5E5E5] bg-[#FDFCFB] text-stone-650 hover:border-stone-400'
                      }`}
                    >
                      <span className="font-bold text-xs uppercase tracking-wider">Airtel</span>
                      <span className="text-[10px] uppercase tracking-normal opacity-75 font-mono">Airtel Money</span>
                      {mobileOperator === 'airtel' && (
                        <div className="absolute right-2 top-2 bg-red-700 w-2 h-2 rounded-full" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Country & Phone input */}
                <div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-stone-600 mb-1.5 font-sans">Country</label>
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full px-2.5 py-3 bg-white border border-[#E5E5E5] rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-bold font-mono"
                      >
                        <option value="+255">TZ (+255)</option>
                        <option value="+254">KE (+254)</option>
                        <option value="+256">UG (+256)</option>
                        <option value="+250">RW (+250)</option>
                      </select>
                    </div>
                    <div className="col-span-8">
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-stone-600 mb-1.5 font-sans">Mobile Wallet Number</label>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="712345678"
                        className="w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-none text-sm focus:outline-none font-mono focus:border-[#1A1A1A] tracking-wider"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#F5F2ED] border border-[#E5E5E5] text-center font-mono text-[11px] font-semibold text-stone-700 rounded-none">
                  Total Chargeable Balance: <span className="font-bold text-[#1A1A1A]">{formatTZS(finalTotal)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!phoneNumber || phoneNumber.length < 7) {
                      setCheckoutError('Please provide a valid subscriber wallet number.');
                    } else {
                      setCheckoutError('');
                      setPushSent(true);
                    }
                  }}
                  className="w-full py-4 bg-[#1A1A1A] text-white font-bold uppercase text-[10px] tracking-[0.25em] hover:bg-[#2D2D2D] transition rounded-none cursor-pointer text-center"
                >
                  Request Secure SIM Push Dialog
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Smartphone simulation */}
                <div className="border-[6px] border-[#1A1A1A] bg-[#121212] rounded-[24px] p-4 text-white font-sans max-w-sm mx-auto shadow-2xl relative overflow-hidden">
                  {/* Speaker bar */}
                  <div className="w-24 h-4 bg-[#1E1E1E] mx-auto rounded-full mb-3 flex items-center justify-center">
                    <div className="w-8 h-1 bg-[#333] rounded-full" />
                  </div>

                  <div className="space-y-4 py-2">
                    <p className="text-[10px] font-mono text-center text-[#999] tracking-widest uppercase">SIM Carrier Interactive Node</p>
                    
                    <div className="bg-white text-black p-4 rounded-xl shadow-lg space-y-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-stone-800">
                        <Wallet className="w-4 h-4 text-stone-600" />
                        <span className="font-bold uppercase tracking-wider text-[10px]">
                          {mobileOperator === 'vodacom' ? 'VODACOM M-PESA' : 'AIRTEL MONEY'}
                        </span>
                      </div>

                      <div className="space-y-1 block">
                        <p className="text-[11px] font-semibold text-stone-500">Secure Merchant Transaction</p>
                        <p className="text-xs font-bold text-[#1A1A1A]">Pay COCO QUEENS</p>
                        <p className="text-lg font-serif font-bold text-red-600">{formatTZS(finalTotal)}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] uppercase tracking-[0.1em] font-bold text-stone-500">Enter Your 4-Digit Wallet PIN</label>
                        <input
                          type="password"
                          placeholder="••••"
                          maxLength={4}
                          value={simulatedPin}
                          onChange={(e) => setSimulatedPin(e.target.value.replace(/\D/g, ''))}
                          className="w-24 text-center font-mono font-bold tracking-widest text-lg border-b border-stone-800 py-1 focus:outline-none focus:border-red-600 bg-transparent text-stone-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-bold uppercase tracking-widest">
                        <button
                          type="button"
                          onClick={() => {
                            setPushSent(false);
                            setSimulatedPin('');
                          }}
                          className="border border-stone-300 py-2 hover:bg-stone-50 rounded-lg text-stone-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={simulatedPin.length < 4 || isVerifyingPin}
                          onClick={async () => {
                            setIsVerifyingPin(true);
                            setCheckoutError('');
                            setTimeout(() => {
                              setIsVerifyingPin(false);
                              executeCheckout();
                            }, 1800);
                          }}
                          className="bg-stone-900 hover:bg-black text-white py-2 rounded-lg disabled:opacity-40"
                        >
                          {isVerifyingPin ? 'Processing PIN...' : 'Confirm'}
                        </button>
                      </div>

                    </div>

                    <p className="text-[9px] text-[#A1A1A1] text-center px-4 leading-relaxed font-semibold">
                      Please monitor your simulated device frame above to complete the standard mobile carrier authorization.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPushSent(false);
                    setSimulatedPin('');
                  }}
                  className="w-full text-center text-xs text-[#6B705C] hover:text-[#1A1A1A] underline font-semibold transition"
                >
                  Change phone number or carrier
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer calculations & button routes */}
      {cart.length > 0 && (
        <div className="p-6 border-t border-[#E5E5E5] bg-[#FDFCFB] space-y-4 font-sans">
          
          {/* STEP 1 DISCOUNTS & PROMOTIONS IN CART STEP ONLY */}
          {checkoutStep === 'cart' && (
            <div className="space-y-3 pt-1 bg-[#FDFCFB]">
              
              {/* Promo Code input */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-8 relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                    <Tag className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="DISCOUNT CODE"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="w-full pl-9 pr-2 py-2 bg-white border border-[#E5E5E5] text-xs focus:outline-none uppercase font-mono rounded-none focus:border-[#1A1A1A]"
                  />
                </div>
                <button
                  type="button"
                  onClick={checkPromoCode}
                  className="col-span-4 bg-[#1A1A1A] text-white hover:bg-black uppercase tracking-widest text-[9.5px] font-semibold py-2 transition rounded-none"
                >
                  Apply
                </button>
              </div>

              {promoSuccess && <p className="text-[10px] text-emerald-800 font-bold">{promoSuccess}</p>}
              {promoError && <p className="text-[10px] text-red-800 font-bold">{promoError}</p>}

              {/* Loyalty Point Redemption Option */}
              {user && user.loyaltyPoints > 0 && (
                <div className="p-3.5 bg-[#F5F2ED] border border-[#E5E5E5] rounded-none flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-bold text-[#1A1A1A] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                      Redeem Coco Points?
                    </p>
                    <p className="text-[#6B705C] font-semibold">You hold: {user.loyaltyPoints} points</p>
                  </div>
                  <input
                    type="checkbox"
                    id="redeem_points_check"
                    checked={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Pricing Ledger breakdown */}
          <div className="space-y-2.5 text-xs pb-2 border-b border-neutral-100 bg-[#FDFCFB]">
            <div className="flex justify-between text-[#4A4A4A]">
              <span>Cart Subtotal</span>
              <span className="font-mono">{formatTZS(subtotal)}</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Coco Queens Discount ({activePromo?.code})</span>
                <span className="font-mono">-{formatTZS(discountAmount)}</span>
              </div>
            )}

            {pointsToRedeem > 0 && (
              <div className="flex justify-between text-[#6B705C] font-semibold">
                <span>Coco Point Offset ({pointsToRedeem} pts)</span>
                <span className="font-mono">-{formatTZS(pointsDiscountValue)}</span>
              </div>
            )}

            <div className="flex justify-between text-[14px] font-bold text-[#1A1A1A] pt-1">
              <span>Final Total</span>
              <span className="font-serif">{formatTZS(finalTotal)}</span>
            </div>
          </div>

          {/* Checkout action button router */}
          {checkoutStep === 'cart' && (
            <button
              onClick={() => {
                if (!user) {
                  onOpenAuth();
                } else {
                  setCheckoutStep('shipping');
                }
              }}
              className="w-full py-4 bg-[#1A1A1A] text-white hover:bg-[#2D2D2D] tracking-[0.25em] uppercase font-bold text-[11px] transition flex items-center justify-center space-x-2 rounded-none"
            >
              <span>{user ? 'Proceed to Shipping' : 'Sign In to Checkout'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {checkoutStep === 'shipping' && (
            <div className="grid grid-cols-2 gap-3 bg-[#FDFCFB]">
              <button
                onClick={() => setCheckoutStep('cart')}
                className="py-3 border border-[#E5E5E5] text-[#1A1A1A] uppercase tracking-[0.18em] text-[10px] font-bold rounded-none hover:bg-neutral-50 transition"
              >
                Back To Bag
              </button>
              <button
                onClick={() => {
                  if (!street || !city) {
                    setCheckoutError('Please populate the shipping address coordinates correctly.');
                  } else {
                    setCheckoutStep('mobile_money');
                  }
                }}
                className="py-3 bg-[#1A1A1A] text-white text-[10px] uppercase font-bold tracking-[0.18em] hover:bg-[#2D2D2D] rounded-none transition"
              >
                Mobile Money Gateway
              </button>
            </div>
          )}

          {checkoutStep === 'mobile_money' && (
            <div className="grid grid-cols-2 gap-3 bg-[#FDFCFB]">
              <button
                onClick={() => {
                  setCheckoutStep('shipping');
                  setPushSent(false);
                  setSimulatedPin('');
                }}
                className="py-3 border border-[#E5E5E5] text-[#1A1A1A] uppercase tracking-[0.18em] text-[10px] font-bold rounded-none hover:bg-neutral-50"
              >
                Back To Details
              </button>
              <button
                onClick={() => {
                  if (!pushSent) {
                    if (!phoneNumber || phoneNumber.length < 7) {
                      setCheckoutError('Please provide a valid subscriber wallet number.');
                    } else {
                      setCheckoutError('');
                      setPushSent(true);
                    }
                  } else {
                    setCheckoutError("Please enter your 4-digit PIN inside the interactive device simulator above, and click 'Confirm'.");
                  }
                }}
                className="py-3 bg-amber-800 hover:bg-amber-900 text-white text-[10px] uppercase font-bold tracking-[0.18em] flex items-center justify-center space-x-2 shadow-sm rounded-none"
              >
                <span>{!pushSent ? 'Request SIM Push' : 'Confirm on Device'}</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
