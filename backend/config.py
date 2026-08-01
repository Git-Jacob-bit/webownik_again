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
    cookie_samesite: str = "strict"
    turnstile_secret_key: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    class Config:
        env_file = ".env"


settings = Settings()
