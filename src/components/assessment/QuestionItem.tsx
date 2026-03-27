import React from 'react';
import type { ScaleItem } from '../../types/assessment';

interface QuestionItemProps {
  item: ScaleItem;
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const QuestionItem: React.FC<QuestionItemProps> = ({ item, value, onChange, disabled = false }) => {
  const isManyOptions = item.options.length > 4;

  return (
    <div className="w-full">
      {/* Question text */}
      <p className="text-base font-medium text-gray-800 mb-4 leading-relaxed">
        {item.text}
      </p>

      {/* Options */}
      <div className={`flex gap-2 ${isManyOptions ? 'flex-col' : 'flex-col sm:flex-row sm:flex-wrap'}`}>
        {item.options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium
                transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1
                ${isManyOptions ? 'w-full text-left' : 'flex-1 min-w-[120px] justify-center text-center'}
                ${isSelected
                  ? 'border-sky-500 bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-md'
                  : disabled
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50 cursor-pointer'
                }
              `}
            >
              {/* Radio indicator for column layout */}
              {isManyOptions && (
                <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-white' : 'border-gray-300'}`}>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
              )}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionItem;
