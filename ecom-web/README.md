# ecom-app

Monorepo for a tee brand (NONSENSE). Built so a React Native app can share the same API later.

## Structure

```
apps/web       Next.js storefront (Mantine + SCSS)
apps/api       Fastify REST API + Mongoose (MongoDB)
packages/shared  Zod schemas + shared constants
```

## Stack

- **Auth:** Google ID token + phone OTP (MSG91-ready; logs OTP in dev)
- **Payments:** Razorpay (mock pay when keys are missing)
- **Catalog:** Men / Women designer tees with size variants
- **Commerce:** Cart, checkout, orders, admin product/order endpoints
- **Database:** MongoDB via Mongoose

## Quick start

### 1. Env

```bash
cp .env.example .env
```

### 2. Start MongoDB

```bash
pnpm db:up
# or: docker compose up -d mongo
```

Or point `DATABASE_URL` at a MongoDB Atlas cluster.

### 3. Install & seed

```bash
pnpm install
pnpm db:seed
```

### 4. Run

```bash
pnpm dev
```

- Storefront: http://localhost:3000  
- API: http://localhost:5000/health  

Phone login in dev returns `devCode` in the API response and logs the OTP to the API console.

## API map

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/otp/send` | — |
| POST | `/api/auth/otp/verify` | — |
| POST | `/api/auth/google` | — |
| GET | `/api/auth/me` | JWT |
| GET | `/api/products` | — |
| GET | `/api/products/:slug` | — |
| GET/POST/PATCH/DELETE | `/api/cart…` | JWT |
| POST | `/api/checkout` | JWT |
| POST | `/api/payments/verify` | JWT |
| GET | `/api/orders` | JWT |
| GET/POST/PATCH | `/api/admin/…` | Admin JWT |

## React Native later

Point the RN app at the same `API_URL`, store the JWT from OTP/Google, and reuse `@forma/shared` validators. No Next-only auth coupling.

## Brand

Brand name: **NONSENSE**. Configured via `.env` (`NEXT_PUBLIC_APP_NAME`) and `apps/web/src/constants/site.js`.
