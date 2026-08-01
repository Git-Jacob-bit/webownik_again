import React, { useState, useEffect } from 'react';
import AnimatedPage from '../components/AnimatedPage';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../api'; // <--- Importujemy nasz nowy plik
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  CheckSquare, StickyNote, LogOut,
  Plus, Trash2, Layers, Upload, Loader2,
  Pencil, X, Link as LinkIcon, ExternalLink, Globe, Search, ChevronDown, ChevronUp,
  Settings, Play, ArrowRight, Clock3, Info
} from 'lucide-react';
import AppShell, { sections } from '../components/AppShell';

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
  const [createOpen, setCreateOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => { fetchDecks(); }, []);
  useEffect(() => {
    if (!tutorialOpen) return undefined;
    const closeOnEscape = event => { if (event.key === 'Escape') setTutorialOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [tutorialOpen]);

  const selectQuestionFiles = (selected, folderMode = false) => {
    let chosen = Array.from(selected || []);
    if (folderMode) {
      const textFiles = chosen.filter(file => file.name.toLowerCase().endsWith('.txt'));
      const ignoredCount = chosen.length - textFiles.length;
      chosen = textFiles;
      if (ignoredCount) toast.info(`Pominięto ${ignoredCount} plików innych niż TXT.`);
      if (!chosen.length) {
        setFiles(null);
        toast.error('Wybrany folder nie zawiera plików .txt.');
        return;
      }
    }
    const extensions = chosen.map(file => file.name.toLowerCase().split('.').pop());
    if (extensions.some(extension => !['txt', 'zip'].includes(extension))) {
      setFiles(null);
      toast.error('Dozwolone są tylko pliki .txt lub archiwum .zip.');
      return;
    }
    if (extensions.includes('zip') && (chosen.length !== 1 || extensions[0] !== 'zip')) {
      setFiles(null);
      toast.error('Archiwum ZIP wybierz osobno, bez dodatkowych plików.');
      return;
    }
    setFiles(chosen);
  };

  const fetchDecks = async () => {
    try { const res = await api.get('/decks/mine'); setDecks(res.data); } catch (err) { console.error(err); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!deckName.trim()) { toast.error('Podaj nazwę zestawu.'); return; }
    if (!files?.length) { toast.error('Wybierz pliki .txt, folder z pytaniami albo archiwum ZIP.'); return; }
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('deck_name', deckName);
    for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
    
    try {
      // POPRAWKA: Usunięto ręczne ustawianie headers['Content-Type'].
      // Axios sam wykryje FormData i ustawi odpowiedni nagłówek z boundary.
      await api.post('/decks/upload-form', formData);
      
      toast.success("Zestaw utworzony! 🚀");
      setDeckName(''); setFiles(null); setCreateOpen(false); fetchDecks();
    } catch (err) { 
      console.error(err);
      toast.error(err.response?.data?.detail || "Błąd wgrywania.");
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
      <div id="create-deck" className="scroll-mt-24 bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
        <button data-create-toggle aria-expanded={createOpen} onClick={() => setCreateOpen(value => !value)} className="flex w-full items-center justify-between text-left sm:hidden">
          <span className="flex items-center gap-2 font-semibold text-white"><Upload className="h-5 w-5 text-blue-400" /> Nowy zestaw</span>
          {createOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>
        <div className={`${createOpen ? 'block pt-5' : 'hidden'} sm:block sm:pt-0`}>
        <div className="mb-4 hidden items-center justify-between gap-4 sm:flex">
          <h3 className="flex items-center gap-2 text-xl font-bold text-white"><Upload className="h-5 w-5" /> Nowy Zestaw</h3>
          <button type="button" onClick={() => setTutorialOpen(true)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-300 transition hover:bg-blue-500/10 hover:text-blue-200"><Info className="h-4 w-4" /> Jak przygotować pliki?</button>
        </div>
        <button type="button" onClick={() => setTutorialOpen(true)} className="mb-4 flex items-center gap-2 text-sm text-blue-300 sm:hidden"><Info className="h-4 w-4" /> Jak przygotować pliki?</button>
        <form onSubmit={handleUpload} className="space-y-4">
          <input data-autofocus type="text" placeholder="Nazwa zestawu..." value={deckName} onChange={e => setDeckName(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl p-3 focus:border-blue-500 outline-none" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="cursor-pointer rounded-xl border-2 border-dashed border-slate-700 p-6 text-center text-slate-400 transition hover:border-blue-500 hover:text-blue-400">
              <input type="file" multiple accept=".txt,.zip,text/plain,application/zip" onChange={e => selectQuestionFiles(e.target.files)} className="sr-only" />
              <span className="block font-medium">Wybierz pytania lub ZIP</span>
              <span className="mt-1 block text-xs text-slate-500">Wiele plików .txt albo jeden .zip</span>
            </label>
            <label className="cursor-pointer rounded-xl border-2 border-dashed border-slate-700 p-6 text-center text-slate-400 transition hover:border-blue-500 hover:text-blue-400">
              <input type="file" multiple accept=".txt,text/plain" webkitdirectory="" directory="" onChange={e => selectQuestionFiles(e.target.files, true)} className="sr-only" />
              <span className="block font-medium">Wybierz folder</span>
              <span className="mt-1 block text-xs text-slate-500">Wczytane zostaną pliki .txt</span>
            </label>
          </div>
          {files?.length > 0 && <div className="rounded-xl bg-blue-500/10 px-4 py-3 text-sm text-blue-300">Wybrano: {files.length} {files.length === 1 ? 'plik' : 'plików'}</div>}
          <button type="submit" disabled={isUploading} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl w-full flex justify-center font-medium disabled:opacity-50">
            {isUploading ? <Loader2 className="animate-spin" /> : "Stwórz zestaw"}
          </button>
        </form>
        </div>
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

      <AnimatePresence>
        {tutorialOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTutorialOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Zamknij instrukcję" />
            <motion.section initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} role="dialog" aria-modal="true" aria-labelledby="file-format-title" className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div><p className="mb-1 text-sm font-medium text-blue-400">Instrukcja importu</p><h3 id="file-format-title" className="text-2xl font-bold">Format pliku z pytaniami</h3></div>
                <button onClick={() => setTutorialOpen(false)} className="rounded-xl bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Zamknij"><X className="h-5 w-5" /></button>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-slate-400">Każdy plik musi mieć rozszerzenie <strong className="text-slate-200">.txt</strong>. Jedno pytanie składa się z maski poprawnych odpowiedzi, treści pytania i listy odpowiedzi.</p>
              <pre className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-slate-950 p-4 text-sm leading-7 text-slate-200"><code>{`X1000
Która planeta jest najbliżej Słońca?
a) Merkury
b) Wenus
c) Ziemia
d) Mars

X1010
Które liczby są parzyste?
a) 2
b) 3
c) 4
d) 5`}</code></pre>

              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <div className="rounded-xl bg-white/[0.035] p-4"><strong className="text-blue-300">X1000</strong> — każda cyfra odpowiada kolejnej odpowiedzi. <strong>1</strong> oznacza odpowiedź poprawną, a <strong>0</strong> błędną.</div>
                <div className="rounded-xl bg-white/[0.035] p-4"><strong className="text-blue-300">X1010</strong> — pytanie ma dwie poprawne odpowiedzi: pierwszą i trzecią. Liczba cyfr powinna odpowiadać liczbie odpowiedzi.</div>
                <div className="rounded-xl bg-white/[0.035] p-4">Pierwsza linia po masce to <strong>treść pytania</strong>. Następne linie są odpowiedziami aż do kolejnej maski zaczynającej się od <strong>X</strong>.</div>
              </div>

              <div className="mt-5 rounded-2xl border border-blue-500/15 bg-blue-500/[0.07] p-4 text-sm text-blue-100"><strong>Import:</strong> możesz wybrać wiele plików TXT, folder albo jeden ZIP. W folderze i ZIP-ie pozostałe typy plików są pomijane.</div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- 2. WIDOK ZADAŃ ---
const TasksView = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  useEffect(() => { fetchTasks(); }, []);
  const fetchTasks = async () => { try { const res = await api.get('/todos'); setTasks(res.data); } catch (e) { console.error(e); } };
  const addTask = async (e) => { e.preventDefault(); if (!newTask.trim()) return; try { const res = await api.post('/todos', { text: newTask, done: false }); setTasks([...tasks, res.data]); setNewTask(''); toast.success("Zadanie dodane!"); } catch (e) { toast.error("Błąd."); } };
  const toggleTask = async (task) => { const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t); setTasks(updatedTasks); try { await api.put(`/todos/${task.id}`, { text: task.text, done: !task.done }); } catch (e) { fetchTasks(); } };
  const removeTask = async (id) => { try { await api.delete(`/todos/${id}`); setTasks(tasks.filter(t => t.id !== id)); toast.info("Usunięto."); } catch (e) { console.error(e); } };

  return (
    <div id="create-task" className="scroll-mt-24 bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><CheckSquare className="text-green-400" /> Lista Zadań</h2>
      <button data-create-toggle aria-expanded={createOpen} onClick={() => setCreateOpen(value => !value)} className="mb-5 flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 p-3 text-left sm:hidden">
        <span className="flex items-center gap-2 font-medium"><Plus className="h-5 w-5 text-green-400" /> Dodaj zadanie</span>
        {createOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </button>
      <form onSubmit={addTask} className={`${createOpen ? 'flex' : 'hidden'} gap-2 mb-6 sm:flex`}>
        <input data-autofocus type="text" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Co masz do zrobienia?" className="min-w-0 flex-1 bg-slate-900/50 border border-slate-700 text-white rounded-xl p-3 focus:border-green-500 outline-none" />
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
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => { fetchNotes(); }, []);
  const fetchNotes = async () => { try { const res = await api.get('/notes'); setNotes(res.data); } catch (e) { console.error(e); } };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      if (editingId) { await api.put(`/notes/${editingId}`, { title, content }); toast.success("Zapisano!"); }
      else { await api.post('/notes', { title, content }); toast.success("Dodano notatkę!"); }
      setTitle(""); setContent(""); setEditingId(null); setCreateOpen(false); fetchNotes();
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
        <div id="create-note" className="scroll-mt-24 bg-slate-800/50 border border-slate-700 p-5 sm:p-6 rounded-2xl lg:sticky lg:top-24">
          <button data-create-toggle aria-expanded={createOpen} onClick={() => setCreateOpen(value => !value)} className="flex w-full items-center justify-between text-left sm:hidden">
            <span className="flex items-center gap-2 font-semibold"><Plus className="h-5 w-5 text-purple-400" /> {editingId ? 'Edytuj notatkę' : 'Nowa notatka'}</span>
            {createOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
          </button>
          <div className={`${createOpen ? 'block pt-5' : 'hidden'} sm:block sm:pt-0`}>
          <h3 className="text-xl font-bold text-white mb-4 hidden sm:flex items-center gap-2">
            {editingId ? <Pencil className="text-yellow-400 h-5 w-5" /> : <Plus className="text-purple-400 h-5 w-5" />}
            {editingId ? "Edytuj" : "Nowa notatka"}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <input data-autofocus type="text" placeholder="Tytuł..." value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:border-purple-500 outline-none font-bold" required />
            <textarea rows="5" placeholder="Treść..." value={content} onChange={e => setContent(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:border-purple-500 outline-none resize-none"></textarea>
            <div className="flex gap-2">
              <button type="submit" className={`flex-1 py-2 rounded-xl font-medium text-white ${editingId ? 'bg-yellow-600' : 'bg-purple-600'}`}>{editingId ? "Zapisz" : "Dodaj"}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setTitle(""); setContent(""); }} className="px-4 py-2 bg-slate-700 rounded-xl text-white"><X /></button>}
            </div>
          </form>
          </div>
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
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(note.id); setTitle(note.title); setContent(note.content); setCreateOpen(true); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-2 bg-slate-900 border border-slate-700 hover:border-yellow-500 text-yellow-500 rounded-lg transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100">
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
  const [createOpen, setCreateOpen] = useState(false);
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
      <div id="create-link" className="scroll-mt-24 bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
        <button data-create-toggle aria-expanded={createOpen} onClick={() => setCreateOpen(value => !value)} className="flex w-full items-center justify-between text-left sm:hidden">
          <span className="flex items-center gap-2 font-semibold"><LinkIcon className="h-5 w-5 text-blue-400" /> Dodaj link</span>
          {createOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>
        <div className={`${createOpen ? 'block pt-5' : 'hidden'} sm:block sm:pt-0`}>
        <h3 className="text-xl font-bold text-white mb-4 hidden sm:flex items-center gap-2"><LinkIcon className="text-blue-400 h-5 w-5" /> Dodaj Link</h3>
        <form onSubmit={handleAddLink} className="flex flex-col md:flex-row gap-3">
          <input data-autofocus type="text" placeholder="Tytuł..." value={title} onChange={e => setTitle(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl p-3 outline-none focus:border-blue-500" required />
          <input type="text" placeholder="Adres URL..." value={url} onChange={e => setUrl(e.target.value)} className="flex-[2] bg-slate-900 border border-slate-700 text-white rounded-xl p-3 outline-none focus:border-blue-500" required />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-medium text-white transition-colors">Dodaj</button>
        </form>
        </div>
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

const TodayView = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ decks: [], tasks: [], notes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/decks/mine'), api.get('/todos'), api.get('/notes'), api.get('/links'),
    ]).then(([decks, tasks, notes, links]) => {
      setData({ decks: decks.data, tasks: tasks.data, notes: notes.data, links: links.data });
    }).catch(() => toast.error('Nie udało się załadować pulpitu.')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-[45vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-400" /></div>;

  const pendingTasks = data.tasks.filter(task => !task.done);
  const summary = [
    { label: 'Zestawy', value: data.decks.length, icon: Layers, path: '/decks', accent: 'text-blue-300 bg-blue-500/10' },
    { label: 'Do zrobienia', value: pendingTasks.length, icon: CheckSquare, path: '/tasks', accent: 'text-green-300 bg-green-500/10' },
    { label: 'Notatki', value: data.notes.length, icon: StickyNote, path: '/notes', accent: 'text-violet-300 bg-violet-500/10' },
    { label: 'Linki', value: data.links.length, icon: LinkIcon, path: '/links', accent: 'text-cyan-300 bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-blue-500/15 bg-gradient-to-br from-blue-600/15 via-slate-900/80 to-violet-600/10 p-6 sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-300"><Clock3 className="h-4 w-4" /> Twój dzień w Webowniku</div>
          <h2 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">Wróć do tego, co ważne.</h2>
          <p className="mt-3 max-w-xl text-slate-400">Kontynuuj naukę, uporządkuj zadania albo zapisz nową myśl.</p>
          <button onClick={() => navigate('/decks')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500">Przejdź do zestawów <ArrowRight className="h-4 w-4" /></button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {summary.map(item => <button key={item.label} onClick={() => navigate(item.path)} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.055] sm:p-5"><span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${item.accent}`}><item.icon className="h-5 w-5" /></span><strong className="block text-2xl font-bold">{item.value}</strong><span className="text-sm text-slate-500">{item.label}</span></button>)}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-bold">Najbliższe zadania</h3><p className="text-sm text-slate-500">To, co jeszcze czeka</p></div><button onClick={() => navigate('/tasks')} className="text-sm text-blue-400">Wszystkie</button></div>
          <div className="space-y-2">
            {pendingTasks.slice(0, 4).map(task => <div key={task.id} className="flex items-center gap-3 rounded-xl bg-slate-900/55 p-3.5"><span className="h-2.5 w-2.5 flex-none rounded-full bg-green-400" /><span className="min-w-0 truncate text-sm">{task.text}</span></div>)}
            {!pendingTasks.length && <p className="py-8 text-center text-sm text-slate-500">Wszystko zrobione — dobra robota.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-bold">Ostatnie notatki</h3><p className="text-sm text-slate-500">Szybki powrót do myśli</p></div><button onClick={() => navigate('/notes')} className="text-sm text-blue-400">Wszystkie</button></div>
          <div className="space-y-2">
            {[...data.notes].slice(-4).reverse().map(note => <button key={note.id} onClick={() => navigate('/notes')} className="block w-full rounded-xl bg-slate-900/55 p-3.5 text-left"><span className="block truncate text-sm font-medium">{note.title}</span><span className="mt-1 block truncate text-xs text-slate-500">{note.content || 'Pusta notatka'}</span></button>)}
            {!data.notes.length && <p className="py-8 text-center text-sm text-slate-500">Nie masz jeszcze żadnych notatek.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

// --- GŁÓWNY KOMPONENT ---
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.slice(1);
  const [showIntro, setShowIntro] = useState(false);
  const [userInitial, setUserInitial] = useState("J");

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenIntro');
    if (!hasSeen) setShowIntro(true);
    api.get('/auth/me').then(({ data }) => {
      if (data.email) setUserInitial(data.email.charAt(0).toUpperCase());
    }).catch(() => {});
  }, []);

  const handleCloseIntro = () => { setShowIntro(false); localStorage.setItem('hasSeenIntro', 'true'); };
  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* Sesja może być już wygasła. */ }
    localStorage.removeItem('hasSeenIntro');
    toast.info("Wylogowano.");
    navigate('/login');
  };

  if (!sections.some(section => section.id === activeTab)) return <Navigate to="/today" replace />;

  return (
    <AnimatedPage>
      <AnimatePresence>{showIntro && <IntroModal onClose={handleCloseIntro} />}</AnimatePresence>
      <AppShell activeSection={activeTab} userInitial={userInitial} onLogout={handleLogout}>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {activeTab === 'today' && <TodayView />}
            {activeTab === 'decks' && <DecksView />}
            {activeTab === 'tasks' && <TasksView />}
            {activeTab === 'notes' && <NotesView />}
            {activeTab === 'links' && <LinksView />}
          </motion.div>
        </AnimatePresence>
      </AppShell>
    </AnimatedPage>
  );
};

export default Dashboard;
