import React, { useState, useEffect } from 'react';
import AnimatedPage from '../components/AnimatedPage';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // <--- Importujemy nasz nowy plik
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  CheckSquare, StickyNote, LogOut,
  Plus, Trash2, Layers, Upload, Loader2,
  Pencil, X, Link as LinkIcon, ExternalLink, Globe, Search, ChevronDown, ChevronUp,
  Settings, Play
} from 'lucide-react';

// --- MODAL POWITALNY ---
const IntroModal = ({ onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Witaj w Webowniku! 👋</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
          </div>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>Twoje nowe centrum dowodzenia nauką. Wszystko w jednym miejscu.</p>
          </div>
          <button onClick={onClose} className="mt-8 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20">Zaczynamy!</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- 1. WIDOK ZESTAWÓW ---
const DecksView = () => {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [files, setFiles] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchDecks(); }, []);

  const fetchDecks = async () => {
    try { const res = await api.get('/decks/mine'); setDecks(res.data); } catch (err) { console.error(err); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files || !deckName) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('deck_name', deckName);
    for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
    
    try {
      // POPRAWKA: Usunięto ręczne ustawianie headers['Content-Type'].
      // Axios sam wykryje FormData i ustawi odpowiedni nagłówek z boundary.
      await api.post('/decks/upload-form', formData);
      
      toast.success("Zestaw utworzony! 🚀");
      setDeckName(''); setFiles(null); fetchDecks();
    } catch (err) { 
      console.error(err);
      toast.error("Błąd wgrywania."); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const deleteDeck = async (id) => {
    if (!window.confirm("Usunąć zestaw?")) return;
    try { await api.delete(`/decks/${id}`); fetchDecks(); toast.info("Usunięto."); } catch (err) { toast.error("Błąd usuwania."); }
  };

  const filteredDecks = decks.filter(deck => deck.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 pb-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Upload className="h-5 w-5" /> Nowy Zestaw</h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <input type="text" placeholder="Nazwa zestawu..." value={deckName} onChange={e => setDeckName(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl p-3 focus:border-blue-500 outline-none" required />
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center relative group">
            <input type="file" multiple onChange={e => setFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
            <div className="text-slate-400 group-hover:text-blue-400 transition-colors">{files ? `${files.length} plików wybranych` : "Wybierz pliki .txt"}</div>
          </div>
          <button type="submit" disabled={isUploading} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl w-full flex justify-center font-medium disabled:opacity-50">
            {isUploading ? <Loader2 className="animate-spin" /> : "Stwórz zestaw"}
          </button>
        </form>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
        <input type="text" placeholder="Szukaj zestawu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-3 focus:border-blue-500 outline-none placeholder-slate-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDecks.map(deck => (
          <motion.div key={deck.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl hover:border-blue-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between mb-4">
                <div className="bg-blue-500/10 p-3 rounded-lg text-blue-400"><Layers className="h-6 w-6" /></div>
                <button onClick={() => deleteDeck(deck.id)} className="text-slate-600 hover:text-red-400"><Trash2 className="h-5 w-5" /></button>
              </div>
              <h4 className="text-lg font-bold text-white mb-4 truncate">{deck.title}</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-auto">
              <button
                onClick={() => navigate(`/decks/${deck.id}`)}
                className="text-sm bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-white">Podgląd</button>
              <button
                onClick={() => navigate(`/quiz/${deck.id}`)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start
              </button>
            </div>
          </motion.div>
        ))}
        {filteredDecks.length === 0 && <p className="col-span-full text-slate-500 text-center">Brak zestawów.</p>}
      </div>
    </div>
  );
};

// --- 2. WIDOK ZADAŃ ---
const TasksView = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  useEffect(() => { fetchTasks(); }, []);
  const fetchTasks = async () => { try { const res = await api.get('/todos'); setTasks(res.data); } catch (e) { console.error(e); } };
  const addTask = async (e) => { e.preventDefault(); if (!newTask.trim()) return; try { const res = await api.post('/todos', { text: newTask, done: false }); setTasks([...tasks, res.data]); setNewTask(''); toast.success("Zadanie dodane!"); } catch (e) { toast.error("Błąd."); } };
  const toggleTask = async (task) => { const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t); setTasks(updatedTasks); try { await api.put(`/todos/${task.id}`, { text: task.text, done: !task.done }); } catch (e) { fetchTasks(); } };
  const removeTask = async (id) => { try { await api.delete(`/todos/${id}`); setTasks(tasks.filter(t => t.id !== id)); toast.info("Usunięto."); } catch (e) { console.error(e); } };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[400px]">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><CheckSquare className="text-green-400" /> Lista Zadań</h2>
      <form onSubmit={addTask} className="flex gap-2 mb-6">
        <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Co masz do zrobienia?" className="flex-1 bg-slate-900/50 border border-slate-700 text-white rounded-xl p-3 focus:border-green-500 outline-none" />
        <button type="submit" className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-xl"><Plus /></button>
      </form>
      <div className="space-y-3">
        {tasks.map((task) => (
          <motion.div key={task.id} layout className={`flex items-center p-4 rounded-xl border transition-all ${task.done ? 'bg-slate-900/30 border-slate-800 text-slate-500 line-through' : 'bg-slate-800 border-slate-700 text-white'}`}>
            <button onClick={() => toggleTask(task)} className={`mr-4 h-6 w-6 rounded border flex items-center justify-center ${task.done ? 'bg-green-500 border-green-500' : 'border-slate-500'}`}>{task.done && <CheckSquare className="h-4 w-4 text-white" />}</button>
            <span className="flex-1 font-medium">{task.text}</span>
            <button onClick={() => removeTask(task.id)} className="text-slate-600 hover:text-red-400"><Trash2 className="h-5 w-5" /></button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- 3. WIDOK NOTATEK ---
const NotesView = () => {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchNotes(); }, []);
  const fetchNotes = async () => { try { const res = await api.get('/notes'); setNotes(res.data); } catch (e) { console.error(e); } };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      if (editingId) { await api.put(`/notes/${editingId}`, { title, content }); toast.success("Zapisano!"); }
      else { await api.post('/notes', { title, content }); toast.success("Dodano notatkę!"); }
      setTitle(""); setContent(""); setEditingId(null); fetchNotes();
    } catch (e) { toast.error("Błąd zapisu."); }
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleExpand = (id) => {
    if (expandedId === id) setExpandedId(null);
    else setExpandedId(id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      <div className="lg:col-span-1 order-1 lg:order-1">
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl sticky top-0">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            {editingId ? <Pencil className="text-yellow-400 h-5 w-5" /> : <Plus className="text-purple-400 h-5 w-5" />}
            {editingId ? "Edytuj" : "Nowa notatka"}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <input type="text" placeholder="Tytuł..." value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:border-purple-500 outline-none font-bold" required />
            <textarea rows="5" placeholder="Treść..." value={content} onChange={e => setContent(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:border-purple-500 outline-none resize-none"></textarea>
            <div className="flex gap-2">
              <button type="submit" className={`flex-1 py-2 rounded-xl font-medium text-white ${editingId ? 'bg-yellow-600' : 'bg-purple-600'}`}>{editingId ? "Zapisz" : "Dodaj"}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setTitle(""); setContent(""); }} className="px-4 py-2 bg-slate-700 rounded-xl text-white"><X /></button>}
            </div>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 order-2 lg:order-2 flex flex-col gap-6">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
          <input type="text" placeholder="Szukaj notatek..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-3 focus:border-purple-500 outline-none placeholder-slate-500" />
        </div>

        <div className="space-y-3 pb-8">
          {filteredNotes.map((note) => {
            const isExpanded = expandedId === note.id;
            return (
              <motion.div
                key={note.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                onClick={() => toggleExpand(note.id)}
                className={`bg-slate-800/40 border p-4 rounded-xl flex items-start justify-between group transition-all cursor-pointer ${isExpanded ? 'border-purple-500/50 bg-slate-800/80' : 'border-slate-700 hover:border-purple-500/30'}`}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-lg truncate">{note.title}</h3>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-600" />}
                  </div>
                  <p className={`text-slate-400 text-sm ${isExpanded ? 'whitespace-pre-wrap break-words break-all' : 'truncate'}`}>
                    {note.content}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(note.id); setTitle(note.title); setContent(note.content); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-2 bg-slate-900 border border-slate-700 hover:border-yellow-500 text-yellow-500 rounded-lg transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={async (e) => { e.stopPropagation(); if (window.confirm("Usunąć?")) { await api.delete(`/notes/${note.id}`); fetchNotes(); toast.info("Usunięto"); } }} className="p-2 bg-slate-900 border border-slate-700 hover:border-red-500 text-red-500 rounded-lg transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
          {filteredNotes.length === 0 && <p className="text-slate-500 text-center py-4">Nie znaleziono notatek.</p>}
        </div>
      </div>
    </div>
  );
};

// --- 4. WIDOK LINKÓW ---
const LinksView = () => {
  const [links, setLinks] = useState([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => { fetchLinks(); }, []);
  const fetchLinks = async () => { try { const res = await api.get('/links'); setLinks(res.data); } catch (e) { console.error(e); } };
  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!title || !url) return;
    let finalUrl = url; if (!url.startsWith('http')) finalUrl = 'https://' + url;
    try { await api.post('/links', { title, url: finalUrl, category: "Ogólne" }); setTitle(""); setUrl(""); fetchLinks(); toast.success("Dodano!"); } catch (e) { toast.error("Błąd."); }
  };
  const deleteLink = async (id) => { if (!window.confirm("Usunąć?")) return; try { await api.delete(`/links/${id}`); fetchLinks(); toast.info("Usunięto"); } catch (e) { console.error(e); } };
  const getFavicon = (linkUrl) => { try { const domain = new URL(linkUrl).hostname; return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`; } catch (e) { return null; } };

  return (
    <div className="space-y-6 pb-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><LinkIcon className="text-blue-400 h-5 w-5" /> Dodaj Link</h3>
        <form onSubmit={handleAddLink} className="flex flex-col md:flex-row gap-3">
          <input type="text" placeholder="Tytuł..." value={title} onChange={e => setTitle(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl p-3 outline-none focus:border-blue-500" required />
          <input type="text" placeholder="Adres URL..." value={url} onChange={e => setUrl(e.target.value)} className="flex-[2] bg-slate-900 border border-slate-700 text-white rounded-xl p-3 outline-none focus:border-blue-500" required />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-medium text-white transition-colors">Dodaj</button>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map(link => (
          <motion.div key={link.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl flex items-center justify-between group hover:border-blue-500/50 transition-all hover:bg-slate-800/60">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="bg-white p-2 rounded-lg flex-shrink-0 h-10 w-10 flex items-center justify-center">
                <img src={getFavicon(link.url)} alt="icon" className="w-6 h-6 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                <Globe className="h-5 w-5 text-slate-800 absolute opacity-0" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-white font-medium truncate pr-2">{link.title}</h4>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 text-xs truncate flex items-center gap-1 hover:text-blue-400 hover:underline transition-colors">{link.url} <ExternalLink className="h-3 w-3" /></a>
              </div>
            </div>
            <button onClick={() => deleteLink(link.id)} className="text-slate-600 hover:text-red-400 p-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all hover:bg-white/5 rounded-lg"><Trash2 className="h-5 w-5" /></button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- GŁÓWNY KOMPONENT ---
const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('decks');
  const [showIntro, setShowIntro] = useState(false);
  const [userInitial, setUserInitial] = useState("J");

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenIntro');
    if (!hasSeen) setShowIntro(true);
    const token = localStorage.getItem('token');
    if (token) {
      try { const payload = JSON.parse(atob(token.split('.')[1])); if (payload.sub) setUserInitial(payload.sub.charAt(0).toUpperCase()); } catch (e) { }
    }
  }, []);

  const handleCloseIntro = () => { setShowIntro(false); localStorage.setItem('hasSeenIntro', 'true'); };
  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('hasSeenIntro'); toast.info("Wylogowano."); navigate('/login'); };

  const menuItems = [
    { id: 'decks', label: 'Zestawy', icon: Layers },
    { id: 'tasks', label: 'Zadania', icon: CheckSquare },
    { id: 'notes', label: 'Notatki', icon: StickyNote },
    { id: 'links', label: 'Linki', icon: LinkIcon },
  ];

  return (
    <AnimatedPage>
      <AnimatePresence>{showIntro && <IntroModal onClose={handleCloseIntro} />}</AnimatePresence>
      
      {/* GLOWNY KONTENER: FLEX-COL na mobile, FLEX-ROW na desktop */}
      <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-white overflow-hidden font-sans">
        
        {/* SIDEBAR - UKRYTY NA MOBILE (hidden md:flex) */}
        <aside className="hidden md:flex w-64 bg-slate-900/50 border-r border-white/5 flex-col backdrop-blur-xl h-screen sticky top-0">
          <div className="p-8"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Webownik</h1></div>
          <nav className="flex-1 px-4 space-y-2">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <item.icon className="h-5 w-5" /> <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-white/5">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"><LogOut className="h-5 w-5" /> <span>Wyloguj się</span></button>
          </div>
        </aside>

        {/* GLOWNA TRESC - PADDING DOLNY NA MOBILE (pb-24) */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen relative pb-24 md:pb-0">
          <header className="mb-6 md:mb-8 flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Ustawienia"
              >
                <Settings className="h-6 w-6" />
              </button>
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 border border-white/10">
                {userInitial}
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeTab === 'decks' && <DecksView />}
              {activeTab === 'tasks' && <TasksView />}
              {activeTab === 'notes' && <NotesView />}
              {activeTab === 'links' && <LinksView />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* BOTTOM NAV - WIDOCZNY TYLKO NA MOBILE (md:hidden) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-6 py-3 flex justify-between items-center z-50 pb-safe">
            {menuItems.map((item) => (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === item.id ? 'text-blue-400' : 'text-slate-500'}`}
              >
                <item.icon className={`h-6 w-6 ${activeTab === item.id ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
             <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-600">
                <LogOut className="h-6 w-6" />
                <span className="text-[10px]">Wyjdź</span>
             </button>
        </nav>

      </div>
    </AnimatedPage>
  );
};

export default Dashboard;