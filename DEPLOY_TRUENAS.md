# Webownik — wdrożenie na TrueNAS + Cloudflare Tunnel

```
push na main ──► GitHub Actions: testy · lint · build · test całego stacku ──► obrazy ghcr.io/git-jacob-bit/webownik-{api,web,migrate}
                                                                                    │ pull
Internet ──► Cloudflare (DNS, HTTPS, Turnstile) ══ tunel „webownik” ══► cloudflared ──► web (nginx :8080)   [TrueNAS, aplikacja „webownik”]
                                                                                          ├─ /api/*                → api (FastAPI) ──► db (Postgres)
                                                                                          └─ /supabase-auth/verify → auth (GoTrue) ──► db, SMTP Resend
```

Cała aplikacja to jedna aplikacja TrueNAS „Install via YAML” — tak jak strona `website`. Zawiera minimalny Supabase: Postgres (`supabase/postgres`) i Auth (`supabase/gotrue`), bez Studio, Konga i pozostałych usług. Żaden port nie jest wystawiony: ruch przychodzi tylko przez tunel.

Przykłady zakładają `webownik.czech-net.com` i nadawcę `no-reply@czech-net.com`.

## 1. Cloudflare

### Turnstile
**Turnstile → Add widget**: domena `webownik.czech-net.com`, tryb *Managed*.
- **Site Key** (publiczny) → zmienna GitHub w kroku 2.
- **Secret Key** → podasz go skryptowi w kroku 5.

### Tunel
1. **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**, nazwa `webownik`.
   Osobny tunel, nie ten od strony: gdyby dwa kontenery `cloudflared` używały jednego tokenu, Cloudflare rozkładałby ruch między nie, a konektor strony nie widzi kontenerów Webownika (losowe błędy 502).
2. Skopiuj **token** (ciąg po `--token`). Niczego nie instaluj — `cloudflared` jest w YAML aplikacji.
3. **Public Hostname → Add**: Subdomain `webownik` · Domain `czech-net.com` · Service `HTTP` · URL `web:8080`.

## 2. GitHub — obrazy

1. Repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   `TURNSTILE_SITE_KEY` = Site Key z kroku 1 (wkompilowany we frontend podczas budowania obrazu).
2. Uruchom CI na `main` (push albo **Actions → CI → Re-run**). Po zielonym przebiegu w **profil → Packages** są `webownik-api`, `webownik-web` i `webownik-migrate`.
3. Dla każdej z trzech paczek: **Package settings → Change visibility → Public**. Obrazy nie zawierają sekretów (wszystkie są w YAML na TrueNAS), a bez tego TrueNAS potrzebowałby tokenu z `read:packages`.

Po zmianie `TURNSTILE_SITE_KEY` trzeba przebudować obrazy (ponowne uruchomienie CI na `main`).

## 3. Resend

- Domena `czech-net.com` ma status **Verified**.
- Klucz API z uprawnieniem **Sending access**, ograniczony do tej domeny.
- W ustawieniach domeny wyłącz **Click tracking** i **Open tracking** — przepisane linki psują jednorazowe tokeny z maili.

Maile wysyła kontener `auth` (GoTrue) przez `smtp.resend.com:587` jako `no-reply@czech-net.com`. Link w mailu ma postać `https://webownik.czech-net.com/supabase-auth/verify?token=…`.

## 4. TrueNAS — dataset na dane

**Datasets → Add Dataset**, np. `tank/apps/webownik`, preset **Apps** (albo *Generic*; nie *SMB* — Postgres musi móc zmienić właściciela plików). Dataset ma być pusty. Kontener bazy utworzy w nim `db/`. Konfiguracja Postgresa z kluczem pgsodium (`db-config`) jest w wolumenie Dockera tej aplikacji — przy usuwaniu aplikacji nie zaznaczaj usunięcia wolumenów.

Włącz dla niego okresowe snapshoty (**Data Protection → Periodic Snapshot Tasks**).

## 5. Wygenerowanie YAML z sekretami

Na swoim komputerze, w katalogu repozytorium:

```bash
python3 scripts/render-truenas-compose.py
```

Skrypt pyta o domenę, nadawcę i katalog danych (`/mnt/tank/apps/webownik`), a klucz Resend, Secret Key Turnstile, token tunelu i opcjonalny token GitHub pobiera bez wyświetlania. Hasła bazy, sekret JWT i klucze `anon`/`service_role` generuje sam.

Wynik: `~/webownik-truenas.yaml` z uprawnieniami 600. **Zachowaj go** (np. w menedżerze haseł). Hasła bazy są ustawiane przy pierwszym starcie — przy reinstalacji aplikacji użyj tego samego pliku, a nie nowo wygenerowanego.

## 6. TrueNAS — aplikacja

**Apps → Discover Apps → ⋮ → Install via YAML**, nazwa **`webownik`** (od niej zależą nazwy kontenerów, np. `ix-webownik-db-1`), wklej zawartość `~/webownik-truenas.yaml`.

Pierwszy start trwa ok. minuty. Kolejność: `db` → `migrate` (migracje i role, kończy się kodem 0) → `auth` → `api` → `web` → `cloudflared`.

Sprawdzenie:
- **Apps → webownik**: kontenery *running/healthy*, `migrate` — *exited (0)*;
- **Zero Trust → Tunnels**: `webownik` ma status **Healthy**;
- `https://webownik.czech-net.com` się otwiera.

## 7. Test końcowy

1. Rejestracja (z Turnstile) → mail od `no-reply@czech-net.com` → link prowadzi na `/email-confirmed` → logowanie działa.
2. „Nie pamiętam hasła” → mail → link `https://webownik.czech-net.com/supabase-auth/verify?...` → `/reset-password` pozwala ustawić nowe hasło; stare sesje są wylogowane.
3. `curl -I https://webownik.czech-net.com/` i dowolny plik z `/assets/` zwracają `Content-Security-Policy` i `Strict-Transport-Security`.
4. `https://webownik.czech-net.com/supabase-auth/settings` zwraca stronę aplikacji, a nie JSON GoTrue (publiczne jest tylko `/verify`).
5. Tłumaczenie talii przechodzi „W kolejce” → „Tłumaczenie…” → „Gotowe”.

Jeśli mail nie przychodzi: **Apps → webownik → auth → Logs** oraz **Resend → Emails/Logs**.

## Aktualizacja

Merge do `main` → zielone CI (obrazy `latest` i `sha-<commit>` są w GHCR) → **Apps → webownik → Stop / Start**. Dzięki `pull_policy: always` pobierane są najnowsze obrazy, a `migrate` nakłada nowe migracje przed startem API.

Powrót do starszej wersji: **Edit** aplikacji i zamiana `:latest` na `:sha-abc1234` przy trzech obrazach `webownik-*`.

Przed aktualizacją zrób kopię bazy (niżej).

## Kopie zapasowe

`scripts/backup-db.sh` zapisuje zrzut schematów `public` i `auth` z kontenera `ix-webownik-db-1`, sprawdza go przez `pg_restore --list` i usuwa kopie starsze niż 14 dni. Skopiuj go na TrueNAS (np. do `/mnt/tank/apps/webownik-tools/`) i dodaj **System → Advanced → Cron Jobs** (użytkownik `root`, codziennie):

```bash
BACKUP_DIR=/mnt/tank/backups/webownik /mnt/tank/apps/webownik-tools/backup-db.sh
```

Katalog kopii obejmij replikacją poza tę samą pulę. Odtworzenie sprawdzaj okresowo na osobnej instancji:

```bash
pg_restore --clean --if-exists --no-owner -d postgres webownik-YYYYMMDDTHHMMSSZ.dump
```

Snapshot ZFS datasetu `tank/apps/webownik` też jest kopią, ale spójną tylko przy zatrzymanej aplikacji — do odtwarzania preferuj zrzut z `pg_dump`.

## Monitoring

- Monitor dostępności (Uptime Kuma, Healthchecks.io, Cloudflare Health Checks) na `https://webownik.czech-net.com/api/health` — sprawdza też bazę; `/healthz` sprawdza tylko nginx.
- Logi: **Apps → webownik → <kontener> → Logs**. Nieobsłużone wyjątki API mają pełny traceback.
- Cron TrueNAS może wysyłać e-mail, gdy backup zakończy się błędem.

## Bezpieczeństwo i ograniczenia

- Sekrety są tylko w konfiguracji aplikacji TrueNAS i w Twoim `~/webownik-truenas.yaml` — nigdy w repozytorium ani w obrazach.
- API łączy się z bazą jako `webownik_app` (tylko SELECT/INSERT/UPDATE/DELETE na tabelach aplikacji). Migracje i GoTrue używają własnych ról.
- Sieć `frontend` (nginx ↔ API/Auth) jest wewnętrzna i ma stałą podsieć `172.31.250.0/24`; tylko z niej API przyjmuje `CF-Connecting-IP`. Jeśli TrueNAS zgłosi *Pool overlaps*, zmień podsieć w YAML w obu miejscach (`networks.frontend` i `TRUSTED_PROXY_CIDRS`).
- Kolejka tłumaczeń, limity żądań i cache sesji są w pamięci procesu API — uruchamiaj jedną replikę.
- Feedback z aplikacji trafia do **publicznych** Issues (jeśli ustawiono `GITHUB_TOKEN`; fine-grained, tylko to repo, *Issues: Read and write*).
