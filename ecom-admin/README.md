# ECOM Admin Dashboard

Separate admin app for the NONSENSE storefront. Admin auth stays in this service; catalog and orders are proxied to `ecom-web` via a BFF layer.

## Architecture

```
Admin UI (5176) → Admin API (5004) → Storefront API (5000)
                      ↓
                 ecom-admin DB (users)
```

| App | Role |
|-----|------|
| `ecom-web` | Customer storefront + product/order system of record |
| `ecom-admin/client` | Admin dashboard UI |
| `ecom-admin/server` | Admin auth + proxy to ecom-web |

## Quick start

### 1. Start storefront API (if not running)

```bash
cd ../ecom-web
pnpm db:up          # Mongo on :27017
pnpm db:seed        # products + storefront admin user
pnpm dev            # web :3000, api :5000
```

### 2. Configure admin bridge

Copy `JWT_SECRET` from `ecom-web/.env` into `ecom-admin/server/.env`:

```env
ECOM_WEB_API_URL=http://localhost:5000/api
ECOM_WEB_JWT_SECRET=<same as ecom-web JWT_SECRET>
```

Resolve the storefront admin user id:

```bash
cd ecom-admin
pnpm resolve:ecom
# Copy ECOM_WEB_ADMIN_USER_ID=... into server/.env
```

### 3. Run admin

```bash
pnpm install
pnpm seed           # admin@nonsense.store / Admin@1234
pnpm dev            # client :5176, server :5004
```

Sign in at http://localhost:5176 — Dashboard, Products, and Orders load live data from ecom-web.

## Admin API routes (BFF)

| Route | Proxies to |
|-------|------------|
| `GET /api/v1/dashboard/stats` | `GET /api/admin/stats` |
| `GET /api/v1/products` | `GET /api/admin/products` |
| `POST /api/v1/products` | `POST /api/admin/products` |
| `GET /api/v1/orders` | `GET /api/admin/orders` |
| `PATCH /api/v1/orders/:id/status` | `PATCH /api/admin/orders/:id` |

Auth routes (`/api/v1/auth/*`) remain local to ecom-admin.

## Ports

| Service | Port |
|---------|------|
| Admin client | 5176 |
| Admin API | 5004 |
| Storefront web | 3000 |
| Storefront API | 5000 |

## Scaling later

Deploy `ecom-admin` and `ecom-web` as separate services. Keep `ECOM_WEB_API_URL` pointing at the internal storefront API URL in production.
