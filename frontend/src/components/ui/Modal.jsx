import React, { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Okno dialogowe: na telefonie wysuwa się od dołu, na komputerze jest na środku.
// Esc zamyka, fokus trafia do środka i wraca na przycisk, który je otworzył.
const Modal = ({ open, onClose, title, description, children, footer, size = 'md', role = 'dialog', initialFocusRef }) => {
  const { t } = useLanguage();
  const titleId = useId();
  const panelRef = useRef(null);
  const lastFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    lastFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      const target = initialFocusRef?.current || panelRef.current?.querySelector('input, textarea, select, button:not([data-close])');
      target?.focus();
    }, 30);
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
      lastFocused.current?.focus?.();
    };
  }, [open, onClose, initialFocusRef]);

  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl' }[size];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60" aria-hidden="true" />
          <motion.section
            ref={panelRef}
            role={role}
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-panel text-ink shadow-lift sm:rounded-2xl ${width}`}
          >
            <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-7 sm:pt-7">
              <div className="min-w-0">
                <h2 id={titleId} className="font-slab text-[28px] font-bold leading-tight">{title}</h2>
                {description && <p className="mt-2 leading-relaxed text-muted">{description}</p>}
              </div>
              <button data-close type="button" onClick={onClose} aria-label={t('Zamknij')} className="-mr-2 flex h-11 w-11 flex-none items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7 sm:pb-7">{children}</div>
            {footer && <footer className="flex flex-col-reverse gap-3 border-t border-ink/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-7">{footer}</footer>}
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
