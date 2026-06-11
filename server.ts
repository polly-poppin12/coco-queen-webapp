import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data.json');

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'"
  );
  next();
});
app.use(express.json({ limit: '100kb' }));

// --- SECURITY HELPER FOR PASSWORDS ---
function hashPassword(password: string, saltInput?: string) {
  const salt = saltInput || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// Simple Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 100;
}

// XSS Sanitizer for basic strings to prevent injections
function sanitizeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// --- INITIALIZE PERSISTENT DB ---
interface DbSchema {
  users: any[];
  sessions: any[];
  products: any[];
  orders: any[];
  promotions: any[];
  blogs: any[];
  careers: any[];
  resetTokens: any[];
  verificationCodes: any[];
  auditLogs: any[];
}

function loadDb(): DbSchema {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData: DbSchema = {
      users: [],
      sessions: [],
      products: [],
      orders: [],
      promotions: [],
      blogs: [],
      careers: [],
      resetTokens: [],
      verificationCodes: [],
      auditLogs: []
    };
    saveDb(defaultData);
    seedInitialData();
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading DB, resetting', error);
    return {
      users: [],
      sessions: [],
      products: [],
      orders: [],
      promotions: [],
      blogs: [],
      careers: [],
      resetTokens: [],
      verificationCodes: [],
      auditLogs: []
    };
  }
}

function saveDb(data: DbSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// --- RATE LIMITER STORE ---
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests = 10, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const limit = rateLimits.get(key);

  if (!limit) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > limit.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

// --- AUDIT LOGGER ---
function logAuditAction(userId: string, userEmail: string, action: string, details: string) {
  const db = loadDb();
  db.auditLogs.push({
    id: crypto.randomUUID(),
    userId,
    userEmail,
    action,
    details,
    timestamp: new Date().toISOString()
  });
  saveDb(db);
}

// --- DATABASE SEEDING ---
function seedInitialData() {
  const db = loadDb();

  // Create admin/owners
  const ownerPass = hashPassword(process.env.OWNER_BOOTSTRAP_PASSWORD || crypto.randomBytes(18).toString('base64url'));
  const adminPass = hashPassword(process.env.ADMIN_BOOTSTRAP_PASSWORD || crypto.randomBytes(18).toString('base64url'));

  const defaultUsers = [
    {
      id: crypto.randomUUID(),
      email: 'owner@wellness.com',
      name: 'Victoria Prada',
      passwordHash: ownerPass.hash,
      passwordSalt: ownerPass.salt,
      role: 'owner',
      isVerified: true,
      loyaltyPoints: 1000,
      referralCode: 'PRADA1000',
      addresses: [],
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      email: 'admin@wellness.com',
      name: 'Julius Wellness',
      passwordHash: adminPass.hash,
      passwordSalt: adminPass.salt,
      role: 'admin',
      isVerified: true,
      loyaltyPoints: 500,
      referralCode: 'JULIUS99',
      addresses: [],
      createdAt: new Date().toISOString()
    },
    // Bootstrap current developer email from runtime
    {
      id: crypto.randomUUID(),
      email: 'cliffordkimaro12@gmail.com',
      name: 'Clifford Kimaro',
      passwordHash: ownerPass.hash,
      passwordSalt: ownerPass.salt,
      role: 'owner',
      isVerified: true,
      loyaltyPoints: 1000,
      referralCode: 'CLIFFORD10',
      addresses: [
        {
          id: crypto.randomUUID(),
          label: 'Default Shipping',
          street: '12 Luxury Wellness Blvd',
          city: 'Beverly Hills',
          state: 'CA',
          postalCode: '90210',
          country: 'Tanzania'
        }
      ],
      createdAt: new Date().toISOString()
    }
  ];

  // Feed users if empty
  if (db.users.length === 0) {
    db.users = defaultUsers;
  }

  // Seed Products
  const seedProducts = [
    {
      id: 'prod-1',
      name: 'Coco Queens Extra Virgin Coconut Oil',
      description: 'A clear, lightweight coconut oil for daily skin glow, hair shine, scalp comfort and total wellness rituals.',
      ingredients: 'Pure extra virgin coconut oil, cold-pressed coconut extract.',
      benefits: 'Softens dry skin, seals hair moisture, supports scalp massage, adds natural gloss and leaves a clean tropical finish.',
      usage: 'Warm a few drops in your palms. Massage into skin, hair ends or scalp after bathing, then let the oil absorb before styling or dressing.',
      category: 'Oil',
      price: 10000,
      images: ['/products/coco-queens-coconut-oil.jpg'],
      stock: 45,
      rating: 4.8,
      reviews: [
        {
          id: 'rev-1',
          userId: 'usr-sample',
          userName: 'Amina Joseph',
          rating: 5,
          comment: 'Light, clean and perfect after showering. My hair ends feel much softer.',
          date: '2026-05-18T14:22:00Z'
        }
      ],
      status: 'Published',
      skinType: 'Dry skin / Hair shine / Scalp care',
      isRecurring: true
    },
    {
      id: 'prod-2',
      name: 'Coco Queens Exfoliating Coconut Scrub',
      description: 'A creamy coconut scrub made for polished skin, soft touch and a brighter looking body-care ritual.',
      ingredients: 'Coconut exfoliant, coconut oil, skin-softening botanical emollients, gentle aromatic notes.',
      benefits: 'Buffs dull surface buildup, smooths rough elbows and knees, prepares skin for oil, and supports an even-looking glow.',
      usage: 'Massage onto damp skin in slow circles two or three times per week. Rinse well, pat dry and follow with Coco Queens coconut oil.',
      category: 'Scrub',
      price: 30000,
      images: ['/products/coco-queens-scrub.jpg'],
      stock: 60,
      rating: 4.9,
      reviews: [],
      status: 'Published',
      skinType: 'Body polish / Dull skin / Rough texture',
      isRecurring: false
    },
    {
      id: 'prod-3',
      name: 'Coco Queens Pure Raw Honey',
      description: 'Golden raw honey for glow rituals, softening masks and natural wellness routines.',
      ingredients: 'Pure raw honey.',
      benefits: 'Helps skin feel supple, supports a dewy mask ritual, comforts dry-looking areas and brings a warm golden finish to self-care.',
      usage: 'For skin, apply a thin layer as a short mask and rinse gently. For wellness use, add a spoon to warm drinks as preferred.',
      category: 'Honey',
      price: 22000,
      images: ['/products/coco-queens-honey.jpg'],
      stock: 30,
      rating: 4.7,
      reviews: [],
      status: 'Published',
      isRecurring: true
    },
    {
      id: 'prod-4',
      name: 'Coco Queens Essential Oils',
      description: 'A warm aromatic oil ritual for calm evenings, body massage and beautifully scented care moments.',
      ingredients: 'Coconut oil base, essential oil blend, aromatic botanical notes.',
      benefits: 'Adds a soft scent to body care, supports calming massage, refreshes dry areas and turns ordinary routines into a spa-like ritual.',
      usage: 'Use a small amount on pulse points or blend a few drops into massage oil. Avoid eyes and patch test before first use.',
      category: 'Essential Oils',
      price: 18000,
      images: ['/products/coco-queens-essential-oil.jpg'],
      stock: 120,
      rating: 5.0,
      reviews: [],
      status: 'Published',
      isRecurring: true
    }
  ];

  db.products = seedProducts;
  // Seed Promotions
  const seedPromotions = [
    { code: 'COCO10', discountPercent: 10, description: '10% off your Coco Queens ritual', expiresAt: '2028-12-31' },
    { code: 'QUEEN20', discountPercent: 20, description: '20% off orders above TZS 70,000', minSpend: 70000, expiresAt: '2028-12-31' },
    { code: 'GLOW15', discountPercent: 15, description: '15% off golden glow essentials', expiresAt: '2028-12-31' }
  ];

  if (db.promotions.length === 0) {
    db.promotions = seedPromotions;
  }

  // Seed Blogs
  const seedBlogs = [
    {
      id: 'blog-1',
      title: 'The Art of Slow Skincare: Transitioning to Clean Botanical Lipids',
      summary: 'Explore why cellular structures respond beautifully to organic oils, and how to sequence your natural skincare ritual to cultivate absolute radiancy.',
      content: 'In our fast-paced modern spaces, skincare transforms into a race. However, skin cells thrive under soft rhythms. Transitioning to clean botanical lipids like Rosehip, Bakuchiol, and Moringa Oil restores the skinâ€™s native microflora barrier. When molecules arenâ€™t constantly combatting harsh synthetic sulfates or artificial parabens, they optimize naturally. We recommend implementing a three-step evening sequence: warm, sweep, and touch. First, prepare pores using a clean warm cloth. Next, sweep pollutants away using an eucalyptus active cleansing balm. Finally, press 3 drops of botanical oil deeply onto skin tissues under rhythmic breathing. Experience the luxury of intentional recovery.',
      category: 'Skincare',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop',
      readTime: '4 min read',
      date: 'June 05, 2026'
    },
    {
      id: 'blog-2',
      title: 'Sacred Sleep Traditions & The Alkaline Altar of Blue Lotus',
      summary: 'Discover the ancient history of sensory calming in royal Egyptian chambers and how Blue Lotus alkaloids activate deeper restorative patterns.',
      content: 'True beauty originates from high-fidelity rest. Throughout archaeological excavations, blue lotus petals are catalogued in dynastic chambers. Ancient Egyptian apothecaries recognized Blue Lotus as an elite calming sedative. Compounds like nuciferine and apomorphine interact subtly with neurological receptors, relaxing muscle contractions and lowering cortisol production. Incorporating high-grade Blue Lotus tea into a night transition ritual signals the brain to release melatonin, generating lucid dreams and cellular repair phases. Prepare your sleep chamber as an altar of silence.',
      category: 'Wellness Lifestyle',
      image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
      readTime: '6 min read',
      date: 'May 28, 2026'
    }
  ];

  if (db.blogs.length === 0) {
    db.blogs = seedBlogs;
  }

  // Seed Careers
  const seedCareers = [
    {
      id: 'car-1',
      title: 'Luxury Retail & Wellness Concierge',
      department: 'Client Engagement',
      location: 'Beverly Hills Suite / Hybrid',
      description: 'Act as the primary interface of elegance. Introduce clients to organic botanics, analyze skin profiles delicately, and customize wellness agendas.',
      requirements: [
        '3+ years experience with luxury hospitality or skincare brands.',
        'Deep foundational appreciation for holistic, organic remedies and botanical formulations.',
        'Exemplary spoken eloquence and high emotional intelligence.'
      ]
    },
    {
      id: 'car-2',
      title: 'Senior Product Apothecary Lead',
      department: 'Research & Botanical Development',
      location: 'Seattle Eco-Lab',
      description: 'Oversee organic formulations, ensure maximum ingredient bio-compatibility, secure non-toxic source validation, and lead scientific skincare trials.',
      requirements: [
        'Masters or PhD in Phytochemistry, Cosmetic Chemistry, or related Organic Sciences.',
        'Extensive portfolio launching premium organic botanical products globally.',
        'A passionate standard for zero-waste packaging aesthetics.'
      ]
    }
  ];

  if (db.careers.length === 0) {
    db.careers = seedCareers;
  }

  saveDb(db);
}

// Ensure seeded on startup
seedInitialData();

// --- SECURITY MIDDLEWARE & CONTEXT ---
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'customer' | 'admin' | 'owner';
    isVerified: boolean;
    loyaltyPoints: number;
    referralCode: string;
  };
}

// Authentication interceptor
const authenticateUser = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['authorization']?.startsWith('Bearer ')
    ? req.headers['authorization'].slice('Bearer '.length)
    : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const db = loadDb();
  const session = db.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Associated user account not found.' });
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
    loyaltyPoints: user.loyaltyPoints || 0,
    referralCode: user.referralCode
  };
  next();
};

// RBAC: Admin gate
const requireAdmin = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
};

// RBAC: Owner gate
const requireOwner = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied. Owner privileges required.' });
  }
  next();
};

// --- AUTHENTICATION ROUTES ---

// Rate Limit registers and logins to avoid brute-forcing
app.post('/api/auth/register', (req, res) => {
  const ip = req.ip || 'unknown-ip';
  if (!checkRateLimit(`register-${ip}`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many registration requests. Please wait 15 minutes.' });
  }

  const { email, password, name, referralCode } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields (email, password, name) are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'A valid email format is required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must incorporate at least 8 characters for safety.' });
  }

  const db = loadDb();
  const existingUser = db.users.find(u => u.email === cleanEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const { hash, salt } = hashPassword(password);
  const newUserId = crypto.randomUUID();
  const myReferralCode = 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  // Loyalty rewards - 50 points on signup
  let initialLoyalty = 50;
  let refferredByUserId: string | undefined;

  if (referralCode) {
    const referrer = db.users.find(u => u.referralCode === referralCode.trim());
    if (referrer) {
      initialLoyalty += 25; // Bonus for being referred
      refferredByUserId = referrer.id;
    }
  }

  const newUser = {
    id: newUserId,
    email: cleanEmail,
    name: sanitizeString(name),
    passwordHash: hash,
    passwordSalt: salt,
    role: 'customer',
    isVerified: false,
    loyaltyPoints: initialLoyalty,
    referralCode: myReferralCode,
    referredBy: refferredByUserId,
    addresses: [],
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // Generate Email Verification Code (Simulation)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  db.verificationCodes.push({
    id: crypto.randomUUID(),
    userId: newUserId,
    code,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
  });

  saveDb(db);

  // Send back registration status and simulation details
  res.status(201).json({
    message: 'Account crafted successfully. Verify your email to activate all benefits.',
    simulatedEmailVerificationCode: code,
    email: cleanEmail
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  
  // Rate limiting against brute force based on email
  if (!checkRateLimit(`login-${cleanEmail}`, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many failed login attempts. Please try again in 10 minutes.' });
  }

  const db = loadDb();
  const user = db.users.find(u => u.email === cleanEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password combination.' });
  }

  // Hash check
  const checkHash = hashPassword(password, user.passwordSalt);
  if (checkHash.hash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password combination.' });
  }

  // Create active session
  const token = crypto.randomUUID() + crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  db.sessions.push({
    id: crypto.randomUUID(),
    userId: user.id,
    token,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  });

  saveDb(db);

  res.json({
    message: 'Access granted.',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      loyaltyPoints: user.loyaltyPoints || 0,
      referralCode: user.referralCode,
      addresses: user.addresses || []
    }
  });
});

app.post('/api/auth/verify-email', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and digital verification code are mandatory.' });
  }

  const db = loadDb();
  const cleanEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email === cleanEmail);
  if (!user) {
    return res.status(400).json({ error: 'User not encountered.' });
  }

  const now = new Date();
  const index = db.verificationCodes.findIndex(v => v.userId === user.id && v.code === code.trim() && new Date(v.expiresAt) > now);

  if (index === -1) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  // Mark verified
  user.isVerified = true;
  db.verificationCodes.splice(index, 1); // remove code
  saveDb(db);

  res.json({ message: 'Email address verified successfully. Loyalty point account unlocked.' });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Target email is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!checkRateLimit(`reset-${cleanEmail}`, 3, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Verification requests flooded. Please retry in 15 minutes.' });
  }

  const db = loadDb();
  const user = db.users.find(u => u.email === cleanEmail);
  if (!user) {
    // Standard secure procedure: mock success even if not found to avoid account harvesting
    return res.json({
      message: 'If your email is on file, a password reset link has been simulated below.',
      simulatedToken: null
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

  db.resetTokens.push({
    id: crypto.randomUUID(),
    userId: user.id,
    token: resetToken,
    expiresAt
  });

  saveDb(db);

  res.json({
    message: 'If your email is on file, a password reset token has been generated below.',
    simulatedToken: resetToken,
    expiresAt
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'All reset criteria are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must incorporate at least 8 characters.' });
  }

  const db = loadDb();
  const now = new Date();
  const entryIndex = db.resetTokens.findIndex(r => r.token === token && new Date(r.expiresAt) > now);

  if (entryIndex === -1) {
    return res.status(400).json({ error: 'Reset link has expired or is invalid.' });
  }

  const entry = db.resetTokens[entryIndex];
  const user = db.users.find(u => u.id === entry.userId);

  if (!user) {
    return res.status(400).json({ error: 'User does not exist inside repository.' });
  }

  // Set new password
  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;

  // Clean sessions & tokens
  db.sessions = db.sessions.filter(s => s.userId !== user.id);
  db.resetTokens.splice(entryIndex, 1);

  saveDb(db);

  res.json({ message: 'Password securely changed. Sign in using your new credentials.' });
});

// --- CLIENT PROFILE DETAILS ---
app.get('/api/profile', authenticateUser, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Profile not found.' });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
    loyaltyPoints: user.loyaltyPoints || 0,
    referralCode: user.referralCode,
    addresses: user.addresses || []
  });
});

app.put('/api/profile', authenticateUser, (req: AuthenticatedRequest, res) => {
  const { name, addresses } = req.body;
  const db = loadDb();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'User record absent.' });

  if (name) user.name = sanitizeString(name);
  if (addresses && Array.isArray(addresses)) {
    user.addresses = addresses.map((addr: any) => ({
      id: addr.id || crypto.randomUUID(),
      label: sanitizeString(addr.label || 'Home'),
      street: sanitizeString(addr.street || ''),
      city: sanitizeString(addr.city || ''),
      state: sanitizeString(addr.state || ''),
      postalCode: sanitizeString(addr.postalCode || ''),
      country: sanitizeString(addr.country || 'United States')
    }));
  }

  saveDb(db);
  res.json({
    message: 'Profile details refined successfully.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      loyaltyPoints: user.loyaltyPoints,
      referralCode: user.referralCode,
      addresses: user.addresses
    }
  });
});

// --- CORE PRODUCT ROUTES ---
app.get('/api/products', (req, res) => {
  const db = loadDb();
  // Filter out Draft status products for non-admins
  const token = req.headers['authorization']?.split(' ')[1];
  let isAdminUser = false;

  if (token) {
    const session = db.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
    if (session) {
      const u = db.users.find(usr => usr.id === session.userId);
      if (u && (u.role === 'admin' || u.role === 'owner')) {
        isAdminUser = true;
      }
    }
  }

  const products = isAdminUser ? db.products : db.products.filter(p => p.status === 'Published');
  res.json(products);
});

// Post review with loyalty points reward
app.post('/api/products/:id/reviews', authenticateUser, (req: AuthenticatedRequest, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;

  if (!rating || !comment) {
    return res.status(400).json({ error: 'Rating (1-5) and comment are mandatory fields.' });
  }

  const db = loadDb();
  const product = db.products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: 'Natural product is missing in database.' });
  }

  const newReview = {
    id: crypto.randomUUID(),
    userId: req.user!.id,
    userName: req.user!.name,
    rating: Number(rating),
    comment: sanitizeString(comment),
    date: new Date().toISOString()
  };

  if (!product.reviews) product.reviews = [];
  product.reviews.push(newReview);

  // Recalculate average rating
  const avg = product.reviews.reduce((acc: number, item: any) => acc + item.rating, 0) / product.reviews.size;
  product.rating = Number(avg.toFixed(1));

  // Reward points - 20 Loyalty Points for product review
  const user = db.users.find(u => u.id === req.user!.id);
  if (user) {
    user.loyaltyPoints = (user.loyaltyPoints || 0) + 20;
  }

  saveDb(db);
  res.json({ message: 'Review successfully cast. You earned 20 Loyalty points!', product });
});

// --- PROMOTIONS & CODE REDEMPTION ---
app.get('/api/promotions/check/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const db = loadDb();
  const promo = db.promotions.find(p => p.code === code);

  if (!promo) {
    return res.status(404).json({ error: 'This coupon is invalid.' });
  }

  const expiry = new Date(promo.expiresAt);
  if (expiry < new Date()) {
    return res.status(400).json({ error: 'This coupon has expired.' });
  }

  res.json(promo);
});

// --- CHECKOUT & ORDER ROUTES ---
app.post('/api/orders/checkout', authenticateUser, (req: AuthenticatedRequest, res) => {
  const { items, discountCode, redeemPoints, shippingAddress, mobileMoney } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items bag is empty.' });
  }

  if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
    return res.status(400).json({ error: 'Full shipping address documentation required.' });
  }

  if (!req.user?.isVerified) {
    return res.status(403).json({ error: 'Please verify your account before checkout.' });
  }

  if (!mobileMoney || !['vodacom', 'airtel'].includes(mobileMoney.operator) || !/^\+255\d{9}$/.test(mobileMoney.phone || '')) {
    return res.status(400).json({ error: 'A valid Tanzanian mobile money wallet number is required.' });
  }

  const db = loadDb();
  let subtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      return res.status(400).json({ error: 'Each product quantity must be a whole number from 1 to 20.' });
    }
    const orig = db.products.find(p => p.id === item.productId);
    if (!orig) {
      return res.status(400).json({ error: `Product variant ${item.name} not found.` });
    }
    if (orig.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock on ${orig.name}. Only ${orig.stock} items exist.` });
    }
    subtotal += orig.price * item.quantity;
    verifiedItems.push({
      productId: orig.id,
      name: orig.name,
      price: orig.price,
      quantity: item.quantity,
      isRecurring: !!item.isRecurring
    });
  }

  let finalDiscount = 0;
  if (discountCode) {
    const promo = db.promotions.find(p => p.code === discountCode.trim().toUpperCase());
    if (promo && new Date(promo.expiresAt) > new Date()) {
      if (!promo.minSpend || subtotal >= promo.minSpend) {
        finalDiscount = Number((subtotal * (promo.discountPercent / 100)).toFixed(2));
      }
    }
  }

  // Deduct/redeem points: 100 points = TZS 5,000 discount (Max up to 50% discount)
  let pointsRedeemedAndDebited = 0;
  let pointDiscountVal = 0;
  const payer = db.users.find(u => u.id === req.user!.id);

  if (redeemPoints && payer) {
    const availablePoints = payer.loyaltyPoints || 0;
    const maxRedeemablePoints = Math.min(availablePoints, Math.floor(((subtotal - finalDiscount) * 0.5) / 5000) * 100);
    if (maxRedeemablePoints > 0) {
      pointsRedeemedAndDebited = maxRedeemablePoints;
      pointDiscountVal = (maxRedeemablePoints / 100) * 5000;
    }
  }

  const total = Number(Math.max(0, subtotal - finalDiscount - pointDiscountVal).toFixed(2));

  // Deduct stock levels and credit loyalty points (1 point per TZS 1,000 spent)
  const earnedPoints = Math.floor(total / 1000);

  for (const item of verifiedItems) {
    const orig = db.products.find(p => p.id === item.productId);
    if (orig) {
      orig.stock -= item.quantity;
    }
  }

  if (payer) {
    payer.loyaltyPoints = (payer.loyaltyPoints || 0) - pointsRedeemedAndDebited + earnedPoints;

    // Check if refereed-by logic deserves rewarding
    // First order gives referrer 100 points
    if (payer.referredBy) {
      const buyerOrders = db.orders.filter(o => o.userId === payer.id);
      if (buyerOrders.length === 0) {
        const referrer = db.users.find(u => u.id === payer.referredBy);
        if (referrer) {
          referrer.loyaltyPoints = (referrer.loyaltyPoints || 0) + 100;
          logAuditAction(referrer.id, referrer.email, 'Loyalty Earned', `Referred successfully: ${payer.name} checked out first time.`);
        }
      }
    }
  }

  const newOrder = {
    id: 'ord-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
    userId: req.user!.id,
    userEmail: req.user!.email,
    items: verifiedItems,
    subtotal,
    discount: finalDiscount + pointDiscountVal,
    pointsEarned: earnedPoints,
    pointsRedeemed: pointsRedeemedAndDebited,
    total,
    shippingAddress,
    paymentMethodId: `${mobileMoney.operator}:${mobileMoney.phone.slice(0, 6)}***`,
    paymentStatus: 'Pending',
    shippingStatus: 'Pending',
    createdAt: new Date().toISOString()
  };

  db.orders.push(newOrder);
  saveDb(db);

  res.status(201).json({
    message: 'Your Coco Queens order has been registered and is pending mobile money verification.',
    order: newOrder,
    earnedPoints
  });
});

app.get('/api/orders/history', authenticateUser, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const list = db.orders.filter(o => o.userId === req.user!.id);
  res.json(list);
});

// --- ADMIN / OWNER MANAGEMENT ROUTES ---

app.get('/api/admin/audit-logs', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  res.json(db.auditLogs);
});

app.get('/api/admin/analytics', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  const salesCount = db.orders.length;
  const totalRev = db.orders.reduce((acc: number, o: any) => acc + o.total, 0);
  const totalUsers = db.users.length;
  const totalItemsSold = db.orders.reduce((acc: number, o: any) => acc + o.items.reduce((sum: number, i: any) => sum + i.quantity, 0), 0);

  // Category counts
  const categoryMap: { [key: string]: number } = {};
  db.products.forEach(p => {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
  });

  // Abandoned carts - users who have registered but never ordered
  const userOrderCountMap: { [userId: string]: number } = {};
  db.orders.forEach(o => {
    userOrderCountMap[o.userId] = (userOrderCountMap[o.userId] || 0) + 1;
  });

  const potentialAbandonedCarts = db.users.filter(u => u.role === 'customer' && !userOrderCountMap[u.id]);

  res.json({
    salesCount,
    totalRev,
    totalUsers,
    totalItemsSold,
    categoryPopularity: categoryMap,
    abandonedCartCandidates: potentialAbandonedCarts.map(u => ({ id: u.id, name: u.name, email: u.email }))
  });
});

app.get('/api/admin/orders', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  res.json(db.orders);
});

app.put('/api/admin/orders/:id/shipping', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { shippingStatus } = req.body;
  const db = loadDb();
  const ord = db.orders.find(o => o.id === req.params.id);

  if (!ord) return res.status(404).json({ error: 'Order not identified.' });
  ord.shippingStatus = shippingStatus;

  logAuditAction(req.user!.id, req.user!.email, 'Order Updated', `Updated shipping status on ${ord.id} to ${shippingStatus}`);
  saveDb(db);

  res.json({ message: 'Shipping details elevated.', order: ord });
});

app.post('/api/admin/products', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { name, description, ingredients, benefits, usage, category, price, stock, status, skinType, hairType, isRecurring } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category parameters are mandatory.' });
  }

  const db = loadDb();
  const newId = 'prod-' + crypto.randomBytes(4).toString('hex');

  // Find unspash stock placeholder based on category
  let defaultImage = 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=800';
  if (category.toLowerCase().includes('tea')) {
    defaultImage = 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=800';
  } else if (category.toLowerCase().includes('hair')) {
    defaultImage = 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800';
  } else if (category.toLowerCase().includes('aroma')) {
    defaultImage = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=800';
  }

  const newProduct = {
    id: newId,
    name: sanitizeString(name),
    description: sanitizeString(description || 'Organic ingredients formulated beautifully.'),
    ingredients: sanitizeString(ingredients || ''),
    benefits: sanitizeString(benefits || ''),
    usage: sanitizeString(usage || ''),
    category: sanitizeString(category),
    price: Number(price),
    images: [defaultImage],
    stock: Number(stock || 10),
    rating: 5.0,
    reviews: [],
    status: status === 'Draft' ? 'Draft' : 'Published',
    skinType: sanitizeString(skinType || ''),
    hairType: sanitizeString(hairType || ''),
    isRecurring: !!isRecurring
  };

  db.products.push(newProduct);
  logAuditAction(req.user!.id, req.user!.email, 'Product Created', `Added product: ${newProduct.name}`);
  saveDb(db);

  res.status(201).json({ message: 'Premium product added beautifully.', product: newProduct });
});

app.put('/api/admin/products/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const product = db.products.find(p => p.id === req.params.id);

  if (!product) return res.status(404).json({ error: 'Product variant is missing in database.' });

  const { name, description, ingredients, benefits, usage, category, price, stock, status, skinType, hairType, isRecurring } = req.body;

  if (name) product.name = sanitizeString(name);
  if (description) product.description = sanitizeString(description);
  if (ingredients) product.ingredients = sanitizeString(ingredients);
  if (benefits) product.benefits = sanitizeString(benefits);
  if (usage) product.usage = sanitizeString(usage);
  if (category) product.category = sanitizeString(category);
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) product.stock = Number(stock);
  if (status) product.status = status;
  if (skinType !== undefined) product.skinType = sanitizeString(skinType);
  if (hairType !== undefined) product.hairType = sanitizeString(hairType);
  if (isRecurring !== undefined) product.isRecurring = !!isRecurring;

  logAuditAction(req.user!.id, req.user!.email, 'Product Modified', `Edited skincare item: ${product.name}`);
  saveDb(db);

  res.json({ message: 'Product refined successfully.', product });
});

app.delete('/api/admin/products/:id', authenticateUser, requireAdmin, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const index = db.products.findIndex(p => p.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Product variant not registered.' });

  const prodName = db.products[index].name;
  db.products.splice(index, 1);

  logAuditAction(req.user!.id, req.user!.email, 'Product Deleted', `Removed SKU: ${prodName}`);
  saveDb(db);

  res.json({ message: 'Skincare catalog updated (SKU expunged).' });
});

// Manage users / Roles
app.get('/api/admin/users', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  // Strip credentials
  const sanitized = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isVerified: u.isVerified,
    loyaltyPoints: u.loyaltyPoints || 0,
    referralCode: u.referralCode,
    createdAt: u.createdAt
  }));
  res.json(sanitized);
});

// Update role (ONLY owner can update role)
app.put('/api/admin/users/:id/role', authenticateUser, requireOwner, (req: AuthenticatedRequest, res) => {
  const { role } = req.body;
  if (!['customer', 'admin', 'owner'].includes(role)) {
    return res.status(400).json({ error: 'Target role designation invalid.' });
  }

  const db = loadDb();
  const targetUser = db.users.find(u => u.id === req.params.id);

  if (!targetUser) return res.status(404).json({ error: 'User does not exist inside repository.' });

  const oldRole = targetUser.role;
  targetUser.role = role;

  logAuditAction(req.user!.id, req.user!.email, 'User Role Update', `Promoted ${targetUser.email} from ${oldRole} to ${role}`);
  saveDb(db);

  res.json({ message: 'Target authorization elevated successfully.', user: targetUser });
});

// GDPR actions: client deletion or export
app.delete('/api/profile/gdpr-delete', authenticateUser, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const index = db.users.findIndex(u => u.id === req.user!.id);
  if (index === -1) return res.status(404).json({ error: 'Profile not found.' });

  const userEmail = db.users[index].email;

  // Purge user's orders and sessions
  db.orders = db.orders.filter(o => o.userId !== req.user!.id);
  db.sessions = db.sessions.filter(s => s.userId !== req.user!.id);
  db.resetTokens = db.resetTokens.filter(r => r.userId !== req.user!.id);
  db.verificationCodes = db.verificationCodes.filter(v => v.userId !== req.user!.id);

  db.users.splice(index, 1);
  saveDb(db);

  res.json({ message: 'In compliance with GDPR specifications, your profile and transaction histories have been permanently deleted.' });
});

app.get('/api/profile/gdpr-export', authenticateUser, (req: AuthenticatedRequest, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const userOrders = db.orders.filter(o => o.userId === req.user!.id);

  res.json({
    system: 'Natural Beauty & Total Wellness Store Engine',
    gdprReleaseDate: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      addresses: user.addresses
    },
    orders: userOrders
  });
});

// Static files and SPA serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Luxurious Storefront server listening on port ${PORT}`);
  });
}

startServer();

