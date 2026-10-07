# Auth API — `/api/v1/auth`

Production authentication module for the ecom-admin panel.

## Authentication model

- **Access token**: short-lived JWT (default 15m), stored in `HttpOnly` cookie `access_token`
- **Refresh token**: opaque rotating token in `HttpOnly` cookie `refresh_token` (path `/api/v1/auth`)
- **CSRF**: double-submit via `csrf_token` cookie + `X-CSRF-Token` header
- **Sessions**: server-side MongoDB documents with hashed refresh tokens

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | Public | Email + password login |
| POST | `/refresh` | Cookie | Rotate refresh token, issue new access token |
| POST | `/logout` | Yes + CSRF | Revoke current session |
| POST | `/logout-all` | Yes + CSRF | Revoke all sessions |
| GET | `/me` | Yes | Current user + permissions |
| PUT | `/change-password` | Yes + CSRF | Change password (invalidates other sessions) |
| POST | `/forgot-password` | Public | Request password reset email |
| POST | `/reset-password` | Public | Reset password with token |
| POST | `/verify-email` | Public | Verify email with token |
| GET | `/sessions` | Yes | List active sessions |
| DELETE | `/sessions/:id` | Yes + CSRF | Revoke one session |
| DELETE | `/sessions` | Yes + CSRF | Revoke all other sessions |
| POST | `/admin/invitations` | `admin:create` | Invite new admin |
| POST | `/admin/invitations/accept` | Public | Accept invitation + set password |
| POST | `/register` | `admin:create` | **Deprecated** — use invitations |

## Error format

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

## Common error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Bad email/password |
| `AUTH_UNAUTHENTICATED` | 401 | Missing/invalid access token |
| `AUTH_UNAUTHORIZED` | 403 | Missing permission |
| `AUTH_ACCOUNT_LOCKED` | 423 | Too many failed logins |
| `AUTH_CSRF_INVALID` | 403 | Missing/invalid CSRF token |
| `AUTH_REFRESH_REUSE` | 401 | Refresh token reuse detected |
| `AUTH_RATE_LIMITED` | 429 | Rate limit exceeded |

## RBAC permissions

Roles map to granular permissions in `server/src/config/permissions.js`.

Middleware usage:

```js
const { authenticate } = require('./auth/middleware/authenticate');
const { authorize } = require('./auth/middleware/authorize');
const { PERMISSIONS } = require('./config/permissions');

router.post('/products', authenticate, authorize(PERMISSIONS.PRODUCT_CREATE), handler);
```

## Environment

See `server/.env.example` for all variables.

Production requirements:
- `JWT_PRIVATE_KEY` + `JWT_PUBLIC_KEY` (RS256) or strong `JWT_SECRET`
- `REDIS_URL` for distributed rate limiting
- `EMAIL_PROVIDER_API_KEY` for password reset / invitations
- `ADMIN_APP_URL` + `CORS_ORIGINS`
- HTTPS (Secure cookies)

## Tests

```bash
cd server && pnpm test
```
