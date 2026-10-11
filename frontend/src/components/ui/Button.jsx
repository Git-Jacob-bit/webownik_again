import React from 'react';
import { Loader2 } from 'lucide-react';

// Przyciski w stylu „klawisza”: główny (key), akcent, obrys, niebezpieczny i cichy (podkreślony link).
const variants = {
  key: 'bg-key text-key-ink shadow-key active:translate-y-0.5 active:shadow-key-pressed',
  accent: 'bg-accent text-accent-ink shadow-[inset_0_-3px_0_rgb(0_0_0/0.25)] active:translate-y-0.5',
  outline: 'bg-transparent text-ink ring-[1.5px] ring-inset ring-ink/20 hover:bg-ink/5',
  danger: 'bg-transparent text-accent-text ring-2 ring-inset ring-accent hover:bg-accent/10',
  quiet: 'link bg-transparent !px-1',
};

const sizes = {
  sm: 'min-h-[44px] px-4 text-[15px]',
  md: 'min-h-[50px] px-[22px] text-base',
  lg: 'min-h-[56px] px-6 text-[17px]',
};

const Button = React.forwardRef(({
  variant = 'key', size = 'md', kbd, loading = false, block = false,
  className = '', children, type = 'button', disabled, ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    className={`inline-flex items-stretch rounded-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${block ? 'w-full' : ''} ${variants[variant]} ${sizes[size]} ${kbd ? '!pr-0' : ''} ${className}`}
    {...props}
  >
    <span className="flex flex-1 items-center justify-center gap-2">
      {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
      {children}
    </span>
    {kbd && <kbd className="ml-[22px] hidden items-center border-l-[1.5px] border-current/30 px-3.5 font-sans text-[13px] font-semibold opacity-70 sm:flex" style={{ borderColor: 'rgb(127 110 95 / 0.35)' }}>{kbd}</kbd>}
  </button>
));
Button.displayName = 'Button';

export default Button;
