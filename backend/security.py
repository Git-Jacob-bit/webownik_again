from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

# --- KONFIGURACJA ---
# W prawdziwym projekcie to powinno być w zmiennych środowiskowych!
SECRET_KEY = "bardzo_tajny_klucz_zmien_go_na_produkcji_12345"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # Token ważny 24h

# Kontekst haszowania (używamy bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """Sprawdza, czy podane hasło pasuje do hasha w bazie."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Zamienia zwykłe hasło na bezpieczny hash."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Generuje token JWT, który użytkownik dostanie po zalogowaniu."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
        
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt