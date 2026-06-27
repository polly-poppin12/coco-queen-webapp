import React from 'react';
import { motion } from 'motion/react';
import { Heart, Star, ShoppingBag, Eye, Layers } from 'lucide-react';
import { Product } from '../types';
import { formatTZS } from '../utils/money';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  onViewDetails: () => void;
  onAddToCart: () => void;
  onCompareToggle: () => void;
  isCompareChecked: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onViewDetails,
  onAddToCart,
  onCompareToggle,
  isCompareChecked
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 48, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, rotateX: 1.5, rotateY: -1.5 }}
      className="group relative bg-[#FFFDF8] border border-[#D9B66F]/35 overflow-hidden flex flex-col justify-between h-full shadow-[0_18px_60px_rgba(43,25,10,0.08)] transition-shadow duration-300"
    >
      
      {/* Aspect Ratio container */}
      <div className="relative aspect-square w-full bg-[#F5F2ED] overflow-hidden cursor-pointer animate-fade-in" onClick={onViewDetails}>
        
        {/* Hover overlay image stretch */}
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1800ms]"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#170d05]/15 via-transparent to-[#d99027]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        {/* Categories tags & custom indicators */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-15">
          <span className="bg-[#FDFCFB]/90 backdrop-blur-sm px-3 py-1 border border-[#E5E5E5] text-[9px] font-bold tracking-[0.25em] uppercase text-[#1A1A1A] rounded-none">
            {product.category}
          </span>
          {product.isRecurring && (
            <span className="bg-[#6B705C] text-white px-2.5 py-1 text-[8px] font-bold tracking-[0.2em] uppercase rounded-none">
              Auto-Replenish
            </span>
          )}
        </div>

        {/* Stock status indicator */}
        {product.stock <= 5 && (
          <span className="absolute bottom-3 left-3 bg-red-50 text-red-900 border border-red-200 px-2 py-1 text-[8px] font-bold tracking-widest uppercase rounded-none">
            {product.stock === 0 ? 'Out of Stock' : `Only ${product.stock} Left`}
          </span>
        )}

        {/* Action Panel hidden by default but sliding on hover */}
        <div className="absolute inset-0 bg-[#1A1A1A]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3 duration-300 z-10">
          
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            className="p-3 bg-[#FDFCFB] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FDFCFB] border border-[#E5E5E5] rounded-none shadow-sm transition-colors"
            title="View Product Ritual"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
            disabled={product.stock === 0}
            className="p-3 bg-[#FDFCFB] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FDFCFB] border border-[#E5E5E5] rounded-none shadow-sm transition-colors disabled:opacity-50"
            title="Add to Bag"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Product Information */}
      <div className="p-5 flex-grow flex flex-col justify-between space-y-4 bg-[#FDFCFB]">
        <div>
          {/* Compare check-box */}
          <div className="flex items-center justify-between">
            <button
              onClick={onCompareToggle}
              className={`flex items-center space-x-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold transition ${
                isCompareChecked ? 'text-[#6B705C]' : 'text-[#999] hover:text-[#1A1A1A]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isCompareChecked ? 'Added to Compare' : 'Compare Ritual'}</span>
            </button>

            {/* Heart Wishlist Toggle Button */}
            <button
              onClick={onToggleWishlist}
              className="text-[#999] hover:text-red-600 transition"
              title="Add to Wishlist"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-600 text-red-600' : ''}`} />
            </button>
          </div>

          <h3 
            onClick={onViewDetails}
            className="font-serif mt-2.5 text-[16px] font-medium tracking-wide text-[#1A1A1A] cursor-pointer hover:text-[#6B705C] transition truncate"
          >
            {product.name}
          </h3>

          {/* Rating visual */}
          <div className="flex items-center space-x-1.5 mt-1 text-xs">
            <div className="flex text-orange-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'fill-orange-400 text-orange-400' : 'text-stone-200'}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-[#999] font-mono">({product.reviews?.length || 0})</span>
          </div>

          {/* Skin / Hair specification */}
          {(product.skinType || product.hairType) && (
            <p className="text-[10px] uppercase tracking-[0.1em] text-[#6B705C] font-semibold italic mt-2.5 font-sans truncate">
              For {product.skinType || product.hairType}
            </p>
          )}
        </div>

        {/* Pricing tag & CTA trigger */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E5]">
          <span className="font-serif text-sm font-semibold text-[#1A1A1A]">
            {formatTZS(product.price)}
          </span>
          <button
            onClick={onAddToCart}
            disabled={product.stock === 0}
            className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#1A1A1A] hover:text-[#6B705C] transition disabled:opacity-30 disabled:hover:text-[#1A1A1A]"
          >
            {product.stock === 0 ? 'Sold Out' : 'Quick Bag'}
          </button>
        </div>

      </div>

    </motion.div>
  );
};

export default ProductCard;
