# Webownik on TrueNAS: production checklist

The stack created by `supabase start` is for development only. On TrueNAS deploy the official
self-hosted Supabase Docker Compose stack, generate fresh production secrets, and then deploy
Webownik with `docker-compose.prod.yml`.

## Network boundary

Expose exactly one service through Cloudflare Tunnel: `frontend:8080`. Nginx serves the SPA and
proxies `/api/*` to FastAPI. Do not create Tunnel public hostnames for PostgreSQL, Supabase Studio,
Mailpit, Kong, PostgREST, or the FastAPI container.

- If `cloudflared` is a container, attach it to the private `tunnel` network and use
  `http://frontend:8080` as the tunnel service. Remove the `ports` block from `frontend` if LAN access
  to the application is not needed.
- If `cloudflared` runs on the TrueNAS host, bind the frontend to `127.0.0.1:5000` and point the
  tunnel to `http://127.0.0.1:5000`.
- Publish Studio only on the TrueNAS LAN address and restrict it to the trusted Wi-Fi subnet with
  the TrueNAS firewall. Never route Studio through the public tunnel. Use a strong random
  `DASHBOARD_PASSWORD` even on LAN.
- Do not publish PostgreSQL port 5432. FastAPI connects to `db:5432` over the private Supabase
  Docker network.

The only public Supabase route in the supplied Nginx config is a read-only callback path used by
confirmation and password-recovery emails: `/supabase-auth/*`.

Run migrations with an administrative database account, then execute
`docs/create-app-db-role.sql`. FastAPI must connect as `webownik_app`, never as `postgres`.

## Required production secrets

Do not reuse keys printed by local Supabase CLI. Generate all values using the scripts included in
the official self-hosting bundle:

- PostgreSQL password
- dashboard username and password
- publishable and secret API keys
- asymmetric JWT signing keys
- Realtime and pooler secrets

Store `.env.production` and the Supabase `.env` outside Git. Back them up in an encrypted secret
store. Fill `.env.production` from `.env.production.example`.

## Supabase Auth

Configure the production Supabase Auth service with:

```env
SITE_URL=https://webownik.example.pl
API_EXTERNAL_URL=https://webownik.example.pl/supabase-auth
ADDITIONAL_REDIRECT_URLS=https://webownik.example.pl/email-confirmed,https://webownik.example.pl/reset-password
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED=true
GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION=true
```

Keep access tokens short lived (the current one-hour lifetime is reasonable) and keep refresh token
rotation enabled.

## Resend SMTP

Resend is the service previously used by this project. Verify the sending domain in Resend, create a
dedicated API key, and configure the production Supabase `.env`:

```env
SMTP_ADMIN_EMAIL=auth@webownik.example.pl
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=REPLACE_WITH_RESEND_API_KEY
SMTP_SENDER_NAME=Webownik
```

Port 587 uses STARTTLS. Never put `SMTP_PASS` in the frontend or commit it. Configure SPF and DKIM
records shown by Resend. Test registration confirmation, password recovery, and password-change
notifications before opening registration publicly.

## Cloudflare

Create Turnstile keys for the public hostname and set:

```env
# Webownik backend
TURNSTILE_SECRET_KEY=...

# Frontend build argument
VITE_TURNSTILE_SITE_KEY=...
```

The secret key is validated by FastAPI. The site key is public. Add Cloudflare WAF rate limits for:

- `POST /api/auth/token`: start with 5 failed requests per minute per IP, then Managed Challenge.
- `POST /api/auth/register`: 3 requests per 10 minutes per IP.
- `POST /api/auth/forgot-password`: 3 requests per hour per IP.
- `POST /api/decks/upload-form`: 10 requests per hour per IP.
- `POST /api/decks/*/translate`: 10 requests per hour per IP.
- A broader API exhaustion limit suitable for expected usage.

Only trust `CF-Connecting-IP` while the origin is inaccessible outside the tunnel. Do not open the
frontend or API ports on the router.

## Operations

- Pin image versions and schedule regular Supabase, application, TrueNAS, and Cloudflare Tunnel
  updates.
- Back up PostgreSQL with scheduled `pg_dump` plus TrueNAS snapshots. Keep at least one encrypted
  off-device copy and perform a restore test.
- Monitor container health, authentication failures, disk usage, backup age, and Tunnel status.
- Disable FastAPI docs and SQL debug logging in production (controlled by `ENVIRONMENT=production`).
- Run dependency and image vulnerability scans before releases.
- Review users in Studio only from the trusted LAN.
- Keep the application containers read-only, non-root, without Linux capabilities, and enforce
  the CPU, memory, PID limits and healthchecks defined in `docker-compose.prod.yml`.
