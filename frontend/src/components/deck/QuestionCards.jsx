import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Fiszka } from '../ui/Fiszka';
import { PenCheck } from '../ui/PenMarks';
import Field from '../ui/Field';
import { answerLetter } from '../quiz/quizUtils';

const MAX_ANSWERS = 20;

const LetterBox = ({ children }) => (
  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[4px] border-2 border-card-ink/70 bg-card text-sm font-bold text-card-ink/80">{children}</span>
);

const paperButton = 'min-h-[44px] rounded-md px-3 text-[15px] font-semibold text-card-ink hover:bg-card-ink/5';

// Fiszka w trybie podglądu: pytanie i odpowiedzi, poprawne odhaczone czerwonym długopisem.
export const QuestionCard = ({ question, number, onEdit, localized }) => {
  const { t } = useLanguage();
  return (
    <Fiszka
      label={t('Pytanie {n}', { n: number })}
      aside={<button type="button" onClick={onEdit} className={`${paperButton} -mr-3`}>{t('Edytuj')}</button>}
    >
      <h2 className="font-slab text-[21px] font-semibold leading-[34px] sm:text-[22px]">{localized(question)}</h2>
      {question.answers.length ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6">
          {question.answers.map((answer, index) => (
            <li key={answer.id} className="flex min-h-[44px] items-center gap-2 py-1 text-[17px] font-medium">
              <span className="flex w-7 flex-none justify-center">{answer.is_correct && <PenCheck className="h-7 w-7" label={t('Poprawna')} />}</span>
              <LetterBox>{answerLetter(index)}</LetterBox>
              <span className="min-w-0 break-words pl-1.5">{localized(answer)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] italic leading-[34px] text-card-muted">{t('To pytanie nie ma jeszcze odpowiedzi.')}</p>
      )}
    </Fiszka>
  );
};

// Fiszka w trybie edycji: treść, odpowiedzi, zaznaczanie poprawnych krzyżykiem.
export const QuestionEditor = ({
  number, form, saving, onContent, onAnswer, onAddAnswer, onRemoveAnswer, onSave, onCancel, onDelete,
}) => {
  const { t } = useLanguage();
  return (
    <Fiszka
      label={t('Pytanie {n}, edycja', { n: number })}
      aside={<span className="hidden text-pen sm:inline">{t('Postaw X przy poprawnych')}</span>}
      className="ring-2 ring-accent"
    >
      <div className="flex flex-col gap-5 pt-3">
        <Field
          tone="paper"
          label={t('Treść pytania')}
          multiline
          rows={2}
          value={form.content}
          onChange={event => onContent(event.target.value)}
          inputClassName="font-slab !text-[20px] font-semibold"
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[15px] font-bold text-card-muted">{t('Odpowiedzi')}</legend>
          {form.answers.map((answer, index) => (
            <div key={answer.id ?? answer.key} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <LetterBox>{answerLetter(index)}</LetterBox>
              <input
                value={answer.content}
                onChange={event => onAnswer(index, 'content', event.target.value)}
                aria-label={t('Odpowiedź {letter}', { letter: answerLetter(index) })}
                className="min-h-[44px] min-w-0 flex-1 rounded-[5px] bg-[rgb(var(--c-card))] px-3 text-base text-card-ink shadow-[inset_0_0_0_1.5px_rgb(var(--c-card-ink)/0.25)] outline-none focus:shadow-[inset_0_0_0_2px_rgb(var(--c-pen))]"
              />
              <button
                type="button"
                aria-pressed={answer.is_correct}
                onClick={() => onAnswer(index, 'is_correct', !answer.is_correct)}
                className="flex min-h-[44px] items-center gap-2 rounded-md px-2 text-sm font-semibold text-card-ink hover:bg-card-ink/5"
              >
                <span className="xbox pointer-events-none !h-6 !w-6" aria-pressed={answer.is_correct} aria-hidden="true" />
                {t('Poprawna')}
              </button>
              <button
                type="button"
                onClick={() => onRemoveAnswer(index)}
                disabled={form.answers.length <= 1}
                aria-label={t('Usuń odpowiedź {letter}', { letter: answerLetter(index) })}
                className="flex h-11 w-11 items-center justify-center rounded-md text-card-muted hover:bg-card-ink/5 hover:text-pen disabled:opacity-30"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ))}
          {form.answers.length < MAX_ANSWERS && (
            <button type="button" onClick={onAddAnswer} className="link mt-1 min-h-[44px] self-start text-[15px] text-card-ink" style={{ textDecorationColor: 'rgb(var(--c-pen))' }}>{t('Dodaj odpowiedź')}</button>
          )}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3 border-t border-card-ink/15 pt-4">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="min-h-[46px] rounded-md bg-card-ink px-5 text-[15px] font-bold text-card shadow-[inset_0_-3px_0_rgb(0_0_0/0.35)] disabled:opacity-60"
          >
            {t(saving ? 'Zapisywanie…' : 'Zapisz zmiany')}
          </button>
          <button type="button" onClick={onCancel} className={paperButton}>{t('Anuluj')}</button>
          <button type="button" onClick={onDelete} className={`${paperButton} ml-auto !text-pen`}>{t('Usuń pytanie')}</button>
        </div>
      </div>
    </Fiszka>
  );
};

// Formularz nowego pytania – też na fiszce.
export const NewQuestionCard = ({ value, onChange, onSubmit, onCancel, saving }) => {
  const { t } = useLanguage();
  return (
    <Fiszka as="form" onSubmit={onSubmit} label={t('Nowe pytanie')} className="ring-2 ring-accent">
      <div className="flex flex-col gap-4 pt-3">
        <Field
          tone="paper"
          label={t('Treść pytania')}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={t('Wpisz treść nowego pytania')}
          autoFocus
          hint={t('Odpowiedzi dodasz w następnym kroku.')}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving || !value.trim()} className="min-h-[46px] rounded-md bg-card-ink px-5 text-[15px] font-bold text-card shadow-[inset_0_-3px_0_rgb(0_0_0/0.35)] disabled:opacity-50">{t('Dodaj pytanie')}</button>
          <button type="button" onClick={onCancel} className={paperButton}>{t('Anuluj')}</button>
        </div>
      </div>
    </Fiszka>
  );
};
