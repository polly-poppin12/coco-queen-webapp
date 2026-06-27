import React, { useState } from 'react';
import { X, Mail, Lock, User, Key, KeyRound, Sparkles, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: any, token: string) => void;
}

export default function AuthModal({ onClose, onLoginSuccess }: AuthModalProps) {
  // Modes: 'login' | 'register' | 'forgot' | 'verify'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'verify'>('login');
  
  // Registration and verification states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState('');
  const [simulatedResetToken, setSimulatedResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      onLoginSuccess(data.user, data.token);
      setSuccess('Access approved. Welcome to your luxury wellness portal.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, referralCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setSuccess(data.message);
      if (data.simulatedEmailVerificationCode) {
        setSimulatedCode(data.simulatedEmailVerificationCode);
        // Automatically pivot to verify mode
        setMode('verify');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setSuccess(data.message);
      setMode('login');
      // pre-fill credentials for login convenience
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Forgot request failed');

      setSuccess(data.message);
      if (data.simulatedToken) {
        setSimulatedResetToken(data.simulatedToken);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: simulatedResetToken, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');

      setSuccess(data.message);
      setMode('login');
      setNewPassword('');
      setSimulatedResetToken('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSimulate = (provider: string) => {
    resetMessages();
    setLoading(true);
    // Simulate secure demo social sign-in callback
    setTimeout(async () => {
      try {
        const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const demoPassword = `Demo-${crypto.randomUUID()}!`;
        const dummyEmail = `${provider.toLowerCase().replace(/\s/g, '')}-${uniqueId}@demo.cocoqueens.co.tz`;
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: dummyEmail, password: demoPassword, name: `Demo ${provider} Customer` })
        });
        await res.json();
        
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: dummyEmail, password: demoPassword })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.error);

        onLoginSuccess(loginData.user, loginData.token);
        setSuccess(`Demo login created for ${provider}.`);
        setTimeout(() => onClose(), 1000);
      } catch (err: any) {
        setError(err.message || 'Social routing faulted.');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#FDFCFB] border border-[#E5E5E5] shadow-2xl rounded-none py-10 px-8 transition-all overflow-hidden">
        
        {/* Subtle Decorative Organic Leaf Accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5F2ED]/50 rounded-bl-full pointer-events-none" />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6B705C] hover:text-[#1A1A1A] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Block */}
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl tracking-[0.2em] font-light text-[#1A1A1A] uppercase">
            {mode === 'login' && 'Enter The Circle'}
            {mode === 'register' && 'Cultivate Wellness'}
            {mode === 'forgot' && 'Reset Sanctuary'}
            {mode === 'verify' && 'Verify Identity'}
          </h2>
          <p className="text-[12px] text-[#6B705C] font-semibold italic mt-2.5">
            {mode === 'login' && 'Sign in to access premium botanical guides & loyalty perks'}
            {mode === 'register' && 'Create your Coco Queens account to unlock 50 complimentary points'}
            {mode === 'forgot' && 'Provide your organic account email for reset security'}
            {mode === 'verify' && 'An email containing verification details was simulated'}
          </p>
        </div>

        {/* Alert Logs */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-950 font-medium tracking-wide rounded-none">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-semibold tracking-wide rounded-none">
            {success}
          </div>
        )}

        {/* --- MULTI-MODE FORM ROUTER --- */}

        {/* 1. LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B705C]">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@cocoqueens.co.tz"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] tracking-wide rounded-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]">Password</label>
                <button 
                  type="button" 
                  onClick={() => { resetMessages(); setMode('forgot'); }}
                  className="text-[11px] font-bold uppercase tracking-wider text-[#6B705C] hover:text-[#1A1A1A] hover:underline"
                >
                  Forgot Sanctuary?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B705C]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] tracking-wide rounded-none"
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input 
                id="remember_me" 
                type="checkbox" 
                defaultChecked 
                className="w-4 h-4 text-[#1A1A1A] border-[#E5E5E5] rounded-none focus:ring-black bg-white" 
              />
              <label htmlFor="remember_me" className="ml-2.5 text-[12px] text-[#4A4A4A] font-semibold tracking-wide select-none">
                Keep session persistently sealed for 30 days
              </label>
            </div>

            <button
               id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1A1A1A] text-[#FDFCFB] text-[11px] uppercase tracking-[0.25em] font-bold hover:bg-[#2D2D2D] transition-colors disabled:opacity-50 rounded-none cursor-pointer"
            >
              {loading ? 'Entering Circle...' : 'Enter Sanctuary'}
            </button>
            
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#E5E5E5]"></div>
              <span className="flex-shrink mx-4 text-[10px] text-[#6B705C] uppercase tracking-[0.2em] font-semibold">Or social unlock</span>
              <div className="flex-grow border-t border-[#E5E5E5]"></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button 
                type="button" 
                onClick={() => handleSocialSimulate('Google')}
                className="border border-[#E5E5E5] py-2 text-xs hover:bg-[#F5F2ED] transition cursor-pointer font-bold uppercase tracking-widest text-[10px] text-[#1A1A1A] rounded-none"
              >
                Google
              </button>
              <button 
                type="button" 
                onClick={() => handleSocialSimulate('Apple')}
                className="border border-[#E5E5E5] py-2 text-xs hover:bg-[#F5F2ED] transition cursor-pointer font-bold uppercase tracking-widest text-[10px] text-[#1A1A1A] rounded-none"
              >
                Apple
              </button>
              <button 
                type="button" 
                onClick={() => handleSocialSimulate('Facebook')}
                className="border border-[#E5E5E5] py-2 text-xs hover:bg-[#F5F2ED] transition cursor-pointer font-bold uppercase tracking-widest text-[10px] text-[#1A1A1A] rounded-none"
              >
                Facebook
              </button>
            </div>

            <div className="text-center mt-6">
              <p className="text-[12px] text-[#4A4A4A] font-medium">
                New seeker to raw botanics?{' '}
                <button
                  type="button"
                  onClick={() => { resetMessages(); setMode('register'); }}
                  className="font-bold text-[#1A1A1A] underline hover:text-[#6B705C] transition cursor-pointer"
                >
                  Create Circle Account
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 2. REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-1.5">Your Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B705C]">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Cecilia Carter"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] tracking-wide rounded-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B705C]">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cecilia@nature.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] tracking-wide rounded-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-1.5">Secure Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B705C]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] tracking-wide rounded-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-1.5">Referral Code (Optional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B705C]">
                  <Sparkles className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="e.g. PRADA1000"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] tracking-wide uppercase rounded-none"
                />
              </div>
              <p className="text-[10px] text-[#6B705C] font-semibold italic mt-1.5">
                Applies an additional 25 complimentary welcome points.
              </p>
            </div>

            <button
               id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1A1A1A] text-[#FDFCFB] text-[11px] uppercase tracking-[0.25em] font-bold hover:bg-[#2D2D2D] transition-colors disabled:opacity-50 rounded-none cursor-pointer"
            >
              {loading ? 'Casting Circle Details...' : 'Register Secure Profile'}
            </button>

            <div className="text-center mt-6">
              <p className="text-[12px] text-[#4A4A4A] font-medium">
                Already initiated into wellness?{' '}
                <button
                  type="button"
                  onClick={() => { resetMessages(); setMode('login'); }}
                  className="font-bold text-[#1A1A1A] underline hover:text-[#6B705C] transition cursor-pointer"
                >
                  Sign In instead
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 3. EMAIL VERIFICATION */}
        {mode === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            {simulatedCode && (
              <div className="p-4 bg-[#F5F2ED] text-[#1A1A1A] space-y-2.5 border border-[#E5E5E5] rounded-none">
                <div className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-[#6B705C]">
                  <Sparkles className="w-3.5 h-3.5 text-[#6B705C]" />
                  Simulated OTP Mail Inbox
                </div>
                <p className="text-xs font-semibold leading-relaxed">Hello {name || 'Seeker'}, click below or manually insert code to unlock your profile securely:</p>
                <div className="text-center py-2">
                  <span className="font-mono text-lg font-bold tracking-[0.2em] text-[#1A1A1A] bg-white px-5 py-2 border border-[#E5E5E5] rounded-none">
                    {simulatedCode}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setVerificationCode(simulatedCode)}
                  className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A] border border-[#E5E5E5] bg-[#FDFCFB] py-2 cursor-pointer rounded-none hover:bg-[#F5F2ED] transition-colors"
                >
                  Quick Insert Code
                </button>
              </div>
            )}

            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-1.5">Enter Verification Code</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B705C]">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6 digit security code"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] tracking-widest text-center rounded-none"
                />
              </div>
            </div>

            <button
               id="verify-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1A1A1A] hover:bg-[#2D2D2D] text-white text-[11px] uppercase tracking-[0.25em] font-bold transition-colors rounded-none cursor-pointer"
            >
              {loading ? 'Checking Signature...' : 'Activate Unlocked Member Account'}
            </button>

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => setMode('login')} 
                className="text-xs font-semibold text-[#6B705C] hover:text-[#1A1A1A] hover:underline"
              >
                Return to Entry Gateway
              </button>
            </div>
          </form>
        )}

        {/* 4. SANCTUARY FORGOT SECURITY */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {!simulatedResetToken ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-1.5">Account Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@cocoqueens.co.tz"
                    className="w-full px-4 py-2.5 bg-white border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] rounded-none"
                  />
                </div>
                <button
                  id="forgot-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#1A1A1A] text-white text-[11px] uppercase tracking-[0.25em] font-bold transition hover:bg-[#2D2D2D] rounded-none cursor-pointer"
                >
                  {loading ? 'Searching Record Safes...' : 'Generate Secure Restorative Seal'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-4 bg-[#F5F2ED] border border-[#E5E5E5] text-xs text-stone-800 space-y-2 rounded-none">
                  <p className="font-bold text-[#161616] flex items-center gap-1">
                    <KeyRound className="w-4 h-4 text-[#6B705C]" />
                    Simulated Security Reset Token Found (Expires in 15 mins)
                  </p>
                  <p className="font-mono text-[11px] bg-white p-2.5 rounded-none truncate block border border-[#E5E5E5]">
                    {simulatedResetToken}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-1.5">New Secure Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-4 py-2.5 bg-white border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] rounded-none"
                  />
                </div>

                <button
                  id="reset-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#1A1A1A] text-white text-[11px] uppercase tracking-[0.25em] font-bold transition hover:bg-[#2D2D2D] rounded-none cursor-pointer"
                >
                  Set New Secure Core Password
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => { resetMessages(); setMode('login'); }}
                className="text-xs font-semibold text-[#6B705C] hover:text-[#1A1A1A] hover:underline"
              >
                Return to login
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

