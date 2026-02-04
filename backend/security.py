from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from config import settings  # <--- IMPORTUJEMY USTAWIENIA

# Tych linii już nie potrzebujesz:
# import os
# from dotenv import load_dotenv
# load_dotenv()
# ... validation check ...

# Kontekst haszowania (używamy bcrypt) - to zostaje bez zmian
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """Sprawdza, czy podane hasło pasuje do hasha w bazie."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Zamienia zwykłe hasło na bezpieczny hash."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Generuje token JWT korzystając z ustawień z pliku config.py"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # TERAZ POBIERAMY CZAS WAŻNOŚCI Z CONFIGU (np. 30 minut)
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        
    to_encode.update({"exp": expire})
    
    # UŻYWAMY KLUCZA I ALGORYTMU Z CONFIGU
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt