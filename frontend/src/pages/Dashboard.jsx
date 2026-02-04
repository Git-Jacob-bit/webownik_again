import React, { useState, useEffect } from 'react';
import AnimatedPage from '../components/AnimatedPage'; // Upewnij się, że masz ten komponent
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, CheckSquare, StickyNote, LogOut, 
  Plus, Trash2, Layers, Upload, FileText, Loader2, Pencil, X
} from 'lucide-react';

// --- KONFIGURACJA AXIOS ---
const api = axios.create({
  baseURL: 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 1. WIDOK ZESTAWÓW ---
const DecksView = () => {
  const [decks, setDecks] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [files, setFiles] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const res = await api.get('/decks/mine');
      setDecks(res.data);
    } catch (err) {
      console.error("Błąd pobierania zestawów", err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files || !deckName) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('deck_name', deckName);
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      await api.post('/decks/upload-form', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Zestaw utworzony!");
      setDeckName('');
      setFiles(null);
      fetchDecks();
    } catch (err) {
      alert("Błąd podczas wgrywania: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDeck = async (id) => {
    if(!window.confirm("Usunąć zestaw?")) return;
    try {
      await api.delete(`/decks/${id}`);
      fetchDecks();
    } catch(err) { 
      alert("Błąd usuwania"); 
    }
  };

  return (
    <div className="space-y-8">
      {/* Formularz Uploadu */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5" /> Nowy Zestaw
        </h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <input 
              type="text" 
              placeholder="Nazwa zestawu (np. Anatomia)" 
              value={deckName}
              onChange={e => setDeckName(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl p-3 focus:border-blue-500 outline-none placeholder-slate-500"
              required
            />
          </div>
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer relative group">
            <input 
              type="file" 
              multiple 
              onChange={e => setFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required
            />
            <div className="text-slate-400 group-hover:text-blue-400 transition-colors">
              {files ? (
                <span className="text-white font-semibold">{files.length} plików wybranych</span>
              ) : (
                "Przeciągnij pliki (PDF, MD, TXT) lub kliknij, aby wybrać"
              )}
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isUploading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl w-full transition-colors flex justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? <Loader2 className="animate-spin" /> : "Stwórz zestaw"}
          </button>
        </form>
      </div>

      {/* Lista Zestawów */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map(deck => (
          <motion.div 
            key={deck.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl hover:border-blue-500/50 transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-500/10 p-3 rounded-lg text-blue-400">
                    <Layers className="h-6 w-6" />
                </div>
                <button onClick={() => deleteDeck(deck.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 className="h-5 w-5" />
                </button>
            </div>
            <h4 className="text-lg font-bold text-white mb-1">{deck.title}</h4>
            <p className="text-slate-400 text-sm mb-4">ID: {deck.id}</p>
            
            <div className="grid grid-cols-2 gap-2">
                 <button className="text-sm bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-white transition-colors">Podgląd</button>
                 <button className="text-sm bg-blue-600 hover:bg-blue-500 py-2 rounded-lg text-white font-medium transition-colors shadow-lg shadow-blue-900/20">Ucz się</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- 2. WIDOK ZADAŃ (TODO) ---
const TasksView = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
        const res = await api.get('/todos');
        setTasks(res.data);
    } catch (e) { console.error(e); }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
        const res = await api.post('/todos', { text: newTask, done: false });
        setTasks([...tasks, res.data]);
        setNewTask('');
    } catch (e) { alert("Błąd dodawania zadania"); }
  };

  const toggleTask = async (task) => {
    // Optimistic update
    const originalTasks = [...tasks];
    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t);
    setTasks(updatedTasks);
    
    try {
        await api.put(`/todos/${task.id}`, { text: task.text, done: !task.done });
    } catch (e) {
        setTasks(originalTasks); // Cofnij w razie błędu
        console.error("Błąd aktualizacji");
    }
  };

  const removeTask = async (id) => {
    try {
        await api.delete(`/todos/${id}`);
        setTasks(tasks.filter(t => t.id !== id));
    } catch(e) { console.error("Błąd usuwania"); }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[500px]">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <CheckSquare className="text-green-400"/> Lista Zadań
      </h2>
      
      <form onSubmit={addTask} className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          placeholder="Co masz do zrobienia?"
          className="flex-1 bg-slate-900/50 border border-slate-700 text-white rounded-xl p-3 focus:border-green-500 outline-none placeholder-slate-500 transition-colors"
        />
        <button type="submit" className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-xl transition-colors">
          <Plus />
        </button>
      </form>

      <div className="space-y-3">
        {tasks.map((task) => (
          <motion.div 
            key={task.id}
            layout
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className={`flex items-center p-4 rounded-xl border transition-all group ${
              task.done 
                ? 'bg-slate-900/30 border-slate-800 text-slate-500 line-through decoration-slate-600' 
                : 'bg-slate-800 border-slate-700 text-white'
            }`}
          >
            <button 
              onClick={() => toggleTask(task)}
              className={`mr-4 h-6 w-6 rounded border flex items-center justify-center transition-all ${
                task.done 
                    ? 'bg-green-500 border-green-500 hover:bg-green-600' 
                    : 'border-slate-500 hover:border-green-400'
              }`}
            >
              {task.done && <CheckSquare className="h-4 w-4 text-white" />}
            </button>
            <span className="flex-1 font-medium">{task.text}</span>
            <button onClick={() => removeTask(task.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="h-5 w-5" />
            </button>
          </motion.div>
        ))}
        {tasks.length === 0 && <p className="text-slate-500 text-center py-4">Wszystko zrobione! 🎉</p>}
      </div>
    </div>
  );
};

// --- 3. WIDOK NOTATEK (NOTES - POPRAWIONE) ---
const NotesView = () => {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
      try {
        const res = await api.get('/notes');
        setNotes(res.data);
      } catch (e) { console.error(e); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
        if (editingId) {
            // Edycja
            await api.put(`/notes/${editingId}`, { title, content });
        } else {
            // Nowa notatka
            await api.post('/notes', { title, content });
        }
        // Reset formularza
        setTitle("");
        setContent("");
        setEditingId(null);
        fetchNotes();
    } catch (e) {
        alert("Błąd zapisu notatki");
    }
  };

  const startEdit = (note) => {
      setTitle(note.title);
      setContent(note.content);
      setEditingId(note.id);
  };

  const cancelEdit = () => {
      setTitle("");
      setContent("");
      setEditingId(null);
  };

  const deleteNote = async (id) => {
      if(!window.confirm("Usunąć notatkę?")) return;
      try {
          await api.delete(`/notes/${id}`);
          fetchNotes();
      } catch (e) { alert("Błąd usuwania"); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Kolumna 1: Formularz (Sticky) */}
      <div className="lg:col-span-1">
          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl sticky top-0">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                {editingId ? <Pencil className="h-5 w-5 text-yellow-400"/> : <Plus className="h-5 w-5 text-purple-400"/>}
                {editingId ? "Edytuj notatkę" : "Nowa notatka"}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
                <input 
                    type="text" 
                    placeholder="Tytuł..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:border-purple-500 outline-none placeholder-slate-500 font-bold"
                    required
                />
                <textarea 
                    rows="6"
                    placeholder="Treść notatki..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:border-purple-500 outline-none placeholder-slate-500 resize-none"
                ></textarea>
                
                <div className="flex gap-2">
                    <button 
                        type="submit" 
                        className={`flex-1 py-2 rounded-xl font-medium transition-colors text-white ${editingId ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-purple-600 hover:bg-purple-500'}`}
                    >
                        {editingId ? "Zapisz zmiany" : "Dodaj notatkę"}
                    </button>
                    {editingId && (
                        <button 
                            type="button" 
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                        >
                            <X />
                        </button>
                    )}
                </div>
            </form>
          </div>
      </div>

      {/* Kolumna 2 i 3: Lista notatek */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
        <AnimatePresence>
            {notes.map((note) => (
            <motion.div 
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="bg-yellow-100/5 border border-yellow-500/20 p-5 rounded-2xl flex flex-col hover:border-yellow-500/40 transition-colors group relative"
            >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => startEdit(note)} className="p-1.5 bg-slate-900/80 rounded-lg text-yellow-400 hover:bg-white hover:text-black transition-colors">
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteNote(note.id)} className="p-1.5 bg-slate-900/80 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>

                <h3 className="text-yellow-100 font-bold text-lg mb-2 pr-16">{note.title}</h3>
                <p className="text-yellow-100/70 text-sm whitespace-pre-wrap break-words leading-relaxed">
                {note.content}
                </p>
                <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-500">
                    {new Date(note.created_at).toLocaleDateString()}
                </div>
            </motion.div>
            ))}
        </AnimatePresence>
        {notes.length === 0 && (
            <div className="col-span-full text-center text-slate-500 mt-10">
                <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Brak notatek. Dodaj pierwszą!</p>
            </div>
        )}
      </div>
    </div>
  );
};

// --- GŁÓWNY KOMPONENT ---
const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('decks'); 

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const menuItems = [
    { id: 'decks', label: 'Moje Zestawy', icon: Layers },
    { id: 'tasks', label: 'Zadania', icon: CheckSquare },
    { id: 'notes', label: 'Notatki', icon: StickyNote },
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-slate-950 flex text-white overflow-hidden font-sans">
        <aside className="w-64 bg-slate-900/50 border-r border-white/5 flex flex-col backdrop-blur-xl">
          <div className="p-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Webownik
            </h1>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-blue-600 shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-white/5">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
              <LogOut className="h-5 w-5" /> <span>Wyloguj się</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto relative h-screen">
           <header className="mb-8 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <div className="flex gap-3">
                 <div className="bg-slate-800 rounded-full w-10 h-10 flex items-center justify-center text-slate-400 border border-slate-700">
                    J
                 </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full pb-20"
            >
              {activeTab === 'decks' && <DecksView />}
              {activeTab === 'tasks' && <TasksView />}
              {activeTab === 'notes' && <NotesView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Dashboard;