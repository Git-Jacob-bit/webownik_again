from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from jose import JWTError, jwt

from database import get_session
from models import User
from security import verify_password, create_access_token, get_password_hash, SECRET_KEY, ALGORITHM

# To mówi FastAPI: "Hej, token logowania pobieraj z endpointu /auth/token"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

router = APIRouter(prefix="/auth", tags=["Auth"])

# --- DEPENDENCY (OCHRONIARZ) ---
# Tę funkcję będziemy wciskać do innych routerów, żeby sprawdzić, kim jest user
async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nieprawidłowe dane logowania",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Rozszyfrowujemy token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Szukamy usera w bazie
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None:
        raise credentials_exception
    return user

# --- REJESTRACJA ---
@router.post("/register")
def register_user(user_data: User, session: Session = Depends(get_session)):
    # Sprawdź czy taki email już istnieje
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Ten email jest już zajęty")
    
    # Zakoduj hasło i zapisz
    hashed_pw = get_password_hash(user_data.hashed_password)
    new_user = User(email=user_data.email, hashed_password=hashed_pw)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return {"msg": "Konto utworzone pomyślnie", "email": new_user.email}

# --- LOGOWANIE ---
@router.post("/token")
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session)
):
    # Szukamy usera po emailu (OAuth2 trzyma email w polu 'username')
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    
    # Sprawdzamy hasło
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Błędny email lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generujemy token ważny 30 minut
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Zwracamy token do przeglądarki
    return {"access_token": access_token, "token_type": "bearer"}