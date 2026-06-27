import React, { useState } from 'react';
import { Award, Sparkles, Share2, Copy, Check, Users, ShieldAlert } from 'lucide-react';
import { User } from '../types';
import { formatTZS } from '../utils/money';

interface LoyaltyProgramProps {
  user: User | null;
  onOpenAuth: () => void;
}

export default function LoyaltyProgram({ user, onOpenAuth }: LoyaltyProgramProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#FDFCFB] text-[#1A1A1A] p-6.5 border border-[#E5E5E5] max-w-4xl mx-auto my-12 rounded-none">
      
      {/* Title */}
      <div className="text-center md:text-left border-b border-[#E5E5E5] pb-6 mb-6">
        <div className="flex items-center justify-center md:justify-start gap-2.5">
          <Award className="w-5 h-5 text-[#6B705C]" />
          <h2 className="font-serif text-2xl font-light uppercase tracking-[0.18em] text-[#1A1A1A]">
            The Coco Queens Loyalty Circle
          </h2>
        </div>
        <p className="text-[#6B705C] text-[10px] tracking-[0.2em] font-bold uppercase mt-1.5">Our royalty tier program designed for organic beauty seekers</p>
      </div>

      {!user ? (
        <div className="text-center py-10 space-y-4 max-w-md mx-auto">
          <ShieldAlert className="w-12 h-12 mx-auto text-stone-400 stroke-1" />
          <p className="font-serif italic text-xs text-[#6B705C] leading-relaxed">
            Access to our royal rewards structure is limited to circle members. Register a free account to automatically acquire 50 Welcome Points.
          </p>
          <button
            onClick={onOpenAuth}
            className="px-8 py-3 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-[#2D2D2D] transition-colors rounded-none cursor-pointer"
          >
            Create / Sign In
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 font-sans">
          
          {/* Points display card */}
          <div className="md:col-span-4 bg-[#FDFCFB] border border-[#E5E5E5] p-6 text-center space-y-4 flex flex-col justify-center items-center rounded-none shadow-sm">
            <Sparkles className="w-8 h-8 text-[#6B705C] animate-pulse" />
            
            <div className="space-y-1">
              <p className="text-[9px] text-[#6B705C] uppercase tracking-[0.2em] font-bold">Your Balance</p>
              <h3 className="font-serif text-4xl font-bold text-[#1A1A1A]">
                {user.loyaltyPoints}
              </h3>
              <p className="text-xs text-[#6B705C] font-semibold italic">Coco points active</p>
            </div>

            <div className="p-3 bg-[#F5F2ED] rounded-none border border-[#E5E5E5] text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#1A1A1A]">
              Equivalent Value: <span className="text-[#6B705C] font-extrabold">{formatTZS(((user.loyaltyPoints || 0) / 100 * 5000))}</span> reduction
            </div>
          </div>

          {/* Core Rewards details columns */}
          <div className="md:col-span-8 space-y-6">
            
            <div className="space-y-3.5">
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]">How to acquire points</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-[#4A4A4A]">
                <div className="p-3.5 border border-[#E5E5E5] bg-white space-y-1 rounded-none">
                  <span className="font-bold text-[#6B705C] uppercase tracking-[0.1em] text-[10px] block">50 welcome points</span>
                  <p className="text-[11px] font-semibold text-stone-500">Given instantly upon secure email verification.</p>
                </div>
                <div className="p-3.5 border border-[#E5E5E5] bg-white space-y-1 rounded-none">
                  <span className="font-bold text-[#6B705C] uppercase tracking-[0.1em] text-[10px] block">1 point per TZS 1,000 spent</span>
                  <p className="text-[11px] font-semibold text-stone-500">Earned automatically across all published apotherapy elixirs.</p>
                </div>
                <div className="p-3.5 border border-[#E5E5E5] bg-white space-y-1 rounded-none">
                  <span className="font-bold text-[#6B705C] uppercase tracking-[0.1em] text-[10px] block">20 review points</span>
                  <p className="text-[11px] font-semibold text-stone-500">Earned for every premium skincare experience post published.</p>
                </div>
                <div className="p-3.5 border border-[#E5E5E5] bg-white space-y-1 rounded-none">
                  <span className="font-bold text-[#6B705C] uppercase tracking-[0.1em] text-[10px] block">100 referral points</span>
                  <p className="text-[11px] font-semibold text-stone-500">Earned when a friend completes their first checkout order.</p>
                </div>
              </div>
            </div>

            {/* Referral engine code block */}
            <div className="p-5 border border-dashed border-[#6B705C] bg-[#F5F2ED]/30 space-y-4 rounded-none">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#6B705C]" />
                <h5 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]">Refer Your Circle</h5>
              </div>

              <p className="text-xs text-[#4A4A4A] leading-relaxed font-semibold italic">
                Gift your companions a serene path. Share your personal code below: They get <strong className="text-[#1A1A1A]">25 Welcome points</strong> instantly, and you get <strong className="text-[#1A1A1A]">100 points</strong> when they complete their first checkout ritual.
              </p>

              <div className="flex bg-white border border-[#E5E5E5] p-1 justify-between items-center rounded-none max-w-sm">
                <span className="px-3.5 font-mono text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">{user.referralCode}</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-white text-[9.5px] uppercase tracking-widest hover:bg-[#2D2D2D] font-bold transition rounded-none cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}


