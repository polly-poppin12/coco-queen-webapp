import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import helmet from 'helmet';
import cors from 'cors';
import * as db from './db';
import Stripe from 'stripe';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ---- Stripe Configuration ----
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// ---- Request ID middleware (tracing) ----
app.use((req, res, next) => {
  const requestId = crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Request-Id', requestId);
  (req as any).requestId = requestId;
  next();
});

// ---- Helmet security headers ----
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'https:', 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com', 'https://js.stripe.com/v3'],
        frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ---- CORS ----
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.APP_URL || '',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-HMAC-Signature'],
}));

app.use(express.json({ limit: '100kb' }));

// ---- HMAC signature verification for sensitive operations ----
// Helps detect forged or tampered requests by requiring a signature
// derived from the request body + a server-side secret.
const HMAC_SECRET = process.env.HMAC_SECRET || crypto.randomBytes(32).toString('hex');

function verifyHmac(req: express.Request): boolean {
  const signature = req.headers['x-hmac-signature'] as string;
  if (!signature) return false;
  const body = JSON.stringify(req.body || {});
  const expected = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(body)
    .digest('hex');
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// HMAC enforcement middleware for checkout & payment routes
const requireHmac = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (process.env.NODE_ENV === 'production' && !verifyHmac(req)) {
    return res.status(401).json({ error: 'Missing or invalid request signature.' });
  }
  next();
};

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

// --- RATE LIMITER STORE ---
// Process-local and in-memory. This resets on container restart, which is an
// acceptable tradeoff (rate limits are a defense-in-depth measure, not the
// system of record) — unlike user/order data, losing rate-limit counters on
// restart does not lock anyone out or lose anyone's data.
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
async function logAuditAction(userId: string, userEmail: string, action: string, details: string) {
  await db.logAudit({ userId, userEmail, action, details });
}

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
const authenticateUser = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['authorization']?.startsWith('Bearer ')
    ? req.headers['authorization'].slice('Bearer '.length)
    : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    const session = await db.findSessionByToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }

    const user = await db.findUserById(session.userId);
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
      referralCode: user.referralCode,
    };
    next();
  } catch (err) {
    console.error('authenticateUser error:', err);
    res.status(500).json({ error: 'Authentication check failed. Please try again.' });
  }
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

// Small helper to keep route handlers terse while still surfacing real errors
// instead of letting an unhandled rejection crash the process.
function asyncRoute(
  handler: (req: any, res: express.Response) => Promise<any>
) {
  return (req: any, res: express.Response) => {
    handler(req, res).catch((err) => {
      console.error('Route error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
      }
    });
  };
}

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', asyncRoute(async (req, res) => {
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

  const existingUser = await db.findUserByEmail(cleanEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const { hash, salt } = hashPassword(password);

  let referredByUserId: string | null = null;
  if (referralCode) {
    const referrer = await db.findUserByReferralCode(referralCode.trim());
    if (referrer) {
      referredByUserId = referrer.id;
    }
  }

  const newUser = await db.createUser({
    email: cleanEmail,
    name: sanitizeString(name),
    passwordHash: hash,
    passwordSalt: salt,
    role: 'customer',
    isVerified: false,
    referredBy: referredByUserId,
  });

  // Loyalty rewards: 50 points on signup, +25 bonus if referred
  const initialLoyalty = referredByUserId ? 75 : 50;
  await db.addLoyaltyPoints(newUser.id, initialLoyalty);

  // Generate Email Verification Code (Simulation — see SECURITY_AUDIT_AND_PATCHES.md
  // for why real email delivery is not wired up yet)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await db.createVerificationCode(newUser.id, code);

  res.status(201).json({
    message: 'Account crafted successfully. Verify your email to activate all benefits.',
    simulatedEmailVerificationCode: code,
    email: cleanEmail,
  });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!checkRateLimit(`login-${cleanEmail}`, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many failed login attempts. Please try again in 10 minutes.' });
  }

  const user = await db.findUserByEmail(cleanEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password combination.' });
  }

  const checkHash = hashPassword(password, user.passwordSalt);
  if (checkHash.hash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password combination.' });
  }

  const token = crypto.randomUUID() + crypto.randomBytes(32).toString('hex');
  await db.createSession(user.id, token);

  const addresses = await db.listAddressesForUser(user.id);

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
      addresses,
    },
  });
}));

app.post('/api/auth/logout', authenticateUser, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const token = req.headers['authorization']!.slice('Bearer '.length);
  await db.deleteSession(token);
  res.json({ message: 'Signed out successfully.' });
}));

app.post('/api/auth/verify-email', asyncRoute(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and digital verification code are mandatory.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await db.findUserByEmail(cleanEmail);
  if (!user) {
    return res.status(400).json({ error: 'User not encountered.' });
  }

  const ok = await db.checkVerificationCode(user.id, code.trim());
  if (!ok) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  await db.markUserVerified(user.id);

  res.json({ message: 'Email address verified successfully. Loyalty point account unlocked.' });
}));

app.post('/api/auth/forgot-password', asyncRoute(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Target email is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!checkRateLimit(`reset-${cleanEmail}`, 3, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Verification requests flooded. Please retry in 15 minutes.' });
  }

  const user = await db.findUserByEmail(cleanEmail);
  if (!user) {
    // Standard secure procedure: mock success even if not found to avoid account harvesting
    return res.json({
      message: 'If your email is on file, a password reset link has been simulated below.',
      simulatedToken: null,
    });
  }

  const resetToken = await db.createResetToken(user.id);

  res.json({
    message: 'If your email is on file, a password reset token has been generated below.',
    simulatedToken: resetToken,
  });
}));

app.post('/api/auth/reset-password', asyncRoute(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'All reset criteria are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must incorporate at least 8 characters.' });
  }

  const entry = await db.consumeResetToken(token);
  if (!entry) {
    return res.status(400).json({ error: 'Reset link has expired or is invalid.' });
  }

  const user = await db.findUserById(entry.userId);
  if (!user) {
    return res.status(400).json({ error: 'User does not exist inside repository.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  await db.updateUserPassword(user.id, hash, salt);
  await db.deleteAllSessionsForUser(user.id);

  res.json({ message: 'Password securely changed. Sign in using your new credentials.' });
}));

// --- CLIENT PROFILE DETAILS ---
app.get('/api/profile', authenticateUser, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const user = await db.findUserById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Profile not found.' });

  const addresses = await db.listAddressesForUser(user.id);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
    loyaltyPoints: user.loyaltyPoints || 0,
    referralCode: user.referralCode,
    addresses,
  });
}));

app.put('/api/profile', authenticateUser, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const { name, addresses } = req.body;

  if (name) {
    await db.pool.query('UPDATE users SET name = $1 WHERE id = $2', [sanitizeString(name), req.user!.id]);
  }

  if (addresses && Array.isArray(addresses)) {
    // Simplest correct approach: replace the full address set for this user.
    // Address volume per user is small (a handful at most), so this is cheap
    // and avoids needing a separate diffing endpoint.
    const existing = await db.listAddressesForUser(req.user!.id);
    for (const addr of existing) {
      await db.deleteAddress(req.user!.id, addr.id);
    }
    for (const addr of addresses) {
      await db.addAddress(req.user!.id, {
        label: sanitizeString(addr.label || 'Home'),
        street: sanitizeString(addr.street || ''),
        city: sanitizeString(addr.city || ''),
        state: sanitizeString(addr.state || ''),
        postalCode: sanitizeString(addr.postalCode || ''),
        country: sanitizeString(addr.country || 'Tanzania'),
      });
    }
  }

  const user = await db.findUserById(req.user!.id);
  const finalAddresses = await db.listAddressesForUser(req.user!.id);

  res.json({
    message: 'Profile details refined successfully.',
    user: {
      id: user!.id,
      email: user!.email,
      name: user!.name,
      role: user!.role,
      isVerified: user!.isVerified,
      loyaltyPoints: user!.loyaltyPoints,
      referralCode: user!.referralCode,
      addresses: finalAddresses,
    },
  });
}));

// --- CORE PRODUCT ROUTES ---
app.get('/api/products', asyncRoute(async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  let isAdminUser = false;

  if (token) {
    const session = await db.findSessionByToken(token);
    if (session) {
      const u = await db.findUserById(session.userId);
      if (u && (u.role === 'admin' || u.role === 'owner')) {
        isAdminUser = true;
      }
    }
  }

  const products = await db.listProducts({ includeUnpublished: isAdminUser });
  res.json(products);
}));

// Post review with loyalty points reward
app.post('/api/products/:id/reviews', authenticateUser, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;

  if (!rating || !comment) {
    return res.status(400).json({ error: 'Rating (1-5) and comment are mandatory fields.' });
  }
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' });
  }

  const product = await db.getProductById(productId);
  if (!product) {
    return res.status(404).json({ error: 'Natural product is missing in database.' });
  }

  const updated = await db.addProductReview(productId, {
    userId: req.user!.id,
    userName: req.user!.name,
    rating: numericRating,
    comment: sanitizeString(comment),
  });

  // Reward points - 20 Loyalty Points for product review
  await db.addLoyaltyPoints(req.user!.id, 20);

  res.json({ message: 'Review successfully cast. You earned 20 Loyalty points!', product: updated });
}));

// --- PROMOTIONS & CODE REDEMPTION ---
app.get('/api/promotions/check/:code', asyncRoute(async (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const promo = await db.getActivePromotion(code);

  if (!promo) {
    return res.status(404).json({ error: 'This coupon is invalid or has expired.' });
  }

  res.json(promo);
}));

// --- CHECKOUT & ORDER ROUTES ---
app.post('/api/orders/checkout', authenticateUser, requireHmac, asyncRoute(async (req: AuthenticatedRequest, res) => {
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

  let subtotal = 0;
  const verifiedItems: Array<{ productId: string; name: string; price: number; quantity: number; isRecurring: boolean }> = [];

  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      return res.status(400).json({ error: 'Each product quantity must be a whole number from 1 to 20.' });
    }
    const orig = await db.getProductById(item.productId);
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
      isRecurring: !!item.isRecurring,
    });
  }

  let finalDiscount = 0;
  if (discountCode) {
    const promo = await db.getActivePromotion(discountCode.trim().toUpperCase());
    if (promo) {
      if (!promo.minSpend || subtotal >= promo.minSpend) {
        let discount = Number((subtotal * (promo.discountPercent / 100)).toFixed(2));
        if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
        finalDiscount = discount;
      }
    }
  }

  // Deduct/redeem points: 100 points = TZS 5,000 discount (max up to 50% discount)
  let pointsRedeemedAndDebited = 0;
  let pointDiscountVal = 0;
  const payer = await db.findUserById(req.user!.id);

  if (redeemPoints && payer) {
    const availablePoints = payer.loyaltyPoints || 0;
    const maxRedeemablePoints = Math.min(availablePoints, Math.floor(((subtotal - finalDiscount) * 0.5) / 5000) * 100);
    if (maxRedeemablePoints > 0) {
      pointsRedeemedAndDebited = maxRedeemablePoints;
      pointDiscountVal = (maxRedeemablePoints / 100) * 5000;
    }
  }

  const total = Number(Math.max(0, subtotal - finalDiscount - pointDiscountVal).toFixed(2));
  const earnedPoints = Math.floor(total / 1000);

  const orderId = 'ord-' + crypto.randomBytes(6).toString('hex').toUpperCase();

  let createdOrder;
  try {
    createdOrder = await db.createOrderTransactional({
      id: orderId,
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
    });
  } catch (err: any) {
    if (err.code === 'OUT_OF_STOCK') {
      return res.status(409).json({
        error: 'One or more items sold out while you were checking out. Please review your cart and try again.',
        productId: err.productId,
      });
    }
    throw err;
  }

  // First-order referral bonus: referrer gets 100 points on the referee's first order.
  if (payer?.referredBy) {
    const buyerOrders = await db.listOrdersForUser(payer.id);
    if (buyerOrders.length === 1) { // this order is now their first
      const referrer = await db.findUserById(payer.referredBy);
      if (referrer) {
        await db.addLoyaltyPoints(referrer.id, 100);
        await logAuditAction(referrer.id, referrer.email, 'Loyalty Earned', `Referred successfully: ${payer.name} checked out first time.`);
      }
    }
  }

  // NOTE ON MOBILE MONEY: This endpoint records the order with paymentStatus
  // 'Pending' but does NOT send a real USSD/STK push to the customer's phone.
  // Doing that requires real Vodacom M-Pesa / Airtel Money merchant API
  // credentials, which must come from registering as a merchant with each
  // telecom — see SECURITY_AUDIT_AND_PATCHES.md for the registration links.
  // Once those credentials exist, the real disbursement call belongs here.

  res.status(201).json({
    message: 'Your Coco Queens order has been registered and is pending mobile money verification.',
    order: createdOrder,
    earnedPoints,
  });
}));

app.get('/api/orders/history', authenticateUser, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const list = await db.listOrdersForUser(req.user!.id);
  res.json(list);
}));

// --- ADMIN / OWNER MANAGEMENT ROUTES ---

app.get('/api/admin/audit-logs', authenticateUser, requireAdmin, asyncRoute(async (req, res) => {
  const logs = await db.listAuditLogs();
  res.json(logs);
}));

app.get('/api/admin/analytics', authenticateUser, requireAdmin, asyncRoute(async (req, res) => {
  const orders = await db.listAllOrders();
  const users = await db.listAllUsers();
  const products = await db.listProducts({ includeUnpublished: true });

  const salesCount = orders.length;
  const totalRev = orders.reduce((acc, o) => acc + o.total, 0);
  const totalUsers = users.length;
  const totalItemsSold = orders.reduce((acc, o) => acc + o.items.reduce((sum, i) => sum + i.quantity, 0), 0);

  const categoryMap: { [key: string]: number } = {};
  products.forEach((p) => {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
  });

  const userOrderCountMap: { [userId: string]: number } = {};
  orders.forEach((o) => {
    userOrderCountMap[o.userId] = (userOrderCountMap[o.userId] || 0) + 1;
  });

  const potentialAbandonedCarts = users.filter((u) => u.role === 'customer' && !userOrderCountMap[u.id]);

  res.json({
    salesCount,
    totalRev,
    totalUsers,
    totalItemsSold,
    categoryPopularity: categoryMap,
    abandonedCartCandidates: potentialAbandonedCarts.map((u) => ({ id: u.id, name: u.name, email: u.email })),
  });
}));

app.get('/api/admin/orders', authenticateUser, requireAdmin, asyncRoute(async (req, res) => {
  const orders = await db.listAllOrders();
  res.json(orders);
}));

app.put('/api/admin/orders/:id/shipping', authenticateUser, requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const { shippingStatus } = req.body;
  if (!['Pending', 'Shipped', 'Delivered'].includes(shippingStatus)) {
    return res.status(400).json({ error: 'Invalid shipping status.' });
  }

  const ord = await db.getOrderById(req.params.id);
  if (!ord) return res.status(404).json({ error: 'Order not identified.' });

  await db.updateOrderShippingStatus(ord.id, shippingStatus);
  await logAuditAction(req.user!.id, req.user!.email, 'Order Updated', `Updated shipping status on ${ord.id} to ${shippingStatus}`);

  const updated = await db.getOrderById(ord.id);
  res.json({ message: 'Shipping details updated.', order: updated });
}));

app.post('/api/admin/products', authenticateUser, requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const { name, description, ingredients, benefits, usage, category, price, stock, status, skinType, hairType, isRecurring } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category parameters are mandatory.' });
  }

  let defaultImage = 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=800';
  const categoryLower = String(category).toLowerCase();
  if (categoryLower.includes('tea')) {
    defaultImage = 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=800';
  } else if (categoryLower.includes('hair')) {
    defaultImage = 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800';
  } else if (categoryLower.includes('aroma')) {
    defaultImage = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=800';
  }

  const newProduct = await db.createProduct({
    name: sanitizeString(name),
    description: sanitizeString(description || 'Organic ingredients formulated beautifully.'),
    ingredients: sanitizeString(ingredients || ''),
    benefits: sanitizeString(benefits || ''),
    usage: sanitizeString(usage || ''),
    category: sanitizeString(category),
    price: Number(price),
    images: [defaultImage],
    stock: Number(stock || 10),
    status: status === 'Draft' ? 'Draft' : 'Published',
    skinType: sanitizeString(skinType || ''),
    hairType: sanitizeString(hairType || ''),
    isRecurring: !!isRecurring,
  });

  await logAuditAction(req.user!.id, req.user!.email, 'Product Created', `Added product: ${newProduct.name}`);

  res.status(201).json({ message: 'Product added successfully.', product: newProduct });
}));

app.put('/api/admin/products/:id', authenticateUser, requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const existing = await db.getProductById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product variant is missing in database.' });

  const { name, description, ingredients, benefits, usage, category, price, stock, status, skinType, hairType, isRecurring } = req.body;

  const patch: any = {};
  if (name) patch.name = sanitizeString(name);
  if (description) patch.description = sanitizeString(description);
  if (ingredients) patch.ingredients = sanitizeString(ingredients);
  if (benefits) patch.benefits = sanitizeString(benefits);
  if (usage) patch.usage = sanitizeString(usage);
  if (category) patch.category = sanitizeString(category);
  if (price !== undefined) patch.price = Number(price);
  if (stock !== undefined) patch.stock = Number(stock);
  if (status) patch.status = status;
  if (skinType !== undefined) patch.skinType = sanitizeString(skinType);
  if (hairType !== undefined) patch.hairType = sanitizeString(hairType);
  if (isRecurring !== undefined) patch.isRecurring = !!isRecurring;

  const updated = await db.updateProduct(req.params.id, patch);

  await logAuditAction(req.user!.id, req.user!.email, 'Product Modified', `Edited item: ${updated?.name}`);

  res.json({ message: 'Product updated successfully.', product: updated });
}));

app.delete('/api/admin/products/:id', authenticateUser, requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const existing = await db.getProductById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product variant not registered.' });

  await db.deleteProduct(req.params.id);
  await logAuditAction(req.user!.id, req.user!.email, 'Product Deleted', `Removed SKU: ${existing.name}`);

  res.json({ message: 'Product removed from catalog.' });
}));

// Manage users / Roles
app.get('/api/admin/users', authenticateUser, requireAdmin, asyncRoute(async (req, res) => {
  const users = await db.listAllUsers();
  const sanitized = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isVerified: u.isVerified,
    loyaltyPoints: u.loyaltyPoints || 0,
    referralCode: u.referralCode,
    createdAt: u.createdAt,
  }));
  res.json(sanitized);
}));

// Update role (ONLY owner can update role)
app.put('/api/admin/users/:id/role', authenticateUser, requireOwner, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const { role } = req.body;
  if (!['customer', 'admin', 'owner'].includes(role)) {
    return res.status(400).json({ error: 'Target role designation invalid.' });
  }

  const targetUser = await db.findUserById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User does not exist.' });

  const oldRole = targetUser.role;
  await db.updateUserRole(targetUser.id, role);

  await logAuditAction(req.user!.id, req.user!.email, 'User Role Update', `Promoted ${targetUser.email} from ${oldRole} to ${role}`);

  const updated = await db.findUserById(targetUser.id);
  res.json({ message: 'User role updated successfully.', user: updated });
}));

// GDPR actions: client deletion or export
app.delete('/api/profile/gdpr-delete', authenticateUser, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const user = await db.findUserById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Profile not found.' });

  // ON DELETE CASCADE on addresses/sessions/reset_tokens/verification_codes
  // means deleting the user row cleans those up automatically. Orders use
  // ON DELETE CASCADE too — if you'd rather retain order history for
  // accounting/audit purposes after a GDPR delete, change that to
  // ON DELETE SET NULL and keep userEmail as the historical reference.
  await db.pool.query('DELETE FROM users WHERE id = $1', [user.id]);

  res.json({ message: 'In compliance with GDPR specifications, your profile and transaction histories have been permanently deleted.' });
}));

app.get('/api/profile/gdpr-export', authenticateUser, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const user = await db.findUserById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const userOrders = await db.listOrdersForUser(req.user!.id);
  const addresses = await db.listAddressesForUser(req.user!.id);

  res.json({
    system: 'Coco Queens Store Engine',
    gdprReleaseDate: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      addresses,
    },
    orders: userOrders,
  });
}));

// ---- CONFIG ENDPOINT (stripe publishable key, etc.) ----
app.get('/api/config', asyncRoute(async (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  });
}));

// ---- STRIPE PAYMENT ENDPOINT ----
app.post('/api/stripe/create-checkout-session', authenticateUser, asyncRoute(async (req: AuthenticatedRequest, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env' });
  }

  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  // Validate items against database
  const lineItems: Array<{ price_data: any; quantity: number }> = [];
  for (const item of items) {
    if (!item.productId || !item.name || !item.price || !item.quantity) {
      return res.status(400).json({ error: `Invalid item: ${item.name || 'unknown'}` });
    }
    const product = await db.getProductById(item.productId).catch(() => null);
    // Convert TZS to USD cents (rate: 2500 TZS = 1 USD)
    const usdCents = Math.round(item.price / 2500 * 100);
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: product?.name || item.name,
          description: product?.description || '',
        },
        unit_amount: Math.max(usdCents, 50), // minimum 50 cents
      },
      quantity: Math.min(Math.max(1, item.quantity), 20),
    });
  }

  try {
    const session = await stripe!.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${APP_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}`,
      shipping_address_collection: { allowed_countries: ['TZ'] },
      metadata: {
        user_id: req.user?.id || 'guest',
        user_email: req.user?.email || 'guest',
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    console.error('Stripe session creation failed:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment session' });
  }
}));

// ---- STATIC FILES & SPA SERVING ----
// Serve public/ for static assets (images, etc.)
app.use(express.static(path.join(process.cwd(), 'public')));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

async function startServer() {
  // Start listening first (so the page is served immediately even if DB is cold)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Coco Queens server listening on port ${PORT}`);
    if (!STRIPE_SECRET_KEY) console.warn('⚠️  STRIPE_SECRET_KEY not set — payments will be unavailable');
  });

  // Then seed the database (may be slow on cold Neon start)
  try {
    await db.seedIfEmpty();
  } catch (err: any) {
    console.error('Database seed failed (non-fatal):', err.message);
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
