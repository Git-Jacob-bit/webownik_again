from datetime import timedelta
from typing import Annotated
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from jose import JWTError, jwt

from database import get_session
from models import User
from security import verify_password, create_access_token, get_password_hash, SECRET_KEY, ALGORITHM
from schemas import UserCreate

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

router = APIRouter(prefix="/auth", tags=["Auth"])

# --- DEPENDENCY: POBIERZ AKTUALNEGO UŻYTKOWNIKA ---
async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nieprawidłowe dane logowania",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None:
        raise credentials_exception
    return user

# --- REJESTRACJA ---
@router.post("/register")
def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
    # 1. Sprawdź czy email istnieje
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Ten email jest już zajęty")
    
    # 2. Zakoduj hasło (teraz bierzemy 'password' z Pydantic, a nie 'hashed_password')
    hashed_pw = get_password_hash(user_data.password)
    
    # 3. Zapisz do bazy
    new_user = User(email=user_data.email, hashed_password=hashed_pw)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return {"msg": "Konto utworzone pomyślnie", "email": new_user.email}

# --- LOGOWANIE (WYDAWANIE TOKENA) ---
@router.post("/token")
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session)
):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Błędny email lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Sprawdź czy stare hasło pasuje
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Nieprawidłowe stare hasło")
    
    # 2. Zahashuj nowe hasło
    new_hash = get_password_hash(password_data.new_password)
    
    # 3. Zapisz w bazie
    current_user.hashed_password = new_hash
    session.add(current_user)
    session.commit()
    
    return {"message": "Hasło zostało zmienione pomyślnie"}