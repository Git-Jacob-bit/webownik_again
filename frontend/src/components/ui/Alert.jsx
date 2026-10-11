import React from 'react';
import { AlertCircle, Check, Info } from 'lucide-react';

// Komunikat w miejscu akcji (formularze, ekrany). Jedyny sposób pokazywania błędów formularzy.
const styles = {
  error: { box: 'bg-accent/10 ring-accent', icon: AlertCircle, iconColor: 'text-accent-text', role: 'alert' },
  success: { box: 'bg-ok/10 ring-ok', icon: Check, iconColor: 'text-ok', role: 'status' },
  info: { box: 'bg-ink/5 ring-ink/20', icon: Info, iconColor: 'text-muted', role: 'status' },
};

// Na papierze (fiszka) kolory są stałe, bo papier jest jasny w obu motywach.
const paperStyles = {
  error: { box: 'bg-pen/10 ring-pen', iconColor: 'text-pen' },
  success: { box: 'bg-[#4E7A42]/10 ring-[#4E7A42]', iconColor: 'text-[#3F6B34]' },
  info: { box: 'bg-card-ink/5 ring-card-ink/20', iconColor: 'text-card-muted' },
};

const Alert = ({ type = 'error', children, tone = 'desk', className = '' }) => {
  if (!children) return null;
  const base = styles[type] || styles.error;
  const look = tone === 'paper' ? { ...base, ...paperStyles[type] } : base;
  const Icon = base.icon;
  return (
    <div role={base.role} className={`flex gap-3 rounded-md px-4 py-3 text-[15px] leading-relaxed ring-[1.5px] ring-inset ${look.box} ${className}`}>
      <Icon className={`mt-0.5 h-5 w-5 flex-none ${look.iconColor}`} strokeWidth={2.4} aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

export default Alert;
