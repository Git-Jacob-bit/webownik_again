from datetime import timedelta, datetime
from typing import Annotated
from pydantic import BaseModel
import secrets # Potrzebne do generowania tokenu resetu
import resend

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from jose import JWTError, jwt

from database import get_session
from models import User
# ZMIANA 1: Usuwamy SECRET_KEY i ALGORITHM z importów security
from security import verify_password, create_access_token, get_password_hash
# ZMIANA 2: Importujemy nasze nowe ustawienia
from config import settings 
from schemas import UserCreate, UserRead

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
        # ZMIANA 3: Używamy settings.secret_key i settings.algorithm
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
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
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Ten email jest już zajęty")
    
    hashed_pw = get_password_hash(user_data.password)
    
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
    
    # ZMIANA 4: Czas wygaśnięcia bierzemy z configu (opcjonalnie, bo security też to ma, ale tu dla pewności)
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# --- ZMIANA HASŁA (ZALOGOWANY UŻYTKOWNIK) ---
class PasswordChange(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Nieprawidłowe stare hasło")
    
    new_hash = get_password_hash(password_data.new_password)
    current_user.hashed_password = new_hash
    session.add(current_user)
    session.commit()
    
    return {"message": "Hasło zostało zmienione pomyślnie"}

@router.post("/forgot-password")
def forgot_password(email: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == email)).first()
    
    # 1. Jeśli usera nie ma, udajemy sukces (security)
    if not user:
        return {"message": "Jeśli e-mail istnieje, instrukcje zostały wysłane."}

    # 2. Generujemy token i zapisujemy w bazie
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
    session.add(user)
    session.commit()

    # 3. Tworzymy link (korzystamy z domeny z configu)
    reset_link = f"{settings.domain}/reset-password?token={token}"

    # 4. Konfigurujemy Resend
    resend.api_key = settings.resend_api_key

    html_content = f"""
    <p>Cześć!</p>
    <p>Otrzymaliśmy prośbę o reset hasła w aplikacji Webownik.</p>
    <p><a href="{reset_link}">Kliknij tutaj, aby zresetować hasło</a></p>
    <p>Link jest ważny przez godzinę.</p>
    """

    # 5. Wysyłamy maila
    try:
        params = {
            "from": settings.email_sender,
            "to": [email],  # WAŻNE: Na darmowym Resend to musi być Twój mail (ten z konta Resend)
            "subject": "Reset hasła - Webownik",
            "html": html_content
        }
        resend.Emails.send(params)
    except Exception as e:
        print(f"BŁĄD WYSYŁKI MAILA: {e}")
        # Możesz odkomentować linię niżej, jeśli chcesz widzieć błąd 500 w Swaggerze:
        # raise HTTPException(status_code=500, detail="Błąd wysyłki e-maila")

    return {"message": "Instrukcje wysłane na e-mail."}

@router.post("/reset-password-confirm")
def reset_password_confirm(token: str, new_password: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(
        User.reset_token == token,
        User.reset_token_expiry > datetime.utcnow()
    )).first()

    if not user:
        raise HTTPException(status_code=400, detail="Token jest nieprawidłowy lub wygasł")

    user.hashed_password = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    session.add(user)
    session.commit()

    return {"message": "Hasło zmienione. Możesz się zalogować."}

@router.get("/me", response_model=UserRead) # Używamy UserRead (bez hasła)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- 2. USUWANIE KONTA (DANGER ZONE) ---
@router.delete("/me", status_code=204)
def delete_my_account(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Usuwa konto zalogowanego użytkownika i wszystkie jego dane."""
    # Dzięki relacjom w SQLModel (cascade), usunięcie usera powinno
    # usunąć też jego Decki, Pytania itd. (jeśli masz cascade="all, delete").
    # Jeśli nie masz cascade, SQL wywali błąd - wtedy trzeba usuwać ręcznie.
    # Zakładamy wersję optymistyczną (cascade działa):
    
    session.delete(current_user)
    session.commit()
    return None