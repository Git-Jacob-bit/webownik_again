import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import Alert from '../../components/ui/Alert';
import notify from '../../components/ui/notify';
import { getErrorMessage } from '../../utils/errors';
import { DeleteButton } from './parts';
import { focusForm, useCreateRequest } from './shared';

// Lista zadań jako kartka z marginesem. Zadanie dopisujemy na górze i odhaczamy krzyżykiem.
const TasksView = ({ onCountsChange }) => {
  const { t } = useLanguage();
  const confirm = useConfirm();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const report = useCallback(list => onCountsChange?.('tasks', list.filter(task => !task.done).length), [onCountsChange]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/todos');
      setTasks(res.data);
      report(res.data);
    } catch {
      notify.error(t('Nie udało się pobrać zadań.'));
    }
  }, [report, t]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useCreateRequest(() => focusForm('create-task'));

  const addTask = async event => {
    event.preventDefault();
    if (!newTask.trim()) { setError(t('Wpisz treść zadania.')); inputRef.current?.focus(); return; }
    setError('');
    setSaving(true);
    try {
      const res = await api.post('/todos', { text: newTask.trim(), done: false });
      const next = [...tasks, res.data];
      setTasks(next);
      report(next);
      setNewTask('');
      notify.success(t('Zadanie dodane.'));
    } catch (err) {
      setError(getErrorMessage(err, t('Nie udało się dodać zadania.')));
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async task => {
    const next = tasks.map(item => item.id === task.id ? { ...item, done: !item.done } : item);
    setTasks(next);
    report(next);
    try {
      await api.put(`/todos/${task.id}`, { text: task.text, done: !task.done });
    } catch {
      notify.error(t('Nie udało się zapisać zadania.'));
      fetchTasks();
    }
  };

  const removeTask = async task => {
    if (!await confirm({ title: 'Usunąć zadanie?', message: 'Tej operacji nie można cofnąć.' })) return;
    try {
      await api.delete(`/todos/${task.id}`);
      const next = tasks.filter(item => item.id !== task.id);
      setTasks(next);
      report(next);
      notify.info(t('Zadanie usunięte.'));
    } catch (err) {
      notify.error(getErrorMessage(err, t('Nie udało się usunąć zadania.')));
    }
  };

  const left = tasks.filter(task => !task.done).length;

  return (
    <div className="flex justify-center">
      <article className="on-paper relative w-full max-w-[760px] rounded-[4px] bg-card pb-8 pl-[52px] pr-4 text-card-ink shadow-paper sm:pl-[88px] sm:pr-10">
        <span aria-hidden="true" className="absolute bottom-0 left-[38px] top-0 w-[1.5px] bg-pen/40 sm:left-[68px]" />
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4 pt-8 sm:pt-9">
          <h1 className="font-slab text-[38px] font-bold leading-none sm:text-[46px]">{t('Do zrobienia')}</h1>
          <span className="text-[15px] text-card-muted">{t('{left} zostało, {done} zrobione', { left, done: tasks.length - left })}</span>
        </div>
        <form id="create-task" onSubmit={addTask} noValidate className="scroll-mt-28 border-y-[1.5px] border-t-[3px] border-b-[rgb(70_100_150/0.16)] border-t-pen">
          <label className="flex min-h-[60px] items-center gap-3">
            <Plus className="h-6 w-6 flex-none text-pen" aria-hidden="true" />
            <span className="sr-only">{t('Nowe zadanie')}</span>
            <input
              ref={inputRef}
              data-autofocus
              value={newTask}
              onChange={event => setNewTask(event.target.value)}
              placeholder={t('Dopisz zadanie i naciśnij Enter')}
              disabled={saving}
              className="min-h-[56px] min-w-0 flex-1 bg-transparent text-[17px] text-card-ink outline-none placeholder:text-card-muted/80 focus-visible:outline-none"
            />
            <button type="submit" disabled={saving} className="min-h-[44px] flex-none rounded-md px-3 text-[15px] font-bold text-card-ink ring-[1.5px] ring-inset ring-card-ink/25 hover:bg-card-ink/5 disabled:opacity-50">{t('Dodaj')}</button>
          </label>
          {error && <Alert tone="paper" className="mb-3">{error}</Alert>}
        </form>
        <ul>
          {tasks.map(task => (
            <li key={task.id} className="flex min-h-[56px] items-center gap-4 border-b-[1.5px] border-[rgb(70_100_150/0.16)]">
              <input
                type="checkbox"
                className="xbox"
                checked={task.done}
                onChange={() => toggleTask(task)}
                aria-label={t(task.done ? 'Oznacz „{name}” jako niezrobione' : 'Oznacz „{name}” jako zrobione', { name: task.text })}
              />
              <span className={`min-w-0 flex-1 break-words py-3 text-[17px] ${task.done ? 'text-card-muted line-through decoration-pen decoration-2' : ''}`}>{task.text}</span>
              <DeleteButton tone="paper" label={t('Usuń zadanie {name}', { name: task.text })} onClick={() => removeTask(task)} />
            </li>
          ))}
        </ul>
        {!tasks.length && <p className="pt-5 text-card-muted">{t('Kartka jest pusta. Dopisz pierwsze zadanie powyżej.')}</p>}
      </article>
    </div>
  );
};

export default TasksView;
