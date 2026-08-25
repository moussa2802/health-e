import React from 'react';
import { Check } from 'lucide-react';
import type { ScaleItem } from '../../../types/assessment';
import { getOptionHint } from '../../../utils/optionHints';

interface SegmentedInputProps {
  item: ScaleItem;
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  accentColor?: string;
  scaleId?: string;
}

const SegmentedInput: React.FC<SegmentedInputProps> = ({
  item,
  value,
  onChange,
  disabled = false,
  accentColor = '#4A5D57',
  scaleId,
}) => {
  const options = item.options;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const hasHints = options.some(opt => opt.subtitle || getOptionHint(opt.label, scaleId) !== null);
  const isHorizontal = options.length === 2 && !hasHints;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isHorizontal ? 'row' : 'column',
      gap: isHorizontal ? 12 : 10,
    }}>
      {options.map((option, index) => {
        const isSelected = value === option.value;
        const hint = option.subtitle || getOptionHint(option.label, scaleId);
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
                ? `2px solid ${accentColor}`
                : '2px solid rgba(148,163,184,0.18)',
              background: isSelected ? `${accentColor}0A` : '#FAFAF8',
              cursor: disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              flexDirection: isHorizontal && !hint ? 'column' : 'row',
              justifyContent: isHorizontal && !hint ? 'center' : 'flex-start',
              transition: 'all 0.18s ease',
              boxShadow: isSelected
                ? `0 2px 12px ${accentColor}18`
                : '0 1px 3px rgba(0,0,0,0.04)',
              transform: isSelected ? 'translateY(-1px)' : 'none',
              opacity: disabled && !isSelected ? 0.5 : 1,
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{
              width: 32,
              height: 32,
              minWidth: 32,
              borderRadius: 9,
              flexShrink: 0,
              background: isSelected ? accentColor : `${accentColor}12`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              color: isSelected ? '#fff' : accentColor,
              marginTop: hint ? 1 : 0,
              transition: 'all 0.18s ease',
            }}>
              {letter}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block',
                fontSize: 14,
                fontWeight: isSelected ? 650 : 500,
                color: isSelected ? '#17181B' : '#374151',
                lineHeight: 1.4,
              }}>
                {option.label}
              </span>
              {hint && (
                <span style={{
                  display: 'block',
                  marginTop: 4,
                  fontSize: 12,
                  fontWeight: 400,
                  color: '#94A3B8',
                  lineHeight: 1.45,
                }}>
                  {hint}
                </span>
              )}
            </div>

            {isSelected && !isHorizontal && (
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: accentColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: hint ? 1 : 0,
              }}>
                <Check size={13} color="#fff" strokeWidth={2.5} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedInput;
