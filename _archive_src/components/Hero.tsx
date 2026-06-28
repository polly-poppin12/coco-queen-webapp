import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Crown, ShieldCheck, Sparkles } from 'lucide-react';

interface HeroProps {
  onShopClick: () => void;
  onBlogClick: () => void;
}

export default function Hero({ onShopClick, onBlogClick }: HeroProps) {
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 700], [0, 120]);
  const copyY = useTransform(scrollY, [0, 700], [0, -80]);
  const glowOpacity = useTransform(scrollY, [0, 450], [0.55, 0.15]);

  return (
    <section className="relative min-h-[calc(100vh-112px)] overflow-hidden bg-[#090604] text-[#FFF7E8]">
      <motion.img
        style={{ y: imageY }}
        src="/products/coco-queens-coconut-oil.png"
        alt="Coco Queens coconut oil bottles"
        className="absolute inset-0 h-[115%] w-full object-cover opacity-75"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,4,2,0.92),rgba(24,12,3,0.68)_44%,rgba(6,4,2,0.22))]" />
      <motion.div
        style={{ opacity: glowOpacity }}
        className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(circle_at_65%_65%,rgba(217,144,39,0.5),transparent_45%)]"
      />

      <motion.div
        style={{ y: copyY }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28"
      >
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 border border-[#D9B66F]/45 bg-black/25 px-4 py-2 backdrop-blur">
            <Crown className="h-4 w-4 text-[#D9B66F]" />
            <span className="text-[10px] uppercase tracking-[0.32em] font-bold text-[#F2D69A]">
              Pure coconut care for skin, hair and wellness
            </span>
          </div>

          <h1 className="font-serif text-[54px] sm:text-[78px] lg:text-[104px] leading-[0.88] font-semibold tracking-normal">
            Coco Queens
          </h1>

          <p className="max-w-xl text-sm sm:text-base leading-8 text-[#F6E6C9]">
            Crowned coconut oil, scrub, honey and essential oils, styled in the same warm gold, cream and deep marble tones as the product line.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              id="hero-shop-now-btn"
              onClick={onShopClick}
              className="inline-flex items-center justify-center gap-2 bg-[#D99027] px-9 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#170D05] hover:bg-[#F2C15C] transition-colors"
            >
              Shop Coco Queens
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              id="hero-read-blog-btn"
              onClick={onBlogClick}
              className="border border-[#F2D69A]/55 px-9 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFF7E8] hover:bg-[#FFF7E8] hover:text-[#170D05] transition-colors"
            >
              Ritual Notes
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl pt-8">
            {[
              ['Logo-led palette', 'gold, cream, coconut white'],
              ['Tanzania checkout', 'mobile money ready'],
              ['Secure accounts', 'verified login and protected orders']
            ].map(([title, copy], index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.12, duration: 0.7 }}
                className="border border-[#D9B66F]/30 bg-black/25 p-4 backdrop-blur"
              >
                <div className="mb-2 flex items-center gap-2 text-[#F2C15C]">
                  {index === 1 ? <Sparkles className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  <span className="text-[10px] uppercase tracking-[0.18em] font-bold">{title}</span>
                </div>
                <p className="text-xs text-[#E8D2AE]">{copy}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 z-10 h-20 bg-gradient-to-t from-[#120B05] to-transparent" />
    </section>
  );
}
