import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useLanguage } from './LanguageContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

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

  const cancel = useCallback(() => close(false), [close]);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setDialog(options);
  }), []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(dialog)}
        onClose={cancel}
        role="alertdialog"
        size="sm"
        initialFocusRef={cancelButton}
        title={dialog ? t(dialog.title || 'Potwierdź operację') : ''}
        description={dialog?.message ? <span className="whitespace-pre-line">{t(dialog.message)}</span> : undefined}
        footer={dialog && (
          <>
            <Button ref={cancelButton} variant="outline" onClick={cancel}>{t(dialog.cancelLabel || 'Anuluj')}</Button>
            <Button variant="accent" onClick={() => close(true)}>{t(dialog.confirmLabel || 'Usuń')}</Button>
          </>
        )}
      />
    </ConfirmDialogContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmDialogProvider');
  return context;
};
