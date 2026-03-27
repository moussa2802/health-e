import React from 'react';
import type { ItemSeverity } from '../../types/assessment';

interface ScoreGaugeProps {
  score: number;
  min: number;
  max: number;
  severity: ItemSeverity;
  label: string;
}

const severityConfig: Record<ItemSeverity, { bar: string; bg: string; text: string }> = {
  none:     { bar: "bg-green-500",     bg: "bg-green-50",   text: "text-green-700"},
  minimal:  { bar: "bg-green-400",     bg: "bg-green-50",   text: "text-green-700"},
  mild:     { bar: "bg-yellow-400",    bg: "bg-yellow-50",  text: "text-yellow-700"},
  moderate: { bar: "bg-orange-500",    bg: "bg-orange-50",  text: "text-orange-700"},
  severe:   { bar: "bg-red-500",       bg: "bg-red-50",     text: "text-red-700"},
  alert:    { bar: "bg-red-600",       bg: "bg-red-50",     text: "text-red-700"},
  positive: { bar: "bg-emerald-500",   bg: "bg-emerald-50", text: "text-emerald-700"},
};

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, min, max, severity, label }) => {
  const range = max - min;
  const pct = range > 0 ? Math.min(100, Math.max(0, ((score - min) / range) * 100)) : 0;
  const cfg = severityConfig[severity] ?? severityConfig.mild;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
          {label}
        </span>
        <span className="text-sm font-bold text-gray-700">
          {score}<span className="text-gray-400 font-normal">/{max}</span>
        </span>
      </div>
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default ScoreGauge;
