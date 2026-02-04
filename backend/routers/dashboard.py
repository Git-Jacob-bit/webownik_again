from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from database import get_session
from models import User, Todo, Note, Link
from schemas import TodoCreate, TodoRead, NoteCreate, NoteRead, LinkCreate, LinkRead
from routers.auth import get_current_user # Importujemy funkcję autoryzacji

router = APIRouter(tags=["dashboard"])

# --- TODOS (ZADANIA) ---

@router.get("/todos", response_model=List[TodoRead])
def get_todos(user: User = Depends(get_current_user)):
    return user.todos

@router.post("/todos", response_model=TodoRead)
def create_todo(todo: TodoCreate, db: Session = Depends(get_session), user: User = Depends(get_current_user)):
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
def get_notes(user: User = Depends(get_current_user)):
    return user.notes

@router.post("/notes", response_model=NoteRead)
def create_note(note: NoteCreate, db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    new_note = Note(title=note.title, content=note.content, user_id=user.id)
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

# --- LINKS (LINKI) ---

@router.get("/links", response_model=List[LinkRead])
def get_links(user: User = Depends(get_current_user)):
    return user.links

@router.post("/links", response_model=LinkRead)
def create_link(link: LinkCreate, db: Session = Depends(get_session), user: User = Depends(get_current_user)):
    new_link = Link(title=link.title, url=link.url, category=link.category, user_id=user.id)
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