# 🚀 Webownik

**Webownik** to nowoczesna aplikacja webowa typu Full-Stack służąca do zarządzania osobistą wiedzą – notatkami, fiszkami (flashcards) i linkami. Projekt został zbudowany z naciskiem na wysoką wydajność, bezpieczeństwo i pełną konteneryzację.

---

## ✨ Główne funkcjonalności

* **Zarządzanie wiedzą:** Tworzenie, edycja i organizacja notatek, fiszek do nauki oraz przydatnych linków.
* **Bezpieczna Autoryzacja:** System kont użytkowników oparty na tokenach JWT (JSON Web Tokens) chroniony algorytmem hashowania haseł (bcrypt).
* **Panel Użytkownika:** Możliwość zarządzania kontem (zmiana hasła, bezpieczne usuwanie konta).
* **Nowoczesny Frontend:** Płynne działanie dzięki architekturze SPA (Single Page Application) opartej na React i Vite. Interceptory Axios automatycznie zarządzają cyklem życia tokenów.
* **Asynchroniczny Backend:** Błyskawiczna obsługa żądań dzięki asynchronicznej naturze frameworka FastAPI.

---

## 🛠️ Stos technologiczny (Tech Stack)

### Frontend
* **React** (inicjalizowany przez **Vite**) – szybkie i responsywne UI.
* **Axios** – zaawansowana komunikacja z API (z wbudowanymi interceptorami dla nagłówków `Authorization`).

### Backend
* **Python 3** & **FastAPI** – asynchroniczny, superszybki framework API.
* **PostgreSQL** – relacyjna, solidna baza danych.
* **SQLAlchemy** – ORM do komunikacji z bazą danych.
* **Pydantic** – walidacja danych i serializacja.
* **JWT (JSON Web Tokens)** – bezpieczne sesje bezstanowe.

### Infrastruktura & DevOps
* **Docker & Docker Compose** – pełna konteneryzacja środowiska (frontend, backend, baza danych).
* **Nginx** – serwowanie plików statycznych i reverse proxy.
* **Cloudflare** – ochrona WAF (Web Application Firewall), zarządzanie DNS i certyfikatami SSL (HTTPS).

---

## 🏗️ Architektura i Bezpieczeństwo

Aplikacja jest przystosowana do działania na produkcji:
1. **Ruch z zewnątrz** trafia na serwery **Cloudflare**, które filtrują złośliwe boty i ukrywają adres IP serwera (Proxy).
2. Połączenie jest szyfrowane (HTTPS), a rygorystyczna polityka **CORS** w FastAPI dopuszcza żądania wyłącznie z autoryzowanej domeny frontendu.
3. Backend i baza danych są odizolowane w **kontenerach Docker**, co zapobiega wyciekom danych na poziomie systemu operacyjnego hosta.

---

## 🚀 Uruchomienie lokalne (Development)

Dzięki wykorzystaniu Dockera, uruchomienie projektu u siebie jest niezwykle proste.

### Wymagania
* Zainstalowany [Docker](https://www.docker.com/) oraz Docker Compose.

### Kroki instalacji

1. **Sklonuj repozytorium:**
   ```bash
   git clone [https://github.com/TwojaNazwaUzytkownika/webownik.git](https://github.com/TwojaNazwaUzytkownika/webownik.git)
   cd webownik
