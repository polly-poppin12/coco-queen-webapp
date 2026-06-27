<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/products/coco-queens-coconut-oil.jpg">
    <img width="800" alt="Coco Queens — Pure organic beauty" src="public/products/coco-queens-coconut-oil.jpg" style="border-radius:12px;max-width:100%;">
  </picture>
</div>

<h1 align="center">Coco Queens 👑</h1>
<p align="center"><em>Nature's Finest, Queen Approved</em></p>

<p align="center">
  <strong>Pure organic beauty, handcrafted in Tanzania.</strong><br>
  Extra virgin coconut oil • Exfoliating scrubs • Pure raw honey • Essential oils<br>
  No chemicals. No compromises. Just you, at your most radiant.
</p>

---

## About

Coco Queens is an e-commerce web application for a Tanzanian organic beauty brand. Built with **Express** + **Postgres** + **Stripe**, it serves a single-page frontend with product listings, user authentication, shopping cart, and Stripe Checkout payments.

### Features

- **Product catalog** — Extra virgin coconut oil, exfoliating scrub, raw honey, essential oils
- **User auth** — Register, login, email verification, password reset
- **Shopping cart** — LocalStorage-persisted, envelope-style popup with gold wax seal
- **Stripe Checkout** — Secure payment processing (test mode)
- **Loyalty program** — Points earned on signup and reviews
- **Referral system** — Referral codes for bonus loyalty points
- **Admin dashboard** — Product management, order fulfillment, analytics
- **Security hardened** — CSP nonces, bcrypt, DB rate limiter, Stripe webhook, input validation, XSS sanitization

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express 4 + TypeScript (tsx) |
| Database | Postgres (Neon) |
| Payments | Stripe Checkout + Webhooks |
| Security | Helmet (CSP), bcryptjs, DOMPurify |
| Frontend | Vanilla JS (single-page HTML) |

## Quick Start

**Prerequisites:** Node.js 18+, Postgres database (Neon recommended)

```bash
# 1. Clone and install
git clone https://github.com/polly-poppin12/coco-queen-webapp.git
cd coco-queen-webapp
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL, Stripe keys, and secrets

# 3. Apply the database schema
# Run schema.sql against your Postgres database (Neon SQL Editor, psql, etc.)

# 4. Start the server
npm run dev
```

Then open **http://localhost:3000** in your browser.

## Environment Variables

See [.env.example](.env.example) for the full list. Required:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `HMAC_SECRET` | Secret for request signing |
| `OWNER_BOOTSTRAP_PASSWORD` | Initial owner account password |
| `ADMIN_BOOTSTRAP_PASSWORD` | Initial admin account password |

## Security

All findings from a comprehensive security audit have been addressed:

| Priority | Finding | Status |
|----------|---------|--------|
| P0 | SSL verification, code/token leaks in API | ✅ Fixed |
| P1 | CSP nonces, bcrypt hashing, DB rate limiter, HMAC, session hash | ✅ Fixed |
| P2 | DOMPurify, Stripe webhook, input validation | ✅ Fixed |
| P3 | Deps cleanup, .env.example | ✅ Fixed |

## License

Private — Coco Queens
