#!/usr/bin/env python3
"""Generuje gotowy YAML dla TrueNAS (Install via YAML) z deploy/compose.yaml.

Tworzy losowe hasła bazy, sekret JWT i klucze anon/service_role (HS256), a klucz Resend,
sekret Turnstile, token tunelu i opcjonalny token GitHuba pobiera bez echa (getpass).

Wynik zawiera wszystkie sekrety: zapisuje się poza repozytorium z uprawnieniami 600.
Zachowaj go — hasła bazy są ustawiane przy pierwszym starcie i muszą zostać takie same
przy kolejnych aktualizacjach aplikacji.

Użycie:
  python3 scripts/render-truenas-compose.py
  python3 scripts/render-truenas-compose.py --out ~/webownik-truenas.yaml

Tryb bez pytań (CI): --non-interactive, wartości ze zmiennych WEBOWNIK_<NAZWA>
(np. WEBOWNIK_RESEND_API_KEY, WEBOWNIK_DATA_DIR).
"""
import argparse
import base64
import getpass
import hashlib
import hmac
import json
import os
import re
import secrets
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "deploy" / "compose.yaml"
TEN_YEARS = 10 * 365 * 24 * 3600

DEFAULTS = {
    "DOMAIN": "webownik.czech-net.com",
    "MAIL_FROM": "no-reply@czech-net.com",
    "INTERNAL_SUBNET": "172.31.250.0/24",
    "IMAGE_TAG": "latest",
}

# (nazwa, opis, sekret?, wymagane?)
PROMPTS = [
    ("DOMAIN", "Domena aplikacji", False, True),
    ("MAIL_FROM", "Adres nadawcy maili (domena zweryfikowana w Resend)", False, True),
    ("DATA_DIR", "Katalog danych na TrueNAS, np. /mnt/tank/apps/webownik", False, True),
    ("RESEND_API_KEY", "Klucz API Resend (re_...)", True, True),
    ("TURNSTILE_SECRET_KEY", "Cloudflare Turnstile — Secret Key", True, True),
    ("TUNNEL_TOKEN", "Token tunelu Cloudflare (Zero Trust → Tunnels → webownik)", True, True),
    ("GITHUB_TOKEN", "Token GitHub do feedbacku (Enter = pomiń)", True, False),
]


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def jwt_hs256(payload: dict, secret: str) -> str:
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = b64url(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(secret.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    return f"{header}.{body}.{b64url(signature)}"


def generated_secrets() -> dict[str, str]:
    jwt_secret = secrets.token_hex(32)
    now = int(time.time())
    claims = {"iss": "supabase", "iat": now, "exp": now + TEN_YEARS}
    return {
        # Hex: bez znaków wymagających escapowania w URL-u połączenia z bazą.
        "POSTGRES_PASSWORD": secrets.token_hex(24),
        "APP_DB_PASSWORD": secrets.token_hex(24),
        "JWT_SECRET": jwt_secret,
        "ANON_KEY": jwt_hs256({**claims, "role": "anon"}, jwt_secret),
        "SERVICE_ROLE_KEY": jwt_hs256({**claims, "role": "service_role"}, jwt_secret),
    }


def validate(name: str, value: str) -> str | None:
    if any(char in value for char in '"\\\n\r'):
        return "nie może zawierać cudzysłowu, backslasha ani nowej linii"
    if name == "DOMAIN" and not re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", value):
        return "podaj samą domenę, bez https:// i ukośników"
    if name == "MAIL_FROM" and not re.fullmatch(r"[^@\s]+@[a-z0-9.-]+\.[a-z]{2,}", value):
        return "niepoprawny adres e-mail"
    if name == "DATA_DIR" and (not value.startswith("/") or " " in value or value.endswith("/")):
        return "ścieżka bezwzględna, bez spacji i bez końcowego ukośnika"
    return None


def ask(name: str, label: str, secret: bool, required: bool, non_interactive: bool) -> str:
    env_value = os.environ.get(f"WEBOWNIK_{name}")
    if non_interactive:
        value = env_value if env_value is not None else DEFAULTS.get(name, "")
        error = validate(name, value) if value else ("wymagane" if required else None)
        if error:
            sys.exit(f"WEBOWNIK_{name}: {error}")
        return value
    default = DEFAULTS.get(name)
    while True:
        prompt = f"{label}" + (f" [{default}]" if default else "") + ": "
        value = (getpass.getpass(prompt) if secret else input(prompt)).strip() or (default or "")
        if not value and not required:
            return ""
        error = validate(name, value) if value else "wymagane"
        if not error:
            return value
        print(f"  ✗ {error}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=Path.home() / "webownik-truenas.yaml")
    parser.add_argument("--force", action="store_true", help="nadpisz istniejący plik (zmieni hasła bazy!)")
    parser.add_argument("--non-interactive", action="store_true")
    args = parser.parse_args()

    out = args.out.expanduser().resolve()
    if out.is_relative_to(ROOT):
        sys.exit(f"{out} leży w repozytorium — plik z sekretami zapisz poza nim.")
    if out.exists() and not args.force:
        sys.exit(
            f"{out} już istnieje. To Twoja kopia sekretów — nie generuj jej ponownie dla działającej "
            "instalacji (nowe hasła nie zgadzałyby się z bazą). Użyj --force tylko przy instalacji od zera."
        )

    values = {name: ask(name, label, secret, required, args.non_interactive) for name, label, secret, required in PROMPTS}
    values.setdefault("INTERNAL_SUBNET", os.environ.get("WEBOWNIK_INTERNAL_SUBNET", DEFAULTS["INTERNAL_SUBNET"]))
    values.setdefault("IMAGE_TAG", os.environ.get("WEBOWNIK_IMAGE_TAG", DEFAULTS["IMAGE_TAG"]))
    values.update(generated_secrets())

    rendered = TEMPLATE.read_text()
    for name, value in values.items():
        rendered = rendered.replace(f"__{name}__", value)
    leftovers = sorted(set(re.findall(r"__[A-Z_]+__", rendered)))
    if leftovers:
        sys.exit(f"Nieuzupełnione placeholdery: {', '.join(leftovers)}")

    out.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(out, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as handle:
        handle.write(rendered)
    os.chmod(out, 0o600)
    print(f"\nZapisano {out} (uprawnienia 600).")
    print("Wklej jego zawartość w TrueNAS: Apps → Discover Apps → ⋮ → Install via YAML.")


if __name__ == "__main__":
    main()
