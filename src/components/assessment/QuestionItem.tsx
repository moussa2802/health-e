import React from 'react';
import type { ScaleItem } from '../../types/assessment';
import { getOptionHint } from '../../utils/optionHints';

interface QuestionItemProps {
  item: ScaleItem;
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  accentColor?: string;
  accentColor2?: string;
  scaleId?: string;
}

const QuestionItem: React.FC<QuestionItemProps> = ({
  item,
  value,
  onChange,
  disabled = false,
  accentColor = '#3B82F6',
  accentColor2 = '#2DD4BF',
  scaleId,
}) => {
  const options = item.options;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  // Calculer si des hints existent pour cet ensemble d'options
  const hasHints = options.some(opt => getOptionHint(opt.label, scaleId) !== null);

  // Layout horizontal uniquement si 2 options ET pas de hints (ex: Oui/Non)
  const isHorizontal = options.length === 2 && !hasHints;

  return (
    <div style={{ width: '100%' }}>
      {/* Question text */}
      <p
        style={{
          fontSize: 18,
          fontWeight: 650,
          color: '#0F172A',
          lineHeight: 1.65,
          marginBottom: 24,
          letterSpacing: '-0.01em',
        }}
      >
        {item.text}
      </p>

      {/* Options */}
      <div
        style={{
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          gap: isHorizontal ? 12 : 10,
        }}
      >
        {options.map((option, index) => {
          const isSelected = value === option.value;
          const hint = getOptionHint(option.label, scaleId);
          const letter = letters[index] ?? String(index + 1);

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(option.value)}
              style={{
                flex: isHorizontal ? 1 : undefined,
                display: 'flex',
                alignItems: hint ? 'flex-start' : 'center',
                gap: 14,
                padding: hint ? '15px 18px' : isHorizontal ? '18px 14px' : '14px 18px',
                borderRadius: 14,
                border: isSelected
                  ? '2px solid transparent'
                  : '2px solid rgba(148,163,184,0.18)',
                background: isSelected
                  ? `linear-gradient(135deg, ${accentColor}, ${accentColor2})`
                  : 'rgba(248,250,252,0.9)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                flexDirection: isHorizontal && !hint ? 'column' : 'row',
                justifyContent: isHorizontal && !hint ? 'center' : 'flex-start',
                transition: 'all 0.18s ease',
                boxShadow: isSelected
                  ? `0 6px 20px ${accentColor}35`
                  : '0 1px 3px rgba(0,0,0,0.04)',
                transform: isSelected ? 'translateY(-1px)' : 'none',
                opacity: disabled && !isSelected ? 0.5 : 1,
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Letter badge */}
              <span
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  borderRadius: 9,
                  flexShrink: 0,
                  background: isSelected ? 'rgba(255,255,255,0.22)' : `${accentColor}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  color: isSelected ? '#fff' : accentColor,
                  marginTop: hint ? 1 : 0,
                }}
              >
                {letter}
              </span>

              {/* Label + hint */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: isSelected ? 650 : 550,
                    color: isSelected ? '#fff' : '#1E293B',
                    lineHeight: 1.4,
                  }}
                >
                  {option.label}
                </span>
                {hint && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontSize: 12,
                      fontWeight: 400,
                      color: isSelected ? 'rgba(255,255,255,0.78)' : '#94A3B8',
                      lineHeight: 1.45,
                    }}
                  >
                    {hint}
                  </span>
                )}
              </div>

              {/* Checkmark */}
              {isSelected && !isHorizontal && (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ flexShrink: 0, marginTop: hint ? 1 : 0 }}
                >
                  <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.22)" />
                  <polyline
                    points="8 12 11 15 16 9"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionItem;
