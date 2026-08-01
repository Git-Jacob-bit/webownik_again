import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage'; 
import api from '../api'; // <--- UŻYWAMY NASZEGO PLIKU API
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, Plus, Trash2, Save, X, 
  CheckCircle2, Circle, Edit3, Loader2 
} from 'lucide-react';

// --- USUNIĘTO RĘCZNĄ KONFIGURACJĘ AXIOSA ---
// Teraz api.js zajmuje się adresem URL i tokenami automatycznie.

const DeckPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stan edycji
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ content: '', answers: [] });
  
  // Stan dodawania
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestionContent, setNewQuestionContent] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Używamy api.get zamiast axios.get
      const res = await api.get(`/decks/${id}`);
      
      let deckData = res.data;
      let questionsData = deckData.questions || [];

      // SORTOWANIE (żeby nie skakało przy edycji)
      questionsData.sort((a, b) => a.id - b.id);
      questionsData.forEach(q => {
        if (q.answers) q.answers.sort((a, b) => a.id - b.id);
      });

      setDeck(deckData);
      setQuestions(questionsData);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 405) {
        toast.error("Błąd backendu: Brak endpointu GET /decks/" + id);
      } else {
        toast.error("Nie udało się pobrać zestawu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (question) => {
    setEditingId(question.id);
    setEditForm({
      content: question.content,
      answers: question.answers.map(a => ({ ...a }))
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ content: '', answers: [] });
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAnswerChange = (ansIndex, field, value) => {
    const updatedAnswers = [...editForm.answers];
    updatedAnswers[ansIndex][field] = value;
    setEditForm(prev => ({ ...prev, answers: updatedAnswers }));
  };

  const saveQuestion = async (qId) => {
    try {
      await api.put(`/decks/question/${qId}/full`, editForm);
      toast.success("Zapisano zmiany!");
      setEditingId(null);
      fetchData();
    } catch (err) {
      toast.error("Błąd zapisu.");
    }
  };

  const deleteQuestion = async (qId) => {
    if (!window.confirm("Na pewno usunąć to pytanie?")) return;
    try {
      await api.delete(`/decks/question/${qId}`);
      setQuestions(prev => prev.filter(q => q.id !== qId));
      toast.info("Pytanie usunięte.");
    } catch (err) {
      toast.error("Błąd usuwania.");
    }
  };

  const addNewQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionContent.trim()) return;

    try {
      await api.post(`/decks/${id}/question`, { content: newQuestionContent });
      toast.success("Dodano pytanie! Dodaj teraz odpowiedzi.");
      setNewQuestionContent('');
      setIsAdding(false);
      fetchData();
    } catch (err) {
      toast.error("Błąd dodawania pytania.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
    </div>
  );

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-slate-950 text-white font-sans p-8">
        <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/decks')}
              className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {deck ? deck.title : "Błąd ładowania"}
              </h1>
              <p className="text-slate-500 text-sm">Edycja pytań i odpowiedzi</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/20"
            disabled={!deck} 
          >
            {isAdding ? <X className="h-5 w-5"/> : <Plus className="h-5 w-5"/>}
            {isAdding ? "Anuluj" : "Nowe pytanie"}
          </button>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 pb-20">
          <AnimatePresence>
            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-2xl overflow-hidden"
              >
                <form onSubmit={addNewQuestion} className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="Wpisz treść nowego pytania..." 
                    value={newQuestionContent}
                    onChange={e => setNewQuestionContent(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 rounded-xl font-bold">Dodaj</button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {questions.map((q, index) => (
            <motion.div 
              key={q.id} layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-slate-800/40 border p-6 rounded-2xl transition-all ${editingId === q.id ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-700'}`}
            >
              {editingId === q.id ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-blue-400 text-sm font-bold uppercase tracking-wider">Edycja pytania #{index + 1}</span>
                  </div>
                  <input 
                    type="text" value={editForm.content} onChange={e => handleEditChange('content', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl p-3 focus:border-blue-500 outline-none font-medium text-lg"
                  />
                  <div className="space-y-2 mt-4">
                    <p className="text-slate-500 text-xs uppercase font-bold">Odpowiedzi</p>
                    {editForm.answers.map((ans, idx) => (
                      <div key={ans.id} className="flex items-center gap-3">
                        <button 
                          onClick={() => handleAnswerChange(idx, 'is_correct', !ans.is_correct)}
                          className={`p-2 rounded-lg transition-colors ${ans.is_correct ? 'text-green-400 bg-green-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                          {ans.is_correct ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                        </button>
                        <input 
                          type="text" value={ans.content} onChange={e => handleAnswerChange(idx, 'content', e.target.value)}
                          className={`flex-1 bg-slate-900 border text-white rounded-lg p-2 focus:border-blue-500 outline-none ${ans.is_correct ? 'border-green-500/30' : 'border-slate-700'}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700/50">
                    <button onClick={() => saveQuestion(q.id)} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-medium text-white transition-colors"><Save className="h-4 w-4" /> Zapisz</button>
                    <button onClick={cancelEdit} className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors">Anuluj</button>
                    <button onClick={() => deleteQuestion(q.id)} className="ml-auto flex items-center gap-2 text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /> Usuń</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-medium text-white pr-4"><span className="text-slate-500 mr-2">#{index + 1}</span>{q.content}</h3>
                    <button onClick={() => startEdit(q)} className="text-slate-500 hover:text-blue-400 p-2 hover:bg-blue-500/10 rounded-lg transition-all"><Edit3 className="h-5 w-5" /></button>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-slate-700">
                    {q.answers.map(ans => (
                      <div key={ans.id} className={`flex items-center gap-3 p-2 rounded-lg ${ans.is_correct ? 'bg-green-500/10 text-green-300' : 'text-slate-400'}`}>
                        {ans.is_correct ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0 opacity-50" />}
                        <span>{ans.content}</span>
                      </div>
                    ))}
                    {q.answers.length === 0 && <span className="text-slate-600 text-sm italic">Brak odpowiedzi</span>}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          {questions.length === 0 && !isAdding && (
            <div className="text-center py-12 text-slate-500">
              <p>{deck ? "Ten zestaw jest pusty." : "Nie udało się załadować danych."}</p>
              {deck && <button onClick={() => setIsAdding(true)} className="text-blue-400 hover:underline mt-2">Dodaj pierwsze pytanie</button>}
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
};

export default DeckPreview;
