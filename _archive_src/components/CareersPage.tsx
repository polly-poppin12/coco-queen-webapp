import React, { useState } from 'react';
import { Briefcase, Sparkles, Send, CheckCircle2, User, Mail, FileText, ChevronRight } from 'lucide-react';
import { Career } from '../types';

export default function CareersPage() {
  const [selectedVac, setSelectedVac] = useState<Career | null>(null);
  
  // Application forms states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [experience, setExperience] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hardcoded luxurious positions
  const vacancies: Career[] = [
    {
      id: 'car-1',
      title: 'Luxury Retail & Wellness Concierge',
      department: 'Client Engagement / Retail Storefront',
      location: 'Dar es Salaam / Hybrid',
      description: 'Act as the primary interface of elegance. Introduce clients to organic botanics, analyze skin profiles delicately, customize client wellness agendas, and provide personalized scent-layering services.',
      requirements: [
        '3+ years experience with high hospitality or global luxury fashion/dermatology brands.',
        'Deep foundational appreciation for holistic, organic remedies and phytochemistry.',
        'Exemplary spoken eloquence, poise, and high emotional intelligence.'
      ]
    },
    {
      id: 'car-2',
      title: 'Senior Product Collection Lead',
      department: 'Research & Botanical Development',
      location: 'Seattle Eco-Lab',
      description: 'Oversee organic formulations, ensure maximum ingredient bio-compatibility, secure non-toxic source validation, lead botanical testing trials, and spearhead eco-friendly packaging experiments.',
      requirements: [
        'PhD or Masters in Phytochemistry, Cosmetic Chemistry, or related Organic Sciences.',
        'Extensive research background launching premium organic botanical products globally.',
        'Strict values regarding zero-waste, carbon-negative skincare aesthetics.'
      ]
    },
    {
      id: 'car-3',
      title: 'Wellness Editorial & content strategist',
      department: 'Brand Identity',
      location: 'New York Office / Remote',
      description: 'Draft evocative skincare copy, manage digital wellness logs and newsletters, outline chronobiology studies, and script beautiful cinematography outlines for Instagram/TikTok campaigns.',
      requirements: [
        'BA/MA in English literature, Journalism, or Creative Writing.',
        'Refined sense of typography, photography, and luxury editorial guidelines.',
        'Proven history writing for renowned luxury beauty publications.'
      ]
    }
  ];

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setName('');
      setEmail('');
      setExperience('');
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column: vacant listings */}
        <div className="lg:col-span-7 space-y-8">
          
          <div className="text-left space-y-2">
            <span className="text-[10px] bg-stone-200 text-stone-805 px-3 py-1 font-bold uppercase tracking-widest border border-stone-250">
              JOIN THE CIRCLE
            </span>
            <h1 className="font-serif text-3xl font-light tracking-wide text-stone-900 uppercase">
              Careers at Coco Queens
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed max-w-lg">
              We hold our phytochemistry and hospitality to the absolute peak of luxury standards. Join a highly cooperative, passionate, and scientifically rigorous team dedicated to restorative organic beauty.
            </p>
          </div>

          <div className="space-y-4">
            {vacancies.map((v) => (
              <div 
                key={v.id}
                onClick={() => { setSelectedVac(v); setSuccess(false); }}
                className={`p-5 bg-white border cursor-pointer transition flex items-center justify-between ${
                  selectedVac?.id === v.id ? 'border-[#1c1917] bg-[#faf9f6]/40 shadow' : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                <div className="space-y-1.5 text-left">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-teal-800 bg-teal-50 px-2 py-0.5 border border-teal-100">
                    {v.department}
                  </span>
                  <h3 className="font-serif text-lg font-semibold text-[#1c1917]">{v.title}</h3>
                  <p className="text-xs text-[#78716c]">{v.location}</p>
                </div>
                <ChevronRight className={`w-5 h-5 text-stone-400 transition-transform ${
                  selectedVac?.id === v.id ? 'rotate-90 text-[#1c1917]' : ''
                }`} />
              </div>
            ))}
          </div>

        </div>

        {/* Right Column: Candidate Application forms */}
        <div className="lg:col-span-5 bg-white border border-stone-200 p-6 shadow-sm">
          {selectedVac ? (
            <div className="space-y-6 text-left">
              
              {/* Position Specs */}
              <div className="space-y-2 border-b border-stone-200 pb-4">
                <p className="text-[10px] uppercase font-bold text-stone-500">Selected Candidate Vacancy</p>
                <h3 className="font-serif text-xl font-bold text-[#1c1917]">{selectedVac.title}</h3>
                <p className="text-xs text-stone-600 italic leading-relaxed">{selectedVac.description}</p>
              </div>

              {/* Requirements */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] uppercase font-bold tracking-widest text-[#292524]">Key Requirements:</h4>
                <ul className="space-y-1.5 text-xs text-stone-600 list-disc pl-4 leading-relaxed">
                  {selectedVac.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>

              {/* Secure App Form */}
              {success ? (
                <div className="p-5 bg-emerald-50 border border-emerald-250 font-sans text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-800" />
                  <h4 className="font-serif text-base font-semibold text-emerald-950 uppercase">Application Dispatch Safe</h4>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Hello {name || 'Seeker'}, your dossier has been compiled and catalogued. Coco Queens's leadership concierges typically audit applications within 4 business days.
                  </p>
                  <button
                    onClick={() => { setSuccess(false); }}
                    className="mt-2 text-xs font-semibold uppercase text-stone-850 underline hover:text-stone-950"
                  >
                    Apply for another position
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApply} className="space-y-4 text-xs">
                  <h4 className="text-[11px] uppercase font-bold tracking-widest text-[#1c1917]">Apply for this Position</h4>
                  
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-white border border-stone-250 text-xs focus:outline-none"
                        placeholder="Victoria Woods"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">Email Coordinates</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-white border border-stone-250 text-xs focus:outline-none"
                        placeholder="victoria@luxury.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">Coco Queens Statement of Purpose / Experience</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pt-2.5 text-stone-400 align-top">
                        <FileText className="w-4 h-4" />
                      </span>
                      <textarea
                        required
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        rows={3.5}
                        className="w-full pl-10 pr-3 py-2 bg-white border border-stone-250 text-xs focus:outline-none"
                        placeholder="Explain your passion for phytomedicine, luxury client Poise, or chemical formulation standards..."
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#292524] hover:bg-[#1c1917] text-white text-[11px] uppercase font-bold tracking-widest transition flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{loading ? 'Transmitting credentials...' : 'Transmit Dossier'}</span>
                  </button>
                </form>
              )}

            </div>
          ) : (
            <div className="text-center py-16 space-y-4 font-sans text-[#78716c]">
              <Briefcase className="w-10 h-10 mx-auto text-stone-300 stroke-1" />
              <p className="text-sm italic">No vacancy selected.</p>
              <p className="text-[11px] uppercase tracking-wider">Tap any job on the left list to review detailed qualifications and utilize the transmission portal</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

