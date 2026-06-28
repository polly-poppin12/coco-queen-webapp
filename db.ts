// ============================================================
// db.ts — Postgres-backed data access layer for Coco Queens
//
// This replaces the old flat-file loadDb()/saveDb() pattern.
// Every function here does a real, targeted SQL query instead
// of reading/writing the entire dataset on every operation.
//
// Why this exists: the previous data.json approach could not
// survive a Cloud Run container restart (Cloud Run's filesystem
// is ephemeral), which silently wiped all users/orders/sessions
// on every redeploy or scale-to-zero cycle. Postgres on Neon
// gives this app real, durable persistence.
// ============================================================

import { Pool } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add it to your .env (local) or Cloud Run env vars (production). ' +
    'See .env.example for the expected format.'
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL.
  // Use rejectUnauthorized: true in production with env DATABASE_SSL_CA.
  // For development/local, set NODE_ENV=development or DISABLE_SSL_VERIFY=true.
  ssl: process.env.DISABLE_SSL_VERIFY === 'true' || process.env.NODE_ENV === 'development'
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: true, ca: process.env.DATABASE_SSL_CA || undefined },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // A background, idle client encountering an error should not crash the process.
  console.error('Unexpected Postgres pool error:', err.message);
});

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function newId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// camelCase <-> snake_case row mapping is done explicitly per-table below
// rather than via a generic mapper, so the shape returned to callers
// matches the existing frontend types.ts exactly.

// ----------------------------------------------------------------
// USERS
// ----------------------------------------------------------------

export interface DbUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role: 'customer' | 'admin' | 'owner';
  isVerified: boolean;
  loyaltyPoints: number;
  referralCode: string;
  referredBy?: string | null;
  createdAt: string;
}

function mapUserRow(row: any): DbUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    role: row.role,
    isVerified: row.is_verified,
    loyaltyPoints: row.loyalty_points,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    createdAt: row.created_at,
  };
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email.toLowerCase().trim()]
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function findUserByReferralCode(code: string): Promise<DbUser | null> {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE referral_code = $1 LIMIT 1',
    [code]
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function createUser(params: {
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role?: 'customer' | 'admin' | 'owner';
  isVerified?: boolean;
  referredBy?: string | null;
}): Promise<DbUser> {
  // Loop guards against the astronomically unlikely referral code collision.
  let referralCode = generateReferralCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await findUserByReferralCode(referralCode);
    if (!existing) break;
    referralCode = generateReferralCode();
  }

  const { rows } = await pool.query(
    `INSERT INTO users (email, name, password_hash, password_salt, role, is_verified, referral_code, referred_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      params.email.toLowerCase().trim(),
      params.name,
      params.passwordHash,
      params.passwordSalt,
      params.role || 'customer',
      params.isVerified ?? false,
      referralCode,
      params.referredBy || null,
    ]
  );
  return mapUserRow(rows[0]);
}

export async function updateUserPassword(userId: string, passwordHash: string, passwordSalt: string) {
  await pool.query(
    'UPDATE users SET password_hash = $1, password_salt = $2 WHERE id = $3',
    [passwordHash, passwordSalt, userId]
  );
}

export async function markUserVerified(userId: string) {
  await pool.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [userId]);
}

export async function addLoyaltyPoints(userId: string, delta: number) {
  await pool.query(
    'UPDATE users SET loyalty_points = GREATEST(0, loyalty_points + $1) WHERE id = $2',
    [delta, userId]
  );
}

export async function listAllUsers(): Promise<DbUser[]> {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map(mapUserRow);
}

export async function updateUserRole(userId: string, role: 'customer' | 'admin' | 'owner') {
  await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
}

// ----------------------------------------------------------------
// ADDRESSES
// ----------------------------------------------------------------

export interface DbAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function mapAddressRow(row: any): DbAddress {
  return {
    id: row.id,
    label: row.label,
    street: row.street,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
  };
}

export async function listAddressesForUser(userId: string): Promise<DbAddress[]> {
  const { rows } = await pool.query(
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );
  return rows.map(mapAddressRow);
}

export async function addAddress(userId: string, addr: Omit<DbAddress, 'id'>): Promise<DbAddress> {
  const { rows } = await pool.query(
    `INSERT INTO addresses (user_id, label, street, city, state, postal_code, country)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, addr.label, addr.street, addr.city, addr.state, addr.postalCode, addr.country]
  );
  return mapAddressRow(rows[0]);
}

export async function deleteAddress(userId: string, addressId: string) {
  await pool.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
}

export async function getAddressById(addressId: string, userId: string): Promise<DbAddress | null> {
  const { rows } = await pool.query(
    'SELECT * FROM addresses WHERE id = $1 AND user_id = $2 LIMIT 1',
    [addressId, userId]
  );
  return rows[0] ? mapAddressRow(rows[0]) : null;
}

// ----------------------------------------------------------------
// SESSIONS
// ----------------------------------------------------------------

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const tokenHash = hashToken(token);
  await pool.query(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
}

export async function findSessionByToken(token: string): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(token);
  const { rows } = await pool.query(
    'SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now() LIMIT 1',
    [tokenHash]
  );
  return rows[0] ? { userId: rows[0].user_id } : null;
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

// Periodically called to keep the table small; safe to call often.
export async function purgeExpiredSessions(): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE expires_at <= now()');
}

// ----------------------------------------------------------------
// VERIFICATION CODES
// ----------------------------------------------------------------

const VERIFY_CODE_TTL_MS = 1000 * 60 * 15; // 15 minutes

export async function createVerificationCode(userId: string, code: string): Promise<void> {
  const expiresAt = new Date(Date.now() + VERIFY_CODE_TTL_MS);
  // Replace any existing outstanding code for this user.
  await pool.query('DELETE FROM verification_codes WHERE user_id = $1', [userId]);
  await pool.query(
    'INSERT INTO verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
    [userId, code, expiresAt]
  );
}

export async function checkVerificationCode(userId: string, code: string): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT id FROM verification_codes WHERE user_id = $1 AND code = $2 AND expires_at > now() LIMIT 1',
    [userId, code]
  );
  if (rows[0]) {
    await pool.query('DELETE FROM verification_codes WHERE id = $1', [rows[0].id]);
    return true;
  }
  return false;
}

// ----------------------------------------------------------------
// RESET TOKENS
// ----------------------------------------------------------------

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

export async function createResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await pool.query('DELETE FROM reset_tokens WHERE user_id = $1', [userId]);
  await pool.query(
    'INSERT INTO reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
  return token;
}

export async function consumeResetToken(token: string): Promise<{ userId: string } | null> {
  const { rows } = await pool.query(
    'SELECT id, user_id FROM reset_tokens WHERE token = $1 AND expires_at > now() LIMIT 1',
    [token]
  );
  if (!rows[0]) return null;
  await pool.query('DELETE FROM reset_tokens WHERE id = $1', [rows[0].id]);
  return { userId: rows[0].user_id };
}

// ----------------------------------------------------------------
// PRODUCTS + REVIEWS
// ----------------------------------------------------------------

export interface DbProduct {
  id: string;
  name: string;
  description: string;
  ingredients: string;
  benefits: string;
  usage: string;
  category: string;
  price: number;
  images: string[];
  stock: number;
  rating: number;
  status: 'Draft' | 'Published';
  skinType?: string;
  hairType?: string;
  isRecurring?: boolean;
  reviews: Array<{
    id: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    date: string;
  }>;
}

function mapProductRow(row: any, reviews: any[] = []): DbProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ingredients: row.ingredients,
    benefits: row.benefits,
    usage: row.usage_notes,
    category: row.category,
    price: Number(row.price),
    images: row.images || [],
    stock: row.stock,
    rating: Number(row.rating),
    status: row.status,
    skinType: row.skin_type || undefined,
    hairType: row.hair_type || undefined,
    isRecurring: row.is_recurring,
    reviews: reviews.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      rating: r.rating,
      comment: r.comment,
      date: r.created_at,
    })),
  };
}

export async function listProducts(opts: { includeUnpublished?: boolean } = {}): Promise<DbProduct[]> {
  const productsRes = opts.includeUnpublished
    ? await pool.query('SELECT * FROM products ORDER BY created_at DESC')
    : await pool.query("SELECT * FROM products WHERE status = 'Published' ORDER BY created_at DESC");

  if (productsRes.rows.length === 0) return [];

  const ids = productsRes.rows.map((r) => r.id);
  const reviewsRes = await pool.query(
    'SELECT * FROM product_reviews WHERE product_id = ANY($1) ORDER BY created_at DESC',
    [ids]
  );
  const reviewsByProduct = new Map<string, any[]>();
  for (const r of reviewsRes.rows) {
    if (!reviewsByProduct.has(r.product_id)) reviewsByProduct.set(r.product_id, []);
    reviewsByProduct.get(r.product_id)!.push(r);
  }

  return productsRes.rows.map((row) => mapProductRow(row, reviewsByProduct.get(row.id) || []));
}

export async function getProductById(id: string): Promise<DbProduct | null> {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id]);
  if (!rows[0]) return null;
  const reviewsRes = await pool.query(
    'SELECT * FROM product_reviews WHERE product_id = $1 ORDER BY created_at DESC',
    [id]
  );
  return mapProductRow(rows[0], reviewsRes.rows);
}

export async function createProduct(p: Omit<DbProduct, 'id' | 'rating' | 'reviews'>): Promise<DbProduct> {
  const id = newId('prod');
  const { rows } = await pool.query(
    `INSERT INTO products (id, name, description, ingredients, benefits, usage_notes, category, price, images, stock, status, skin_type, hair_type, is_recurring)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      id, p.name, p.description, p.ingredients, p.benefits, p.usage, p.category,
      p.price, JSON.stringify(p.images || []), p.stock, p.status || 'Published',
      p.skinType || '', p.hairType || '', p.isRecurring || false,
    ]
  );
  return mapProductRow(rows[0], []);
}

export async function updateProduct(id: string, patch: Partial<DbProduct>): Promise<DbProduct | null> {
  const existing = await getProductById(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  const { rows } = await pool.query(
    `UPDATE products SET
      name=$1, description=$2, ingredients=$3, benefits=$4, usage_notes=$5,
      category=$6, price=$7, images=$8, stock=$9, status=$10,
      skin_type=$11, hair_type=$12, is_recurring=$13
     WHERE id=$14
     RETURNING *`,
    [
      merged.name, merged.description, merged.ingredients, merged.benefits, merged.usage,
      merged.category, merged.price, JSON.stringify(merged.images || []), merged.stock, merged.status,
      merged.skinType || '', merged.hairType || '', merged.isRecurring || false,
      id,
    ]
  );
  return mapProductRow(rows[0], existing.reviews.map(r => ({
    id: r.id, user_id: r.userId, user_name: r.userName, rating: r.rating, comment: r.comment, created_at: r.date,
  })));
}

export async function deleteProduct(id: string): Promise<void> {
  await pool.query('DELETE FROM products WHERE id = $1', [id]);
}

export async function addProductReview(
  productId: string,
  review: { userId: string; userName: string; rating: number; comment: string }
): Promise<DbProduct | null> {
  await pool.query(
    `INSERT INTO product_reviews (product_id, user_id, user_name, rating, comment)
     VALUES ($1, $2, $3, $4, $5)`,
    [productId, review.userId, review.userName, review.rating, review.comment]
  );

  // Recompute the average rating directly in SQL — this also fixes the old
  // `.size` bug (arrays don't have .size, only .length), which previously
  // made every rating recalculation evaluate to NaN.
  await pool.query(
    `UPDATE products SET rating = (
       SELECT ROUND(AVG(rating)::numeric, 1) FROM product_reviews WHERE product_id = $1
     ) WHERE id = $1`,
    [productId]
  );

  return getProductById(productId);
}

/**
 * Atomically decrements stock for a set of order items, but ONLY if every
 * item has sufficient stock. Uses SELECT ... FOR UPDATE inside the given
 * transaction client so concurrent checkouts cannot oversell the same item.
 * Returns null on success, or the productId that failed the stock check.
 */
export async function decrementStockForOrder(
  client: import('pg').PoolClient,
  items: Array<{ productId: string; quantity: number }>
): Promise<{ failedProductId: string } | null> {
  for (const item of items) {
    const { rows } = await client.query(
      'SELECT stock FROM products WHERE id = $1 FOR UPDATE',
      [item.productId]
    );
    if (!rows[0] || rows[0].stock < item.quantity) {
      return { failedProductId: item.productId };
    }
  }
  for (const item of items) {
    await client.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2',
      [item.quantity, item.productId]
    );
  }
  return null;
}

// ----------------------------------------------------------------
// PROMOTIONS
// ----------------------------------------------------------------

export interface DbPromotion {
  code: string;
  discountPercent: number;
  description: string;
  minSpend?: number;
  maxDiscount?: number;
  expiresAt: string;
}

function mapPromoRow(row: any): DbPromotion {
  return {
    code: row.code,
    discountPercent: Number(row.discount_percent),
    description: row.description,
    minSpend: row.min_spend != null ? Number(row.min_spend) : undefined,
    maxDiscount: row.max_discount != null ? Number(row.max_discount) : undefined,
    expiresAt: row.expires_at,
  };
}

export async function getActivePromotion(code: string): Promise<DbPromotion | null> {
  const { rows } = await pool.query(
    'SELECT * FROM promotions WHERE code = $1 AND expires_at > now() LIMIT 1',
    [code.toUpperCase().trim()]
  );
  return rows[0] ? mapPromoRow(rows[0]) : null;
}

export async function listPromotions(): Promise<DbPromotion[]> {
  const { rows } = await pool.query('SELECT * FROM promotions ORDER BY expires_at DESC');
  return rows.map(mapPromoRow);
}

export async function upsertPromotion(p: DbPromotion): Promise<DbPromotion> {
  const { rows } = await pool.query(
    `INSERT INTO promotions (code, discount_percent, description, min_spend, max_discount, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (code) DO UPDATE SET
       discount_percent = EXCLUDED.discount_percent,
       description = EXCLUDED.description,
       min_spend = EXCLUDED.min_spend,
       max_discount = EXCLUDED.max_discount,
       expires_at = EXCLUDED.expires_at
     RETURNING *`,
    [p.code.toUpperCase().trim(), p.discountPercent, p.description, p.minSpend ?? null, p.maxDiscount ?? null, p.expiresAt]
  );
  return mapPromoRow(rows[0]);
}

export async function deletePromotion(code: string): Promise<void> {
  await pool.query('DELETE FROM promotions WHERE code = $1', [code.toUpperCase().trim()]);
}

// ----------------------------------------------------------------
// ORDERS
// ----------------------------------------------------------------

export interface DbOrder {
  id: string;
  userId: string;
  userEmail: string;
  items: Array<{ productId: string; name: string; price: number; quantity: number; isRecurring?: boolean }>;
  subtotal: number;
  discount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  total: number;
  shippingAddress: any;
  paymentMethodId: string;
  paymentStatus: 'Paid' | 'Pending' | 'Failed';
  shippingStatus: 'Pending' | 'Shipped' | 'Delivered';
  createdAt: string;
}

function mapOrderRow(row: any): DbOrder {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    items: row.items,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    pointsEarned: row.points_earned,
    pointsRedeemed: row.points_redeemed,
    total: Number(row.total),
    shippingAddress: row.shipping_address,
    paymentMethodId: row.payment_method_id,
    paymentStatus: row.payment_status,
    shippingStatus: row.shipping_status,
    createdAt: row.created_at,
  };
}

/**
 * Creates an order and decrements stock atomically in a single transaction.
 * Throws an Error with `.code = 'OUT_OF_STOCK'` and `.productId` set if any
 * item in the cart no longer has enough stock by the time we get the lock.
 */
export async function createOrderTransactional(order: Omit<DbOrder, 'createdAt'>): Promise<DbOrder> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const stockFailure = await decrementStockForOrder(client, order.items);
    if (stockFailure) {
      await client.query('ROLLBACK');
      const err: any = new Error(`Insufficient stock for product ${stockFailure.failedProductId}`);
      err.code = 'OUT_OF_STOCK';
      err.productId = stockFailure.failedProductId;
      throw err;
    }

    const { rows } = await client.query(
      `INSERT INTO orders (id, user_id, user_email, items, subtotal, discount, points_earned, points_redeemed, total, shipping_address, payment_method_id, payment_status, shipping_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        order.id, order.userId, order.userEmail, JSON.stringify(order.items),
        order.subtotal, order.discount, order.pointsEarned, order.pointsRedeemed,
        order.total, JSON.stringify(order.shippingAddress), order.paymentMethodId,
        order.paymentStatus, order.shippingStatus,
      ]
    );

    if (order.pointsEarned) {
      await client.query(
        'UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2',
        [order.pointsEarned, order.userId]
      );
    }
    if (order.pointsRedeemed) {
      await client.query(
        'UPDATE users SET loyalty_points = GREATEST(0, loyalty_points - $1) WHERE id = $2',
        [order.pointsRedeemed, order.userId]
      );
    }

    await client.query('COMMIT');
    return mapOrderRow(rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* already rolled back */ }
    throw err;
  } finally {
    client.release();
  }
}

export async function updateOrderPaymentStatus(orderId: string, status: 'Paid' | 'Pending' | 'Failed') {
  await pool.query('UPDATE orders SET payment_status = $1 WHERE id = $2', [status, orderId]);
}

export async function updateOrderShippingStatus(orderId: string, status: 'Pending' | 'Shipped' | 'Delivered') {
  await pool.query('UPDATE orders SET shipping_status = $1 WHERE id = $2', [status, orderId]);
}

export async function listOrdersForUser(userId: string): Promise<DbOrder[]> {
  const { rows } = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(mapOrderRow);
}

export async function listAllOrders(): Promise<DbOrder[]> {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  return rows.map(mapOrderRow);
}

export async function getOrderById(orderId: string): Promise<DbOrder | null> {
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
  return rows[0] ? mapOrderRow(rows[0]) : null;
}

// ----------------------------------------------------------------
// BLOGS
// ----------------------------------------------------------------

export interface DbBlog {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  image: string;
  readTime: string;
  date: string;
}

function mapBlogRow(row: any): DbBlog {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    category: row.category,
    image: row.image,
    readTime: row.read_time,
    date: row.posted_date,
  };
}

export async function listBlogs(): Promise<DbBlog[]> {
  const { rows } = await pool.query('SELECT * FROM blogs ORDER BY created_at DESC');
  return rows.map(mapBlogRow);
}

export async function createBlog(b: Omit<DbBlog, 'id'>): Promise<DbBlog> {
  const id = newId('blog');
  const { rows } = await pool.query(
    `INSERT INTO blogs (id, title, summary, content, category, image, read_time, posted_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, b.title, b.summary, b.content, b.category, b.image, b.readTime, b.date]
  );
  return mapBlogRow(rows[0]);
}

export async function deleteBlog(id: string): Promise<void> {
  await pool.query('DELETE FROM blogs WHERE id = $1', [id]);
}

// ----------------------------------------------------------------
// CAREERS
// ----------------------------------------------------------------

export interface DbCareer {
  id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string[];
}

function mapCareerRow(row: any): DbCareer {
  return {
    id: row.id,
    title: row.title,
    department: row.department,
    location: row.location,
    description: row.description,
    requirements: row.requirements || [],
  };
}

export async function listCareers(): Promise<DbCareer[]> {
  const { rows } = await pool.query('SELECT * FROM careers ORDER BY created_at DESC');
  return rows.map(mapCareerRow);
}

export async function createCareer(c: Omit<DbCareer, 'id'>): Promise<DbCareer> {
  const id = newId('career');
  const { rows } = await pool.query(
    `INSERT INTO careers (id, title, department, location, description, requirements)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, c.title, c.department, c.location, c.description, JSON.stringify(c.requirements || [])]
  );
  return mapCareerRow(rows[0]);
}

export async function deleteCareer(id: string): Promise<void> {
  await pool.query('DELETE FROM careers WHERE id = $1', [id]);
}

// ----------------------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------------------

export async function logAudit(params: { userId?: string | null; userEmail: string; action: string; details?: string }) {
  await pool.query(
    'INSERT INTO audit_logs (user_id, user_email, action, details) VALUES ($1, $2, $3, $4)',
    [params.userId || null, params.userEmail, params.action, params.details || '']
  );
}

export async function listAuditLogs(limit = 200) {
  const { rows } = await pool.query(
    'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return rows;
}

// ----------------------------------------------------------------
// SEEDING — idempotent, safe to run on every boot.
// Unlike the old seedInitialData(), this checks what already
// exists in Postgres before inserting anything, so restarts
// never duplicate or reset data.
// ----------------------------------------------------------------

function hashPasswordForSeed(password: string, _saltInput?: string) {
  const hash = bcrypt.hashSync(password, 12);
  return { hash, salt: '' };
}

// -----------------------------------------------------------
// RATE LIMITER [H5] — Postgres-backed, survives restarts
// -----------------------------------------------------------
export async function checkRateLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const { rows } = await pool.query(
    `INSERT INTO rate_limiter (key, count, reset_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE
       SET count = CASE
         WHEN rate_limiter.reset_at < $3 THEN 1
         ELSE rate_limiter.count + 1
       END,
       reset_at = CASE
         WHEN rate_limiter.reset_at < $3 THEN $4
         ELSE rate_limiter.reset_at
       END
     RETURNING count, reset_at`,
    [key, new Date(now.getTime() + windowMs), now, new Date(now.getTime() + windowMs)]
  );
  const row = rows[0];
  if (!row) return true; // allow if insert failed
  // Clean up old entries periodically
  if (Math.random() < 0.1) {
    pool.query('DELETE FROM rate_limiter WHERE reset_at < NOW()').catch(() => {});
  }
  return Number(row.count) <= maxRequests;
}

// Ensure the rate_limiter table exists (for environments where schema.sql hasn't been run)
export async function ensureRateLimiterTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_limiter (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      reset_at TIMESTAMPTZ NOT NULL
    )
  `);
}

export async function ensureSchema(): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin','owner')),
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      referral_code TEXT UNIQUE NOT NULL,
      referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT 'Home',
      street TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT 'Tanzania',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON reset_tokens(token)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      ingredients TEXT NOT NULL DEFAULT '',
      benefits TEXT NOT NULL DEFAULT '',
      usage_notes TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      stock INTEGER NOT NULL DEFAULT 0,
      rating NUMERIC(3,1) NOT NULL DEFAULT 5.0,
      status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft','Published')),
      skin_type TEXT NOT NULL DEFAULT '',
      hair_type TEXT NOT NULL DEFAULT '',
      is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promotions (
      code TEXT PRIMARY KEY,
      discount_percent NUMERIC(5,2) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      min_spend NUMERIC(12,2),
      max_discount NUMERIC(12,2),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount NUMERIC(12,2) NOT NULL DEFAULT 0,
      points_earned INTEGER NOT NULL DEFAULT 0,
      points_redeemed INTEGER NOT NULL DEFAULT 0,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
      payment_method_id TEXT NOT NULL DEFAULT '',
      payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Paid','Pending','Failed')),
      shipping_status TEXT NOT NULL DEFAULT 'Pending' CHECK (shipping_status IN ('Pending','Shipped','Delivered')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blogs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      read_time TEXT NOT NULL DEFAULT '',
      posted_date TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS careers (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);

  await ensureRateLimiterTable();
}

export async function seedIfEmpty() {
  // Ensure rate_limiter table exists [H5]
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_limiter (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      reset_at TIMESTAMPTZ NOT NULL
    )
  `).catch(() => {});
  const { rows: userCountRows } = await pool.query('SELECT COUNT(*) FROM users');
  const userCount = parseInt(userCountRows[0].count, 10);

  if (userCount === 0) {
    const ownerPasswordPlain = process.env.OWNER_BOOTSTRAP_PASSWORD;
    const adminPasswordPlain = process.env.ADMIN_BOOTSTRAP_PASSWORD;

    if (!ownerPasswordPlain || !adminPasswordPlain) {
      // We refuse to silently generate unrecoverable random passwords —
      // that exact behavior is what caused the original login lockout.
      // Fail loudly at boot instead so it's caught in deployment, not by a user.
      throw new Error(
        'OWNER_BOOTSTRAP_PASSWORD and ADMIN_BOOTSTRAP_PASSWORD must be set before first boot. ' +
        'These create the initial owner/admin accounts. Set them in your .env (local) or ' +
        'Cloud Run environment variables (production), then redeploy.'
      );
    }

    const ownerCreds = hashPasswordForSeed(ownerPasswordPlain);
    const adminCreds = hashPasswordForSeed(adminPasswordPlain);

    // Insert with explicit referral codes (matching the original seed data)
    // rather than the auto-generated random ones createUser() would assign,
    // since these specific codes ('PRADA1000', 'JULIUS99', 'CLIFFORD10')
    // may already be shared with the store owner outside the app.
    const { rows: ownerRows } = await pool.query(
      `INSERT INTO users (email, name, password_hash, password_salt, role, is_verified, loyalty_points, referral_code)
       VALUES ($1,$2,$3,$4,'owner',TRUE,1000,$5) RETURNING id`,
      ['owner@wellness.com', 'Victoria Prada', ownerCreds.hash, ownerCreds.salt, 'PRADA1000']
    );

    await pool.query(
      `INSERT INTO users (email, name, password_hash, password_salt, role, is_verified, loyalty_points, referral_code)
       VALUES ($1,$2,$3,$4,'admin',TRUE,500,$5)`,
      ['admin@wellness.com', 'Julius Wellness', adminCreds.hash, adminCreds.salt, 'JULIUS99']
    );

    const { rows: devRows } = await pool.query(
      `INSERT INTO users (email, name, password_hash, password_salt, role, is_verified, loyalty_points, referral_code)
       VALUES ($1,$2,$3,$4,'owner',TRUE,1000,$5) RETURNING id`,
      ['cliffordkimaro12@gmail.com', 'Clifford Kimaro', ownerCreds.hash, ownerCreds.salt, 'CLIFFORD10']
    );

    await pool.query(
      `INSERT INTO addresses (user_id, label, street, city, state, postal_code, country)
       VALUES ($1, 'Default Shipping', '12 Luxury Wellness Blvd', 'Beverly Hills', 'CA', '90210', 'Tanzania')`,
      [devRows[0].id]
    );

    console.log('Seeded owner@wellness.com, admin@wellness.com, and cliffordkimaro12@gmail.com from bootstrap env vars.');
  }

  const { rows: productCountRows } = await pool.query('SELECT COUNT(*) FROM products');
  const productCount = parseInt(productCountRows[0].count, 10);

  if (productCount === 0) {
    const seedProducts = [
      {
        id: 'prod-1',
        name: 'Coco Queens Extra Virgin Coconut Oil',
        description: 'A clear, lightweight coconut oil for daily skin glow, hair shine, scalp comfort and total wellness rituals.',
        ingredients: 'Pure extra virgin coconut oil, cold-pressed coconut extract.',
        benefits: 'Softens dry skin, seals hair moisture, supports scalp massage, adds natural gloss and leaves a clean tropical finish.',
        usage: 'Warm a few drops in your palms. Massage into skin, hair ends or scalp after bathing, then let the oil absorb before styling or dressing.',
        category: 'Oil',
        price: 15000,
        images: ['/products/coco-queens-coconut-oil.jpeg'],
        stock: 45,
        status: 'Published' as const,
        skinType: 'Dry skin / Hair shine / Scalp care',
        isRecurring: true,
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
        images: ['/products/coco-queens-scrub.jpeg'],
        stock: 60,
        status: 'Draft' as const,
        skinType: 'Body polish / Dull skin / Rough texture',
        isRecurring: false,
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
        images: ['/products/coco-queens-honey.jpeg'],
        stock: 30,
        status: 'Draft' as const,
        isRecurring: true,
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
        images: ['/products/coco-queens-essential-oil.jpeg'],
        stock: 120,
        status: 'Draft' as const,
        isRecurring: true,
      },
    ];

    for (const p of seedProducts) {
      await pool.query(
        `INSERT INTO products (id, name, description, ingredients, benefits, usage_notes, category, price, images, stock, status, skin_type, is_recurring)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.name, p.description, p.ingredients, p.benefits, p.usage, p.category,
          p.price, JSON.stringify(p.images), p.stock, p.status, p.skinType || '', p.isRecurring,
        ]
      );
    }

    // Seed review + rating for prod-1, matching the original data exactly.
    // We need a real user_id to satisfy the foreign key — use the dev/owner
    // account created above as the review author, same as the original
    // 'usr-sample' placeholder conceptually represented.
    const { rows: sampleUserRows } = await pool.query(
      "SELECT id FROM users WHERE email = 'cliffordkimaro12@gmail.com' LIMIT 1"
    );
    if (sampleUserRows[0]) {
      await pool.query(
        `INSERT INTO product_reviews (product_id, user_id, user_name, rating, comment, created_at)
         VALUES ('prod-1', $1, 'Amina Joseph', 5, 'Light, clean and perfect after showering. My hair ends feel much softer.', '2026-05-18T14:22:00Z')`,
        [sampleUserRows[0].id]
      );
    }

    // Set the seeded ratings directly (matches original static rating values,
    // since prod-2/3/4 start with zero reviews but a non-default rating).
    await pool.query("UPDATE products SET rating = 4.8 WHERE id = 'prod-1'");
    await pool.query("UPDATE products SET rating = 4.9 WHERE id = 'prod-2'");
    await pool.query("UPDATE products SET rating = 4.7 WHERE id = 'prod-3'");
    await pool.query("UPDATE products SET rating = 5.0 WHERE id = 'prod-4'");

    console.log(`Seeded ${seedProducts.length} initial products with reviews and ratings.`);
  }

  await pool.query(
    `UPDATE products
     SET price = 15000,
         images = $1,
         stock = GREATEST(stock, 1),
         status = 'Published'
     WHERE id = 'prod-1'`,
    [JSON.stringify(['/products/coco-queens-coconut-oil.jpeg'])]
  );
  await pool.query(
    `UPDATE products
     SET images = CASE id
       WHEN 'prod-2' THEN $1::jsonb
       WHEN 'prod-3' THEN $2::jsonb
       WHEN 'prod-4' THEN $3::jsonb
       ELSE images
     END,
     status = 'Draft'
     WHERE id IN ('prod-2','prod-3','prod-4')`,
    [
      JSON.stringify(['/products/coco-queens-scrub.jpeg']),
      JSON.stringify(['/products/coco-queens-honey.jpeg']),
      JSON.stringify(['/products/coco-queens-essential-oil.jpeg']),
    ]
  );

  const { rows: promoCountRows } = await pool.query('SELECT COUNT(*) FROM promotions');
  if (parseInt(promoCountRows[0].count, 10) === 0) {
    const seedPromotions = [
      { code: 'COCO10', discountPercent: 10, description: '10% off your Coco Queens ritual', minSpend: null, expiresAt: '2028-12-31' },
      { code: 'QUEEN20', discountPercent: 20, description: '20% off orders above TZS 70,000', minSpend: 70000, expiresAt: '2028-12-31' },
      { code: 'GLOW15', discountPercent: 15, description: '15% off golden glow essentials', minSpend: null, expiresAt: '2028-12-31' },
    ];
    for (const promo of seedPromotions) {
      await pool.query(
        `INSERT INTO promotions (code, discount_percent, description, min_spend, expires_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO NOTHING`,
        [promo.code, promo.discountPercent, promo.description, promo.minSpend, promo.expiresAt]
      );
    }
    console.log(`Seeded ${seedPromotions.length} initial promotions.`);
  }

  const { rows: blogCountRows } = await pool.query('SELECT COUNT(*) FROM blogs');
  if (parseInt(blogCountRows[0].count, 10) === 0) {
    const seedBlogs = [
      {
        id: 'blog-1',
        title: 'The Art of Slow Skincare: Transitioning to Clean Botanical Lipids',
        summary: 'Explore why cellular structures respond beautifully to organic oils, and how to sequence your natural skincare ritual to cultivate absolute radiancy.',
        content: 'In our fast-paced modern spaces, skincare transforms into a race. However, skin cells thrive under soft rhythms. Transitioning to clean botanical lipids like Rosehip, Bakuchiol, and Moringa Oil restores the skin\u2019s native microflora barrier. When molecules aren\u2019t constantly combatting harsh synthetic sulfates or artificial parabens, they optimize naturally. We recommend implementing a three-step evening sequence: warm, sweep, and touch. First, prepare pores using a clean warm cloth. Next, sweep pollutants away using an eucalyptus active cleansing balm. Finally, press 3 drops of botanical oil deeply onto skin tissues under rhythmic breathing. Experience the luxury of intentional recovery.',
        category: 'Skincare',
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop',
        readTime: '4 min read',
        date: 'June 05, 2026',
      },
      {
        id: 'blog-2',
        title: 'Sacred Sleep Traditions & The Alkaline Altar of Blue Lotus',
        summary: 'Discover the ancient history of sensory calming in royal Egyptian chambers and how Blue Lotus alkaloids activate deeper restorative patterns.',
        content: 'True beauty originates from high-fidelity rest. Throughout archaeological excavations, blue lotus petals are catalogued in dynastic chambers. Ancient Egyptian apothecaries recognized Blue Lotus as an elite calming sedative. Compounds like nuciferine and apomorphine interact subtly with neurological receptors, relaxing muscle contractions and lowering cortisol production. Incorporating high-grade Blue Lotus tea into a night transition ritual signals the brain to release melatonin, generating lucid dreams and cellular repair phases. Prepare your sleep chamber as an altar of silence.',
        category: 'Wellness Lifestyle',
        image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
        readTime: '6 min read',
        date: 'May 28, 2026',
      },
    ];
    for (const b of seedBlogs) {
      await pool.query(
        `INSERT INTO blogs (id, title, summary, content, category, image, read_time, posted_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [b.id, b.title, b.summary, b.content, b.category, b.image, b.readTime, b.date]
      );
    }
    console.log(`Seeded ${seedBlogs.length} initial blog posts.`);
  }

  const { rows: careerCountRows } = await pool.query('SELECT COUNT(*) FROM careers');
  if (parseInt(careerCountRows[0].count, 10) === 0) {
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
          'Exemplary spoken eloquence and high emotional intelligence.',
        ],
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
          'A passionate standard for zero-waste packaging aesthetics.',
        ],
      },
    ];
    for (const c of seedCareers) {
      await pool.query(
        `INSERT INTO careers (id, title, department, location, description, requirements)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.title, c.department, c.location, c.description, JSON.stringify(c.requirements)]
      );
    }
    console.log(`Seeded ${seedCareers.length} initial career listings.`);
  }
}
