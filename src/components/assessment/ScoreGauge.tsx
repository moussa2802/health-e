import React from 'react';
import type { ItemSeverity } from '../../types/assessment';

interface ScoreGaugeProps {
  score: number;
  min: number;
  max: number;
  severity: ItemSeverity;
  label: string;
  accentColor?: string;
}

const severityConfig: Record<ItemSeverity, { bar: string; bg: string; text: string; label: string }> = {
  none:     { bar: '#4A5D57', bg: 'rgba(74,93,87,0.08)',  text: '#4A5D57', label: 'bg-sage/10 text-sage' },
  minimal:  { bar: '#4A5D57', bg: 'rgba(74,93,87,0.08)',  text: '#4A5D57', label: 'bg-sage/10 text-sage' },
  mild:     { bar: '#8F6A1F', bg: 'rgba(183,138,46,0.08)', text: '#8F6A1F', label: 'bg-gold/10 text-gold' },
  moderate: { bar: '#B5522F', bg: 'rgba(201,96,63,0.08)',  text: '#B5522F', label: 'bg-accent/10 text-accent' },
  severe:   { bar: '#DC2626', bg: 'rgba(220,38,38,0.08)',  text: '#DC2626', label: 'bg-red-50 text-red-700' },
  alert:    { bar: '#DC2626', bg: 'rgba(220,38,38,0.08)',  text: '#DC2626', label: 'bg-red-50 text-red-700' },
  positive: { bar: '#4A5D57', bg: 'rgba(74,93,87,0.08)',  text: '#4A5D57', label: 'bg-sage/10 text-sage' },
};

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, min, max, severity, label, accentColor }) => {
  const range = max - min;
  const pct = range > 0 ? Math.min(100, Math.max(0, ((score - min) / range) * 100)) : 0;
  const cfg = severityConfig[severity] ?? severityConfig.mild;
  const barColor = accentColor ?? cfg.bar;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.label}`}>
          {label}
        </span>
        <span className="text-sm font-bold text-ink">
          {score}<span className="text-ink-light font-normal">/{max}</span>
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: cfg.bg }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
};

export default ScoreGauge;
