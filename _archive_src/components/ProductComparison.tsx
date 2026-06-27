import React from 'react';
import { Layers, ShoppingBag, X, Check, Star } from 'lucide-react';
import { Product } from '../types';
import { formatTZS } from '../utils/money';

interface ProductComparisonProps {
  productsToCompare: Product[];
  onRemoveFromCompare: (id: string) => void;
  onAddToCart: (product: Product) => void;
  onClose: () => void;
}

export default function ProductComparison({
  productsToCompare,
  onRemoveFromCompare,
  onAddToCart,
  onClose
}: ProductComparisonProps) {
  return (
    <div className="bg-[#FDFCFB] p-6.5 border border-[#E5E5E5] max-w-5xl mx-auto my-12 rounded-none">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#E5E5E5] pb-5 mb-6">
        <div className="flex items-center space-x-2.5">
          <Layers className="w-5 h-5 text-[#6B705C]" />
          <h2 className="font-serif text-xl uppercase tracking-[0.18em] text-[#1A1A1A] font-light">
            Natural Ritual Comparison
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-[#6B705C] hover:text-[#1A1A1A] text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer"
        >
          Close Compare
        </button>
      </div>

      {productsToCompare.length === 0 ? (
        <div className="text-center py-12 space-y-3 font-sans">
          <Layers className="w-10 h-10 mx-auto text-stone-300 stroke-1" />
          <p className="text-sm text-[#6B705C] italic">No elixirs selected as candidates yet.</p>
          <p className="text-[10px] text-[#A8A29E] uppercase tracking-wider font-semibold">Touch the "Compare Profile" trigger on collection items to view side-by-side specs</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#F5F2ED]/55">
                <th className="p-4 font-bold text-[#1A1A1A] uppercase tracking-[0.2em] w-[20%] text-[10px]">Specification</th>
                {productsToCompare.map((prod) => (
                  <th key={prod.id} className="p-4 text-[#1A1A1A] relative w-[25%] border-l border-[#E5E5E5]">
                    <button
                      onClick={() => onRemoveFromCompare(prod.id)}
                      className="absolute top-2 right-2 text-stone-400 hover:text-[#1A1A1A] transition-colors cursor-pointer"
                      title="Remove variant"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="space-y-2 mt-4 text-center">
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-20 h-20 object-cover mx-auto rounded-none border border-[#E5E5E5]"
                      />
                      <span className="block font-serif text-[13px] font-bold tracking-wide truncate max-w-[150px] mx-auto text-[#1A1A1A]">{prod.name}</span>
                      <span className="inline-block text-[9px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 bg-[#F5F2ED] text-[#6B705C]">
                        {prod.category}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              
              {/* PRICE */}
              <tr>
                <td className="p-4 font-bold text-[#1A1A1A] uppercase tracking-[0.15em] text-[10px]">Retail Price</td>
                {productsToCompare.map((prod) => (
                  <td key={prod.id} className="p-4 font-serif text-sm font-semibold text-[#1A1A1A] border-l border-[#E5E5E5] text-center">
                    {formatTZS(prod.price)}
                  </td>
                ))}
              </tr>

              {/* RATING */}
              <tr>
                <td className="p-4 font-bold text-[#1A1A1A] uppercase tracking-[0.15em] text-[10px]">Seeker Rating</td>
                {productsToCompare.map((prod) => (
                  <td key={prod.id} className="p-4 border-l border-[#E5E5E5] text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Star className="w-3.5 h-3.5 fill-[#1A1A1A]/80 text-[#1A1A1A]/80" />
                      <span className="font-mono font-bold text-stone-850">{prod.rating}</span>
                      <span className="text-[#a8a29e]">({prod.reviews?.length || 0})</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* SKIN / HAIR TYPE */}
              <tr>
                <td className="p-4 font-bold text-[#1A1A1A] uppercase tracking-[0.15em] text-[10px]">Compatible Target</td>
                {productsToCompare.map((prod) => (
                  <td key={prod.id} className="p-4 border-l border-[#E5E5E5] text-center italic text-[#6B705C] font-semibold text-[11px]">
                    {prod.skinType || prod.hairType || 'All Organic Profiles'}
                  </td>
                ))}
              </tr>

              {/* ACTIVE BENEFITS */}
              <tr>
                <td className="p-4 font-bold text-[#1A1A1A] uppercase tracking-[0.15em] text-[10px]">Active Clinical Benefits</td>
                {productsToCompare.map((prod) => (
                  <td key={prod.id} className="p-4 border-l border-[#E5E5E5] text-[11.5px] leading-relaxed text-[#4A4A4A] font-medium">
                    {prod.benefits || 'High nutrition lipid restore.'}
                  </td>
                ))}
              </tr>

              {/* INGREDIENTS */}
              <tr>
                <td className="p-4 font-bold text-[#1A1A1A] uppercase tracking-[0.15em] text-[10px]">Raw Botanics Infused</td>
                {productsToCompare.map((prod) => (
                  <td key={prod.id} className="p-4 border-l border-[#E5E5E5] italic text-[11px] leading-relaxed text-[#6B705C] font-semibold">
                    {prod.ingredients}
                  </td>
                ))}
              </tr>

              {/* STOCK LEVELS */}
              <tr>
                <td className="p-4 font-bold text-[#1A1A1A] uppercase tracking-[0.15em] text-[10px]">Stock Seeding Status</td>
                {productsToCompare.map((prod) => (
                  <td key={prod.id} className="p-4 border-l border-[#E5E5E5] text-center font-bold uppercase tracking-wider text-[10px]">
                    {prod.stock > 0 ? (
                      <span className="text-emerald-800 flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Checked Safe ({prod.stock} left)
                      </span>
                    ) : (
                      <span className="text-red-700">In Recovery</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* CTA ADD */}
              <tr>
                <td className="p-4 font-bold text-[#1A1A1A] uppercase tracking-[0.15em] text-[10px]">Purchase Flow</td>
                {productsToCompare.map((prod) => (
                  <td key={prod.id} className="p-4 border-l border-[#E5E5E5] text-center">
                    <button
                      onClick={() => onAddToCart(prod)}
                      disabled={prod.stock === 0}
                      className="px-4 py-2 bg-[#1A1A1A] text-white text-[10px] uppercase font-bold tracking-[0.18em] hover:bg-[#2D2D2D] transition disabled:opacity-40 flex items-center justify-center gap-1 w-full rounded-none cursor-pointer"
                    >
                      <ShoppingBag className="w-3 h-3" /> Add To Bag
                    </button>
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}


