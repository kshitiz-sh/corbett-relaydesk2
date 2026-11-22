# RelayDesk — Production Deployment (Vercel + Supabase)

This package contains the RelayDesk agency studio, secure client portal, WhatsApp simulator, durable conversation storage, webhook processing, booking alerts, and reports.

## 1. Create Supabase tables

Run `supabase/schema.sql` in the Supabase SQL Editor. It creates locked tables for clients, conversations, webhook logs, and durable webhook receipts. Keep Row Level Security enabled. The application uses only the server-side `SUPABASE_SERVICE_ROLE_KEY`; never expose that key to browser code.

## 2. Generate secrets

Generate unique values for `SESSION_SECRET`, `ADMIN_ACCESS_TOKEN`, `INITIAL_CLIENT_PASSWORD`, and `WHATSAPP_VERIFY_TOKEN`. Do not use values from old documentation, screenshots, source code, or chat messages. `SESSION_SECRET` and `ADMIN_ACCESS_TOKEN` must each be at least 32 characters; the initial client password must be at least 12 characters.

## 3. Configure Vercel environment variables

Set these for Production, Preview, and Development as appropriate:

- `NODE_ENV=production`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `ADMIN_ACCESS_TOKEN`
- `INITIAL_CLIENT_PASSWORD`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `APP_URL`

The server refuses to start in production when any required secret is missing. Local JSON storage is disabled in production.

## 4. Deploy

```bash
npm install
npm run lint
npm run build
npx vercel --prod
```

Verify `https://YOUR_DOMAIN/api/health` returns `ok: true`, `storage: "supabase"`, and all required integrations configured. Never treat a deployment as ready if health reports a missing integration.

## 5. Configure Meta WhatsApp

In Meta Developer Dashboard:

- Callback URL: `https://YOUR_DOMAIN/api/webhook/whatsapp`
- Verify token: the exact `WHATSAPP_VERIFY_TOKEN` value
- Subscribe to the `messages` field
- Confirm the app secret is configured in Vercel as `WHATSAPP_APP_SECRET`
- Use a long-lived system-user WhatsApp access token

The webhook rejects unsigned or incorrectly signed requests. Webhook message IDs are deduplicated durably in Supabase so retries and serverless cold starts do not produce duplicate replies.

## 6. Access control

Client portal users sign in through:

```text
https://YOUR_DOMAIN/?client=corbett-rajae-homestay&portal=1
```

The first seeded client uses the value supplied in `INITIAL_CLIENT_PASSWORD`; there is no hardcoded production password. Change it after first login through the portal.

Agency-only APIs require the `ADMIN_ACCESS_TOKEN` as either:

```text
Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN
```

or:

```text
X-RelayDesk-Admin-Token: YOUR_ADMIN_ACCESS_TOKEN
```

Do not put the admin token in frontend source code, public URLs, or client-facing links.

## Production readiness checks

Before accepting live traffic, verify: dependency installation and `npm run lint` pass; Supabase tables exist; `/api/health` is healthy; invalid signatures return 401; management APIs reject unauthenticated requests; one client cannot read another client’s conversations; login rate limiting works; duplicate Meta deliveries create one conversation exchange; WhatsApp send failures are recorded; and backups/monitoring are configured.

The application does not provide live room inventory, payment collection, or secure identity-document handling. Exact availability, deposits, permits, and payment must remain with the host or a trusted booking system.
