import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from './LanguageContext';

const ConfirmDialogContext = createContext(null);

export const ConfirmDialogProvider = ({ children }) => {
  const { t } = useLanguage();
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);
  const cancelButton = useRef(null);

  const close = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setDialog(options);
  }), []);

  useEffect(() => {
    if (!dialog) return undefined;
    cancelButton.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dialog, close]);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {dialog && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(event) => event.target === event.currentTarget && close(false)}
            role="presentation"
          >
            <motion.div
              role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"
              initial={{ opacity: 0, scale: 0.94, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl"
            >
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-red-500/10 blur-3xl" />
              <button onClick={() => close(false)} aria-label={t('Zamknij')} className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
              <div className="relative flex gap-4 pr-7">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400"><AlertTriangle className="h-5 w-5" /></span>
                <div>
                  <h2 id="confirm-title" className="text-lg font-bold">{t(dialog.title || 'Potwierdź operację')}</h2>
                  <p id="confirm-description" className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-400">{t(dialog.message)}</p>
                </div>
              </div>
              <div className="relative mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button ref={cancelButton} onClick={() => close(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white">{t(dialog.cancelLabel || 'Anuluj')}</button>
                <button onClick={() => close(true)} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:bg-red-500">{t(dialog.confirmLabel || 'Usuń')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmDialogContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmDialogProvider');
  return context;
};
