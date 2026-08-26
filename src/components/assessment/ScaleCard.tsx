import React from 'react';
import { Check, Clock } from 'lucide-react';
import type { AssessmentScale } from '../../types/assessment';
import { getScaleMeta, getCategoryColor, getScaleCategory } from '../../utils/scaleMeta';
import TestCode from './TestCode';

interface ScaleCardProps {
  scale: AssessmentScale;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const categoryLabels: Record<string, string> = {
  mental_health: 'Psychologique',
  sexual_health: 'Vie intime',
  bonus: 'Bonus',
};

const ScaleCard: React.FC<ScaleCardProps> = ({ scale, selected, onToggle, disabled = false }) => {
  const isDisabled = disabled && !selected;
  const meta = getScaleMeta(scale.id);
  const category = getScaleCategory(scale.id);
  const catColor = getCategoryColor(category);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      className={`
        relative w-full text-left rounded-2xl border-2 p-4 transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${selected
          ? `border-${category === 'mental' ? 'sage' : category === 'sexual' ? 'accent' : 'gold'} bg-${category === 'mental' ? 'sage' : category === 'sexual' ? 'accent' : 'gold'}/5 shadow-card-hover`
          : isDisabled
            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-card cursor-pointer'
        }
      `}
      style={selected ? { borderColor: catColor.accent, backgroundColor: `${catColor.accent}08` } : undefined}
    >
      {selected && (
        <div
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center shadow"
          style={{ backgroundColor: catColor.accent }}
        >
          <Check size={14} className="text-white" strokeWidth={3} />
        </div>
      )}

      <div className="mb-3">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${catColor.accent}12`, color: catColor.accent }}
        >
          {categoryLabels[scale.category] ?? scale.category}
        </span>
      </div>

      <div className="flex items-start gap-3 mb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${catColor.accent}10` }}
        >
          <Icon size={18} style={{ color: catColor.accent }} />
        </div>
        <div className="flex-1 min-w-0 pr-5">
          <h3 className="font-semibold text-sm text-ink leading-tight flex items-center gap-2">
            <TestCode scaleId={scale.id} />
            {meta.label}
          </h3>
          <p className="text-xs text-ink-light font-mono mt-0.5">{scale.shortName}</p>
        </div>
      </div>

      <p className="text-xs text-ink-light line-clamp-2 mb-3 leading-relaxed">{meta.description}</p>

      <div className="flex items-center gap-1 text-xs text-ink-light/60">
        <Clock size={12} />
        <span>{scale.timeEstimateMinutes} min</span>
        <span className="mx-1">·</span>
        <span>{scale.items.length} questions</span>
      </div>
    </button>
  );
};

export default ScaleCard;
