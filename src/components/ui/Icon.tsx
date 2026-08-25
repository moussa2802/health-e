import React from 'react';
import type { LucideIcon } from 'lucide-react';

type Tone = 'sage' | 'accent' | 'gold' | 'ink' | 'ok' | 'warn' | 'danger';

interface IconProps {
  icon: LucideIcon;
  tone?: Tone;
  size?: number;
  boxSize?: string;
}

const toneBg: Record<Tone, string> = {
  sage:   'bg-sage-soft',
  accent: 'bg-accent-soft',
  gold:   'bg-gold-soft',
  ink:    'bg-paper-dark',
  ok:     'bg-sage-soft',
  warn:   'bg-gold-soft',
  danger: 'bg-accent-soft',
};

const toneColor: Record<Tone, string> = {
  sage:   '#4A5D57',
  accent: '#B5522F',
  gold:   '#8F6A1F',
  ink:    '#17181B',
  ok:     '#3C7A5A',
  warn:   '#B5732A',
  danger: '#B23A3A',
};

const Icon: React.FC<IconProps> = ({
  icon: LucideComp,
  tone = 'ink',
  size = 18,
  boxSize = 'w-9 h-9',
}) => (
  <div className={`${boxSize} rounded-xl flex items-center justify-center flex-shrink-0 ${toneBg[tone]}`}>
    <LucideComp size={size} color={toneColor[tone]} strokeWidth={1.7} />
  </div>
);

export default Icon;
