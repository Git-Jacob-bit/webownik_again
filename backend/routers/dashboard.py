from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from typing import List

from database import get_session
from models import Deck, Link, Note, Question, QuizSession, Todo, User, utc_now
from schemas import TodoCreate, TodoRead, NoteCreate, NoteRead, LinkCreate, LinkRead
from routers.auth import get_current_user # Importujemy funkcję autoryzacji
from limits import MAX_LINKS_PER_USER, MAX_NOTES_PER_USER, MAX_TODOS_PER_USER

router = APIRouter(tags=["dashboard"])

# --- TODOS (ZADANIA) ---

@router.get("/todos", response_model=List[TodoRead])
def get_todos(db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    return db.exec(select(Todo).where(Todo.user_id == user.id).order_by(Todo.id)).all()

@router.post("/todos", response_model=TodoRead)
def create_todo(todo: TodoCreate, db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    count = db.exec(select(func.count(Todo.id)).where(Todo.user_id == user.id)).one()
    if count >= MAX_TODOS_PER_USER:
        raise HTTPException(status_code=409, detail=f"Limit zadań wynosi {MAX_TODOS_PER_USER}")
    new_todo = Todo(text=todo.text, done=todo.done, user_id=user.id)
    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)
    return new_todo

@router.put("/todos/{todo_id}", response_model=TodoRead)
def update_todo(todo_id: int, todo_data: TodoCreate, db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    # Szukamy zadania, które należy do zalogowanego użytkownika
    todo = db.exec(select(Todo).where(Todo.id == todo_id, Todo.user_id == user.id)).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Zadanie nie znalezione")
    
    todo.text = todo_data.text
    todo.done = todo_data.done
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo

@router.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    todo = db.exec(select(Todo).where(Todo.id == todo_id, Todo.user_id == user.id)).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Zadanie nie znalezione")
    db.delete(todo)
    db.commit()
    return {"ok": True}

# --- NOTES (NOTATKI) ---

@router.get("/notes", response_model=List[NoteRead])
def get_notes(db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    return db.exec(select(Note).where(Note.user_id == user.id).order_by(Note.created_at.desc(), Note.id.desc())).all()

@router.post("/notes", response_model=NoteRead)
def create_note(note: NoteCreate, db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    count = db.exec(select(func.count(Note.id)).where(Note.user_id == user.id)).one()
    if count >= MAX_NOTES_PER_USER:
        raise HTTPException(status_code=409, detail=f"Limit notatek wynosi {MAX_NOTES_PER_USER}")
    new_note = Note(title=note.title, content=note.content, user_id=user.id)
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

# --- LINKS (LINKI) ---

@router.get("/links", response_model=List[LinkRead])
def get_links(db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    return db.exec(select(Link).where(Link.user_id == user.id).order_by(Link.category, Link.id)).all()

@router.post("/links", response_model=LinkRead)
def create_link(link: LinkCreate, db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    count = db.exec(select(func.count(Link.id)).where(Link.user_id == user.id)).one()
    if count >= MAX_LINKS_PER_USER:
        raise HTTPException(status_code=409, detail=f"Limit linków wynosi {MAX_LINKS_PER_USER}")
    new_link = Link(title=link.title, url=str(link.url), category=link.category, user_id=user.id)
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    return new_link

# ... (pod funkcją create_note)

@router.put("/notes/{note_id}", response_model=NoteRead)
def update_note(
    note_id: int, 
    note_data: NoteCreate, 
    db: Session = Depends(get_session), 
    user: User = Depends(get_current_user)
):
    note = db.exec(select(Note).where(Note.id == note_id, Note.user_id == user.id)).first()
    if not note:
        raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
    
    note.title = note_data.title
    note.content = note_data.content
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.delete("/notes/{note_id}")
def delete_note(
    note_id: int, 
    db: Session = Depends(get_session), 
    user: User = Depends(get_current_user)
):
    note = db.exec(select(Note).where(Note.id == note_id, Note.user_id == user.id)).first()
    if not note:
        raise HTTPException(status_code=404, detail="Notatka nie znaleziona")
    db.delete(note)
    db.commit()
    return {"ok": True}


@router.delete("/links/{link_id}")
def delete_link(link_id: int, db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    link = db.exec(select(Link).where(Link.id == link_id, Link.user_id == user.id)).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link nie znaleziony")
    db.delete(link)
    db.commit()
    return {"ok": True}


# --- EKSPORT DANYCH (RODO, art. 20) ---

@router.get("/account/export")
def export_my_data(db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    decks = db.exec(
        select(Deck)
        .where(Deck.user_id == user.id)
        .order_by(Deck.id)
        .options(selectinload(Deck.questions).selectinload(Question.answers))
    ).all()
    sessions = db.exec(select(QuizSession).where(QuizSession.user_id == user.id).order_by(QuizSession.id)).all()
    payload = {
        "exported_at": utc_now().isoformat() + "Z",
        "user": {"id": str(user.id), "email": user.email},
        "decks": [
            {
                "title": deck.title,
                "title_en": deck.title_en,
                "questions": [
                    {
                        "content": question.content,
                        "content_en": question.content_en,
                        "answers": [
                            {"content": answer.content, "content_en": answer.content_en, "is_correct": answer.is_correct}
                            for answer in sorted(question.answers, key=lambda answer: answer.id)
                        ],
                    }
                    for question in sorted(deck.questions, key=lambda question: question.id)
                ],
            }
            for deck in decks
        ],
        "quiz_sessions": [
            {
                "deck_id": quiz_session.deck_id,
                "created_at": quiz_session.created_at.isoformat(),
                "completed_at": quiz_session.completed_at.isoformat() if quiz_session.completed_at else None,
                "total_answers": quiz_session.total_answers,
                "correct_answers": quiz_session.correct_answers,
                "incorrect_answers": quiz_session.incorrect_answers,
                "total_time_seconds": quiz_session.total_time_seconds,
            }
            for quiz_session in sessions
        ],
        "todos": [{"text": todo.text, "done": todo.done} for todo in get_todos(db, user)],
        "notes": [
            {"title": note.title, "content": note.content, "created_at": note.created_at.isoformat()}
            for note in get_notes(db, user)
        ],
        "links": [{"title": link.title, "url": link.url, "category": link.category} for link in get_links(db, user)],
    }
    return JSONResponse(
        payload,
        headers={"Content-Disposition": 'attachment; filename="webownik-export.json"'},
    )
