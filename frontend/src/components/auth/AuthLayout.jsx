import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import { Fiszka, FiszkaStack } from '../ui/Fiszka';
import { useLanguage } from '../../context/LanguageContext';

// Pieczątka spada na fiszkę co kilka sekund. Przy ograniczonym ruchu zostaje widoczna na stałe
// (globalna reguła reduced-motion kończy animację na ostatniej klatce).
const stampKeyframes = `@keyframes auth-stamp {
  0%, 20% { opacity: 0; transform: scale(1.8) rotate(-2deg); }
  28%, 100% { opacity: .9; transform: scale(1) rotate(-8deg); }
}`;

const DemoCard = () => {
  const { t } = useLanguage();
  return (
    <FiszkaStack className="w-full max-w-[440px]">
      <Fiszka label={t('Bazy danych, pytanie 18')} rule={32} className="min-h-[250px]" aria-hidden="true">
        <p className="mt-2.5 font-slab text-[22px] font-semibold leading-8">{t('Którą postać normalną łamie zależność przechodnia?')}</p>
        <span
          className="pointer-events-none absolute bottom-7 right-6 inline-block rounded-md border-[3px] border-double border-pen px-3.5 py-2 text-lg font-extrabold uppercase tracking-[0.06em] text-pen opacity-0 mix-blend-multiply"
          style={{ animation: 'auth-stamp 5s ease-in-out 1s infinite' }}
        >
          {t('Opanowane')}
        </span>
      </Fiszka>
    </FiszkaStack>
  );
};

// Wspólny układ ekranów logowania: po lewej hasło i stos fiszek, po prawej formularz.
const AuthLayout = ({ children }) => {
  const { t } = useLanguage();
  return (
    <main className="desk relative min-h-[100dvh] text-ink">
      <style>{stampKeyframes}</style>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-7xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10 lg:flex-row lg:items-center lg:gap-16 lg:py-12">
        <section className="flex flex-col gap-6 lg:flex-1 lg:gap-10">
          <Link to="/login" className="self-start rounded-md" aria-label="Webownik"><Logo size="lg" /></Link>
          <div className="flex flex-col gap-5">
            <h1 className="max-w-[620px] font-slab text-[34px] font-bold leading-[1.02] tracking-[-0.02em] sm:text-[46px] lg:text-[clamp(46px,5.4vw,80px)] lg:leading-[0.98]">
              {t('Ucz się, aż każda fiszka trafi na stos opanowanych.')}
            </h1>
            <p className="hidden max-w-[500px] text-lg leading-relaxed text-muted sm:block">
              {t('Wgrywasz pytania w formacie Testownika, odpowiadasz, a Webownik pilnuje, które musisz powtórzyć. Notatki, zadania i linki leżą obok.')}
            </p>
          </div>
          <div className="hidden pr-6 lg:block"><DemoCard /></div>
        </section>
        <section className="flex w-full justify-center pb-6 lg:flex-1">{children}</section>
      </div>
    </main>
  );
};

// Formularz na kremowej fiszce. Papier jest jasny w obu motywach.
export const AuthCard = ({ title, aside, onSubmit, children, as = 'form' }) => {
  const Component = as;
  return (
    <Component
      onSubmit={onSubmit}
      className="on-paper flex w-full max-w-[440px] flex-col gap-[22px] rounded-[4px] bg-card px-6 pb-8 text-card-ink shadow-[0_0_0_1px_rgb(36_25_21/0.1),0_40px_70px_-30px_var(--shadow)] sm:px-[34px]"
    >
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
        <h2 className="font-slab text-[30px] font-bold leading-tight">{title}</h2>
        {aside}
      </div>
      <div className="-mx-6 -mt-[22px] h-[3px] bg-pen sm:-mx-[34px]" />
      {children}
    </Component>
  );
};

// Link na papierze: ciemny tekst z czerwonym podkreśleniem.
export const PaperLink = ({ to, children, className = '' }) => (
  <Link to={to} className={`link text-[15px] text-card-ink decoration-pen ${className}`}>{children}</Link>
);

// Główny przycisk na papierze: klawisz espresso w obu motywach.
export const paperKey = '!bg-card-ink !text-card !shadow-[inset_0_-3px_0_rgb(14_9_7),0_16px_26px_-14px_rgb(0_0_0/0.6)] mt-1.5';

export default AuthLayout;
