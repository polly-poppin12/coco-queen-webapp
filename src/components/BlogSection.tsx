import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, ChevronRight, ArrowLeft, Hourglass, Calendar } from 'lucide-react';
import { Blog } from '../types';

export default function BlogSection() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);

  useEffect(() => {
    // Seed initial blogs representation
    const fetchBlogs = async () => {
      // In a real full stack environment, these are seeded on server startup
      // Let's call the standard products url to double-check, but fetch the blogs directly from simulated data
      setBlogs([
        {
          id: 'blog-1',
          title: 'The Art of Slow Skincare: Transitioning to Clean Botanical Lipids',
          summary: 'Explore why cellular structures respond beautifully to organic oils, and how to sequence your natural skincare ritual to cultivate absolute radiancy.',
          content: 'In our fast-paced modern spaces, skincare transforms into a race. However, skin structures thrive under soft, slower rhythms. Transitioning to clean botanical lipids like Rosehip, Bakuchiol, and Moringa Oil restores the skinâ€™s native microflora barrier. When molecules arenâ€™t constantly combatting harsh synthetic sulfates, artificial parabens, or heavy petroleum fillers, they optimize naturally. For an elite skincare ritual, we recommend implementing a three-step evening sequence: warm, sweep, and touch. First, prepare pores using a clean warm cloth. Next, sweep pollutants away using an eucalyptus active cleansing balm. Finally, press 3 drops of botanical oil deeply onto skin tissues under rhythmic breathing. Experience the luxury of intentional recovery.',
          category: 'Skincare',
          image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop',
          readTime: '4 min read',
          date: 'June 05, 2026'
        },
        {
          id: 'blog-2',
          title: 'Sacred Sleep Traditions & The Alkaline Altar of Blue Lotus',
          summary: 'Discover the ancient history of sensory calming in royal Egyptian chambers and how Blue Lotus alkaloids activate deeper restorative patterns.',
          content: 'True beauty originates from high-fidelity rest. Throughout archaeological excavations, blue lotus petals are catalogued in dynastic chambers. Ancient Egyptian apothecaries recognized Blue Lotus as an elite calming sedative. Compounds like nuciferine and apomorphine interact subtly with neurological receptors, relaxing muscle contractions and lowering cortisol production. Incorporating high-grade Blue Lotus tea into a night transition ritual signals the brain to release melatonin, generating lucid dreams and deep cellular repair phases. Prepare your sleep chamber as an altar of absolute silence.',
          category: 'Wellness Lifestyle',
          image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
          readTime: '6 min read',
          date: 'May 28, 2026'
        },
        {
          id: 'blog-3',
          title: 'Chronobiology & Skin Hydration: Aligning Rituals with Circadian Rhythms',
          summary: 'Why application time dictates skincare efficacy. How to leverage nighttime cellular repair peak windows to optimize hydration lipids.',
          content: 'The skin has its own internal biological clock. Between 11:00 PM and 2:00 AM, the skin enters its peak rejuvenation phase, during which cell division doubles and moisture losses intensify due to heat changes. Applying heavy botanical lipids directly preceding this window enables deep lipid replication, cushioning cellular walls against dehydration. Never waste premium serums during high-sun hours; instead, reserve your most concentrated botanical oils for pre-rest cycles to align with chronobiological peak repair windows.',
          category: 'Chronobiology',
          image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=800&auto=format&fit=crop',
          readTime: '5 min read',
          date: 'May 10, 2026'
        }
      ]);
    };
    fetchBlogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-[#FDFCFB]">
      
      {/* Return to blog view */}
      {selectedBlog ? (
        <div className="space-y-8 font-sans max-w-3xl mx-auto animate-fade-in bg-[#FDFCFB]">
          <button
            onClick={() => setSelectedBlog(null)}
            className="group flex items-center space-x-1.5 text-[10px] uppercase tracking-[0.25em] font-semibold text-[#4A4A4A] hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Return to Wellness Stories</span>
          </button>

          <div className="space-y-4">
            <span className="text-[10px] bg-[#F5F2ED] text-[#1A1A1A] px-3.5 py-1.5 font-bold uppercase tracking-[0.2em] border border-[#E5E5E5] rounded-none">
              {selectedBlog.category}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-light text-stone-900 leading-tight">
              {selectedBlog.title}
            </h1>
            <div className="flex items-center space-x-4 text-xs text-[#6B705C] font-semibold border-y border-[#E5E5E5] py-3.5 italic">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {selectedBlog.date}</span>
              <span className="flex items-center gap-1"><Hourglass className="w-3.5 h-3.5" /> {selectedBlog.readTime}</span>
            </div>
          </div>

          <div className="w-full aspect-video bg-[#F5F2ED] overflow-hidden border border-[#E5E5E5] rounded-none">
            <img
              src={selectedBlog.image}
              alt={selectedBlog.title}
              className="w-full h-full object-cover grayscale-[10%]"
            />
          </div>

          <div className="text-[14.5px] text-[#4A4A4A] leading-relaxed space-y-5 font-sans text-left">
            {selectedBlog.content.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-12 bg-[#FDFCFB]">
          
          {/* Header */}
          <div className="text-center space-y-3.5 max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-[#6B705C]">
              <BookOpen className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-[0.25em]">Botanical Collection Logs</span>
            </div>
            <h2 className="font-serif text-3xl font-light uppercase tracking-[0.15em] text-stone-950">
              Wellness Stories
            </h2>
            <p className="text-xs text-[#6B705C] leading-relaxed font-semibold italic">
              Explore scientific phytic insights, clean formulations guides, and ancient sensory calming rituals written by Coco Queens's dermatological concierges.
            </p>
          </div>

          {/* Blogs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogs.map((b) => (
              <div 
                key={b.id} 
                className="group bg-[#FDFCFB] border border-[#E5E5E5] overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-350 rounded-none"
              >
                <div 
                  className="aspect-video bg-[#F5F2ED] overflow-hidden cursor-pointer relative rounded-none" 
                  onClick={() => setSelectedBlog(b)}
                >
                  <img
                    src={b.image}
                    alt={b.title}
                    className="w-full h-full object-cover grayscale-[10%] group-hover:scale-103 transition-transform duration-1000"
                  />
                  <span className="absolute top-3 left-3 bg-[#FDFCFB]/95 px-3 py-1 border border-[#E5E5E5] text-[9px] font-bold uppercase tracking-[0.25em] text-[#1A1A1A] rounded-none">
                    {b.category}
                  </span>
                </div>

                <div className="p-5 flex-grow flex flex-col justify-between space-y-4 bg-[#FDFCFB]">
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-mono text-[#6B705C] flex items-center gap-1.5 font-bold uppercase tracking-[0.15em]">
                      <span>{b.date}</span> â€¢ <span>{b.readTime}</span>
                    </p>
                    <h3 
                      onClick={() => setSelectedBlog(b)}
                      className="font-serif text-[17px] font-medium text-[#1A1A1A] hover:text-[#6B705C] transition cursor-pointer leading-snug line-clamp-2"
                    >
                      {b.title}
                    </h3>
                    <p className="text-xs text-[#4A4A4A] leading-relaxed line-clamp-3">
                      {b.summary}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedBlog(b)}
                    className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#1A1A1A] hover:text-[#6B705C] transition flex items-center gap-1 group/btn"
                  >
                    <span>Read Story</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}

