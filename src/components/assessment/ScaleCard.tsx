import React from 'react';
import { Check, Clock } from 'lucide-react';
import type { AssessmentScale } from '../../types/assessment';

interface ScaleCardProps {
  scale: AssessmentScale;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const categoryColors: Record<string, string> = {
  mental_health: 'bg-blue-100 text-blue-700',
  sexual_health: 'bg-purple-100 text-purple-700',
};

const categoryLabels: Record<string, string> = {
  mental_health: 'Santé mentale',
  sexual_health: 'Santé sexuelle',
};

const ScaleCard: React.FC<ScaleCardProps> = ({ scale, selected, onToggle, disabled = false }) => {
  const isDisabled = disabled && !selected;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      className={`
        relative w-full text-left rounded-xl border-2 p-4 transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500
        ${selected
          ? 'border-sky-500 bg-sky-50 shadow-md'
          : isDisabled
            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
            : 'border-gray-200 bg-white hover:border-sky-300 hover:shadow-sm cursor-pointer'
        }
      `}
    >
      {/* Checkmark */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center shadow">
          <Check size={14} className="text-white" strokeWidth={3} />
        </div>
      )}

      {/* Category badge */}
      <div className="mb-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[scale.category] ?? 'bg-gray-100 text-gray-700'}`}>
          {categoryLabels[scale.category] ?? scale.category}
        </span>
      </div>

      {/* Scale name */}
      <h3 className={`font-semibold text-sm mb-1 pr-6 ${selected ? 'text-sky-800' : 'text-gray-900'}`}>
        {scale.name}
      </h3>

      {/* Short name */}
      <p className="text-xs text-gray-500 font-mono mb-2">{scale.shortName}</p>

      {/* Description */}
      <p className="text-xs text-gray-600 line-clamp-2 mb-3">{scale.description}</p>

      {/* Footer */}
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <Clock size={12} />
        <span>{scale.timeEstimateMinutes} min</span>
        <span className="mx-1">·</span>
        <span>{scale.items.length} questions</span>
      </div>
    </button>
  );
};

export default ScaleCard;
