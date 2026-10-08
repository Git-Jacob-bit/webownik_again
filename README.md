# 🚀 Webownik

**Webownik** to aplikacja webowa do nauki z zestawów pytań testowych (wielokrotnego wyboru), z prostym pulpitem do zadań, notatek i linków. Pytania importuje się z plików `.txt` lub archiwum `.zip`, a quiz powtarza każde pytanie aż do dwóch poprawnych odpowiedzi z rzędu.

---

## ✨ Funkcje

* **Zestawy pytań:** import z wielu plików `.txt` (UTF-8, UTF-16, Windows-1250) lub jednego `.zip`, edycja pytań i odpowiedzi w przeglądarce.
* **Quiz z powtórkami:** błędne i niepewne pytania wracają po kilku innych; czas nauki z pauzą, podsumowanie najtrudniejszych pytań.
* **Tłumaczenie PL → EN:** angielska kopia zestawu generowana lokalnie przez Argos Translate (bez zewnętrznych API), na żądanie.
* **Pulpit:** zadania (TODO), notatki i linki.
* **Konto:** rejestracja z potwierdzeniem e-mail, reset hasła, zmiana hasła, eksport wszystkich danych (JSON) i usunięcie konta.
* **Pomoc:** formularz feedbacku tworzący Issue na GitHubie i changelog z GitHub Releases.
* **Interfejs PL/EN**, jasny i ciemny motyw.

---

## 🛠️ Stos technologiczny

| Warstwa | Technologie |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Axios |
| Backend | Python 3.11, FastAPI, SQLModel/SQLAlchemy, Argos Translate |
| Auth i baza | Self-hosted Supabase (GoTrue + PostgreSQL) |
| Infrastruktura | Docker Compose, Nginx, Cloudflare Tunnel + Turnstile |

---

## 🏗️ Architektura i bezpieczeństwo

```
Przeglądarka ──HTTPS──▶ Cloudflare ──Tunnel──▶ Nginx (frontend)
                                              ├─ /            → statyczny build React
                                              ├─ /api/*       → FastAPI (sieć internal)
                                              └─ /supabase-auth/verify → Supabase Auth (tylko linki z maili)
FastAPI ──▶ Supabase Auth (Kong) i PostgreSQL (sieć supabase)
```

* Sesja jest trzymana w ciasteczkach `HttpOnly`, `Secure`, `SameSite=Strict`; zapytania zmieniające dane wymagają tokenu CSRF (double-submit).
* Logowanie, rejestracja i reset hasła są chronione przez Turnstile i limity żądań.
* Usunięcie konta i zmiana hasła wymagają obecnego hasła; zmiana hasła wylogowuje inne urządzenia.
* Backend łączy się z bazą jako rola `webownik_app` z minimalnymi uprawnieniami; dodatkowe ograniczenia `CHECK` w bazie powielają walidację API.
* Kontenery działają jako użytkownik bez uprawnień, z `read_only`, `cap_drop: ALL` i limitami zasobów.

Szczegóły: [`docs/production-security.md`](docs/production-security.md), wdrożenie: [`DEPLOY_TRUENAS.md`](DEPLOY_TRUENAS.md), zgłaszanie podatności: [`SECURITY.md`](SECURITY.md).

---

## 🚀 Uruchomienie lokalne

### Wymagania

* Docker i Docker Compose
* [Supabase CLI](https://supabase.com/docs/guides/cli)

### Kroki

1. **Sklonuj repozytorium:**
   ```bash
   git clone https://github.com/Git-Jacob-bit/webownik_again.git
   cd webownik_again
   ```

2. **Uruchom lokalny Supabase** (stosuje migracje z `supabase/migrations`):
   ```bash
   supabase start
   supabase status   # klucze Publishable i Secret
   ```
   Po dodaniu nowej migracji: `supabase db reset` (czyści dane lokalne) albo `supabase migration up`.

3. **Skonfiguruj środowisko:**
   ```bash
   cp .env.example .env
   ```
   Wpisz `SUPABASE_PUBLISHABLE_KEY` i `SUPABASE_SECRET_KEY` z `supabase status`. Turnstile i token GitHuba są w trybie deweloperskim opcjonalne.

4. **Uruchom aplikację:**
   ```bash
   docker compose up --build
   ```
   * Frontend: http://localhost:5173
   * API i dokumentacja OpenAPI: http://localhost:8000/docs
   * Skrzynka z mailami potwierdzającymi (Supabase): http://localhost:54324

---

## 📄 Format plików z pytaniami

```
X0100
Treść pytania?
a) Odpowiedź błędna
b) Odpowiedź poprawna
c) Odpowiedź błędna
d) Odpowiedź błędna
```

Linia `X…` to maska poprawnych odpowiedzi (`1` = poprawna) w kolejności odpowiedzi. Kolejne pytanie zaczyna się od następnej maski. Prefiksy `a)`, `1.` są usuwane automatycznie.

---

## 🧪 Testy i jakość

```bash
# Backend (tymczasowa baza SQLite, Supabase jest mockowany)
cd backend
pip install --require-hashes -r requirements.lock
pip install -r requirements-dev.txt
pytest

# Frontend
cd frontend
npm ci
npm run lint
npm run build
```

CI (`.github/workflows/ci.yml`) uruchamia testy, lint, build, audyt zależności i buduje obrazy Dockera. Po zmianie `backend/requirements.txt` wygeneruj ponownie `backend/requirements.lock` poleceniem podanym w nagłówku tego pliku.

---

## 📦 Produkcja

Pełna instrukcja dla TrueNAS + Cloudflare Tunnel: [`DEPLOY_TRUENAS.md`](DEPLOY_TRUENAS.md). Kopie zapasowe bazy: [`scripts/backup-db.sh`](scripts/backup-db.sh).
