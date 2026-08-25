import React from 'react';

type BadgeTone = 'ok' | 'warn' | 'danger' | 'sage' | 'accent' | 'gold' | 'muted';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  ok:     'bg-sage-soft text-ok',
  warn:   'bg-gold-soft text-warn',
  danger: 'bg-accent-soft text-danger',
  sage:   'bg-sage-soft text-sage',
  accent: 'bg-accent-soft text-accent',
  gold:   'bg-gold-soft text-gold',
  muted:  'bg-paper-dark text-muted',
};

const Badge: React.FC<BadgeProps> = ({ tone = 'muted', children, className = '' }) => (
  <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-pill ${toneClasses[tone]} ${className}`}>
    {children}
  </span>
);

export default Badge;
