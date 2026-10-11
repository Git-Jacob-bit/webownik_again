import React, { useId, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

// Pole formularza. tone="desk" – na tle aplikacji, tone="paper" – na fiszce (linia zamiast ramki).
const Field = React.forwardRef(({
  label, labelAside, hint, error, icon, trailing, multiline = false, tone = 'desk',
  className = '', inputClassName = '', id, ...props
}, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  const Input = multiline ? 'textarea' : 'input';
  const paper = tone === 'paper';

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {(label || labelAside) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && <label htmlFor={fieldId} className={`text-[15px] font-bold ${paper ? 'text-card-muted' : ''}`}>{label}</label>}
          {labelAside}
        </div>
      )}
      <div className={paper
        ? 'flex items-center gap-2 border-b-2 border-card-ink/30 focus-within:border-pen'
        : 'flex items-center gap-2.5 rounded-md bg-field px-3.5 ring-[1.5px] ring-inset ring-ink/15 transition focus-within:ring-2 focus-within:ring-accent'}
      >
        {icon && <span className="flex-none text-faint" aria-hidden="true">{icon}</span>}
        <Input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none ${paper ? 'min-h-[46px] text-[17px] text-card-ink placeholder:text-card-muted/70' : 'min-h-[50px] text-ink placeholder:text-faint'} ${multiline ? 'resize-y py-3' : ''} ${inputClassName}`}
          {...props}
        />
        {trailing}
      </div>
      {error && <p id={`${fieldId}-error`} className={`text-sm font-semibold ${paper ? 'text-pen' : 'text-accent-text'}`}>{error}</p>}
      {!error && hint && <p id={`${fieldId}-hint`} className={`text-sm ${paper ? 'text-card-muted' : 'text-muted'}`}>{hint}</p>}
    </div>
  );
});
Field.displayName = 'Field';

export const PasswordField = React.forwardRef((props, ref) => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  return (
    <Field
      ref={ref}
      type={visible ? 'text' : 'password'}
      trailing={(
        <button
          type="button"
          onClick={() => setVisible(value => !value)}
          aria-label={t(visible ? 'Ukryj hasło' : 'Pokaż hasło')}
          className={`min-h-[40px] flex-none px-1 text-sm font-bold ${props.tone === 'paper' ? 'text-card-muted' : 'text-muted'} hover:underline`}
        >
          {t(visible ? 'Ukryj' : 'Pokaż')}
        </button>
      )}
      {...props}
    />
  );
});
PasswordField.displayName = 'PasswordField';

export default Field;
