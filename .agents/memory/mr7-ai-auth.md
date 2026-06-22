---
name: mr7-ai auth system
description: Full JWT auth system for KaliGPT/mr7.ai — architecture, key decisions, and integration points
---

## Auth architecture
- **Tokens**: JWT access (1h, signed with JWT_SECRET) + random hex refresh (30d, stored as SHA-256 hash in DB)
- **Refresh rotation**: On every refresh, old session_token swapped for new one in `user_sessions` table
- **Brute-force**: 5 failed attempts → 15min lockout (`locked_until` column on `users`)
- **TOTP**: `otplib` (dynamic import) — secret stored in `users.totp_secret`; enabled flag in `users.totp_enabled`

## API routes (all at /api/auth/*)
- POST register, login (with TOTP), refresh, logout
- POST verify-email, resend-verify, forgot-password, reset-password
- GET/PUT me (profile)
- GET/DELETE sessions, DELETE sessions/:id
- GET security-events
- POST totp/setup, totp/verify, DELETE totp

## Frontend
- `artifacts/mr7-ai/src/lib/auth.ts` — full client library with all API calls + getEventLabel() helper
- `artifacts/mr7-ai/src/hooks/useAuth.tsx` — hook with user, loading, refresh, signOut; dispatches mr7:auth events
- `artifacts/mr7-ai/src/components/modals/AuthModal.tsx` — 5 states: login, register, forgot, reset, totp
- `artifacts/mr7-ai/src/pages/AccountSettingsPage.tsx` — 5 tabs: profile, security (2FA QR), sessions, events, notifications
- `artifacts/mr7-ai/src/components/UserMenu.tsx` — shows real user data, onLogin prop for guests

## Key decisions
**Why custom auth (not Replit Auth):** User explicitly requested Feature #1 = Full Authentication System with 2FA, sessions, security events, brute-force protection.

**Why SHA-256 hash for refresh token:** Prevents DB dump from leaking usable tokens.

**How to apply:** Any new auth-gated route needs `jwtAuth, requireAuth` middleware from `middlewares/jwtAuth.ts`.
