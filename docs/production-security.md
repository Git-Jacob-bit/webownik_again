# Webownik on TrueNAS: production checklist

The stack created by `supabase start` is for development only. Production runs from
`deploy/compose.yaml` as a single TrueNAS "Install via YAML" app (see `DEPLOY_TRUENAS.md`): a
minimal Supabase (Postgres + GoTrue Auth), the migration job, FastAPI, nginx and `cloudflared`.

## Network boundary

Exactly one service is reachable from the Internet: `web:8080`, through the app's own Cloudflare
Tunnel. No container publishes ports. Do not add Tunnel public hostnames for `api`, `auth` or `db`.

| Network | Members | Internet egress |
| --- | --- | --- |
| `backend` | db, migrate, auth, api | yes (Resend SMTP, Turnstile, GitHub) |
| `frontend` | web, api, auth | no (`internal: true`, fixed subnet) |
| `tunnel` | web, cloudflared | yes |

nginx proxies `/api/*` to FastAPI and only `GET /supabase-auth/verify` to GoTrue — the callback
used by confirmation and password-recovery emails. Every other Auth operation goes through FastAPI.

FastAPI accepts `CF-Connecting-IP` only from `TRUSTED_PROXY_CIDRS` (the `frontend` subnet);
anything else is rate limited by its real source address.

## Database roles

- `supabase_admin` (superuser of `supabase/postgres`) — used only by the `migrate` job.
- `supabase_auth_admin` — GoTrue; its password is set by `migrate` (`deploy/migrate/roles.sql`).
- `webownik_app` — FastAPI; DML on application tables only, `BYPASSRLS` because RLS is enabled
  without policies.

## Secrets

`scripts/render-truenas-compose.py` generates the database passwords, the JWT secret and the
`anon`/`service_role` keys, and reads the Resend API key, Turnstile secret, tunnel token and
optional GitHub token without echo. The rendered file is written outside the repository with mode
600. Keep it in an encrypted secret store; never commit it or paste it into chats or issues.

Do not reuse keys printed by the local Supabase CLI.

## Supabase Auth (GoTrue)

Configured in `deploy/compose.yaml`:

- email confirmation required (`GOTRUE_MAILER_AUTOCONFIRM=false`), phone and anonymous sign-in off;
- password policy: 8+ characters with lower case, upper case and digits;
- refresh token rotation, secure email change, reauthentication for password updates;
- one-hour access tokens;
- `GOTRUE_MAILER_URLPATHS_*=/supabase-auth/verify` — GoTrue builds links with
  `url.ResolveReference`, so this absolute path replaces the path of `API_EXTERNAL_URL`.

All logins reach GoTrue from the `api` container, so GoTrue's per-IP limits are effectively global
and are raised accordingly; per-client limits are enforced by FastAPI.

## Resend SMTP

`smtp.resend.com:587` (STARTTLS), user `resend`, password = API key with *Sending access* only,
sender in the verified domain. Disable click and open tracking for the sending domain so one-time
links are not rewritten.

## Cloudflare

Turnstile: the site key is public and baked into the `webownik-web` image (GitHub variable
`TURNSTILE_SITE_KEY`); the secret key is validated by FastAPI.

Recommended WAF rate limits:

- `POST /api/auth/token`: 5 failed requests per minute per IP, then Managed Challenge.
- `POST /api/auth/register`: 3 requests per 10 minutes per IP.
- `POST /api/auth/forgot-password`: 3 requests per hour per IP.
- `POST /api/decks/upload-form`: 10 requests per hour per IP.
- `POST /api/decks/*/translate`: 10 requests per hour per IP.
- A broader API exhaustion limit suitable for expected usage.

## Operations

- Third-party images (`supabase/postgres`, `supabase/gotrue`) are pinned; update them deliberately
  and test the stack (CI runs the whole compose file before publishing application images).
- Back up PostgreSQL with `scripts/backup-db.sh` plus TrueNAS snapshots. Keep an off-device copy and
  perform restore tests.
- Monitor container health, authentication failures, disk usage, backup age and Tunnel status.
- FastAPI docs and SQL debug logging are disabled when `ENVIRONMENT=production`.
- Application containers run read-only, non-root, without Linux capabilities, with memory and PID
  limits and healthchecks.
