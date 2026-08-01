from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    supabase_url: str
    supabase_publishable_key: str
    supabase_secret_key: str
    domain: str
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    allowed_hosts: str = "localhost,127.0.0.1"
    cookie_secure: bool = False
    cookie_samesite: Literal["strict", "lax", "none"] = "strict"
    turnstile_secret_key: str = ""
    github_repository: str = "Git-Jacob-bit/webownik_again"
    github_token: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @model_validator(mode="after")
    def validate_production_security(self):
        if not self.is_production:
            return self

        errors = []
        if not self.domain.startswith("https://"):
            errors.append("DOMAIN must use https://")
        if not self.cookie_secure:
            errors.append("COOKIE_SECURE must be true")
        if self.cookie_samesite == "none":
            errors.append("COOKIE_SAMESITE cannot be none")
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        if not origins or any(origin == "*" or not origin.startswith("https://") for origin in origins):
            errors.append("CORS_ORIGINS must contain only explicit https:// origins")
        hosts = [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]
        if not hosts or "*" in hosts:
            errors.append("ALLOWED_HOSTS must contain explicit hosts")
        required_secrets = {
            "SUPABASE_PUBLISHABLE_KEY": self.supabase_publishable_key,
            "SUPABASE_SECRET_KEY": self.supabase_secret_key,
            "TURNSTILE_SECRET_KEY": self.turnstile_secret_key,
        }
        for name, value in required_secrets.items():
            if not value or value.strip().upper() in {"CHANGE_ME", "CHANGEME", "REPLACE_ME"}:
                errors.append(f"{name} must be configured")
        if "CHANGE_ME" in self.database_url.upper():
            errors.append("DATABASE_URL must not contain a placeholder password")
        if errors:
            raise ValueError("Unsafe production configuration: " + "; ".join(errors))
        return self

    class Config:
        env_file = ".env"


settings = Settings()
