from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Czytamy dane do bazy
    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str
    postgres_port: int

    # Czytamy ustawienia bezpieczeństwa
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    
    # Czytamy domenę (do linków resetu hasła)
    domain: str

    # --- NOWE POLA DO MAILI ---
    resend_api_key: str
    email_sender: str = "onboarding@resend.dev"

    # Ta funkcja skleja osobne dane w jeden URL dla SQLAlchemy
    @property
    def database_url(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    class Config:
        env_file = ".env"

# Tworzymy jedną instancję ustawień na całą aplikację
settings = Settings()