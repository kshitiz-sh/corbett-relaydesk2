# RelayDesk Production Package

RelayDesk is a multi-client WhatsApp AI operations portal for configuring client bots, reviewing conversations, confirming bookings, sending host replies, and exporting reports.

## Production status

This package is hardened for production deployment when the required infrastructure and secrets are configured. It now has strict production environment validation, mandatory Supabase persistence, explicit session and admin secrets, authenticated and client-scoped management APIs, mandatory Meta signature verification, durable webhook deduplication, rate-limited portal login, secure production cookies, and a patched build toolchain.

## Verification

```bash
npm install
npm run lint
npm run build
npm audit --omit=dev
```

The runtime dependency audit should report zero vulnerabilities. Vite is a development/build dependency and is not installed in a runtime-only production install.

## Required production setup

Run `supabase/schema.sql`, configure every variable in `.env.example` in Vercel, deploy with `npx vercel --prod`, verify `/api/health`, then configure Meta’s webhook at `/api/webhook/whatsapp`. Read `DEPLOY_VERCEL_SUPABASE.md` for the complete procedure.

Never commit `.env`, Supabase service-role keys, Meta tokens, Gemini keys, session secrets, admin tokens, or customer conversation exports.
