# Webownik — wdrożenie produkcyjne na TrueNAS

Ten dokument jest checklistą wdrożenia Webownika za Cloudflare Tunnel. Przykładową domenę `webownik.example.pl` zastąp własną domeną.

## 1. Wymagania

- TrueNAS SCALE z Dockerem/Apps oraz Docker Compose.
- Działający self-hosted Supabase (Postgres, Auth i Kong).
- Domena obsługiwana przez Cloudflare.
- Konto Resend z dodaną i zweryfikowaną domeną wysyłkową.
- Cloudflare Turnstile dla domeny aplikacji.
- Repozytorium GitHub `Git-Jacob-bit/webownik_again`.

Nie wystawiaj bezpośrednio do Internetu portów Postgresa, Supabase Studio, backendu ani kontenera Auth. Publiczny ruch powinien trafiać wyłącznie do frontendu Nginx przez Cloudflare Tunnel.

## 2. Pobranie aplikacji

```bash
git clone https://github.com/Git-Jacob-bit/webownik_again.git
cd webownik_again
cp .env.production.example .env.production
```

Plik `.env.production` zawiera sekrety i nie może być commitowany. Jest już ignorowany przez Git.

## 3. Konfiguracja `.env.production`

Ustaw co najmniej:

```env
ENVIRONMENT=production
DOMAIN=https://webownik.example.pl
CORS_ORIGINS=https://webownik.example.pl
ALLOWED_HOSTS=webownik.example.pl,api
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
TRUSTED_PROXY_CIDRS=172.31.250.0/24
WEBOWNIK_INTERNAL_SUBNET=172.31.250.0/24

DATABASE_URL=postgresql://webownik_app:BARDZO_MOCNE_HASLO@db:5432/postgres
SUPABASE_URL=http://kong:8000
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...

TURNSTILE_SECRET_KEY=...
VITE_TURNSTILE_SITE_KEY=...

GITHUB_REPOSITORY=Git-Jacob-bit/webownik_again
GITHUB_TOKEN=...

WEB_BIND_ADDRESS=127.0.0.1
WEB_PORT=5000
SUPABASE_NETWORK=supabase_default
CLOUDFLARE_NETWORK=cloudflare_default
```

Wymagania:

- `DOMAIN` bez końcowego ukośnika.
- `SUPABASE_SECRET_KEY` nigdy nie może trafić do frontendu.
- `GITHUB_TOKEN` powinien być fine-grained, ograniczony do jednego repozytorium i uprawnienia `Issues: Read and write`. Docelowo zastąp go GitHub App.
- Nazwy zewnętrznych sieci sprawdź poleceniem `docker network ls`.
- `WEBOWNIK_INTERNAL_SUBNET` to podsieć prywatnej sieci nginx → API, a `TRUSTED_PROXY_CIDRS` musi mieć tę samą wartość. Tylko z niej backend przyjmuje nagłówek `CF-Connecting-IP`, więc inne kontenery z sieci Supabase nie mogą podszyć się pod cudzy adres IP i obejść limitów. Jeśli podsieć koliduje z istniejącą siecią (`docker network inspect`), zmień obie wartości.

## 4. Supabase Auth i publiczne callbacki

W pliku `.env` używanym przez self-hosted Supabase ustaw:

```env
SITE_URL=https://webownik.example.pl
API_EXTERNAL_URL=https://webownik.example.pl/supabase-auth
ADDITIONAL_REDIRECT_URLS=https://webownik.example.pl/email-confirmed,https://webownik.example.pl/reset-password
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false

# Ścieżka linku w mailach. Musi wskazywać na publiczną trasę nginx Webownika.
MAILER_URLPATHS_CONFIRMATION="/supabase-auth/verify"
MAILER_URLPATHS_INVITE="/supabase-auth/verify"
MAILER_URLPATHS_RECOVERY="/supabase-auth/verify"
MAILER_URLPATHS_EMAIL_CHANGE="/supabase-auth/verify"
```

> **Uwaga:** domyślny `.env` self-hosted Supabase ma `MAILER_URLPATHS_*="/auth/v1/verify"`. Supabase Auth składa link przez `ResolveReference`, więc ścieżka bezwzględna z `MAILER_URLPATHS_*` **zastępuje** ścieżkę z `API_EXTERNAL_URL` (domena zostaje). Bez powyższej zmiany link miałby postać `https://webownik.example.pl/auth/v1/verify?...` i zamiast potwierdzenia/resetu otworzyłby stronę główną aplikacji.

W zależności od wersji obrazu Supabase odpowiadają im ustawienia kontenera Auth:

```yaml
GOTRUE_SITE_URL: https://webownik.example.pl
API_EXTERNAL_URL: https://webownik.example.pl/supabase-auth
GOTRUE_URI_ALLOW_LIST: https://webownik.example.pl/email-confirmed,https://webownik.example.pl/reset-password
GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
GOTRUE_MAILER_AUTOCONFIRM: "false"
GOTRUE_MAILER_URLPATHS_CONFIRMATION: /supabase-auth/verify
GOTRUE_MAILER_URLPATHS_INVITE: /supabase-auth/verify
GOTRUE_MAILER_URLPATHS_RECOVERY: /supabase-auth/verify
GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: /supabase-auth/verify
```

Nginx Webownika udostępnia publicznie tylko `GET /supabase-auth/verify`, potrzebne do kliknięcia linku z wiadomości. Operacje zmieniające dane Auth przechodzą przez backend Webownika.

Po zmianie konfiguracji uruchom ponownie kontener Supabase Auth.

## 5. Resend jako SMTP Supabase

### Konfiguracja Resend

1. Dodaj domenę lub subdomenę wysyłkową, np. `mail.example.pl`.
2. Dodaj w Cloudflare rekordy DNS pokazane przez Resend (DKIM/SPF oraz wymagany rekord zwrotny).
3. Poczekaj na status `Verified` w Resend.
4. Utwórz osobny API key tylko dla Webownika.

### Konfiguracja kontenera Supabase Auth

W oficjalnym `docker-compose.yml` Supabase dane SMTP są przekazywane z `.env` Supabase. Ustaw tam:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_TWOJ_KLUCZ_API
SMTP_ADMIN_EMAIL=no-reply@mail.example.pl
SMTP_SENDER_NAME=Webownik
```

`SMTP_ADMIN_EMAIL` to adres nadawcy — musi być w domenie zweryfikowanej w Resend. Limit częstotliwości (`GOTRUE_SMTP_MAX_FREQUENCY`) jest w oficjalnym compose zakomentowany; odkomentuj go w usłudze `auth` albo dodaj przez `docker-compose.override.yml` (patrz niżej).

Jeśli konfigurujesz kontener Auth bezpośrednio, odpowiadają temu zmienne:

```yaml
GOTRUE_SMTP_HOST: smtp.resend.com
GOTRUE_SMTP_PORT: "587"
GOTRUE_SMTP_USER: resend
GOTRUE_SMTP_PASS: RE_SECRET_API_KEY
GOTRUE_SMTP_ADMIN_EMAIL: no-reply@mail.example.pl
GOTRUE_SMTP_SENDER_NAME: Webownik
GOTRUE_SMTP_MAX_FREQUENCY: 60s
```

Port `587` korzysta z STARTTLS. Alternatywnie Resend obsługuje port `465` z implicit TLS, jeżeli konfiguracja obrazu Auth jest do niego przystosowana.

Klucz Resend zapisuj wyłącznie w sekretach/zmiennych środowiskowych Supabase. Nie dodawaj go do `.env.production` Webownika, ponieważ wiadomości wysyła Supabase Auth, a nie frontend ani FastAPI.

### Szablony wiadomości

Aplikacja publikuje gotowe dwujęzyczne szablony:

- `https://webownik.example.pl/email-templates/confirmation.html`
- `https://webownik.example.pl/email-templates/recovery.html`

Po pierwszym uruchomieniu frontendu możesz wskazać je w Auth. Oficjalny compose Supabase nie przekazuje tych zmiennych, więc dodaj je w `docker-compose.override.yml` obok `docker-compose.yml` Supabase:

```yaml
services:
  auth:
    environment:
      GOTRUE_SMTP_MAX_FREQUENCY: 60s
      GOTRUE_MAILER_TEMPLATES_CONFIRMATION: https://webownik.example.pl/email-templates/confirmation.html
      GOTRUE_MAILER_SUBJECTS_CONFIRMATION: Potwierdź konto w Webowniku / Confirm your Webownik account
      GOTRUE_MAILER_TEMPLATES_RECOVERY: https://webownik.example.pl/email-templates/recovery.html
      GOTRUE_MAILER_SUBJECTS_RECOVERY: Reset hasła w Webowniku / Reset your Webownik password
```

Odpowiednie zmienne kontenera Auth:

```yaml
GOTRUE_MAILER_TEMPLATES_CONFIRMATION: https://webownik.example.pl/email-templates/confirmation.html
GOTRUE_MAILER_SUBJECTS_CONFIRMATION: Potwierdź konto w Webowniku / Confirm your Webownik account
GOTRUE_MAILER_TEMPLATES_RECOVERY: https://webownik.example.pl/email-templates/recovery.html
GOTRUE_MAILER_SUBJECTS_RECOVERY: Reset hasła w Webowniku / Reset your Webownik password
```

Supabase Auth pobiera szablony przez HTTP, dlatego adresy muszą być osiągalne podczas restartu Auth. Jeżeli pobranie się nie powiedzie, Supabase użyje szablonu domyślnego. Po zmianie szablonów zrestartuj Auth.

W Resend wyłącz śledzenie linków dla wiadomości uwierzytelniających — przepisywanie URL może uszkodzić jednorazowe linki Supabase.

## 6. Cloudflare Turnstile

1. Utwórz widget dla właściwej domeny.
2. Publiczny Site Key wpisz jako `VITE_TURNSTILE_SITE_KEY`.
3. Secret Key wpisz jako `TURNSTILE_SECRET_KEY`.
4. Po zmianie Site Key przebuduj frontend — jest wstrzykiwany podczas budowania obrazu.

## 7. Cloudflare Tunnel

Najprostszy wariant, gdy `cloudflared` jest w tej samej sieci Docker:

```yaml
ingress:
  - hostname: webownik.example.pl
    service: http://frontend:8080
  - service: http_status:404
```

Kontener `cloudflared` i frontend muszą należeć do sieci wskazanej przez `CLOUDFLARE_NETWORK`.

Jeśli Tunnel działa bezpośrednio na hoście TrueNAS, skieruj go na `http://127.0.0.1:5000`. Nie zmieniaj `WEB_BIND_ADDRESS` na `0.0.0.0`, jeśli nie jest to konieczne.

Włącz w Cloudflare tryb SSL/TLS `Full (strict)` i HTTPS. Nie konfiguruj osobnego publicznego hosta dla API ani Supabase.

## 8. Baza danych i migracje

Przed pierwszym uruchomieniem i przy każdej aktualizacji wykonaj nowe migracje z katalogu `supabase/migrations` w kolejności nazw plików. Bez `0005_translation_queue_and_indexes.sql` uruchomienie tłumaczenia kończy się błędem bazy.

Następnie, jako administrator Postgresa, uruchom `docs/create-app-db-role.sql` po zastąpieniu hasła `CHANGE_ME_STRONG_DATABASE_PASSWORD`. Backend musi łączyć się jako `webownik_app`, a nie `postgres`. Konto migracyjne zachowaj oddzielnie i nie przekazuj go kontenerowi aplikacji.

### Kopie zapasowe

`scripts/backup-db.sh` zapisuje zrzut schematów `public` i `auth`, sprawdza go przez `pg_restore --list` i usuwa kopie starsze niż `RETENTION_DAYS` (domyślnie 14 dni). W TrueNAS dodaj zadanie *System → Advanced → Cron Jobs*:

```bash
BACKUP_DIR=/mnt/tank/backups/webownik /mnt/tank/apps/webownik_again/scripts/backup-db.sh
```

Jeśli kontener bazy nazywa się inaczej niż `supabase-db`, ustaw `DB_CONTAINER`. Katalog z kopiami obejmij snapshotami lub replikacją ZFS poza tę samą pulę.

Uruchom skrypt ręcznie przed każdą aktualizacją. Raz na jakiś czas sprawdź odtworzenie na osobnej, pustej instancji Postgresa:

```bash
pg_restore --clean --if-exists --no-owner -d postgres webownik-YYYYMMDDTHHMMSSZ.dump
```

## 9. Budowa i uruchomienie

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build --pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 api frontend
```

Sprawdź wynik `docker compose --env-file .env.production -f docker-compose.prod.yml config`. API i frontend powinny mieć `read_only`, `cap_drop: ALL`, limity pamięci/CPU i healthchecki.

Argos Translate i model PL → EN są instalowane w obrazie backendu. Pierwsze tłumaczenie zwiększy użycie RAM; kolejka uruchamia tylko jedno tłumaczenie naraz. Zapewnij backendowi co najmniej około 1–1,5 GB dostępnej pamięci. Kolejka tłumaczeń, limity żądań i cache sesji są trzymane w pamięci procesu, więc uruchamiaj API jako jeden proces (jedna replika, bez `--workers`) — przy skalowaniu trzeba je przenieść do współdzielonego magazynu, np. Redis.

## 10. Monitoring

- Ustaw zewnętrzny monitor dostępności (np. Uptime Kuma, Healthchecks.io lub Cloudflare Health Checks) na `https://webownik.example.pl/api/health`. Ten endpoint sprawdza też połączenie z bazą; `/healthz` sprawdza tylko nginx.
- Logi aplikacji: `docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api`. Nieobsłużone wyjątki trafiają tam z pełnym tracebackiem.
- Monitoruj też zadanie backupu: cron TrueNAS może wysyłać e-mail przy niezerowym kodzie wyjścia.

## 11. GitHub feedback i changelog

- Formularz tworzy Issue przez backend. Bez `GITHUB_TOKEN` pokaże kontrolowany komunikat o braku konfiguracji.
- Changelog czyta publiczne GitHub Releases i działa bez tokenu.
- Aby wpis pojawił się w aplikacji, opublikuj Release, a nie tylko tag lub commit.
- Opis Release najlepiej dzielić na `Nowości`, `Poprawki` i `Zmiany`.
- Feedback trafia do **publicznych** Issues. Formularz ostrzega o tym użytkownika, a backend usuwa obrazki i @wzmianki z treści.

## 12. Test końcowy

Po wdrożeniu sprawdź kolejno:

1. Strona otwiera się wyłącznie przez HTTPS.
2. Rejestracja wymaga Turnstile.
3. Nowe konto otrzymuje przez Resend wiadomość potwierdzającą.
4. Link prowadzi do `/email-confirmed`, a następnie możliwe jest logowanie.
5. „Nie pamiętam hasła” wysyła wiadomość, a `/reset-password` pozwala ustawić nowe hasło.
6. Rejestracja i reset nie ujawniają tokenów w pasku adresu po załadowaniu ekranu.
7. `curl -I https://webownik.example.pl/assets/<plik>.js` zwraca nagłówki `Content-Security-Policy` i `Strict-Transport-Security`.
8. `https://webownik.example.pl/supabase-auth/settings` zwraca 404 (publiczne jest tylko `/supabase-auth/verify`).
9. Uruchomienie tłumaczenia talii przechodzi przez stany „W kolejce” → „Tłumaczenie…” → „Gotowe”.
7. Upload TXT i ZIP działa.
8. Ręczne tłumaczenie PL → EN przechodzi przez statusy kolejki i kończy się poprawnie.
9. Formularz feedbacku tworzy GitHub Issue.
10. Opublikowany GitHub Release pojawia się w „Pomoc i aktualizacje”.
11. Jasny i ciemny motyw oraz PL/EN działają na desktopie i telefonie.
12. `docker compose ps` pokazuje oba kontenery jako `healthy`.
13. Przekroczenie limitu pliku lub kwoty użytkownika zwraca kontrolowany błąd 4xx.

## 12. Aktualizacje

```bash
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.prod.yml build --pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Przed aktualizacją: backup bazy. Po aktualizacji: sprawdzenie logów, logowania, wysyłki wiadomości i jednego testowego tłumaczenia.

## 13. Sekrety, których nie wolno commitować

- hasło Postgresa,
- `SUPABASE_SECRET_KEY`,
- `TURNSTILE_SECRET_KEY`,
- `GITHUB_TOKEN`,
- API key Resend,
- klucze JWT i pozostałe sekrety self-hosted Supabase,
- token Cloudflare Tunnel.

Jeżeli którykolwiek sekret przypadkowo trafi do historii Git, samo usunięcie pliku nie wystarczy — sekret trzeba natychmiast unieważnić i wygenerować nowy.
